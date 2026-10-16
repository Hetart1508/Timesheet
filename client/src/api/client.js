import axios from 'axios';

const getCookie = (name) => document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))?.split('=').slice(1).join('=');

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1` : '/api/v1',
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie('ts_csrf');
    if (csrf) config.headers['X-CSRF-Token'] = decodeURIComponent(csrf);
  }
  return config;
});

let refreshPromise;
api.interceptors.response.use(undefined, async (error) => {
  const request = error.config;
  const excluded = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
  if (error.response?.status !== 401 || request?._retried || excluded.some((path) => request?.url?.includes(path))) throw error;
  request._retried = true;
  refreshPromise ||= api.post('/auth/refresh').finally(() => { refreshPromise = null; });
  await refreshPromise;
  return api(request);
});

export const fieldErrors = (error) => Object.fromEntries(
  (error.response?.data?.errors || [])
    .filter((item) => item.field)
    .map((item) => [item.field, item.message]),
);

export const errorMessage = (error) => {
  const response = error.response?.data;
  if (response?.errors?.length) {
    const first = response.errors[0];
    return `${first.field ? `${first.field}: ` : ''}${first.message}`;
  }
  return response?.message || 'Something went wrong. Please try again.';
};
