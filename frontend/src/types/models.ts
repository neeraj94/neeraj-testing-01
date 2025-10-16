import { PermissionKey } from './auth';

export interface Pagination<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface User extends Record<string, unknown> {
  id: number;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
  skypeId?: string | null;
  emailSignature?: string | null;
  emailVerifiedAt?: string | null;
  loginAttempts: number;
  lockedAt?: string | null;
  active: boolean;
  roles: string[];
  permissions: PermissionKey[];
  directPermissions: PermissionKey[];
  revokedPermissions: PermissionKey[];
}

export interface UserRecentProduct {
  productId: number;
  productName: string;
  productSlug: string;
  thumbnailUrl?: string | null;
  sku?: string | null;
  lastViewedAt: string;
  unitPrice?: number | null;
  finalPrice?: number | null;
}

export interface UserSummaryMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  customerUsers: number;
  internalUsers: number;
}

export interface Role {
  id: number;
  key: string;
  name: string;
  permissions: PermissionKey[];
}

export interface Permission {
  id: number;
  key: string;
  name: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  profileImageUrl?: string | null;
}

export interface InvoiceItem {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: number;
  customerId: number;
  customerName: string;
  number: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID';
  subtotal: number;
  tax: number;
  total: number;
  items: InvoiceItem[];
}

export interface ActivityLogEntry {
  id: number;
  occurredAt: string;
  userId?: number | null;
  userName: string;
  userRole?: string | null;
  department?: string | null;
  module?: string | null;
  activityType: string;
  description?: string | null;
  status?: string | null;
  ipAddress?: string | null;
  device?: string | null;
}

export interface ActivityLogDetail extends ActivityLogEntry {
  context?: Record<string, unknown> | null;
  rawContext?: string | null;
}

export interface ActivityFilterOptions {
  activityTypes: string[];
  modules: string[];
  statuses: string[];
  roles: string[];
  departments: string[];
  ipAddresses: string[];
  devices: string[];
}
