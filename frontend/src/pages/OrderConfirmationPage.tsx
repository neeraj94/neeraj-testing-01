import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/currency';
import type { OrderDetail } from '../types/orders';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  scale: number;
  color: string;
};

const CelebrationOverlay = ({ visible }: { visible: boolean }) => {
  const pieces = useMemo<ConfettiPiece[]>(() => {
    const colors = ['#2563eb', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#c084fc'];
    return Array.from({ length: 120 }).map((_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 1.5,
      rotation: Math.random() * 360,
      scale: 0.6 + Math.random() * 0.6,
      color: colors[index % colors.length]
    }));
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`
          }}
        />
      ))}
    </div>
  );
};

const SectionCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <div className="mt-4 text-sm text-slate-600">{children}</div>
  </section>
);

const OrderConfirmationPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const [showCelebration, setShowCelebration] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowCelebration(false), 3500);
    return () => window.clearTimeout(timeout);
  }, []);

  const orderQuery = useQuery<OrderDetail>({
    queryKey: ['checkout', 'orders', orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/checkout/orders/${orderId}`);
      return data;
    }
  });

  const currency = baseCurrency ?? 'USD';

  const estimatedDeliveryDate = useMemo(() => {
    if (!orderQuery.data?.createdAt) {
      return null;
    }
    const createdAt = new Date(orderQuery.data.createdAt).getTime();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    return new Date(createdAt + fiveDaysMs).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric'
    });
  }, [orderQuery.data?.createdAt]);

  const orderNumberFromState = (location.state as { orderNumber?: string } | undefined)?.orderNumber;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12">
      <CelebrationOverlay visible={showCelebration} />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4">
        <header className="relative z-20 rounded-3xl bg-white/80 p-10 text-center shadow-xl backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Order confirmed</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">Thank you for your order!</h1>
          <p className="mt-3 text-sm text-slate-600">
            {orderQuery.data?.orderNumber || orderNumberFromState
              ? `Your order ${orderQuery.data?.orderNumber ?? orderNumberFromState} is now being prepared.`
              : 'We are getting your order ready.'}
          </p>
          <p className="mt-1 text-xs text-slate-500">A confirmation email with your order details has been sent.</p>
        </header>

        {orderQuery.isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white/80 shadow">
            <Spinner />
          </div>
        ) : orderQuery.isError ? (
          <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50/80 p-10 text-center shadow">
            <h2 className="text-xl font-semibold text-rose-700">We couldn’t retrieve your order.</h2>
            <p className="text-sm text-rose-600">
              Please refresh the page or return to checkout to place your order again if it didn’t complete.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Return to checkout
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              >
                Go to homepage
              </Link>
            </div>
          </div>
        ) : orderQuery.data ? (
          <div className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
            <div className="space-y-6">
              <SectionCard title="Order summary">
                <div className="space-y-4">
                  {orderQuery.data.lines.length ? (
                    orderQuery.data.lines.map((line, index) => (
                      <div
                        key={`${orderQuery.data.id}-${line.productId ?? index}`}
                        className="flex flex-wrap justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{line.name ?? 'Product'}</p>
                          <p className="text-xs text-slate-500">
                            Qty {line.quantity} × {formatCurrency(line.unitPrice ?? 0, currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(line.lineTotal ?? (line.unitPrice ?? 0) * line.quantity, currency)}
                          </p>
                          {line.taxRate != null && (
                            <p className="text-xs text-slate-500">Tax: {(line.taxRate * 100).toFixed(1)}%</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No items were recorded for this order.</p>
                  )}
                </div>
                {orderQuery.data.summary && (
                  <dl className="mt-6 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <dt>Subtotal</dt>
                      <dd>{formatCurrency(orderQuery.data.summary.productTotal ?? 0, currency)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Tax</dt>
                      <dd>{formatCurrency(orderQuery.data.summary.taxTotal ?? 0, currency)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Shipping</dt>
                      <dd>{formatCurrency(orderQuery.data.summary.shippingTotal ?? 0, currency)}</dd>
                    </div>
                    {orderQuery.data.summary.discountTotal ? (
                      <div className="flex items-center justify-between text-emerald-600">
                        <dt>Discount</dt>
                        <dd>-{formatCurrency(orderQuery.data.summary.discountTotal, currency)}</dd>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                      <dt>Total paid</dt>
                      <dd>{formatCurrency(orderQuery.data.summary.grandTotal ?? 0, currency)}</dd>
                    </div>
                  </dl>
                )}
              </SectionCard>

              <SectionCard title="Delivery details">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Shipping address</h4>
                    {orderQuery.data.shippingAddress ? (
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        <li className="font-medium text-slate-900">
                          {orderQuery.data.shippingAddress.fullName}
                        </li>
                        <li>{orderQuery.data.shippingAddress.addressLine1}</li>
                        {orderQuery.data.shippingAddress.addressLine2 && (
                          <li>{orderQuery.data.shippingAddress.addressLine2}</li>
                        )}
                        <li>
                          {[orderQuery.data.shippingAddress.cityName, orderQuery.data.shippingAddress.stateName,
                          orderQuery.data.shippingAddress.countryName]
                            .filter(Boolean)
                            .join(', ')}
                        </li>
                        {orderQuery.data.shippingAddress.pinCode && (
                          <li>PIN: {orderQuery.data.shippingAddress.pinCode}</li>
                        )}
                        {orderQuery.data.shippingAddress.mobileNumber && (
                          <li>Phone: {orderQuery.data.shippingAddress.mobileNumber}</li>
                        )}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Shipping address was not captured.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Billing address</h4>
                    {orderQuery.data.billingAddress ? (
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        <li className="font-medium text-slate-900">
                          {orderQuery.data.billingAddress.fullName}
                        </li>
                        <li>{orderQuery.data.billingAddress.addressLine1}</li>
                        {orderQuery.data.billingAddress.addressLine2 && (
                          <li>{orderQuery.data.billingAddress.addressLine2}</li>
                        )}
                        <li>
                          {[orderQuery.data.billingAddress.cityName, orderQuery.data.billingAddress.stateName,
                          orderQuery.data.billingAddress.countryName]
                            .filter(Boolean)
                            .join(', ')}
                        </li>
                        {orderQuery.data.billingAddress.pinCode && (
                          <li>PIN: {orderQuery.data.billingAddress.pinCode}</li>
                        )}
                        {orderQuery.data.billingAddress.mobileNumber && (
                          <li>Phone: {orderQuery.data.billingAddress.mobileNumber}</li>
                        )}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Billing address matches your shipping details.</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
                  {estimatedDeliveryDate ? (
                    <>
                      <p className="font-semibold text-slate-800">Estimated delivery</p>
                      <p className="mt-1">Your order should arrive by {estimatedDeliveryDate}. We’ll email you updates along the way.</p>
                    </>
                  ) : (
                    <p>We’ll notify you as soon as your order ships.</p>
                  )}
                </div>
              </SectionCard>
            </div>
            <div className="space-y-6">
              <SectionCard title="Payment">
                {orderQuery.data.paymentMethod ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">{orderQuery.data.paymentMethod.displayName}</p>
                    {orderQuery.data.paymentMethod.notes && (
                      <p className="text-xs text-slate-500">{orderQuery.data.paymentMethod.notes}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Order placed on {new Date(orderQuery.data.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No payment method was provided with this order.</p>
                )}
              </SectionCard>

              <SectionCard title="Need help?">
                <p>
                  If you have any questions about your order, reply to the confirmation email or contact our support team.
                  We’re happy to help.
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                  >
                    Continue shopping
                  </Link>
                  <Link
                    to="/admin/orders"
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    View my orders
                  </Link>
                </div>
              </SectionCard>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
