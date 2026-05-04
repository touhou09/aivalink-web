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
  setUser: (user: AuthUser | null) => void;
}

const hasStoredSession = () => Boolean(localStorage.getItem(AUTH_SESSION_KEY));

const markAuthenticated = () => localStorage.setItem(AUTH_SESSION_KEY, 'active');
const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: hasStoredSession(),
  user: null,
  loading: false,

  login: async (email, password) => {
    await client.post('/auth/login', { email, password });
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
    client.post('/auth/logout', {}).catch(() => {});
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

  setUser: (user) => {
    set({ user, isAuthenticated: Boolean(user) || hasStoredSession() });
  },
}));
