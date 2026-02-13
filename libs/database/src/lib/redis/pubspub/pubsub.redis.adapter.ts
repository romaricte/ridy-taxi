// pubsub.redis.adapter.ts
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { PubSubPort } from './pubsub.port';

export class RedisPubSubAdapter implements PubSubPort {
  private inner: RedisPubSub;
  constructor(redisUrl: string) {
    const options = { lazyConnect: true, maxRetriesPerRequest: null } as any;
    this.inner = new RedisPubSub({
      publisher: new Redis(redisUrl, options),
      subscriber: new Redis(redisUrl, options),
    });
  }
  publish(trigger: string, payload: any) {
    return this.inner.publish(trigger, payload);
  }
  asyncIterator(triggers: string | string[]) {
    return this.inner.asyncIterator(triggers);
  }
}
