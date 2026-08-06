import 'server-only';

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

export function rateLimit(headers: Headers, opts: Options): RateLimitResult {
  const key = clientKey(headers, opts.keyPrefix);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= opts.windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: opts.max - 1, resetMs: opts.windowMs };
  }

  if (existing.count >= opts.max) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, opts.windowMs - (now - existing.windowStart)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, opts.max - existing.count),
    resetMs: Math.max(0, opts.windowMs - (now - existing.windowStart)),
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 60 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
