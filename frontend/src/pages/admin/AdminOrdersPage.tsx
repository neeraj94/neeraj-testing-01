import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Button from '../../components/Button';
import DataTable from '../../components/DataTable';
import PaginationControls from '../../components/PaginationControls';
import OrderDetailPanel from '../../components/orders/OrderDetailPanel';
import OrderEditor from './components/OrderEditor';
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

const resolvePaymentMethodLabel = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (!isRecord(value)) {
    return null;
  }
  const displayName = value.displayName;
  if (typeof displayName === 'string' && displayName.trim()) {
    return displayName.trim();
  }
  const name = value.name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }
  const method = value.method;
  if (typeof method === 'string' && method.trim()) {
    return method.trim();
  }
  return null;
};

const normalizeOrdersResponse = (payload: unknown): OrderListItem[] => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.id === 'number')
      .map((item) => {
        const summary = isRecord(item.summary) ? (item.summary as unknown as OrderListItem['summary']) : null;
        const lines = Array.isArray(item.lines) ? (item.lines as unknown as OrderListItem['lines']) : [];
        const dueDate = typeof item.dueDate === 'string' ? item.dueDate : summary?.dueDate ?? null;
        const notes = typeof item.notes === 'string' ? item.notes : summary?.notes ?? null;
        const summaryPaymentStatus =
          typeof summary?.paymentStatus === 'string' && summary.paymentStatus.trim()
            ? summary.paymentStatus
            : null;
        const paymentStatus =
          typeof item.paymentStatus === 'string' && item.paymentStatus.trim()
            ? item.paymentStatus
            : summaryPaymentStatus;

        const paymentMethodLabel =
          resolvePaymentMethodLabel(item.paymentMethod) ??
          resolvePaymentMethodLabel(summary?.paymentMethod);

        return {
          id: item.id as number,
          orderNumber: typeof item.orderNumber === 'string' ? item.orderNumber : `#${item.id}`,
          status: typeof item.status === 'string' ? item.status : 'PROCESSING',
          customerId: typeof item.customerId === 'number' ? item.customerId : null,
          customerName: typeof item.customerName === 'string' ? item.customerName : null,
          customerEmail: typeof item.customerEmail === 'string' ? item.customerEmail : null,
          paymentStatus,
          paymentMethodLabel,
          summary,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          lines,
          dueDate,
          notes
        } satisfies OrderListItem;
      });
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
      const summary = isRecord(detailRecord.summary)
        ? (detailRecord.summary as unknown as OrderDetail['summary'])
        : null;
      const lines = Array.isArray(detailRecord.lines)
        ? (detailRecord.lines as unknown as OrderDetail['lines'])
        : [];
      const shippingAddress = isRecord(detailRecord.shippingAddress)
        ? (detailRecord.shippingAddress as unknown as OrderDetail['shippingAddress'])
        : null;
      const billingAddress = isRecord(detailRecord.billingAddress)
        ? (detailRecord.billingAddress as unknown as OrderDetail['billingAddress'])
        : null;
      const paymentMethod = isRecord(detailRecord.paymentMethod)
        ? (detailRecord.paymentMethod as unknown as OrderDetail['paymentMethod'])
        : null;
      const paymentMethodLabel =
        resolvePaymentMethodLabel(detailRecord.paymentMethod) ??
        resolvePaymentMethodLabel(summary?.paymentMethod);
      const dueDate = typeof detailRecord.dueDate === 'string' ? detailRecord.dueDate : summary?.dueDate ?? null;
      const notes = typeof detailRecord.notes === 'string' ? detailRecord.notes : summary?.notes ?? null;
      const summaryPaymentStatus =
        typeof summary?.paymentStatus === 'string' && summary.paymentStatus.trim()
          ? summary.paymentStatus
          : null;
      const paymentStatus =
        typeof detailRecord.paymentStatus === 'string' && detailRecord.paymentStatus.trim()
          ? (detailRecord.paymentStatus as string)
          : summaryPaymentStatus;

      return {
        ...(detailRecord as unknown as OrderDetail),
        lines,
        summary,
        shippingAddress,
        billingAddress,
        paymentMethod,
        dueDate,
        notes,
        paymentStatus,
        paymentMethodLabel
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

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return 'No due date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No due date';
  }
  return date.toLocaleDateString();
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'partially-paid', label: 'Partially Paid' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'processing', label: 'Processing' },
  { key: 'cancelled', label: 'Cancelled' }
] as const;

