export abstract class PubSubPort {
  abstract publish<T = any>(trigger: string, payload: T): Promise<void>;
  abstract asyncIterator<T = any>(
    triggers: string | string[],
  ): AsyncIterator<T>;
}
