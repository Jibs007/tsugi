import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import AnimeCover from '../components/AnimeCover';
import StatusBadge from '../components/StatusBadge';
import { GENRES } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useTopAnime, useAnimeSearch, useGenres } from '../hooks/useAnime';

// Jikan /top/anime sort modes — null filter = default ranking (top rated)
const SORT_TABS = [
  { key: 'bypopularity', label: 'Popular' },
  { key: null,           label: 'Top Rated' },
  { key: 'airing',       label: 'Airing Now' },
  { key: 'upcoming',     label: 'Upcoming' },
];

export default function DiscoverPage({ onAuthClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { theme: t, cardStyle } = useThemeStore();
  const { getEntry } = useWatchlistStore();
  const gridRef = useRef(null);

  // The URL is the source of truth for filters, so links from the genre
  // browser (/?genres=22) and the search bar (/?q=...) both work.
  const urlQuery   = searchParams.get('q') || '';
  const urlGenreId = searchParams.get('genres');

  const [page, setPage]           = useState(1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [carouselPaused, setPaused] = useState(false);
  const [topFilter, setTopFilter] = useState('bypopularity');

  // Full genre list from MAL — used to label genres picked in the browser
  // that aren't in our quick-chip row.
  const { data: allGenres = [] } = useGenres();

  // React to every navigation event (location.key is unique per navigate() call).
  // This catches logo→same-URL clicks and resets pagination whenever the
  // search context changes.
  useEffect(() => {
    setPage(1);
    setActiveIdx(0);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const setGenreParam = (id) => {
    const params = new URLSearchParams(searchParams);
    if (id == null) params.delete('genres');
    else params.set('genres', String(id));
    navigate({ pathname: '/', search: params.toString() ? `?${params}` : '' });
  };

  const changeSort = (key) => { setTopFilter(key); setPage(1); setActiveIdx(0); };

  const isFiltering = !!(urlQuery || urlGenreId);

  const { data: topData, isLoading: topLoading, isError: topError, refetch: refetchTop } = useTopAnime({
    ...(topFilter ? { filter: topFilter } : {}),
    limit: 24,
    page,
  });

  const { data: searchData, isLoading: searchLoading, isError: searchError, refetch: refetchSearch } = useAnimeSearch(
    isFiltering
      ? { q: urlQuery || undefined, genres: urlGenreId || undefined, limit: 24, page }
      : {},
  );

  // A genre chosen in the genre browser that isn't in the quick-chip row
  const knownChip     = GENRES.some((g) => g.id != null && String(g.id) === urlGenreId);
  const externalGenre = urlGenreId && !knownChip
    ? { name: allGenres.find((g) => String(g.id) === urlGenreId)?.name ?? 'Genre', id: Number(urlGenreId) }
    : null;

  const activeData = isFiltering ? searchData   : topData;
  const loading    = isFiltering ? searchLoading : topLoading;
  const loadError  = isFiltering ? searchError   : topError;
  const retry      = isFiltering ? refetchSearch : refetchTop;
  const anime      = activeData?.items      ?? [];
  const pagination = activeData?.pagination ?? null;
  const hasNext    = pagination?.has_next_page ?? (anime.length === 24);

  // Carousel data — a fresh random 5 of the top list per visit, so the
  // spotlight isn't the same anime every time you open the app.
  const [shuffleSeed] = useState(() => Math.random());
  const featuredList = useMemo(() => {
    if (isFiltering) return [];
    const items = [...(topData?.items ?? [])];
    // Seeded Fisher–Yates so the order is stable within a visit
    let s = Math.floor(shuffleSeed * 2 ** 31);
    const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.slice(0, 5);
  }, [topData, isFiltering, shuffleSeed]);
  const featured = featuredList[activeIdx] ?? featuredList[0];

  // Auto-advance carousel every 5s
  useEffect(() => {
    if (carouselPaused || featuredList.length <= 1) return;
    const id = setInterval(
      () => setActiveIdx((i) => (i + 1) % featuredList.length),
      5000,
    );
    return () => clearInterval(id);
  }, [carouselPaused, featuredList.length]);

  // Scroll to top on page change
  const goPage = (n) => {
    setPage(n);
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in">
      {/* Carousel spotlight — only when not filtering */}
      {!isFiltering && (
        topLoading ? <SpotlightSkeleton t={t} /> : featured && (
          <div
            style={{
              position: 'relative', overflow: 'hidden',
              background: `linear-gradient(100deg, ${t.bg2} 0%, ${featured.color}12 60%, ${featured.color}22 100%)`,
              borderBottom: `1px solid ${t.border}`,
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Slide content — key triggers re-animation */}
            <div
              key={activeIdx}
              className="spotlight-slide"
              style={{ padding: '36px 40px', display: 'flex', alignItems: 'center', gap: 32 }}
            >
              <AnimeCover anime={featured} width={110} height={155} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: featured.color, letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase', opacity: 0.9 }}>✦ Spotlight</div>
                <div style={{ fontWeight: 800, fontSize: 30, color: t.text, marginBottom: 3, lineHeight: 1.1 }}>{featured.title}</div>
                <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>{featured.jp}</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  {featured.genres.slice(0, 3).map((g) => (
                    <span key={g} style={{ fontSize: 12, fontWeight: 700, color: t.accent2, background: t.accentMuted, borderRadius: 5, padding: '3px 9px' }}>{g}</span>
                  ))}
                  <StatusBadge status={featured.status} />
                  {featured.rating != null && (
                    <span style={{ fontWeight: 700, fontSize: 13, color: t.textMuted }}>★ {featured.rating}</span>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/anime/${featured.id}`)}
                  style={{ background: t.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px 22px', cursor: 'pointer', transition: 'opacity .15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >View Details</button>
              </div>
            </div>

            {/* Dot indicators */}
            {featuredList.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 14 }}>
                {featuredList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    style={{
                      width: i === activeIdx ? 20 : 8, height: 8, borderRadius: 4, padding: 0,
                      background: i === activeIdx ? t.accent : t.border,
                      border: 'none', cursor: 'pointer', transition: 'all .3s',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* Sort tabs — only meaningful when browsing, not filtering */}
      {!isFiltering && (
        <div style={{ padding: '14px 40px 0', display: 'flex', gap: 7, alignItems: 'center' }}>
          {SORT_TABS.map(({ key, label }) => {
            const active = topFilter === key;
            return (
              <button key={label} onClick={() => changeSort(key)} style={{
                flexShrink: 0, background: active ? t.accentMuted : 'transparent',
                border: `1px solid ${active ? t.accent : t.border}`,
                color: active ? t.accent : t.textMuted, padding: '6px 14px',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', borderRadius: 6, transition: 'all .13s',
              }}>{label}</button>
            );
          })}
        </div>
      )}

      {/* Genre filter + active query display */}
      <div ref={gridRef} style={{ padding: '14px 40px', display: 'flex', gap: 7, overflowX: 'auto', borderBottom: `1px solid ${t.border}`, alignItems: 'center' }}>
        {urlQuery && (
          <div style={{ flexShrink: 0, fontSize: 13, color: t.textMuted, marginRight: 8 }}>
            Results for <strong style={{ color: t.text }}>"{urlQuery}"</strong>
            <button
              onClick={() => navigate(urlGenreId ? `/?genres=${urlGenreId}` : '/')}
              style={{ marginLeft: 8, background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 14, verticalAlign: 'middle' }}
            >×</button>
          </div>
        )}
        {GENRES.map((g) => {
          const active = g.id == null ? !urlGenreId : String(g.id) === urlGenreId;
          return (
            <button key={g.name} onClick={() => setGenreParam(g.id)} style={{
              flexShrink: 0, background: active ? t.accent : 'transparent',
              border: `1px solid ${active ? t.accent : t.border}`,
              color: active ? '#fff' : t.textMuted, padding: '6px 14px',
              fontWeight: 600, fontSize: 12, cursor: 'pointer', borderRadius: 6, transition: 'all .13s',
            }}>{g.name}</button>
          );
        })}
        {externalGenre && (
          <button onClick={() => setGenreParam(null)} title="Click to clear" style={{
            flexShrink: 0, background: t.accent, border: `1px solid ${t.accent}`,
            color: '#fff', padding: '6px 14px',
            fontWeight: 600, fontSize: 12, cursor: 'pointer', borderRadius: 6, transition: 'all .13s',
          }}>{externalGenre.name} ×</button>
        )}
        <button
          onClick={() => navigate('/genres')}
          style={{
            flexShrink: 0, background: 'transparent',
            border: `1px solid ${t.border}`, color: t.accent,
            padding: '6px 14px', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', borderRadius: 6, transition: 'all .13s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.accentMuted)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >All Genres →</button>
      </div>

      {/* Grid */}
      <div style={{ padding: '24px 40px' }}>
        {loading ? (
          <CardSkeleton t={t} cardStyle={cardStyle} />
        ) : loadError || anime.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 15, color: t.textMuted, marginBottom: 14 }}>
              {loadError
                ? "Couldn't load anime right now — this is usually a temporary MyAnimeList rate limit."
                : `No results${urlQuery ? ` for "${urlQuery}"` : ''}.`}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {loadError && (
                <button
                  onClick={() => retry()}
                  style={{ background: t.accent, border: 'none', color: '#fff', borderRadius: 7, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                >
                  Retry
                </button>
              )}
              {isFiltering && (
                <button
                  onClick={() => navigate('/')}
                  style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
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

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 36, paddingBottom: 8 }}>
              <button
                onClick={() => goPage(page - 1)}
                disabled={page === 1}
                style={{
                  padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  background: 'transparent', border: `1px solid ${t.border}`,
                  color: page === 1 ? t.textDim : t.textMuted, transition: 'all .13s',
                }}
                onMouseEnter={(e) => { if (page > 1) e.currentTarget.style.borderColor = t.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; }}
              >← Prev</button>

              <span style={{ fontWeight: 700, fontSize: 14, color: t.text, minWidth: 80, textAlign: 'center' }}>
                Page {page}
              </span>

              <button
                onClick={() => goPage(page + 1)}
                disabled={!hasNext}
                style={{
                  padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: !hasNext ? 'not-allowed' : 'pointer',
                  background: 'transparent', border: `1px solid ${t.border}`,
                  color: !hasNext ? t.textDim : t.textMuted, transition: 'all .13s',
                }}
                onMouseEnter={(e) => { if (hasNext) e.currentTarget.style.borderColor = t.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; }}
              >Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CardSkeleton({ t, cardStyle }) {
  return (
    <div style={{
      display: cardStyle === 'list' ? 'flex' : 'grid',
      flexDirection: cardStyle === 'list' ? 'column' : undefined,
      gridTemplateColumns: cardStyle === 'list' ? undefined : 'repeat(auto-fill, minmax(162px, 1fr))',
      gap: cardStyle === 'list' ? 8 : 16,
    }}>
      {Array.from({ length: 24 }).map((_, i) => (
        cardStyle === 'list' ? (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 16px', height: 88 }}>
            <div className="skeleton" style={{ width: 48, height: 68, borderRadius: 4, background: t.surface2 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ width: '55%', height: 14, borderRadius: 4, background: t.surface2 }} />
              <div className="skeleton" style={{ width: '35%', height: 11, borderRadius: 4, background: t.surface2 }} />
            </div>
          </div>
        ) : (
          <div key={i} style={{ background: t.surface, borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.border}` }}>
            <div className="skeleton" style={{ height: 170, background: t.surface2 }} />
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div className="skeleton" style={{ height: 13, width: '80%', borderRadius: 4, background: t.surface2 }} />
              <div className="skeleton" style={{ height: 11, width: '55%', borderRadius: 4, background: t.surface2 }} />
              <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 4, background: t.surface2 }} />
            </div>
          </div>
        )
      ))}
    </div>
  );
}

function SpotlightSkeleton({ t }) {
  return (
    <div style={{ borderBottom: `1px solid ${t.border}`, padding: '36px 40px', display: 'flex', gap: 32, alignItems: 'center' }}>
      <div className="skeleton" style={{ width: 110, height: 155, borderRadius: 6, flexShrink: 0, background: t.surface2 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ width: 80, height: 10, borderRadius: 4, background: t.surface2 }} />
        <div className="skeleton" style={{ width: '50%', height: 28, borderRadius: 6, background: t.surface2 }} />
        <div className="skeleton" style={{ width: '30%', height: 13, borderRadius: 4, background: t.surface2 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[60, 72, 54].map((w, i) => <div key={i} className="skeleton" style={{ width: w, height: 22, borderRadius: 5, background: t.surface2 }} />)}
        </div>
        <div className="skeleton" style={{ width: 110, height: 38, borderRadius: 8, background: t.surface2 }} />
      </div>
    </div>
  );
}
