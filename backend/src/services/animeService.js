/**
 * Jikan v4 proxy service.
 *
 * Jikan's limits are 3 req/s and 60 req/min. This proxy is built so a rate
 * limit error (or any transient upstream failure) almost never reaches the
 * frontend:
 *
 *   1. GLOBAL QUEUE  — every outgoing request passes through one queue that
 *      enforces 2 req/s and 55 req/min (a safety margin under the real
 *      limits). Concurrent user requests wait in line instead of bursting.
 *   2. RETRIES       — 429s and 5xx/network errors retry up to 3 times with
 *      1s / 2s / 4s backoff, re-entering the queue each time.
 *   3. STALE FALLBACK — every response is also cached for 7 days (see
 *      redis.js withCache); if retries are exhausted, the stale copy is
 *      served. Only never-before-fetched data can error.
 *   4. DEDUPLICATION — concurrent identical requests share one upstream call
 *      (in-flight map inside withCache).
 */
import axios from 'axios';
import redis, { withCache } from '../db/redis.js';

// Overridable so tests can point at a mock Jikan server.
const BASE = process.env.JIKAN_BASE_URL || 'https://api.jikan.moe/v4';

// ─── Global request queue: max 2 req/s AND 55 req/min ────────────────────────

const RATE_PER_SEC = 2;
const RATE_PER_MIN = 55;

const queue = [];
let sentTimes = []; // dispatch timestamps within the last 60s
let draining = false;

function canSend(now) {
  sentTimes = sentTimes.filter((ts) => now - ts < 60_000);
  if (sentTimes.length >= RATE_PER_MIN) return false;
  const lastSecond = sentTimes.filter((ts) => now - ts < 1000).length;
  return lastSecond < RATE_PER_SEC;
}

function drain() {
  if (draining) return;
  draining = true;
  const step = () => {
    const now = Date.now();
    while (queue.length && canSend(now)) {
      sentTimes.push(now);
      const { fn, resolve, reject } = queue.shift();
      fn().then(resolve, reject);
    }
    if (queue.length) {
      setTimeout(step, 150); // check again shortly for the next free slot
    } else {
      draining = false;
    }
  };
  step();
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    drain();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Raw Jikan fetch: queue + retry with exponential backoff ──────────────────

const RETRY_DELAYS = [1000, 2000, 4000];

async function jikan(path, params = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1]);
    try {
      return await enqueue(async () => {
        const { data } = await axios.get(`${BASE}${path}`, {
          params,
          timeout: 10_000,
          headers: { 'Accept-Encoding': 'gzip' },
        });
        return data;
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        throw Object.assign(new Error('Not found on MyAnimeList'), { status: 404 });
      }
      lastErr = err;
      // Retry only transient failures: 429, 5xx, or network/timeout errors
      const transient = status === 429 || status >= 500 || !status;
      if (!transient) break;
    }
  }
  const status = lastErr?.response?.status;
  throw Object.assign(
    new Error(`Upstream anime API error (${status || lastErr?.code || 'network'})`),
    { status: 502 },
  );
}

// ─── Response normaliser ──────────────────────────────────────────────────────
// Converts Jikan's verbose shape to our leaner internal format.

