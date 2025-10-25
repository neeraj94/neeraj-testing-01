import type { AppliedCoupon, OrderLine, OrderSummary } from '../types/checkout';

const roundCurrency = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

type LineComputationInput = {
  quantity: number;
  unitPrice: number;
  taxRate?: number | null;
};

const computeLineTotals = ({ quantity, unitPrice, taxRate }: LineComputationInput) => {
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
  const safeTaxRate = Number.isFinite(taxRate ?? 0) && (taxRate ?? 0) >= 0 ? (taxRate ?? 0) : 0;

  const subtotal = safeQuantity * safeUnitPrice;
  const taxAmount = subtotal * safeTaxRate;
  const total = subtotal + taxAmount;

  return {
    subtotal: roundCurrency(subtotal),
    taxAmount: roundCurrency(taxAmount),
    total: roundCurrency(total)
  };
};

const computeCouponDiscount = (coupon: AppliedCoupon, baseAmount: number): number => {
  const discountValue = coupon.discountValue ?? 0;
  if (coupon.discountType === 'PERCENTAGE') {
    return roundCurrency((Math.max(0, baseAmount) * discountValue) / 100);
  }
  return roundCurrency(discountValue);
};

type SummaryComputationOptions = {
  lines: LineComputationInput[];
  baseSummary: OrderSummary | null | undefined;
  shippingTotal?: number;
  discountTotal?: number;
  coupon?: AppliedCoupon | null;
  shippingMethod?: string | null;
};

const computeSummary = ({
  lines,
  baseSummary,
  shippingTotal,
  discountTotal,
  coupon,
  shippingMethod
}: SummaryComputationOptions): OrderSummary => {
  const aggregates = lines.reduce(
    (acc, line) => {
      const totals = computeLineTotals(line);
      return {
        subtotal: acc.subtotal + totals.subtotal,
        tax: acc.tax + totals.taxAmount
      };
    },
    { subtotal: 0, tax: 0 }
  );

  const computedShippingTotal = shippingTotal ?? baseSummary?.shippingTotal ?? 0;

  let appliedCoupon: AppliedCoupon | null = coupon ?? baseSummary?.appliedCoupon ?? null;
  let computedDiscountTotal = discountTotal;

  if (coupon === null) {
    appliedCoupon = null;
    if (computedDiscountTotal === undefined) {
      computedDiscountTotal = 0;
    }
  }

  if (appliedCoupon) {
    const baseAmount = aggregates.subtotal + aggregates.tax + computedShippingTotal;
    const couponDiscount = computeCouponDiscount(appliedCoupon, baseAmount);
    const resolvedDiscountTotal = discountTotal ?? couponDiscount;
    appliedCoupon = {
      ...appliedCoupon,
      discountAmount: roundCurrency(resolvedDiscountTotal)
    };
    computedDiscountTotal = resolvedDiscountTotal;
  }

  const safeDiscountTotal = computedDiscountTotal ?? baseSummary?.discountTotal ?? 0;

  const grandTotal = Math.max(
    0,
    aggregates.subtotal + aggregates.tax + computedShippingTotal - safeDiscountTotal
  );

  return {
    productTotal: roundCurrency(aggregates.subtotal),
    taxTotal: roundCurrency(aggregates.tax),
    shippingTotal: roundCurrency(computedShippingTotal),
    discountTotal: roundCurrency(safeDiscountTotal),
    grandTotal: roundCurrency(grandTotal),
    shippingBreakdown: baseSummary?.shippingBreakdown ?? null,
    taxLines: baseSummary?.taxLines ?? [],
    appliedCoupon,
    paymentStatus: baseSummary?.paymentStatus ?? null,
    dueDate: baseSummary?.dueDate ?? null,
    balanceDue: baseSummary?.balanceDue ?? null,
    amountDue: baseSummary?.amountDue ?? null,
    notes: baseSummary?.notes ?? null,
    shippingMethod: shippingMethod ?? baseSummary?.shippingMethod ?? null
  };
};

const toLineInput = (line: OrderLine): LineComputationInput => ({
  quantity: line.quantity ?? 0,
  unitPrice: line.unitPrice ?? 0,
  taxRate: line.taxRate ?? 0
});

const computeSummaryFromOrder = (
  lines: OrderLine[],
  baseSummary: OrderSummary | null | undefined,
  overrides?: Partial<Omit<SummaryComputationOptions, 'lines' | 'baseSummary'> & { coupon: AppliedCoupon | null }>
): OrderSummary =>
  computeSummary({
    lines: lines.map(toLineInput),
    baseSummary,
    shippingTotal: overrides?.shippingTotal,
    discountTotal: overrides?.discountTotal,
    coupon: overrides?.coupon,
    shippingMethod: overrides?.shippingMethod
  });

export { roundCurrency, computeLineTotals, computeSummary, computeSummaryFromOrder };