type StatusFilterKey = (typeof STATUS_FILTERS)[number]['key'];
type PanelMode = 'view' | 'payment';

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
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [panelMode, setPanelMode] = useState<PanelMode>('view');
  const [isInlineEditing, setIsInlineEditing] = useState(false);

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
      setPanelMode('view');
      setIsInlineEditing(false);
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

  const getPaymentStatus = useCallback((order: OrderListItem): string | null => {
    const summaryStatus = order.summary?.paymentStatus;
    if (typeof order.paymentStatus === 'string' && order.paymentStatus.trim()) {
      return order.paymentStatus;
    }
    if (typeof summaryStatus === 'string' && summaryStatus.trim()) {
      return summaryStatus;
    }
    return null;
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilterKey, number> = {
      all: orders.length,
      paid: 0,
      'partially-paid': 0,
      unpaid: 0,
      processing: 0,
      cancelled: 0
    };

    orders.forEach((order) => {
      const tokens = new Set<string>();
      const orderStatus = order.status?.toLowerCase().replace(/\s+/g, '-');
      const paymentStatus = getPaymentStatus(order)?.toLowerCase().replace(/\s+/g, '-');
      if (orderStatus) {
        tokens.add(orderStatus);
      }
      if (paymentStatus) {
        tokens.add(paymentStatus);
      }
      if (tokens.has('paid')) {
        counts.paid += 1;
      }
      if (tokens.has('partially-paid')) {
        counts['partially-paid'] += 1;
      }
      if (tokens.has('unpaid')) {
        counts.unpaid += 1;
      }
      if (tokens.has('processing')) {
        counts.processing += 1;
      }
      if (tokens.has('cancelled')) {
        counts.cancelled += 1;
      }
    });

    return counts;
  }, [orders, getPaymentStatus]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const tokens = new Set<string>();
      const orderStatus = order.status?.toLowerCase().replace(/\s+/g, '-');
      const paymentStatus = getPaymentStatus(order)?.toLowerCase().replace(/\s+/g, '-');
      if (orderStatus) {
        tokens.add(orderStatus);
      }
      if (paymentStatus) {
        tokens.add(paymentStatus);
      }

      const matchesStatus = statusFilter === 'all' ? true : tokens.has(statusFilter);
      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const searchCandidates = [
        order.orderNumber,
        `#${order.id}`,
        order.customerName ?? undefined,
        order.customerEmail ?? undefined,
        getPaymentStatus(order) ?? undefined,
        order.status ?? undefined,
        order.paymentMethodLabel ?? undefined,
        order.dueDate ?? undefined,
        order.summary?.dueDate ?? undefined,
        order.summary?.grandTotal?.toString() ?? undefined
      ];

      return searchCandidates.some((candidate) =>
        candidate ? candidate.toLowerCase().includes(normalizedSearchTerm) : false
      );
    });
  }, [orders, statusFilter, normalizedSearchTerm, getPaymentStatus]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, normalizedSearchTerm]);

  useEffect(() => {
    const totalPages = Math.max(Math.ceil(filteredOrders.length / pageSize), 1);
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [filteredOrders.length, page, pageSize]);

  useEffect(() => {
    if (detailOrderId == null) {
      return;
    }
    const existsInFiltered = filteredOrders.some((order) => order.id === detailOrderId);
    if (!existsInFiltered) {
      setDetailOrderId(null);
      setPanelMode('view');
      setIsInlineEditing(false);
    }
  }, [detailOrderId, filteredOrders]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({
      orderId,
      payload
    }: {
      orderId: number;
      payload: Record<string, unknown>;
    }) => {
      const { data } = await adminApi.patch<unknown>(`/orders/${orderId}`, payload);
      return normalizeOrderDetailResponse(data);
    },
    onSuccess: (updatedOrder, variables) => {
      notify({ title: 'Order updated', message: 'Changes saved successfully.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
      if (updatedOrder) {
        queryClient.setQueryData<OrderDetail | null>(
          ['orders', 'admin', 'detail', variables.orderId],
          () => updatedOrder
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['orders', 'admin', 'detail', variables.orderId] });
      }
    },
    onError: (error) => {
      notify({
        title: 'Unable to update order',
        message: extractErrorMessage(error, 'Try again later.'),
        type: 'error'
      });
    }
  });

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
    setPanelMode('view');
    setIsInlineEditing(false);
  };

  const closeDetail = () => {
    setDetailOrderId(null);
    setPanelMode('view');
    setIsInlineEditing(false);
  };

  const formatPaymentStatus = (order: OrderListItem): string => {
    const status = getPaymentStatus(order);
    if (typeof status === 'string' && status.trim()) {
      return status
        .toLowerCase()
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
        .replace(/_/g, ' ');
    }
    return '—';
  };

  const paginatedOrders = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, page, pageSize]);

  const showSplitView = detailOrderId != null;
  const detailOrder = detailQuery.data;

  const dataTableToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_FILTERS.map((filter) => {
        const count = filter.key === 'all' ? statusCounts.all : statusCounts[filter.key];
        const isActive = statusFilter === filter.key;
        return (
          <button
            type="button"
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{filter.label}</span>
            <span className="text-[10px] font-bold opacity-80">{count}</span>
          </button>
        );
      })}
    </div>
  );

  const dataTableActions = (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative">
        <span className="sr-only">Search orders</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search orders…"
          className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-64"
        />
      </label>
      <select
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        defaultValue=""
        aria-label="Batch actions"
      >
        <option value="" disabled>
          Batch actions
        </option>
        <option value="export-selected">Export selected</option>
        <option value="mark-paid">Mark as paid</option>
        <option value="cancel-orders">Cancel orders</option>
      </select>
      <button
        type="button"
        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
      >
        Export CSV
      </button>
    </div>
  );

  const dataTableFooter = (
    <PaginationControls
      page={page}
      pageSize={pageSize}
      totalElements={filteredOrders.length}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      isLoading={ordersQuery.isLoading}
    />
  );

  if (!canViewOrders) {
    return (
      <div className="space-y-4 px-6 py-6">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-amber-800">Orders access is restricted</h1>
          <p className="text-sm text-amber-700">
            You do not have permission to view orders. Contact an administrator if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const renderOrdersTable = () => {
    if (ordersQuery.isLoading) {
      return (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-white shadow-sm">
          <Spinner />
        </div>
      );
    }

    if (ordersQuery.isError) {
      const message = extractErrorMessage(ordersQuery.error, 'Unable to load orders.');
      return (
        <div className="space-y-4 rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Unable to load orders</h2>
            <p className="mt-1 text-slate-500">{message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => ordersQuery.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return (
      <DataTable
        title="Order list"
        actions={dataTableActions}
        toolbar={dataTableToolbar}
        footer={dataTableFooter}
      >
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">Order ID</th>
            <th scope="col" className="px-4 py-3 text-left">Customer</th>
            <th scope="col" className="px-4 py-3 text-left">Order date</th>
            <th scope="col" className="px-4 py-3 text-left">Total amount</th>
            <th scope="col" className="px-4 py-3 text-left">Status</th>
            <th scope="col" className="px-4 py-3 text-left">Payment method</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
          {paginatedOrders.length ? (
            paginatedOrders.map((order) => {
              const isSelected = detailOrderId === order.id;
              const statusTone = order.status === 'CANCELLED'
                ? 'bg-rose-100 text-rose-700'
                : order.status === 'PROCESSING'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700';
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
                  className={`cursor-pointer align-middle transition-colors duration-150 ${
                    isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/40' : 'hover:bg-primary/5'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                      <span className="text-xs text-slate-500">#{order.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{order.customerName ?? 'Customer'}</span>
                      {order.customerEmail ? (
                        <span className="text-xs text-slate-500">{order.customerEmail}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(order.summary?.grandTotal ?? 0, baseCurrency ?? undefined)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone}`}
                      >
                        {order.status?.replace(/_/g, ' ') ?? 'Processing'}
                      </span>
                      {order.dueDate || order.summary?.dueDate ? (
                        <span className="text-xs font-medium text-slate-500">
                          Due {formatDate(order.dueDate ?? order.summary?.dueDate)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">
                        {order.paymentMethodLabel ?? '—'}
                      </span>
                      <span className="text-xs text-slate-500">{formatPaymentStatus(order)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDetail(order.id);
                          setPanelMode('view');
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          detailOrderId === order.id && panelMode === 'view'
                            ? 'border-primary text-primary'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                        }`}
                      >
                        View
                      </button>
                      {canEditOrders && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailOrderId(order.id);
                          setPanelMode('view');
                          setIsInlineEditing(true);
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          isInlineEditing && detailOrderId === order.id
                            ? 'border-primary text-primary'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                        }`}
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
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                No orders match your filters yet. Try adjusting the search or status filters above.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    );
  };

  const renderDetailPane = () => {
    if (detailOrderId == null) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
          Choose an order from the list to inspect customer, payment, and fulfillment information.
        </div>
      );
    }

    if (detailQuery.isLoading) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-white p-12 shadow-sm">
          <Spinner />
        </div>
      );
    }

    if (detailQuery.isError) {
      return (
        <div className="space-y-3 rounded-2xl bg-white p-6 text-sm text-rose-600 shadow-sm">
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
      );
    }

    if (!detailOrder) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
          This order is no longer available.
        </div>
      );
    }

    const isDeleting = deletingOrderId === detailOrder.id && deleteOrderMutation.isPending;

    const handleOrderUpdates = async (updates: Record<string, unknown>) => {
      if (!detailOrderId || updateOrderMutation.isPending) {
        return;
      }
      await updateOrderMutation.mutateAsync({ orderId: detailOrderId, payload: updates });
    };

    return (
      <OrderDetailPanel
        order={detailOrder}
        baseCurrency={baseCurrency}
        onClose={closeDetail}
        mode={panelMode}
        editingEnabled={isInlineEditing && canEditOrders}
        canEdit={canEditOrders}
        isUpdating={updateOrderMutation.isPending}
        onUpdateField={handleOrderUpdates}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {canEditOrders ? (
              <button
                type="button"
                onClick={() => setIsInlineEditing((current) => !current)}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  isInlineEditing
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {isInlineEditing ? 'Editing' : 'Edit'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPanelMode((current) => (current === 'payment' ? 'view' : 'payment'))}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                panelMode === 'payment'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              Payment
            </button>
            {canDeleteOrders ? (
              <button
                type="button"
                onClick={() => {
                  void handleDeleteOrder(detailOrder.id, detailOrder.orderNumber);
                }}
                disabled={isDeleting}
                className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            ) : null}
          </div>
        }
      />
    );
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Orders"
        description="Review purchases placed through checkout, manage manual orders, and monitor their fulfillment status."
        actions={
          canCreateOrders ? (
            <Button type="button" onClick={() => navigate('/admin/orders/new')}>
              Create new order
            </Button>
          ) : undefined
        }
      />

      {showSplitView ? (
        <div className="grid gap-6 transition-[grid-template-columns] lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] xl:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]">
          <div className="space-y-4">{renderOrdersTable()}</div>
          <div className="space-y-4 transition-opacity duration-200">{renderDetailPane()}</div>
        </div>
      ) : (
        <div className="space-y-4">{renderOrdersTable()}</div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
