import type { NextFunction, Request, Response } from "express";

type Bucket = {
  tokens: number;
  lastRefillMs: number;
  lastSeenMs: number;
};

type RateLimitOptions = {
  requestsPerSecond: number;
  burst: number;
  idleTtlMs: number;
  keyResolver: (req: Request) => string | null;
};

export const createInMemoryRateLimit = (options: RateLimitOptions) => {
  const buckets: Map<string, Bucket> = new Map<string, Bucket>();

  const cleanupEveryMs: number = Math.min(options.idleTtlMs, 60_000);
  setInterval(() => {
    const nowMs: number = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (nowMs - bucket.lastSeenMs > options.idleTtlMs) {
        buckets.delete(key);
      }
    }
  }, cleanupEveryMs).unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key: string | null = options.keyResolver(req);
    if (!key) {
      res.status(401).json({ error: "missing_x_api_key" });
      return;
    }

    const nowMs: number = Date.now();

    let bucket: Bucket | undefined = buckets.get(key);
    if (!bucket) {
      bucket = { tokens: options.burst, lastRefillMs: nowMs, lastSeenMs: nowMs };
      buckets.set(key, bucket);
    }

    bucket.lastSeenMs = nowMs;

    const elapsedMs: number = nowMs - bucket.lastRefillMs;
    const refillTokens: number = (elapsedMs / 1000) * options.requestsPerSecond;

    if (refillTokens > 0) {
      bucket.tokens = Math.min(options.burst, bucket.tokens + refillTokens);
      bucket.lastRefillMs = nowMs;
    }

    if (bucket.tokens < 1) {
      res.setHeader("Retry-After", "1");
      res.status(429).json({ error: "rate_limited", message: "Too many requests." });
      return;
    }

    bucket.tokens -= 1;
    next();
  };
};

// Resolver global: SOLO x-api-key
export const resolveAppKey = (req: Request): string | null => {
  const v: string | undefined = req.header("x-api-key") ?? undefined;
  return v && v.trim().length > 0 ? v.trim() : null;
};
