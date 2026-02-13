import { Inject, Injectable, Logger } from '@nestjs/common';
import { Point } from '../interfaces/point';
import { latLngToCell, cellToLatLng, polygonToCells } from 'h3-js';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { DriverRedisSnapshot } from './models/driver-redis-snapshot';
import { ForbiddenError } from '@nestjs/apollo';
import { REDIS } from './redis-token';
import { RedisClientType } from 'redis';
import { DriverEphemeralMessageSnapshot } from './models/driver-ephemeral-message-snapshot';
import {
  ClusteredLocation,
  DriverLocationUpdate,
} from './location-cluster.dto';

const SUPPORTED_H3_RESOLUTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

@Injectable()
export class DriverRedisService {
  constructor(@Inject(REDIS) private readonly redisClient: RedisClientType) {}

  private async updateH3Clusters(
    driverId: string,
    point: Point,
  ): Promise<void> {
    const pipe = this.redisClient.multi();
    const member = String(driverId);

    for (const res of SUPPORTED_H3_RESOLUTIONS) {
      const h3Index = latLngToCell(point.lat, point.lng, res);
      const h3Key = `driver:h3:${res}:${driverId}`;
      const old = await this.redisClient.get(h3Key);

      if (old && old !== h3Index) {
        pipe.sRem(`h3:cluster:${res}:${old}`, member);
      }

      pipe.set(h3Key, h3Index);
      pipe.sAdd(`h3:cluster:${res}:${h3Index}`, member);
    }

    await pipe.exec();
  }

  async createEphemeralMessage(
    driverId: string,
    ephemeralMessage: DriverEphemeralMessageSnapshot,
  ) {
    const key = `driver_ephemeral_messages:${driverId}`;

    // Ensure the root exists and is an array
    await this.redisClient
      .multi()
      .json.set(key, '$', [], {
        NX: true, // Only create if it doesn't exist
      }) // create [] only if missing
      .json.arrAppend(key, '$', instanceToPlain(ephemeralMessage))
      .exec();
  }

  async getEphemeralMessages(
    driverId: string,
    expireOnRead: boolean,
  ): Promise<DriverEphemeralMessageSnapshot[]> {
    const json = await this.redisClient.json.get(
      `driver_ephemeral_messages:${driverId}`,
    );
    if (!json) {
      return [];
    }
    if (expireOnRead) {
      await this.deleteEphemeralMessages(driverId);
    }
    const parsed = json as unknown as DriverEphemeralMessageSnapshot[];
    const processedResults = parsed.map((msg) =>
      plainToInstance(DriverEphemeralMessageSnapshot, msg),
    );
    return processedResults;
  }

  async deleteEphemeralMessages(driverId: string) {
    await this.redisClient.del(`driver_ephemeral_messages:${driverId}`);
  }

  async deleteEphemeralMessageForDriver(driverId: string, messageId: string) {
    const key = `driver_ephemeral_messages:${driverId}`;

    const json = await this.redisClient.json.get(key);
    if (!json) {
      return;
    }

    const arr = json[0] || [];
    const idx = arr.findIndex((m: any) => String(m?.id) === String(messageId));
    if (idx < 0) {
      return;
    }

    // Remove the specific element
    await this.redisClient.json.arrPop(key, {
      index: idx,
      path: '$',
    });

    // If array is now empty, remove the key entirely
    const lenResp = (await this.redisClient.json.arrLen(key, {
      path: '$',
    })) as (number | null)[];
    const len = Array.isArray(lenResp) ? (lenResp[0] ?? 0) : 0;
    if (len <= 0) {
      await this.redisClient.unlink(key);
    }
  }

  async setLocation(
    driverId: string,
    point: Point,
  ): Promise<DriverRedisSnapshot | null> {
    // Validate point has required properties
    if (point?.lat == null || point?.lng == null) {
      Logger.warn(
        `Driver ${driverId} location update skipped due to invalid coordinates: ${JSON.stringify(point)}`,
      );
      return null;
    }

    // get current location and if change is negligible, skip update, just update timestamp
    const driverMetadata = await this.getOnlineDriverMetaData(driverId);
    if (driverMetadata) {
      const distance = Math.sqrt(
        Math.pow(driverMetadata.location.lat - point.lat, 2) +
          Math.pow(driverMetadata.location.lng - point.lng, 2),
      );
      if (distance < 0.0001) {
        // ~11 meters, skip
        const pipeline1 = this.redisClient.multi();
        pipeline1.json.set(
          `driver:${driverId}`,
          '$.locationTime',
          new Date().getTime(),
        );
        pipeline1.zAdd('driver:lastSeen', {
          value: driverId.toString(),
          score: Date.now(),
        });

        pipeline1.exec();
        driverMetadata.locationTime = new Date();
        return driverMetadata;
      } else {
        await this.updateH3Clusters(driverId, point);
        const pipeline = this.redisClient.multi();
        const key = `driver:${driverId}`;
        pipeline.json.set(key, '$.location', `${point.lng}, ${point.lat}`);
        pipeline.json.set(key, '$.heading', point.heading ?? 0);
        pipeline.json.set(key, '$.locationTime', new Date().getTime());
        pipeline.zAdd('driver:lastSeen', {
          value: driverId.toString(),
          score: Date.now(),
        });

        await pipeline.exec();
        return this.getOnlineDriverMetaData(driverId);
      }
    }
    Logger.warn(
      `Driver ${driverId} location update skipped because makeOnline was not called first: ${JSON.stringify(point)}`,
    );
    return null;
  }

