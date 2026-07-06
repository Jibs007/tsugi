import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useThemeStore } from '../stores/themeStore';
import { animeApi } from '../lib/api';
import { normaliseAnime } from '../hooks/useAnime';

function sortSuggestions(items, query) {
  const q = query.toLowerCase();
  const rank = (item) => {
    const title = (item.title || '').toLowerCase();
    if (title === q)         return 0;
    if (title.startsWith(q)) return 1;
    return 2;
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}

const TYPE_LABEL = { TV: 'TV', Movie: 'Movie', OVA: 'OVA', ONA: 'ONA', Special: 'Special', Music: 'Music' };

export default function Topbar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme: t, cardStyle, setCardStyle } = useThemeStore();

  const [value, setValue]           = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [fetching, setFetching]     = useState(false);
  const [open, setOpen]             = useState(false);

  const containerRef = useRef(null);

  // Sync input with URL
  useEffect(() => {
    setValue(searchParams.get('q') || '');
    setSuggestions([]);
    setOpen(false);
  }, [searchParams]);

  // Debounced suggestion fetch (400ms) — typing a new query aborts the
  // in-flight request so stale responses never race the fresh one.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }

    const controller = new AbortController();
    const id = setTimeout(async () => {
      setFetching(true);
      try {
        const data = await animeApi.search({ q, limit: 12 }, controller.signal);
        const items = (data.items || []).map(normaliseAnime);
        // Sort by title match, then take top 8
        setSuggestions(sortSuggestions(items, q).slice(0, 8));
        setOpen(true);
      } catch (err) {
        // An aborted request just means the user kept typing — not a failure
        if (err?.code !== 'ERR_CANCELED' && err?.name !== 'CanceledError') setSuggestions([]);
      }
      setFetching(false);
    }, 400);

    return () => { clearTimeout(id); controller.abort(); };
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submit = () => {
    const q = value.trim();
    setOpen(false);
    setSuggestions([]);
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/', { replace: false });
  };

  const pickSuggestion = (anime) => {
    setOpen(false);
    setSuggestions([]);
    setValue('');
    navigate(`/anime/${anime.id}`);
  };

  return (
    <div style={{
      height: 56, flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px',
      background: t.bg2, borderBottom: `1px solid ${t.border}`,
    }}>
      {/* Search + dropdown */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', maxWidth: 560 }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: t.textMuted, pointerEvents: 'none',
        }}>◎</span>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  submit();
            if (e.key === 'Escape') { setOpen(false); setSuggestions([]); }
          }}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder="Search anime..."
          style={{
            width: '100%', background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: open && suggestions.length > 0 ? '8px 8px 0 0' : 8,
            padding: '8px 36px 8px 34px', color: t.text,
            fontSize: 14, fontWeight: 500, outline: 'none',
            boxSizing: 'border-box', transition: 'border-color .15s',
          }}
          onFocusCapture={(e) => (e.target.style.borderColor = t.accent)}
          onBlur={(e) => (e.target.style.borderColor = t.border)}
        />

        {value && (
          <button
            onClick={() => { setValue(''); setSuggestions([]); setOpen(false); navigate('/'); }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
          >×</button>
        )}

        {/* Suggestions dropdown */}
        {open && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: t.bg2, border: `1px solid ${t.accent}`,
            borderTop: 'none', borderRadius: '0 0 10px 10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden', maxHeight: 380, overflowY: 'auto',
          }}>
            {suggestions.map((anime, i) => (
              <div
                key={anime.id}
                onMouseDown={() => pickSuggestion(anime)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer',
                  borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.surface)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Thumbnail */}
                <div style={{ width: 32, height: 44, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: t.surface2 }}>
                  {anime.image ? (
                    <img src={anime.image} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: `${anime.color}30` }} />
                  )}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {anime.title}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                    {anime.year || '—'} · {TYPE_LABEL[anime.type] ?? anime.type ?? 'TV'}
                  </div>
                </div>
                {/* Score */}
                {anime.rating > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, flexShrink: 0 }}>★ {anime.rating.toFixed(1)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fetching indicator (subtle) */}
        {fetching && (
          <span style={{ position: 'absolute', right: value ? 30 : 10, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: t.accent, opacity: 0.7 }} />
        )}
      </div>

      {/* Grid / List toggle */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {[['grid', '⊞'], ['list', '≡']].map(([style, icon]) => (
          <button
            key={style}
            onClick={() => setCardStyle(style)}
            title={style === 'grid' ? 'Grid view' : 'List view'}
            style={{
              width: 34, height: 34, borderRadius: 7, cursor: 'pointer',
              background: cardStyle === style ? t.accentMuted : 'transparent',
              border: `1px solid ${cardStyle === style ? t.accent : t.border}`,
              color: cardStyle === style ? t.accent : t.textMuted,
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .13s',
            }}
          >{icon}</button>
        ))}
      </div>
    </div>
  );
}
