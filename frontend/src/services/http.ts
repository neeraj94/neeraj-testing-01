import axios, { type AxiosInstance } from 'axios';
import type { Store } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';
import type { AuthResponse } from '../types/auth';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

const sanitizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const baseURL = sanitizeBaseUrl(rawBaseUrl);
const adminBaseURL = `${baseURL}/admin`;

const api = axios.create({ baseURL });
const adminApi = axios.create({ baseURL: adminBaseURL });

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

const withAuth = (client: AxiosInstance) => {
  client.interceptors.request.use((config) => {
    if (!storeRef) {
      return config;
    }

    const token = storeRef.getState().auth.accessToken;
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config ?? {};
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        originalRequest.url &&
        !String(originalRequest.url).includes('/auth/refresh') &&
        storeRef
      ) {
        originalRequest._retry = true;
        const refreshToken = storeRef.getState().auth.refreshToken;
        if (refreshToken) {
          try {
            const { data } = await adminApi.post<AuthResponse>('/auth/refresh', { refreshToken });
            refreshListener?.(data);
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return client(originalRequest);
          } catch (refreshError) {
            logoutListener?.();
          }
        }
      }
      return Promise.reject(error);
    }
  );
};

withAuth(api);
withAuth(adminApi);

export { api, adminApi };
