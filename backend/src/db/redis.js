import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

redis.on('error', (err) => console.warn('Redis error (non-fatal):', err.message));

export default redis;

// Stale copies live 7 days — if the upstream API is down or rate limiting,
// week-old data beats an error page.
const STALE_TTL = 7 * 24 * 60 * 60;

// In-flight request map: N concurrent requests for the same uncached key
// produce exactly ONE upstream fetch — the rest await the same promise.
const inflight = new Map();

/**
 * Stale-while-revalidate cache.
 *
 * Every successful fetch is written twice: `key` (fresh, ttlSeconds) and
 * `stale:key` (7-day fallback). Reads hit fresh first; on a fetch failure the
 * stale copy is served instead of the error. Only a resource we have NEVER
 * fetched can surface an error to the caller.
 */
export async function withCache(key, ttlSeconds, fetchFn) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch {}

  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    try {
      const data = await fetchFn();
      try {
        await redis
          .multi()
          .setex(key, ttlSeconds, JSON.stringify(data))
          .setex(`stale:${key}`, STALE_TTL, JSON.stringify(data))
          .exec();
      } catch {}
      return data;
    } catch (err) {
      try {
        const stale = await redis.get(`stale:${key}`);
        if (stale) {
          console.warn(`Serving stale cache for ${key} (${err.message})`);
          return JSON.parse(stale);
        }
      } catch {}
      throw err;
    }
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
