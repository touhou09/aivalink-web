import { create } from 'zustand';
import client from '../api/client';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  user: null,
  loading: false,

  login: async (email, password) => {
    const res = await client.post('/auth/login', { email, password });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    set({ isAuthenticated: true });
  },

  register: async (email, password, displayName) => {
    const res = await client.post('/auth/register', {
      email,
      password,
      display_name: displayName,
    });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    set({ isAuthenticated: true });
  },

  logout: () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      client.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {});
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ isAuthenticated: false, user: null });
  },

  loadUser: async () => {
    set({ loading: true });
    try {
      const res = await client.get('/users/me');
      set({ user: res.data, isAuthenticated: true });
    } catch {
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ loading: false });
    }
  },

  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    set({ isAuthenticated: true });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: Boolean(user) || !!localStorage.getItem('access_token') });
  },
}));
