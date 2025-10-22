import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminOrderCustomerOption,
  AdminOrderPayload,
  AdminOrderProductOption,
  AdminOrderProductVariantOption,
  OrderDetail
} from '../../../types/orders';
import type { CheckoutAddress, CheckoutOrderLine, PaymentMethod, ShippingQuote } from '../../../types/checkout';
import { adminApi } from '../../../services/http';
import Spinner from '../../../components/Spinner';
import Button from '../../../components/Button';
import { formatCurrency } from '../../../utils/currency';
import { extractErrorMessage } from '../../../utils/errors';
import { useToast } from '../../../components/ToastProvider';
import OrderProductSearchSelect from './OrderProductSearchSelect';
import type { CouponSummary } from '../../../types/coupon';
import type { Pagination } from '../../../types/models';
import type { DiscountType } from '../../../types/product';

type OrderEditorMode = 'create' | 'edit';

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
  productSku: string;
  productVariety: string;
  productSlot: string;
  brandName: string;
  taxRateId: string;
  taxRateName: string;
  thumbnailUrl: string;
  selectedProduct: AdminOrderProductOption | null;
  variants: AdminOrderProductVariantOption[];
};

type CouponOption = {
  id: number;
  name: string;
  code?: string | null;
  discountType: DiscountType;
  discountValue: number;
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
  variantLabel: '',
  productSku: '',
  productVariety: '',
  productSlot: '',
  brandName: '',
  taxRateId: '',
  taxRateName: '',
  thumbnailUrl: '',
  selectedProduct: null,
  variants: []
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

const formatLineProductLabel = (line: OrderLineFormState): string => {
  const segments: string[] = [];
  const productName = line.name.trim();
  if (productName) {
    segments.push(productName);
  }
  const variantLabel = line.variantLabel.trim();
  const variantSku = line.variantSku.trim();
  const variant = variantLabel || variantSku;
  if (variant && !segments.some((segment) => segment.includes(variant))) {
    segments.push(variant);
  }
  let label = segments.join(' · ');
  const sku = variantSku || line.productSku.trim();
  if (sku && !label.includes(sku)) {
    label = label ? `${label} (${sku})` : sku;
  }
  return label;
};

const ReadOnlyField = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    <span className="mt-1 break-words text-sm font-medium text-slate-900">{value ?? '—'}</span>
  </div>
);

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

const expandProductOptions = (option: AdminOrderProductOption): AdminOrderProductOption[] => {
  const variants = sanitizeVariants(option.variants);
  if (!variants.length) {
    return [{ ...option, variants }];
  }
  return variants.map((variant) => ({
    ...option,
    variantId: variant.id ?? null,
    variantSku: variant.sku ?? option.variantSku ?? null,
    variantLabel: variant.label ?? option.variantLabel ?? null,
    variantKey: variant.key ?? option.variantKey ?? null,
    unitPrice: variant.unitPrice ?? option.unitPrice,
    variants
  }));
};

const toLineFromOption = (
  line: OrderLineFormState,
  option: AdminOrderProductOption
): OrderLineFormState => {
  const sanitizedVariants = sanitizeVariants(option.variants);
  const existingQuantity = Number.parseInt(line.quantity, 10);
  const safeQuantity = Number.isFinite(existingQuantity) && existingQuantity > 0
    ? line.quantity
    : '1';
  const unitPriceValue = Number(option.unitPrice ?? 0);
  const unitPrice = Number.isFinite(unitPriceValue) ? unitPriceValue.toFixed(2) : '0';
  const taxRateValue = option.taxRate != null && Number.isFinite(option.taxRate)
    ? (option.taxRate * 100).toFixed(2)
    : '';
  const variantIdentifier = resolveVariantValue(option.variantId, option.variantKey);
  return {
    ...line,
    selectedProduct: option,
    productId: option.productId != null ? String(option.productId) : '',
    name: option.productName,
    productSlug: option.productSlug ?? '',
    variantId: variantIdentifier,
    variantSku: option.variantSku ?? '',
    variantLabel: option.variantLabel ?? '',
    productSku: option.variantSku ?? option.productSku ?? '',
    productVariety: option.productVariety ?? '',
    productSlot: option.productSlot ?? '',
    brandName: option.brandName ?? '',
    taxRateId: option.taxRateId != null ? String(option.taxRateId) : '',
    taxRateName: option.taxRateName ?? '',
    thumbnailUrl: option.thumbnailUrl ?? '',
    unitPrice,
    taxRate: taxRateValue,
    quantity: safeQuantity,
    variants: sanitizedVariants
  };
};

