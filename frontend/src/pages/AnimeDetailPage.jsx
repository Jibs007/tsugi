import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnimeCover from '../components/AnimeCover';
import StatusBadge from '../components/StatusBadge';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeDetail, useAnimeCharacters, useRecommendations } from '../hooks/useAnime';

// Relation type display order (MAL convention)
const RELATION_ORDER = ['Sequel', 'Prequel', 'Alternative Version', 'Alternative Setting', 'Side Story', 'Spin-off', 'Full Story', 'Parent Story', 'Summary', 'Adaptation', 'Character', 'Other'];

function getYouTubeId(embedUrl) {
  if (!embedUrl) return null;
  const m = embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export default function AnimeDetailPage({ user, onAuthClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { entries, upsertEntry, removeEntry, myLists, addAnimeToList } = useWatchlistStore();
  const [showListPicker, setShowListPicker] = useState(false);
  const [toast, setToast] = useState(null);

  const { data: anime, isLoading, isError } = useAnimeDetail(id);
  const { data: chars = [] }  = useAnimeCharacters(id);
  const { data: recs  = [] }  = useRecommendations(id);
  const entry = entries.find((e) => e.animeId === Number(id));

  useEffect(() => {
    document.title = anime?.title ? `${anime.title} · Tsugi` : 'Tsugi 次 · Anime Watchlist';
    return () => { document.title = 'Tsugi 次 · Anime Watchlist'; };
  }, [anime?.title]);

  if (isLoading) return <DetailSkeleton t={t} />;
  if (isError || !anime) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: t.textMuted }}>
        Anime not found.{' '}
        <span onClick={() => navigate('/')} style={{ color: t.accent, cursor: 'pointer' }}>Go home</span>
      </div>
    );
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const setStatus = (status) => {
    if (!user) { onAuthClick(); return; }
    if (status === null) removeEntry(anime.id);
    else upsertEntry(anime.id, status);
  };

  const handleAddToList = (listId) => {
    addAnimeToList(listId, anime.id);
    setShowListPicker(false);
    showToast('Added to list ✓');
  };

  const btnBase = {
    padding: '9px 16px', cursor: 'pointer', borderRadius: 7,
    fontWeight: 700, fontSize: 13, transition: 'all .13s', border: 'none',
  };

  // Trailer
  const ytId = getYouTubeId(anime.trailer);

  // Related entries — only anime, sorted by relation type order
  const relations = (anime.relations || [])
    .map((r) => ({ relation: r.relation, entries: (r.entry || []).filter((e) => e.type === 'anime') }))
    .filter((r) => r.entries.length > 0)
    .sort((a, b) => {
      const ai = RELATION_ORDER.indexOf(a.relation);
      const bi = RELATION_ORDER.indexOf(b.relation);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  // Streaming + external links (plus the canonical MAL page)
  const streamLinks = [
    ...(anime.malUrl ? [{ name: 'MyAnimeList', url: anime.malUrl }] : []),
    ...(anime.streaming || []),
    ...(anime.external  || []),
  ].filter((l) => l.name && l.url);

  return (
    <div style={{ padding: '40px', maxWidth: 960 }} className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'transparent', border: 'none', color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0 }}
      >
        ← Back
      </button>

      {/* Hero row */}
      <div style={{ display: 'flex', gap: 36, marginBottom: 36 }}>
        <AnimeCover anime={anime} width={180} height={252} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 34, color: t.text, lineHeight: 1.1, marginBottom: 4 }}>{anime.title}</div>
          <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 16 }}>{anime.jp}</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
            {anime.genres.map((g) => (
              <span key={g} style={{ fontSize: 12, fontWeight: 700, color: t.accent2, background: t.accentMuted, borderRadius: 5, padding: '3px 10px' }}>{g}</span>
            ))}
            <StatusBadge status={anime.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
            {[['Score', anime.rating != null ? `★ ${anime.rating}` : '—'], ['Episodes', anime.eps], ['Year', anime.year || '—'], ['Studio', anime.studio || '—']].map(([label, val]) => (
              <div key={label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: t.text }}>{val}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.75, marginBottom: 24, maxWidth: 540 }}>
            {anime.desc || 'No synopsis available yet.'}
          </p>

          {/* Streaming badges */}
          {streamLinks.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {streamLinks.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 5,
                    background: t.surface, border: `1px solid ${t.border}`,
                    color: t.textMuted, textDecoration: 'none', transition: 'border-color .13s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
                >{l.name}</a>
              ))}
            </div>
          )}

          {/* Status buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', alignItems: 'center' }}>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatus(entry?.status === key ? null : key)}
                style={{
                  ...btnBase,
                  background: entry?.status === key ? `${STATUS_COLORS[key]}20` : t.surface,
                  border: `1px solid ${entry?.status === key ? STATUS_COLORS[key] : t.border}`,
                  color: entry?.status === key ? STATUS_COLORS[key] : t.textMuted,
                }}
              >{label}</button>
            ))}

            <button
              onClick={() => { if (!user) { onAuthClick(); return; } setShowListPicker((p) => !p); }}
              style={{ ...btnBase, background: t.accentMuted, border: `1px solid ${t.accent}55`, color: t.accent }}
            >+ Add to List</button>

            {showListPicker && (
              <div style={{
                position: 'absolute', top: '115%', left: 0, zIndex: 20,
                background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10,
                padding: 8, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                {myLists.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: t.textMuted }}>
                    No lists yet.{' '}
                    <span onClick={() => navigate('/lists/create')} style={{ color: t.accent, cursor: 'pointer', fontWeight: 600 }}>Create one?</span>
                  </div>
                )}
                {myLists.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => handleAddToList(l.id)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: 6, fontWeight: 600, fontSize: 14, color: t.text, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.surface)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{l.name}</span>
                    {l.animeIds.includes(anime.id) && <span style={{ color: t.accent2 }}>✓</span>}
                  </div>
                ))}
                <div
                  onClick={() => { setShowListPicker(false); navigate('/lists/create'); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderTop: `1px solid ${t.border}`, fontSize: 13, color: t.accent, fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.surface)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >+ Create new list</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trailer */}
      {ytId && (
        <Section title="Trailer" t={t}>
          <a
            href={`https://www.youtube.com/watch?v=${ytId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.border}` }}
          >
            <img
              src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
              alt="Trailer thumbnail"
              style={{ display: 'block', width: 320, height: 180, objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 22, marginLeft: 4 }}>▶</span>
              </div>
            </div>
          </a>
        </Section>
      )}

      {/* Characters */}
      {chars.length > 0 && (
        <Section title="Characters" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {chars.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: 50, flexShrink: 0, background: t.surface2 }}>
                  {c.image
                    ? <img src={c.image} alt={c.name} style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: 70, background: t.surface2 }} />
                  }
                </div>
                <div style={{ padding: '8px 8px 8px 0', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: t.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  {c.va && <div style={{ fontSize: 11, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>CV: {c.va}</div>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Related entries */}
      {relations.length > 0 && (
        <Section title="Related" t={t}>
          {relations.map((group) => (
            <div key={group.relation} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>{group.relation}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {group.entries.map((entry) => (
                  <RelationCard key={entry.mal_id} entry={entry} t={t} navigate={navigate} />
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <Section title="You Might Also Like" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
            {recs.slice(0, 6).map((rec) => (
              <div
                key={rec.id}
                onClick={() => navigate(`/anime/${rec.id}`)}
                style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', background: t.surface, border: `1px solid ${t.border}`, transition: 'border-color .13s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent + '66')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
              >
                <div style={{ height: 120, background: t.surface2 }}>
                  {rec.image
                    ? <img src={rec.image} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: '100%', background: `${rec.color}22` }} />
                  }
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.title}</div>
                  {rec.rating > 0 && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>★ {rec.rating}</div>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 999,
          background: t.surface2, border: `1px solid ${t.accent}55`,
          borderRadius: 10, padding: '12px 22px',
          fontWeight: 700, fontSize: 14, color: t.accent,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }} className="animate-fade-in">{toast}</div>
      )}
    </div>
  );
}

function Section({ title, t, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: t.text, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${t.border}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// Deliberately does NOT fetch full details per relation — long-running
// franchises have dozens of related entries, and one fetch each would blow
// straight through Jikan's rate limit. The name from the relations payload
// is enough; the detail page is one click away.
function RelationCard({ entry, t, navigate }) {
  return (
    <div
      onClick={() => navigate(`/anime/${entry.mal_id}`)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', maxWidth: 260, padding: '10px 14px', transition: 'border-color .13s' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent + '66')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{entry.type?.toUpperCase?.() || 'ANIME'}</div>
      </div>
    </div>
  );
}

function DetailSkeleton({ t }) {
  return (
    <div style={{ padding: '40px', maxWidth: 960 }} className="animate-fade-in">
      <div className="skeleton" style={{ width: 60, height: 16, background: t.surface, borderRadius: 6, marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 36 }}>
        <div className="skeleton" style={{ width: 180, height: 252, background: t.surface, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton" style={{ width: '60%', height: 36, background: t.surface, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: '35%', height: 16, background: t.surface, borderRadius: 6 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[80, 70, 90].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: w, height: 24, background: t.surface, borderRadius: 5 }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 4 }}>
            {[0,1,2,3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 60, background: t.surface, borderRadius: 8 }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 80, background: t.surface, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}
