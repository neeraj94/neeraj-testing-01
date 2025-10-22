import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import PageSection from '../../components/PageSection';
import Spinner from '../../components/Spinner';
import Button from '../../components/Button';
import OrderEditor from './components/OrderEditor';
import { adminApi } from '../../services/http';
import { useAppSelector } from '../../app/hooks';
import { selectBaseCurrency } from '../../features/settings/selectors';
import { extractErrorMessage } from '../../utils/errors';
import type { OrderDetail } from '../../types/orders';
import type { User } from '../../types/models';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

const buildCustomerDisplayName = (user: User): string => {
  const parts: string[] = [];
  if (typeof user.firstName === 'string' && user.firstName.trim()) {
    parts.push(user.firstName.trim());
  }
  if (typeof user.lastName === 'string' && user.lastName.trim()) {
    parts.push(user.lastName.trim());
  }
  if (parts.length) {
    return parts.join(' ');
  }
  if (typeof user.fullName === 'string' && user.fullName.trim()) {
    return user.fullName.trim();
  }
  if (typeof user.email === 'string' && user.email.trim()) {
    return user.email.trim();
  }
  return `Customer #${user.id}`;
};

const AdminOrderEditorPage = () => {
  const navigate = useNavigate();
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const { orderId: orderIdParam } = useParams();
  const [searchParams] = useSearchParams();

  const mode: 'create' | 'edit' = orderIdParam ? 'edit' : 'create';
  const parsedOrderId = orderIdParam ? Number(orderIdParam) : null;
  const orderId = Number.isFinite(parsedOrderId) ? parsedOrderId : null;

  const initialCustomerIdParam = searchParams.get('customerId');
  const initialCustomerId = initialCustomerIdParam ? Number(initialCustomerIdParam) : null;

  const orderQuery = useQuery<OrderDetail | null>({
    queryKey: ['orders', 'admin', 'detail', orderId],
    enabled: mode === 'edit' && orderId != null,
    queryFn: async () => {
      if (orderId == null) {
        return null;
      }
      const { data } = await adminApi.get<unknown>(`/orders/${orderId}`);
      return normalizeOrderDetailResponse(data);
    }
  });

  const initialCustomerQuery = useQuery<User | null>({
    queryKey: ['orders', 'admin', 'initialCustomer', initialCustomerId],
    enabled: mode === 'create' && initialCustomerId != null,
    queryFn: async () => {
      if (initialCustomerId == null) {
        return null;
      }
      const { data } = await adminApi.get<User>(`/users/${initialCustomerId}`);
      return data ?? null;
    }
  });

  const initialCustomer = useMemo(() => {
    if (!initialCustomerQuery.data) {
      return null;
    }
    const user = initialCustomerQuery.data;
    if (user.id == null) {
      return null;
    }
    return {
      id: user.id,
      fullName: buildCustomerDisplayName(user),
      email: user.email ?? null
    };
  }, [initialCustomerQuery.data]);

  const handleCancel = () => {
    navigate('/admin/orders');
  };

  const handleSaved = () => {
    navigate('/admin/orders');
  };

  const renderEditor = () => {
    if (mode === 'edit') {
      if (orderId == null) {
        return (
          <PageSection title="Order not found">
            <p className="text-sm text-slate-600">
              The requested order ID is invalid. Return to the orders list and try again.
            </p>
            <div className="mt-4">
              <Button type="button" onClick={handleCancel}>
                Back to orders
              </Button>
            </div>
          </PageSection>
        );
      }

      if (orderQuery.isLoading) {
        return (
          <section className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Spinner />
          </section>
        );
      }

      if (orderQuery.isError) {
        return (
          <PageSection title="Unable to load order">
            <p className="text-sm text-rose-600">
              {extractErrorMessage(orderQuery.error, 'We could not load the order details. Please return to the list and try again.')}
            </p>
            <div className="mt-4">
              <Button type="button" onClick={handleCancel}>
                Back to orders
              </Button>
            </div>
          </PageSection>
        );
      }

      if (!orderQuery.data) {
        return (
          <PageSection title="Order unavailable">
            <p className="text-sm text-slate-600">
              The requested order could not be found or has been removed.
            </p>
            <div className="mt-4">
              <Button type="button" onClick={handleCancel}>
                Back to orders
              </Button>
            </div>
          </PageSection>
        );
      }

      return (
        <OrderEditor
          mode="edit"
          baseCurrency={baseCurrency}
          initialOrder={orderQuery.data}
          onCancel={handleCancel}
          onSaved={handleSaved}
        />
      );
    }

    return (
      <div className="space-y-4">
        {initialCustomerQuery.isError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {extractErrorMessage(initialCustomerQuery.error, 'Unable to load the selected customer. You can still create an order manually.')}
          </div>
        ) : null}
        <OrderEditor
          mode="create"
          baseCurrency={baseCurrency}
          initialCustomer={initialCustomer}
          onCancel={handleCancel}
          onSaved={handleSaved}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title={mode === 'create' ? 'Create order' : 'Edit order'}
        description={
          mode === 'create'
            ? 'Assemble a manual order, pick items from the catalog, and trigger fulfillment directly from the admin panel.'
            : 'Update line items, shipping, payment, and totals for this order without leaving the admin workspace.'
        }
        actions={
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Back to orders
          </Button>
        }
      />

      {renderEditor()}
    </div>
  );
};

export default AdminOrderEditorPage;
