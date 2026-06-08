import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEMES } from '../lib/constants';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: THEMES.dusk,
      cardStyle: 'grid',
      setCardStyle: (style) => set({ cardStyle: style }),
    }),
    { name: 'tsugi-theme' },
  ),
);
