export type SettingValueType = 'STRING' | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'COLOR';

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingItem {
  id: number;
  code: string;
  label: string;
  description?: string;
  value: string | null;
  valueType: SettingValueType;
  editable: boolean;
  options: SettingOption[];
}

export interface SettingsSection {
  key: string;
  label: string;
  description?: string;
  settings: SettingItem[];
}

export interface SettingsCategory {
  key: string;
  label: string;
  description?: string;
  sections: SettingsSection[];
}

export interface SettingsResponse {
  categories: SettingsCategory[];
}

export interface SettingsThemeResponse {
  primaryColor: string;
}

export interface SettingUpdatePayload {
  code: string;
  value: string | null;
}
