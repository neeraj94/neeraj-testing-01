import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/http';
import { extractErrorMessage } from '../../utils/errors';
import { normalizeHexColor } from '../../utils/colors';
import type {
  SettingUpdatePayload,
  SettingsCategory,
  SettingsResponse,
  SettingsThemeResponse
} from '../../types/settings';
import { login, logout, signup, tokensRefreshed } from '../auth/authSlice';

const PRIMARY_COLOR_CODE = 'appearance.primary_color';

interface SettingsState {
  categories: SettingsCategory[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
  theme: {
    primaryColor: string;
  };
}

const initialState: SettingsState = {
  categories: [],
  status: 'idle',
  theme: {
    primaryColor: '#2563EB'
  }
};

export const fetchTheme = createAsyncThunk<SettingsThemeResponse>('settings/theme', async () => {
  const { data } = await api.get<SettingsThemeResponse>('/settings/theme');
  return data;
});

export const fetchSettings = createAsyncThunk<SettingsResponse, void, { rejectValue: string }>(
  'settings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<SettingsResponse>('/settings');
      return data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Unable to load settings.'));
    }
  }
);

export const updateSettings = createAsyncThunk<SettingsResponse, SettingUpdatePayload[], { rejectValue: string }>(
  'settings/update',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.patch<SettingsResponse>('/settings', { updates: payload });
      return data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Unable to update settings.'));
    }
  }
);

const findPrimaryColor = (categories: SettingsCategory[]): string | undefined => {
  for (const category of categories) {
    for (const section of category.sections) {
      for (const setting of section.settings) {
        if (setting.code === PRIMARY_COLOR_CODE) {
          return setting.value ?? undefined;
        }
      }
    }
  }
  return undefined;
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTheme.fulfilled, (state, action) => {
        state.theme.primaryColor = normalizeHexColor(action.payload.primaryColor);
      })
      .addCase(fetchSettings.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.categories = action.payload.categories;
        state.error = undefined;
        const color = findPrimaryColor(action.payload.categories);
        if (color) {
          state.theme.primaryColor = normalizeHexColor(color);
        }
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Unable to load settings.';
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.categories = action.payload.categories;
        const color = findPrimaryColor(action.payload.categories);
        if (color) {
          state.theme.primaryColor = normalizeHexColor(color);
        }
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message ?? 'Unable to update settings.';
      })
      .addCase(login.fulfilled, (state, action) => {
        if (action.payload.theme) {
          state.theme.primaryColor = normalizeHexColor(action.payload.theme.primaryColor);
        }
      })
      .addCase(signup.fulfilled, (state, action) => {
        if (action.payload.theme) {
          state.theme.primaryColor = normalizeHexColor(action.payload.theme.primaryColor);
        }
      })
      .addCase(tokensRefreshed, (state, action) => {
        if (action.payload.theme) {
          state.theme.primaryColor = normalizeHexColor(action.payload.theme.primaryColor);
        }
      })
      .addCase(logout, (state) => {
        state.categories = [];
        state.status = 'idle';
        state.error = undefined;
        state.theme.primaryColor = '#2563EB';
      });
  }
});

export default settingsSlice.reducer;
export type { SettingsState };
