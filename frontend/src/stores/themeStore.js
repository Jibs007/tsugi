import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEME } from '../lib/constants';

// Dusk is the only theme (hardcoded). Only the Grid/List card style is a
// user preference, and it's the only thing persisted.
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: THEME,
      cardStyle: 'grid',
      setCardStyle: (style) => set({ cardStyle: style }),
    }),
    {
      name: 'tsugi-theme',
      partialize: (s) => ({ cardStyle: s.cardStyle }),
      merge: (persisted, current) => ({
        ...current,
        cardStyle: persisted?.cardStyle === 'list' ? 'list' : 'grid',
        theme: THEME,
      }),
    },
  ),
);
