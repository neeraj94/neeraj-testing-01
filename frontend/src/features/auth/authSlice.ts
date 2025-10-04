import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/http';
import type { AuthResponse, UserSummary } from '../../types/auth';

interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  refreshToken: string | null;
  roles: string[];
  permissions: string[];
  status: 'idle' | 'loading' | 'failed';
  error?: string;
}

const refreshTokenKey = 'rbac.refreshToken';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: localStorage.getItem(refreshTokenKey),
  roles: [],
  permissions: [],
  status: 'idle'
};

export const login = createAsyncThunk<AuthResponse, { email: string; password: string }>(
  'auth/login',
  async (credentials) => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  }
);

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
      state.roles = [];
      state.refreshToken = null;
      localStorage.removeItem(refreshTokenKey);
    },
    tokensRefreshed(state, action: PayloadAction<AuthResponse>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem(refreshTokenKey, action.payload.refreshToken);
      if (action.payload.user) {
        state.user = action.payload.user;
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
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
        localStorage.setItem(refreshTokenKey, action.payload.refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
        localStorage.setItem(refreshTokenKey, action.payload.refreshToken);
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.roles = action.payload.roles;
        state.permissions = action.payload.permissions;
      });
  }
});

export const { logout, tokensRefreshed } = authSlice.actions;
export default authSlice.reducer;
