import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminOrderPayload, OrderDetail } from '../../../types/orders';
import type { CheckoutAddress, CheckoutOrderLine, PaymentMethod } from '../../../types/checkout';
import { adminApi } from '../../../services/http';
import Spinner from '../../../components/Spinner';
import Button from '../../../components/Button';
import { formatCurrency } from '../../../utils/currency';
import { extractErrorMessage } from '../../../utils/errors';
import { useToast } from '../../../components/ToastProvider';

type OrderEditorMode = 'create' | 'edit';

type CustomerSummary = {
  id: number;
  name?: string | null;
  email?: string | null;
};

type PagedResponse<T> = {
  content?: T[];
};

type AddressFormState = {
  id: number | null;
  countryId: string;
  stateId: string;
  cityId: string;
  countryName: string;
  stateName: string;
  cityName: string;
  fullName: string;
  mobileNumber: string;
  pinCode: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
};

type OrderLineFormState = {
  key: string;
  productId: string;
  name: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  productSlug: string;
  variantId: string;
  variantSku: string;
  variantLabel: string;
};

const createLineKey = () => `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const createEmptyAddressState = (): AddressFormState => ({
  id: null,
  countryId: '',
  stateId: '',
  cityId: '',
  countryName: '',
  stateName: '',
  cityName: '',
  fullName: '',
  mobileNumber: '',
  pinCode: '',
  addressLine1: '',
  addressLine2: '',
  landmark: ''
});

const toAddressFormState = (address?: Partial<CheckoutAddress> | null): AddressFormState => ({
  id: address?.id ?? null,
  countryId: address?.countryId != null ? String(address.countryId) : '',
  stateId: address?.stateId != null ? String(address.stateId) : '',
  cityId: address?.cityId != null ? String(address.cityId) : '',
  countryName: address?.countryName ?? '',
  stateName: address?.stateName ?? '',
  cityName: address?.cityName ?? '',
  fullName: address?.fullName ?? '',
  mobileNumber: address?.mobileNumber ?? '',
  pinCode: address?.pinCode ?? '',
  addressLine1: address?.addressLine1 ?? '',
  addressLine2: address?.addressLine2 ?? '',
  landmark: address?.landmark ?? ''
});

const createEmptyLine = (): OrderLineFormState => ({
  key: createLineKey(),
  productId: '',
  name: '',
  quantity: '1',
  unitPrice: '0',
  taxRate: '',
  productSlug: '',
  variantId: '',
  variantSku: '',
  variantLabel: ''
});

const parseAmountInput = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseOptionalNumber = (value: string): number | null => {
  if (!value || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundCurrency = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

const isAddressEmpty = (form: AddressFormState): boolean =>
  !form.fullName.trim() &&
  !form.addressLine1.trim() &&
  !form.addressLine2.trim() &&
  !form.cityName.trim() &&
  !form.stateName.trim() &&
  !form.countryName.trim() &&
  !form.mobileNumber.trim() &&
  !form.pinCode.trim() &&
  !form.landmark.trim();

const toAddressPayload = (
  form: AddressFormState,
  type: 'SHIPPING' | 'BILLING'
): (Partial<CheckoutAddress> & { type: 'SHIPPING' | 'BILLING' }) | null => {
  if (isAddressEmpty(form)) {
    return null;
  }
  return {
    id: form.id ?? undefined,
    type,
    countryId: parseOptionalNumber(form.countryId),
    stateId: parseOptionalNumber(form.stateId),
    cityId: parseOptionalNumber(form.cityId),
    countryName: form.countryName.trim() || undefined,
    stateName: form.stateName.trim() || undefined,
    cityName: form.cityName.trim() || undefined,
    fullName: form.fullName.trim() || undefined,
    mobileNumber: form.mobileNumber.trim() || undefined,
    pinCode: form.pinCode.trim() || undefined,
    addressLine1: form.addressLine1.trim() || undefined,
    addressLine2: form.addressLine2.trim() || undefined,
    landmark: form.landmark.trim() || undefined,
    defaultAddress: false
  };
};

const addressesMatch = (
  shipping?: CheckoutAddress | null,
  billing?: CheckoutAddress | null
): boolean => {
  if (!shipping || !billing) {
    return false;
  }
  const fields: (keyof CheckoutAddress)[] = [
    'fullName',
    'addressLine1',
    'addressLine2',
    'cityName',
    'stateName',
    'countryName',
    'pinCode',
    'mobileNumber',
    'landmark'
  ];
  return fields.every((field) => {
    const left = shipping[field];
    const right = billing[field];
    return (left ?? '') === (right ?? '');
  });
};

type OrderEditorProps = {
  mode: OrderEditorMode;
  baseCurrency: string | null;
  onCancel: () => void;
  onSaved: (order: OrderDetail) => void;
  initialOrder?: OrderDetail | null;
};

const OrderEditor = ({ mode, baseCurrency, onCancel, onSaved, initialOrder }: OrderEditorProps) => {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const initialCustomerId = mode === 'edit' ? initialOrder?.customerId ?? null : null;
  const [customerId, setCustomerId] = useState<number | null>(initialCustomerId);
  const [customerEmail, setCustomerEmail] = useState(initialOrder?.customerEmail ?? '');
  const [customerName, setCustomerName] = useState(initialOrder?.customerName ?? '');
  const [status, setStatus] = useState(initialOrder?.status ?? 'PROCESSING');
  const [shippingAddress, setShippingAddress] = useState<AddressFormState>(
    initialOrder?.shippingAddress ? toAddressFormState(initialOrder.shippingAddress) : createEmptyAddressState()
  );
  const [billingAddress, setBillingAddress] = useState<AddressFormState>(
    initialOrder?.billingAddress ? toAddressFormState(initialOrder.billingAddress) : createEmptyAddressState()
  );
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(
    mode === 'create'
      ? true
      : addressesMatch(initialOrder?.shippingAddress ?? null, initialOrder?.billingAddress ?? null)
  );
  const [shippingTotalInput, setShippingTotalInput] = useState(
    initialOrder?.summary?.shippingTotal != null ? String(initialOrder.summary.shippingTotal) : '0'
  );
  const [discountInput, setDiscountInput] = useState(
    initialOrder?.summary?.discountTotal != null ? String(initialOrder.summary.discountTotal) : '0'
  );
  const [lines, setLines] = useState<OrderLineFormState[]>(() => {
    if (initialOrder?.lines?.length) {
      return initialOrder.lines.map((line) => {
        const unitPrice = line.unitPrice ??
          (line.lineTotal != null && line.quantity
            ? Number(line.lineTotal) / line.quantity
            : 0);
        return {
          key: createLineKey(),
          productId: line.productId != null ? String(line.productId) : '',
          name: line.name ?? '',
          quantity: line.quantity != null ? String(line.quantity) : '1',
          unitPrice: unitPrice != null ? String(unitPrice) : '0',
          taxRate: line.taxRate != null ? String(line.taxRate * 100) : '',
          productSlug: line.productSlug ?? '',
          variantId: line.variantId != null ? String(line.variantId) : '',
          variantSku: line.variantSku ?? '',
          variantLabel: line.variantLabel ?? ''
        } as OrderLineFormState;
      });
    }
    return [createEmptyLine()];
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedPaymentMethodKey, setSelectedPaymentMethodKey] = useState(
    initialOrder?.paymentMethod?.key ?? ''
  );
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState('');
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState('');

  const customersQuery = useQuery<CustomerSummary[]>({
    queryKey: ['orders', 'admin', 'customers'],
    enabled: mode === 'create',
    queryFn: async () => {
      const { data } = await adminApi.get<PagedResponse<CustomerSummary>>('/customers', {
        params: { page: 0, size: 100 }
      });
      return Array.isArray(data?.content) ? data.content : [];
    }
  });

  const addressesQuery = useQuery<CheckoutAddress[]>({
    queryKey: ['orders', 'admin', 'customerAddresses', customerId],
    enabled: customerId != null,
    queryFn: async () => {
      if (customerId == null) {
        return [];
      }
      const { data } = await adminApi.get<CheckoutAddress[]>(`/users/${customerId}/addresses`);
      return Array.isArray(data) ? data : [];
    }
  });

  const paymentMethodsQuery = useQuery<PaymentMethod[]>({
    queryKey: ['orders', 'admin', 'paymentMethods'],
    queryFn: async () => {
      const { data } = await adminApi.get<PaymentMethod[]>('/payments/methods');
      return Array.isArray(data) ? data : [];
    }
  });

  const paymentMethods = paymentMethodsQuery.data ?? [];
  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.key === selectedPaymentMethodKey) ?? null,
    [paymentMethods, selectedPaymentMethodKey]
  );

  useEffect(() => {
    if (billingSameAsShipping) {
      setBillingAddress({ ...shippingAddress });
    }
  }, [billingSameAsShipping, shippingAddress]);

  const customers = customersQuery.data ?? [];

  useEffect(() => {
    if (mode === 'create' && customerId != null) {
      const selected = customers.find((customer) => customer.id === customerId);
      if (selected) {
        setCustomerEmail(selected.email ?? '');
        setCustomerName(selected.name ?? '');
      }
    }
  }, [mode, customerId, customers]);

  const lineSummaries = useMemo(
    () =>
      lines.map((line) => {
        const quantity = Number.parseInt(line.quantity, 10);
        const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
        const unitPrice = Number(line.unitPrice);
        const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
        const taxRatePercent = Number(line.taxRate);
        const taxRate = Number.isFinite(taxRatePercent) ? taxRatePercent / 100 : 0;
        const subtotal = safeQuantity * safeUnitPrice;
        const taxAmount = subtotal * taxRate;
        return {
          key: line.key,
          subtotal,
          taxAmount,
          total: subtotal + taxAmount
        };
      }),
    [lines]
  );

  const productTotal = lineSummaries.reduce((sum, line) => sum + line.subtotal, 0);
  const taxTotal = lineSummaries.reduce((sum, line) => sum + line.taxAmount, 0);
  const shippingTotal = Math.max(0, parseAmountInput(shippingTotalInput));
  const discountTotal = Math.max(0, parseAmountInput(discountInput));
  const grandTotal = Math.max(0, productTotal + taxTotal + shippingTotal - discountTotal);

  const currency = baseCurrency ?? 'USD';

  const mutation = useMutation<OrderDetail, unknown, AdminOrderPayload>({
    mutationFn: async (payload) => {
      if (mode === 'edit' && initialOrder?.id != null) {
        const { data } = await adminApi.put<OrderDetail>(`/orders/${initialOrder.id}`, payload);
        return data;
      }
      const { data } = await adminApi.post<OrderDetail>('/orders', payload);
      return data;
    },
    onSuccess: (order) => {
      notify({
        title: mode === 'create' ? 'Order created' : 'Order updated',
        message:
          mode === 'create'
            ? 'The order has been created successfully.'
            : 'The order changes were saved.',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin', 'detail', order.id] });
      queryClient.setQueryData(['orders', 'admin', 'detail', order.id], order);
      onSaved(order);
    },
    onError: (error) => {
      setFormError(
        extractErrorMessage(error, 'Unable to save the order. Please review the details and try again.')
      );
    }
  });

  const isSaving = mutation.isPending;

  const handleLineChange = useCallback(
    (key: string, field: keyof OrderLineFormState, value: string) => {
      setLines((current) =>
        current.map((line) => (line.key === key ? { ...line, [field]: value } : line))
      );
    },
    []
  );

  const handleRemoveLine = (key: string) => {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current));
  };

  const handleAddLine = () => {
    setLines((current) => [...current, createEmptyLine()]);
  };

  const handleApplyAddress = (target: 'shipping' | 'billing', idValue: string) => {
    const numericId = Number(idValue);
    if (!Number.isFinite(numericId)) {
      return;
    }
    const address = addressesQuery.data?.find((candidate) => candidate.id === numericId);
    if (!address) {
      return;
    }
    if (target === 'shipping') {
      setShippingAddress(toAddressFormState(address));
      setSelectedShippingAddressId(idValue);
      if (billingSameAsShipping) {
        setBillingAddress(toAddressFormState(address));
      }
    } else {
      setBillingAddress(toAddressFormState(address));
      setBillingSameAsShipping(false);
      setSelectedBillingAddressId(idValue);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const activeCustomerId = customerId ?? initialOrder?.customerId ?? null;
    if (activeCustomerId == null) {
      setFormError('Select a customer for this order.');
      return;
    }

    const sanitizedLines: CheckoutOrderLine[] = [];
    for (const line of lines) {
      const quantity = Number.parseInt(line.quantity, 10);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setFormError('Each line item must have a quantity of at least 1.');
        return;
      }
      const unitPrice = Number(line.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setFormError('Enter a valid unit price for each line item.');
        return;
      }
      const trimmedName = line.name.trim();
      if (!trimmedName) {
        setFormError('Each line item must include a product name.');
        return;
      }
      const productId = line.productId.trim()
        ? Number(line.productId.trim())
        : undefined;
      if (productId !== undefined && !Number.isFinite(productId)) {
        setFormError('Product IDs must be numeric.');
        return;
      }
      const variantId = line.variantId.trim()
        ? Number(line.variantId.trim())
        : undefined;
      if (variantId !== undefined && !Number.isFinite(variantId)) {
        setFormError('Variant IDs must be numeric.');
        return;
      }
      const taxRatePercent = line.taxRate.trim() ? Number(line.taxRate.trim()) : undefined;
      if (taxRatePercent !== undefined && !Number.isFinite(taxRatePercent)) {
        setFormError('Tax rate percentages must be numeric values.');
        return;
      }
      sanitizedLines.push({
        productId,
        name: trimmedName,
        quantity,
        unitPrice: roundCurrency(unitPrice),
        taxRate:
          taxRatePercent !== undefined
            ? Number((taxRatePercent / 100).toFixed(4))
            : undefined,
        productSlug: line.productSlug.trim() || undefined,
        variantId,
        variantSku: line.variantSku.trim() || undefined,
        variantLabel: line.variantLabel.trim() || undefined
      });
    }

    if (!sanitizedLines.length) {
      setFormError('Add at least one line item to continue.');
      return;
    }

    if (mode === 'edit' && !initialOrder?.id) {
      setFormError('Order details are missing a reference identifier. Refresh and try again.');
      return;
    }

    const summary = {
      productTotal: roundCurrency(productTotal),
      taxTotal: roundCurrency(taxTotal),
      shippingTotal: roundCurrency(shippingTotal),
      discountTotal: roundCurrency(discountTotal),
      grandTotal: roundCurrency(grandTotal),
      taxLines: initialOrder?.summary?.taxLines ?? [],
      shippingBreakdown: initialOrder?.summary?.shippingBreakdown ?? null,
      appliedCoupon: initialOrder?.summary?.appliedCoupon ?? null
    };

    const shippingPayload = toAddressPayload(shippingAddress, 'SHIPPING');
    const billingSource = billingSameAsShipping ? shippingAddress : billingAddress;
    const billingPayload = toAddressPayload(billingSource, 'BILLING');

    const payload: AdminOrderPayload = {
      customerId: activeCustomerId,
      customerEmail: customerEmail.trim() || null,
      customerName: customerName.trim() || null,
      status: status.trim() || null,
      shippingAddress: shippingPayload,
      billingAddress: billingPayload,
      paymentMethod: selectedPaymentMethodKey ? selectedPaymentMethod : null,
      summary,
      lines: sanitizedLines
    };

    try {
      await mutation.mutateAsync(payload);
    } catch {
      // handled via mutation onError
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'create' ? 'Create order' : 'Edit order'}
          </h2>
          <p className="text-sm text-slate-500">
            {mode === 'create'
              ? 'Select a customer, add items, and confirm the pricing to create a manual order.'
              : 'Update the order details, addresses, and items. Changes here do not alter the customer profile.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create order' : 'Save changes'}
          </Button>
        </div>
      </header>

      {formError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="order-customer">
              Customer
            </label>
            {mode === 'create' ? (
              <>
                {customersQuery.isLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    <Spinner size="sm" /> Loading customers…
                  </div>
                ) : customers.length ? (
                  <select
                    id="order-customer"
                    value={customerId ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCustomerId(value ? Number(value) : null);
                    }}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select a customer…</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name ?? customer.email ?? `Customer #${customer.id}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    No customers available. Create a customer first to assign the order.
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {initialOrder?.customerName ?? 'Customer'}
                {initialOrder?.customerEmail ? ` · ${initialOrder.customerEmail}` : ''}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="order-status">
              Order status
            </label>
            <input
              id="order-status"
              type="text"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="order-customer-name">
              Contact name
            </label>
            <input
              id="order-customer-name"
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="order-customer-email">
              Contact email
            </label>
            <input
              id="order-customer-email"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Shipping address</h3>
            {addressesQuery.data?.length ? (
              <select
                value={selectedShippingAddressId}
                onChange={(event) => handleApplyAddress('shipping', event.target.value)}
                disabled={isSaving}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Apply saved address…</option>
                {addressesQuery.data.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.fullName ?? 'Saved address'} · {address.addressLine1 ?? ''}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Full name"
              value={shippingAddress.fullName}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, fullName: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Phone"
              value={shippingAddress.mobileNumber}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, mobileNumber: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Address line 1"
              value={shippingAddress.addressLine1}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, addressLine1: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:col-span-2"
            />
            <input
              type="text"
              placeholder="Address line 2"
              value={shippingAddress.addressLine2}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, addressLine2: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:col-span-2"
            />
            <input
              type="text"
              placeholder="City"
              value={shippingAddress.cityName}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, cityName: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="State"
              value={shippingAddress.stateName}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, stateName: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Country"
              value={shippingAddress.countryName}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, countryName: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Postal code"
              value={shippingAddress.pinCode}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, pinCode: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Landmark"
              value={shippingAddress.landmark}
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, landmark: event.target.value }))
              }
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:col-span-2"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Billing address</h3>
            {addressesQuery.data?.length ? (
              <select
                value={selectedBillingAddressId}
                onChange={(event) => handleApplyAddress('billing', event.target.value)}
                disabled={isSaving}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Apply saved address…</option>
                {addressesQuery.data.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.fullName ?? 'Saved address'} · {address.addressLine1 ?? ''}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={billingSameAsShipping}
              onChange={(event) => setBillingSameAsShipping(event.target.checked)}
              disabled={isSaving}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Billing address is the same as shipping
          </label>
          {!billingSameAsShipping ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="Full name"
                value={billingAddress.fullName}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, fullName: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Phone"
                value={billingAddress.mobileNumber}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, mobileNumber: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Address line 1"
                value={billingAddress.addressLine1}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, addressLine1: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:col-span-2"
              />
              <input
                type="text"
                placeholder="Address line 2"
                value={billingAddress.addressLine2}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, addressLine2: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:col-span-2"
              />
              <input
                type="text"
                placeholder="City"
                value={billingAddress.cityName}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, cityName: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="State"
                value={billingAddress.stateName}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, stateName: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Country"
                value={billingAddress.countryName}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, countryName: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Postal code"
                value={billingAddress.pinCode}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, pinCode: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Landmark"
                value={billingAddress.landmark}
                onChange={(event) =>
                  setBillingAddress((current) => ({ ...current, landmark: event.target.value }))
                }
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:col-span-2"
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Line items</h3>
            <Button type="button" variant="ghost" onClick={handleAddLine} disabled={isSaving}>
              Add item
            </Button>
          </div>
          <div className="space-y-4">
            {lines.map((line, index) => {
              const summary = lineSummaries[index];
              return (
                <div key={line.key} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Item {index + 1}</p>
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.key)}
                        disabled={isSaving}
                        className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Product name"
                      value={line.name}
                      onChange={(event) => handleLineChange(line.key, 'name', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:col-span-2 lg:col-span-1"
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Quantity"
                      value={line.quantity}
                      onChange={(event) => handleLineChange(line.key, 'quantity', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
                      value={line.unitPrice}
                      onChange={(event) => handleLineChange(line.key, 'unitPrice', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Tax rate %"
                      value={line.taxRate}
                      onChange={(event) => handleLineChange(line.key, 'taxRate', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Product ID"
                      value={line.productId}
                      onChange={(event) => handleLineChange(line.key, 'productId', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Variant ID"
                      value={line.variantId}
                      onChange={(event) => handleLineChange(line.key, 'variantId', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Variant SKU"
                      value={line.variantSku}
                      onChange={(event) => handleLineChange(line.key, 'variantSku', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Variant label"
                      value={line.variantLabel}
                      onChange={(event) => handleLineChange(line.key, 'variantLabel', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Product slug"
                      value={line.productSlug}
                      onChange={(event) => handleLineChange(line.key, 'productSlug', event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    <p>
                      Subtotal: <span className="font-semibold text-slate-900">{formatCurrency(summary.subtotal, currency)}</span>
                    </p>
                    <p>
                      Tax: <span className="font-semibold text-slate-900">{formatCurrency(summary.taxAmount, currency)}</span>
                    </p>
                    <p>
                      Line total: <span className="font-semibold text-slate-900">{formatCurrency(summary.total, currency)}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="order-shipping-total">
              Shipping total
            </label>
            <input
              id="order-shipping-total"
              type="number"
              min="0"
              step="0.01"
              value={shippingTotalInput}
              onChange={(event) => setShippingTotalInput(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="order-discount-total">
              Discount total
            </label>
            <input
              id="order-discount-total"
              type="number"
              min="0"
              step="0.01"
              value={discountInput}
              onChange={(event) => setDiscountInput(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </section>

        <section className="space-y-2">
          <label className="text-sm font-semibold text-slate-800" htmlFor="order-payment-method">
            Payment method
          </label>
          {paymentMethodsQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <Spinner size="sm" /> Loading payment methods…
            </div>
          ) : (
            <select
              id="order-payment-method"
              value={selectedPaymentMethodKey}
              onChange={(event) => setSelectedPaymentMethodKey(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">No payment method</option>
              {paymentMethods.map((method) => (
                <option key={method.key} value={method.key}>
                  {method.displayName}
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Products</span>
            <span className="font-semibold text-slate-900">{formatCurrency(productTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span className="font-semibold text-slate-900">{formatCurrency(taxTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span className="font-semibold text-slate-900">{formatCurrency(shippingTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-700">
            <span>Discount</span>
            <span className="font-semibold">-{formatCurrency(discountTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(grandTotal, currency)}</span>
          </div>
          {mode === 'edit' && initialOrder?.summary?.appliedCoupon ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-700">
              Coupon {initialOrder.summary.appliedCoupon.code} will remain applied to this order.
            </div>
          ) : null}
        </section>
      </form>
    </section>
  );
};

export default OrderEditor;
