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
  active: boolean;
  roles: string[];
  permissions: PermissionKey[];
  directPermissions: PermissionKey[];
  revokedPermissions: PermissionKey[];
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
