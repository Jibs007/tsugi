import { useQuery } from '@tanstack/react-query';
import { animeApi } from '../lib/api';

// ─── Query key factory ────────────────────────────────────────────────────────
export const animeKeys = {
  top:     (params) => ['anime', 'top',    params],
  search:  (params) => ['anime', 'search', params],
  detail:  (id)     => ['anime', 'detail', id],
  season:  (y, s)   => ['anime', 'season', y, s],
  genres:  ()       => ['anime', 'genres'],
  recs:    (id)     => ['anime', 'recs',   id],
};

// ─── Normalise a backend anime object for the UI ──────────────────────────────
// The backend normaliser already maps Jikan → our shape. This just guards
// missing fields so components never crash on a partial response.
export function normaliseAnime(a) {
  return {
    id:      a.id      ?? a.mal_id,
    title:   a.title   ?? a.title_english ?? 'Unknown',
    jp:      a.titleJp ?? a.title_japanese ?? a.title ?? '',
    color:   genColor(a.id ?? a.mal_id),
    // {id, name} objects — ids make genre tags clickable links
    genres:  (a.genres ?? []).map((g) => (typeof g === 'string' ? { id: null, name: g } : g)),
    status:  mapStatus(a.status ?? a.airing),
    rating:  a.score ?? null,          // null = not yet rated (don't show "★ 0")
    scoredBy: a.scoredBy ?? null,
    rank:    a.rank ?? null,
    popularity: a.popularity ?? null,
    members:    a.members    ?? null,
    favorites:  a.favorites  ?? null,
    eps:     a.episodes ?? '?',
    year:    a.year ?? null,           // null = unknown, never fabricate a year
    season:  a.season ?? null,
    type:    a.type    ?? null,
    studio:  (a.studios ?? [])[0]?.name ?? (typeof (a.studios ?? [])[0] === 'string' ? a.studios[0] : ''),
    studioId: (a.studios ?? [])[0]?.id ?? null,
    studios: (a.studios ?? []).map((s) => (typeof s === 'string' ? { id: null, name: s } : s)),
    producers: a.producers ?? [],
    licensors: a.licensors ?? [],
    desc:    a.synopsis ?? '',
    background: a.background ?? null,
    image:   a.image   ?? a.imageSm ?? null,
    malUrl:  a.malUrl  ?? null,
    aired:     a.aired     ?? null,
    broadcast: a.broadcast ?? null,
    duration:  a.duration  ?? null,
    ageRating: a.ageRating ?? null,
    source:    a.source    ?? null,
    airStatus: a.status ?? null,       // raw MAL string, e.g. "Finished Airing"
    synonyms:  a.synonyms ?? [],
    // full-detail extras (present only on /anime/:id responses)
    trailer:   a.trailer   ?? null,
    relations: a.relations ?? [],
    streaming: a.streaming ?? [],
    external:  a.external  ?? [],
    themes:    a.themes    ?? [],
    demographics: a.demographics ?? [],
    openings:  a.openings ?? [],
    endings:   a.endings  ?? [],
  };
}

// Jikan status strings → our short tokens
function mapStatus(raw) {
  if (raw === true || raw === 'Currently Airing') return 'airing';
  if (raw === 'Not yet aired')                    return 'upcoming';
  if (raw === 'airing' || raw === 'completed' || raw === 'upcoming') return raw;
  return 'completed';
}

// Deterministic pastel-ish colour per anime id (same palette as the mock data)
const PALETTE = [
  '#ff4455','#6644ff','#ff9933','#44aaff','#c8a840',
  '#44cc88','#3355ff','#cc44cc','#c87820','#ff66aa','#ff44bb','#0066ff',
];
function genColor(id) { return PALETTE[(id ?? 0) % PALETTE.length]; }

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * De-dupe an anime array by mal_id — Jikan occasionally repeats entries
 * across rank/page boundaries.
 *
 * Note on "identical" side-by-side cards that survive this: React keys are
 * mal_id everywhere (never array index) and no placeholder cards mount next
 * to real ones, so two look-alike cards are genuinely DIFFERENT MAL entries
 * (e.g. split-cour seasons sharing one English title). Those are correct to
 * show; only true mal_id repeats are removed here.
 */
export const dedupeById = (items) =>
  Array.from(new Map(items.map((a) => [a.id ?? a.mal_id, a])).values());

const shapePage = (r) => ({
  items:      dedupeById((r.items || []).map(normaliseAnime)),
  pagination: r.pagination ?? null,
});

// Exported as option builders (not just hooks) so pages can
// queryClient.prefetchQuery() the next page with identical keys/fns.
// `signal` cancels the HTTP request when the query is superseded.
export function topQueryOptions(params = {}) {
  return {
    queryKey:  animeKeys.top(params),
    queryFn:   ({ signal }) => animeApi.top(params, signal).then(shapePage),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  };
}

export function searchQueryOptions(params = {}) {
  return {
    queryKey:  animeKeys.search(params),
    queryFn:   ({ signal }) => animeApi.search(params, signal).then(shapePage),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  };
}

export function seasonNowQueryOptions(params = {}) {
  return {
    queryKey:  ['anime', 'seasonNow', params],
    queryFn:   ({ signal }) => animeApi.seasonalNow(params, signal).then(shapePage),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  };
}

export function useTopAnime(params = {}, enabled = true) {
  return useQuery({ ...topQueryOptions(params), enabled });
}

export function useSeasonNow(params = {}, enabled = true) {
  return useQuery({ ...seasonNowQueryOptions(params), enabled });
}

export function useAnimeSearch(params = {}, enabled = true) {
  const { page, limit, ...filterParams } = params; // eslint-disable-line no-unused-vars
  const hasFilters = Object.values(filterParams).some(Boolean);
  return useQuery({ ...searchQueryOptions(params), enabled: enabled && hasFilters });
}

// ─── Studios ──────────────────────────────────────────────────────────────────

export function studiosQueryOptions(page) {
  return {
    queryKey:  ['studios', 'list', page],
    queryFn:   ({ signal }) => animeApi.studios({ page }, signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  };
}

export function useStudio(id) {
  return useQuery({
    queryKey:  ['studios', 'detail', id],
    queryFn:   () => animeApi.studio(id),
    enabled:   !!id,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

/** Whole franchise for a detail page — may arrive after main content */
export function useFranchise(animeId) {
  return useQuery({
    queryKey:  ['anime', 'franchise', animeId],
    queryFn:   () => animeApi.franchise(animeId).then((items) => dedupeById(items)),
    enabled:   !!animeId,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useAnimeDetail(id) {
  return useQuery({
    queryKey:  animeKeys.detail(id),
    queryFn:   () => animeApi.getById(id).then(normaliseAnime),
    enabled:   !!id,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/** Genre list from MAL */
export function useGenres() {
  return useQuery({
    queryKey:  animeKeys.genres(),
    queryFn:   () => animeApi.genres(),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/** Characters + voice actors for a detail page */
export function useAnimeCharacters(animeId) {
  return useQuery({
    queryKey:  ['anime', 'characters', animeId],
    queryFn:   () => animeApi.characters(animeId),
    enabled:   !!animeId,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

/** Recommendations for a detail page */
export function useRecommendations(animeId) {
  return useQuery({
    queryKey: animeKeys.recs(animeId),
    queryFn:  () => animeApi.recommendations(animeId).then((items) =>
      dedupeById(items.map((i) => ({ ...normaliseAnime(i), votes: i.votes ?? null })))),
    enabled:  !!animeId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
