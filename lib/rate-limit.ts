import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from './logger';

interface Bucket {
  windowStart: number;
  count: number;
}

interface Options {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

function clientKey(headers: Headers, prefix: string): string {
  const forwarded = headers.get('x-forwarded-for');
  const real = headers.get('x-real-ip');
  const ip = (forwarded?.split(',')[0]?.trim() || real || 'unknown').slice(0, 64);
  return `${prefix}:${ip}`;
}

function hasRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL
  );
}

function createRedis(): Redis | null {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      return Redis.fromEnv();
    }
    const url = process.env.REDIS_URL;
    if (url && url.startsWith('http')) {
      return new Redis({
        url,
        token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
      });
    }
    if (url) {
      logger.warn('rate-limit', 'REDIS_URL is not an Upstash REST URL (must start with http); falling back to memory limiter.');
    }
    return null;
  } catch (err) {
    logger.warn('rate-limit', { message: 'Failed to create Redis client; falling back to memory', error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

const limiterCache = new Map<string, Ratelimit>();

function getRatelimiter(max: number, windowMs: number): Ratelimit | null {
  const cacheKey = `${max}|${windowMs}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  const redis = createRedis();
  if (!redis) return null;

  const minutes = windowMs / 60_000;
  const limiter = new Ratelimit({
    redis,
    prefix: 'dl-rate-limit',
    limiter:
      minutes >= 1 && Number.isInteger(minutes)
        ? Ratelimit.slidingWindow(max, `${minutes} m`)
        : Ratelimit.slidingWindow(max, `${Math.round(windowMs / 1000)} s`),
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

function memoryLimit(headers: Headers, opts: Options): RateLimitResult {
  const key = clientKey(headers, opts.keyPrefix);
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now - existing.windowStart >= opts.windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: opts.max - 1, resetMs: opts.windowMs };
  }
  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, resetMs: Math.max(0, opts.windowMs - (now - existing.windowStart)) };
  }
  existing.count += 1;
  return { allowed: true, remaining: Math.max(0, opts.max - existing.count), resetMs: Math.max(0, opts.windowMs - (now - existing.windowStart)) };
}

export async function rateLimit(headers: Headers, opts: Options): Promise<RateLimitResult> {
  if (!hasRedis()) {
    return memoryLimit(headers, opts);
  }

  try {
    const limiter = getRatelimiter(opts.max, opts.windowMs);
    if (!limiter) return memoryLimit(headers, opts);
    const key = clientKey(headers, opts.keyPrefix);
    const { success, remaining, reset } = await limiter.limit(key);
    // Upstash `reset` is a Unix timestamp in ms.
    const resetMs = Math.max(0, reset - Date.now());
    return { allowed: success, remaining, resetMs };
  } catch (err) {
    // Fail-open: Redis outage must not take down uploads.
    logger.warn('rate-limit', { message: 'Redis limit failed; failing open to memory limiter', error: err instanceof Error ? err.message : String(err) });
    return memoryLimit(headers, opts);
  }
}
