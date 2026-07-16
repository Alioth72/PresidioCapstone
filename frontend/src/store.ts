import { create } from 'zustand';
import { type User, authApi } from './api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  checkingAuth: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  
  // Actions
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  checkingAuth: true,
  notification: null,

  showToast: (message, type = 'info') => {
    set({ notification: { message, type } });
    setTimeout(() => {
      get().clearToast();
    }, 4000);
  },

  clearToast: () => set({ notification: null }),

  login: async (username, password) => {
    try {
      const data = await authApi.login(username, password);
      set({ user: data.user, isAuthenticated: true });
      get().showToast(`Welcome back, ${data.user.full_name || data.user.username}!`, 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Login failed. Please check credentials.';
      get().showToast(msg, 'error');
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
      set({ user: null, isAuthenticated: false });
      get().showToast('Logged out successfully.', 'info');
    } catch (err: any) {
      set({ user: null, isAuthenticated: false });
      localStorage.removeItem('token');
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, checkingAuth: false });
    } catch (err) {
      set({ user: null, isAuthenticated: false, checkingAuth: false });
    }
  },
}));
