import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CheckoutAddress } from '../../types/checkout';
import type { OrderDetail } from '../../types/orders';
import { formatCurrency } from '../../utils/currency';

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

const formatPaymentStatusLabel = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

type OrderDetailPanelProps = {
  order: OrderDetail;
  baseCurrency: string | null;
  onClose?: () => void;
  actions?: ReactNode;
  mode?: 'view' | 'payment';
  editingEnabled?: boolean;
  canEdit?: boolean;
  isUpdating?: boolean;
  onUpdateField?: (updates: Record<string, unknown>) => Promise<void>;
};

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h4 className="text-base font-semibold text-slate-900">{children}</h4>
);

const PencilIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
    <path d="M4.5 12.793V15.5h2.707l7.9-7.9-2.707-2.707-7.9 7.9Zm9.9-9.186 2.707 2.707a1 1 0 0 1 0 1.414l-9.08 9.08a1 1 0 0 1-.707.293H4a1 1 0 0 1-1-1v-3.32a1 1 0 0 1 .293-.707l9.08-9.08a1 1 0 0 1 1.414 0Z" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
    <path d="M16.707 6.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L8.5 12.086l6.543-6.543a1 1 0 0 1 1.664.75Z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
    <path d="M6.293 6.293a1 1 0 0 1 1.414 0L10 8.586l2.293-2.293a1 1 0 1 1 1.414 1.414L11.414 10l2.293 2.293a1 1 0 0 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 0-1.414Z" />
  </svg>
);

type InlineEditableFieldProps = {
  id: string;
  label: string;
  value: string | null | undefined;
  displayValue?: ReactNode;
  placeholder?: string;
  inputType?: 'text' | 'email' | 'date' | 'textarea';
  editingEnabled: boolean;
  canEdit: boolean;
  isUpdating: boolean;
  onSave?: (nextValue: string) => Promise<void>;
};

const InlineEditableField = ({
  id,
  label,
  value,
  displayValue,
  placeholder,
  inputType = 'text',
  editingEnabled,
  canEdit,
  isUpdating,
  onSave
}: InlineEditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value ?? '');
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (!editingEnabled) {
      setIsEditing(false);
    }
  }, [editingEnabled]);

  const defaultDisplay = useMemo(() => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed.length ? trimmed : '—';
  }, [value]);

  const handleBeginEdit = () => {
    if (!editingEnabled || !canEdit || isUpdating) {
      return;
    }
    setDraft(value ?? '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(value ?? '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onSave || isSaving || isUpdating) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = () => {
    if (inputType === 'textarea') {
      return (
        <textarea
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          className="min-h-[3rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder={placeholder}
        />
      );
    }

    const inputProps: { type: string; value: string } = {
      type: inputType,
      value:
        inputType === 'date' && draft
          ? (() => {
              const date = new Date(draft);
              if (Number.isNaN(date.getTime())) {
                return draft;
              }
              return date.toISOString().slice(0, 10);
            })()
          : draft
    };

    return (
      <input
        id={id}
        {...inputProps}
        onChange={(event) => setDraft(event.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-500">
          {label}
        </label>
        {canEdit && editingEnabled ? (
          <button
            type="button"
            onClick={handleBeginEdit}
            className="rounded-full p-1 text-slate-400 transition hover:bg-primary/10 hover:text-primary"
            aria-label={`Edit ${label}`}
            disabled={isUpdating}
          >
            <PencilIcon />
          </button>
        ) : null}
      </div>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          {renderInput()}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || isUpdating}
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-300"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : displayValue != null ? (
        <div className="space-y-1 text-sm text-slate-600">{displayValue}</div>
      ) : (
        <div className="text-base font-medium text-slate-900">{defaultDisplay}</div>
      )}
    </div>
  );
};

type EditableAddressBlockProps = {
  title: string;
  addressType: 'SHIPPING' | 'BILLING';
  address: CheckoutAddress | null;
  editingEnabled: boolean;
  canEdit: boolean;
  isUpdating: boolean;
  onSave?: (nextValue: Partial<CheckoutAddress>) => Promise<void>;
};

