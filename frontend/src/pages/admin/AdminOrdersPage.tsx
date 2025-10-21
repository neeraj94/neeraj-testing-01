import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/http';
import type { OrderDetail, OrderListItem } from '../../types/orders';
import type { PermissionKey } from '../../types/auth';
import Spinner from '../../components/Spinner';
import { formatCurrency } from '../../utils/currency';
import { useAppSelector } from '../../app/hooks';
import { selectBaseCurrency } from '../../features/settings/selectors';
import OrderDetailPanel from '../../components/orders/OrderDetailPanel';
import Button from '../../components/Button';
import { extractErrorMessage } from '../../utils/errors';
import { hasAnyPermission } from '../../utils/permissions';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const AdminOrdersPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const permissions = (useAppSelector((state) => state.auth.permissions) ?? []) as PermissionKey[];
  const { notify } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const canDeleteOrders = useMemo(() => hasAnyPermission(permissions, ['ORDER_DELETE']), [permissions]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await adminApi.delete(`/orders/${orderId}`);
    },
    onMutate: (orderId) => {
      setDeletingOrderId(orderId);
    },
    onSuccess: (_, orderId) => {
      notify({ title: 'Order deleted', message: 'The order was removed successfully.', type: 'success' });
      setSelectedOrderId((current) => (current === orderId ? null : current));
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin', 'detail', orderId] });
    },
    onError: (error) => {
      notify({
        title: 'Unable to delete order',
        message: extractErrorMessage(error, 'Try again later.'),
        type: 'error'
      });
    },
    onSettled: () => {
      setDeletingOrderId(null);
    }
  });

  const handleDeleteOrder = async (orderId: number, orderNumber?: string | null) => {
    if (!canDeleteOrders || deleteOrderMutation.isPending) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete order?',
      description: `Delete order ${orderNumber && orderNumber.trim() ? orderNumber : `#${orderId}`}? This action cannot be undone.`,
      confirmLabel: 'Delete order',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteOrderMutation.mutateAsync(orderId);
  };

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    queryFn: async () => {
      const { data } = await adminApi.get<OrderListItem[]>('/orders');
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
      const { data } = await adminApi.get<OrderDetail>(`/orders/${selectedOrderId}`);
      return data;
    }
  });

  const selectedOrder = orderDetailQuery.data ?? null;

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

  const hasOrders = orders.length > 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">
          Review recent purchases placed through the checkout experience and drill into the full order details.
        </p>
      </header>

      {hasOrders ? (
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="space-y-3">
            {orders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">Placed {formatDateTime(order.createdAt)}</p>
                      <div className="text-xs text-slate-500">
                        {order.customerName ?? 'Customer'}
                        {order.customerEmail ? (
                          <span className="block text-[11px] text-slate-400">{order.customerEmail}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          order.status === 'PROCESSING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {order.status ?? 'Processing'}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(order.summary?.grandTotal ?? 0, baseCurrency)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div>
            {selectedOrderId == null ? (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Select an order from the list to review payment, shipping, and line item details.
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
            ) : selectedOrder ? (
              <div className="space-y-4">
                {canDeleteOrders && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => void handleDeleteOrder(selectedOrder.id, selectedOrder.orderNumber)}
                      disabled={deletingOrderId === selectedOrder.id && deleteOrderMutation.isPending}
                      className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingOrderId === selectedOrder.id && deleteOrderMutation.isPending
                        ? 'Deleting…'
                        : 'Delete order'}
                    </Button>
                  </div>
                )}
                <OrderDetailPanel
                  order={selectedOrder}
                  baseCurrency={baseCurrency}
                  onClose={() => setSelectedOrderId(null)}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">No orders yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Orders will appear here automatically once customers complete checkout.
          </p>
        </section>
      )}
    </div>
  );
};

export default AdminOrdersPage;
