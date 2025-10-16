import type { OrderSummary } from './checkout';

export interface OrderListItem {
  id: number;
  orderNumber: string;
  customerId: number | null;
  customerName: string | null;
  summary: OrderSummary | null;
  createdAt: string;
}
