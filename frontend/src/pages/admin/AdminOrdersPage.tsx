import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DataTable from '../../components/DataTable';
import Spinner from '../../components/Spinner';
import Button from '../../components/Button';
import OrderDetailPanel from '../../components/orders/OrderDetailPanel';
import OrderEditorModal from './components/OrderEditor';
import { adminApi } from '../../services/http';
import type { OrderDetail, OrderListItem } from '../../types/orders';
import type { PermissionKey } from '../../types/auth';
import { useAppSelector } from '../../app/hooks';
import { selectBaseCurrency } from '../../features/settings/selectors';
import { extractErrorMessage } from '../../utils/errors';
import { formatCurrency } from '../../utils/currency';
import { hasAnyPermission } from '../../utils/permissions';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import OrderEditor from './components/OrderEditor';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeOrdersResponse = (payload: unknown): OrderListItem[] => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is OrderListItem => isRecord(item) && typeof item.id === 'number')
      .map((item) => ({
        ...item,
        lines: Array.isArray(item.lines) ? item.lines : []
      }));
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.data)) {
      return normalizeOrdersResponse(payload.data);
    }
    if (Array.isArray(payload.content)) {
      return normalizeOrdersResponse(payload.content);
    }
  }

  return [];
};

const isOrdersPageRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const mapOrdersPayload = (payload: unknown): OrderListItem[] => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is OrderListItem => isOrdersPageRecord(item) && typeof item.id === 'number')
      .map((item) => ({
        ...item,
        lines: Array.isArray(item.lines) ? item.lines : []
      }));
  }

  if (isOrdersPageRecord(payload)) {
    if (Array.isArray(payload.data)) {
      return mapOrdersPayload(payload.data);
    }
    if (Array.isArray(payload.content)) {
      return mapOrdersPayload(payload.content);
    }
  }

  return [];
};

const mapOrderDetailPayload = (payload: unknown): OrderDetail | null => {
  if (Array.isArray(payload)) {
    return payload.length ? mapOrderDetailPayload(payload[0]) : null;
  }

  if (isOrdersPageRecord(payload)) {
    if (payload.data) {
      return mapOrderDetailPayload(payload.data);
    }

    if (typeof payload.id === 'number') {
      const detailRecord = payload as Record<string, unknown>;
      const lines = Array.isArray(detailRecord.lines)
        ? (detailRecord.lines as unknown as OrderDetail['lines'])
        : [];
      const summary = isOrdersPageRecord(detailRecord.summary)
        ? (detailRecord.summary as unknown as OrderDetail['summary'])
        : null;
      const shippingAddress = isOrdersPageRecord(detailRecord.shippingAddress)
        ? (detailRecord.shippingAddress as unknown as OrderDetail['shippingAddress'])
        : null;
      const billingAddress = isOrdersPageRecord(detailRecord.billingAddress)
        ? (detailRecord.billingAddress as unknown as OrderDetail['billingAddress'])
        : null;
      const paymentMethod = isOrdersPageRecord(detailRecord.paymentMethod)
        ? (detailRecord.paymentMethod as unknown as OrderDetail['paymentMethod'])
        : null;

      return {
        ...(detailRecord as unknown as OrderDetail),
        lines,
        summary,
        shippingAddress,
        billingAddress,
        paymentMethod
      };
    }
  }

  return null;
};

