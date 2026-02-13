export function withInitial<T>(
  live: AsyncIterable<T>,
  getInitial: () => Promise<T | T[] | null | undefined>,
): AsyncIterable<T> {
  return (async function* () {
    const initial = await getInitial();
    if (Array.isArray(initial)) {
      for (const item of initial) yield item;
    } else if (initial) {
      yield initial;
    }
    for await (const ev of live) yield ev;
  })();
}
