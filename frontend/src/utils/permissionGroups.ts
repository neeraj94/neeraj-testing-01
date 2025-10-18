import type { Permission } from '../types/models';

export type CapabilitySlot = 'viewOwn' | 'viewGlobal' | 'create' | 'edit' | 'delete' | 'export';

export type PermissionAudience = 'admin' | 'public';

export type PermissionOption = {
  id: number;
  key: string;
  label: string;
};

export type PermissionGroup = {
  feature: string;
  slots: Partial<Record<CapabilitySlot, PermissionOption>>;
  extras: PermissionOption[];
  category: PermissionAudience;
};

export const CAPABILITY_COLUMNS: Array<{ slot: CapabilitySlot; label: string }> = [
  { slot: 'viewOwn', label: 'View (Own)' },
  { slot: 'viewGlobal', label: 'View (Global)' },
  { slot: 'create', label: 'Create' },
  { slot: 'edit', label: 'Edit' },
  { slot: 'delete', label: 'Delete' },
  { slot: 'export', label: 'Export' }
];

export const PERMISSION_AUDIENCE_ORDER: PermissionAudience[] = ['admin', 'public'];

export const PERMISSION_AUDIENCE_HEADERS: Record<PermissionAudience, string> = {
  admin: 'Administrative Access',
  public: 'Public Access'
};

const AUDIENCE_PREFIXES: Array<{
  prefix: string;
  audience: PermissionAudience;
  displayPrefix?: string;
}> = [
  { prefix: 'CUSTOMER_', audience: 'public' },
  { prefix: 'PUBLIC_', audience: 'public' }
];

const FEATURE_KEY_OVERRIDES: Record<string, string> = {
  CART: 'CARTS',
  CARTS: 'CARTS',
  COUPON: 'COUPONS',
  COUPONS: 'COUPONS',
  ORDER: 'ORDERS',
  ORDERS: 'ORDERS',
  PAYMENT: 'PAYMENTS',
  PAYMENTS: 'PAYMENTS',
  CHECKOUT: 'CHECKOUT',
  SETUP: 'SETUP',
  SHIPPING_AREA: 'SHIPPING',
  SHIPPING_LOCATION: 'SHIPPING',
  SHIPPING: 'SHIPPING',
  UPLOADED_FILE: 'UPLOADED_FILES',
  UPLOADED_FILES: 'UPLOADED_FILES',
  PERMISSION: 'PERMISSIONS',
  PERMISSIONS: 'PERMISSIONS',
  ROLE: 'ROLES',
  ROLES: 'ROLES',
  USER: 'USERS',
  USERS: 'USERS',
  GALLERY_FILE: 'GALLERY',
  GALLERY_FILES: 'GALLERY',
  GALLERY: 'GALLERY',
  PRODUCT: 'PRODUCTS',
  PRODUCTS: 'PRODUCTS',
  ATTRIBUTE: 'ATTRIBUTES',
  ATTRIBUTES: 'ATTRIBUTES',
  BADGE: 'BADGES',
  BADGES: 'BADGES',
  BADGE_CATEGORY: 'BADGE_CATEGORIES',
  BADGE_CATEGORIES: 'BADGE_CATEGORIES',
  BLOG_CATEGORY: 'BLOG_CATEGORIES',
  BLOG_CATEGORIES: 'BLOG_CATEGORIES',
  BLOG_POST: 'BLOG_POSTS',
  BLOG_POSTS: 'BLOG_POSTS',
  BRAND: 'BRANDS',
  BRANDS: 'BRANDS',
  TAX_RATE: 'TAX_RATES',
  TAX_RATES: 'TAX_RATES'
};

