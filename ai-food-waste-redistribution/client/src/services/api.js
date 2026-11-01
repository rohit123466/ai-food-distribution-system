import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  // Required so the browser attaches/receives the httpOnly refreshToken cookie
  // (server CORS uses origin: true + credentials: true to allow this cross-origin in dev).
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints must never trigger the refresh-and-retry dance below, or a bad
// login attempt would recurse into refresh attempts instead of surfacing the error.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

let refreshPromise = null;

function isAuthEndpoint(url = '') {
  return AUTH_ENDPOINTS.some((path) => url.includes(path));
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;

    if (response?.status !== 401 || !config || config._retry || isAuthEndpoint(config.url)) {
      return Promise.reject(error);
    }
    config._retry = true;

    try {
      // Multiple requests can 401 at once (e.g. two components fetching on mount);
      // share a single in-flight refresh instead of firing one per request.
      if (!refreshPromise) {
        refreshPromise = api
          .post('/auth/refresh')
          .then(({ data }) => {
            localStorage.setItem('accessToken', data.accessToken);
            return data.accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      const accessToken = await refreshPromise;
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      return Promise.reject(error);
    }
  },
);

export default api;