  async makeDriverOnline(input: {
    id: string;
    firstName: string;
    lastName: string;
    mobileNumber: string;
    location: Point;
    walletCredit: number;
    currency: string;
    fleetId?: string;
    heading: number;
    vehicleColor?: string;
    vehicleName?: string;
    vehiclePlate?: string;
    avatarImageAddress: string;
    fcmTokens: string[];
    searchDistance?: number;
    acceptedOrdersCount: number;
    rejectedOrdersCount: number;
    serviceIds: string[];
    rating?: number;
  }) {
    if (
      input.walletCredit < Number(process.env.DRIVER_MINIMUM_ALLOWED_BALANCE)
    ) {
      throw new ForbiddenError(
        'Insufficient wallet balance. Please top up your wallet.',
      );
    }
    if ((input.serviceIds?.length ?? 0) < 1) {
      throw new ForbiddenError(
        'No service is activated for the driver. Contact support for more information.',
      );
    }

    // Validate location coordinates
    if (input.location?.lat == null || input.location?.lng == null) {
      throw new ForbiddenError('Invalid location coordinates provided.');
    }

    const snapshot: DriverRedisSnapshot = {
      ...input,
      location:
        `${input.location.lng},${input.location.lat}` as unknown as Point,
      locationTime: new Date().getTime() as unknown as Date,
      idleStart: new Date().getTime() as unknown as Date,
      activeOrderIds: [],
      assignedRiderIds: [],
      rideOfferIds: [],
      heading: input.heading ?? 0,
    };
    await this.updateH3Clusters(input.id, input.location);
    await this.redisClient.json.set(
      `driver:${input.id}`,
      '$',
      instanceToPlain(snapshot),
    );
    await this.redisClient.zAdd('driver:lastSeen', {
      value: input.id.toString(),
      score: Date.now(),
    });
  }

  async getDriverCoordinate(driverId: string): Promise<Point | null> {
    const metaData = await this.getOnlineDriverMetaData(driverId);
    return metaData ? metaData?.location : null;
  }

  async getCloseDrivers(input: {
    point: Point;
    maxCount: number;
    maxDistance: number;
  }): Promise<Point[]> {
    const { point, maxCount, maxDistance } = input;

    Logger.debug(
      `Searching for close drivers: point=(${point.lat}, ${point.lng}), maxDistance=${maxDistance}m, maxCount=${maxCount}`,
    );

    const result = await this.redisClient.ft.search(
      'index:driver',
      `@location:[${point.lng} ${point.lat} ${maxDistance} m]`,
      {
        LIMIT: {
          from: 0,
          size: maxCount,
        },
      },
    );

    if (result.total < 1) {
      Logger.debug('No close drivers found');
      return [];
    }

    const entries = [];
    for (let document of result.documents) {
      entries.push(plainToInstance(DriverRedisSnapshot, document.value));
    }
    return entries.map((driver) => ({
      lat: driver.location.lat,
      lng: driver.location.lng,
      heading: driver.heading,
    }));
  }

  async getSuitableDriversForOrder(input: {
    point: Point;
    distance: number;
    maxCount: number;
    serviceId: number;
    fleetId?: number;
  }): Promise<DriverRedisSnapshot[]> {
    const { point, distance, serviceId, fleetId } = input;
    const query =
      `@serviceId:{${serviceId}}` +
      (fleetId ? ` @fleetId:{${fleetId}}` : '') +
      ` @location:[${point.lng} ${point.lat} ${distance} m]`;

    Logger.debug(
      `Searching for drivers: serviceId=${serviceId}, fleetId=${fleetId || 'any'}, point=(${point.lng}, ${point.lat}), distance=${distance}m`,
    );
    Logger.debug(`Generated query: ${query}`);

    const result = await this.redisClient.ft.search('index:driver', query, {
      RETURN: ['$'],
      LIMIT: {
        from: 0,
        size: input.maxCount,
      },
    });

    if (result.total < 1) {
      Logger.debug('No suitable drivers found');
      return [];
    }
    Logger.debug(`Found ${JSON.stringify(result.documents)} suitable drivers`);

    let parsed = plainToInstance(
      DriverRedisSnapshot,
      result.documents.map((doc) => doc.value),
    );
    Logger.debug(parsed, `driverredisservice.getSuitableDriversForOrder:`);

    return parsed;
  }