const FEATURE_LABEL_OVERRIDES: Record<string, string> = {
  ACTIVITY: 'Activity Log',
  ACTIVITY_LOG: 'Activity Log',
  ATTRIBUTES: 'Attributes',
  BADGES: 'Badges',
  BADGE_CATEGORIES: 'Badge Categories',
  BLOG_CATEGORIES: 'Blog Categories',
  BLOG_POSTS: 'Blog Posts',
  BRANDS: 'Brands',
  CARTS: 'Carts',
  CHECKOUT: 'Checkout',
  COUPONS: 'Coupons',
  ORDERS: 'Orders',
  PAYMENTS: 'Payments',
  PERMISSIONS: 'Permissions',
  PRODUCTS: 'Products',
  PRODUCT_REVIEW: 'Product Reviews',
  ROLES: 'Roles',
  SETTINGS: 'Settings',
  SETUP: 'Setup',
  SHIPPING: 'Shipping',
  TAX_RATES: 'Tax Rates',
  GALLERY: 'Gallery',
  USERS: 'Users',
  UPLOADED_FILES: 'Uploaded Files'
};

const ADMIN_FEATURE_ORDER = [
  'Activity Log',
  'Attributes',
  'Badge Categories',
  'Badges',
  'Blog Categories',
  'Blog Posts',
  'Brands',
  'Carts',
  'Categories',
  'Coupons',
  'Orders',
  'Payments',
  'Permissions',
  'Product Reviews',
  'Products',
  'Roles',
  'Settings',
  'Setup',
  'Shipping',
  'Tax Rates',
  'Users',
  'Gallery',
  'Uploaded Files'
] as const;

const ADMIN_FEATURE_PRIORITY = new Map<string, number>(
  ADMIN_FEATURE_ORDER.map((feature, index) => [feature.toLowerCase(), index])
);

const DEFAULT_MANAGE_SLOTS: CapabilitySlot[] = ['create', 'edit', 'delete'];

const MANAGE_SLOT_OVERRIDES: Record<string, CapabilitySlot[]> = {
  CARTS: ['create', 'edit', 'delete'],
  CHECKOUT: ['viewGlobal', 'create', 'edit', 'delete'],
  COUPONS: ['viewGlobal', 'create', 'edit', 'delete'],
  ORDERS: ['viewGlobal', 'create', 'edit', 'delete'],
  PAYMENTS: ['viewGlobal', 'create', 'edit', 'delete'],
  SETUP: ['viewGlobal', 'create', 'edit', 'delete'],
  SHIPPING: ['viewGlobal', 'create', 'edit', 'delete'],
  UPLOADED_FILES: ['viewGlobal', 'create', 'edit', 'delete']
};

const CAPABILITY_PATTERNS: Array<{ slot: CapabilitySlot; regex: RegExp }> = [
  { slot: 'viewGlobal', regex: /_VIEW_GLOBAL$/i },
  { slot: 'viewGlobal', regex: /_VIEW_ALL$/i },
  { slot: 'viewGlobal', regex: /_VIEW$/i },
  { slot: 'viewOwn', regex: /_VIEW_OWN$/i },
  { slot: 'create', regex: /_CREATE$/i },
  { slot: 'edit', regex: /_EDIT$/i },
  { slot: 'edit', regex: /_UPDATE$/i },
  { slot: 'delete', regex: /_DELETE$/i },
  { slot: 'export', regex: /_EXPORT$/i }
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
  if (/_MANAGE$/i.test(key)) {
    return key.replace(/_MANAGE$/i, '');
  }
  if (/_ASSIGN$/i.test(key)) {
    return key.replace(/_ASSIGN$/i, '');
  }
  return key;
};

const parsePermissionName = (permission: Permission) => {
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

  return null;
};

const determineAudience = (keyUpper: string) => {
  for (const entry of AUDIENCE_PREFIXES) {
    if (keyUpper.startsWith(entry.prefix)) {
      return {
        audience: entry.audience,
        baseKey: keyUpper.substring(entry.prefix.length),
        displayPrefix: entry.displayPrefix
      };
    }
  }
  return { audience: 'admin' as PermissionAudience, baseKey: keyUpper, displayPrefix: undefined };
};

