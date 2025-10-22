import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '../components/Spinner';
import { useToast } from '../components/ToastProvider';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import { api } from '../services/http';
import type { OrderListItem } from '../types/orders';
import { formatCurrency } from '../utils/currency';
import { extractErrorMessage } from '../utils/errors';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeOrdersResponse = (payload: unknown): OrderListItem[] => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is OrderListItem => isRecord(item) && typeof item.id === 'number')
      .map((item) => ({
        ...(item as OrderListItem),
        lines: Array.isArray((item as OrderListItem).lines) ? (item as OrderListItem).lines : []
      }));
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.content)) {
      return normalizeOrdersResponse(payload.content);
    }
    if (Array.isArray(payload.data)) {
      return normalizeOrdersResponse(payload.data);
    }
  }

  return [];
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return 'Unknown date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const toStatusBadge = (status: string | null | undefined) => {
  if (!status) {
    return { label: 'Processing', tone: 'warning' as const };
  }
  const normalized = status.toUpperCase();
  if (normalized === 'DELIVERED') {
    return { label: 'Delivered', tone: 'success' as const };
  }
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') {
    return { label: 'Cancelled', tone: 'danger' as const };
  }
  if (normalized === 'RETURNED') {
    return { label: 'Returned', tone: 'danger' as const };
  }
  return { label: normalized.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase()), tone: 'warning' as const };
};

const MyOrdersPage = () => {
  useEffect(() => {
    document.title = 'My Orders — Aurora Market';
  }, []);

  const baseCurrency = useAppSelector(selectBaseCurrency);
  const currency = baseCurrency ?? 'USD';
  const { notify } = useToast();

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['client', 'orders'],
    queryFn: async () => {
      const { data } = await api.get<unknown>('/checkout/orders');
      return normalizeOrdersResponse(data);
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to load your orders.') });
    }
  });

  const orders = ordersQuery.data ?? [];
  const hasOrders = orders.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-12">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-semibold text-slate-900">My orders</h1>
            <p className="mt-2 text-sm text-slate-500">
              Track the status of recent purchases, review order details, or quickly reorder your favourites.
            </p>
          </header>

          <div className="mt-6 space-y-4">
            {ordersQuery.isLoading ? (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Spinner /> Loading your orders…
              </div>
            ) : hasOrders ? (
              orders.map((order) => {
                const badge = toStatusBadge(order.status ?? 'PROCESSING');
                const total =
                  order.summary?.grandTotal ??
                  order.summary?.productTotal ??
                  order.lines.reduce((sum, line) => sum + (line.lineTotal ?? (line.unitPrice ?? 0) * line.quantity), 0);
                const itemSummary = order.lines
                  .slice(0, 3)
                  .map((line) => line.name ?? line.productSlug ?? 'Item')
                  .join(', ');

                return (
                  <article
                    key={order.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white lg:flex-row lg:items-center"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Order #{order.orderNumber ?? order.id}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            badge.tone === 'success'
                              ? 'bg-emerald-100 text-emerald-700'
                              : badge.tone === 'danger'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900">Placed on {formatDate(order.createdAt)}</h2>
                      <p className="text-sm text-slate-500">
                        {order.lines.length} item{order.lines.length === 1 ? '' : 's'}
                        {itemSummary && ` · ${itemSummary}`}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-3 text-right">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Order total</p>
                        <p className="text-xl font-semibold text-slate-900">{formatCurrency(total ?? 0, currency)}</p>
                      </div>
                      <Link
                        to={`/account/orders/${order.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                      >
                        View details
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-8 py-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">You have not placed any orders yet.</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Explore the catalog to find something you love, then return here to follow your order progress.
                </p>
                <Link
                  to="/products"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:bg-blue-600"
                >
                  Browse products
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MyOrdersPage;