function normalise(raw) {
  if (!raw) return null;
  return {
    id:          raw.mal_id,
    title:       raw.title_english || raw.title,
    titleEn:     raw.title_english || null,
    titleJp:     raw.title_japanese || raw.titles?.find((t) => t.type === 'Japanese')?.title || raw.title,
    synonyms:    raw.title_synonyms || [],
    malUrl:      raw.url || null,
    image:       raw.images?.webp?.large_image_url || raw.images?.jpg?.large_image_url || null,
    imageSm:     raw.images?.webp?.image_url       || raw.images?.jpg?.image_url       || null,
    trailer:     raw.trailer?.embed_url || null,
    type:        raw.type,           // TV, Movie, OVA …
    episodes:    raw.episodes,
    status:      raw.status,         // 'Finished Airing' | 'Currently Airing' | 'Not yet aired'
    airing:      raw.airing,
    season:      raw.season,
    year:        raw.year || (raw.aired?.from ? new Date(raw.aired.from).getFullYear() : null),
    aired:       raw.aired?.string || null,          // "Apr 5, 2009 to Jul 4, 2010"
    broadcast:   raw.broadcast?.string || null,      // "Sundays at 17:00 (JST)"
    duration:    raw.duration || null,               // "24 min per ep"
    ageRating:   raw.rating   || null,               // "R - 17+ (violence & profanity)"
    source:      raw.source   || null,               // Manga, Light novel, Original …
    score:       raw.score,
    scoredBy:    raw.scored_by,
    rank:        raw.rank,
    popularity:  raw.popularity,
    members:     raw.members   ?? null,
    favorites:   raw.favorites ?? null,
    synopsis:    raw.synopsis,
    background:  raw.background || null,
    studios:     (raw.studios   || []).map((s) => ({ id: s.mal_id, name: s.name })),
    producers:   (raw.producers || []).map((p) => p.name),
    licensors:   (raw.licensors || []).map((l) => l.name),
    genres:      (raw.genres   || []).map((g) => ({ id: g.mal_id, name: g.name })),
    themes:      (raw.themes   || []).map((t) => t.name),
    demographics:(raw.demographics || []).map((d) => d.name),
    // full detail only (from /anime/{id}/full)
    openings:    raw.theme?.openings?.slice(0, 6) || undefined,
    endings:     raw.theme?.endings?.slice(0, 6)  || undefined,
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
  detail:   24 * 60 * 60,      // 24 h — detail, characters, recommendations
  search:    2 * 60 * 60,      // 2 h  — text search results
  browse:    6 * 60 * 60,      // 6 h  — genre browse (filter-only searches)
  top:       6 * 60 * 60,      // 6 h
  seasonal:  6 * 60 * 60,      // 6 h
  genres:    7 * 24 * 60 * 60, // 7 d  — the genre list itself never changes
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

// Cache key namespace — bump when the normalised shape changes so stale
// entries from an older schema are never served.
const V = 'v4';

/** Single anime — full detail */
export async function getById(id) {
  return withCache(`anime:${V}:detail:${id}`, TTL.detail, async () => {
    try {
      const data = await jikan(`/anime/${id}/full`);
      return normalise(data.data);
    } catch (err) {
      if (err.status === 404) return null; // negative-cache "not found"
      throw err;
    }
  });
}

/**
 * Search anime.
 * @param {object} opts - q, page, limit, type, status, genres (comma-sep ids), order_by, sort, min_score, max_score, rating, sfw
 */
export async function search(opts = {}) {
  // When there's a text query and no explicit ordering, let MAL rank by
  // relevance — forcing order_by=score buries exact-title matches under
  // higher-scored partial matches.
  const orderBy = opts.order_by || (opts.q ? undefined : 'score');

  const params = {
    q:         opts.q        || undefined,
    page:      opts.page     || 1,
    limit:     Math.min(opts.limit || 24, 25), // Jikan max 25
    type:      opts.type     || undefined,
    status:    opts.status   || undefined,      // airing | complete | upcoming
    genres:    opts.genres   || undefined,      // comma-separated MAL genre ids
    producers: opts.producers || undefined,     // comma-separated MAL producer/studio ids
    order_by:  orderBy,
    sort:      orderBy ? (opts.sort || 'desc') : undefined,
    min_score: opts.min_score || undefined,
    max_score: opts.max_score || undefined,
    rating:    opts.rating   || undefined,      // g | pg | pg13 | r17 | r | rx
    sfw:       true,
  };

  // Remove undefined keys so Jikan doesn't get empty params
  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);

  const cacheKey = `anime:${V}:search:${JSON.stringify(params)}`;
  // Filter-only browsing (genre pages) is far more cacheable than text search
  const ttl = opts.q ? TTL.search : TTL.browse;
  return withCache(cacheKey, ttl, async () => {
    const data = await jikan('/anime', params);
    const result = normalisePage(data);
    result.items = sortByTitleMatch(result.items, opts.q);
    return result;
  });
}

// Jikan /top/anime accepts ONLY these filter values — anything else is a 400.
// Omitting the filter returns the default ranking (highest score first).
const TOP_FILTERS = new Set(['airing', 'upcoming', 'bypopularity', 'favorite']);

/** Top anime — no filter = by score; or bypopularity | airing | upcoming | favorite */
export async function getTop(opts = {}) {
  const params = {
    filter: TOP_FILTERS.has(opts.filter) ? opts.filter : undefined,
    type:   opts.type   || undefined,
    page:   opts.page   || 1,
    limit:  Math.min(opts.limit || 24, 25),
  };
  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);

  const cacheKey = `anime:${V}:top:${JSON.stringify(params)}`;
  return withCache(cacheKey, TTL.top, async () => {
    const data = await jikan('/top/anime', params);
    return normalisePage(data);
  });
}

