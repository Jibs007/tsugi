import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AnimeCard from '../components/AnimeCard';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeSearch, useStudio, searchQueryOptions } from '../hooks/useAnime';
import { useAutoRetry } from '../hooks/useAutoRetry';

const SORTS = [
  { key: 'members',    label: 'Most Members' },
  { key: 'score',      label: 'Top Rated' },
  { key: 'start_date', label: 'Newest' },
];

export default function StudioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme: t, cardStyle } = useThemeStore();
  const { getEntry } = useWatchlistStore();

  // Pagination + sort live in the URL so browser back restores them
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const sortParam = searchParams.get('sort');
  const sort = SORTS.some((s) => s.key === sortParam) ? sortParam : 'members';

  const updateParams = (patch) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') params.delete(k);
      else params.set(k, String(v));
    }
    navigate({ pathname: `/studio/${id}`, search: params.toString() ? `?${params}` : '' });
  };

  const { data: studio } = useStudio(id);

  useEffect(() => {
    document.title = studio ? `${studio.name} · Tsugi` : 'Tsugi 次 · Anime Watchlist';
    return () => { document.title = 'Tsugi 次 · Anime Watchlist'; };
  }, [studio?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const catalogueParams = { producers: id, order_by: sort, sort: 'desc', limit: 24, page };
  const { data, isLoading, isError, refetch } = useAnimeSearch(catalogueParams);

  const items      = data?.items ?? [];
  const pagination = data?.pagination ?? null;
  const hasNext    = pagination?.has_next_page ?? (items.length === 24);

  const { retrying, retryNow } = useAutoRetry(isError, refetch, [3000, 5000, 5000]);

  // Prefetch the next catalogue page
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isLoading || isError || !hasNext || items.length === 0) return;
    const timer = setTimeout(() => {
      queryClient.prefetchQuery(searchQueryOptions({ ...catalogueParams, page: page + 1 }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [data, isLoading, isError, hasNext, id, sort, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const goPage = (n) => {
    updateParams({ page: n === 1 ? null : n });
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const established = studio?.established
    ? new Date(studio.established).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const fromState = { from: { type: 'studio', id: Number(id), name: studio?.name } };

  return (
    <div style={{ padding: '32px 40px' }} className="animate-fade-in">
      <button
        onClick={() => navigate('/genres')}
        style={{ background: 'transparent', border: 'none', color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 18 }}
      >← All studios</button>

      {/* Studio header */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
        {studio?.image && (
          <div style={{ width: 130, flexShrink: 0, background: '#fff', borderRadius: 10, padding: 10, border: `1px solid ${t.border}` }}>
            <img src={studio.image} alt={studio.name} style={{ width: '100%', display: 'block' }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: t.text, marginBottom: 6 }}>
            {studio?.name ?? 'Studio'}
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: t.textMuted, marginBottom: 12 }}>
            {established && <span>Established {established}</span>}
            {studio?.favorites > 0 && <span>♥ {studio.favorites.toLocaleString()} favorites</span>}
            {studio?.count > 0 && <span>{studio.count.toLocaleString()} anime</span>}
          </div>
          {studio?.about && (
            <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7, maxWidth: 720, whiteSpace: 'pre-line' }}>
              {studio.about.length > 500 ? `${studio.about.slice(0, 500)}…` : studio.about}
            </p>
          )}
        </div>
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 24 }}>
        {SORTS.map(({ key, label }) => (
          <button key={key} onClick={() => updateParams({ sort: key === 'members' ? null : key, page: null })} style={{
            background: sort === key ? t.accentMuted : 'transparent',
            border: `1px solid ${sort === key ? t.accent : t.border}`,
            color: sort === key ? t.accent : t.textMuted,
            padding: '6px 14px', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', borderRadius: 6, transition: 'all .13s',
          }}>{label}</button>
        ))}
      </div>

      {isLoading ? (
        <div style={{
          display: cardStyle === 'list' ? 'flex' : 'grid',
          flexDirection: cardStyle === 'list' ? 'column' : undefined,
          gridTemplateColumns: cardStyle === 'list' ? undefined : 'repeat(auto-fill, minmax(162px, 1fr))',
          gap: cardStyle === 'list' ? 8 : 16,
        }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="skeleton" style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10,
              height: cardStyle === 'list' ? 88 : 250,
            }} />
          ))}
        </div>
      ) : isError || items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 15, color: t.textMuted, marginBottom: 14 }}>
            {isError
              ? (retrying
                  ? 'Having trouble reaching MyAnimeList — retrying automatically…'
                  : "Couldn't load this studio's catalogue after several attempts.")
              : 'No anime found for this studio.'}
          </div>
          {isError && retrying && (
            <span className="skeleton" style={{ width: 10, height: 10, borderRadius: '50%', background: t.accent, display: 'inline-block' }} />
          )}
          {isError && !retrying && (
            <button
              onClick={retryNow}
              style={{ background: t.accent, border: 'none', color: '#fff', borderRadius: 7, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
            >Retry</button>
          )}
        </div>
      ) : (
        <>
          <div style={{
            display: cardStyle === 'list' ? 'flex' : 'grid',
            flexDirection: cardStyle === 'list' ? 'column' : undefined,
            gridTemplateColumns: cardStyle === 'list' ? undefined : 'repeat(auto-fill, minmax(162px, 1fr))',
            gap: cardStyle === 'list' ? 8 : 16,
          }}>
            {items.map((a) => (
              <AnimeCard key={a.id} anime={a} watchEntry={getEntry(a.id)} onClick={() => navigate(`/anime/${a.id}`, { state: fromState })} t={t} cardStyle={cardStyle} />
            ))}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 36, paddingBottom: 8 }}>
            <button
              onClick={() => goPage(page - 1)}
              disabled={page === 1}
              style={{
                padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                background: 'transparent', border: `1px solid ${t.border}`,
                color: page === 1 ? t.textDim : t.textMuted,
              }}
            >← Prev</button>
            <span style={{ fontWeight: 700, fontSize: 14, color: t.text, minWidth: 80, textAlign: 'center' }}>Page {page}</span>
            <button
              onClick={() => goPage(page + 1)}
              disabled={!hasNext}
              style={{
                padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: !hasNext ? 'not-allowed' : 'pointer',
                background: 'transparent', border: `1px solid ${t.border}`,
                color: !hasNext ? t.textDim : t.textMuted,
              }}
            >Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
