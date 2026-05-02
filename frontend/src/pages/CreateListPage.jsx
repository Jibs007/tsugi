import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimeCover from '../components/AnimeCover';
import { MOCK_ANIME } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';

export default function CreateListPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useThemeStore();
  const { myLists, createList, updateList } = useWatchlistStore();

  const editList = id ? myLists.find((l) => l.id === id) : null;
  const isEdit = !!editList;

  const [name, setName] = useState(editList?.name || '');
  const [desc, setDesc] = useState(editList?.desc || '');
  const [isPublic, setIsPublic] = useState(editList?.isPublic ?? true);
  const [animeIds, setAnimeIds] = useState(editList?.animeIds || []);
  const [search, setSearch] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [saved, setSaved] = useState(false);

  const inputStyle = {
    width: '100%', background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '11px 14px', color: t.text,
    fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
  };

  const searchResults = search.trim()
    ? MOCK_ANIME.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()) || a.jp.includes(search))
    : [];

  const shareLink = `tsugi.app/list/${(name || 'my-list').toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;

  const save = () => {
    if (!name.trim()) return;
    if (isEdit) updateList(editList.id, { name, desc, isPublic, animeIds });
    else createList({ name, desc, isPublic, animeIds });
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate('/lists'); }, 1200);
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: 680 }} className="animate-fade-in">
      <button
        onClick={() => navigate('/lists')}
        style={{ background: 'transparent', border: 'none', color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0 }}
      >
        ← Back
      </button>
      <div style={{ fontWeight: 800, fontSize: 26, color: t.text, marginBottom: 28 }}>
        {isEdit ? 'Edit List' : 'Create List'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>List Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend Binge" style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this list about?" rows={3}
            style={{ ...inputStyle, resize: 'none' }}
            onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />
        </div>

        {/* Privacy toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.textMuted }}>Visibility</span>
          <div
            onClick={() => setIsPublic((p) => !p)}
            style={{ width: 48, height: 24, borderRadius: 12, cursor: 'pointer', background: isPublic ? t.accent : t.surface2, border: `1px solid ${t.border}`, position: 'relative', transition: 'background .2s' }}
          >
            <div style={{ position: 'absolute', top: 3, left: isPublic ? 26 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: isPublic ? t.accent : t.textMuted }}>{isPublic ? 'Public' : 'Private'}</span>
        </div>

        {/* Add anime */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Add Anime</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search to add anime..." style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />
          {searchResults.map((anime) => (
            <div
              key={anime.id}
              onClick={() => { if (!animeIds.includes(anime.id)) setAnimeIds((ids) => [...ids, anime.id]); setSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, marginTop: 4, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
            >
              <AnimeCover anime={anime} width={36} height={50} style={{ borderRadius: 4 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{anime.title}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{anime.jp}</div>
              </div>
              {animeIds.includes(anime.id) && <span style={{ marginLeft: 'auto', color: t.accent2 }}>✓</span>}
            </div>
          ))}
        </div>

        {/* Selected anime */}
        {animeIds.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>In this list ({animeIds.length})</div>
            {animeIds.map((id) => {
              const anime = MOCK_ANIME.find((a) => a.id === id);
              return anime ? (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, marginBottom: 6 }}>
                  <AnimeCover anime={anime} width={36} height={50} style={{ borderRadius: 4 }} />
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: t.text }}>{anime.title}</div>
                  <button onClick={() => setAnimeIds((ids) => ids.filter((i) => i !== id))} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={save}
            style={{ flex: 1, padding: '13px', background: saved ? '#22c55e' : t.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'background .2s' }}
          >
            {saved ? '✓ Saved!' : isEdit ? 'Save Changes' : 'Create List'}
          </button>
          {isPublic && (
            <button
              onClick={() => setShowShare((p) => !p)}
              style={{ padding: '13px 18px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textMuted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Share ↗
            </button>
          )}
        </div>

        {showShare && (
          <div style={{ padding: '14px 16px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Shareable Link</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: t.accent2, wordBreak: 'break-all' }}>{shareLink}</div>
          </div>
        )}
      </div>
    </div>
  );
}
