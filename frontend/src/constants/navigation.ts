import type { NavigationNode } from '../types/navigation';

export const DEFAULT_NAVIGATION_MENU: NavigationNode[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    path: '/dashboard',
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
        path: '/invoices',
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
        path: '/users',
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
        path: '/roles',
        group: false,
        permissions: ['ROLE_VIEW', 'ROLE_VIEW_GLOBAL', 'ROLE_VIEW_OWN'],
        children: []
      },
      {
        key: 'permissions',
        label: 'Permissions',
        icon: '🛡️',
        path: '/permissions',
        group: false,
        permissions: ['PERMISSION_VIEW'],
        children: []
      }
    ]
  },
  {
    key: 'activity',
    label: 'Activity',
    icon: '📝',
    path: '/activity',
    group: false,
    permissions: ['ACTIVITY_VIEW'],
    children: []
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙️',
    path: '/settings',
    group: false,
    permissions: ['SETTINGS_VIEW'],
    children: []
  },
  {
    key: 'setup',
    label: 'Setup',
    icon: '🧭',
    path: '/setup',
    group: false,
    permissions: ['SETUP_MANAGE'],
    children: []
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: '👤',
    path: '/profile',
    group: false,
    permissions: [],
    children: []
  }
];
