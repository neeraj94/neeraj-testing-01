import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { OrderListItem } from '../types/orders';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/formatting';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/settingsSelectors';

const AdminOrdersPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
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
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-medium text-blue-700">{order.orderNumber}</td>
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
            ))}
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
