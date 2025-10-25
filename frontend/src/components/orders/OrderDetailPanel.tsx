import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CheckoutAddress } from '../../types/checkout';
import type {
  AdminOrderProductOption,
  AdminOrderProductVariantOption,
  OrderDetail
} from '../../types/orders';
import type { CouponSummary } from '../../types/coupon';
import type { Pagination } from '../../types/models';
import type { DiscountType } from '../../types/product';
import { formatCurrency } from '../../utils/currency';
import { computeLineTotals, computeSummaryFromOrder, roundCurrency } from '../../utils/orderCalculations';
import OrderProductSearchSelect, {
  formatOptionLabel
} from '../../pages/admin/components/OrderProductSearchSelect';
import { adminApi } from '../../services/http';

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
  onApplyChanges?: (updater: (current: OrderDetail) => OrderDetail) => Promise<void>;
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

const PlusIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
    <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
    <path d="M7.5 3a1 1 0 0 0-.964.736L6.277 4.5H4a1 1 0 1 0 0 2h.25l.64 8.448A2 2 0 0 0 6.884 16.5h6.232a2 2 0 0 0 1.994-1.552L15.75 6.5H16a1 1 0 1 0 0-2h-2.277l-.259-.764A1 1 0 0 0 12.5 3h-5Zm1.5 5a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0V8Z" />
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
const SHIPPING_METHOD_OPTIONS = ['Standard Shipping', 'Express Shipping', 'Free Shipping'];

const sanitizeVariants = (
  variants?: AdminOrderProductVariantOption[]
): AdminOrderProductVariantOption[] => {
  if (!Array.isArray(variants)) {
    return [];
  }
  return variants
    .filter((variant): variant is AdminOrderProductVariantOption => variant != null)
    .map((variant) => ({
      id: variant.id ?? null,
      sku: variant.sku ?? null,
      label: variant.label ?? null,
      key: variant.key ?? variant.label ?? (variant.sku ? `sku:${variant.sku}` : null),
      unitPrice: variant.unitPrice ?? null
    }));
};

const resolveVariantValue = (variantId?: number | null, variantKey?: string | null): string => {
  if (variantId != null) {
    return String(variantId);
  }
  return variantKey?.trim() ?? '';
};

const roundRate = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10_000) / 10_000;
};

const buildFallbackOptionFromLine = (
  line: OrderDetail['lines'][number]
): AdminOrderProductOption | null => {
  if (!line) {
    return null;
  }
  const unitPrice = line.unitPrice ??
    (line.lineTotal != null && line.quantity
      ? Number(line.lineTotal) / line.quantity
      : 0);
  return {
    productId: line.productId ?? undefined,
    productName: line.name ?? 'Product',
    productSlug: line.productSlug ?? null,
    productSku: line.variantSku ?? null,
    productVariety: null,
    productSlot: null,
    brandName: null,
    thumbnailUrl: null,
    taxRate: line.taxRate ?? 0,
    taxRateId: null,
    taxRateName: null,
    variantId: line.variantId ?? null,
    variantSku: line.variantSku ?? null,
    variantLabel: line.variantLabel ?? null,
    variantKey: resolveVariantValue(line.variantId ?? null, line.variantLabel ?? line.variantSku ?? null),
    unitPrice: unitPrice ?? 0,
    hasVariants: Boolean(line.variantId ?? line.variantSku ?? line.variantLabel),
    variants: []
  };
};

const getVariantDisplayName = (variant: AdminOrderProductVariantOption): string => {
  const parts: string[] = [];
  if (variant.label?.trim()) {
    parts.push(variant.label.trim());
  }
  if (variant.sku?.trim()) {
    parts.push(variant.sku.trim());
  }
  return parts.join(' · ') || 'Variant';
};