/** Currently airing this season */
export async function getSeasonNow(opts = {}) {
  const params = { page: opts.page || 1, limit: Math.min(opts.limit || 24, 25) };
  const cacheKey = `anime:${V}:seasonal:now:${params.page}:${params.limit}`;
  return withCache(cacheKey, TTL.seasonal, async () => {
    const data = await jikan('/seasons/now', params);
    return normalisePage(data);
  });
}

/** Specific season, e.g. /seasons/2024/winter */
export async function getSeason(year, season, opts = {}) {
  const params = { page: opts.page || 1, limit: Math.min(opts.limit || 24, 25) };
  const cacheKey = `anime:${V}:season:${year}:${season}:${params.page}:${params.limit}`;
  return withCache(cacheKey, TTL.seasonal, async () => {
    const data = await jikan(`/seasons/${year}/${season}`, params);
    return normalisePage(data);
  });
}

/**
 * All genres from MAL, grouped like MAL's anime.php page.
 * Jikan's /genres/anime items carry NO type field — the only way to know
 * which group a genre belongs to is to query each filter separately.
 */
const GENRE_FILTERS = ['genres', 'explicit_genres', 'themes', 'demographics'];

export async function getGenres() {
  return withCache(`anime:${V}:genres`, TTL.genres, async () => {
    const all = [];
    for (const filter of GENRE_FILTERS) {
      const data = await jikan('/genres/anime', { filter });
      for (const g of data.data || []) {
        all.push({ id: g.mal_id, name: g.name, count: g.count, type: filter });
      }
    }
    return all;
  });
}

// ─── Producers / studios ──────────────────────────────────────────────────────

function normaliseProducer(raw) {
  if (!raw) return null;
  return {
    id:          raw.mal_id,
    name:        raw.titles?.find((t) => t.type === 'Default')?.title || raw.titles?.[0]?.title || 'Unknown',
    image:       raw.images?.jpg?.image_url || null,
    favorites:   raw.favorites ?? 0,
    count:       raw.count ?? 0,
    established: raw.established || null,
    about:       raw.about || null,
    malUrl:      raw.url || null,
  };
}

/** Studios/producers ranked by favorites — 25 per page (Jikan page size) */
export async function getProducers(opts = {}) {
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  return withCache(`anime:${V}:producers:${page}`, TTL.genres, async () => {
    const data = await jikan('/producers', { page, order_by: 'favorites', sort: 'desc' });
    return {
      items:      (data.data || []).map(normaliseProducer),
      pagination: data.pagination || null,
    };
  });
}

