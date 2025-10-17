import type { CheckoutAddress, OrderLine, OrderSummary, PaymentMethod } from './checkout';

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
  paymentMethodKey?: string | null;
  paymentMethodName?: string | null;
  couponCode?: string | null;
}

export interface OrderDetail extends OrderListItem {
  shippingAddress: CheckoutAddress | null;
  billingAddress: CheckoutAddress | null;
  paymentMethod: PaymentMethod | null;
}
