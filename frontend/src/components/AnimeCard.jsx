import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCover from './AnimeCover';
import StatusBadge from './StatusBadge';
import { STATUS_COLORS, STATUS_LABELS } from '../lib/constants';

function TypeBadge({ type, t }) {
  if (!type) return null;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase',
      color: t.textMuted, background: t.surface2, border: `1px solid ${t.border}`,
      borderRadius: 4, padding: '1px 5px',
    }}>{type}</span>
  );
}

// Genre chip that links to the genre's browse page without triggering the card click
function GenreChip({ genre, t, small }) {
  const navigate = useNavigate();
  const clickable = genre.id != null;
  return (
    <span
      onClick={clickable ? (e) => { e.stopPropagation(); navigate(`/genre/${genre.id}`); } : undefined}
      style={{
        fontSize: small ? 10 : 11, fontWeight: small ? 700 : 600, color: t.accent2,
        background: t.accentMuted, borderRadius: 4, padding: small ? '2px 6px' : '2px 7px',
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseEnter={clickable ? (e) => (e.currentTarget.style.textDecoration = 'underline') : undefined}
      onMouseLeave={clickable ? (e) => (e.currentTarget.style.textDecoration = 'none') : undefined}
    >{genre.name}</span>
  );
}

export default function AnimeCard({ anime, onClick, watchEntry, t, cardStyle = 'grid' }) {
  const [hovered, setHovered] = useState(false);

  if (cardStyle === 'list') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: hovered ? t.surface2 : t.surface,
          border: `1px solid ${hovered ? t.accent + '55' : t.border}`,
          borderRadius: 10, padding: '10px 16px',
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        <AnimeCover anime={anime} width={52} height={74} style={{ borderRadius: 4 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: t.text, marginBottom: 1 }}>{anime.title}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{anime.jp}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {anime.genres.slice(0, 2).map((g) => (
              <GenreChip key={g.name} genre={g} t={t} />
            ))}
            <TypeBadge type={anime.type} t={t} />
            <span style={{ fontSize: 11, color: t.textMuted }}>{anime.eps} eps</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 4 }}>{anime.rating != null ? `★ ${anime.rating}` : '—'}</div>
          {anime.status !== 'completed' && <StatusBadge status={anime.status} small />}
          {watchEntry && (
            <div style={{ marginTop: 5, fontSize: 11, color: STATUS_COLORS[watchEntry.status], fontWeight: 700 }}>
              {STATUS_LABELS[watchEntry.status]}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: t.surface, borderRadius: 10, cursor: 'pointer',
        overflow: 'hidden', position: 'relative',
        border: `1px solid ${hovered ? t.accent + '44' : t.border}`,
        transition: 'border-color .15s, transform .15s, box-shadow .15s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <AnimeCover anime={anime} width="100%" height={170} style={{ width: '100%', borderRadius: 0 }} />
        {watchEntry && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.75)', borderRadius: 5,
            padding: '3px 7px', fontSize: 10, fontWeight: 700,
            color: STATUS_COLORS[watchEntry.status],
          }}>
            {STATUS_LABELS[watchEntry.status]}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{anime.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {anime.status !== 'completed'
            ? <StatusBadge status={anime.status} small />
            : <span style={{ fontSize: 11, color: t.textDim }}>{anime.year || '—'}</span>
          }
          <span style={{ fontWeight: 700, fontSize: 12, color: t.textMuted }}>{anime.rating != null ? `★ ${anime.rating}` : '—'}</span>
        </div>
      </div>

      {/* Hover overlay — full title + details */}
      {hovered && (
        <div
          className="card-overlay"
          style={{
            position: 'absolute', inset: 0, zIndex: 5,
            background: 'rgba(10,10,18,0.93)',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '14px 12px',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
            {anime.title}
          </div>
          {anime.jp && anime.jp !== anime.title && (
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8, lineHeight: 1.3 }}>{anime.jp}</div>
          )}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {anime.genres.slice(0, 4).map((g) => (
              <GenreChip key={g.name} genre={g} t={t} small />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: t.textMuted, alignItems: 'center', flexWrap: 'wrap' }}>
            {anime.rating != null && <span>★ {anime.rating}</span>}
            <TypeBadge type={anime.type} t={t} />
            <span>{anime.eps} eps</span>
            {anime.year && <span>{anime.year}</span>}
          </div>
          {anime.status !== 'completed' && (
            <div style={{ marginTop: 8 }}><StatusBadge status={anime.status} small /></div>
          )}
        </div>
      )}
    </div>
  );
}
