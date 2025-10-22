import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import OrderStatusTracker from '../components/orders/OrderStatusTracker';
import Spinner from '../components/Spinner';
import { useToast } from '../components/ToastProvider';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import { api } from '../services/http';
import type { OrderDetail } from '../types/orders';
import { formatCurrency } from '../utils/currency';
import { extractErrorMessage } from '../utils/errors';

const formatAddress = (address: OrderDetail['shippingAddress']) => {
  if (!address) {
    return null;
  }
  return [
    address.addressLine1,
    address.addressLine2,
    [address.cityName, address.stateName, address.countryName].filter(Boolean).join(', '),
    address.pinCode ? `PIN: ${address.pinCode}` : null,
    address.mobileNumber ? `Phone: ${address.mobileNumber}` : null
  ]
    .filter((line) => line && line.toString().trim().length > 0)
    .map((line) => line as string);
};

const CustomerOrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const currency = baseCurrency ?? 'USD';
  const { notify } = useToast();

  useEffect(() => {
    if (orderId) {
      document.title = `Order #${orderId} — Aurora Market`;
    } else {
      document.title = 'Order details — Aurora Market';
    }
  }, [orderId]);

  const orderQuery = useQuery<OrderDetail | null>({
    queryKey: ['client', 'orders', orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      if (!orderId) {
        return null;
      }
      const { data } = await api.get<OrderDetail>(`/checkout/orders/${orderId}`);
      return data;
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to load this order.') });
    }
  });

  const order = orderQuery.data ?? null;
  const appliedCoupon = order?.summary?.appliedCoupon ?? null;
  const couponDescription = appliedCoupon
    ? appliedCoupon.description?.trim()?.length
      ? appliedCoupon.description
      : appliedCoupon.discountType === 'PERCENTAGE'
        ? `${appliedCoupon.discountValue ?? 0}% off`
        : `Save ${formatCurrency(appliedCoupon.discountValue ?? 0, currency)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-12">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          ← Back to orders
        </Link>

        {orderQuery.isLoading ? (
          <div className="mt-10 flex items-center gap-3 text-sm text-slate-500">
            <Spinner /> Loading order details…
          </div>
        ) : order ? (
          <div className="mt-6 space-y-8">
            <OrderStatusTracker status={order.status} placedAt={order.createdAt} />

            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Order summary</p>
                  <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                    Order #{order.orderNumber ?? order.id}
                  </h1>
                  <p className="text-sm text-slate-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Order total</p>
                  <p className="text-3xl font-semibold text-slate-900">
                    {formatCurrency(order.summary?.grandTotal ?? 0, currency)}
                  </p>
                </div>
              </header>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Shipping address</h2>
                    {order.shippingAddress ? (
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">{order.shippingAddress.fullName}</p>
                        {formatAddress(order.shippingAddress)?.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">No shipping address on file.</p>
                    )}
                  </section>
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Billing address</h2>
                    {order.billingAddress ? (
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">{order.billingAddress.fullName}</p>
                        {formatAddress(order.billingAddress)?.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Billing address matches your shipping address.</p>
                    )}
                  </section>
                </div>
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Payment</h2>
                    {order.paymentMethod ? (
                      <div className="mt-3 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">{order.paymentMethod.displayName}</p>
                        {order.paymentMethod.notes && <p className="text-xs text-slate-500">{order.paymentMethod.notes}</p>}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Payment method details are not available.</p>
                    )}
                  </section>
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h2>
                    <dl className="mt-3 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <dt>Products</dt>
                        <dd>{formatCurrency(order.summary?.productTotal ?? 0, currency)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>Tax</dt>
                        <dd>{formatCurrency(order.summary?.taxTotal ?? 0, currency)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>Shipping</dt>
                        <dd>{formatCurrency(order.summary?.shippingTotal ?? 0, currency)}</dd>
                      </div>
                      {order.summary?.discountTotal ? (
                        <div className="flex items-center justify-between text-emerald-600">
                          <dt>Discount</dt>
                          <dd>-{formatCurrency(order.summary.discountTotal, currency)}</dd>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                        <dt>Total paid</dt>
                        <dd>{formatCurrency(order.summary?.grandTotal ?? 0, currency)}</dd>
                      </div>
                    </dl>
                    {appliedCoupon && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-700">
                        <p className="text-sm font-semibold text-emerald-800">Coupon applied</p>
                        <p className="mt-1 font-medium">Code: {appliedCoupon.code}</p>
                        {couponDescription && <p className="mt-1">{couponDescription}</p>}
                        {appliedCoupon.discountAmount != null && (
                          <p className="mt-1">Savings: {formatCurrency(appliedCoupon.discountAmount, currency)}</p>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </div>

              <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Items in this order</h2>
                <div className="mt-4 space-y-4">
                  {order.lines.length ? (
                    order.lines.map((line, index) => (
                      <div
                        key={`${order.id}-${line.productId ?? index}`}
                        className="flex flex-col gap-2 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{line.name ?? 'Product'}</p>
                          {line.variantLabel && (
                            <p className="text-xs text-slate-500">Variant: {line.variantLabel}</p>
                          )}
                          {line.variantSku && (
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">SKU: {line.variantSku}</p>
                          )}
                          {line.productSlug && (
                            <a
                              href={`/product/${line.productSlug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-primary/80"
                            >
                              View product
                              <span aria-hidden>↗</span>
                            </a>
                          )}
                        </div>
                        <div className="text-right text-sm text-slate-600">
                          <p>
                            Qty {line.quantity} × {formatCurrency(line.unitPrice ?? 0, currency)}
                          </p>
                          <p className="text-base font-semibold text-slate-900">
                            {formatCurrency(line.lineTotal ?? (line.unitPrice ?? 0) * line.quantity, currency)}
                          </p>
                          {line.taxRate != null && (
                            <p className="text-xs text-slate-500">Tax rate: {(line.taxRate * 100).toFixed(1)}%</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No line items were recorded for this order.</p>
                  )}
                </div>
              </section>
            </section>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-8 py-12 text-center text-sm text-slate-500">
            We couldn’t find that order. Return to your{' '}
            <Link to="/account/orders" className="text-primary underline-offset-2 transition hover:underline">
              order history
            </Link>{' '}
            to select a different order.
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrderDetailPage;
