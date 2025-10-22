import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminOrderCouponOption,
  AdminOrderCustomerOption,
  AdminOrderPayload,
  AdminOrderPreviewRequest,
  AdminOrderPreviewResponse,
  AdminOrderProductOption,
  AdminOrderProductSearchResult,
  AdminOrderProductVariantOption,
  OrderDetail
} from '../../../types/orders';
import type { CheckoutAddress, CheckoutOrderLine, PaymentMethod } from '../../../types/checkout';
import { adminApi } from '../../../services/http';
import Spinner from '../../../components/Spinner';
import Button from '../../../components/Button';
import { formatCurrency } from '../../../utils/currency';
import { extractErrorMessage } from '../../../utils/errors';
import { useToast } from '../../../components/ToastProvider';

const createLineKey = () => `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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

type AddressField =
  | 'countryId'
  | 'stateId'
  | 'cityId'
  | 'countryName'
  | 'stateName'
  | 'cityName'
  | 'fullName'
  | 'mobileNumber'
  | 'pinCode'
  | 'addressLine1'
  | 'addressLine2'
  | 'landmark';

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

const addressesMatch = (
  shipping?: CheckoutAddress | null,
  billing?: CheckoutAddress | null
) => {
  if (!shipping || !billing) {
    return false;
  }
  if (shipping.id != null && billing.id != null) {
    return shipping.id === billing.id;
  }
  const normalize = (value: unknown) => (value ?? '').toString().trim().toLowerCase();
  return (
    normalize(shipping.fullName) === normalize(billing.fullName) &&
    normalize(shipping.mobileNumber) === normalize(billing.mobileNumber) &&
    normalize(shipping.addressLine1) === normalize(billing.addressLine1) &&
    normalize(shipping.addressLine2) === normalize(billing.addressLine2) &&
    normalize(shipping.landmark) === normalize(billing.landmark) &&
    normalize(shipping.cityName) === normalize(billing.cityName) &&
    normalize(shipping.stateName) === normalize(billing.stateName) &&
    normalize(shipping.countryName) === normalize(billing.countryName) &&
    normalize(shipping.pinCode) === normalize(billing.pinCode)
  );
};

const isAddressEmpty = (form: AddressFormState) =>
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
  const parseOptional = (value: string): number | null => {
    if (!value || !value.trim()) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    id: form.id ?? undefined,
    type,
    countryId: parseOptional(form.countryId) ?? undefined,
    stateId: parseOptional(form.stateId) ?? undefined,
    cityId: parseOptional(form.cityId) ?? undefined,
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

const parseCurrencyInput = (value: string): number => {
  if (!value || !value.trim()) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type OrderLineState = {
  key: string;
  product: AdminOrderProductOption | null;
  selectedVariant: AdminOrderProductVariantOption | null;
  quantity: number;
  productOptions: AdminOrderProductSearchResult[];
  isSearching: boolean;
  isProductLoading: boolean;
  searchTerm: string;
  searchRequestId: number | null;
};

const createEmptyLine = (): OrderLineState => ({
  key: createLineKey(),
  product: null,
  selectedVariant: null,
  quantity: 1,
  productOptions: [],
  isSearching: false,
  isProductLoading: false,
  searchTerm: '',
  searchRequestId: null
});

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const ORDER_STATUS_OPTIONS = [
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' }
] as const;

type OrderEditorMode = 'create' | 'edit';

type OrderEditorProps = {
  mode: OrderEditorMode;
  baseCurrency: string | null;
  onCancel: () => void;
  onSaved: (order: OrderDetail) => void;
  initialOrder?: OrderDetail | null;
};

const formatCustomerOptionLabel = (option: AdminOrderCustomerOption | null) => {
  if (!option) {
    return '';
  }
  const parts: string[] = [];
  if (option.fullName && option.fullName.trim()) {
    parts.push(option.fullName.trim());
  }
  if (option.email && option.email.trim()) {
    parts.push(`(${option.email.trim()})`);
  }
  return parts.join(' ');
};

const OrderEditor = ({ mode, baseCurrency, onCancel, onSaved, initialOrder }: OrderEditorProps) => {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const initialCustomer: AdminOrderCustomerOption | null = useMemo(() => {
    if (mode === 'edit' && initialOrder) {
      return {
        id: initialOrder.customerId ?? 0,
        fullName: initialOrder.customerName,
        email: initialOrder.customerEmail
      };
    }
    return null;
  }, [mode, initialOrder]);

  const [customer, setCustomer] = useState<AdminOrderCustomerOption | null>(initialCustomer);
  const [customerEmail, setCustomerEmail] = useState(initialOrder?.customerEmail ?? '');
  const [customerName, setCustomerName] = useState(initialOrder?.customerName ?? '');
  const [customerInput, setCustomerInput] = useState(formatCustomerOptionLabel(initialCustomer));
  const [customerOptions, setCustomerOptions] = useState<AdminOrderCustomerOption[]>([]);
  const [isCustomerSearching, setIsCustomerSearching] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);

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
      : Boolean(addressesMatch(initialOrder?.shippingAddress ?? null, initialOrder?.billingAddress ?? null))
  );

  const [lines, setLines] = useState<OrderLineState[]>(() => {
    if (mode === 'edit' && initialOrder?.lines?.length) {
      return initialOrder.lines.map((line) => ({
        key: createLineKey(),
        product: null,
        selectedVariant: null,
        quantity: line.quantity,
        productOptions: [],
        isSearching: false,
        isProductLoading: true,
        searchTerm: line.name ?? '',
        searchRequestId: null
      }));
    }
    return [createEmptyLine()];
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [selectedPaymentMethodKey, setSelectedPaymentMethodKey] = useState(initialOrder?.paymentMethod?.key ?? '');
  const [selectedCoupon, setSelectedCoupon] = useState<AdminOrderCouponOption | null>(
    initialOrder?.summary?.appliedCoupon
      ? {
          id: initialOrder.summary.appliedCoupon.id,
          code: initialOrder.summary.appliedCoupon.code,
          name: initialOrder.summary.appliedCoupon.name,
          discountType: initialOrder.summary.appliedCoupon.discountType,
          discountValue: initialOrder.summary.appliedCoupon.discountValue ?? undefined
        }
      : null
  );
  const [shippingOverrideInput, setShippingOverrideInput] = useState(
    initialOrder?.summary?.shippingTotal != null ? String(initialOrder.summary.shippingTotal) : '0'
  );
  const [discountOverrideInput, setDiscountOverrideInput] = useState(
    initialOrder?.summary?.discountTotal != null ? String(initialOrder.summary.discountTotal) : '0'
  );
  const [hasManualShipping, setHasManualShipping] = useState(false);
  const [hasManualDiscount, setHasManualDiscount] = useState(false);
  const [computedSummary, setComputedSummary] = useState<OrderDetail['summary']>(initialOrder?.summary ?? null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const paymentMethodsQuery = useQuery<PaymentMethod[]>({
    queryKey: ['orders', 'admin', 'paymentMethods'],
    queryFn: async () => {
      const { data } = await adminApi.get<PaymentMethod[]>('/orders/payments/methods');
      return Array.isArray(data) ? data : [];
    }
  });

  const paymentMethods = paymentMethodsQuery.data ?? [];
  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.key === selectedPaymentMethodKey) ?? null,
    [paymentMethods, selectedPaymentMethodKey]
  );

  useEffect(() => {
    if (!selectedPaymentMethodKey && paymentMethods.length) {
      setSelectedPaymentMethodKey(paymentMethods[0].key);
    }
  }, [paymentMethods, selectedPaymentMethodKey]);

  const couponsQuery = useQuery<AdminOrderCouponOption[]>({
    queryKey: ['orders', 'admin', 'coupons', 'active'],
    queryFn: async () => {
      const { data } = await adminApi.get<AdminOrderCouponOption[]>('/orders/coupons/active', {
        params: { size: 100 }
      });
      return Array.isArray(data) ? data : [];
    }
  });

  const addressesQuery = useQuery<CheckoutAddress[]>({
    queryKey: ['orders', 'admin', 'customerAddresses', customer?.id],
    enabled: customer?.id != null,
    queryFn: async () => {
      if (customer?.id == null) {
        return [];
      }
      const { data } = await adminApi.get<CheckoutAddress[]>(`/users/${customer.id}/addresses`);
      return Array.isArray(data) ? data : [];
    }
  });

  useEffect(() => {
    if (billingSameAsShipping) {
      setBillingAddress({ ...shippingAddress });
    }
  }, [billingSameAsShipping, shippingAddress]);

  useEffect(() => {
    const addresses = addressesQuery.data ?? [];
    if (!addresses.length) {
      return;
    }
    setShippingAddress((current) => {
      if (!isAddressEmpty(current) || mode === 'edit') {
        return current;
      }
      const preferred = addresses.find((address) => address.defaultAddress) ?? addresses[0];
      return preferred ? toAddressFormState(preferred) : current;
    });
  }, [addressesQuery.data, mode]);

  const fetchCustomerOptions = useCallback(
    async (term: string) => {
      try {
        setIsCustomerSearching(true);
        setCustomerSearchError(null);
        const { data } = await adminApi.get<AdminOrderCustomerOption[]>('/orders/customers', {
          params: { search: term || undefined, size: 25 }
        });
        setCustomerOptions(Array.isArray(data) ? data : []);
      } catch (error) {
        setCustomerSearchError(extractErrorMessage(error, 'Unable to fetch customers.'));
        setCustomerOptions([]);
      } finally {
        setIsCustomerSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    if (mode === 'create') {
      void fetchCustomerOptions('');
    }
  }, [fetchCustomerOptions, mode]);

  useEffect(() => {
    if (!customerInput.trim()) {
      return;
    }
    const timeout = setTimeout(() => {
      void fetchCustomerOptions(customerInput.trim());
    }, 250);
    return () => clearTimeout(timeout);
  }, [customerInput, fetchCustomerOptions]);

  useEffect(() => {
    if (customer) {
      setCustomerInput(formatCustomerOptionLabel(customer));
      setCustomerEmail(customer.email ?? '');
      setCustomerName(customer.fullName ?? '');
    }
  }, [customer]);

  useEffect(() => {
    if (!customer && mode === 'create') {
      setCustomerEmail('');
      setCustomerName('');
    }
  }, [customer, mode]);

  useEffect(() => {
    if (mode === 'edit' && initialOrder?.lines?.length) {
      const loadProducts = async () => {
        try {
          const productCache = new Map<number, AdminOrderProductOption>();
          const resolvedLines: OrderLineState[] = [];
          for (const existingLine of initialOrder.lines ?? []) {
            if (existingLine.productId == null) {
              resolvedLines.push({
                key: createLineKey(),
                product: null,
                selectedVariant: null,
                quantity: existingLine.quantity,
                productOptions: [],
                isSearching: false,
                isProductLoading: false,
                searchTerm: existingLine.name ?? '',
                searchRequestId: null
              });
              continue;
            }
            if (!productCache.has(existingLine.productId)) {
              try {
                const { data } = await adminApi.get<AdminOrderProductOption>(
                  `/orders/catalog/${existingLine.productId}`
                );
                if (data) {
                  productCache.set(existingLine.productId, data);
                }
              } catch (error) {
                notify({
                  type: 'error',
                  title: 'Missing product',
                  message: extractErrorMessage(error, 'A product in this order could not be loaded.')
                });
              }
            }
            const productOption = productCache.get(existingLine.productId) ?? null;
            const variant = productOption?.variants.find((candidate) => candidate.id === existingLine.variantId) ?? null;
            resolvedLines.push({
              key: createLineKey(),
              product: productOption,
              selectedVariant: variant ?? productOption?.variants[0] ?? null,
              quantity: existingLine.quantity,
              productOptions: [],
              isSearching: false,
              isProductLoading: false,
              searchTerm: productOption?.name ?? existingLine.name ?? '',
              searchRequestId: null
            });
          }
          setLines(resolvedLines.length ? resolvedLines : [createEmptyLine()]);
        } catch {
          setLines([createEmptyLine()]);
        }
      };
      void loadProducts();
    }
  }, [initialOrder, mode, notify]);

  const handleCustomerInputChange = (value: string) => {
    setCustomerInput(value);
    if (customer && value !== formatCustomerOptionLabel(customer)) {
      setCustomer(null);
    }
  };

  const handleCustomerSelect = (option: AdminOrderCustomerOption) => {
    setCustomer(option);
  };

  const updateLineState = useCallback(
    (key: string, updater: (line: OrderLineState) => OrderLineState) => {
      setLines((current) => current.map((line) => (line.key === key ? updater(line) : line)));
    },
    []
  );
  const handleProductSearch = useCallback(
    async (key: string, term: string) => {
      const requestId = Date.now();
      updateLineState(key, (line) => ({
        ...line,
        searchTerm: term,
        searchRequestId: requestId,
        isSearching: true
      }));
      try {
        const { data } = await adminApi.get<AdminOrderProductSearchResult[]>('/orders/catalog', {
          params: { search: term || undefined, size: 20 }
        });
        setLines((current) =>
          current.map((line) =>
            line.key === key && line.searchRequestId === requestId
              ? {
                  ...line,
                  productOptions: Array.isArray(data) ? data : [],
                  isSearching: false
                }
              : line
          )
        );
      } catch (error) {
        updateLineState(key, (line) => ({
          ...line,
          isSearching: false
        }));
        notify({
          type: 'error',
          title: 'Unable to search products',
          message: extractErrorMessage(error, 'Try refining your search term.')
        });
      }
    },
    [notify, updateLineState]
  );

  const handleSelectProduct = useCallback(
    async (key: string, productId: number) => {
      updateLineState(key, (line) => ({
        ...line,
        isProductLoading: true,
        productOptions: [],
        searchTerm: line.searchTerm
      }));
      try {
        const { data } = await adminApi.get<AdminOrderProductOption>(`/orders/catalog/${productId}`);
        setLines((current) =>
          current.map((line) =>
            line.key === key
              ? {
                  ...line,
                  product: data,
                  selectedVariant: data?.variants[0] ?? null,
                  isProductLoading: false,
                  searchTerm: data?.name ?? line.searchTerm
                }
              : line
          )
        );
      } catch (error) {
        updateLineState(key, (line) => ({
          ...line,
          isProductLoading: false
        }));
        notify({
          type: 'error',
          title: 'Unable to load product',
          message: extractErrorMessage(error, 'Select a different product or try again later.')
        });
      }
    },
    [notify, updateLineState]
  );

  const handleVariantChange = useCallback(
    (key: string, variantId: string) => {
      updateLineState(key, (line) => {
        if (!line.product) {
          return line;
        }
        const variant = line.product.variants.find((candidate) => `${candidate.id ?? ''}` === variantId) ?? null;
        return {
          ...line,
          selectedVariant: variant
        };
      });
    },
    [updateLineState]
  );

  const handleQuantityChange = useCallback(
    (key: string, quantity: string) => {
      const parsed = Number(quantity);
      updateLineState(key, (line) => ({
        ...line,
        quantity: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
      }));
    },
    [updateLineState]
  );

  const handleRemoveLine = (key: string) => {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current));
  };

  const handleAddLine = () => {
    setLines((current) => [...current, createEmptyLine()]);
  };

  const readyForPreview = useMemo(() => {
    if (!customer?.id) {
      return false;
    }
    if (!lines.length) {
      return false;
    }
    return lines.every((line) => line.product && line.selectedVariant);
  }, [customer, lines]);

  useEffect(() => {
    if (!readyForPreview) {
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsPreviewing(true);
      setPreviewError(null);
      try {
        const payload: AdminOrderPreviewRequest = {
          customerId: customer!.id,
          shippingAddressId: shippingAddress.id ?? undefined,
          billingAddressId: billingSameAsShipping ? shippingAddress.id ?? undefined : billingAddress.id ?? undefined,
          billingSameAsShipping,
          couponCode: selectedCoupon?.code ?? undefined,
          lines: lines
            .filter((line) => line.product && line.selectedVariant)
            .map((line) => ({
              productId: line.product!.id,
              variantId: line.selectedVariant!.id ?? undefined,
              quantity: line.quantity
            }))
        };
        const { data } = await adminApi.post<AdminOrderPreviewResponse>('/orders/preview', payload);
        if (cancelled) {
          return;
        }
        const summary = data?.summary ?? null;
        setComputedSummary(summary);
        if (!hasManualShipping) {
          setShippingOverrideInput(String(summary?.shippingTotal ?? 0));
        }
        if (!hasManualDiscount) {
          setDiscountOverrideInput(String(summary?.discountTotal ?? 0));
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(extractErrorMessage(error, 'Unable to refresh totals.'));
        }
      } finally {
        if (!cancelled) {
          setIsPreviewing(false);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    readyForPreview,
    customer,
    shippingAddress,
    billingAddress,
    billingSameAsShipping,
    selectedCoupon,
    lines,
    hasManualDiscount,
    hasManualShipping
  ]);

  const baseCurrencyCode = baseCurrency ?? 'USD';

  const calculateLineTotals = useCallback(
    (line: OrderLineState) => {
      const unitPrice = line.selectedVariant?.unitPrice ?? 0;
      const quantity = line.quantity;
      const taxRate = line.selectedVariant?.taxRate ?? 0;
      const subtotal = roundCurrency(unitPrice * quantity);
      const tax = roundCurrency(subtotal * taxRate);
      return {
        unitPrice,
        subtotal,
        tax,
        total: roundCurrency(subtotal + tax)
      };
    },
    []
  );

  const productSubtotal = lines
    .filter((line) => line.product && line.selectedVariant)
    .map((line) => calculateLineTotals(line).subtotal)
    .reduce((sum, value) => sum + value, 0);

  const taxSubtotal = lines
    .filter((line) => line.product && line.selectedVariant)
    .map((line) => calculateLineTotals(line).tax)
    .reduce((sum, value) => sum + value, 0);

  const shippingTotal = hasManualShipping
    ? parseCurrencyInput(shippingOverrideInput)
    : computedSummary?.shippingTotal ?? parseCurrencyInput(shippingOverrideInput);

  const discountTotal = hasManualDiscount
    ? parseCurrencyInput(discountOverrideInput)
    : computedSummary?.discountTotal ?? parseCurrencyInput(discountOverrideInput);

  const computedGrandTotal = Math.max(0, roundCurrency(productSubtotal + taxSubtotal + shippingTotal - discountTotal));
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
      setFormError(extractErrorMessage(error, 'Unable to save the order. Please review the details and try again.'));
    }
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const customerId = customer?.id ?? initialOrder?.customerId ?? null;
    if (!customerId) {
      setFormError('Select a customer before saving this order.');
      return;
    }

    const finalizedLines: CheckoutOrderLine[] = [];
    for (const line of lines) {
      if (!line.product || !line.selectedVariant) {
        setFormError('Each line item must reference a product.');
        return;
      }
      finalizedLines.push({
        productId: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        unitPrice: roundCurrency(line.selectedVariant.unitPrice ?? 0),
        taxRate: line.selectedVariant.taxRate ?? undefined,
        productSlug: line.product.slug,
        variantId: line.selectedVariant.id ?? undefined,
        variantSku: line.selectedVariant.sku ?? undefined,
        variantLabel: line.selectedVariant.label ?? undefined
      });
    }

    if (!finalizedLines.length) {
      setFormError('Add at least one product to the order.');
      return;
    }

    const summary = {
      productTotal: roundCurrency(productSubtotal),
      taxTotal: roundCurrency(taxSubtotal),
      shippingTotal: roundCurrency(shippingTotal),
      discountTotal: roundCurrency(discountTotal),
      grandTotal: computedGrandTotal,
      taxLines: computedSummary?.taxLines ?? [],
      shippingBreakdown: computedSummary?.shippingBreakdown ?? null,
      appliedCoupon: computedSummary?.appliedCoupon ?? null
    };

    const shippingPayload = toAddressPayload(shippingAddress, 'SHIPPING');
    const billingPayload = billingSameAsShipping ? shippingPayload : toAddressPayload(billingAddress, 'BILLING');

    const payload: AdminOrderPayload = {
      customerId,
      customerEmail: customerEmail.trim() || null,
      customerName: customerName.trim() || null,
      status: status.trim() || null,
      shippingAddress: shippingPayload,
      billingAddress: billingPayload,
      paymentMethod: selectedPaymentMethod,
      summary,
      lines: finalizedLines
    };

    try {
      await mutation.mutateAsync(payload);
    } catch {
      // handled via mutation onError
    }
  };

  const handleCouponChange = (code: string) => {
    if (!code) {
      setSelectedCoupon(null);
      setHasManualDiscount(false);
      return;
    }
    const option = couponsQuery.data?.find((coupon) => coupon.code === code) ?? null;
    setSelectedCoupon(option);
    setHasManualDiscount(false);
  };

  const baseTotalsReady = lines.some((line) => line.product && line.selectedVariant);

  const renderLineTotals = (line: OrderLineState) => {
    if (!line.product || !line.selectedVariant) {
      return null;
    }
    const totals = calculateLineTotals(line);
    return (
      <div className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span>Subtotal: {formatCurrency(totals.subtotal, baseCurrencyCode)}</span>
        <span>Tax: {formatCurrency(totals.tax, baseCurrencyCode)}</span>
        <span className="font-semibold text-slate-900">
          Line total: {formatCurrency(totals.total, baseCurrencyCode)}
        </span>
      </div>
    );
  };

  const savedAddresses = addressesQuery.data ?? [];
  const addressesError = addressesQuery.isError
    ? extractErrorMessage(addressesQuery.error, 'Unable to load saved addresses for this customer.')
    : null;

  const handleAddressFieldChange = (
    setter: React.Dispatch<React.SetStateAction<AddressFormState>>,
    field: AddressField,
    value: string
  ) => {
    setter((prev) => ({
      ...prev,
      [field]: value,
      id: null
    }));
  };

  const handleShippingSelectionChange = (value: string) => {
    if (!value) {
      setShippingAddress(createEmptyAddressState());
      return;
    }
    if (value === 'custom') {
      setShippingAddress((prev) => ({ ...prev, id: null }));
      return;
    }
    const selected = savedAddresses.find((address) => String(address.id) === value);
    if (selected) {
      setShippingAddress(toAddressFormState(selected));
    }
  };

  const handleBillingSelectionChange = (value: string) => {
    if (!value) {
      setBillingAddress(createEmptyAddressState());
      return;
    }
    if (value === 'custom') {
      setBillingAddress((prev) => ({ ...prev, id: null }));
      return;
    }
    const selected = savedAddresses.find((address) => String(address.id) === value);
    if (selected) {
      setBillingAddress(toAddressFormState(selected));
    }
  };

  const shippingSelectionValue = (() => {
    if (shippingAddress.id != null && savedAddresses.some((address) => address.id === shippingAddress.id)) {
      return String(shippingAddress.id);
    }
    return isAddressEmpty(shippingAddress) ? '' : 'custom';
  })();

  const billingSelectionValue = (() => {
    if (billingAddress.id != null && savedAddresses.some((address) => address.id === billingAddress.id)) {
      return String(billingAddress.id);
    }
    return isAddressEmpty(billingAddress) ? '' : 'custom';
  })();
  const renderAddressFields = (
    label: string,
    form: AddressFormState,
    onChange: (field: AddressField, value: string) => void,
    selectionValue: string,
    onSelectionChange: (value: string) => void,
    disabled: boolean
  ) => (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{label}</h3>
          <p className="text-xs text-slate-500">
            Choose an existing address or enter a custom destination for this order only.
          </p>
        </div>
        <div className="min-w-[220px]">
          <label className="sr-only">Select saved address</label>
          <select
            value={selectionValue}
            onChange={(event) => onSelectionChange(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled || !savedAddresses.length}
          >
            <option value="">Enter manually</option>
            {savedAddresses.map((address) => (
              <option key={address.id} value={address.id ?? ''}>
                {address.fullName} · {address.cityName ?? 'City'}
              </option>
            ))}
            <option value="custom">Custom address</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => onChange('fullName', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
          <input
            type="tel"
            value={form.mobileNumber}
            onChange={(event) => onChange('mobileNumber', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Address line 1</label>
          <input
            type="text"
            value={form.addressLine1}
            onChange={(event) => onChange('addressLine1', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Address line 2</label>
          <input
            type="text"
            value={form.addressLine2}
            onChange={(event) => onChange('addressLine2', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">City</label>
          <input
            type="text"
            value={form.cityName}
            onChange={(event) => onChange('cityName', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">State</label>
          <input
            type="text"
            value={form.stateName}
            onChange={(event) => onChange('stateName', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Country</label>
          <input
            type="text"
            value={form.countryName}
            onChange={(event) => onChange('countryName', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Postal code</label>
          <input
            type="text"
            value={form.pinCode}
            onChange={(event) => onChange('pinCode', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Landmark</label>
          <input
            type="text"
            value={form.landmark}
            onChange={(event) => onChange('landmark', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={disabled}
          />
        </div>
      </div>
    </section>
  );

  const renderProductLine = (line: OrderLineState, index: number) => {
    const variantOptions = line.product?.variants ?? [];
    const selectedVariant = line.selectedVariant;
    const isResolved = Boolean(line.product && selectedVariant);
    return (
      <div key={line.key} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Line {index + 1}</p>
            <h3 className="text-lg font-semibold text-slate-900">{line.product?.name ?? 'Select a product'}</h3>
            {line.product?.brandName && (
              <p className="text-xs text-slate-500">{line.product.brandName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
            <input
              type="number"
              min={1}
              value={line.quantity}
              onChange={(event) => handleQuantityChange(line.key, event.target.value)}
              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleRemoveLine(line.key)}
              className="text-xs"
            >
              Remove
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Search products</label>
            <div className="relative mt-1">
              <input
                type="text"
                value={line.searchTerm}
                onChange={(event) => handleProductSearch(line.key, event.target.value)}
                placeholder="Start typing to search the catalog"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoComplete="off"
              />
              {line.isProductLoading && (
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">Loading…</span>
              )}
              {line.productOptions.length > 0 && (
                <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {line.productOptions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          void handleSelectProduct(line.key, option.id);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
                      >
                        {option.thumbnailUrl ? (
                          <img
                            src={option.thumbnailUrl}
                            alt=""
                            className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                            IMG
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">{option.name}</p>
                          <p className="text-xs text-slate-500">SKU: {option.sku}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {line.isSearching && (
                <div className="absolute inset-x-0 bottom-[-1.75rem] text-xs text-slate-400">Searching…</div>
              )}
            </div>
          </div>

          <div className="space-y-3 lg:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Variant</label>
            <select
              value={selectedVariant?.id ?? ''}
              onChange={(event) => handleVariantChange(line.key, event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={!line.product}
            >
              {variantOptions.map((variant) => (
                <option key={`${variant.id ?? 'default'}`} value={variant.id ?? ''}>
                  {variant.label ?? variant.sku ?? 'Default'}
                </option>
              ))}
            </select>
            {selectedVariant?.sku && (
              <p className="text-xs text-slate-500">SKU: {selectedVariant.sku}</p>
            )}
            {selectedVariant?.availableQuantity != null && (
              <p className="text-xs text-slate-500">
                Stock: {selectedVariant.availableQuantity} units
              </p>
            )}
          </div>

          <div className="space-y-3 lg:col-span-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <p>Unit price: {formatCurrency(selectedVariant?.unitPrice ?? 0, baseCurrencyCode)}</p>
              <p>Tax rate: {((selectedVariant?.taxRate ?? 0) * 100).toFixed(2)}%</p>
              <p>Subtotal: {formatCurrency(calculateLineTotals(line).subtotal, baseCurrencyCode)}</p>
            </div>
          </div>
        </div>

        {renderLineTotals(line)}
        {!isResolved && (
          <p className="text-xs text-amber-600">Select a product and variant to include this line in the order.</p>
        )}
      </div>
    );
  };
  const renderSummaryRow = (label: string, amount: number, tone: 'normal' | 'emphasis' | 'discount' = 'normal') => {
    const toneClass =
      tone === 'emphasis'
        ? 'text-base font-semibold text-slate-900'
        : tone === 'discount'
          ? 'text-emerald-600'
          : 'text-sm text-slate-600';
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={toneClass}>{formatCurrency(amount, baseCurrencyCode)}</span>
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-5xl space-y-6 rounded-3xl bg-white p-8 shadow-2xl"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Order composer</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {mode === 'create' ? 'Create order' : `Edit order ${initialOrder?.orderNumber ?? ''}`}
          </h2>
          <p className="text-sm text-slate-500">
            Build an order on behalf of a customer. All totals are recalculated automatically and saved independently of the
            customer profile.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mode === 'create' ? 'Create order' : 'Save changes'}
          </Button>
        </div>
      </header>

      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</label>
            <div className="relative mt-1">
              <input
                type="text"
                value={customerInput}
                onChange={(event) => handleCustomerInputChange(event.target.value)}
                placeholder="Search customers by name or email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoComplete="off"
              />
              {isCustomerSearching && (
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">Searching…</span>
              )}
              {customerOptions.length > 0 && customerInput.trim() && (
                <ul className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {customerOptions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleCustomerSelect(option);
                        }}
                        className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-semibold text-slate-900">{option.fullName ?? 'Customer'}</span>
                        <span className="text-xs text-slate-500">{option.email ?? '—'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {customerSearchError && <p className="mt-1 text-xs text-rose-600">{customerSearchError}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Customer name</label>
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Customer email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Order status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {status && !ORDER_STATUS_OPTIONS.some((option) => option.value === status) && (
                <option value={status}>Custom: {status}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Payment method</label>
            <select
              value={selectedPaymentMethodKey}
              onChange={(event) => setSelectedPaymentMethodKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {paymentMethods.map((method) => (
                <option key={method.key} value={method.key}>
                  {method.displayName}
                </option>
              ))}
            </select>
            {selectedPaymentMethod?.notes && (
              <p className="mt-1 text-xs text-slate-500">{selectedPaymentMethod.notes}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Coupon</label>
            <select
              value={selectedCoupon?.code ?? ''}
              onChange={(event) => handleCouponChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">No coupon</option>
              {(couponsQuery.data ?? []).map((coupon) => (
                <option key={coupon.id} value={coupon.code}>
                  {coupon.name} · {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue ?? 0}%` : formatCurrency(coupon.discountValue ?? 0, baseCurrencyCode)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {addressesError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{addressesError}</p>}

      <div className="space-y-5">
        {renderAddressFields(
          'Shipping address',
          shippingAddress,
          (field, value) => handleAddressFieldChange(setShippingAddress, field, value),
          shippingSelectionValue,
          handleShippingSelectionChange,
          false
        )}

        <div className="flex items-center gap-2">
          <input
            id="billing-same-as-shipping"
            type="checkbox"
            checked={billingSameAsShipping}
            onChange={(event) => setBillingSameAsShipping(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <label htmlFor="billing-same-as-shipping" className="text-sm text-slate-600">
            Use the shipping address for billing
          </label>
        </div>

        {renderAddressFields(
          'Billing address',
          billingAddress,
          (field, value) => handleAddressFieldChange(setBillingAddress, field, value),
          billingSelectionValue,
          handleBillingSelectionChange,
          billingSameAsShipping
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Order lines</h3>
          <Button type="button" variant="ghost" onClick={handleAddLine}>
            Add product
          </Button>
        </div>
        <div className="space-y-5">
          {lines.map((line, index) => renderProductLine(line, index))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Totals</h3>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {renderSummaryRow('Products', productSubtotal)}
            {renderSummaryRow('Tax', taxSubtotal)}
            {renderSummaryRow('Shipping', shippingTotal)}
            {discountTotal > 0 && renderSummaryRow('Discount', -discountTotal, 'discount')}
            <div className="border-t border-slate-200 pt-3">
              {renderSummaryRow('Grand total', computedGrandTotal, 'emphasis')}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Shipping override</label>
              <input
                type="number"
                value={shippingOverrideInput}
                onChange={(event) => {
                  setHasManualShipping(true);
                  setShippingOverrideInput(event.target.value);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => {
                  setHasManualShipping(false);
                  setShippingOverrideInput(String(computedSummary?.shippingTotal ?? 0));
                }}
                className="mt-1 text-xs font-semibold text-primary hover:text-primary/80"
              >
                Use calculated shipping
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Discount override</label>
              <input
                type="number"
                value={discountOverrideInput}
                onChange={(event) => {
                  setHasManualDiscount(true);
                  setDiscountOverrideInput(event.target.value);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => {
                  setHasManualDiscount(false);
                  setDiscountOverrideInput(String(computedSummary?.discountTotal ?? 0));
                }}
                className="mt-1 text-xs font-semibold text-primary hover:text-primary/80"
              >
                Use calculated discount
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Preview status</h4>
          {isPreviewing && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Refreshing totals…
            </div>
          )}
          {!isPreviewing && !previewError && readyForPreview && (
            <p className="text-sm text-emerald-600">Totals are up to date.</p>
          )}
          {!readyForPreview && (
            <p className="text-sm text-slate-500">
              Select a customer and assign products with quantities to calculate totals.
            </p>
          )}
          {previewError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{previewError}</p>
          )}
          {computedSummary?.appliedCoupon && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <p className="font-semibold">Coupon applied</p>
              <p>Code: {computedSummary.appliedCoupon.code}</p>
            </div>
          )}
        </div>
      </section>

      {formError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{formError}</p>}
      {!baseTotalsReady && (
        <p className="text-xs text-slate-500">
          Orders require at least one product line with a selected variant to be saved.
        </p>
      )}
    </form>
  );
};

export default OrderEditor;
