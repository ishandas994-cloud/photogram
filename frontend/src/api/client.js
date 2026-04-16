import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let refreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(() => api(original));
      }
      original._retry = true;
      refreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        queue.forEach(({ resolve }) => resolve());
        queue = [];
        return api(original);
      } catch {
        queue.forEach(({ reject }) => reject());
        queue = [];
        localStorage.clear();
        window.location.href = '/login';
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;