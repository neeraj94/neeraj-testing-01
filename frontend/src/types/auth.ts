export type PermissionKey =
  | 'USER_VIEW'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'ROLE_VIEW'
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'ROLE_DELETE'
  | 'PERMISSION_VIEW'
  | 'PERMISSION_CREATE'
  | 'PERMISSION_UPDATE'
  | 'PERMISSION_DELETE'
  | 'CUSTOMER_VIEW'
  | 'CUSTOMER_CREATE'
  | 'CUSTOMER_UPDATE'
  | 'CUSTOMER_DELETE'
  | 'INVOICE_VIEW'
  | 'INVOICE_CREATE'
  | 'INVOICE_UPDATE'
  | 'INVOICE_DELETE';

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
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
  roles: string[];
  permissions: PermissionKey[];
}
