import type { ReactNode } from 'react';
import type { OrderDetail } from '../../types/orders';
import { formatCurrency } from '../../utils/currency';

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return 'Unknown date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return 'No due date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No due date';
  }
  return date.toLocaleDateString();
};

const formatPaymentStatusLabel = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

type OrderDetailPanelProps = {
  order: OrderDetail;
  baseCurrency: string | null;
  onClose?: () => void;
  actions?: ReactNode;
  mode?: 'view' | 'edit' | 'payment';
};

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h4 className="text-sm font-semibold text-slate-900">{children}</h4>
);

const InfoField = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <div className="text-sm font-semibold text-slate-900">{value ?? '—'}</div>
  </div>
);

const AddressBlock = ({
  title,
  address
}: {
  title: string;
  address: OrderDetail['shippingAddress'];
}) => (
  <div className="space-y-2">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
    {address ? (
      <div className="space-y-1 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{address.fullName}</p>
        <p>{address.addressLine1}</p>
        {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
        {address.landmark ? <p>Landmark: {address.landmark}</p> : null}
        <p>{[address.cityName, address.stateName, address.countryName].filter(Boolean).join(', ')}</p>
        {address.pinCode ? <p>PIN: {address.pinCode}</p> : null}
        {address.mobileNumber ? <p>Phone: {address.mobileNumber}</p> : null}
      </div>
    ) : (
      <p className="text-sm text-slate-500">No address provided.</p>
    )}
  </div>
);

const OrderDetailPanel = ({ order, baseCurrency, onClose, actions, mode = 'view' }: OrderDetailPanelProps) => {
  const currency = baseCurrency ?? 'USD';
  const lines = order.lines ?? [];
  const summary = order.summary;
  const paymentMethod = order.paymentMethod;
  const appliedCoupon = summary?.appliedCoupon ?? null;
  const dueDate = order.dueDate ?? summary?.dueDate ?? null;
  const balanceDue = summary?.balanceDue ?? summary?.amountDue ?? null;
  const notes = order.notes ?? summary?.notes ?? null;
  const paymentStatusLabel = formatPaymentStatusLabel(order.paymentStatus ?? summary?.paymentStatus ?? null);
  const paymentMethodLabel =
    order.paymentMethodLabel ?? paymentMethod?.displayName ?? paymentMethod?.name ?? '—';

  const couponDescription = appliedCoupon
    ? appliedCoupon.description?.trim()?.length
      ? appliedCoupon.description
      : appliedCoupon.discountType === 'PERCENTAGE'
        ? `${appliedCoupon.discountValue ?? 0}% off`
        : `Save ${formatCurrency(appliedCoupon.discountValue ?? 0, currency)}`
    : null;

  const statusTone =
    order.status === 'CANCELLED'
      ? 'bg-rose-100 text-rose-700'
      : order.status === 'PROCESSING'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700';

  const modeLabel =
    mode === 'edit' ? 'Editing mode' : mode === 'payment' ? 'Payment view' : null;

  return (
    <section className="flex flex-col gap-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Order #{order.id}</p>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-slate-900">{order.orderNumber}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <span>Placed on {formatDateTime(order.createdAt)}</span>
              {dueDate ? <span className="font-medium text-slate-600">Due {formatDate(dueDate)}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 lg:items-end">
          {modeLabel ? (
            <span className="inline-flex items-center self-end rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {modeLabel}
            </span>
          ) : null}
          {actions}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone}`}>
              {order.status?.replace(/_/g, ' ') ?? 'Processing'}
            </span>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-slate-500 transition hover:text-slate-800"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
        <div className="space-y-10">
          <section className="space-y-6">
            <SectionHeading>Customer &amp; payment</SectionHeading>
            <div className="grid gap-6 sm:grid-cols-2">
              <InfoField label="Customer" value={order.customerName ?? 'Customer'} />
              <InfoField label="Email" value={order.customerEmail ?? '—'} />
              <InfoField label="Payment method" value={paymentMethodLabel} />
              <InfoField label="Payment status" value={paymentStatusLabel} />
              <InfoField label="Order placed" value={formatDateTime(order.createdAt)} />
              <InfoField label="Due date" value={formatDate(dueDate)} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading>Order items</SectionHeading>
            <div className="overflow-hidden rounded-xl">
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left">Item</th>
                      <th scope="col" className="px-4 py-2 text-right">Qty</th>
                      <th scope="col" className="px-4 py-2 text-right">Rate</th>
                      <th scope="col" className="px-4 py-2 text-right">Tax</th>
                      <th scope="col" className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.length ? (
                      lines.map((line, index) => (
                        <tr key={`${order.id}-${line.productId ?? index}`}>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">{line.name ?? 'Product'}</p>
                              {line.variantLabel ? (
                                <p className="text-xs text-slate-500">{line.variantLabel}</p>
                              ) : null}
                              {line.variantSku ? (
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">SKU: {line.variantSku}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{line.quantity}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(line.unitPrice ?? 0, currency)}</td>
                          <td className="px-4 py-3 text-right">
                            {line.taxRate != null ? `${(line.taxRate * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {formatCurrency(line.lineTotal ?? (line.unitPrice ?? 0) * line.quantity, currency)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                          No line items recorded for this order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading>Terms &amp; notes</SectionHeading>
            {notes ? (
              <p className="whitespace-pre-wrap text-sm text-slate-600">{notes}</p>
            ) : (
              <p className="text-sm text-slate-500">No additional terms were provided for this order.</p>
            )}
          </section>
        </div>

        <div className="space-y-10">
          <section className="space-y-4">
            <SectionHeading>Order summary</SectionHeading>
            {summary ? (
              <dl className="space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-500">Products</dt>
                  <dd className="text-sm font-semibold text-slate-900">
                    {formatCurrency(summary.productTotal ?? 0, currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-500">Tax</dt>
                  <dd className="text-sm font-semibold text-slate-900">
                    {formatCurrency(summary.taxTotal ?? 0, currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-500">Shipping</dt>
                  <dd className="text-sm font-semibold text-slate-900">
                    {formatCurrency(summary.shippingTotal ?? 0, currency)}
                  </dd>
                </div>
                {summary.discountTotal ? (
                  <div className="flex items-center justify-between text-sm text-emerald-600">
                    <dt>Discount</dt>
                    <dd>-{formatCurrency(summary.discountTotal, currency)}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                  <dt>Total</dt>
                  <dd>{formatCurrency(summary.grandTotal ?? 0, currency)}</dd>
                </div>
                {balanceDue != null ? (
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <dt>Amount due</dt>
                    <dd>{formatCurrency(balanceDue, currency)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No summary data available.</p>
            )}
            {appliedCoupon ? (
              <div className="rounded-xl bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700">
                <p className="text-sm font-semibold text-emerald-800">Coupon applied: {appliedCoupon.code}</p>
                {couponDescription ? <p className="mt-1">{couponDescription}</p> : null}
                {appliedCoupon.discountAmount != null ? (
                  <p className="mt-1">
                    Discount saved: {formatCurrency(appliedCoupon.discountAmount, currency)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <SectionHeading>Addresses</SectionHeading>
            <div className="grid gap-6 sm:grid-cols-2">
              <AddressBlock title="Shipping address" address={order.shippingAddress} />
              <AddressBlock title="Billing address" address={order.billingAddress} />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

export default OrderDetailPanel;
