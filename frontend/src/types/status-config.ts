export type StatusCategory = 'ORDER';

export interface StatusConfig {
  id: number;
  name: string;
  category: StatusCategory;
  colorCode: string;
  icon?: string | null;
  description?: string | null;
  isDefault: boolean;
  active: boolean;
  createdBy?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusConfigPayload {
  name: string;
  category: StatusCategory;
  colorCode: string;
  icon?: string | null;
  description?: string | null;
  isDefault: boolean;
  active: boolean;
}

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  ORDER: 'Order Status'
};
