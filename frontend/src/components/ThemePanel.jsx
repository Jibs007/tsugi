import { useState } from 'react';
import { THEMES } from '../lib/constants';
import { useThemeStore } from '../stores/themeStore';

export default function ThemePanel() {
  const [open, setOpen] = useState(false);
  const { themeName, cardStyle, setTheme, setCardStyle, theme: t } = useThemeStore();

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((p) => !p)}
        title="Theme settings"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 500,
          width: 40, height: 40, borderRadius: 10,
          background: t.surface2, border: `1px solid ${t.border}`,
          color: t.textMuted, fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'all .15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = t.text)}
        onMouseLeave={(e) => (e.currentTarget.style.color = t.textMuted)}
      >
        ◐
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 68, right: 20, zIndex: 500,
          background: t.bg2, border: `1px solid ${t.border}`,
          borderRadius: 12, padding: '16px 18px', width: 210,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
          className="animate-slide-up"
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Theme</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {Object.entries(THEMES).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 7, cursor: 'pointer',
                  background: themeName === key ? theme.accentMuted : theme.surface,
                  border: `1px solid ${themeName === key ? theme.accent : theme.border}`,
                  color: themeName === key ? theme.accent : theme.textMuted,
                  fontSize: 11, fontWeight: 700,
                  transition: 'all .13s',
                }}
              >
                {theme.name}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Card Style</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['grid', 'Grid ⊞'], ['list', 'List ≡']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setCardStyle(val)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 7, cursor: 'pointer',
                  background: cardStyle === val ? t.accentMuted : t.surface,
                  border: `1px solid ${cardStyle === val ? t.accent : t.border}`,
                  color: cardStyle === val ? t.accent : t.textMuted,
                  fontSize: 11, fontWeight: 700,
                  transition: 'all .13s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
