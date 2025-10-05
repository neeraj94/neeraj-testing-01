import type { Permission } from '../types/models';

export type CapabilitySlot =
  | 'viewOwn'
  | 'viewGlobal'
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'manage'
  | 'assign';

export type PermissionOption = {
  id: number;
  key: string;
  label: string;
};

export type PermissionGroup = {
  feature: string;
  slots: Partial<Record<CapabilitySlot, PermissionOption>>;
  extras: PermissionOption[];
};

export const CAPABILITY_COLUMNS: Array<{ slot: CapabilitySlot; label: string }> = [
  { slot: 'viewOwn', label: 'View (Own)' },
  { slot: 'viewGlobal', label: 'View (Global)' },
  { slot: 'view', label: 'View' },
  { slot: 'create', label: 'Create' },
  { slot: 'edit', label: 'Edit' },
  { slot: 'delete', label: 'Delete' },
  { slot: 'export', label: 'Export' },
  { slot: 'manage', label: 'Manage' },
  { slot: 'assign', label: 'Assign' }
];

const CAPABILITY_PATTERNS: Array<{ slot: CapabilitySlot; regex: RegExp }> = [
  { slot: 'viewGlobal', regex: /_VIEW_GLOBAL$/i },
  { slot: 'viewOwn', regex: /_VIEW_OWN$/i },
  { slot: 'view', regex: /_VIEW$/i },
  { slot: 'create', regex: /_CREATE$/i },
  { slot: 'edit', regex: /_EDIT$/i },
  { slot: 'edit', regex: /_UPDATE$/i },
  { slot: 'delete', regex: /_DELETE$/i },
  { slot: 'export', regex: /_EXPORT$/i },
  { slot: 'manage', regex: /_MANAGE$/i },
  { slot: 'assign', regex: /_ASSIGN$/i }
];

const toTitleCase = (value: string) =>
  value
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase());

const formatFeatureName = (value: string) =>
  value
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((segment) => (segment.length <= 3 ? segment.toUpperCase() : segment.charAt(0).toUpperCase() + segment.substring(1).toLowerCase()))
    .join(' ');

const stripCapabilitySuffix = (key: string) => {
  for (const pattern of CAPABILITY_PATTERNS) {
    if (pattern.regex.test(key)) {
      return key.replace(pattern.regex, '');
    }
  }
  return key;
};

const parsePermissionLabel = (permission: Permission) => {
  const name = permission.name?.trim() ?? '';
  const separators = [':', ' - ', ' – ', ' — ', '|'];

  for (const separator of separators) {
    if (name.includes(separator)) {
      const [featureRaw, ...rest] = name.split(separator);
      const feature = formatFeatureName(featureRaw);
      const label = rest.join(separator).trim();
      if (feature && label) {
        return { feature, label: label || permission.key };
      }
    }
  }

  if (name) {
    const words = name.split(/\s+/g).filter(Boolean);
    if (words.length > 1) {
      const verbs = new Set(['view', 'create', 'update', 'edit', 'delete', 'manage', 'assign', 'export']);
      const [first, ...rest] = words;
      if (verbs.has(first.toLowerCase())) {
        return { feature: formatFeatureName(rest.join(' ')), label: name };
      }
    }
    return { feature: formatFeatureName(name), label: name };
  }

  const baseKey = stripCapabilitySuffix(permission.key);
  const feature = formatFeatureName(baseKey || permission.key);
  const label = permission.name?.trim() ?? toTitleCase(permission.key.replace(/_/g, ' '));
  return { feature, label };
};

export const buildPermissionGroups = (permissions: Permission[]): PermissionGroup[] => {
  const map = new Map<string, PermissionGroup>();

  permissions.forEach((permission) => {
    const { feature, label } = parsePermissionLabel(permission);
    const key = feature || 'General';
    const existing = map.get(key);
    const entry: PermissionGroup = existing ?? { feature: key, slots: {}, extras: [] };

    let matchedSlot: CapabilitySlot | null = null;
    for (const pattern of CAPABILITY_PATTERNS) {
      if (pattern.regex.test(permission.key)) {
        matchedSlot = pattern.slot;
        break;
      }
    }

    const option: PermissionOption = {
      id: permission.id,
      key: permission.key,
      label: label || permission.name || permission.key
    };

    if (matchedSlot) {
      if (!entry.slots[matchedSlot]) {
        entry.slots[matchedSlot] = option;
      } else {
        entry.extras.push(option);
      }
    } else {
      entry.extras.push(option);
    }

    map.set(key, entry);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      extras: group.extras.sort((a, b) => a.label.localeCompare(b.label))
    }))
    .sort((a, b) => a.feature.localeCompare(b.feature));
};
