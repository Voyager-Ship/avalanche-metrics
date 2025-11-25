export function createRateLimiter(requestsPerSecond: number) {
  const interval = 1000 / requestsPerSecond;

  let queue: (() => Promise<void>)[] = [];
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;

    while (queue.length > 0) {
      const task = queue.shift();
      if (task) await task();
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    running = false;
  };

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      run();
    });
  };
}