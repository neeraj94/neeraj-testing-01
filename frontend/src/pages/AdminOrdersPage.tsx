import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { OrderListItem } from '../types/orders';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/currency';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';

const AdminOrdersPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    queryFn: async () => {
      const { data } = await api.get<OrderListItem[]>('/admin/orders');
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

  const orders = ordersQuery.data ?? [];

  const toggleOrder = (id: number) => {
    setExpandedOrderId((current) => (current === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">Review recent purchases placed through the checkout experience.</p>
      </header>
      <div className="overflow-hidden rounded border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-right">Products</th>
              <th className="px-4 py-3 text-right">Tax</th>
              <th className="px-4 py-3 text-right">Shipping</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const lines = order.lines ?? [];
              return (
                <Fragment key={order.id}>
                  <tr
                    onClick={() => toggleOrder(order.id)}
                    className={`cursor-pointer transition hover:bg-slate-50 ${
                      isExpanded ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition ${
                            isExpanded
                              ? 'border-blue-600 text-blue-600'
                              : 'border-slate-300 text-slate-500'
                          }`}
                        >
                          <span
                            className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            aria-hidden="true"
                          >
                            ›
                          </span>
                        </span>
                        <div>
                          <p className="font-medium text-blue-700">{order.orderNumber}</p>
                          <p className="text-xs text-slate-500">Click to view ordered products</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">{order.customerName ?? 'Customer'}</div>
                      <div className="text-xs text-slate-500">ID: {order.customerId}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(order.summary?.productTotal ?? 0, baseCurrency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(order.summary?.taxTotal ?? 0, baseCurrency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(order.summary?.shippingTotal ?? 0, baseCurrency)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(order.summary?.grandTotal ?? 0, baseCurrency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 px-6 py-4">
                        {lines.length ? (
                          <div className="space-y-3">
                            {lines.map((line, index) => {
                              const unitPrice = line.unitPrice ?? 0;
                              const computedTotal = line.lineTotal ?? unitPrice * line.quantity;
                              const taxRateLabel =
                                line.taxRate != null ? `${(line.taxRate * 100).toFixed(2)}%` : null;
                              return (
                              <div
                                key={`${order.id}-${line.productId ?? 'product'}-${index}`}
                                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{line.name ?? 'Product'}</p>
                                  <p className="text-xs text-slate-500">
                                    Qty {line.quantity} × {formatCurrency(unitPrice, baseCurrency)}
                                  </p>
                                  {line.productId != null && (
                                    <p className="text-xs text-slate-400">Product ID: {line.productId}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {formatCurrency(computedTotal, baseCurrency)}
                                  </p>
                                  {taxRateLabel && (
                                    <p className="text-xs text-slate-500">Tax rate: {taxRateLabel}</p>
                                  )}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                            No product lines were captured for this order.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!orders.length && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={7}>
                  No orders have been placed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
