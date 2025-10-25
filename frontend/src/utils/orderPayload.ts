import type { CheckoutOrderLine, OrderSummary } from '../types/checkout';
import type { AdminOrderPayload, OrderDetail } from '../types/orders';
import { computeSummaryFromOrder, roundCurrency } from './orderCalculations';

const toCheckoutOrderLine = (line: OrderDetail['lines'][number]): CheckoutOrderLine => {
  const quantity = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 0;
  const unitPrice = roundCurrency(line.unitPrice ?? (line.lineTotal ?? 0) / (line.quantity || 1));

  return {
    productId: line.productId ?? undefined,
    name: line.name ?? undefined,
    quantity,
    unitPrice,
    taxRate: line.taxRate ?? undefined,
    productSlug: line.productSlug ?? undefined,
    variantId: line.variantId ?? undefined,
    variantSku: line.variantSku ?? undefined,
    variantLabel: line.variantLabel ?? undefined
  } satisfies CheckoutOrderLine;
};

const ensureSummary = (order: OrderDetail): OrderSummary => {
  const lines = order.lines ?? [];
  if (order.summary) {
    return order.summary;
  }
  return computeSummaryFromOrder(lines, null);
};

const toAdminOrderPayload = (order: OrderDetail): AdminOrderPayload => {
  if (order.customerId == null) {
    throw new Error('Orders must reference a customer before updates can be saved.');
  }

  const summary = ensureSummary(order);

  return {
    customerId: order.customerId,
    customerEmail: order.customerEmail ?? null,
    customerName: order.customerName ?? null,
    status: order.status ?? null,
    shippingAddress: order.shippingAddress ?? null,
    billingAddress: order.billingAddress ?? null,
    paymentMethod: order.paymentMethod ?? null,
    summary,
    lines: (order.lines ?? []).map(toCheckoutOrderLine)
  } satisfies AdminOrderPayload;
};

export { toAdminOrderPayload };
