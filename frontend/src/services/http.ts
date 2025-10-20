import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { Store } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';
import type { AuthResponse } from '../types/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
});

const ensureAdminPath = (url: string): string => {
  if (/^https?:/i.test(url)) {
    return url;
  }
  if (!url) {
    return '/admin';
  }
  if (url.startsWith('/admin')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `/admin${url}`;
  }
  return `/admin/${url}`;
};

export const adminApi = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(ensureAdminPath(url), config),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(ensureAdminPath(url), config),
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.post<T>(ensureAdminPath(url), data, config),
  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.put<T>(ensureAdminPath(url), data, config),
  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.patch<T>(ensureAdminPath(url), data, config),
  defaults: api.defaults
};

let storeRef: Store<RootState> | null = null;
let refreshListener: ((payload: AuthResponse) => void) | null = null;
let logoutListener: (() => void) | null = null;

export const injectStore = (store: Store<RootState>) => {
  storeRef = store;
};

export const registerAuthListeners = (
  onRefresh: (payload: AuthResponse) => void,
  onLogout: () => void
) => {
  refreshListener = onRefresh;
  logoutListener = onLogout;
};

api.interceptors.request.use((config) => {
  if (!storeRef) return config;
  const state = storeRef.getState();
  const token = state.auth.accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && storeRef) {
      originalRequest._retry = true;
      const refreshToken = storeRef.getState().auth.refreshToken;
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(
            `${api.defaults.baseURL}${ensureAdminPath('/auth/refresh')}`,
            { refreshToken }
          );
          refreshListener?.(refreshResponse.data);
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          logoutListener?.();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
