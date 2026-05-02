import { create } from 'zustand';
import { authApi, setTokenGetter, setRefreshCallbacks } from '../lib/api.js';

export const useAuthStore = create((set, get) => {
  // Wire the token getter so the request interceptor always has the latest value
  setTokenGetter(() => get().accessToken);

  // Wire refresh callbacks so the response interceptor can update/clear state
  setRefreshCallbacks(
    (newToken) => set({ accessToken: newToken }),
    () => set({ user: null, accessToken: null }),   // session truly expired
  );

  return {
    user:        null,
    accessToken: null,
    loading:     false,
    error:       null,

    // ── Actions ────────────────────────────────────────────────────────────

    signup: async (username, email, password) => {
      set({ loading: true, error: null });
      try {
        const { user, accessToken } = await authApi.signup(username, email, password);
        set({ user, accessToken, loading: false });
      } catch (err) {
        set({ error: err.error || 'Signup failed', loading: false });
        throw err;
      }
    },

    login: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const { user, accessToken } = await authApi.login(email, password);
        set({ user, accessToken, loading: false });
      } catch (err) {
        set({ error: err.error || 'Login failed', loading: false });
        throw err;
      }
    },

    logout: async () => {
      try { await authApi.logout(); } catch {}
      set({ user: null, accessToken: null, error: null });
    },

    // Called on app boot — silently attempt a token refresh using the
    // httpOnly cookie. If it fails the user is just a guest.
    initAuth: async () => {
      set({ loading: true });
      try {
        const { user, accessToken } = await authApi.refresh();
        set({ user, accessToken, loading: false });
      } catch {
        set({ loading: false }); // No valid session — guest mode
      }
    },

    // Called after Google OAuth redirect (/auth/callback?token=…)
    handleOAuthCallback: (accessToken) => {
      set({ accessToken });
      authApi.me().then((user) => set({ user })).catch(() => {});
    },

    clearError: () => set({ error: null }),
  };
});