const composeLine = (
  previous: OrderDetail['lines'][number] | null,
  option: AdminOrderProductOption | null,
  quantity: number,
  unitPrice: number,
  taxRate: number,
  variant?: AdminOrderProductVariantOption | null
): OrderDetail['lines'][number] => {
  const resolvedQuantity = quantity > 0 ? quantity : 1;
  const resolvedUnitPrice = roundCurrency(unitPrice);
  const resolvedTaxRate = roundRate(taxRate);
  const fallbackOption = option ?? (previous ? buildFallbackOptionFromLine(previous) : null);

  const variantCandidate = variant ?? (fallbackOption?.hasVariants
    ? sanitizeVariants(fallbackOption.variants).find(
        (candidate) =>
          resolveVariantValue(candidate.id ?? null, candidate.key ?? null) ===
          resolveVariantValue(fallbackOption?.variantId ?? null, fallbackOption?.variantKey ?? null)
      )
    : null);

  const variantId = variantCandidate?.id ?? fallbackOption?.variantId ?? previous?.variantId ?? null;
  const variantSku = variantCandidate?.sku ?? fallbackOption?.variantSku ?? previous?.variantSku ?? null;
  const variantLabel = variantCandidate?.label ?? fallbackOption?.variantLabel ?? previous?.variantLabel ?? null;

  return {
    productId: fallbackOption?.productId ?? previous?.productId ?? null,
    name: fallbackOption?.productName ?? previous?.name ?? 'Product',
    quantity: resolvedQuantity,
    unitPrice: resolvedUnitPrice,
    lineTotal: roundCurrency(resolvedQuantity * resolvedUnitPrice),
    taxRate: resolvedTaxRate,
    productSlug: fallbackOption?.productSlug ?? previous?.productSlug ?? null,
    variantId,
    variantSku,
    variantLabel
  };
};

type LineDraftState = {
  key: string;
  index: number;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  productOption: AdminOrderProductOption | null;
  variantOptions: AdminOrderProductVariantOption[];
  selectedVariant: string;
  isNew: boolean;
  loadingVariants: boolean;
  error: string | null;
};

type CouponOption = {
  id: number;
  name: string;
  code?: string | null;
  discountType: DiscountType;
  discountValue: number;
};

