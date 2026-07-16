import { create } from 'zustand';
import axios from 'axios';
import { type User, authApi } from './api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  checkingAuth: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  theme: 'light' | 'dark';
  
  // Actions
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: (username?: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  toggleTheme: () => void;
}

// Read and apply initial theme immediately on boot to prevent flash
const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
document.documentElement.setAttribute('data-theme', initialTheme);

export const useStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  checkingAuth: true,
  notification: null,
  theme: initialTheme,

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
    } catch (err) {
      let msg = 'Login failed. Please check credentials.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      get().showToast(msg, 'error');
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
      set({ user: null, isAuthenticated: false });
      get().showToast('Logged out successfully.', 'info');
    } catch (err) {
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

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: nextTheme });
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  },
}));

