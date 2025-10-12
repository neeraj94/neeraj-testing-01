import type { NavigationNode } from '../types/navigation';

export const DEFAULT_NAVIGATION_MENU: NavigationNode[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    path: '/admin/dashboard',
    group: false,
    permissions: [],
    children: []
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: '⚡',
    path: undefined,
    group: true,
    permissions: [],
    children: [
      {
        key: 'invoices',
        label: 'Invoices',
        icon: '📄',
        path: '/admin/invoices',
        group: false,
        permissions: [
          'INVOICE_VIEW',
          'INVOICE_VIEW_GLOBAL',
          'INVOICE_VIEW_OWN',
          'INVOICE_CREATE',
          'INVOICE_UPDATE',
          'INVOICE_DELETE'
        ],
        children: []
      }
    ]
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: '💰',
    path: undefined,
    group: true,
    permissions: [],
    children: [
      {
        key: 'taxRates',
        label: 'Tax rates',
        icon: '🧾',
        path: '/admin/finance/tax-rates',
        group: false,
        permissions: ['TAX_RATE_VIEW'],
        children: []
      }
    ]
  },
  {
    key: 'access',
    label: 'Access Control',
    icon: '🔐',
    path: undefined,
    group: true,
    permissions: [],
    children: [
      {
        key: 'users',
        label: 'Users',
        icon: '👥',
        path: '/admin/users',
        group: false,
        permissions: [
          'USER_VIEW',
          'USER_VIEW_GLOBAL',
          'USER_VIEW_OWN',
          'USER_CREATE',
          'USER_UPDATE',
          'USER_DELETE'
        ],
        children: []
      },
      {
        key: 'roles',
        label: 'Roles',
        icon: '🧩',
        path: '/admin/roles',
        group: false,
        permissions: ['ROLE_VIEW', 'ROLE_VIEW_GLOBAL', 'ROLE_VIEW_OWN'],
        children: []
      },
      {
        key: 'permissions',
        label: 'Permissions',
        icon: '🛡️',
        path: '/admin/permissions',
        group: false,
        permissions: ['PERMISSION_VIEW'],
        children: []
      }
    ]
  },
  {
    key: 'content',
    label: 'Content',
    icon: '📰',
    path: undefined,
    group: true,
    permissions: [],
    children: [
      {
        key: 'blogCategories',
        label: 'Categories',
        icon: '🗂️',
        path: '/admin/blog/categories',
        group: false,
        permissions: ['BLOG_CATEGORY_VIEW'],
        children: []
      },
      {
        key: 'blogPosts',
        label: 'All Posts',
        icon: '✍️',
        path: '/admin/blog/posts',
        group: false,
        permissions: ['BLOG_POST_VIEW'],
        children: []
      }
    ]
  },
  {
    key: 'assets',
    label: 'Assets',
    icon: '🖼️',
    path: undefined,
    group: true,
    permissions: [],
    children: [
      {
        key: 'uploadedFiles',
        label: 'Uploaded files',
        icon: '📁',
        path: '/admin/assets/uploaded-files',
        group: false,
        permissions: ['UPLOADED_FILE_VIEW'],
        children: []
      }
    ]
  },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: '🛍️',
    path: undefined,
    group: true,
    permissions: [],
    children: [
      {
        key: 'categories',
        label: 'Categories',
        icon: '🗃️',
        path: '/admin/categories',
        group: false,
        permissions: ['CATEGORY_VIEW'],
        children: []
      },
      {
        key: 'badgeCategories',
        label: 'Badge categories',
        icon: '🗂️',
        path: '/admin/badge-categories',
        group: false,
        permissions: ['BADGE_CATEGORY_VIEW'],
        children: []
      },
      {
        key: 'badges',
        label: 'Badges',
        icon: '🏅',
        path: '/admin/badges',
        group: false,
        permissions: ['BADGE_VIEW'],
        children: []
      },
      {
        key: 'attributes',
        label: 'Attributes',
        icon: '🎛️',
        path: '/admin/attributes',
        group: false,
        permissions: ['ATTRIBUTE_VIEW'],
        children: []
      },
      {
        key: 'brands',
        label: 'Brands',
        icon: '🏷️',
        path: '/admin/brands',
        group: false,
        permissions: ['BRAND_VIEW'],
        children: []
      }
    ]
  },
  {
    key: 'shipping',
    label: 'Shipping',
    icon: '🚚',
    path: undefined,
    group: true,
    permissions: [],
    children: [
      {
        key: 'areaShipping',
        label: 'Area-wise shipping',
        icon: '🗺️',
        path: '/admin/shipping/area',
        group: false,
        permissions: ['SHIPPING_AREA_VIEW'],
        children: []
      }
    ]
  },
  {
    key: 'activity',
    label: 'Activity',
    icon: '📝',
    path: '/admin/activity',
    group: false,
    permissions: ['ACTIVITY_VIEW'],
    children: []
  },
  {
    key: 'gallery',
    label: 'Gallery',
    icon: '🖼️',
    path: '/admin/gallery',
    group: false,
    permissions: ['GALLERY_VIEW_ALL', 'GALLERY_VIEW_OWN', 'GALLERY_CREATE'],
    children: []
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙️',
    path: '/admin/settings',
    group: false,
    permissions: ['SETTINGS_VIEW'],
    children: []
  },
  {
    key: 'setup',
    label: 'Setup',
    icon: '🧭',
    path: '/admin/setup',
    group: false,
    permissions: ['SETUP_MANAGE'],
    children: []
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: '👤',
    path: '/admin/profile',
    group: false,
    permissions: [],
    children: []
  }
];
