import { create } from 'zustand';
import client, { AUTH_SESSION_KEY } from '../api/client';

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
  completeOAuthCallback: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser | null) => void;
}

const hasStoredSession = () =>
  Boolean(localStorage.getItem('access_token') || localStorage.getItem(AUTH_SESSION_KEY));

const markAuthenticated = () => localStorage.setItem(AUTH_SESSION_KEY, 'active');
const clearStoredAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem(AUTH_SESSION_KEY);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: hasStoredSession(),
  user: null,
  loading: false,

  login: async (email, password) => {
    const res = await client.post('/auth/login', { email, password });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    markAuthenticated();
    set({ isAuthenticated: true });
  },

  register: async (email, password, displayName) => {
    await client.post('/auth/register', {
      email,
      password,
      display_name: displayName,
    });
    await get().login(email, password);
  },

  logout: () => {
    const refreshToken = localStorage.getItem('refresh_token');
    client.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {}).catch(() => {});
    clearStoredAuth();
    set({ isAuthenticated: false, user: null });
  },

  loadUser: async () => {
    set({ loading: true });
    try {
      const res = await client.get('/users/me');
      markAuthenticated();
      set({ user: res.data, isAuthenticated: true });
    } catch {
      clearStoredAuth();
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ loading: false });
    }
  },

  completeOAuthCallback: async () => {
    set({ loading: true });
    try {
      const res = await client.get('/users/me');
      markAuthenticated();
      set({ user: res.data, isAuthenticated: true });
    } finally {
      set({ loading: false });
    }
  },

  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    markAuthenticated();
    set({ isAuthenticated: true });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: Boolean(user) || hasStoredSession() });
  },
}));
