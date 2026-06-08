import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../stores/themeStore';
import { useGenres } from '../hooks/useAnime';

// Display order and labels matching MAL's structure
const TYPE_ORDER = ['Genres', 'Explicit Genres', 'Themes', 'Demographics'];

// Normalize Jikan type strings (they may use underscores)
function normalizeType(raw) {
  if (!raw) return 'Genres';
  return raw.replace(/_/g, ' ');
}

export default function GenreBrowsePage() {
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { data: genres = [], isLoading } = useGenres();

  // Group by normalised type
  const groups = {};
  for (const g of genres) {
    const type = normalizeType(g.type);
    if (!groups[type]) groups[type] = [];
    groups[type].push(g);
  }

  const orderedTypes = [
    ...TYPE_ORDER.filter((t) => groups[t]),
    ...Object.keys(groups).filter((t) => !TYPE_ORDER.includes(t)),
  ];

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}
        >← Back</button>
        <div style={{ fontWeight: 800, fontSize: 26, color: t.text }}>Browse Genres</div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 90 + (i % 4) * 20, height: 34, borderRadius: 6, background: t.surface }} />
          ))}
        </div>
      ) : (
        orderedTypes.map((type) => (
          <section key={type} style={{ marginBottom: 36 }}>
            <div style={{
              fontWeight: 800, fontSize: 16, color: t.text,
              marginBottom: 14, paddingBottom: 10,
              borderBottom: `1px solid ${t.border}`,
            }}>
              {type}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {groups[type].map((g) => (
                <GenreChip key={g.id} genre={g} t={t} navigate={navigate} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function GenreChip({ genre, t, navigate }) {
  return (
    <button
      onClick={() => navigate(`/?genres=${genre.id}`)}
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
      {genre.name}
      {genre.count > 0 && (
        <span style={{ fontSize: 11, opacity: 0.55, fontWeight: 500 }}>
          ({genre.count.toLocaleString()})
        </span>
      )}
    </button>
  );
}