const getVariantDisplayName = (variant: AdminOrderProductVariantOption): string => {
  const label = variant.label?.trim();
  if (label) {
    return label;
  }
  const sku = variant.sku?.trim();
  if (sku) {
    return sku;
  }
  const key = variant.key?.trim();
  if (key) {
    return key;
  }
  return 'Default configuration';
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
  initialCustomer?: { id: number; fullName?: string | null; email?: string | null } | null;
};

const OrderEditor = ({
  mode,
  baseCurrency,
  onCancel,
  onSaved,
  initialOrder,
  initialCustomer
}: OrderEditorProps) => {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const initialCustomerId =
    mode === 'edit'
      ? initialOrder?.customerId ?? null
      : initialCustomer?.id ?? null;
  const [customerId, setCustomerId] = useState<number | null>(initialCustomerId);
  const [customerEmail, setCustomerEmail] = useState(
    mode === 'edit' ? initialOrder?.customerEmail ?? '' : initialCustomer?.email ?? ''
  );
  const [customerName, setCustomerName] = useState(
    mode === 'edit' ? initialOrder?.customerName ?? '' : initialCustomer?.fullName ?? ''
  );
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
        const taxRatePercent = line.taxRate != null ? line.taxRate * 100 : null;
        return {
          key: createLineKey(),
          productId: line.productId != null ? String(line.productId) : '',
          name: line.name ?? '',
          quantity: line.quantity != null ? String(line.quantity) : '1',
          unitPrice: unitPrice != null ? Number(unitPrice).toFixed(2) : '0',
          taxRate: taxRatePercent != null ? taxRatePercent.toFixed(2) : '',
          productSlug: line.productSlug ?? '',
          variantId: line.variantId != null ? String(line.variantId) : '',
          variantSku: line.variantSku ?? '',
          variantLabel: line.variantLabel ?? '',
          productSku: line.variantSku ?? '',
          productVariety: '',
          productSlot: '',
          brandName: '',
          taxRateId: '',
          taxRateName: '',
          thumbnailUrl: '',
          selectedProduct: null,
          variants: []
        } as OrderLineFormState;
      });
    }
    return [createEmptyLine()];
  });
  const [productOptionCache, setProductOptionCache] = useState<Record<number, AdminOrderProductOption[]>>({});
  const productOptionCacheRef = useRef<Record<number, AdminOrderProductOption[]>>({});
  const loadingProductIdsRef = useRef<Set<number>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [shippingManuallyEdited, setShippingManuallyEdited] = useState(mode === 'edit');
  const [isFetchingShippingQuote, setIsFetchingShippingQuote] = useState(false);
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(
    initialOrder?.summary?.appliedCoupon?.id ?? null
  );
  const [discountManuallyEdited, setDiscountManuallyEdited] = useState(false);
  const [selectedPaymentMethodKey, setSelectedPaymentMethodKey] = useState(
    initialOrder?.paymentMethod?.key ?? ''
  );
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState('');
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState('');

  useEffect(() => {
    productOptionCacheRef.current = productOptionCache;
  }, [productOptionCache]);

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
        const expanded = expandProductOptions({
          ...fallback,
          variants: sanitizeVariants(fallback.variants)
        });
        if (expanded.length) {
          setProductOptionCache((current) => ({ ...current, [productId]: expanded }));
          return expanded;
        }
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
        }
        return options;
      } catch (error) {
        console.error('Unable to load product variants for admin order', error);
        return [];
      } finally {
        loadingProductIdsRef.current.delete(productId);
      }
    },
    []
  );

  const customersQuery = useQuery<AdminOrderCustomerOption[]>({
    queryKey: ['orders', 'admin', 'customers'],
    queryFn: async () => {
      const { data } = await adminApi.get<AdminOrderCustomerOption[]>('/orders/customers', {
        params: { limit: 200 }
      });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000
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

  const couponsQuery = useQuery<Pagination<CouponSummary>>({
    queryKey: ['orders', 'admin', 'coupons', 'active'],
    queryFn: async () => {
      const { data } = await adminApi.get<Pagination<CouponSummary>>('/coupons', {
        params: { state: 'ENABLED', page: 0, size: 100 }
      });
      return data;
    },
    staleTime: 60_000
  });

  const couponOptions = useMemo<CouponOption[]>(() => {
    const available = couponsQuery.data?.content ?? [];
    const mapped = available.map((coupon) => ({
      id: coupon.id,
      name: coupon.name,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    }));
    const applied = initialOrder?.summary?.appliedCoupon;
    if (applied && applied.id != null && !mapped.some((coupon) => coupon.id === applied.id)) {
      mapped.unshift({
        id: applied.id,
        name: applied.name ?? applied.code ?? 'Applied coupon',
        code: applied.code ?? null,
        discountType: applied.discountType as DiscountType,
        discountValue:
          applied.discountValue != null
            ? applied.discountValue
            : applied.discountAmount != null
              ? applied.discountAmount
              : 0
      });
    }
    return mapped;
  }, [couponsQuery.data, initialOrder]);

  const selectedCoupon = useMemo(
    () => (selectedCouponId != null ? couponOptions.find((coupon) => coupon.id === selectedCouponId) ?? null : null),
    [couponOptions, selectedCouponId]
  );

  useEffect(() => {
    const numericProductIds = Array.from(
      new Set(
        lines
          .map((line) => {
            const value = Number(line.productId.trim());
            return Number.isFinite(value) ? value : null;
          })
          .filter((value): value is number => value != null)
      )
    );
    const missingProductIds = numericProductIds.filter((productId) => {
      if (loadingProductIdsRef.current.has(productId)) {
        return false;
      }
      const cached = productOptionCacheRef.current[productId];
      return !cached || cached.length === 0;
    });
    if (!missingProductIds.length) {
      return;
    }
    missingProductIds.forEach((id) => loadingProductIdsRef.current.add(id));
    let cancelled = false;
    const load = async () => {
      try {
        const responses = await Promise.all(
          missingProductIds.map(async (productId) => {
            try {
              const { data } = await adminApi.get<AdminOrderProductOption[]>(`/orders/products/${productId}`);
              return [productId, Array.isArray(data) ? data : []] as const;
            } catch (error) {
              console.error('Unable to load product variants for admin order', error);
              return [productId, []] as const;
            }
          })
        );
        if (cancelled) {
          return;
        }
        setProductOptionCache((current) => {
          const next = { ...current };
          for (const [productId, options] of responses) {
            if (options.length) {
              next[productId] = options.map((option) => ({
                ...option,
                variants: sanitizeVariants(option.variants)
              }));
            } else if (!next[productId]) {
              next[productId] = [];
            }
          }
          return next;
        });
      } finally {
        missingProductIds.forEach((id) => loadingProductIdsRef.current.delete(id));
      }
    };
    void load();
    return () => {
      cancelled = true;
      missingProductIds.forEach((id) => loadingProductIdsRef.current.delete(id));
    };
  }, [lines]);

  useEffect(() => {
    if (billingSameAsShipping) {
      setBillingAddress({ ...shippingAddress });
    }
  }, [billingSameAsShipping, shippingAddress]);

  useEffect(() => {
    if (mode !== 'create' || initialCustomer?.id == null) {
      return;
    }
    setCustomerId((current) => (current == null ? initialCustomer.id : current));
    setCustomerEmail((current) => {
      if (current && current.trim().length > 0) {
        return current;
      }
      return initialCustomer.email ?? '';
    });
    setCustomerName((current) => {
      if (current && current.trim().length > 0) {
        return current;
      }
      return initialCustomer.fullName ?? '';
    });
  }, [mode, initialCustomer]);

  useEffect(() => {
    if (!Object.keys(productOptionCache).length) {
      return;
    }
    setLines((current) =>
      current.map((line) => {
        const productIdValue = Number(line.productId.trim());
        if (!Number.isFinite(productIdValue)) {
          return line;
        }
        const cachedOptions = productOptionCache[productIdValue];
        if (!cachedOptions || cachedOptions.length === 0) {
          if (line.variants.length) {
            return { ...line, variants: [] };
          }
          return line;
        }
        const targetOption =
          cachedOptions.find((option) => {
            const variantIdValue = resolveVariantValue(option.variantId, option.variantKey);
            return variantIdValue === line.variantId;
          }) ?? cachedOptions[0];
        if (!targetOption) {
          return line;
        }
        const sanitizedVariants = sanitizeVariants(targetOption.variants);
        const sameProduct =
          line.selectedProduct?.productId === targetOption.productId &&
          (line.selectedProduct?.variantId ?? null) === (targetOption.variantId ?? null);
        const sameVariantCount = line.variants.length === sanitizedVariants.length;
        if (sameProduct && sameVariantCount) {
          if (line.variants !== sanitizedVariants) {
            return { ...line, variants: sanitizedVariants };
          }
          return line;
        }
        return toLineFromOption(line, { ...targetOption, variants: sanitizedVariants });
      })
    );
  }, [productOptionCache]);

  const customers = useMemo(() => {
    const list = customersQuery.data ?? [];
    const enriched = [...list];
    if (mode === 'edit' && initialCustomerId != null && initialOrder) {
      if (!enriched.some((customer) => customer.id === initialCustomerId)) {
        enriched.unshift({
          id: initialCustomerId,
          fullName:
            initialOrder.customerName ??
            initialOrder.customerEmail ??
            `Customer #${initialCustomerId}`,
          email: initialOrder.customerEmail ?? null
        });
      }
    } else if (mode === 'create' && initialCustomer?.id != null) {
      if (!enriched.some((customer) => customer.id === initialCustomer.id)) {
        enriched.unshift({
          id: initialCustomer.id,
          fullName:
            initialCustomer.fullName ??
            initialCustomer.email ??
            `Customer #${initialCustomer.id}`,
          email: initialCustomer.email ?? null
        });
      }
    }
    return enriched;
  }, [customersQuery.data, mode, initialCustomerId, initialOrder, initialCustomer]);

  useEffect(() => {
    if (mode === 'create' && customerId != null) {
      const selected = customers.find((customer) => customer.id === customerId);
      if (selected) {
        setCustomerEmail(selected.email ?? '');
        setCustomerName(selected.fullName ?? '');
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

  useEffect(() => {
    if (!selectedCoupon || discountManuallyEdited) {
      return;
    }
    const baseAmount = productTotal + taxTotal + shippingTotal;
    if (!Number.isFinite(baseAmount)) {
      return;
    }
    let computed =
      selectedCoupon.discountType === 'PERCENTAGE'
        ? (baseAmount * selectedCoupon.discountValue) / 100
        : selectedCoupon.discountValue;
    computed = Math.max(0, computed);
    setDiscountInput(roundCurrency(computed).toFixed(2));
  }, [selectedCoupon, productTotal, taxTotal, shippingTotal, discountManuallyEdited]);

  useEffect(() => {
    if (shippingManuallyEdited) {
      return;
    }
    const countryId = parseOptionalNumber(shippingAddress.countryId);
    const stateId = parseOptionalNumber(shippingAddress.stateId);
    const cityId = parseOptionalNumber(shippingAddress.cityId);
    if (countryId == null && stateId == null && cityId == null) {
      return;
    }
    let cancelled = false;
    const fetchQuote = async () => {
      setIsFetchingShippingQuote(true);
      setShippingQuoteError(null);
      try {
        const { data } = await adminApi.get<ShippingQuote>('/shipping/rates/quote', {
          params: {
            countryId: countryId ?? undefined,
            stateId: stateId ?? undefined,
            cityId: cityId ?? undefined
          }
        });
        if (cancelled) {
          return;
        }
        const total =
          data?.effectiveCost ?? data?.cityCost ?? data?.stateCost ?? data?.countryCost ?? 0;
        setShippingTotalInput(String(total ?? 0));
      } catch (error) {
        if (!cancelled) {
          setShippingQuoteError(
            extractErrorMessage(error, 'Unable to resolve shipping rate automatically.')
          );
        }
      } finally {
        if (!cancelled) {
          setIsFetchingShippingQuote(false);
        }
      }
    };
    void fetchQuote();
    return () => {
      cancelled = true;
    };
  }, [
    shippingAddress.countryId,
    shippingAddress.stateId,
    shippingAddress.cityId,
    shippingManuallyEdited
  ]);

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

  const handleProductSelect = useCallback(
    (key: string, option: AdminOrderProductOption) => {
      const sanitizedOption: AdminOrderProductOption = {
        ...option,
        variants: sanitizeVariants(option.variants)
      };
      const productIdValue = option.productId != null ? Number(option.productId) : Number.NaN;

      setLines((current) =>
        current.map((line) => (line.key === key ? toLineFromOption(line, sanitizedOption) : line))
      );

      if (!Number.isFinite(productIdValue)) {
        return;
      }

      void ensureProductOptions(productIdValue, sanitizedOption).then((options) => {
        if (!options.length) {
          return;
        }
        const targetVariantId = resolveVariantValue(option.variantId, option.variantKey);
        const preferredOption =
          options.find(
            (candidate) =>
              resolveVariantValue(candidate.variantId, candidate.variantKey) === targetVariantId
          ) ?? options[0];
        if (!preferredOption) {
          return;
        }
        const enrichedOption: AdminOrderProductOption = {
          ...preferredOption,
          variants: sanitizeVariants(preferredOption.variants)
        };
        setLines((current) =>
          current.map((line) => {
            if (line.key !== key) {
              return line;
            }
            const currentProductId = Number(line.productId.trim());
            if (
              Number.isFinite(currentProductId) &&
              preferredOption.productId != null &&
              currentProductId !== Number(preferredOption.productId)
            ) {
              return line;
            }
            return toLineFromOption(line, enrichedOption);
          })
        );
      });
    },
    [ensureProductOptions]
  );

  const handleVariantChange = useCallback((key: string, variantId: string) => {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) {
          return line;
        }
        const productIdValue = Number(line.productId.trim());
        if (!Number.isFinite(productIdValue)) {
          return { ...line, variantId };
        }
        const cachedOptions = productOptionCacheRef.current[productIdValue];
        if (!cachedOptions || cachedOptions.length === 0) {
          return { ...line, variantId };
        }
        const targetOption =
          cachedOptions.find((option) => {
            const candidateId = resolveVariantValue(option.variantId, option.variantKey);
            return candidateId === variantId;
          }) ?? cachedOptions[0];
        if (!targetOption) {
          return line;
        }
        return toLineFromOption(line, targetOption);
      })
    );
  }, []);

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
      setShippingManuallyEdited(false);
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
      if (!line.productId.trim()) {
        setFormError('Each line item must reference a product from the catalog.');
        return;
      }
      const productId = Number(line.productId.trim());
      if (!Number.isFinite(productId)) {
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
                        {customer.fullName ?? customer.email ?? `Customer #${customer.id}`}
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
              const initialLabel = line.selectedProduct ? undefined : formatLineProductLabel(line);
              const thumbnailUrl = line.selectedProduct?.thumbnailUrl ?? line.thumbnailUrl;
              const productSlug = line.productSlug.trim();
              const productIdDisplay = line.productId.trim() || '—';
              const variantIdDisplay = line.variantId.trim() || '—';
              const skuDisplay = line.variantSku.trim() || line.productSku.trim() || '—';
              const variantDisplay =
                line.variantLabel.trim() || line.variantSku.trim() || 'Default configuration';
              const varietyDisplay = line.productVariety.trim() || '—';
              const slotDisplay = line.productSlot.trim() || '—';
              const brandDisplay = line.brandName.trim() || '—';
              const taxRateNameDisplay = line.taxRateName.trim() || '—';
              const unitPriceNumber = Number(line.unitPrice);
              const unitPriceDisplay = formatCurrency(
                Number.isFinite(unitPriceNumber) && unitPriceNumber >= 0 ? unitPriceNumber : 0,
                currency
              );
              const taxRateNumber = Number(line.taxRate);
              const taxRateDisplay =
                line.taxRate.trim().length > 0 && Number.isFinite(taxRateNumber)
                  ? `${taxRateNumber.toFixed(2)}%`
                  : '—';
              const metadataFields: { label: string; value: ReactNode }[] = [
                { label: 'Variant', value: variantDisplay },
                { label: 'SKU', value: skuDisplay },
                { label: 'Product ID', value: productIdDisplay },
                { label: 'Variant ID', value: variantIdDisplay },
                { label: 'Variety', value: varietyDisplay },
                { label: 'Slot', value: slotDisplay },
                { label: 'Brand', value: brandDisplay },
                { label: 'Tax code', value: taxRateNameDisplay }
              ];
              return (
                <div key={line.key} className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-1 gap-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-wide text-slate-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <OrderProductSearchSelect
                          selected={line.selectedProduct}
                          initialLabel={initialLabel}
                          disabled={isSaving}
                          currencyCode={currency}
                          onSelect={(option) => handleProductSelect(line.key, option)}
                        />
                        {line.variants.length > 0 ? (
                          <div className="flex flex-col">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Variant option
                            </label>
                            <select
                              value={line.variantId}
                              onChange={(event) => handleVariantChange(line.key, event.target.value)}
                              disabled={isSaving}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {line.variants.map((variant, variantIndex) => {
                                const value = resolveVariantValue(variant.id ?? null, variant.key ?? null);
                                const optionValue = value || `variant-${variantIndex}`;
                                return (
                                  <option key={optionValue} value={optionValue}>
                                    {getVariantDisplayName(variant)}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          {productSlug ? (
                            <>
                              Slug:{' '}
                              <code className="font-mono text-[11px] text-slate-600">{productSlug}</code>
                            </>
                          ) : (
                            'Search and select a product to populate pricing and tax details.'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Item {index + 1}
                      </span>
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
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(event) => handleLineChange(line.key, 'quantity', event.target.value)}
                        disabled={isSaving}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <ReadOnlyField label="Unit price" value={unitPriceDisplay} />
                    <ReadOnlyField label="Tax rate" value={taxRateDisplay} />
                    <ReadOnlyField
                      label="Line subtotal"
                      value={formatCurrency(summary.subtotal, currency)}
                    />
                    <ReadOnlyField
                      label="Tax amount"
                      value={formatCurrency(summary.taxAmount, currency)}
                    />
                    <ReadOnlyField label="Line total" value={formatCurrency(summary.total, currency)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {metadataFields.map((field) => (
                      <ReadOnlyField key={field.label} label={field.label} value={field.value} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
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
              onChange={(event) => {
                setShippingTotalInput(event.target.value);
                setShippingManuallyEdited(true);
              }}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {isFetchingShippingQuote ? (
              <p className="text-xs text-slate-500">Fetching shipping estimate…</p>
            ) : shippingQuoteError ? (
              <p className="text-xs text-rose-600">{shippingQuoteError}</p>
            ) : !shippingManuallyEdited ? (
              <p className="text-xs text-slate-500">
                Automatically updates from the selected shipping address.
              </p>
            ) : null}
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
              onChange={(event) => {
                setDiscountInput(event.target.value);
                setDiscountManuallyEdited(true);
              }}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {selectedCoupon && !discountManuallyEdited ? (
              <p className="text-xs text-slate-500">
                Calculated from coupon “{selectedCoupon.name}”.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="order-coupon">
              Discount / Coupon
            </label>
            {couponsQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <Spinner size="sm" /> Loading coupons…
              </div>
            ) : (
              <select
                id="order-coupon"
                value={selectedCouponId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) {
                    setSelectedCouponId(null);
                    setDiscountInput('0');
                    setDiscountManuallyEdited(false);
                    return;
                  }
                  setSelectedCouponId(Number(value));
                  setDiscountManuallyEdited(false);
                }}
                disabled={isSaving || !!couponsQuery.error}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No coupon</option>
                {couponOptions.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.name} ·{' '}
                    {coupon.discountType === 'PERCENTAGE'
                      ? `${coupon.discountValue}%`
                      : `-${formatCurrency(coupon.discountValue, currency)}`}
                  </option>
                ))}
              </select>
            )}
            {couponsQuery.error ? (
              <p className="text-xs text-rose-600">
                {extractErrorMessage(couponsQuery.error, 'Unable to load coupons.')}
              </p>
            ) : null}
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
