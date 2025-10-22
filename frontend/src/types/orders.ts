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
  paymentStatus?: string | null;
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

export interface AdminOrderCustomerOption {
  id: number;
  fullName?: string | null;
  email?: string | null;
}

export interface AdminOrderProductOption {
  productId: number;
  productName: string;
  productSlug?: string | null;
  productSku?: string | null;
  productVariety?: string | null;
  productSlot?: string | null;
  brandName?: string | null;
  thumbnailUrl?: string | null;
  variantId?: number | null;
  variantSku?: string | null;
  variantLabel?: string | null;
  variantKey?: string | null;
  taxRateId?: number | null;
  taxRateName?: string | null;
  taxRate: number;
  unitPrice: number;
}
