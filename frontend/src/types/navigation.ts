import type { PermissionKey } from './auth';

export interface NavigationNode {
  key: string;
  label: string;
  icon?: string | null;
  path?: string | null;
  group: boolean;
  permissions: PermissionKey[];
  children: NavigationNode[];
}

export interface NavigationResponse {
  menu: NavigationNode[];
  defaults: NavigationNode[];
}

export interface SetupLayoutResponse {
  layout: NavigationNode[];
  defaults: NavigationNode[];
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface MenuLayoutConfigNode {
  key: string;
  children?: MenuLayoutConfigNode[];
}

export interface MenuLayoutUpdatePayload {
  layout: MenuLayoutConfigNode[];
}
