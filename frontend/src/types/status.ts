import type { Pagination } from './models';

export type StatusTypeKey = 'ORDER' | 'PAYMENT';

export interface StatusSummary {
  id: number;
  type: StatusTypeKey;
  name: string;
  code: string;
  icon?: string | null;
  colorHex?: string | null;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  visibleToCustomer?: boolean | null;
  sortOrder: number;
}

export interface StatusDetail extends StatusSummary {
  allowedTransitionIds: number[];
}

export type StatusPage = Pagination<StatusSummary>;

export interface StatusRequestPayload {
  type: StatusTypeKey;
  name: string;
  code: string;
  icon?: string | null;
  colorHex?: string | null;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  visibleToCustomer?: boolean | null;
  allowedTransitionIds?: number[];
}

export interface StatusPatchPayload {
  isActive?: boolean;
  isDefault?: boolean;
}

export interface StatusReorderPayload {
  type: StatusTypeKey;
  ids: number[];
}

export interface StatusTransitionPayload {
  toStatusIds: number[];
}
