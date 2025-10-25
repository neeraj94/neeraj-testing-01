import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import PageSection from '../../components/PageSection';
import Spinner from '../../components/Spinner';
import Button from '../../components/Button';
import OrderDetailPanel from '../../components/orders/OrderDetailPanel';
import { adminApi } from '../../services/http';
import { useAppSelector } from '../../app/hooks';
import { selectBaseCurrency } from '../../features/settings/selectors';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { formatCurrency } from '../../utils/currency';
import { extractErrorMessage } from '../../utils/errors';
import { hasAnyPermission } from '../../utils/permissions';
import type { PermissionKey } from '../../types/auth';
import type { OrderDetail, OrderListItem } from '../../types/orders';

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

const normalizeOrderDetailResponse = (payload: unknown): OrderDetail | null => {
  if (Array.isArray(payload)) {
    return payload.length ? normalizeOrderDetailResponse(payload[0]) : null;
  }

  if (isRecord(payload)) {
    if (payload.data) {
      return normalizeOrderDetailResponse(payload.data);
    }

    if (typeof payload.id === 'number') {
      const detailRecord = payload as Record<string, unknown>;
      const lines = Array.isArray(detailRecord.lines)
        ? (detailRecord.lines as unknown as OrderDetail['lines'])
        : [];
      const summary = isRecord(detailRecord.summary)
        ? (detailRecord.summary as unknown as OrderDetail['summary'])
        : null;
      const shippingAddress = isRecord(detailRecord.shippingAddress)
        ? (detailRecord.shippingAddress as unknown as OrderDetail['shippingAddress'])
        : null;
      const billingAddress = isRecord(detailRecord.billingAddress)
        ? (detailRecord.billingAddress as unknown as OrderDetail['billingAddress'])
        : null;
      const paymentMethod = isRecord(detailRecord.paymentMethod)
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

const toStatusLabel = (value: string) =>
  value
    .toLowerCase()
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const AdminOrdersPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const permissions = (useAppSelector((state) => state.auth.permissions) ?? []) as PermissionKey[];
  const { notify } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const canViewOrders = useMemo(
    () =>
      hasAnyPermission(permissions, ['ORDER_VIEW_GLOBAL', 'ORDER_CREATE', 'ORDER_EDIT', 'ORDER_DELETE']),
    [permissions]
  );
  const canCreateOrders = useMemo(() => hasAnyPermission(permissions, ['ORDER_CREATE']), [permissions]);
  const canEditOrders = useMemo(() => hasAnyPermission(permissions, ['ORDER_EDIT']), [permissions]);
  const canDeleteOrders = useMemo(() => hasAnyPermission(permissions, ['ORDER_DELETE']), [permissions]);

  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
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
      setDetailOrderId((current) => (current === orderId ? null : current));
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

  const ordersQuery = useQuery<OrderListItem[]>({
    queryKey: ['orders', 'admin'],
    enabled: canViewOrders,
    queryFn: async () => {
      const { data } = await adminApi.get<unknown>('/orders');
      return normalizeOrdersResponse(data);
    }
  });

  const orders = ordersQuery.data ?? [];
  const hasOrders = orders.length > 0;

  const detailQuery = useQuery<OrderDetail | null>({
    queryKey: ['orders', 'admin', 'detail', detailOrderId],
    enabled: detailOrderId != null,
    queryFn: async () => {
      if (detailOrderId == null) {
        return null;
      }
      const { data } = await adminApi.get<unknown>(`/orders/${detailOrderId}`);
      return normalizeOrderDetailResponse(data);
    }
  });

  const handleDeleteOrder = async (orderId: number, orderNumber?: string | null) => {
    if (!canDeleteOrders || deleteOrderMutation.isPending) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete order?',
      description: `Delete order ${
        orderNumber && orderNumber.trim() ? orderNumber : `#${orderId}`
      }? This action cannot be undone.`,
      confirmLabel: 'Delete order',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteOrderMutation.mutateAsync(orderId);
  };

  const openDetail = (orderId: number) => {
    setDetailOrderId(orderId);
  };

  const closeDetail = () => {
    setDetailOrderId(null);
  };

  const formatPaymentStatus = (order: OrderListItem): string => {
    const raw = order.paymentStatus ?? (order.summary as Record<string, unknown> | null)?.paymentStatus;
    if (typeof raw === 'string' && raw.trim()) {
      return toStatusLabel(raw.replace(/_/g, ' '));
    }
    return '—';
  };

  if (!canViewOrders) {
    return (
      <div className="space-y-4 px-6 py-6">
        <PageSection padded={false} bodyClassName="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <h1 className="text-xl font-semibold text-amber-800">Orders access is restricted</h1>
          <p className="text-sm text-amber-700">
            You do not have permission to view orders. Contact an administrator if you believe this is a mistake.
          </p>
        </PageSection>
      </div>
    );
  }

  const renderOrdersTable = () => {
    if (ordersQuery.isLoading) {
      return (
        <PageSection
          title="Order list"
          description="Click on an order row to view customer, payment, and fulfillment details."
          padded={false}
          bodyClassName="flex min-h-[240px] items-center justify-center"
        >
          <Spinner />
        </PageSection>
      );
    }

    if (ordersQuery.isError) {
      const message = extractErrorMessage(ordersQuery.error, 'Unable to load orders.');
      return (
        <PageSection
          title="Unable to load orders"
          description={message}
          footer={
            <Button type="button" onClick={() => ordersQuery.refetch()}>
              Try again
            </Button>
          }
        >
          <p className="text-sm text-slate-600">
            Check your connection and try refreshing. If the problem persists, contact support.
          </p>
        </PageSection>
      );
    }

    return (
      <PageSection
        title="Order list"
        description="Click on an order row to view customer, payment, and fulfillment details."
        padded={false}
        bodyClassName="flex max-h-[460px] flex-col overflow-hidden lg:max-h-[calc(100vh-280px)]"
      >
        <div className="overflow-x-auto">
          <div className="max-h-[420px] overflow-y-auto pr-1 lg:max-h-[calc(100vh-320px)] lg:pr-0">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Order
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Payment
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Total
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                  {(canEditOrders || canDeleteOrders) && (
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {hasOrders
                  ? orders.map((order) => {
                      const statusTone =
                        order.status === 'PROCESSING'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700';
                      const isSelected = detailOrderId === order.id;
                      return (
                        <tr
                          key={order.id}
                          tabIndex={0}
                          onClick={() => openDetail(order.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openDetail(order.id);
                            }
                          }}
                          aria-current={isSelected ? 'true' : undefined}
                          className={`cursor-pointer align-top text-[13px] transition ${
                            isSelected
                              ? 'bg-blue-50/70 ring-1 ring-inset ring-primary/40'
                              : 'hover:bg-blue-50/40'
                          }`}
                        >
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                              <span className="text-[11px] uppercase tracking-wide text-slate-400">#{order.id}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-slate-900">
                                {order.customerName ?? 'Customer'}
                              </span>
                              {order.customerEmail && (
                                <span className="text-[11px] text-slate-500">{order.customerEmail}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusTone}`}
                            >
                              {order.status ?? 'Processing'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{formatPaymentStatus(order)}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {formatCurrency(order.summary?.grandTotal ?? 0, baseCurrency)}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{formatDateTime(order.createdAt)}</td>
                          {(canEditOrders || canDeleteOrders) && (
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-2">
                                {canEditOrders && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setDetailOrderId(null);
                                      navigate(`/admin/orders/${order.id}/edit`);
                                    }}
                                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Edit
                                  </button>
                                )}
                                {canDeleteOrders && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleDeleteOrder(order.id, order.orderNumber);
                                    }}
                                    disabled={
                                      deletingOrderId === order.id && deleteOrderMutation.isPending
                                    }
                                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {deletingOrderId === order.id && deleteOrderMutation.isPending
                                      ? 'Deleting…'
                                      : 'Delete'}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  : (
                    <tr>
                      <td
                        colSpan={canEditOrders || canDeleteOrders ? 7 : 6}
                        className="px-4 py-6 text-center text-sm text-slate-500"
                      >
                        No orders found. Orders will appear automatically once customers complete checkout.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </PageSection>
    );
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Orders"
        description="Review purchases placed through checkout, manage manual orders, and monitor their fulfillment status."
        actions={
          canCreateOrders
            ? (
                <Button
                  type="button"
                  onClick={() => navigate('/admin/orders/new')}
                >
                  Create order
                </Button>
              )
            : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr] xl:grid-cols-[minmax(0,400px)_1fr]">
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {renderOrdersTable()}
        </div>
        <PageSection
          title="Order details"
          description="Inspect the selected order’s customer information, balances, and fulfillment progress."
        >
          {detailOrderId == null ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Choose an order from the list to view its summary, payment status, and fulfillment details here.
            </div>
          ) : detailQuery.isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Spinner />
            </div>
          ) : detailQuery.isError ? (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-600">
              <p>{extractErrorMessage(detailQuery.error, 'Unable to load order details.')}</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => detailQuery.refetch()}>
                  Retry
                </Button>
                <Button type="button" variant="ghost" onClick={closeDetail}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : detailQuery.data ? (
            <OrderDetailPanel
              order={detailQuery.data}
              baseCurrency={baseCurrency}
              onClose={closeDetail}
              actions={
                <>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Payment
                  </button>
                </>
              }
            />
          ) : null}
        </PageSection>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
