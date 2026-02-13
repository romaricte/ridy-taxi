import { Inject, Injectable } from '@nestjs/common';
import { REDIS } from './redis-token';
import { RedisClientType } from 'redis';

@Injectable()
export class ActiveOrderRiderRedisService {
  constructor(@Inject(REDIS) readonly redisService: RedisClientType) {}
  async updateLastSeenForRider(orderId: number, lastSeenAt: Date) {
    const pipeline = this.redisService.multi();
    pipeline.json.set(
      `active_order:${orderId}`,
      '$.chatMessages[*].riderLastSeenAt',
      lastSeenAt.getTime(),
    );
    await pipeline.exec();
  }
}
