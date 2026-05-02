import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEMES } from '../lib/constants';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      themeName: 'dusk',
      cardStyle: 'grid',
      theme: THEMES.dusk,
      setTheme: (name) => set({ themeName: name, theme: THEMES[name] || THEMES.dusk }),
      setCardStyle: (style) => set({ cardStyle: style }),
    }),
    { name: 'tsugi-theme' },
  ),
);
