import type { PermissionKey } from '../types/auth';

export const hasAnyPermission = (userPermissions: PermissionKey[], required: PermissionKey[]): boolean => {
  return required.some((permission) => userPermissions.includes(permission));
};

export const TAB_RULES: Record<string, PermissionKey[]> = {
  Users: ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE'],
  Roles: ['ROLE_VIEW', 'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE'],
  Permissions: ['PERMISSION_VIEW', 'PERMISSION_CREATE', 'PERMISSION_UPDATE', 'PERMISSION_DELETE'],
  Customers: ['CUSTOMER_VIEW', 'CUSTOMER_CREATE', 'CUSTOMER_UPDATE', 'CUSTOMER_DELETE'],
  Invoices: ['INVOICE_VIEW', 'INVOICE_CREATE', 'INVOICE_UPDATE', 'INVOICE_DELETE']
};
