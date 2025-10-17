import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { OrderDetail, OrderListItem } from '../types/orders';
import type { Pagination } from '../types/models';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/currency';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import OrderDetailPanel from '../components/orders/OrderDetailPanel';
import Button from '../components/Button';
import { extractErrorMessage } from '../utils/errors';
import DataTable from '../components/DataTable';
import PaginationControls from '../components/PaginationControls';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const toIsoDate = (value: string, endOfDay = false) => {
  if (!value) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date.toISOString();
};

const AdminOrdersPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter, paymentFilter, fromDate, toDate, sortOption, pageSize]);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: page.toString(),
      size: pageSize.toString()
    };
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    if (statusFilter !== 'ALL') {
      params.status = statusFilter;
    }
    if (paymentFilter !== 'ALL') {
      params.payment = paymentFilter;
    }
    if (fromDate) {
      const iso = toIsoDate(fromDate);
      if (iso) params.from = iso;
    }
    if (toDate) {
      const iso = toIsoDate(toDate, true);
      if (iso) params.to = iso;
    }
    if (sortOption === 'oldest') {
      params.sort = 'oldest';
      params.direction = 'asc';
    } else if (sortOption === 'newest') {
      params.sort = 'newest';
      params.direction = 'desc';
    } else if (sortOption === 'highest') {
      params.sort = 'highest';
    } else if (sortOption === 'lowest') {
      params.sort = 'lowest';
    }
    return params;
  }, [debouncedSearch, statusFilter, paymentFilter, fromDate, toDate, sortOption, page, pageSize]);

  const ordersQuery = useQuery<Pagination<OrderListItem>>({
    queryKey: ['orders', 'admin', queryParams],
    queryFn: async () => {
      const searchParams = new URLSearchParams(queryParams);
      const { data } = await api.get<Pagination<OrderListItem>>(`/admin/orders?${searchParams.toString()}`);
      return data;
    }
  });

  const orders = ordersQuery.data?.content ?? [];
  const totalElements = ordersQuery.data?.totalElements ?? 0;

  const statusOptions = useMemo(() => {
    const unique = new Set<string>();
    orders.forEach((order) => {
      if (order.status) {
        unique.add(order.status);
      }
    });
    return Array.from(unique).sort();
  }, [orders]);

  const paymentOptions = useMemo(() => {
    const unique = new Map<string, string>();
    orders.forEach((order) => {
      if (order.paymentMethodKey) {
        unique.set(order.paymentMethodKey, order.paymentMethodName ?? order.paymentMethodKey);
      }
    });
    return Array.from(unique.entries());
  }, [orders]);

  useEffect(() => {
    if (!orders.length) {
      setSelectedOrderId(null);
      return;
    }
    if (!orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const orderDetailQuery = useQuery<OrderDetail>({
    queryKey: ['orders', 'admin', 'detail', selectedOrderId],
    enabled: selectedOrderId != null,
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/admin/orders/${selectedOrderId}`);
      return data;
    }
  });

  if (ordersQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (ordersQuery.isError) {
    const message = extractErrorMessage(ordersQuery.error, 'Unable to load orders.');
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50/80 p-10 text-center shadow">
        <h1 className="text-xl font-semibold text-rose-700">We couldn't load orders</h1>
        <p className="text-sm text-rose-600">{message}</p>
        <div className="flex justify-center">
          <Button onClick={() => ordersQuery.refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  const hasOrders = orders.length > 0;
  const currency = baseCurrency ?? 'USD';

  const resetFilters = (event?: FormEvent) => {
    event?.preventDefault();
    setSearchTerm('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setFromDate('');
    setToDate('');
    setSortOption('newest');
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">
          Review customer purchases, search by customer or order number, and drill into complete order details.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="space-y-4">
          <DataTable
            title="Order history"
            actions={
              <form className="flex flex-wrap items-center gap-3" onSubmit={resetFilters}>
                <input
                  type="search"
                  placeholder="Search orders"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ALL">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ALL">All payments</option>
                  {paymentOptions.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="Placed after"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="Placed before"
                />
                <select
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value as typeof sortOption)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest total</option>
                  <option value="lowest">Lowest total</option>
                </select>
                <Button type="submit" variant="ghost" className="px-3 py-2 text-sm">
                  Reset
                </Button>
              </form>
            }
          >
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Placed</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {hasOrders ? (
                orders.map((order) => {
                  const isSelected = selectedOrderId === order.id;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`cursor-pointer border-t border-slate-200 transition ${
                        isSelected ? 'bg-primary/5 text-primary-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        <div className="space-y-1">
                          <span>{order.orderNumber}</span>
                          {order.couponCode && (
                            <span className="block text-xs font-medium uppercase tracking-wide text-emerald-600">
                              Coupon: {order.couponCode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-900">{order.customerName ?? 'Customer'}</span>
                          {order.customerEmail && (
                            <span className="block text-xs text-slate-500">{order.customerEmail}</span>
                          )}
                          {order.paymentMethodName && (
                            <span className="block text-xs text-slate-400">{order.paymentMethodName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(order.createdAt)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(order.summary?.grandTotal ?? 0, currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex min-w-[96px] justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            order.status === 'PROCESSING'
                              ? 'bg-amber-50 text-amber-700'
                              : order.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {order.status ?? 'Processing'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No orders match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>

          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={ordersQuery.isFetching}
          />
        </div>

        <div>
          {selectedOrderId == null ? (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Select an order to view customer, payment, and line item details.
            </section>
          ) : orderDetailQuery.isLoading ? (
            <section className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Spinner />
            </section>
          ) : orderDetailQuery.isError ? (
            <section className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-600 shadow-sm">
              <p>{extractErrorMessage(orderDetailQuery.error, 'Unable to load order details.')}</p>
              <div>
                <Button onClick={() => orderDetailQuery.refetch()} className="px-3 py-2 text-xs font-semibold">
                  Retry
                </Button>
              </div>
            </section>
          ) : orderDetailQuery.data ? (
            <OrderDetailPanel
              order={orderDetailQuery.data}
              baseCurrency={baseCurrency}
              onClose={() => setSelectedOrderId(null)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