  async getDriverLocationsInBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }): Promise<{
    clusters: ClusteredLocation[];
    singles: DriverLocationUpdate[];
    h3IndexesInView: string[];
    h3Resolution: number;
    totalCount: number;
  }> {
    const resolution = this.zoomToH3Res(bounds.zoom);

    // Create Geo polygon from bounds
    const polygon = [
      [bounds.north, bounds.west],
      [bounds.north, bounds.east],
      [bounds.south, bounds.east],
      [bounds.south, bounds.west],
      [bounds.north, bounds.west],
    ];

    const h3IndexesInView = polygonToCells(polygon, resolution);

    const clusters: ClusteredLocation[] = [];
    const singles: DriverLocationUpdate[] = [];

    for (const h3Index of h3IndexesInView) {
      const driverIds = await this.redisClient.sMembers(
        `h3:cluster:${resolution}:${h3Index}`,
      );
      if (driverIds.length >= 20) {
        const [lat, lng] = cellToLatLng(h3Index);
        clusters.push({
          h3Index,
          location: {
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
          },
          count: driverIds.length,
        });
      } else if (driverIds.length > 0) {
        // Fetch location + heading per driver
        for (let i = 0; i < driverIds.length; i++) {
          const onlineDriver = await this.getOnlineDriverMetaData(
            driverIds[i].toString(),
          );
          if (onlineDriver) {
            singles.push({
              driverId: parseInt(driverIds[i]),
              orderIds: onlineDriver.activeOrderIds.map((id) => parseInt(id)),
              lastUpdatedAt: onlineDriver.locationTime,
              point: {
                ...onlineDriver.location,
                heading: onlineDriver.heading,
              },
            });
          }
        }
      }
    }
    const totalCount =
      clusters.reduce((sum, cluster) => sum + cluster.count, 0) +
      singles.length;

    const result = {
      clusters,
      singles,
      h3IndexesInView,
      totalCount,
      h3Resolution: resolution,
    };
    return result;
  }

  async getOnlineDriverMetaData(
    driverId: string,
  ): Promise<DriverRedisSnapshot | null> {
    const onlineDriver = await this.redisClient.json.get(`driver:${driverId}`);
    if (
      onlineDriver == null ||
      (typeof onlineDriver == 'string' &&
        Object.keys(JSON.parse(onlineDriver.toString())).length === 0)
    ) {
      return null;
    }
    let driver = plainToInstance(DriverRedisSnapshot, onlineDriver);
    driver.location.heading = driver.heading;
    return driver;
  }

  private zoomToH3Res(zoom: number): number {
    if (zoom < 2) return 0;
    if (zoom < 3) return 1;
    if (zoom < 5) return 2; // continent view
    if (zoom < 7) return 3; // country/state
    if (zoom < 9) return 4; // metro region
    if (zoom < 11) return 5; // city
    if (zoom < 13) return 6; // neighborhood
    if (zoom < 15) return 7; // street-level clusters
    if (zoom < 17) return 8; // very detailed street view
    if (zoom < 19) return 9; // ultra detailed street view
    return 10;
  }

  async getAllOnline(
    center: Point,
    count: number,
  ): Promise<DriverRedisSnapshot[]> {
    const drivers = await this.redisClient.ft.search(
      'index:driver',
      `@location:[${center.lng} ${center.lat} 100000000 m]`,
      {
        LIMIT: {
          from: 0,
          size: count,
        },
      },
    );
    Logger.debug(`Found ${drivers.total} drivers in range`);
    return plainToInstance(
      DriverRedisSnapshot,
      drivers.documents.map((doc) => doc.value) || [],
    );
  }

  async expire(userId: number[]) {
    const pipeline = this.redisClient.multi();

    for (const id of userId) {
      pipeline.del(`driver:${id}`);
      pipeline.zRem('driver:lastSeen', id.toString());
      for (const res of SUPPORTED_H3_RESOLUTIONS) {
        const h3Index = await this.redisClient.get(`driver:h3:${res}:${id}`);
        if (h3Index) {
          pipeline.sRem(`h3:cluster:${res}:${h3Index}`, id.toString());
          pipeline.del(`driver:h3:${res}:${id}`);
        }
      }
    }

    await pipeline.exec();
  }

  async updateDriverOfferFilters(
    driverId: number,
    filters: {
      searchDistance?: number;
      serviceIds?: number[];
    },
  ): Promise<void> {
    const pipeline = this.redisClient.multi();
    let hasCommands = false;

    if (filters.searchDistance != null) {
      pipeline.json.set(
        `driver:${driverId}`,
        '$.searchDistance',
        filters.searchDistance,
      );
      hasCommands = true;
    }

    if (filters.serviceIds != null) {
      pipeline.json.set(
        `driver:${driverId}`,
        '$.serviceIds',
        filters.serviceIds,
      );
      hasCommands = true;
    }

    // Only execute if we have commands to run
    if (hasCommands) {
      await pipeline.exec();
    }
  }
}
