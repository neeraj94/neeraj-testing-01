import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { OrderDetail, OrderListItem } from '../types/orders';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/currency';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import OrderDetailPanel from '../components/orders/OrderDetailPanel';
import Button from '../components/Button';
import { extractErrorMessage } from '../utils/errors';

const AdminOrdersPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    queryFn: async () => {
      const { data } = await api.get<OrderListItem[]>('/admin/orders');
      return data;
    }
  });

  const orders = ordersQuery.data ?? [];

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
        <h1 className="text-xl font-semibold text-rose-700">We couldn’t load orders</h1>
        <p className="text-sm text-rose-600">{message}</p>
        <div className="flex justify-center">
          <Button onClick={() => ordersQuery.refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">
          Review recent purchases placed through the checkout experience and drill into the full order details.
        </p>
      </header>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Order</th>
              <th className="px-5 py-3 text-left">Customer</th>
              <th className="px-5 py-3 text-left">Placed</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              return (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`cursor-pointer transition ${
                    isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-5 py-4 text-sm font-semibold text-blue-700">{order.orderNumber}</td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-slate-800">{order.customerName ?? 'Customer'}</div>
                    {order.customerEmail && <div className="text-xs text-slate-500">{order.customerEmail}</div>}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {new Date(order.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        order.status === 'PROCESSING'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {order.status ?? 'Processing'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(order.summary?.grandTotal ?? 0, baseCurrency)}
                  </td>
                </tr>
              );
            })}
            {!orders.length && (
              <tr>
                <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={5}>
                  No orders have been placed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        {selectedOrderId == null ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Select an order from the list above to view its full details.
          </div>
        ) : orderDetailQuery.isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Spinner />
          </div>
        ) : orderDetailQuery.isError ? (
          <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-600 shadow-sm">
            <p>{extractErrorMessage(orderDetailQuery.error, 'Unable to load order details.')}</p>
            <div>
              <Button
                onClick={() => orderDetailQuery.refetch()}
                className="px-3 py-2 text-xs font-semibold"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : orderDetailQuery.data ? (
          <OrderDetailPanel
            order={orderDetailQuery.data}
            baseCurrency={baseCurrency}
            onClose={() => setSelectedOrderId(null)}
          />
        ) : null}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