const EditableAddressBlock = ({
  title,
  addressType,
  address,
  editingEnabled,
  canEdit,
  isUpdating,
  onSave
}: EditableAddressBlockProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(() => ({
    fullName: address?.fullName ?? '',
    mobileNumber: address?.mobileNumber ?? '',
    addressLine1: address?.addressLine1 ?? '',
    addressLine2: address?.addressLine2 ?? '',
    landmark: address?.landmark ?? '',
    cityName: address?.cityName ?? '',
    stateName: address?.stateName ?? '',
    countryName: address?.countryName ?? '',
    pinCode: address?.pinCode ?? ''
  }));

  useEffect(() => {
    if (!isEditing) {
      setDraft({
        fullName: address?.fullName ?? '',
        mobileNumber: address?.mobileNumber ?? '',
        addressLine1: address?.addressLine1 ?? '',
        addressLine2: address?.addressLine2 ?? '',
        landmark: address?.landmark ?? '',
        cityName: address?.cityName ?? '',
        stateName: address?.stateName ?? '',
        countryName: address?.countryName ?? '',
        pinCode: address?.pinCode ?? ''
      });
    }
  }, [address, isEditing]);

  useEffect(() => {
    if (!editingEnabled) {
      setIsEditing(false);
    }
  }, [editingEnabled]);

  const handleBeginEdit = () => {
    if (!editingEnabled || !canEdit || isUpdating) {
      return;
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft({
      fullName: address?.fullName ?? '',
      mobileNumber: address?.mobileNumber ?? '',
      addressLine1: address?.addressLine1 ?? '',
      addressLine2: address?.addressLine2 ?? '',
      landmark: address?.landmark ?? '',
      cityName: address?.cityName ?? '',
      stateName: address?.stateName ?? '',
      countryName: address?.countryName ?? '',
      pinCode: address?.pinCode ?? ''
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onSave || isSaving || isUpdating) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        id: address?.id ?? null,
        type: address?.type ?? addressType,
        ...draft
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {canEdit && editingEnabled ? (
          <button
            type="button"
            onClick={handleBeginEdit}
            className="rounded-full p-1 text-slate-400 transition hover:bg-primary/10 hover:text-primary"
            aria-label={`Edit ${title}`}
            disabled={isUpdating}
          >
            <PencilIcon />
          </button>
        ) : null}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Full name"
              value={draft.fullName}
              onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Phone"
              value={draft.mobileNumber}
              onChange={(event) => setDraft((prev) => ({ ...prev, mobileNumber: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Address line 1"
              value={draft.addressLine1}
              onChange={(event) => setDraft((prev) => ({ ...prev, addressLine1: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Address line 2"
              value={draft.addressLine2}
              onChange={(event) => setDraft((prev) => ({ ...prev, addressLine2: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Landmark"
              value={draft.landmark}
              onChange={(event) => setDraft((prev) => ({ ...prev, landmark: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="City"
              value={draft.cityName}
              onChange={(event) => setDraft((prev) => ({ ...prev, cityName: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="State"
              value={draft.stateName}
              onChange={(event) => setDraft((prev) => ({ ...prev, stateName: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Country"
              value={draft.countryName}
              onChange={(event) => setDraft((prev) => ({ ...prev, countryName: event.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="PIN / ZIP"
              value={draft.pinCode}
              onChange={(event) => setDraft((prev) => ({ ...prev, pinCode: event.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || isUpdating}
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-300"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : address ? (
        <div className="space-y-1 text-sm text-slate-600">
          <p className="font-medium text-slate-900">{address.fullName}</p>
          <p>{address.addressLine1}</p>
          {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
          {address.landmark ? <p>Landmark: {address.landmark}</p> : null}
          <p>{[address.cityName, address.stateName, address.countryName].filter(Boolean).join(', ')}</p>
          {address.pinCode ? <p>PIN: {address.pinCode}</p> : null}
          {address.mobileNumber ? <p>Phone: {address.mobileNumber}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No address provided.</p>
      )}
    </div>
  );
};

const STATUS_OPTIONS = ['PROCESSING', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'CANCELLED'];

const OrderDetailPanel = ({
  order,
  baseCurrency,
  onClose,
  actions,
  mode = 'view',
  editingEnabled = false,
  canEdit = false,
  isUpdating = false,
  onUpdateField
}: OrderDetailPanelProps) => {
  const currency = baseCurrency ?? 'USD';
  const lines = order.lines ?? [];
  const summary = order.summary;
  const paymentMethod = order.paymentMethod;
  const appliedCoupon = summary?.appliedCoupon ?? null;
  const dueDate = order.dueDate ?? summary?.dueDate ?? null;
  const balanceDue = summary?.balanceDue ?? summary?.amountDue ?? null;
  const notes = order.notes ?? summary?.notes ?? null;
  const paymentStatusLabel = formatPaymentStatusLabel(order.paymentStatus ?? summary?.paymentStatus ?? null);
  const paymentMethodLabel =
    order.paymentMethodLabel ?? paymentMethod?.displayName ?? paymentMethod?.name ?? '—';

  const couponDescription = appliedCoupon
    ? appliedCoupon.description?.trim()?.length
      ? appliedCoupon.description
      : appliedCoupon.discountType === 'PERCENTAGE'
        ? `${appliedCoupon.discountValue ?? 0}% off`
        : `Save ${formatCurrency(appliedCoupon.discountValue ?? 0, currency)}`
    : null;

  const statusTone = useMemo(() => {
    switch (order.status) {
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-700';
      case 'PROCESSING':
        return 'bg-amber-100 text-amber-700';
      case 'PAID':
        return 'bg-emerald-100 text-emerald-700';
      case 'PARTIALLY_PAID':
        return 'bg-amber-100 text-amber-700';
      case 'UNPAID':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }, [order.status]);

  const modeLabel = editingEnabled ? 'Inline editing' : mode === 'payment' ? 'Payment view' : null;

  const handleStatusSave = async (nextStatus: string) => {
    if (!onUpdateField || nextStatus === order.status) {
      return;
    }
    await onUpdateField({ status: nextStatus });
  };

  const handlePaymentStatusSave = async (nextStatus: string) => {
    if (!onUpdateField) {
      return;
    }
    const trimmed = nextStatus.trim();
    await onUpdateField({ paymentStatus: trimmed.length ? trimmed : null });
  };

  const handlePaymentMethodSave = async (nextMethod: string) => {
    if (!onUpdateField) {
      return;
    }
    const trimmed = nextMethod.trim();
    if (!trimmed.length) {
      await onUpdateField({ paymentMethod: null });
      return;
    }
    await onUpdateField({ paymentMethod: { ...(paymentMethod ?? {}), displayName: trimmed } });
  };

  const handleCustomerSave = async (field: 'customerName' | 'customerEmail', value: string) => {
    if (!onUpdateField) {
      return;
    }
    const trimmed = value.trim();
    await onUpdateField({ [field]: trimmed.length ? trimmed : null });
  };

  const handleDueDateSave = async (nextDate: string) => {
    if (!onUpdateField) {
      return;
    }
    const trimmed = nextDate.trim();
    const normalized = trimmed
      ? (() => {
          const maybeDate = new Date(trimmed);
          if (Number.isNaN(maybeDate.getTime())) {
            return trimmed;
          }
          return maybeDate.toISOString();
        })()
      : null;
    await onUpdateField({ dueDate: normalized });
  };

  const handleNotesSave = async (nextNotes: string) => {
    if (!onUpdateField) {
      return;
    }
    const trimmed = nextNotes.trim();
    await onUpdateField({ notes: trimmed.length ? trimmed : null });
  };

  const handleAddressSave = async (
    field: 'shippingAddress' | 'billingAddress',
    payload: Partial<CheckoutAddress>
  ) => {
    if (!onUpdateField) {
      return;
    }
    await onUpdateField({ [field]: payload });
  };

  return (
    <section className="flex flex-col gap-10 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Order #{order.id}</p>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-slate-900">{order.orderNumber}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <span>Placed on {formatDateTime(order.createdAt)}</span>
              {dueDate ? <span className="font-medium text-slate-600">Due {formatDate(dueDate)}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 lg:items-end">
          {modeLabel ? (
            <span className="inline-flex items-center self-end rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {modeLabel}
            </span>
          ) : null}
          {actions}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {editingEnabled && canEdit ? (
              <select
                value={order.status}
                onChange={(event) => {
                  void handleStatusSave(event.target.value);
                }}
                disabled={isUpdating}
                className="rounded-full border border-primary/40 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone}`}>
                {order.status?.replace(/_/g, ' ') ?? 'Processing'}
              </span>
            )}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-slate-500 transition hover:text-slate-800"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <SectionHeading>Customer &amp; payment</SectionHeading>
        <div className="grid gap-6 md:grid-cols-2">
          <InlineEditableField
            id="order-customer-name"
            label="Customer"
            value={order.customerName ?? ''}
            editingEnabled={editingEnabled}
            canEdit={canEdit}
            isUpdating={isUpdating}
            onSave={(next) => handleCustomerSave('customerName', next)}
          />
          <InlineEditableField
            id="order-customer-email"
            label="Email"
            value={order.customerEmail ?? ''}
            inputType="email"
            editingEnabled={editingEnabled}
            canEdit={canEdit}
            isUpdating={isUpdating}
            onSave={(next) => handleCustomerSave('customerEmail', next)}
          />
          <InlineEditableField
            id="order-payment-method"
            label="Payment method"
            value={paymentMethodLabel}
            editingEnabled={editingEnabled}
            canEdit={canEdit}
            isUpdating={isUpdating}
            onSave={handlePaymentMethodSave}
          />
          <InlineEditableField
            id="order-payment-status"
            label="Payment status"
            value={paymentStatusLabel}
            editingEnabled={editingEnabled}
            canEdit={canEdit}
            isUpdating={isUpdating}
            onSave={handlePaymentStatusSave}
            placeholder="Paid, Partially Paid, Unpaid, Processing…"
          />
          <InlineEditableField
            id="order-placed-at"
            label="Order placed"
            value={order.createdAt}
            displayValue={formatDateTime(order.createdAt)}
            editingEnabled={false}
            canEdit={false}
            isUpdating={false}
          />
          <InlineEditableField
            id="order-due-date"
            label="Due date"
            value={dueDate}
            displayValue={formatDate(dueDate)}
            inputType="date"
            editingEnabled={editingEnabled}
            canEdit={canEdit}
            isUpdating={isUpdating}
            onSave={handleDueDateSave}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading>Order items</SectionHeading>
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left">Item</th>
                  <th scope="col" className="px-4 py-2 text-right">Qty</th>
                  <th scope="col" className="px-4 py-2 text-right">Rate</th>
                  <th scope="col" className="px-4 py-2 text-right">Tax</th>
                  <th scope="col" className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.length ? (
                  lines.map((line, index) => (
                    <tr key={`${order.id}-${line.productId ?? index}`}>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">{line.name ?? 'Product'}</p>
                          {line.variantLabel ? (
                            <p className="text-xs text-slate-500">{line.variantLabel}</p>
                          ) : null}
                          {line.variantSku ? (
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">SKU: {line.variantSku}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{line.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(line.unitPrice ?? 0, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        {line.taxRate != null ? `${(line.taxRate * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(line.lineTotal ?? (line.unitPrice ?? 0) * line.quantity, currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      No line items recorded for this order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)]">
        <section className="space-y-6">
          <SectionHeading>Addresses</SectionHeading>
          <div className="grid gap-6 md:grid-cols-2">
            <EditableAddressBlock
              title="Shipping address"
              addressType="SHIPPING"
              address={order.shippingAddress}
              editingEnabled={editingEnabled}
              canEdit={canEdit}
              isUpdating={isUpdating}
              onSave={(payload) => handleAddressSave('shippingAddress', payload)}
            />
            <EditableAddressBlock
              title="Billing address"
              addressType="BILLING"
              address={order.billingAddress}
              editingEnabled={editingEnabled}
              canEdit={canEdit}
              isUpdating={isUpdating}
              onSave={(payload) => handleAddressSave('billingAddress', payload)}
            />
          </div>
        </section>
        <section className="space-y-4">
          <SectionHeading>Order summary</SectionHeading>
          {summary ? (
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Products</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {formatCurrency(summary.productTotal ?? 0, currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Tax</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {formatCurrency(summary.taxTotal ?? 0, currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Shipping</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {formatCurrency(summary.shippingTotal ?? 0, currency)}
                </dd>
              </div>
              {summary.discountTotal ? (
                <div className="flex items-center justify-between text-sm text-emerald-600">
                  <dt>Discount</dt>
                  <dd>-{formatCurrency(summary.discountTotal, currency)}</dd>
                </div>
              ) : null}
              <div className="flex items-start justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatCurrency(summary.grandTotal ?? 0, currency)}</dd>
              </div>
              {balanceDue != null ? (
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <dt>Amount due</dt>
                  <dd>{formatCurrency(balanceDue, currency)}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No summary data available.</p>
          )}
          {appliedCoupon ? (
            <div className="rounded-xl bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700">
              <p className="text-sm font-semibold text-emerald-800">Coupon applied: {appliedCoupon.code}</p>
              {couponDescription ? <p className="mt-1">{couponDescription}</p> : null}
              {appliedCoupon.discountAmount != null ? (
                <p className="mt-1">
                  Discount saved: {formatCurrency(appliedCoupon.discountAmount, currency)}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="space-y-4">
        <SectionHeading>Terms &amp; notes</SectionHeading>
        <InlineEditableField
          id="order-notes"
          label="Notes"
          value={notes ?? ''}
          displayValue={
            notes ? (
              <p className="whitespace-pre-wrap text-sm text-slate-600">{notes}</p>
            ) : (
              <span className="text-sm text-slate-500">No additional terms were provided for this order.</span>
            )
          }
          inputType="textarea"
          editingEnabled={editingEnabled}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onSave={handleNotesSave}
          placeholder="Add notes or terms for this order"
        />
      </section>
    </section>
  );
};

export default OrderDetailPanel;
