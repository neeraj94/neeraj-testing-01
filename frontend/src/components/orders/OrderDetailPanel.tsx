import type { OrderDetail } from '../../types/orders';
import { formatCurrency } from '../../utils/currency';

type OrderDetailPanelProps = {
  order: OrderDetail;
  baseCurrency: string | null;
  onClose?: () => void;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const AddressBlock = ({
  title,
  address
}: {
  title: string;
  address: OrderDetail['shippingAddress'];
}) => {
  if (!address) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No {title.toLowerCase()} recorded.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p className="font-medium text-slate-900">{address.fullName}</p>
        <p>{address.addressLine1}</p>
        {address.addressLine2 && <p>{address.addressLine2}</p>}
        {address.landmark && <p>Landmark: {address.landmark}</p>}
        <p>
          {address.cityName}
          {address.stateName ? `, ${address.stateName}` : ''}
          {address.countryName ? `, ${address.countryName}` : ''}
        </p>
        {address.pinCode && <p>PIN: {address.pinCode}</p>}
        {address.mobileNumber && <p>Phone: {address.mobileNumber}</p>}
      </div>
    </div>
  );
};

const OrderDetailPanel = ({ order, baseCurrency, onClose }: OrderDetailPanelProps) => {
  const currency = baseCurrency ?? 'USD';
  const lines = order.lines ?? [];
  const summary = order.summary;
  const paymentMethod = order.paymentMethod;
  const appliedCoupon = summary?.appliedCoupon ?? null;
  const couponDescription = appliedCoupon
    ? appliedCoupon.description?.trim()?.length
      ? appliedCoupon.description
      : appliedCoupon.discountType === 'PERCENTAGE'
        ? `${appliedCoupon.discountValue ?? 0}% off`
        : `Save ${formatCurrency(appliedCoupon.discountValue ?? 0, currency)}`
    : null;
  const couponTypeLabel = appliedCoupon
    ? appliedCoupon.discountType === 'PERCENTAGE'
      ? 'Percentage discount'
      : 'Flat discount'
    : null;
  const couponValueLabel = appliedCoupon?.discountValue != null
    ? appliedCoupon.discountType === 'PERCENTAGE'
      ? `${appliedCoupon.discountValue}% rate`
      : `Value: ${formatCurrency(appliedCoupon.discountValue, currency)}`
    : null;

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Order #{order.id}</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">{order.orderNumber}</h3>
          <p className="text-sm text-slate-500">Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              order.status === 'PROCESSING'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {order.status ?? 'Processing'}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-800">Customer</h4>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{order.customerName ?? 'Customer'}</p>
              {order.customerEmail && <p>{order.customerEmail}</p>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-800">Payment</h4>
            <div className="mt-2 text-sm text-slate-600">
              {paymentMethod ? (
                <>
                  <p className="font-medium text-slate-900">{paymentMethod.displayName}</p>
                  {paymentMethod.notes && <p className="text-xs text-slate-500">{paymentMethod.notes}</p>}
                </>
              ) : (
                <p>No payment method recorded.</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <AddressBlock title="Shipping address" address={order.shippingAddress} />
          <AddressBlock title="Billing address" address={order.billingAddress} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">Items</h4>
        <div className="mt-4 space-y-4">
          {lines.length ? (
            lines.map((line, index) => (
              <div key={`${order.id}-${line.productId ?? index}`} className="flex flex-wrap justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{line.name ?? 'Product'}</p>
                  {line.variantLabel && <p className="text-xs font-medium text-slate-600">{line.variantLabel}</p>}
                  {line.variantSku && <p className="text-[11px] uppercase tracking-wide text-slate-400">SKU: {line.variantSku}</p>}
                  {line.productSlug ? (
                    <a
                      href={`/product/${line.productSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-primary/80"
                    >
                      View product
                      <span aria-hidden>↗</span>
                    </a>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    Qty {line.quantity} × {formatCurrency(line.unitPrice ?? 0, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(line.lineTotal ?? (line.unitPrice ?? 0) * line.quantity, currency)}
                  </p>
                  {line.taxRate != null && (
                    <p className="text-xs text-slate-500">Tax rate: {(line.taxRate * 100).toFixed(1)}%</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No line items recorded for this order.</p>
          )}
        </div>
        {summary && (
          <dl className="mt-6 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <dt>Products</dt>
              <dd>{formatCurrency(summary.productTotal ?? 0, currency)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Tax</dt>
              <dd>{formatCurrency(summary.taxTotal ?? 0, currency)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Shipping</dt>
              <dd>{formatCurrency(summary.shippingTotal ?? 0, currency)}</dd>
            </div>
            {summary.discountTotal ? (
              <div className="flex items-center justify-between text-emerald-600">
                <dt>Discount</dt>
                <dd>-{formatCurrency(summary.discountTotal, currency)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
              <dt>Total</dt>
              <dd>{formatCurrency(summary.grandTotal ?? 0, currency)}</dd>
            </div>
          </dl>
        )}
        {appliedCoupon && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-700">
            <p className="text-sm font-semibold text-emerald-800">Coupon applied</p>
            <p className="mt-1 font-medium">Code: {appliedCoupon.code}</p>
            {couponDescription && <p className="mt-1">{couponDescription}</p>}
            <p className="mt-1">
              Discount saved: {formatCurrency(appliedCoupon.discountAmount ?? 0, currency)} · Type:{' '}
              {couponTypeLabel ?? appliedCoupon.discountType}
            </p>
            {couponValueLabel && <p className="mt-1">{couponValueLabel}</p>}
          </div>
        )}
      </div>
    </section>
  );
};

export default OrderDetailPanel;
