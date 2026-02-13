import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { REDIS } from './redis-token';

@Injectable()
export class ActiveOrderDriverRedisService {
  constructor(@Inject(REDIS) private readonly redisService: RedisClientType) {}

  async updateLastSeenForDriver(orderId: number, lastSeenAt: Date) {
    const pipeline = this.redisService.multi();
    pipeline.json.set(
      `active_order:${orderId}`,
      '$.chatMessages[*].driverLastSeenAt',
      lastSeenAt.getTime(),
    );
    await pipeline.exec();
  }
}
