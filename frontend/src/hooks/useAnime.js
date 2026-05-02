import { useQuery } from '@tanstack/react-query';
import { animeApi } from '../lib/api';
import { MOCK_ANIME } from '../lib/constants';

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
    genres:  (a.genres ?? []).map((g) => (typeof g === 'string' ? g : g.name)),
    status:  mapStatus(a.status ?? a.airing),
    rating:  a.score   ?? 0,
    eps:     a.episodes ?? '?',
    year:    a.year    ?? new Date().getFullYear(),
    studio:  (a.studios ?? [])[0] ?? '',
    desc:    a.synopsis ?? '',
    image:   a.image   ?? a.imageSm ?? null,
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
 * Top / featured anime.
 * Falls back to MOCK_ANIME so the Discover page always has content.
 */
export function useTopAnime(params = {}) {
  return useQuery({
    queryKey: animeKeys.top(params),
    queryFn:  () => animeApi.top(params).then((r) => r.items.map(normaliseAnime)),
    staleTime: 5 * 60 * 1000,
    placeholderData: MOCK_ANIME,   // shown instantly while fetching
    retry: 1,
  });
}

/**
 * Search / browse with filters.
 * Requires at least one param; skip the query if nothing is provided.
 */
export function useAnimeSearch(params = {}) {
  const hasParams = Object.values(params).some(Boolean);
  return useQuery({
    queryKey:  animeKeys.search(params),
    queryFn:   () => animeApi.search(params).then((r) => r.items.map(normaliseAnime)),
    enabled:   hasParams,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Single anime detail.
 * Uses MOCK_ANIME as placeholder so the page isn't blank while loading.
 */
export function useAnimeDetail(id) {
  const mockFallback = MOCK_ANIME.find((a) => a.id === Number(id));
  return useQuery({
    queryKey:        animeKeys.detail(id),
    queryFn:         () => animeApi.getById(id).then(normaliseAnime),
    enabled:         !!id,
    staleTime:       10 * 60 * 1000,
    placeholderData: mockFallback,
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

/** Recommendations for a detail page */
export function useRecommendations(animeId) {
  return useQuery({
    queryKey: animeKeys.recs(animeId),
    queryFn:  () => animeApi.recommendations(animeId).then((items) => items.map(normaliseAnime)),
    enabled:  !!animeId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
