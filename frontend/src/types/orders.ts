import type {
  CheckoutAddress,
  CheckoutOrderLine,
  OrderLine,
  OrderSummary,
  PaymentMethod
} from './checkout';

export interface OrderListItem {
  id: number;
  orderNumber: string;
  status: string;
  customerId: number | null;
  customerName: string | null;
  customerEmail?: string | null;
  summary: OrderSummary | null;
  createdAt: string;
  lines: OrderLine[];
}

export interface OrderDetail extends OrderListItem {
  shippingAddress: CheckoutAddress | null;
  billingAddress: CheckoutAddress | null;
  paymentMethod: PaymentMethod | null;
}

export interface AdminOrderPayload {
  customerId: number;
  customerEmail?: string | null;
  customerName?: string | null;
  status?: string | null;
  shippingAddress?: Partial<CheckoutAddress> | null;
  billingAddress?: Partial<CheckoutAddress> | null;
  paymentMethod?: PaymentMethod | null;
  summary: Partial<OrderSummary> | null;
  lines: CheckoutOrderLine[];
}
