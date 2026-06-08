/**
 * Jikan v4 proxy service.
 *
 * Rate limits: 3 req/s, 60 req/min.
 * Strategy: a simple token-bucket queue throttles outbound requests so we
 * never burst past 3/s. Redis caches every response; most endpoints use a
 * 6-hour TTL. Seasonal/currently-airing data uses 30 min.
 */
import axios from 'axios';
import redis, { withCache } from '../db/redis.js';

const BASE = 'https://api.jikan.moe/v4';

// ─── Token-bucket throttle (3 req/s) ─────────────────────────────────────────

const queue = [];
let tokens = 3;
let lastRefill = Date.now();

function refill() {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(3, tokens + elapsed * 3);
  lastRefill = now;
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    drain();
  });
}

function drain() {
  refill();
  while (queue.length && tokens >= 1) {
    tokens -= 1;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve).catch(reject);
  }
  if (queue.length) {
    // Schedule next drain when a token becomes available (~334 ms)
    setTimeout(drain, Math.ceil((1 - tokens) * 334));
  }
}

// ─── Raw Jikan fetch (goes through the queue) ─────────────────────────────────

async function jikan(path, params = {}) {
  return enqueue(async () => {
    try {
      const { data } = await axios.get(`${BASE}${path}`, {
        params,
        timeout: 10_000,
        headers: { 'Accept-Encoding': 'gzip' },
      });
      return data;
    } catch (err) {
      if (err.response?.status === 429) {
        // Back off 1s and re-queue
        await new Promise((r) => setTimeout(r, 1000));
        return jikan(path, params);
      }
      throw err;
    }
  });
}

// ─── Response normaliser ──────────────────────────────────────────────────────
// Converts Jikan's verbose shape to our leaner internal format.

function normalise(raw) {
  if (!raw) return null;
  return {
    id:          raw.mal_id,
    title:       raw.title_english || raw.title,
    titleJp:     raw.title_japanese || raw.titles?.find((t) => t.type === 'Japanese')?.title || raw.title,
    image:       raw.images?.webp?.large_image_url || raw.images?.jpg?.large_image_url || null,
    imageSm:     raw.images?.webp?.image_url       || raw.images?.jpg?.image_url       || null,
    trailer:     raw.trailer?.embed_url || null,
    type:        raw.type,           // TV, Movie, OVA …
    episodes:    raw.episodes,
    status:      raw.status,         // 'Finished Airing' | 'Currently Airing' | 'Not yet aired'
    airing:      raw.airing,
    season:      raw.season,
    year:        raw.year || (raw.aired?.from ? new Date(raw.aired.from).getFullYear() : null),
    score:       raw.score,
    scoredBy:    raw.scored_by,
    rank:        raw.rank,
    popularity:  raw.popularity,
    synopsis:    raw.synopsis,
    studios:     (raw.studios  || []).map((s) => s.name),
    genres:      (raw.genres   || []).map((g) => ({ id: g.mal_id, name: g.name })),
    themes:      (raw.themes   || []).map((t) => t.name),
    demographics:(raw.demographics || []).map((d) => d.name),
    // full detail only (from /anime/{id}/full)
    relations:   raw.relations || undefined,
    streaming:   raw.streaming || undefined,
    external:    raw.external  || undefined,
  };
}

function normalisePage(data) {
  return {
    items:      (data.data || []).map(normalise),
    pagination: data.pagination || null,
  };
}

// ─── TTLs ─────────────────────────────────────────────────────────────────────

const TTL = {
  detail:   24 * 60 * 60,  // 24 h
  search:    1 * 60 * 60,  // 1 h
  top:       3 * 60 * 60,  // 3 h
  seasonal: 30 * 60,       // 30 m — airing status updates frequently
  genres:   24 * 60 * 60,  // 24 h — genre list is very stable
};

// ─── Title-match re-ranker ────────────────────────────────────────────────────
// Jikan orders by score by default. When there's a text query we re-sort so
// exact/prefix matches surface above deeper substring hits.

