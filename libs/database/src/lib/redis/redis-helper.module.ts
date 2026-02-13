import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverEntity } from '../entities/taxi/driver.entity';
import { DriverRedisService } from './driver-redis.service';
import { RideOfferRedisService } from './ride-offer-redis.service';
import { AuthRedisService } from '../sms/auth-redis.service';
import { TaxiServiceRedisService } from './taxi-service.redis.service';
import { ServiceEntity } from '../entities';
import { RiderRedisService } from './rider-redis.service';
import { ActiveOrderCommonRedisService } from './active-order-common.redis.service';
import { ActiveOrderDriverRedisService } from './active-order-driver-redis.service';
import { ActiveOrderRiderRedisService } from './active-order-rider-redis.service';
import { createClient, RedisClientType } from 'redis';
import { REDIS } from './redis-token';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DriverEntity, ServiceEntity])],
  providers: [
    {
      provide: REDIS,
      useFactory: async (): Promise<RedisClientType> => {
        const client = createClient({
          url: process.env.REDIS_URL,
          socket: {
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
          },
        }).on('error', (e) => console.error('Redis error', e));
        await client.connect();
        return client as unknown as RedisClientType;
      },
    },
    DriverRedisService,
    RideOfferRedisService,
    AuthRedisService,
    TaxiServiceRedisService,
    RiderRedisService,
    ActiveOrderDriverRedisService,
    ActiveOrderRiderRedisService,
    ActiveOrderCommonRedisService,
  ],
  exports: [
    REDIS,
    DriverRedisService,
    RideOfferRedisService,
    TaxiServiceRedisService,
    AuthRedisService,
    RiderRedisService,
    ActiveOrderDriverRedisService,
    ActiveOrderRiderRedisService,
    ActiveOrderCommonRedisService,
  ],
})
export class RedisHelpersModule {
  // constructor(@Inject(REDIS) private readonly redisClient: RedisClientType) {}
  // async onModuleInit() {
  //   try {
  //     await this.redisClient.ft.create(
  //       'index:driver',
  //       {
  //         '$.location': { AS: 'location', type: SCHEMA_FIELD_TYPE.GEO },
  //         '$.serviceIds[*]': {
  //           AS: 'serviceId',
  //           type: SCHEMA_FIELD_TYPE.TAG,
  //         },
  //         '$.fleetId': { AS: 'fleetId', type: SCHEMA_FIELD_TYPE.TAG },
  //         '$.status': { AS: 'status', type: SCHEMA_FIELD_TYPE.TAG },
  //         '$.currentOrderIds': {
  //           AS: 'currentOrderIds',
  //           type: SCHEMA_FIELD_TYPE.TAG,
  //         },
  //         '$.assignedRiderIds': {
  //           AS: 'assignedRiderIds',
  //           type: SCHEMA_FIELD_TYPE.TAG,
  //         },
  //         '$.searchDistance': {
  //           AS: 'searchDistance',
  //           type: SCHEMA_FIELD_TYPE.NUMERIC,
  //         },
  //         '$.locationTime': {
  //           AS: 'locationTime',
  //           type: SCHEMA_FIELD_TYPE.NUMERIC,
  //         },
  //       },
  //       {
  //         ON: 'JSON',
  //         PREFIX: 'driver:',
  //       },
  //     );
  //   } catch (error) {
  //     if (error.message.includes('already exists')) {
  //       console.warn('Index index:driver already exists, skipping creation.');
  //     } else {
  //       console.error('Error creating index index:driver:meta:', error);
  //     }
  //   }
  //   try {
  //     await this.redisClient.ft.create(
  //       'index:ride_offer',
  //       {
  //         '$.id': { AS: 'id', type: SCHEMA_FIELD_TYPE.TAG },
  //         '$.pickupLocation': {
  //           AS: 'pickupLocation',
  //           type: SCHEMA_FIELD_TYPE.GEO,
  //         },
  //         '$.type': { AS: 'type', type: SCHEMA_FIELD_TYPE.TAG },
  //         '$.riderId': { AS: 'riderId', type: SCHEMA_FIELD_TYPE.TAG },
  //         '$.serviceId': { AS: 'serviceId', type: SCHEMA_FIELD_TYPE.TAG },
  //         '$.fleetId': { AS: 'fleetId', type: SCHEMA_FIELD_TYPE.TAG },
  //         '$.createdAt': {
  //           AS: 'createdAt',
  //           type: SCHEMA_FIELD_TYPE.NUMERIC,
  //         },
  //         '$.scheduledAt': {
  //           AS: 'scheduledAt',
  //           type: SCHEMA_FIELD_TYPE.NUMERIC,
  //         },
  //       },
  //       {
  //         ON: 'JSON',
  //         PREFIX: 'ride_offer:',
  //       },
  //     );
  //   } catch (error) {
  //     if (error.message.includes('already exists')) {
  //       console.warn('Index index:order:meta already exists, skipping creation.');
  //     } else {
  //       console.error('Error creating index index:order:meta:', error);
  //     }
  //   }
  //   try {
  //     try {
  //       await this.redisClient.ft.create(
  //         'index:active_order',
  //         {
  //           '$.id': { AS: 'id', type: SCHEMA_FIELD_TYPE.TAG },
  //           '$.pickupLocation': {
  //             AS: 'pickupLocation',
  //             type: SCHEMA_FIELD_TYPE.GEO,
  //           },
  //           '$.riderId': { AS: 'riderId', type: SCHEMA_FIELD_TYPE.TAG },
  //           '$.driverId': { AS: 'driverId', type: SCHEMA_FIELD_TYPE.TAG },
  //           '$.serviceId': { AS: 'serviceId', type: SCHEMA_FIELD_TYPE.TAG },
  //           '$.fleetId': { AS: 'fleetId', type: SCHEMA_FIELD_TYPE.TAG },
  //           '$.status': { AS: 'status', type: SCHEMA_FIELD_TYPE.TAG },
  //           '$.type': { AS: 'type', type: SCHEMA_FIELD_TYPE.TAG },
  //           '$.createdAt': {
  //             AS: 'createdAt',
  //             type: SCHEMA_FIELD_TYPE.NUMERIC,
  //           },
  //         },
  //         {
  //           ON: 'JSON',
  //           PREFIX: 'active_order:',
  //         },
  //       );
  //     } catch (error) {
  //       if (error.message.includes('already exists')) {
  //         console.warn(
  //           'Index index:order:meta already exists, skipping creation.',
  //         );
  //       } else {
  //         console.error('Error creating index index:order:meta:', error);
  //       }
  //     }
  //   } catch (error) {
  //     if (error.message.includes('already exists')) {
  //       console.warn('Index index:order:meta already exists, skipping creation.');
  //     } else {
  //       console.error('Error creating index index:order:meta:', error);
  //     }
  //   }
  //   try {
  //     await this.redisClient.ft.create(
  //       'index:taxi_service',
  //       {
  //         '$.regionIds[*]': { AS: 'regionIds', type: SCHEMA_FIELD_TYPE.TAG },
  //       },
  //       {
  //         ON: 'JSON',
  //         PREFIX: 'taxi_service:',
  //       },
  //     );
  //   } catch (error) {
  //     if (error?.message?.includes('already exists')) {
  //       console.warn(
  //         'Index index:taxi_service:meta already exists, skipping creation.',
  //       );
  //     } else {
  //       console.error('Error creating index index:taxi_service:meta:', error);
  //     }
  //   }
  // }
}
