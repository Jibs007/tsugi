import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeDetail } from '../hooks/useAnime';

export default function ProfilePage({ user }) {
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { entries, myLists, deleteList } = useWatchlistStore();
  const [tab, setTab] = useState('lists');

  const completed = entries.filter((e) => e.status === 'completed');
  const avatar = (user?.username?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    <div style={{ padding: '36px 40px' }} className="animate-fade-in">
      {/* Profile header */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 32, padding: '24px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12 }}>
        <div style={{
          width: 68, height: 68, borderRadius: 14, flexShrink: 0,
          background: `${t.accent}22`, border: `2px solid ${t.accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 26, color: t.accent,
        }}>
          {avatar}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: t.text, marginBottom: 3 }}>{user?.username || user?.email || 'Guest'}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 14 }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['Anime', entries.length], ['Completed', completed.length], ['Lists', myLists.length]].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: t.accent }}>{v}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: 20, borderBottom: `1px solid ${t.border}` }}>
        {[['lists', 'My Lists'], ['activity', 'Activity']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 20px', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${tab === id ? t.accent : 'transparent'}`,
            color: tab === id ? t.accent : t.textMuted,
            fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: -1,
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'lists' && (
        <div>
          {myLists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 15, color: t.textMuted, marginBottom: 16 }}>No lists yet.</div>
              <button onClick={() => navigate('/lists/create')} style={{ padding: '10px 20px', background: t.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Create Your First List
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myLists.map((list) => (
                <div key={list.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: t.text }}>{list.name}</div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>{list.animeIds.length} anime · {list.isPublic ? 'Public' : 'Private'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => navigate(`/lists/${list.id}/edit`)} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 7 }}>Edit</button>
                    <button onClick={() => deleteList(list.id)} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid #f8717133`, color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 7 }}>Delete</button>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/lists/create')} style={{ padding: '12px', background: 'transparent', border: `1px dashed ${t.border}`, color: t.textMuted, fontWeight: 700, fontSize: 14, cursor: 'pointer', borderRadius: 10 }}>
                + Create New List
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.length === 0 ? (
            <div style={{ fontSize: 14, color: t.textMuted, textAlign: 'center', padding: '40px 0' }}>No activity yet.</div>
          ) : (
            entries.slice().reverse().map((entry) => (
              <ActivityItem key={entry.animeId} entry={entry} t={t} navigate={navigate} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ActivityItem({ entry, t, navigate }) {
  const { data: anime } = useAnimeDetail(entry.animeId);
  if (!anime) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[entry.status], flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 14, color: t.textMuted }}>
        Marked <strong style={{ color: STATUS_COLORS[entry.status] }}>{STATUS_LABELS[entry.status]}</strong>
      </div>
      <div onClick={() => navigate(`/anime/${anime.id}`)} style={{ fontWeight: 700, fontSize: 14, color: t.accent2, cursor: 'pointer' }}>
        {anime.title}
      </div>
    </div>
  );
}
