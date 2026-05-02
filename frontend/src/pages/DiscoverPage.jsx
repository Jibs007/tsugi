import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import AnimeCover from '../components/AnimeCover';
import StatusBadge from '../components/StatusBadge';
import { GENRES } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useTopAnime, useAnimeSearch } from '../hooks/useAnime';

export default function DiscoverPage({ onAuthClick }) {
  const navigate = useNavigate();
  const { theme: t, cardStyle } = useThemeStore();
  const { getEntry } = useWatchlistStore();
  const [genre, setGenre] = useState(GENRES[0]); // { name: 'All', id: null }
  const [query, setQuery] = useState('');

  // ── Real data ──────────────────────────────────────────────────────────────
  // When there's a search query or genre filter, use /search. Otherwise show top anime.
  const isFiltering = query.trim() || genre.id !== null;

  const { data: topAnime = [], isLoading: topLoading } = useTopAnime({ filter: 'bypopularity', limit: 24 });

  const { data: searchResults = [], isLoading: searchLoading } = useAnimeSearch(
    isFiltering
      ? {
          q:      query.trim() || undefined,
          genres: genre.id != null ? String(genre.id) : undefined,
          limit:  24,
        }
      : {},
  );

  const anime    = isFiltering ? searchResults : topAnime;
  const loading  = isFiltering ? searchLoading  : topLoading;
  const featured = topAnime[0] ?? anime[0];

  return (
    <div className="animate-fade-in">
      {/* Spotlight banner */}
      {featured && (
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: `linear-gradient(100deg, ${t.bg2} 0%, ${featured.color}12 60%, ${featured.color}22 100%)`,
          borderBottom: `1px solid ${t.border}`,
          padding: '36px 40px', display: 'flex', alignItems: 'center', gap: 32,
        }}>
          <AnimeCover anime={featured} width={110} height={155} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: featured.color, letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase', opacity: 0.9 }}>✦ Spotlight</div>
            <div style={{ fontWeight: 800, fontSize: 30, color: t.text, marginBottom: 3, lineHeight: 1.1 }}>{featured.title}</div>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>{featured.jp}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              {featured.genres.slice(0, 3).map((g) => (
                <span key={g} style={{ fontSize: 12, fontWeight: 700, color: t.accent2, background: t.accentMuted, borderRadius: 5, padding: '3px 9px' }}>{g}</span>
              ))}
              <StatusBadge status={featured.status} />
              <span style={{ fontWeight: 700, fontSize: 13, color: t.textMuted }}>★ {featured.rating}</span>
            </div>
            <button
              onClick={() => navigate(`/anime/${featured.id}`)}
              style={{ background: t.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px 22px', cursor: 'pointer', transition: 'opacity .15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >View Details</button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div style={{ padding: '16px 40px', borderBottom: `1px solid ${t.border}`, background: t.bg2 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: t.textMuted, pointerEvents: 'none' }}>◎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime by title..."
            style={{
              width: '100%', background: t.surface, border: `1px solid ${t.border}`,
              borderRadius: 8, padding: '10px 14px 10px 40px', color: t.text,
              fontSize: 15, fontWeight: 500, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = t.accent)}
            onBlur={(e)  => (e.target.style.borderColor = t.border)}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 16 }}>×</button>
          )}
        </div>
      </div>

      {/* Genre filter */}
      <div style={{ padding: '14px 40px 14px', display: 'flex', gap: 7, overflowX: 'auto', borderBottom: `1px solid ${t.border}` }}>
        {GENRES.map((g) => {
          const active = g.id === genre.id;
          return (
            <button key={g.name} onClick={() => setGenre(g)} style={{
              flexShrink: 0, background: active ? t.accent : 'transparent',
              border: `1px solid ${active ? t.accent : t.border}`,
              color: active ? '#fff' : t.textMuted, padding: '6px 14px',
              fontWeight: 600, fontSize: 12, cursor: 'pointer', borderRadius: 6, transition: 'all .13s',
            }}>{g.name}</button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ padding: '24px 40px' }}>
        {loading ? (
          <SkeletonGrid t={t} cardStyle={cardStyle} />
        ) : anime.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 15, color: t.textMuted, marginBottom: 12 }}>
              No results for "<strong style={{ color: t.text }}>{query}</strong>"
            </div>
            <button onClick={() => { setQuery(''); setGenre(GENRES[0]); }} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{
            display: cardStyle === 'list' ? 'flex' : 'grid',
            flexDirection: cardStyle === 'list' ? 'column' : undefined,
            gridTemplateColumns: cardStyle === 'list' ? undefined : 'repeat(auto-fill, minmax(162px, 1fr))',
            gap: cardStyle === 'list' ? 8 : 16,
          }}>
            {anime.map((a) => (
              <AnimeCard key={a.id} anime={a} watchEntry={getEntry(a.id)} onClick={() => navigate(`/anime/${a.id}`)} t={t} cardStyle={cardStyle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid({ t, cardStyle }) {
  return (
    <div style={{
      display: cardStyle === 'list' ? 'flex' : 'grid',
      flexDirection: cardStyle === 'list' ? 'column' : undefined,
      gridTemplateColumns: cardStyle === 'list' ? undefined : 'repeat(auto-fill, minmax(162px, 1fr))',
      gap: cardStyle === 'list' ? 8 : 16,
    }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          background: t.surface, borderRadius: 10, overflow: 'hidden',
          border: `1px solid ${t.border}`,
          height: cardStyle === 'list' ? 90 : 220,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}
