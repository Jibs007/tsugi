import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEMES } from '../lib/constants';

// Persist only the theme *name* — palettes live in code, so palette tweaks
// apply on next load instead of being frozen inside localStorage.
export const useThemeStore = create(
  persist(
    (set) => ({
      themeName: 'dusk',
      theme: THEMES.dusk,
      cardStyle: 'grid',
      setTheme: (name) => set({ themeName: THEMES[name] ? name : 'dusk', theme: THEMES[name] ?? THEMES.dusk }),
      setCardStyle: (style) => set({ cardStyle: style }),
    }),
    {
      name: 'tsugi-theme',
      partialize: (s) => ({ themeName: s.themeName, cardStyle: s.cardStyle }),
      merge: (persisted, current) => {
        const themeName = THEMES[persisted?.themeName] ? persisted.themeName : 'dusk';
        return {
          ...current,
          cardStyle: persisted?.cardStyle === 'list' ? 'list' : 'grid',
          themeName,
          theme: THEMES[themeName],
        };
      },
    },
  ),
);
