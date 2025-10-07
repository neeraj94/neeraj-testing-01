import type { PermissionKey } from '../types/auth';

const normalizeViewPermission = (permission: PermissionKey) => {
  if (/_VIEW_(OWN|GLOBAL)$/i.test(permission)) {
    return permission.replace(/_(OWN|GLOBAL)$/i, '');
  }
  return permission;
};

export const hasAnyPermission = (userPermissions: PermissionKey[], required: PermissionKey[]): boolean => {
  if (!userPermissions?.length || !required?.length) {
    return false;
  }

  const userSet = new Set(userPermissions);
  return required.some((permission) => {
    if (userSet.has(permission)) {
      return true;
    }

    if (/_VIEW$/i.test(permission)) {
      const normalized = normalizeViewPermission(permission);
      for (const userPermission of userSet) {
        if (normalizeViewPermission(userPermission) === normalized) {
          return true;
        }
      }
    }

    return false;
  });
};
