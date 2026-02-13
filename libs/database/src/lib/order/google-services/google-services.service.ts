import { RoutesClient } from '@googlemaps/routing';
import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '@nestjs/apollo';
import { Point } from '../../interfaces/point';
import { SharedConfigurationService } from '../../config/shared-configuration.service';
import { ShopEntity } from '../../entities/shop/shop.entity';
import { RiderAddressEntity } from '../../entities/rider-address.entity';
import { google } from '@googlemaps/routing/build/protos/protos';

@Injectable()
export class GoogleServicesService {
  constructor(private configurationService: SharedConfigurationService) {}

  async getSumDistanceAndDuration(points: Point[]): Promise<{
    distance: number;
    duration: number;
    directions: Point[];
  }> {
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'dev') {
      return {
        distance: 1000,
        duration: 100,
        directions: points,
      };
    }
    const config = await this.configurationService.getConfiguration();

    let client = new RoutesClient({
      apiKey: config?.backendMapsAPIKey,
      retryOptions: {
        maxRetries: 3,
        initialRetryDelayMillis: 1000,
        retryDelayMultiplier: 2,
        maxRetryDelayMillis: 10000,
      },
    });

    const waypoints = points.map((point) => ({
      location: {
        latLng: {
          latitude: point.lat,
          longitude: point.lng,
        },
      },
    }));

    try {
      const routesResponse = await client.computeRoutes(
        {
          origin: waypoints[0],
          destination: waypoints[waypoints.length - 1],
          intermediates: waypoints.length > 2 ? waypoints.slice(1, -1) : [],
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
          computeAlternativeRoutes: false,
          polylineQuality: 'OVERVIEW',
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: false,
          },
          languageCode: 'en-US',
          units: 'METRIC',
        },
        {
          otherArgs: {
            headers: {
              'X-Goog-FieldMask':
                'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
            },
          },
        },
      );

      if (routesResponse[0].routes?.length === 0 || !routesResponse[0].routes) {
        throw new ForbiddenError(routesResponse.toString());
      }

      const route = routesResponse[0].routes[0];
      const distance = route.distanceMeters || 0;
      const duration = parseInt(
        route.duration?.seconds?.toString().replace('s', '') || '0',
        10,
      );

      let directions = this.decode(
        route.polyline?.encodedPolyline?.toString() || '',
      );

      return { distance, duration, directions };
    } catch (exception) {
      throw new ForbiddenError('NO_ROUTE_FOUND');
    }
  }

  async findTheBestRoute(
    shops: ShopEntity[],
    deliveryAddress: RiderAddressEntity,
  ): Promise<{
    shops: ShopEntity[];
    legs: google.maps.routing.v2.IRouteLeg[];
  }> {
    const config = await this.configurationService.getConfiguration();

    let client = new RoutesClient({
      apiKey: config?.backendMapsAPIKey,
      retryOptions: {
        maxRetries: 3,
        initialRetryDelayMillis: 1000,
        retryDelayMultiplier: 2,
        maxRetryDelayMillis: 10000,
      },
    });
    // find the farthest shop from the delivery address based on the distance
    // between the delivery address and the shop locations
    const farthestShop = shops.reduce((a, b) => {
      return this.distancePoints(a.location, deliveryAddress.location) >
        this.distancePoints(b.location, deliveryAddress.location)
        ? a
        : b;
    });
    const route = await client.computeRoutes(
      {
        origin: {
          location: {
            latLng: {
              latitude: farthestShop.location.lat,
              longitude: farthestShop.location.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: deliveryAddress.location.lat,
              longitude: deliveryAddress.location.lng,
            },
          },
        },
        intermediates: shops
          .filter((shop) => shop.id !== farthestShop.id)
          .map((shop) => ({
            location: {
              latLng: {
                latitude: shop.location.lat,
                longitude: shop.location.lng,
              },
            },
          })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        computeAlternativeRoutes: true,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
        languageCode: 'en-US',
        units: 'METRIC',
      },
      {
        otherArgs: {
          headers: {
            'X-Goog-FieldMask':
              'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
          },
        },
      },
    );
    if (route[0].routes?.length === 0 || !route[0].routes) {
      throw new ForbiddenError('NO_ROUTE_FOUND');
    }
    return {
      shops: [
        farthestShop,
        ...shops.filter((shop) => shop.id !== farthestShop.id),
      ],
      legs: route[0].routes[0].legs!,
    };
  }

  distancePoints(point1: Point, point2: Point): number {
    return Math.sqrt(
      Math.pow(point1.lat - point2.lat, 2) +
        Math.pow(point1.lng - point2.lng, 2),
    );
  }

  decode(encoded: string): Point[] {
    // array that holds the points

    const points: Point[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0,
      lng = 0;
    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
  }
}