/** Single studio/producer — name, logo, established, about, favorites */
export async function getProducerById(id) {
  return withCache(`anime:${V}:producer:${id}`, TTL.genres, async () => {
    try {
      const data = await jikan(`/producers/${id}`);
      return normaliseProducer(data.data);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  });
}

/** Recommendations for a given anime */
export async function getRecommendations(animeId) {
  return withCache(`anime:${V}:recs:${animeId}`, TTL.detail, async () => {
    const data = await jikan(`/anime/${animeId}/recommendations`);
    return (data.data || []).slice(0, 10).map((r) => ({
      ...normalise(r.entry),
      votes: r.votes,
    }));
  });
}

/** Characters + voice actors for an anime */
export async function getCharacters(animeId) {
  return withCache(`anime:${V}:chars:${animeId}`, TTL.detail, async () => {
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

// ─── Franchise walker ─────────────────────────────────────────────────────────
// Walks Sequel/Prequel links recursively to assemble the whole franchise in
// chronological order, collecting every related anime encountered along the
// way (side stories, movies, spin-offs). Capped to keep pathological
// franchises (Gundam…) from blowing the rate limit.

const FRANCHISE_MAX_ENTRIES = 30;
const FRANCHISE_MAX_DEPTH   = 10;

function normaliseLite(raw) {
  if (!raw) return null;
  return {
    id:        raw.mal_id,
    title:     raw.title_english || raw.title,
    image:     raw.images?.webp?.image_url || raw.images?.jpg?.image_url || null,
    year:      raw.year || (raw.aired?.from ? new Date(raw.aired.from).getFullYear() : null),
    airedFrom: raw.aired?.from || null,
    type:      raw.type || null,
    score:     raw.score ?? null,
  };
}

async function getRelationsOf(id) {
  return withCache(`anime:${V}:relations:${id}`, TTL.detail, async () => {
    const data = await jikan(`/anime/${id}/relations`);
    return data.data || [];
  });
}

async function getLite(id) {
  return withCache(`anime:${V}:lite:${id}`, TTL.detail, async () => {
    const data = await jikan(`/anime/${id}`);
    return normaliseLite(data.data);
  });
}

export async function getFranchise(animeId) {
  animeId = Number(animeId);

  // Every member of a franchise shares one cached result: a per-member
  // pointer key maps to the franchise blob keyed by the root (lowest) id.
  try {
    const rootId = await redis.get(`anime:${V}:franchise-root:${animeId}`);
    if (rootId) {
      const cached = await redis.get(`anime:${V}:franchise:${rootId}`);
      if (cached) return JSON.parse(cached);
    }
  } catch {}

  // BFS: recurse only along Sequel/Prequel edges, but collect anime entries
  // from every relation group encountered.
  const collected = new Set([animeId]);
  const visited = new Set();
  let frontier = [animeId];

  for (let depth = 0; depth <= FRANCHISE_MAX_DEPTH && frontier.length && collected.size < FRANCHISE_MAX_ENTRIES; depth++) {
    const next = [];
    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);
      let groups;
      try { groups = await getRelationsOf(id); } catch { continue; }
      for (const group of groups) {
        for (const entry of group.entry || []) {
          if (entry.type !== 'anime') continue; // skip manga/light novels
          if (collected.size >= FRANCHISE_MAX_ENTRIES && !collected.has(entry.mal_id)) continue;
          collected.add(entry.mal_id);
          if ((group.relation === 'Sequel' || group.relation === 'Prequel') && !visited.has(entry.mal_id)) {
            next.push(entry.mal_id);
          }
        }
      }
    }
    frontier = next;
  }

  const results = await Promise.allSettled([...collected].map(getLite));
  const members = results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);

  // De-dupe by id, sort chronologically (unknown air dates last)
  const unique = [...new Map(members.map((m) => [m.id, m])).values()];
  unique.sort((a, b) => {
    const da = a.airedFrom ? Date.parse(a.airedFrom) : Infinity;
    const db = b.airedFrom ? Date.parse(b.airedFrom) : Infinity;
    return (da - db) || (a.id - b.id);
  });

  const rootId = unique.length ? Math.min(...unique.map((m) => m.id)) : animeId;
  try {
    const multi = redis.multi();
    multi.setex(`anime:${V}:franchise:${rootId}`, TTL.detail, JSON.stringify(unique));
    for (const m of unique) {
      multi.setex(`anime:${V}:franchise-root:${m.id}`, TTL.detail, String(rootId));
    }
    await multi.exec();
  } catch {}

  return unique;
}

/** Invalidate a cached entry — call when user reports stale data */
export async function bustCache(animeId) {
  const keys = [`anime:${V}:detail:${animeId}`, `anime:${V}:recs:${animeId}`, `anime:${V}:chars:${animeId}`];
  await Promise.allSettled(keys.flatMap((k) => [redis.del(k), redis.del(`stale:${k}`)]));
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
      getTop({ page: 1, limit: 24 }), // no filter = top rated
      getTop({ filter: 'airing', page: 1, limit: 24 }),
      getSeasonNow({ page: 1, limit: 24 }),
    ]);
    console.log('✅ Cache prewarmed');
  } catch (err) {
    console.warn('Cache prewarm failed (non-fatal):', err.message);
  }
}
