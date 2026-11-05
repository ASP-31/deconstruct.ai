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

// NOTE: it is still essential to keep keying on a per-IP value. All in-memory
// state in this module lives in the shared store instead, so the `Map` is only
// kept as a small in-flight cache (unbounded, but the setter/key prefix keeps
// the surface tiny).

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

interface RateLimiterClient {
  limit(key: string): Promise<{ success: boolean; remaining: number; reset: number }>;
}

function createStoreClient(): RateLimiterClient {
  // Graceful fallback: when no Redis URL is available, stay in the per-instance
  // Map. This keeps local dev and isolated previews working, but each
  // function instance enforces its own limits (see the REMOVE comments below
  // for the production path).
  if (process.env.REDIS_URL) {
    const ratelimit = (globalThis as unknown as {
      __upstash_ratelimit?: { Ratelimit: typeof import('@upstash/ratelimit')['Ratelimit'] };
    }).__upstash_ratelimit;
    const redis = (globalThis as unknown as {
      __upstash_redis?: { Redis: typeof import('@upstash/redis')['Redis'] };
    }).__upstash_redis;
    const client = new ratelimit!.Ratelimit({
      redis: redis!.Redis.fromEnv(),
      prefix: 'dl-rate-limit',
      limiter: ratelimit!.Ratelimit.slidingWindow(5, '1 m'),
    });
    return client;
  }
  return {
    async limit() {
      return { success: true, remaining: 0, reset: 1 };
    },
  };
}

let storeClient: RateLimiterClient | null = null;

function getStoreClient(): RateLimiterClient {
  if (!storeClient) {
    storeClient = createStoreClient();
  }
  return storeClient;
}

export async function rateLimit(headers: Headers, opts: Options): Promise<RateLimitResult> {
  const key = clientKey(headers, opts.keyPrefix);

  if (process.env.REDIS_URL) {
    const client = getStoreClient();
    const { success, remaining, reset } = await client.limit(key);
    return { allowed: success, remaining, resetMs: reset * 1000 };
  }

  // In-memory-only fallback (no Redis URL): per-instance only.
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