function sortByTitleMatch(items, query) {
  if (!query) return items;
  const q = query.toLowerCase();
  const rank = (item) => {
    const t = (item.title || '').toLowerCase();
    if (t === q)          return 0; // exact
    if (t.startsWith(q))  return 1; // prefix
    return 2;                        // partial
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Single anime — full detail */
export async function getById(id) {
  return withCache(`anime:detail:${id}`, TTL.detail, async () => {
    const data = await jikan(`/anime/${id}/full`);
    return normalise(data.data);
  });
}

/**
 * Search anime.
 * @param {object} opts - q, page, limit, type, status, genres (comma-sep ids), order_by, sort, min_score, max_score, rating, sfw
 */
export async function search(opts = {}) {
  const params = {
    q:         opts.q        || undefined,
    page:      opts.page     || 1,
    limit:     Math.min(opts.limit || 24, 25), // Jikan max 25
    type:      opts.type     || undefined,
    status:    opts.status   || undefined,      // airing | complete | upcoming
    genres:    opts.genres   || undefined,      // comma-separated MAL genre ids
    order_by:  opts.order_by || 'score',
    sort:      opts.sort     || 'desc',
    min_score: opts.min_score || undefined,
    max_score: opts.max_score || undefined,
    rating:    opts.rating   || undefined,      // g | pg | pg13 | r17 | r | rx
    sfw:       true,
  };

  // Remove undefined keys so Jikan doesn't get empty params
  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);

  const cacheKey = `anime:search:${JSON.stringify(params)}`;
  return withCache(cacheKey, TTL.search, async () => {
    const data = await jikan('/anime', params);
    const result = normalisePage(data);
    result.items = sortByTitleMatch(result.items, opts.q);
    return result;
  });
}

/** Top anime — bypopularity, byrating, etc. */
export async function getTop(opts = {}) {
  const params = {
    filter: opts.filter || 'bypopularity', // bypopularity | favorite | airing | upcoming | complete
    type:   opts.type   || undefined,
    page:   opts.page   || 1,
    limit:  Math.min(opts.limit || 24, 25),
  };
  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);

  const cacheKey = `anime:top:${JSON.stringify(params)}`;
  return withCache(cacheKey, TTL.top, async () => {
    const data = await jikan('/top/anime', params);
    return normalisePage(data);
  });
}

/** Currently airing this season */
export async function getSeasonNow(opts = {}) {
  const params = { page: opts.page || 1, limit: Math.min(opts.limit || 24, 25) };
  const cacheKey = `anime:seasonal:now:${params.page}`;
  return withCache(cacheKey, TTL.seasonal, async () => {
    const data = await jikan('/seasons/now', params);
    return normalisePage(data);
  });
}

/** Specific season, e.g. /seasons/2024/winter */
export async function getSeason(year, season, opts = {}) {
  const params = { page: opts.page || 1, limit: Math.min(opts.limit || 24, 25) };
  const cacheKey = `anime:season:${year}:${season}:${params.page}`;
  return withCache(cacheKey, TTL.seasonal, async () => {
    const data = await jikan(`/seasons/${year}/${season}`, params);
    return normalisePage(data);
  });
}

/** All genres from MAL */
export async function getGenres() {
  return withCache('anime:genres', TTL.genres, async () => {
    const data = await jikan('/genres/anime');
    return (data.data || []).map((g) => ({
      id:    g.mal_id,
      name:  g.name,
      count: g.count,
      type:  g.type || 'Genres',
    }));
  });
}

/** Recommendations for a given anime */
export async function getRecommendations(animeId) {
  return withCache(`anime:recs:${animeId}`, TTL.detail, async () => {
    const data = await jikan(`/anime/${animeId}/recommendations`);
    return (data.data || []).slice(0, 10).map((r) => ({
      ...normalise(r.entry),
      votes: r.votes,
    }));
  });
}

/** Characters + voice actors for an anime */
export async function getCharacters(animeId) {
  return withCache(`anime:chars:${animeId}`, TTL.detail, async () => {
    const data = await jikan(`/anime/${animeId}/characters`);
    return (data.data || [])
      .filter((c) => c.role === 'Main')
      .slice(0, 8)
      .map((c) => {
        const jaVA = (c.voice_actors || []).find((v) => v.language === 'Japanese');
        return {
          id:      c.character.mal_id,
          name:    c.character.name,
          image:   c.character.images?.webp?.image_url || c.character.images?.jpg?.image_url || null,
          role:    c.role,
          va:      jaVA?.person?.name ?? null,
          vaImage: jaVA?.person?.images?.jpg?.image_url ?? null,
        };
      });
  });
}

/** Invalidate a cached entry — call when user reports stale data */
export async function bustCache(animeId) {
  const keys = [`anime:detail:${animeId}`, `anime:recs:${animeId}`];
  await Promise.allSettled(keys.map((k) => redis.del(k)));
}

/**
 * Prewarm Redis on startup so the first users never hit a cold cache.
 * Fires in the background — failures are logged but never throw.
 */
export async function prewarmCache() {
  console.log('🔥 Prewarming Redis cache...');
  try {
    await Promise.allSettled([
      getTop({ filter: 'bypopularity', page: 1, limit: 24 }),
      getTop({ filter: 'byrating',     page: 1, limit: 24 }),
      getSeasonNow({ page: 1, limit: 24 }),
    ]);
    console.log('✅ Cache prewarmed');
  } catch (err) {
    console.warn('Cache prewarm failed (non-fatal):', err.message);
  }
}
