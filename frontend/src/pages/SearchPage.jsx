import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import { GENRES } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeSearch } from '../hooks/useAnime';

const STATUS_OPTS = [
  { value: 'all',       label: 'Any Status' },
  { value: 'airing',    label: 'Airing'     },
  { value: 'completed', label: 'Completed'  },
  { value: 'upcoming',  label: 'Upcoming'   },
];

// Jikan status param values for the search API
const STATUS_API = { airing: 'airing', completed: 'complete', upcoming: 'upcoming' };

export default function SearchPage() {
  const navigate = useNavigate();
  const { theme: t, cardStyle } = useThemeStore();
  const { getEntry } = useWatchlistStore();
  const [query, setQuery]           = useState('');
  const [genre, setGenre]           = useState(GENRES[0]); // { name: 'All', id: null }
  const [statusFilter, setStatus]   = useState('all');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Build params for the hook — only include fields that are set
  const searchParams = {
    q:      query.trim() || undefined,
    genres: genre.id != null ? String(genre.id) : undefined,
    status: statusFilter !== 'all' ? STATUS_API[statusFilter] : undefined,
    limit:  24,
  };

  const hasParams = !!(searchParams.q || searchParams.genres || searchParams.status);

  const { data: searchData, isLoading } = useAnimeSearch(hasParams ? searchParams : {});
  const results = searchData?.items ?? [];

  return (
    <div style={{ padding: '36px 40px' }} className="animate-fade-in">
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: t.textMuted }}>◎</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime..."
          style={{
            width: '100%', background: t.surface, border: `1px solid ${t.border}`,
            padding: '14px 18px 14px 46px', color: t.text, outline: 'none',
            fontSize: 18, fontWeight: 600, borderRadius: 10,
            boxSizing: 'border-box', transition: 'border-color .15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = t.accent)}
          onBlur={(e)  => (e.target.style.borderColor = t.border)}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 20 }}
          >×</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {STATUS_OPTS.map(({ value, label }) => (
          <button key={value} onClick={() => setStatus(value)} style={{
            padding: '6px 14px',
            background: statusFilter === value ? `${t.accent2}22` : 'transparent',
            border: `1px solid ${statusFilter === value ? t.accent2 : t.border}`,
            color: statusFilter === value ? t.accent2 : t.textMuted,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 6,
          }}>
            {label}
          </button>
        ))}
        {GENRES.slice(1, 9).map((g) => (
          <button key={g.name} onClick={() => setGenre(genre.id === g.id ? GENRES[0] : g)} style={{
            padding: '6px 12px',
            background: genre.id === g.id ? t.accentMuted : 'transparent',
            border: `1px solid ${genre.id === g.id ? t.accent : t.border}`,
            color: genre.id === g.id ? t.accent : t.textMuted,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 6,
          }}>{g.name}</button>
        ))}
      </div>

      {/* Result count / state */}
      {!hasParams ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Type something to search</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Search across thousands of anime from MyAnimeList</div>
        </div>
      ) : isLoading ? (
        <SearchSkeleton t={t} cardStyle={cardStyle} />
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textMuted }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>No results found</div>
          <button
            onClick={() => { setQuery(''); setGenre(GENRES[0]); setStatus('all'); }}
            style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          <div style={{
            display: cardStyle === 'list' ? 'flex' : 'grid',
            flexDirection: cardStyle === 'list' ? 'column' : undefined,
            gridTemplateColumns: cardStyle === 'list' ? undefined : 'repeat(auto-fill, minmax(155px, 1fr))',
            gap: cardStyle === 'list' ? 8 : 14,
          }}>
            {results.map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                watchEntry={getEntry(anime.id)}
                onClick={() => navigate(`/anime/${anime.id}`)}
                t={t}
                cardStyle={cardStyle}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SearchSkeleton({ t, cardStyle }) {
  return (
    <div style={{
      display: cardStyle === 'list' ? 'flex' : 'grid',
      flexDirection: cardStyle === 'list' ? 'column' : undefined,
      gridTemplateColumns: cardStyle === 'list' ? undefined : 'repeat(auto-fill, minmax(155px, 1fr))',
      gap: cardStyle === 'list' ? 8 : 14,
    }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          background: t.surface, borderRadius: 10, overflow: 'hidden',
          border: `1px solid ${t.border}`,
          height: cardStyle === 'list' ? 90 : 220,
        }} className="skeleton" />
      ))}
    </div>
  );
}
