import type { PermissionKey } from '../types/auth';

const normalizeKey = (permission: PermissionKey | null | undefined): string => {
  if (typeof permission !== 'string') {
    return '';
  }
  return permission.trim().toUpperCase();
};

const normalizeViewPermission = (permission: string): string => {
  if (/_VIEW_(OWN|GLOBAL)$/.test(permission)) {
    return permission.replace(/_(OWN|GLOBAL)$/, '');
  }
  return permission;
};

const extractManageVariants = (permission: string): string[] => {
  const variants = new Set<string>();
  const manageableSuffixes = [
    '_MANAGE_ALL',
    '_MANAGE',
    '_VIEW_GLOBAL',
    '_VIEW_OWN',
    '_VIEW',
    '_CREATE',
    '_UPDATE',
    '_EDIT',
    '_DELETE'
  ];

  for (const suffix of manageableSuffixes) {
    if (permission.endsWith(suffix)) {
      const base = permission.slice(0, -suffix.length);
      if (base) {
        if (suffix !== '_MANAGE_ALL') {
          variants.add(`${base}_MANAGE_ALL`);
        }
        if (suffix !== '_MANAGE') {
          variants.add(`${base}_MANAGE`);
        }
        variants.add(base);
      }
      break;
    }
  }

  if (permission.endsWith('_MANAGE')) {
    const base = permission.slice(0, -'_MANAGE'.length);
    if (base) {
      variants.add(`${base}_MANAGE_ALL`);
    }
  }

  if (permission.endsWith('_MANAGE_ALL')) {
    const base = permission.slice(0, -'_MANAGE_ALL'.length);
    if (base) {
      variants.add(`${base}_MANAGE`);
    }
  }

  return Array.from(variants);
};

const expandCandidates = (permission: string): string[] => {
  if (!permission) {
    return [];
  }
  const candidates = new Set<string>();
  candidates.add(permission);

  if (permission.endsWith('_EDIT')) {
    candidates.add(permission.replace(/_EDIT$/, '_UPDATE'));
  } else if (permission.endsWith('_UPDATE')) {
    candidates.add(permission.replace(/_UPDATE$/, '_EDIT'));
  }

  if (/_VIEW_(OWN|GLOBAL)$/.test(permission)) {
    const base = permission.replace(/_(OWN|GLOBAL)$/, '');
    candidates.add(base);
    candidates.add(base.replace(/_VIEW$/, ''));
  } else if (permission.endsWith('_VIEW')) {
    const base = permission.replace(/_VIEW$/, '');
    candidates.add(`${base}_VIEW_GLOBAL`);
    candidates.add(`${base}_VIEW_OWN`);
    candidates.add(base);
  }

  extractManageVariants(permission).forEach((variant) => candidates.add(variant));

  return Array.from(candidates);
};

export const hasAnyPermission = (userPermissions: PermissionKey[], required: PermissionKey[]): boolean => {
  if (!userPermissions?.length || !required?.length) {
    return false;
  }

  const normalizedUserPermissions = new Set(
    userPermissions.map((permission) => normalizeKey(permission)).filter((permission) => permission.length > 0)
  );

  const matchesUser = (candidate: string): boolean => {
    if (!candidate) {
      return false;
    }
    if (normalizedUserPermissions.has(candidate)) {
      return true;
    }

    if (candidate.endsWith('_VIEW')) {
      const base = normalizeViewPermission(candidate);
      if (normalizedUserPermissions.has(base)) {
        return true;
      }
    }

    if (/_VIEW_(OWN|GLOBAL)$/.test(candidate)) {
      const base = normalizeViewPermission(candidate);
      if (normalizedUserPermissions.has(base)) {
        return true;
      }
    }

    return extractManageVariants(candidate).some((variant) => normalizedUserPermissions.has(variant));
  };

  return required.some((permission) => {
    const normalized = normalizeKey(permission);
    if (!normalized) {
      return false;
    }

    return expandCandidates(normalized).some((candidate) => matchesUser(candidate));
  });
};
