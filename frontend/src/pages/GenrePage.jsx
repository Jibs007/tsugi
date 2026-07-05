import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeSearch, useGenres } from '../hooks/useAnime';

// MAL sorts genre pages by member count by default — do the same.
const SORTS = [
  { key: 'members',    label: 'Most Members' },
  { key: 'score',      label: 'Top Rated' },
  { key: 'start_date', label: 'Newest' },
];

export default function GenrePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme: t, cardStyle } = useThemeStore();
  const { getEntry } = useWatchlistStore();

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('members');

  const { data: genres = [] } = useGenres();
  const genre = genres.find((g) => String(g.id) === id);

  useEffect(() => { setPage(1); }, [id, sort]);
  useEffect(() => {
    document.title = genre ? `${genre.name} Anime · Tsugi` : 'Tsugi 次 · Anime Watchlist';
    return () => { document.title = 'Tsugi 次 · Anime Watchlist'; };
  }, [genre?.name]);

  const { data, isLoading, isError, refetch } = useAnimeSearch({
    genres: id,
    order_by: sort,
    sort: 'desc',
    limit: 24,
    page,
  });

  const items      = data?.items ?? [];
  const pagination = data?.pagination ?? null;
  const hasNext    = pagination?.has_next_page ?? (items.length === 24);

  const goPage = (n) => {
    setPage(n);
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ padding: '32px 40px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6 }}>
        <button
          onClick={() => navigate('/genres')}
          style={{ background: 'transparent', border: 'none', color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}
        >← All genres</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 28, color: t.text }}>{genre?.name ?? 'Genre'}</div>
        {genre?.count > 0 && (
          <div style={{ fontSize: 13, color: t.textMuted }}>{genre.count.toLocaleString()} titles on MyAnimeList</div>
        )}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: 7, margin: '16px 0 24px' }}>
        {SORTS.map(({ key, label }) => (
          <button key={key} onClick={() => setSort(key)} style={{
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
            {isError ? "Couldn't load this genre — usually a temporary MyAnimeList rate limit." : 'No anime found in this genre.'}
          </div>
          {isError && (
            <button
              onClick={() => refetch()}
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
              <AnimeCard key={a.id} anime={a} watchEntry={getEntry(a.id)} onClick={() => navigate(`/anime/${a.id}`)} t={t} cardStyle={cardStyle} />
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
