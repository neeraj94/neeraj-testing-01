import axios from 'axios';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/http';
import type { AuthResponse, UserSummary } from '../../types/auth';
import { safeLocalStorage } from '../../utils/storage';

interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  refreshToken: string | null;
  roles: string[];
  permissions: string[];
  directPermissions: string[];
  revokedPermissions: string[];
  status: 'idle' | 'loading' | 'failed';
  error?: string;
}

const refreshTokenKey = 'rbac.refreshToken';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: safeLocalStorage.getItem(refreshTokenKey),
  roles: [],
  permissions: [],
  directPermissions: [],
  revokedPermissions: [],
  status: 'idle'
};

export const login = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data === 'object' && error.response?.data !== null
          ? (error.response?.data as { message?: string; error?: string }).message ??
            (error.response?.data as { message?: string; error?: string }).error
          : undefined;
      return rejectWithValue(message ?? 'Invalid email or password. Please try again.');
    }
    return rejectWithValue('Unable to sign in right now. Please try again later.');
  }
});

export const signup = createAsyncThunk<AuthResponse, { email: string; password: string; fullName: string }>(
  'auth/signup',
  async (payload) => {
    const { data } = await api.post<AuthResponse>('/auth/signup', payload);
    return data;
  }
);

export const loadCurrentUser = createAsyncThunk<UserSummary>('auth/me', async () => {
  const { data } = await api.get<UserSummary>('/auth/me');
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
      state.status = 'idle';
      state.error = undefined;
      safeLocalStorage.removeItem(refreshTokenKey);
    },
    tokensRefreshed(state, action: PayloadAction<AuthResponse>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      safeLocalStorage.setItem(refreshTokenKey, action.payload.refreshToken);
      if (action.payload.user) {
        state.user = action.payload.user;
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
        state.directPermissions = action.payload.directPermissions;
        state.revokedPermissions = action.payload.revokedPermissions;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'idle';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
        state.directPermissions = action.payload.directPermissions;
        state.revokedPermissions = action.payload.revokedPermissions;
        safeLocalStorage.setItem(refreshTokenKey, action.payload.refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Unable to sign in.';
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
        state.directPermissions = action.payload.directPermissions;
        state.revokedPermissions = action.payload.revokedPermissions;
        safeLocalStorage.setItem(refreshTokenKey, action.payload.refreshToken);
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
