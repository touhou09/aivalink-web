import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_SESSION_KEY = 'auth_session';

const client = axios.create({
  baseURL: API_BASE + '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
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
      const refreshToken = localStorage.getItem('refresh_token');
      try {
        const res = await axios.post(
          API_BASE + '/api/auth/refresh/',
          refreshToken ? { refresh_token: refreshToken } : {},
          { withCredentials: true },
        );
        const { access_token, refresh_token: newRefresh } = res.data;
        if (access_token && newRefresh) {
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefresh);
          originalRequest.headers.Authorization = 'Bearer ' + access_token;
        }
        localStorage.setItem(AUTH_SESSION_KEY, 'active');
        return client(originalRequest);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem(AUTH_SESSION_KEY);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { API_BASE, AUTH_SESSION_KEY };
export default client;
