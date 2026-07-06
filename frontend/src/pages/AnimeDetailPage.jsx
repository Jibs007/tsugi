import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnimeCover from '../components/AnimeCover';
import StatusBadge from '../components/StatusBadge';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeDetail, useAnimeCharacters, useRecommendations } from '../hooks/useAnime';
import { useAutoRetry } from '../hooks/useAutoRetry';

// Relation type display order (MAL convention)
const RELATION_ORDER = ['Sequel', 'Prequel', 'Alternative Version', 'Alternative Setting', 'Side Story', 'Spin-off', 'Full Story', 'Parent Story', 'Summary', 'Adaptation', 'Character', 'Other'];

function getYouTubeId(embedUrl) {
  if (!embedUrl) return null;
  const m = embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

const fmt = (n) => (n == null ? '—' : n.toLocaleString());
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function AnimeDetailPage({ user, onAuthClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { entries, upsertEntry, removeEntry, myLists, addAnimeToList } = useWatchlistStore();
  const [showListPicker, setShowListPicker] = useState(false);
  const [toast, setToast] = useState(null);

  const { data: anime, isLoading, isError, refetch } = useAnimeDetail(id);
  const { data: chars = [] }  = useAnimeCharacters(id);
  const { data: recs  = [] }  = useRecommendations(id);
  const entry = entries.find((e) => e.animeId === Number(id));

  useEffect(() => {
    document.title = anime?.title ? `${anime.title} · Tsugi` : 'Tsugi 次 · Anime Watchlist';
    return () => { document.title = 'Tsugi 次 · Anime Watchlist'; };
  }, [anime?.title]);

  // Auto-retry failed loads (5s apart, 3 times) before asking for a click
  const { retrying, retryNow } = useAutoRetry(isError, refetch);

  if (isLoading) return <DetailSkeleton t={t} />;
  if (isError || !anime) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: t.textMuted }}>
        <div style={{ marginBottom: 14 }}>
          {isError && retrying
            ? 'Having trouble reaching MyAnimeList — retrying automatically…'
            : "Couldn't load this anime."}
        </div>
        {isError && retrying ? (
          <span className="skeleton" style={{ width: 10, height: 10, borderRadius: '50%', background: t.accent, display: 'inline-block' }} />
        ) : (
          <>
            {isError && (
              <button
                onClick={retryNow}
                style={{ background: t.accent, border: 'none', borderRadius: 7, color: '#fff', fontWeight: 700, fontSize: 13, padding: '9px 18px', cursor: 'pointer', marginRight: 10 }}
              >Retry</button>
            )}
            <button
              onClick={() => navigate('/')}
              style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 7, color: t.textMuted, fontWeight: 600, fontSize: 13, padding: '9px 18px', cursor: 'pointer' }}
            >Go home</button>
          </>
        )}
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

  const premiered = anime.season ? `${cap(anime.season)} ${anime.year ?? ''}`.trim() : (anime.year || null);

  // MAL-style information panel rows — empty values are skipped
  const infoRows = [
    ['Type',       anime.type],
    ['Episodes',   anime.eps],
    ['Status',     anime.airStatus],
    ['Aired',      anime.aired],
    ['Premiered',  premiered],
    ['Broadcast',  anime.broadcast],
    ['Studios',    anime.studios.join(', ')],
    ['Producers',  anime.producers.slice(0, 4).join(', ')],
    ['Licensors',  anime.licensors.slice(0, 3).join(', ')],
    ['Source',     anime.source],
    ['Duration',   anime.duration],
    ['Rating',     anime.ageRating],
  ].filter(([, v]) => v != null && v !== '');

  const statCards = [
    { label: 'Score',      value: anime.rating != null ? `★ ${anime.rating}` : '—', sub: anime.scoredBy ? `${fmt(anime.scoredBy)} users` : null, highlight: true },
    { label: 'Ranked',     value: anime.rank       != null ? `#${fmt(anime.rank)}`       : '—' },
    { label: 'Popularity', value: anime.popularity != null ? `#${fmt(anime.popularity)}` : '—' },
    { label: 'Members',    value: fmt(anime.members) },
    { label: 'Favorites',  value: fmt(anime.favorites) },
  ];

  const genreChips = [
    ...anime.genres.map((g) => ({ label: g, kind: 'genre' })),
    ...anime.themes.map((g) => ({ label: g, kind: 'theme' })),
    ...anime.demographics.map((g) => ({ label: g, kind: 'demo' })),
  ];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }} className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'transparent', border: 'none', color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}
      >
        ← Back
      </button>

      {/* Title block */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 32, color: t.text, lineHeight: 1.15, marginBottom: 4 }}>{anime.title}</div>
        <div style={{ fontSize: 14, color: t.textMuted }}>
          {anime.titleJp}
          {anime.synonyms.length > 0 && (
            <span style={{ color: t.textDim }}> · {anime.synonyms.slice(0, 2).join(' · ')}</span>
          )}
        </div>
      </div>

      {/* Stats strip — MAL style */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {statCards.map((s) => (
          <div key={s.label} style={{
            background: s.highlight ? t.accentMuted : t.surface,
            border: `1px solid ${s.highlight ? `${t.accent}55` : t.border}`,
            borderRadius: 10, padding: '10px 18px', minWidth: 108,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.highlight ? t.accent : t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: t.text }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Two-column body: info panel left (MAL-style), content right */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* ── Left column ── */}
        <div style={{ width: 225, flexShrink: 0 }}>
          <AnimeCover anime={anime} width={225} height={318} />

          {/* Information panel */}
          <div style={{ marginTop: 16, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: t.text, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${t.border}` }}>
              Information
            </div>
            {infoRows.map(([label, val]) => (
              <div key={label} style={{ marginBottom: 8, fontSize: 12, lineHeight: 1.45 }}>
                <span style={{ fontWeight: 700, color: t.textMuted }}>{label}: </span>
                <span style={{ color: t.text }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Links */}
          {streamLinks.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
        </div>

        {/* ── Right column ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Genre / theme / demographic chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            {genreChips.map((g) => (
              <span key={`${g.kind}-${g.label}`} style={{
                fontSize: 12, fontWeight: 700, borderRadius: 5, padding: '3px 10px',
                color:      g.kind === 'genre' ? t.accent2 : t.textMuted,
                background: g.kind === 'genre' ? t.accentMuted : t.surface,
                border:     g.kind === 'genre' ? 'none' : `1px solid ${t.border}`,
              }}>{g.label}</span>
            ))}
            <StatusBadge status={anime.status} />
          </div>

          {/* Watch status + list actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', alignItems: 'center', marginBottom: 24 }}>
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

          {/* Synopsis */}
          <Section title="Synopsis" t={t}>
            <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.75, whiteSpace: 'pre-line' }}>
              {anime.desc || 'No synopsis available yet.'}
            </p>
          </Section>

          {/* Background */}
          {anime.background && (
            <Section title="Background" t={t}>
              <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{anime.background}</p>
            </Section>
          )}

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

          {/* Opening / Ending themes */}
          {(anime.openings.length > 0 || anime.endings.length > 0) && (
            <Section title="Theme Songs" t={t}>
              <div style={{ display: 'grid', gridTemplateColumns: anime.openings.length && anime.endings.length ? '1fr 1fr' : '1fr', gap: 20 }}>
                {[['Openings', anime.openings], ['Endings', anime.endings]].filter(([, list]) => list.length > 0).map(([label, list]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
                    {list.map((song, i) => (
                      <div key={i} style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5, marginBottom: 6, display: 'flex', gap: 8 }}>
                        <span style={{ color: t.accent2 }}>♪</span>
                        <span>{song}</span>
                      </div>
                    ))}
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
                    {group.entries.map((rel) => (
                      <RelationCard key={rel.mal_id} entry={rel} t={t} navigate={navigate} />
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Characters */}
          {chars.length > 0 && (
            <Section title="Characters & Voice Actors" t={t}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {chars.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ width: 50, flexShrink: 0, background: t.surface2 }}>
                      {c.image
                        ? <img src={c.image} alt={c.name} style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: 70, background: t.surface2 }} />
                      }
                    </div>
                    <div style={{ padding: '8px 8px 8px 0', minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: t.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      {c.va && <div style={{ fontSize: 11, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>CV: {c.va}</div>}
                    </div>
                    {c.vaImage && (
                      <img src={c.vaImage} alt={c.va} style={{ width: 50, height: 70, objectFit: 'cover', display: 'block', flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recommendations */}
          {recs.length > 0 && (
            <Section title="You Might Also Like" t={t}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                {recs.slice(0, 8).map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => navigate(`/anime/${rec.id}`)}
                    style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', background: t.surface, border: `1px solid ${t.border}`, transition: 'border-color .13s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent + '66')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
                  >
                    <div style={{ height: 150, background: t.surface2 }}>
                      {rec.image
                        ? <img src={rec.image} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: '100%', background: `${rec.color}22` }} />
                      }
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.title}</div>
                      {rec.votes != null && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{rec.votes} votes</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

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
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontWeight: 800, fontSize: 17, color: t.text, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${t.border}` }}>
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
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', maxWidth: 280, padding: '10px 14px', transition: 'border-color .13s' }}
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
    <div style={{ padding: '32px 40px', maxWidth: 1100 }} className="animate-fade-in">
      <div className="skeleton" style={{ width: 60, height: 16, background: t.surface, borderRadius: 6, marginBottom: 20 }} />
      <div className="skeleton" style={{ width: '55%', height: 34, background: t.surface, borderRadius: 8, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '30%', height: 15, background: t.surface, borderRadius: 6, marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ width: 110, height: 64, background: t.surface, borderRadius: 10 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 32 }}>
        <div style={{ width: 225, flexShrink: 0 }}>
          <div className="skeleton" style={{ width: 225, height: 318, background: t.surface, borderRadius: 10, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: '100%', height: 220, background: t.surface, borderRadius: 10 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[80, 70, 90].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: w, height: 24, background: t.surface, borderRadius: 5 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[90, 110, 96, 84].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: w, height: 34, background: t.surface, borderRadius: 7 }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 140, background: t.surface, borderRadius: 8, marginTop: 8 }} />
          <div className="skeleton" style={{ height: 90, background: t.surface, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}
