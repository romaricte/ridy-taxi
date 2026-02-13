import { Inject, Injectable } from '@nestjs/common';
import { EventMap, buildTopic } from './events';
import { PubSubPort } from './pubsub.port';
import { PUBSUB } from './pubsub.token';

@Injectable()
export class PubSubService {
  constructor(@Inject(PUBSUB) private readonly inner: PubSubPort) {}

  publish<K extends keyof EventMap>(
    key: K,
    params: EventMap[K]['params'],
    payload: EventMap[K]['payload'],
  ): Promise<void> {
    return this.inner.publish(buildTopic(key, params), payload) as any;
  }

  asyncIterator<K extends keyof EventMap>(
    key: K,
    params: EventMap[K]['params'],
  ) {
    return this.inner.asyncIterator<EventMap[K]['payload']>(
      buildTopic(key, params),
    );
  }
}
