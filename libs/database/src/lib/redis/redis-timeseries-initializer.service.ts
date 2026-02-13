// src/infra/redis-search-migration.service.ts
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS } from './redis-token';

@Injectable()
export class RedisTimeSeriesInitializerService
  implements OnApplicationBootstrap
{
  constructor(@Inject(REDIS) private readonly redis: RedisClientType) {}

  async onApplicationBootstrap(): Promise<void> {}
}