const formatOrdersDateTime = (value: string | null | undefined) => {
  if (!value) {
    return 'Unknown date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

type EditorState = { type: 'create' } | { type: 'edit'; order: OrderDetail };

const AdminOrdersPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const permissions = (useAppSelector((state) => state.auth.permissions) ?? []) as PermissionKey[];
  const { notify } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const canViewOrders = useMemo(
    () =>
      hasAnyPermission(permissions, ['ORDER_VIEW_GLOBAL', 'ORDER_CREATE', 'ORDER_EDIT', 'ORDER_DELETE']),
    [permissions]
  );
  const canCreateOrders = useMemo(() => hasAnyPermission(permissions, ['ORDER_CREATE']), [permissions]);
  const canEditOrders = useMemo(() => hasAnyPermission(permissions, ['ORDER_EDIT']), [permissions]);
  const canDeleteOrders = useMemo(() => hasAnyPermission(permissions, ['ORDER_DELETE']), [permissions]);

  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  const fetchOrderDetail = useCallback(async (orderId: number) => {
    const { data } = await adminApi.get<unknown>(`/orders/${orderId}`);
    return normalizeOrderDetailResponse(data);
  }, []);

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    enabled: canViewOrders,
    queryFn: async () => {
      const { data } = await adminApi.get<unknown>('/orders');
      return normalizeOrdersResponse(data);
    }
  });

  const orderDetailQuery = useQuery<OrderDetail | null>({
    queryKey: ['orders', 'admin', 'detail', detailOrderId],
    enabled: detailOrderId != null,
    queryFn: async () => {
      if (detailOrderId == null) {
        return null;
      }
      return fetchOrderDetail(detailOrderId);
    }
  });

  const fetchOrderDetail = useCallback(async (orderId: number) => {
    const { data } = await adminApi.get<unknown>(`/orders/${orderId}`);
    return normalizeOrderDetailResponse(data);
  }, []);

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    enabled: canViewOrders,
    queryFn: async () => {
      const { data } = await adminApi.get<unknown>('/orders');
      return normalizeOrdersResponse(data);
    }
  });

  const orderDetailQuery = useQuery<OrderDetail | null>({
    queryKey: ['orders', 'admin', 'detail', detailOrderId],
    enabled: detailOrderId != null,
    queryFn: async () => {
      if (detailOrderId == null) {
        return null;
      }
      return fetchOrderDetail(detailOrderId);
    }
  });

  const fetchOrderDetail = useCallback(async (orderId: number) => {
    const { data } = await adminApi.get<unknown>(`/orders/${orderId}`);
    return normalizeOrderDetailResponse(data);
  }, []);

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    enabled: canViewOrders,
    queryFn: async () => {
      const { data } = await adminApi.get<unknown>('/orders');
      return normalizeOrdersResponse(data);
    }
  });

  const orderDetailQuery = useQuery<OrderDetail | null>({
    queryKey: ['orders', 'admin', 'detail', detailOrderId],
    enabled: detailOrderId != null,
    queryFn: async () => {
      if (detailOrderId == null) {
        return null;
      }
      return fetchOrderDetail(detailOrderId);
    }
  });

  const fetchOrderDetail = useCallback(async (orderId: number) => {
    const { data } = await adminApi.get<unknown>(`/orders/${orderId}`);
    return normalizeOrderDetailResponse(data);
  }, []);

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    enabled: canViewOrders,
    queryFn: async () => {
      const { data } = await adminApi.get<unknown>('/orders');
      return normalizeOrdersResponse(data);
    }
  });

  const orderDetailQuery = useQuery<OrderDetail | null>({
    queryKey: ['orders', 'admin', 'detail', detailOrderId],
    enabled: detailOrderId != null,
    queryFn: async () => {
      if (detailOrderId == null) {
        return null;
      }
      return fetchOrderDetail(detailOrderId);
    }
  });

  const fetchOrderDetail = useCallback(async (orderId: number) => {
    const { data } = await adminApi.get<unknown>(`/orders/${orderId}`);
    return mapOrderDetailPayload(data);
  }, []);

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    enabled: canViewOrders,
    queryFn: async () => {
      const { data } = await adminApi.get<unknown>('/orders');
      return mapOrdersPayload(data);
    }
  });

  const orderDetailQuery = useQuery<OrderDetail | null>({
    queryKey: ['orders', 'admin', 'detail', detailOrderId],
    enabled: detailOrderId != null,
    queryFn: async () => {
      if (detailOrderId == null) {
        return null;
      }
      return fetchOrderDetail(detailOrderId);
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await adminApi.delete(`/orders/${orderId}`);
    },
    onMutate: (orderId) => {
      setDeletingOrderId(orderId);
    },
    onSuccess: (_, orderId) => {
      notify({ title: 'Order deleted', message: 'The order was removed successfully.', type: 'success' });
      if (detailOrderId === orderId) {
        setDetailOrderId(null);
      }
      setEditorState((current) => (current?.type === 'edit' && current.order.id === orderId ? null : current));
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

  const handleDeleteOrder = useCallback(
    async (orderId: number, orderNumber?: string | null) => {
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
    },
    [canDeleteOrders, confirm, deleteOrderMutation]
  );

  const openDetail = useCallback((orderId: number) => {
    setDetailOrderId(orderId);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOrderId(null);
  }, []);

  const openEditorForCreate = useCallback(() => {
    setEditorState({ type: 'create' });
  }, []);

  const openEditorForEdit = useCallback(
    async (orderId: number) => {
      try {
        const existing = (await queryClient.fetchQuery({
          queryKey: ['orders', 'admin', 'detail', orderId],
          queryFn: () => fetchOrderDetail(orderId)
        })) as OrderDetail | null;
        if (!existing) {
          notify({
            type: 'error',
            title: 'Order unavailable',
            message: 'The selected order could not be loaded for editing.'
          });
          return;
        }
        setEditorState({ type: 'edit', order: existing });
      } catch (error) {
        notify({
          type: 'error',
          title: 'Unable to load order',
          message: extractErrorMessage(error, 'Try again later.')
        });
      }
    },
    [fetchOrderDetail, notify, queryClient]
  );

  if (!canViewOrders) {
    return (
      <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-10 text-center shadow">
        <h1 className="text-xl font-semibold text-amber-800">Orders access is restricted</h1>
        <p className="text-sm text-amber-700">
          You do not have permission to view orders. Contact an administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

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

  const orders = ordersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">
            Review customer purchases, inspect order details, and take action based on assigned permissions.
          </p>
        </div>
        {canCreateOrders && (
          <Button type="button" onClick={openEditorForCreate} disabled={editorState?.type === 'create'}>
            {editorState?.type === 'create' ? 'Creating…' : 'Create order'}
          </Button>
        )}
      </div>

      <DataTable
        title="Orders"
        actions={
          <div className="text-xs text-slate-400">
            {ordersQuery.isFetching ? 'Refreshing…' : `${orders.length} order${orders.length === 1 ? '' : 's'}`}
          </div>
        }
      >
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Order</th>
            <th className="px-4 py-3 text-left">Customer</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-left">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length ? (
            orders.map((order) => {
              const rowTotal = order.summary?.grandTotal ?? 0;
              return (
                <tr
                  key={order.id}
                  onClick={() => openDetail(order.id)}
                  className="cursor-pointer border-t border-slate-200 bg-white hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{order.customerName ?? 'Customer'}</div>
                    {order.customerEmail && <div className="text-xs text-slate-400">{order.customerEmail}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        order.status === 'PROCESSING'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {order.status ?? 'Processing'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(rowTotal, baseCurrency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatOrdersDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">
                    <div className="flex justify-end gap-2">
                      {canEditOrders && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3 py-2 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openEditorForEdit(order.id);
                          }}
                          disabled={editorState?.type === 'edit' && editorState.order.id === order.id}
                        >
                          Edit
                        </Button>
                      )}
                      {canDeleteOrders && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3 py-2 text-xs text-rose-600 hover:text-rose-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteOrder(order.id, order.orderNumber);
                          }}
                          disabled={deletingOrderId === order.id && deleteOrderMutation.isPending}
                        >
                          {deletingOrderId === order.id && deleteOrderMutation.isPending ? 'Deleting…' : 'Delete'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                No orders yet. Orders will appear automatically once customers complete checkout.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>

      {detailOrderId != null && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-10">
          <div className="relative w-full max-w-4xl">
            <div className="absolute right-6 top-6">
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-2xl">
              {orderDetailQuery.isLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <Spinner />
                </div>
              ) : orderDetailQuery.isError ? (
                <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-600">
                  <p>{extractErrorMessage(orderDetailQuery.error, 'Unable to load order details.')}</p>
                  <div>
                    <Button onClick={() => orderDetailQuery.refetch()} className="px-3 py-2 text-xs font-semibold">
                      Retry
                    </Button>
                  </div>
                </div>
              ) : orderDetailQuery.data ? (
                <div className="space-y-4">
                  {(canEditOrders || canDeleteOrders) && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {canEditOrders && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditorState({ type: 'edit', order: orderDetailQuery.data! })}
                          disabled={editorState?.type === 'edit' && editorState.order.id === orderDetailQuery.data!.id}
                        >
                          {editorState?.type === 'edit' && editorState.order.id === orderDetailQuery.data!.id
                            ? 'Editing order'
                            : 'Edit order'}
                        </Button>
                      )}
                      {canDeleteOrders && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="border border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() =>
                            void handleDeleteOrder(orderDetailQuery.data!.id, orderDetailQuery.data!.orderNumber)
                          }
                          disabled={
                            deletingOrderId === orderDetailQuery.data!.id && deleteOrderMutation.isPending
                          }
                        >
                          {deletingOrderId === orderDetailQuery.data!.id && deleteOrderMutation.isPending
                            ? 'Deleting…'
                            : 'Delete order'}
                        </Button>
                      )}
                    </div>
                  )}
                  <OrderDetailPanel
                    order={orderDetailQuery.data}
                    baseCurrency={baseCurrency}
                    onClose={closeDetail}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {editorState && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-10">
          <div className="w-full max-w-5xl">
            <OrderEditorModal
              mode={editorState.type === 'create' ? 'create' : 'edit'}
              baseCurrency={baseCurrency}
              initialOrder={editorState.type === 'edit' ? editorState.order : undefined}
              onCancel={() => setEditorState(null)}
              onSaved={(order) => {
                setEditorState(null);
                setDetailOrderId(order.id);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