const OrderDetailPanel = ({
  order,
  baseCurrency,
  onClose,
  actions,
  mode = 'view',
  editingEnabled = false,
  canEdit = false,
  isUpdating = false,
  onApplyChanges
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

  const [productOptionCache, setProductOptionCache] = useState<Record<number, AdminOrderProductOption[]>>({});
  const productOptionCacheRef = useRef(productOptionCache);
  const loadingProductIdsRef = useRef<Set<number>>(new Set());
  const [lineDraft, setLineDraft] = useState<LineDraftState | null>(null);
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [shippingDraft, setShippingDraft] = useState(() => ({
    amount: (summary?.shippingTotal ?? 0).toString(),
    method: summary?.shippingMethod ?? ''
  }));
  const shippingMethodOptions = useMemo(() => {
    const base = [...SHIPPING_METHOD_OPTIONS];
    const currentMethod = summary?.shippingMethod;
    if (currentMethod && !base.includes(currentMethod)) {
      base.push(currentMethod);
    }
    return base;
  }, [summary?.shippingMethod]);

  useEffect(() => {
    productOptionCacheRef.current = productOptionCache;
  }, [productOptionCache]);

  useEffect(() => {
    if (isEditingShipping) {
      return;
    }
    setShippingDraft({
      amount: (summary?.shippingTotal ?? 0).toString(),
      method: summary?.shippingMethod ?? ''
    });
  }, [summary?.shippingTotal, summary?.shippingMethod, isEditingShipping]);

  const ensureProductOptions = useCallback(
    async (productId: number, fallback?: AdminOrderProductOption | null) => {
      if (!Number.isFinite(productId)) {
        return [] as AdminOrderProductOption[];
      }

      const cached = productOptionCacheRef.current[productId];
      if (cached && cached.length) {
        return cached;
      }

      if (fallback) {
        setProductOptionCache((current) => {
          if (current[productId]?.length) {
            return current;
          }
          return {
            ...current,
            [productId]: [
              {
                ...fallback,
                variants: sanitizeVariants(fallback.variants)
              }
            ]
          };
        });
      }

      if (loadingProductIdsRef.current.has(productId)) {
        return productOptionCacheRef.current[productId] ?? [];
      }

      loadingProductIdsRef.current.add(productId);
      try {
        const { data } = await adminApi.get<AdminOrderProductOption[]>(`/orders/products/${productId}`);
        const options = Array.isArray(data)
          ? data.map((option) => ({
              ...option,
              variants: sanitizeVariants(option.variants)
            }))
          : [];
        if (options.length) {
          setProductOptionCache((current) => ({ ...current, [productId]: options }));
          return options;
        }
        return productOptionCacheRef.current[productId] ?? [];
      } catch (error) {
        console.error('Unable to load product variants for admin order', error);
        return productOptionCacheRef.current[productId] ?? [];
      } finally {
        loadingProductIdsRef.current.delete(productId);
      }
    },
    []
  );

  const couponsQuery = useQuery<Pagination<CouponSummary>>({
    queryKey: ['orders', 'admin', 'coupons', 'active'],
    enabled: editingEnabled,
    queryFn: async () => {
      const { data } = await adminApi.get<Pagination<CouponSummary>>('/coupons', {
        params: { state: 'ENABLED', page: 0, size: 100 }
      });
      return data;
    },
    staleTime: 60_000
  });

  const couponOptions = useMemo<CouponOption[]>(() => {
    const options = couponsQuery.data?.content ?? [];
    const mapped = options.map((coupon) => ({
      id: coupon.id,
      name: coupon.name,
      code: coupon.code,
      discountType: coupon.discountType as DiscountType,
      discountValue: coupon.discountValue ?? 0
    }));
    const applied = summary?.appliedCoupon;
    if (applied && applied.id != null && !mapped.some((option) => option.id === applied.id)) {
      mapped.unshift({
        id: applied.id,
        name: applied.name ?? applied.code ?? 'Applied coupon',
        code: applied.code ?? null,
        discountType: applied.discountType as DiscountType,
        discountValue: applied.discountValue ?? applied.discountAmount ?? 0
      });
    }
    return mapped;
  }, [couponsQuery.data, summary?.appliedCoupon]);

  const handleStatusSave = async (nextStatus: string) => {
    if (!onApplyChanges || nextStatus === order.status) {
      return;
    }
    await onApplyChanges((current) => ({ ...current, status: nextStatus }));
  };

  const handlePaymentStatusSave = async (nextStatus: string) => {
    if (!onApplyChanges) {
      return;
    }
    const trimmed = nextStatus.trim();
    const nextPaymentStatus = trimmed.length ? trimmed : null;
    await onApplyChanges((current) => ({
      ...current,
      paymentStatus: nextPaymentStatus,
      summary: current.summary
        ? { ...current.summary, paymentStatus: nextPaymentStatus }
        : current.summary
    }));
  };

  const handlePaymentMethodSave = async (nextMethod: string) => {
    if (!onApplyChanges) {
      return;
    }
    const trimmed = nextMethod.trim();
    await onApplyChanges((current) => {
      if (!trimmed.length) {
        return { ...current, paymentMethod: null };
      }
      const existing = current.paymentMethod ?? null;
      const fallbackKey = trimmed.toLowerCase().replace(/\s+/g, '-');
      const nextPaymentMethod = existing
        ? { ...existing, displayName: trimmed }
        : { key: fallbackKey || trimmed, displayName: trimmed, enabled: true };
      return { ...current, paymentMethod: nextPaymentMethod };
    });
  };

  const handleCustomerSave = async (field: 'customerName' | 'customerEmail', value: string) => {
    if (!onApplyChanges) {
      return;
    }
    const trimmed = value.trim();
    await onApplyChanges((current) => ({
      ...current,
      [field]: trimmed.length ? trimmed : null
    }));
  };

  const handleDueDateSave = async (nextDate: string) => {
    if (!onApplyChanges) {
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
    await onApplyChanges((current) => ({
      ...current,
      dueDate: normalized,
      summary: current.summary ? { ...current.summary, dueDate: normalized } : current.summary
    }));
  };

  const handleNotesSave = async (nextNotes: string) => {
    if (!onApplyChanges) {
      return;
    }
    const trimmed = nextNotes.trim();
    const nextNotesValue = trimmed.length ? trimmed : null;
    await onApplyChanges((current) => ({
      ...current,
      notes: nextNotesValue,
      summary: current.summary ? { ...current.summary, notes: nextNotesValue } : current.summary
    }));
  };

  const handleAddressSave = async (
    field: 'shippingAddress' | 'billingAddress',
    payload: Partial<CheckoutAddress>
  ) => {
    if (!onApplyChanges) {
      return;
    }
    await onApplyChanges((current) => ({
      ...current,
      [field]: payload as CheckoutAddress | null
    }));
  };

  const handleApplyCouponOption = async (option: CouponOption) => {
    if (!onApplyChanges) {
      return;
    }
    const coupon = {
      id: option.id,
      name: option.name,
      code: option.code ?? null,
      discountType: option.discountType,
      discountValue: option.discountValue,
      discountAmount: null,
      description: null
    } as const;
    const nextSummary = computeSummaryFromOrder(lines, summary, { coupon });
    await onApplyChanges((current) => ({
      ...current,
      summary: nextSummary
    }));
  };

  const handleRemoveCoupon = async () => {
    if (!onApplyChanges) {
      return;
    }
    const nextSummary = computeSummaryFromOrder(lines, summary, {
      coupon: null,
      discountTotal: 0
    });
    await onApplyChanges((current) => ({
      ...current,
      summary: nextSummary
    }));
  };

  const handleShippingSave = async () => {
    if (!onApplyChanges) {
      return;
    }
    const amountValue = Number.parseFloat(shippingDraft.amount);
    const normalizedAmount = Number.isFinite(amountValue) ? amountValue : 0;
    const methodValue = shippingDraft.method.trim();
    const nextSummary = computeSummaryFromOrder(lines, summary, {
      shippingTotal: normalizedAmount,
      shippingMethod: methodValue.length ? methodValue : null,
      coupon: summary?.appliedCoupon ?? null
    });
    await onApplyChanges((current) => ({
      ...current,
      summary: nextSummary
    }));
    setIsEditingShipping(false);
  };

  const handleShippingCancel = () => {
    setShippingDraft({
      amount: (summary?.shippingTotal ?? 0).toString(),
      method: summary?.shippingMethod ?? ''
    });
    setIsEditingShipping(false);
  };

  const beginAddLine = useCallback(() => {
    if (!editingEnabled || !canEdit || isUpdating) {
      return;
    }
    setLineDraft({
      key: 'new',
      index: lines.length,
      quantity: '1',
      unitPrice: '0.00',
      taxRate: '0.00',
      productOption: null,
      variantOptions: [],
      selectedVariant: '',
      isNew: true,
      loadingVariants: false,
      error: null
    });
    setEditingLineKey('new');
  }, [canEdit, editingEnabled, isUpdating, lines.length]);

  const beginEditLine = useCallback(
    async (index: number) => {
      if (!editingEnabled || !canEdit || isUpdating) {
        return;
      }
      const line = lines[index];
      const key = `existing-${index}`;
      const fallback = buildFallbackOptionFromLine(line);
      const quantityValue = line.quantity ?? 1;
      const unitPriceValue = line.unitPrice ??
        (line.lineTotal != null && line.quantity
          ? Number(line.lineTotal) / line.quantity
          : 0);
      const taxRatePercent = (line.taxRate ?? 0) * 100;
      setLineDraft({
        key,
        index,
        quantity: String(quantityValue),
        unitPrice: roundCurrency(unitPriceValue).toFixed(2),
        taxRate: taxRatePercent.toFixed(2),
        productOption: fallback,
        variantOptions: fallback ? sanitizeVariants(fallback.variants) : [],
        selectedVariant: fallback
          ? resolveVariantValue(fallback.variantId ?? null, fallback.variantKey ?? null)
          : '',
        isNew: false,
        loadingVariants: Boolean(fallback?.productId),
        error: null
      });
      setEditingLineKey(key);
      if (fallback?.productId != null) {
        const options = await ensureProductOptions(fallback.productId, fallback);
        setLineDraft((current) => {
          if (!current || current.key !== key) {
            return current;
          }
          const preferred =
            options.find(
              (candidate) =>
                resolveVariantValue(candidate.variantId ?? null, candidate.variantKey ?? null) ===
                resolveVariantValue(line.variantId ?? null, line.variantLabel ?? line.variantSku ?? null)
            ) ?? options[0] ?? fallback;
          return {
            ...current,
            productOption: preferred ?? current.productOption,
            variantOptions: preferred?.variants ?? [],
            selectedVariant: preferred
              ? resolveVariantValue(preferred.variantId ?? null, preferred.variantKey ?? null)
              : current.selectedVariant,
            loadingVariants: false
          };
        });
      } else {
        setLineDraft((current) =>
          current && current.key === key ? { ...current, loadingVariants: false } : current
        );
      }
    },
    [canEdit, editingEnabled, ensureProductOptions, isUpdating, lines]
  );

  const cancelLineEdit = useCallback(() => {
    setLineDraft(null);
    setEditingLineKey(null);
  }, []);

  const handleLineQuantityChange = (value: string) => {
    setLineDraft((current) => (current ? { ...current, quantity: value, error: null } : current));
  };

  const handleLineUnitPriceChange = (value: string) => {
    setLineDraft((current) => (current ? { ...current, unitPrice: value, error: null } : current));
  };

  const handleLineTaxRateChange = (value: string) => {
    setLineDraft((current) => (current ? { ...current, taxRate: value, error: null } : current));
  };

  const handleLineVariantChange = (value: string) => {
    setLineDraft((current) => (current ? { ...current, selectedVariant: value, error: null } : current));
  };

  const handleLineProductSelect = async (option: AdminOrderProductOption) => {
    const sanitizedOption: AdminOrderProductOption = {
      ...option,
      variants: sanitizeVariants(option.variants)
    };
    setLineDraft((current) => {
      if (!current) {
        return current;
      }
      const taxPercent = (sanitizedOption.taxRate ?? 0) * 100;
      return {
        ...current,
        productOption: sanitizedOption,
        unitPrice: roundCurrency(sanitizedOption.unitPrice ?? Number(current.unitPrice) ?? 0).toFixed(2),
        taxRate: taxPercent.toFixed(2),
        variantOptions: sanitizedOption.variants ?? [],
        selectedVariant: resolveVariantValue(
          sanitizedOption.variantId ?? null,
          sanitizedOption.variantKey ?? null
        ),
        loadingVariants: Boolean(sanitizedOption.productId),
        error: null
      };
    });
    const productId = option.productId != null ? Number(option.productId) : Number.NaN;
    if (Number.isFinite(productId)) {
      const options = await ensureProductOptions(productId, option);
      setLineDraft((current) => {
        if (!current) {
          return current;
        }
        const preferred =
          options.find(
            (candidate) =>
              resolveVariantValue(candidate.variantId ?? null, candidate.variantKey ?? null) ===
              resolveVariantValue(option.variantId ?? null, option.variantKey ?? null)
          ) ?? options[0] ?? sanitizedOption;
        return {
          ...current,
          productOption: preferred ?? current.productOption,
          variantOptions: preferred?.variants ?? [],
          selectedVariant: preferred
            ? resolveVariantValue(preferred.variantId ?? null, preferred.variantKey ?? null)
            : current.selectedVariant,
          loadingVariants: false
        };
      });
    } else {
      setLineDraft((current) => (current ? { ...current, loadingVariants: false } : current));
    }
  };

  const handleLineDraftSave = async () => {
    if (!lineDraft || !onApplyChanges || isUpdating) {
      return;
    }
    const quantityValue = Number.parseInt(lineDraft.quantity, 10);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setLineDraft((current) => (current ? { ...current, error: 'Quantity must be at least 1.' } : current));
      return;
    }
    const unitPriceValue = Number.parseFloat(lineDraft.unitPrice);
    if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
      setLineDraft((current) => (current ? { ...current, error: 'Enter a valid price.' } : current));
      return;
    }
    const taxRatePercent = Number.parseFloat(lineDraft.taxRate);
    if (!Number.isFinite(taxRatePercent) || taxRatePercent < 0) {
      setLineDraft((current) => (current ? { ...current, error: 'Enter a valid tax rate.' } : current));
      return;
    }
    const selectedVariant = lineDraft.variantOptions.find(
      (variant) =>
        resolveVariantValue(variant.id ?? null, variant.key ?? null) === lineDraft.selectedVariant
    );
    if (lineDraft.isNew && (!lineDraft.productOption || lineDraft.productOption.productId == null)) {
      setLineDraft((current) => (current ? { ...current, error: 'Select a product to add.' } : current));
      return;
    }
    const baseLine = lineDraft.isNew ? null : lines[lineDraft.index];
    const nextLine = composeLine(
      baseLine,
      lineDraft.productOption,
      quantityValue,
      unitPriceValue,
      taxRatePercent / 100,
      selectedVariant ?? null
    );
    if (nextLine.productId == null) {
      setLineDraft((current) => (current ? { ...current, error: 'A product reference is required.' } : current));
      return;
    }
    const nextLines = lineDraft.isNew
      ? [...lines, nextLine]
      : lines.map((line, idx) => (idx === lineDraft.index ? nextLine : line));
    const nextSummary = computeSummaryFromOrder(nextLines, summary);
    await onApplyChanges((current) => ({
      ...current,
      lines: nextLines,
      summary: nextSummary
    }));
    setLineDraft(null);
    setEditingLineKey(null);
  };

  const handleRemoveLine = async (index: number) => {
    if (!onApplyChanges || isUpdating) {
      return;
    }
    const nextLines = lines.filter((_, idx) => idx !== index);
    const nextSummary = computeSummaryFromOrder(nextLines, summary);
    await onApplyChanges((current) => ({
      ...current,
      lines: nextLines,
      summary: nextSummary
    }));
    setLineDraft((current) => (current && current.index === index ? null : current));
    setEditingLineKey((current) => (current === `existing-${index}` ? null : current));
  };

  const renderDisplayRow = (
    line: OrderDetail['lines'][number],
    index: number,
    key: string
  ) => {
    const totals = computeLineTotals({
      quantity: line.quantity ?? 0,
      unitPrice: line.unitPrice ?? 0,
      taxRate: line.taxRate ?? 0
    });
    const taxPercent = ((line.taxRate ?? 0) * 100).toFixed(2);
    const amount = totals.total;
    return (
      <tr key={key}>
        <td className="px-4 py-3">
          <div className="space-y-1">
            <p className="font-medium text-slate-900">{line.name ?? 'Product'}</p>
            <div className="text-xs text-slate-500">
              {line.variantLabel ? <span className="mr-2">{line.variantLabel}</span> : null}
              {line.variantSku ? (
                <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  SKU: {line.variantSku}
                </span>
              ) : null}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right font-medium text-slate-900">{line.quantity}</td>
        <td className="px-4 py-3 text-right">{formatCurrency(line.unitPrice ?? 0, currency)}</td>
        <td className="px-4 py-3 text-right">{taxPercent}%</td>
        <td className="px-4 py-3 text-right font-medium text-slate-900">
          {formatCurrency(amount, currency)}
        </td>
        {editingEnabled && canEdit ? (
          <td className="px-4 py-3">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  void beginEditLine(index);
                }}
                disabled={isUpdating}
                className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Edit line"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleRemoveLine(index);
                }}
                disabled={isUpdating}
                className="rounded-full border border-rose-200 p-1 text-rose-500 transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Remove line"
              >
                <TrashIcon />
              </button>
            </div>
          </td>
        ) : null}
      </tr>
    );
  };

  const renderEditingRow = (
    line: OrderDetail['lines'][number] | null,
    index: number,
    key: string
  ) => {
    if (!lineDraft || lineDraft.key !== key) {
      return null;
    }
    const quantityValue = Number.parseInt(lineDraft.quantity, 10) || 0;
    const unitPriceValue = Number.parseFloat(lineDraft.unitPrice) || 0;
    const taxRatePercent = Number.parseFloat(lineDraft.taxRate) || 0;
    const totals = computeLineTotals({
      quantity: quantityValue,
      unitPrice: unitPriceValue,
      taxRate: taxRatePercent / 100
    });
    const initialLabel = lineDraft.productOption
      ? formatOptionLabel(lineDraft.productOption)
      : line
        ? [line.name, line.variantLabel ?? line.variantSku ?? null].filter(Boolean).join(' · ')
        : undefined;
    return (
      <tr key={key} className="bg-slate-50">
        <td
          colSpan={editingEnabled && canEdit ? 6 : 5}
          className="px-4 py-4"
        >
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Product
                </label>
                <OrderProductSearchSelect
                  selected={lineDraft.productOption ?? undefined}
                  initialLabel={initialLabel}
                  currencyCode={currency}
                  disabled={isUpdating}
                  onSelect={(option) => {
                    void handleLineProductSelect(option);
                  }}
                />
              </div>
              {lineDraft.variantOptions.length ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Variant
                  </label>
                  <select
                    value={lineDraft.selectedVariant}
                    onChange={(event) => handleLineVariantChange(event.target.value)}
                    disabled={isUpdating || lineDraft.loadingVariants}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {lineDraft.variantOptions.map((variant, variantIndex) => {
                      const value =
                        resolveVariantValue(variant.id ?? null, variant.key ?? null) ||
                        `variant-${variantIndex}`;
                      return (
                        <option key={value} value={value}>
                          {getVariantDisplayName(variant)}
                        </option>
                      );
                    })}
                  </select>
                  {lineDraft.loadingVariants ? (
                    <p className="text-xs text-slate-500">Loading variants…</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={lineDraft.quantity}
                  onChange={(event) => handleLineQuantityChange(event.target.value)}
                  disabled={isUpdating}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Unit price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineDraft.unitPrice}
                  onChange={(event) => handleLineUnitPriceChange(event.target.value)}
                  disabled={isUpdating}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tax %
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={lineDraft.taxRate}
                  onChange={(event) => handleLineTaxRateChange(event.target.value)}
                  disabled={isUpdating}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Totals</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatCurrency(totals.total, currency)}
                </p>
                <p className="text-xs text-slate-500">
                  Subtotal {formatCurrency(totals.subtotal, currency)} · Tax {formatCurrency(totals.taxAmount, currency)}
                </p>
              </div>
            </div>
            {lineDraft.error ? (
              <p className="text-sm text-rose-600">{lineDraft.error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleLineDraftSave();
                }}
                disabled={isUpdating}
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save line
              </button>
              <button
                type="button"
                onClick={cancelLineEdit}
                className="inline-flex items-center rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading>Order items</SectionHeading>
          {editingEnabled && canEdit ? (
            <button
              type="button"
              onClick={() => beginAddLine()}
              disabled={isUpdating || editingLineKey === 'new'}
              className="inline-flex items-center gap-2 rounded-full border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusIcon /> Add item
            </button>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2 text-left">Item</th>
                <th scope="col" className="px-4 py-2 text-right">Qty</th>
                <th scope="col" className="px-4 py-2 text-right">Rate</th>
                <th scope="col" className="px-4 py-2 text-right">Tax</th>
                <th scope="col" className="px-4 py-2 text-right">Amount</th>
                {editingEnabled && canEdit ? <th scope="col" className="px-4 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => {
                const key = `existing-${index}`;
                if (editingLineKey === key && lineDraft?.key === key) {
                  return renderEditingRow(line, index, key);
                }
                return renderDisplayRow(line, index, key);
              })}
              {lineDraft?.key === 'new' ? renderEditingRow(null, lines.length, 'new') : null}
              {lines.length === 0 && lineDraft?.key !== 'new' ? (
                <tr>
                  <td
                    colSpan={editingEnabled && canEdit ? 6 : 5}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No line items recorded for this order.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
                <dd className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {formatCurrency(summary.shippingTotal ?? 0, currency)}
                  {summary.shippingMethod ? (
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {summary.shippingMethod}
                    </span>
                  ) : null}
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
          {editingEnabled && canEdit ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {isEditingShipping ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Shipping charges
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingDraft.amount}
                      onChange={(event) =>
                        setShippingDraft((current) => ({ ...current, amount: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Shipping method
                    </label>
                    <select
                      value={shippingDraft.method}
                      onChange={(event) =>
                        setShippingDraft((current) => ({ ...current, method: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">No method</option>
                      {shippingMethodOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleShippingSave();
                      }}
                      className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleShippingCancel}
                      className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Shipping adjustments</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(summary?.shippingTotal ?? 0, currency)}{' '}
                      {summary?.shippingMethod ? `· ${summary.shippingMethod}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingShipping(true)}
                    className="text-xs font-semibold text-primary transition hover:text-primary/80"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Coupon</p>
            {appliedCoupon ? (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {appliedCoupon.name ?? appliedCoupon.code ?? 'Applied coupon'}
                  </p>
                  {couponDescription ? <p className="text-xs text-emerald-600">{couponDescription}</p> : null}
                  {appliedCoupon.discountAmount != null ? (
                    <p className="text-xs text-emerald-600">
                      Discount saved: {formatCurrency(appliedCoupon.discountAmount, currency)}
                    </p>
                  ) : null}
                </div>
                {editingEnabled && canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleRemoveCoupon();
                    }}
                    className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ) : editingEnabled && canEdit ? (
              couponsQuery.isLoading ? (
                <p className="text-xs text-slate-500">Loading coupons…</p>
              ) : couponsQuery.error ? (
                <p className="text-xs text-rose-600">Unable to load coupons right now.</p>
              ) : couponOptions.length ? (
                <div className="space-y-2">
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value)) {
                        const option = couponOptions.find((coupon) => coupon.id === value);
                        if (option) {
                          void handleApplyCouponOption(option);
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select coupon…</option>
                    {couponOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}{' '}
                        {option.discountType === 'PERCENTAGE'
                          ? `· ${option.discountValue}%`
                          : `· -${formatCurrency(option.discountValue, currency)}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">Applying a coupon recalculates the order total automatically.</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No coupons are currently available.</p>
              )
            ) : (
              <p className="text-xs text-slate-500">No coupon applied.</p>
            )}
          </div>
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
