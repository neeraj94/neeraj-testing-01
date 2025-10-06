import type { RootState } from '../../app/store';

export const selectSettingsCategories = (state: RootState) => state.settings.categories;
export const selectSettingsStatus = (state: RootState) => state.settings.status;
export const selectSettingsError = (state: RootState) => state.settings.error;
export const selectPrimaryColor = (state: RootState) => state.settings.theme.primaryColor;
export const selectApplicationName = (state: RootState) => state.settings.theme.applicationName;
