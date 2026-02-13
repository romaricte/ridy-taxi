import { Inject, Injectable, Logger } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { RiderRedisSnapshot } from './models/rider-redis-snapshot';
import { RiderEphemeralMessageSnapshot } from './models/rider-ephemeral-message-snapshot';
import { Gender } from '../entities';
import { REDIS } from './redis-token';
import { RedisClientType } from 'redis';

@Injectable()
export class RiderRedisService {
  constructor(@Inject(REDIS) private readonly redisClient: RedisClientType) {}

  async createOnlineRider(input: {
    riderId: string;
    firstName: string;
    lastName: string;
    countryIso?: string | null;
    mobileNumber: string;
    email: string | null;
    gender: Gender | null;
    profileImageUrl: string | null;
    activeOrderIds: string[];
    fcmTokens?: string[];
    walletCredit: number;
    currency: string;
  }): Promise<void> {
    const snapshot: RiderRedisSnapshot = {
      id: input.riderId,
      firstName: input.firstName,
      mobileNumber: input.mobileNumber,
      countryIso: input.countryIso || null,
      lastName: input.lastName,
      fcmTokens: input.fcmTokens,
      activeOrderIds: input.activeOrderIds,
      walletCredit: input.walletCredit,
      email: input.email || null,
      gender: input.gender || null,
      profileImageUrl: input.profileImageUrl || null,
      currency: input.currency || process.env.DEFAULT_CURRENCY || 'USD',
    };
    await this.redisClient.json.set(
      `rider:${input.riderId}`,
      '$',
      instanceToPlain(snapshot),
    );
  }

  async getOnlineRider(riderId: string): Promise<RiderRedisSnapshot | null> {
    const rider = await this.redisClient.json.get(`rider:${riderId}`);
    if (rider) {
      return plainToInstance(RiderRedisSnapshot, rider);
    }
    return null;
  }

  async addActiveOrderToRider(riderId: string, orderId: string) {
    const key = `rider:${riderId}`;
    const path = '$.activeOrderIds';
    await this.redisClient.json.arrAppend(key, path, orderId);
  }

  async createEphemeralMessage(
    riderId: string,
    ephemeralMessage: RiderEphemeralMessageSnapshot,
  ) {
    const key = `rider_ephemeral_messages:${riderId}`;

    // Ensure the root exists and is an array
    await this.redisClient
      .multi()
      .json.set(key, '$', [], {
        NX: true, // Only create if it doesn't exist
      }) // create [] only if missing
      .json.arrAppend(key, '$', instanceToPlain(ephemeralMessage))
      .exec();
  }

  async updateOnlineRider(
    id: string,
    updateData: Partial<RiderRedisSnapshot>,
  ): Promise<void> {
    const pipeline = this.redisClient.multi();
    const key = `rider:${id}`;
    for (const [field, value] of Object.entries(updateData)) {
      pipeline.json.set(key, `$.${field}`, instanceToPlain(value));
    }
    await pipeline.exec();
  }

  async getEphemeralMessages(
    riderId: string,
    expireOnRead: boolean,
  ): Promise<RiderEphemeralMessageSnapshot[]> {
    const json = await this.redisClient.json.get(
      `rider_ephemeral_messages:${riderId}`,
    );

    Logger.debug(`Retrieved ephemeral messages for rider ${riderId}:`, json);

    if (!json) {
      return [];
    }

    if (expireOnRead) {
      await this.deleteEphemeralMessages(riderId);
      Logger.debug(
        `Deleted ephemeral messages for rider ${riderId} after read`,
      );
    }

    // json is [[ {...}, {...} ]]
    const processedResults = plainToInstance(
      RiderEphemeralMessageSnapshot,
      json as any[],
    );

    Logger.debug(
      `Processed ${processedResults.length} ephemeral messages for rider ${riderId}`,
    );
    return processedResults;
  }

  async deleteEphemeralMessages(riderId: string) {
    await this.redisClient.del(`rider_ephemeral_messages:${riderId}`);
  }

  async deleteEphemeralMessageForRider(riderId: string, messageId: string) {
    const key = `rider_ephemeral_messages:${riderId}`;

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
    await this.redisClient.json.arrPop(key, { path: '$', index: idx });

    // If array is now empty, remove the key entirely
    const lenResp = (await this.redisClient.json.arrLen(key, {
      path: '$',
    })) as (number | null)[];
    const len = Array.isArray(lenResp) ? (lenResp[0] ?? 0) : 0;
    if (len <= 0) {
      await this.redisClient.unlink(key);
    }
  }
}
