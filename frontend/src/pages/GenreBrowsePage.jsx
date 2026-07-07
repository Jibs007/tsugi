import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useThemeStore } from '../stores/themeStore';
import { useGenres, studiosQueryOptions } from '../hooks/useAnime';

// Section order and headings matching MAL's anime.php page
const GROUPS = [
  { type: 'genres',          label: 'Genres' },
  { type: 'explicit_genres', label: 'Explicit Genres' },
  { type: 'themes',          label: 'Themes' },
  { type: 'demographics',    label: 'Demographics' },
];

export default function GenreBrowsePage() {
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { data: genres = [], isLoading } = useGenres();

  // Studios: 2 pages (top ~50 by favorites) up front, "load more" beyond
  const [studioPageCount, setStudioPageCount] = useState(2);
  const studioQueries = useQueries({
    queries: Array.from({ length: studioPageCount }, (_, i) => studiosQueryOptions(i + 1)),
  });
  const studios = Array.from(
    new Map(studioQueries.flatMap((q) => q.data?.items ?? []).map((s) => [s.id, s])).values(),
  );
  const studiosLoading = studioQueries.some((q) => q.isLoading);
  const lastStudioPage = studioQueries[studioQueries.length - 1];
  const hasMoreStudios = lastStudioPage?.data?.pagination?.has_next_page ?? false;

  const byType = {};
  for (const g of genres) {
    (byType[g.type] ??= []).push(g);
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }} className="animate-fade-in">
      <div style={{ fontWeight: 800, fontSize: 26, color: t.text, marginBottom: 32 }}>Browse by Category</div>

      {isLoading ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 90 + (i % 4) * 20, height: 34, borderRadius: 6, background: t.surface }} />
          ))}
        </div>
      ) : (
        GROUPS.filter(({ type }) => byType[type]?.length).map(({ type, label }) => (
          <section key={type} style={{ marginBottom: 36 }}>
            <div style={{
              fontWeight: 800, fontSize: 16, color: t.text,
              marginBottom: 14, paddingBottom: 10,
              borderBottom: `1px solid ${t.border}`,
            }}>
              {label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {byType[type].map((g) => (
                <Pill
                  key={g.id}
                  label={g.name}
                  count={g.count}
                  t={t}
                  onClick={() => navigate(`/genre/${g.id}`)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Studios */}
      <section style={{ marginBottom: 36 }}>
        <div style={{
          fontWeight: 800, fontSize: 16, color: t.text,
          marginBottom: 14, paddingBottom: 10,
          borderBottom: `1px solid ${t.border}`,
        }}>
          Studios
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {studios.map((s) => (
            <Pill
              key={s.id}
              label={s.name}
              count={s.count}
              t={t}
              onClick={() => navigate(`/studio/${s.id}`)}
            />
          ))}
          {studiosLoading && Array.from({ length: 12 }).map((_, i) => (
            <div key={`sk-${i}`} className="skeleton" style={{ width: 110 + (i % 3) * 24, height: 34, borderRadius: 6, background: t.surface }} />
          ))}
        </div>
        {hasMoreStudios && !studiosLoading && (
          <button
            onClick={() => setStudioPageCount((n) => n + 1)}
            style={{
              marginTop: 14, padding: '8px 18px', background: 'transparent',
              border: `1px solid ${t.border}`, color: t.accent, borderRadius: 7,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .13s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.accentMuted)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            View more studios ↓
          </button>
        )}
      </section>
    </div>
  );
}

function Pill({ label, count, t, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', background: 'transparent',
        border: `1px solid ${t.border}`, color: t.textMuted,
        borderRadius: 6, cursor: 'pointer',
        fontSize: 13, fontWeight: 600, transition: 'all .13s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = t.accent;
        e.currentTarget.style.color = t.accent;
        e.currentTarget.style.background = t.accentMuted;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = t.border;
        e.currentTarget.style.color = t.textMuted;
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
      {count > 0 && (
        <span style={{ fontSize: 11, opacity: 0.55, fontWeight: 500 }}>
          ({count.toLocaleString()})
        </span>
      )}
    </button>
  );
}
