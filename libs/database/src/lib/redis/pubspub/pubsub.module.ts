// pubsub.module.ts
import { Module, Global } from '@nestjs/common';
import { PubSubService } from './pubsub.service';
import { RedisPubSubAdapter } from './pubsub.redis.adapter';
import { PUBSUB } from './pubsub.token';

@Global()
@Module({
  providers: [
    {
      provide: PUBSUB,
      useFactory: () => {
        return new RedisPubSubAdapter(process.env.REDIS_URL);
      },
    },
    PubSubService,
  ],
  exports: [PUBSUB, PubSubService],
})
export class PubSubModule {}
