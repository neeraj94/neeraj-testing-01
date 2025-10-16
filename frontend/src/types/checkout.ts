export type AddressType = 'SHIPPING' | 'BILLING';

export interface CheckoutRegionOption {
  id: number;
  label: string;
  name?: string;
}

export interface CheckoutAddress {
  id: number;
  type: AddressType;
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  countryName: string | null;
  stateName: string | null;
  cityName: string | null;
  fullName: string;
  mobileNumber: string;
  pinCode: string | null;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  defaultAddress: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  key: string;
  displayName: string;
  enabled: boolean;
  notes?: string | null;
}

export interface OrderTaxLine {
  productId: number | null;
  productName: string | null;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
}

export interface ShippingQuote {
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  countryName: string | null;
  stateName: string | null;
  cityName: string | null;
  countryCost: number | null;
  stateCost: number | null;
  cityCost: number | null;
  effectiveCost: number | null;
}

export interface OrderSummary {
  productTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  shippingBreakdown: ShippingQuote | null;
  taxLines: OrderTaxLine[];
}

export interface CheckoutSummary {
  addresses: CheckoutAddress[];
  paymentMethods: PaymentMethod[];
  orderSummary: OrderSummary;
}

export interface CheckoutOrderLine {
  productId?: number;
  name?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface OrderLine {
  productId?: number | null;
  name?: string | null;
  quantity: number;
  unitPrice?: number | null;
  lineTotal?: number | null;
  taxRate?: number | null;
}

export interface CheckoutOrderPayload {
  shippingAddressId: number;
  billingAddressId?: number | null;
  sameAsShipping: boolean;
  paymentMethodKey: string;
  lines: CheckoutOrderLine[];
}

export interface CheckoutOrderResponse {
  orderId: number;
  orderNumber: string;
  summary: OrderSummary;
  createdAt: string;
}
