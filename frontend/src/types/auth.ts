import type { SettingsThemeResponse } from './settings';

export type PermissionKey = string;

export interface RoleSummary {
  id: number;
  key: string;
  name: string;
  permissions: PermissionKey[];
}

export interface UserSummary {
  id: number;
  email: string;
  fullName: string;
  active: boolean;
  roles: string[];
  permissions: PermissionKey[];
  directPermissions: PermissionKey[];
  revokedPermissions: PermissionKey[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
  roles: string[];
  permissions: PermissionKey[];
  directPermissions: PermissionKey[];
  revokedPermissions: PermissionKey[];
  theme: SettingsThemeResponse;
}
