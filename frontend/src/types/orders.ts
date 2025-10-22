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

export interface AdminOrderCustomerOption {
  id: number;
  fullName?: string | null;
  email?: string | null;
}

export interface AdminOrderProductSearchResult {
  id: number;
  name: string;
  sku: string;
  thumbnailUrl?: string | null;
  brandName?: string | null;
  primaryCategory?: string | null;
}

export interface AdminOrderProductVariantOption {
  id: number | null;
  label?: string | null;
  sku?: string | null;
  unitPrice: number;
  taxRate?: number | null;
  availableQuantity?: number | null;
}

export interface AdminOrderProductOption {
  id: number;
  name: string;
  sku: string;
  slug: string;
  thumbnailUrl?: string | null;
  brandName?: string | null;
  primaryCategory?: string | null;
  baseUnitPrice: number;
  effectiveTaxRate: number;
  variants: AdminOrderProductVariantOption[];
}

export interface AdminOrderCouponOption {
  id: number;
  code: string;
  name: string;
  discountType: 'FLAT' | 'PERCENTAGE';
  discountValue?: number | null;
}

export interface AdminOrderPreviewLine {
  productId: number;
  variantId?: number | null;
  quantity: number;
}

export interface AdminOrderPreviewRequest {
  customerId: number;
  shippingAddressId?: number | null;
  billingAddressId?: number | null;
  billingSameAsShipping: boolean;
  couponCode?: string | null;
  lines: AdminOrderPreviewLine[];
}

export interface AdminOrderPreviewResponse {
  summary: OrderSummary | null;
  lines: CheckoutOrderLine[];
}
