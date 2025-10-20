import axios from 'axios';
import type { Store } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';
import type { AuthResponse } from '../types/auth';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (/\/admin$/i.test(trimmed)) {
    return trimmed.slice(0, -'/admin'.length);
  }
  return trimmed;
};

const baseURL = normalizeBaseUrl(rawBaseUrl);
const adminBaseURL = `${baseURL}/admin`;

const api = axios.create({
  baseURL
});

api.defaults.baseURL = baseURL;

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
  if (typeof config.baseURL === 'string') {
    config.baseURL = normalizeBaseUrl(config.baseURL);
  }

  if (typeof config.url === 'string') {
    const url = config.url.trim();
    const isAbsolute = /^[a-z][a-z\d+\-.]*:/.test(url);
    if (!isAbsolute) {
      if (url === '/admin') {
        config.baseURL = adminBaseURL;
        config.url = '';
      } else if (url.startsWith('/admin/')) {
        config.baseURL = adminBaseURL;
        config.url = url.slice('/admin'.length);
      } else if (!config.baseURL) {
        config.baseURL = baseURL;
      }
    }
  } else if (!config.baseURL) {
    config.baseURL = baseURL;
  }

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
            `${api.defaults.baseURL}/auth/refresh`,
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
