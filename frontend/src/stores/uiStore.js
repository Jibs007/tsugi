import { create } from 'zustand';

export const useUIStore = create((set) => ({
  showAuth: false,
  openAuth:  () => set({ showAuth: true }),
  closeAuth: () => set({ showAuth: false }),
}));
