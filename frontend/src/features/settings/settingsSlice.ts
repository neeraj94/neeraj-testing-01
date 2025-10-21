import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { adminApi, api } from '../../services/http';
import { extractErrorMessage } from '../../utils/errors';
import { normalizeHexColor } from '../../utils/colors';
import type {
  SettingUpdatePayload,
  SettingsCategory,
  SettingsResponse,
  SettingsThemeResponse
} from '../../types/settings';
import { adminLogin, customerLogin, logout, signup, tokensRefreshed } from '../auth/authSlice';

const PRIMARY_COLOR_CODE = 'appearance.primary_color';
const APPLICATION_NAME_CODE = 'general.site_name';
const BASE_CURRENCY_CODE = 'finance.base_currency';

interface SettingsState {
  categories: SettingsCategory[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
  theme: {
    primaryColor: string;
    applicationName: string;
    baseCurrency: string;
  };
}

const initialState: SettingsState = {
  categories: [],
  status: 'idle',
  theme: {
    primaryColor: '#2563EB',
    applicationName: 'RBAC Portal',
    baseCurrency: 'USD'
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
  const { data } = await adminApi.get<SettingsResponse>('/settings');
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
      const { data } = await adminApi.patch<SettingsResponse>('/settings', { updates: payload });
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

const findApplicationName = (categories: SettingsCategory[]): string | undefined => {
  for (const category of categories) {
    for (const section of category.sections) {
      for (const setting of section.settings) {
        if (setting.code === APPLICATION_NAME_CODE) {
          return setting.value ?? undefined;
        }
      }
    }
  }
  return undefined;
};

const findBaseCurrency = (categories: SettingsCategory[]): string | undefined => {
  for (const category of categories) {
    for (const section of category.sections) {
      for (const setting of section.settings) {
        if (setting.code === BASE_CURRENCY_CODE) {
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
        state.theme.applicationName = action.payload.applicationName || 'RBAC Portal';
        state.theme.baseCurrency = action.payload.baseCurrency || 'USD';
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
        const applicationName = findApplicationName(action.payload.categories);
        if (applicationName) {
          state.theme.applicationName = applicationName.trim() || 'RBAC Portal';
        }
        const baseCurrency = findBaseCurrency(action.payload.categories);
        if (baseCurrency) {
          state.theme.baseCurrency = baseCurrency.toUpperCase();
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
        const applicationName = findApplicationName(action.payload.categories);
        if (applicationName) {
          state.theme.applicationName = applicationName.trim() || 'RBAC Portal';
        }
        const baseCurrency = findBaseCurrency(action.payload.categories);
        if (baseCurrency) {
          state.theme.baseCurrency = baseCurrency.toUpperCase();
        }
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message ?? 'Unable to update settings.';
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        if (action.payload.theme) {
          state.theme.primaryColor = normalizeHexColor(action.payload.theme.primaryColor);
          state.theme.applicationName = action.payload.theme.applicationName || 'RBAC Portal';
          state.theme.baseCurrency = action.payload.theme.baseCurrency || 'USD';
        }
      })
      .addCase(customerLogin.fulfilled, (state, action) => {
        if (action.payload.theme) {
          state.theme.primaryColor = normalizeHexColor(action.payload.theme.primaryColor);
          state.theme.applicationName = action.payload.theme.applicationName || 'RBAC Portal';
          state.theme.baseCurrency = action.payload.theme.baseCurrency || 'USD';
        }
      })
      .addCase(signup.fulfilled, (state, action) => {
        if (action.payload.theme) {
          state.theme.primaryColor = normalizeHexColor(action.payload.theme.primaryColor);
          state.theme.applicationName = action.payload.theme.applicationName || 'RBAC Portal';
          state.theme.baseCurrency = action.payload.theme.baseCurrency || 'USD';
        }
      })
      .addCase(tokensRefreshed, (state, action) => {
        if (action.payload.auth.theme) {
          state.theme.primaryColor = normalizeHexColor(action.payload.auth.theme.primaryColor);
          state.theme.applicationName = action.payload.auth.theme.applicationName || 'RBAC Portal';
          state.theme.baseCurrency = action.payload.auth.theme.baseCurrency || 'USD';
        }
      })
      .addCase(logout, (state) => {
        state.categories = [];
        state.status = 'idle';
        state.error = undefined;
        state.theme.primaryColor = '#2563EB';
        state.theme.applicationName = 'RBAC Portal';
        state.theme.baseCurrency = 'USD';
      });
  }
});

export default settingsSlice.reducer;
export type { SettingsState };