const assignSlot = (
  group: PermissionGroup,
  slot: CapabilitySlot,
  option: PermissionOption
) => {
  const existing = group.slots[slot];
  if (!existing) {
    group.slots[slot] = option;
    return true;
  }
  if (existing.id === option.id) {
    return true;
  }
  return false;
};

const addExtraOption = (extras: PermissionOption[], option: PermissionOption) => {
  if (extras.some((existing) => existing.id === option.id)) {
    return extras;
  }
  return [...extras, option];
};

export const buildPermissionGroups = (permissions: Permission[]): PermissionGroup[] => {
  const map = new Map<string, PermissionGroup>();

  permissions.forEach((permission) => {
    const keyUpper = (permission.key ?? '').toUpperCase();
    if (!keyUpper) {
      return;
    }

    const audienceInfo = determineAudience(keyUpper);
    const stripped = stripCapabilitySuffix(audienceInfo.baseKey).toUpperCase();
    const normalizedKey = FEATURE_KEY_OVERRIDES[stripped] ?? stripped;
    const mapKey = `${audienceInfo.audience}:${normalizedKey}`;

    let group = map.get(mapKey);

    const defaultLabel = FEATURE_LABEL_OVERRIDES[normalizedKey] ?? formatFeatureName(normalizedKey || audienceInfo.baseKey);
    const parsedName = parsePermissionName(permission);
    let featureLabel = parsedName?.feature ?? defaultLabel;
    if (audienceInfo.displayPrefix && !/^public\b/i.test(featureLabel)) {
      featureLabel = `${audienceInfo.displayPrefix} ${featureLabel}`;
    }

    if (!group) {
      group = { feature: featureLabel, slots: {}, extras: [], category: audienceInfo.audience };
      map.set(mapKey, group);
    } else if (!group.feature && featureLabel) {
      group.feature = featureLabel;
    }

    const optionLabel = parsedName?.label ?? permission.name?.trim() ?? toTitleCase(permission.key.replace(/_/g, ' '));
    const option: PermissionOption = {
      id: permission.id,
      key: permission.key,
      label: optionLabel
    };

    const isManage = /_MANAGE$/i.test(keyUpper);
    let matchedSlot: CapabilitySlot | null = null;

    if (!isManage) {
      for (const pattern of CAPABILITY_PATTERNS) {
        if (pattern.regex.test(permission.key)) {
          matchedSlot = pattern.slot;
          break;
        }
      }
    }

    if (isManage) {
      const slots = MANAGE_SLOT_OVERRIDES[normalizedKey] ?? DEFAULT_MANAGE_SLOTS;
      let assigned = false;
      for (const slot of slots) {
        if (assignSlot(group, slot, option)) {
          assigned = true;
        }
      }
      if (!assigned) {
        group.extras = addExtraOption(group.extras, option);
      }
    } else if (matchedSlot) {
      if (!assignSlot(group, matchedSlot, option)) {
        group.extras = addExtraOption(group.extras, option);
      }
    } else {
      group.extras = addExtraOption(group.extras, option);
    }
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      extras: [...group.extras].sort((a, b) => a.label.localeCompare(b.label))
    }))
    .sort((a, b) => {
      const audienceComparison =
        PERMISSION_AUDIENCE_ORDER.indexOf(a.category) - PERMISSION_AUDIENCE_ORDER.indexOf(b.category);
      if (audienceComparison !== 0) {
        return audienceComparison;
      }

      if (a.category === 'admin' && b.category === 'admin') {
        const aPriority = ADMIN_FEATURE_PRIORITY.get(a.feature.toLowerCase());
        const bPriority = ADMIN_FEATURE_PRIORITY.get(b.feature.toLowerCase());
        if (aPriority != null || bPriority != null) {
          if (aPriority == null) {
            return 1;
          }
          if (bPriority == null) {
            return -1;
          }
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
        }
      }

      return a.feature.localeCompare(b.feature);
    });
};
