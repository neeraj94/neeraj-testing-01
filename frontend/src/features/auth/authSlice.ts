import axios from 'axios';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { adminApi, api } from '../../services/http';
import type { AuthResponse, SignupResponse, UserSummary } from '../../types/auth';
import { safeLocalStorage } from '../../utils/storage';
import type { RootState } from '../../app/store';

export type Portal = 'admin' | 'client';

interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  refreshToken: string | null;
  roles: string[];
  permissions: string[];
  directPermissions: string[];
  revokedPermissions: string[];
  status: 'idle' | 'loading' | 'failed';
  portal: Portal | null;
  error?: string;
}

const refreshTokenKey = 'rbac.refreshToken';
const portalStorageKey = 'rbac.portal';

const parsePortal = (value: string | null): Portal | null => {
  if (value === 'admin' || value === 'client') {
    return value;
  }
  return null;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: safeLocalStorage.getItem(refreshTokenKey),
  roles: [],
  permissions: [],
  directPermissions: [],
  revokedPermissions: [],
  status: 'idle',
  portal: parsePortal(safeLocalStorage.getItem(portalStorageKey))
};

const applyAuthPayload = (state: AuthState, payload: AuthResponse, portal: Portal) => {
  state.user = payload.user;
  state.accessToken = payload.accessToken;
  state.refreshToken = payload.refreshToken;
  state.roles = payload.roles;
  state.permissions = payload.permissions;
  state.directPermissions = payload.directPermissions;
  state.revokedPermissions = payload.revokedPermissions;
  state.portal = portal;
  safeLocalStorage.setItem(refreshTokenKey, payload.refreshToken);
  safeLocalStorage.setItem(portalStorageKey, portal);
};

const extractErrorMessage = (error: unknown): string | undefined => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'object' && data !== null) {
      const payload = data as { message?: string; error?: string };
      return payload.message ?? payload.error;
    }
  }
  return undefined;
};

export const adminLogin = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: string }
>('auth/adminLogin', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await adminApi.post<AuthResponse>('/auth/login', credentials);
    return data;
  } catch (error) {
    const message = extractErrorMessage(error);
    return rejectWithValue(message ?? 'Invalid email or password. Please try again.');
  }
});

export const customerLogin = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: string }
>('auth/customerLogin', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  } catch (error) {
    const message = extractErrorMessage(error);
    return rejectWithValue(message ?? 'Invalid email or password. Please try again.');
  }
});

export const signup = createAsyncThunk<
  SignupResponse,
  { email: string; password: string; firstName: string; lastName: string },
  { rejectValue: string }
>('auth/signup', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<SignupResponse>('/auth/signup', payload);
    return data;
  } catch (error) {
    const message = extractErrorMessage(error);
    return rejectWithValue(message ?? 'Unable to create your account. Please try again.');
  }
});

export const loadCurrentUser = createAsyncThunk<
  UserSummary,
  void,
  { state: RootState }
>('auth/me', async (_, { getState }) => {
  const state = getState();
  const resolvedPortal =
    state.auth.portal ?? parsePortal(safeLocalStorage.getItem(portalStorageKey)) ?? 'client';
  const client = resolvedPortal === 'client' ? api : adminApi;
  const { data } = await client.get<UserSummary>('/auth/me');
  return data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.permissions = [];
      state.directPermissions = [];
      state.revokedPermissions = [];
      state.roles = [];
      state.refreshToken = null;
      state.portal = null;
      state.status = 'idle';
      state.error = undefined;
      safeLocalStorage.removeItem(refreshTokenKey);
      safeLocalStorage.removeItem(portalStorageKey);
    },
    tokensRefreshed(state, action: PayloadAction<{ auth: AuthResponse; portal: Portal }>) {
      applyAuthPayload(state, action.payload.auth, action.payload.portal);
      state.status = 'idle';
      state.error = undefined;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(adminLogin.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.status = 'idle';
        state.error = undefined;
        applyAuthPayload(state, action.payload, 'admin');
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Unable to sign in.';
      })
      .addCase(customerLogin.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(customerLogin.fulfilled, (state, action) => {
        state.status = 'idle';
        state.error = undefined;
        applyAuthPayload(state, action.payload, 'client');
      })
      .addCase(customerLogin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Unable to sign in.';
      })
      .addCase(signup.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.status = 'idle';
        state.error = undefined;
        if (action.payload.verificationRequired) {
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.permissions = [];
          state.directPermissions = [];
          state.revokedPermissions = [];
          state.roles = [];
          state.portal = null;
          safeLocalStorage.removeItem(refreshTokenKey);
          safeLocalStorage.removeItem(portalStorageKey);
        }
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Unable to create your account.';
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
        state.directPermissions = action.payload.directPermissions;
        state.revokedPermissions = action.payload.revokedPermissions;
      });
  }
});

export const { logout, tokensRefreshed } = authSlice.actions;
export default authSlice.reducer;
