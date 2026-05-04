import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_SESSION_KEY = 'auth_session';
const CSRF_COOKIE_NAME = 'csrf_token';

function readCookie(name: string) {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + '='))
    ?.slice(name.length + 1);
}

function csrfHeaderValue() {
  const token = readCookie(CSRF_COOKIE_NAME);
  return token ? decodeURIComponent(token) : undefined;
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

const client = axios.create({
  baseURL: API_BASE + '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = csrfHeaderValue();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  // Ensure trailing slash to avoid 307 redirects from FastAPI
  if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
    config.url += '/';
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(
          API_BASE + '/api/auth/refresh/',
          {},
          {
            withCredentials: true,
            headers: csrfHeaderValue() ? { 'X-CSRF-Token': csrfHeaderValue() } : undefined,
          },
        );
        localStorage.setItem(AUTH_SESSION_KEY, 'active');
        return client(originalRequest);
      } catch {
        clearStoredAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { API_BASE, AUTH_SESSION_KEY, csrfHeaderValue };
export default client;
