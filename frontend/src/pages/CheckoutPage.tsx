import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, createSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/http';
import type {
  AddressType,
  CheckoutAddress,
  CheckoutCoupon,
  CheckoutOrderLine,
  CheckoutOrderPayload,
  CheckoutOrderResponse,
  CheckoutRegionOption,
  CheckoutSummary,
  OrderSummary,
  OrderTaxLine,
  PaymentMethod
} from '../types/checkout';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import InfoTooltip from '../components/InfoTooltip';
import { formatCurrency } from '../utils/currency';
import { rememberPostLoginRedirect } from '../utils/postLoginRedirect';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import { fetchCart, selectCart } from '../features/cart/cartSlice';

type StepKey = 'shipping' | 'billing' | 'payment';

const steps: StepKey[] = ['shipping', 'billing', 'payment'];

const stepDetails: Record<StepKey, { title: string; description: string }> = {
  shipping: {
    title: 'Shipping',
    description: 'Choose where we should deliver your order.'
  },
  billing: {
    title: 'Billing',
    description: 'Confirm who is paying for the purchase.'
  },
  payment: {
    title: 'Payment',
    description: 'Select a payment option and place the order.'
  }
};

const CheckoutPage = () => {
  const { notify } = useToast();
  const dispatch = useAppDispatch();
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const cart = useAppSelector(selectCart);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAppSelector((state) => state.auth);

  const [activeStep, setActiveStep] = useState<StepKey>('shipping');
  const [shippingAddressId, setShippingAddressId] = useState<number | null>(null);
  const [billingAddressId, setBillingAddressId] = useState<number | null>(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [selectedPaymentKey, setSelectedPaymentKey] = useState<string | null>(null);
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<CheckoutCoupon[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const defaultAddressForm = {
    type: 'SHIPPING' as AddressType,
    fullName: '',
    mobileNumber: '',
    pinCode: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    countryId: '',
    stateId: '',
    cityId: '',
    makeDefault: true
  };
  const [addressForm, setAddressForm] = useState(defaultAddressForm);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  const currencyCode = baseCurrency ?? 'USD';
  const formatMoney = (value?: number | null) => (value == null ? null : formatCurrency(value, currencyCode));

  useEffect(() => {
    if (!auth.accessToken || auth.portal !== 'client') {
      const redirectTarget = `${location.pathname}${location.search}`;
      rememberPostLoginRedirect(redirectTarget, '/checkout');
      navigate(
        {
          pathname: '/login',
          search: createSearchParams({ redirect: redirectTarget, fallback: '/checkout' }).toString()
        },
        {
          replace: true,
          state: { from: redirectTarget, fallback: '/checkout' }
        }
      );
    }
  }, [auth.accessToken, auth.portal, location.pathname, location.search, navigate]);

  const resetAddressForm = (type: AddressType) => {
    setAddressForm({ ...defaultAddressForm, type });
    setFormMode('create');
    setEditingAddressId(null);
  };

  const invalidateAddressQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['checkout', 'summary'] });
    queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
    queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey.includes('addresses')
    });
  };

  const handleAddressSuccess = (data: CheckoutAddress, mode: 'create' | 'edit') => {
    setShowAddressForm(false);
    resetAddressForm(data.type);
    invalidateAddressQueries();
    if (mode === 'create') {
      if (data.type === 'SHIPPING') {
        setShippingAddressId(data.id);
      } else {
        setBillingAddressId(data.id);
      }
    }
  };

  const buildAddressPayload = () => ({
    type: addressForm.type,
    countryId: addressForm.countryId ? Number(addressForm.countryId) : undefined,
    stateId: addressForm.stateId ? Number(addressForm.stateId) : undefined,
    cityId: addressForm.cityId ? Number(addressForm.cityId) : undefined,
    fullName: addressForm.fullName,
    mobileNumber: addressForm.mobileNumber,
    pinCode: addressForm.pinCode || undefined,
    addressLine1: addressForm.addressLine1,
    addressLine2: addressForm.addressLine2 || undefined,
    landmark: addressForm.landmark || undefined,
    makeDefault: Boolean(addressForm.makeDefault)
  });

  const startEditAddress = (address: CheckoutAddress) => {
    setFormMode('edit');
    setEditingAddressId(address.id);
    setAddressForm({
      type: address.type,
      fullName: address.fullName,
      mobileNumber: address.mobileNumber,
      pinCode: address.pinCode ?? '',
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      landmark: address.landmark ?? '',
      countryId: address.countryId ? String(address.countryId) : '',
      stateId: address.stateId ? String(address.stateId) : '',
      cityId: address.cityId ? String(address.cityId) : '',
      makeDefault: Boolean(address.defaultAddress)
    });
    setShowAddressForm(true);
  };

  useEffect(() => {
    if (auth.accessToken && auth.portal === 'client') {
      dispatch(fetchCart());
    }
  }, [auth.accessToken, auth.portal, dispatch]);

  const countriesQuery = useQuery<CheckoutRegionOption[]>({
    queryKey: ['checkout', 'regions', 'countries'],
    queryFn: async () => {
      const { data } = await api.get<CheckoutRegionOption[]>('/checkout/regions/countries');
      return data;
    }
  });

  const statesQuery = useQuery<CheckoutRegionOption[]>({
    queryKey: ['checkout', 'regions', 'states', addressForm.countryId],
    enabled: Boolean(addressForm.countryId),
    queryFn: async () => {
      const { data } = await api.get<CheckoutRegionOption[]>(
        `/checkout/regions/countries/${addressForm.countryId}/states`
      );
      return data;
    }
  });

  const citiesQuery = useQuery<CheckoutRegionOption[]>({
    queryKey: ['checkout', 'regions', 'cities', addressForm.stateId],
    enabled: Boolean(addressForm.stateId),
    queryFn: async () => {
      const { data } = await api.get<CheckoutRegionOption[]>(
        `/checkout/regions/states/${addressForm.stateId}/cities`
      );
      return data;
    }
  });

  const summaryQuery = useQuery<CheckoutSummary>({
    queryKey: ['checkout', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<CheckoutSummary>('/checkout/summary');
      return data;
    },
    retry: false
  });

  const addresses = useMemo(
    () =>
      (summaryQuery.data?.addresses ?? []).filter(
        (address): address is CheckoutAddress => Boolean(address && address.id)
      ),
    [summaryQuery.data?.addresses]
  );
  const paymentMethods = useMemo(
    () => summaryQuery.data?.paymentMethods ?? [],
    [summaryQuery.data?.paymentMethods]
  );
  const sortedAddresses = useMemo(() => {
    const list = [...addresses];
    list.sort((first, second) => {
      if (first.type !== second.type) {
        return first.type === 'SHIPPING' ? -1 : 1;
      }
      if (first.defaultAddress !== second.defaultAddress) {
        return first.defaultAddress ? -1 : 1;
      }
      const firstId = first.id ?? 0;
      const secondId = second.id ?? 0;
      return firstId - secondId;
    });
    return list;
  }, [addresses]);
  const shippingTypeAddresses = useMemo(
    () => addresses.filter((address) => address.type === 'SHIPPING'),
    [addresses]
  );
  const billingTypeAddresses = useMemo(
    () => addresses.filter((address) => address.type === 'BILLING'),
    [addresses]
  );
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(summaryQuery.data?.orderSummary ?? null);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(
    summaryQuery.data?.lastOrderNumber ?? null
  );
  const checkoutLines: CheckoutOrderLine[] = useMemo(
    () =>
      (cart.items ?? []).map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate ?? undefined,
        productSlug: item.productSlug ?? null,
        variantId: item.variantId ?? null,
        variantSku: item.sku ?? null,
        variantLabel: item.variantLabel ?? null
      })),
    [cart.items]
  );
  const hasCartItems = checkoutLines.length > 0;
  const shippingStepComplete = Boolean(shippingAddressId);
  const billingStepComplete = sameAsShipping || Boolean(billingAddressId);
  const paymentStepReady = shippingStepComplete && billingStepComplete;
  const isStepAccessible = (step: StepKey) => {
    if (step === 'shipping') {
      return true;
    }
    if (step === 'billing') {
      return hasCartItems && shippingStepComplete;
    }
    if (step === 'payment') {
      return hasCartItems && paymentStepReady;
    }
    return false;
  };
  const featuredCoupons = useMemo(() => availableCoupons.slice(0, 2), [availableCoupons]);

  const formatMaybeCurrency = (value?: number | null) =>
    value == null ? '—' : formatCurrency(value, currencyCode);

  const describeCoupon = (
    coupon: {
      discountType: 'FLAT' | 'PERCENTAGE';
      discountValue: number | null;
      description?: string | null;
      shortDescription?: string | null;
    }
  ) => {
    const customDescription = coupon.description ?? coupon.shortDescription;
    if (customDescription && customDescription.trim().length) {
      return customDescription;
    }
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue ?? 0}% off`;
    }
    return formatCurrency(coupon.discountValue ?? 0, currencyCode);
  };

  const formatDateLabel = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : '—';

  useEffect(() => {
    const pickPreferredAddress = (preferred: CheckoutAddress[], fallback: CheckoutAddress[]) => {
      const withDefault = preferred.find((address) => address.defaultAddress);
      if (withDefault) {
        return withDefault;
      }
      if (preferred.length) {
        return preferred[0];
      }
      const fallbackDefault = fallback.find((address) => address.defaultAddress);
      if (fallbackDefault) {
        return fallbackDefault;
      }
      return fallback[0];
    };

    if (!shippingAddressId && sortedAddresses.length) {
      const preferredShipping = pickPreferredAddress(shippingTypeAddresses, sortedAddresses);
      if (preferredShipping?.id) {
        setShippingAddressId(preferredShipping.id);
      }
    }
    if (!billingAddressId && sortedAddresses.length) {
      const preferredBilling = pickPreferredAddress(billingTypeAddresses, sortedAddresses);
      if (preferredBilling?.id) {
        setBillingAddressId(preferredBilling.id);
      }
    }
    if (!selectedPaymentKey && paymentMethods.length) {
      const enabled = paymentMethods.find((method) => method.enabled);
      if (enabled) {
        setSelectedPaymentKey(enabled.key);
      }
    }
    if (!paymentMethods.length && selectedPaymentKey) {
      setSelectedPaymentKey(null);
    }
  }, [
    billingAddressId,
    billingTypeAddresses,
    paymentMethods,
    selectedPaymentKey,
    shippingAddressId,
    shippingTypeAddresses,
    sortedAddresses
  ]);

  useEffect(() => {
    if (summaryQuery.data?.orderSummary) {
      setOrderSummary(summaryQuery.data.orderSummary);
      setSelectedCouponCode(summaryQuery.data.orderSummary.appliedCoupon?.code ?? null);
      setCouponError(null);
    }
  }, [summaryQuery.data?.orderSummary]);

  useEffect(() => {
    setAvailableCoupons(summaryQuery.data?.coupons ?? []);
  }, [summaryQuery.data?.coupons]);

  useEffect(() => {
    setLastOrderNumber(summaryQuery.data?.lastOrderNumber ?? null);
  }, [summaryQuery.data?.lastOrderNumber]);

  useEffect(() => {
    if (!hasCartItems) {
      setOrderSummary(summaryQuery.data?.orderSummary ?? null);
      setSelectedCouponCode(summaryQuery.data?.orderSummary?.appliedCoupon?.code ?? null);
      setCouponError(null);
      return;
    }
    const fetchPreview = async () => {
      try {
        const payload: CheckoutOrderPayload = {
          shippingAddressId: shippingAddressId!,
          billingAddressId: sameAsShipping ? null : billingAddressId ?? undefined,
          sameAsShipping,
          paymentMethodKey: selectedPaymentKey ?? 'COD',
          lines: checkoutLines,
          couponCode: selectedCouponCode ?? undefined
        };
        const { data } = await api.post<OrderSummary>('/checkout/summary', payload);
        setOrderSummary(data);
        setSelectedCouponCode(data.appliedCoupon?.code ?? null);
        setCouponError(null);
      } catch (error) {
        console.error('Failed to update order summary', error);
        const message = extractErrorMessage(error, 'Failed to update order summary.');
        notify({ type: 'error', message });
        setCouponError(message);
        setSelectedCouponCode(orderSummary?.appliedCoupon?.code ?? null);
      }
    };
    if (shippingAddressId) {
      fetchPreview();
    }
  }, [
    billingAddressId,
    checkoutLines,
    hasCartItems,
    notify,
    sameAsShipping,
    selectedPaymentKey,
    shippingAddressId,
    summaryQuery.data?.orderSummary,
    selectedCouponCode
  ]);

  useEffect(() => {
    if (hasCartItems) {
      setLastOrderNumber(null);
    }
  }, [hasCartItems]);

  const createAddressMutation = useMutation({
    mutationFn: async () => {
      const payload = buildAddressPayload();
      const { data } = await api.post<CheckoutAddress>('/checkout/addresses', payload);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: 'Address saved successfully.' });
      handleAddressSuccess(data, 'create');
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to save address.') });
    }
  });

  const updateAddressMutation = useMutation({
    mutationFn: async () => {
      if (!editingAddressId) {
        throw new Error('No address selected for editing.');
      }
      const payload = buildAddressPayload();
      const { data } = await api.put<CheckoutAddress>(`/checkout/addresses/${editingAddressId}`, payload);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: 'Address updated successfully.' });
      handleAddressSuccess(data, 'edit');
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to update address.') });
    }
  });

  const isAddressMutationPending = createAddressMutation.isPending || updateAddressMutation.isPending;

  const placeOrderMutation = useMutation<CheckoutOrderResponse>({
    mutationFn: async () => {
      if (!shippingAddressId || !selectedPaymentKey || !hasCartItems) {
        throw new Error('Please complete the checkout steps.');
      }
      const payload: CheckoutOrderPayload = {
        shippingAddressId,
        billingAddressId: sameAsShipping ? null : billingAddressId ?? undefined,
        sameAsShipping,
        paymentMethodKey: selectedPaymentKey,
        lines: checkoutLines,
        couponCode: selectedCouponCode ?? undefined
      };
      const { data } = await api.post<CheckoutOrderResponse>('/checkout/orders', payload);
      return data;
    },
    onSuccess: (data) => {
      notify({
        type: 'success',
        message: data.orderNumber
          ? `Order ${data.orderNumber} placed successfully! Redirecting to confirmation…`
          : 'Order placed successfully! Redirecting to confirmation…'
      });
      setOrderSummary(data.summary);
      setSelectedCouponCode(data.summary.appliedCoupon?.code ?? null);
      setCouponError(null);
      setActiveStep('shipping');
      setAcceptPolicies(false);
      setSameAsShipping(true);
      setShowAddressForm(false);
      setShippingAddressId(null);
      setBillingAddressId(null);
      setSelectedPaymentKey(null);
      queryClient.invalidateQueries({ queryKey: ['checkout', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey.includes('addresses')
      });
      dispatch(fetchCart());
      navigate(`/order-confirmation/${data.orderId}`, {
        state: { orderNumber: data.orderNumber ?? undefined }
      });
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to complete order.') });
    }
  });

  const handleSubmitAddress = (event: FormEvent) => {
    event.preventDefault();
    if (formMode === 'edit') {
      if (!updateAddressMutation.isPending) {
        updateAddressMutation.mutate();
      }
      return;
    }
    if (!createAddressMutation.isPending) {
      createAddressMutation.mutate();
    }
  };

  const nextStep = () => {
    const index = steps.indexOf(activeStep);
    if (index < steps.length - 1) {
      const next = steps[index + 1];
      if (isStepAccessible(next)) {
        setActiveStep(next);
      }
    }
  };

  const prevStep = () => {
    const index = steps.indexOf(activeStep);
    if (index > 0) {
      setActiveStep(steps[index - 1]);
    }
  };

  const renderAddressCard = (address: CheckoutAddress, selectedId: number | null, onSelect: (id: number) => void) => (
    <div
      key={address.id}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(address.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(address.id);
        }
      }}
      className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-400 ${
        selectedId === address.id
          ? 'border-blue-600 bg-blue-50/70 shadow-lg shadow-blue-100'
          : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{address.fullName}</h4>
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {address.type === 'SHIPPING' ? 'Shipping' : 'Billing'}
          </span>
          {address.defaultAddress && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Default</span>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              startEditAddress(address);
            }}
            disabled={isAddressMutationPending}
            className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-60"
          >
            Edit
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {address.addressLine1}
        {address.addressLine2 ? `, ${address.addressLine2}` : ''}
      </p>
      <p className="text-sm text-slate-600">
        {[address.cityName, address.stateName, address.countryName].filter(Boolean).join(', ')}
      </p>
      <p className="text-xs text-slate-500">{address.mobileNumber}</p>
    </div>
  );

  const optionLabel = (option: CheckoutRegionOption) => option.name ?? option.label;

  const renderAddressForm = (formType: AddressType) => {
    if (!showAddressForm || addressForm.type !== formType) {
      return null;
    }

    const countryOptions = countriesQuery.data ?? [];
    const stateOptions = statesQuery.data ?? [];
    const cityOptions = citiesQuery.data ?? [];
    const countryError = countriesQuery.isError
      ? extractErrorMessage(countriesQuery.error, 'Unable to load countries.')
      : null;
    const stateError = statesQuery.isError
      ? extractErrorMessage(statesQuery.error, 'Unable to load states.')
      : null;
    const cityError = citiesQuery.isError
      ? extractErrorMessage(citiesQuery.error, 'Unable to load cities.')
      : null;
    const defaultCheckboxId =
      formType === 'SHIPPING' ? 'defaultShippingAddress' : 'defaultBillingAddress';

    return (
      <form
        onSubmit={handleSubmitAddress}
        className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-inner"
      >
        <h3 className="text-sm font-semibold text-slate-700">
          {formMode === 'edit' && editingAddressId
            ? `Edit ${formType === 'SHIPPING' ? 'shipping' : 'billing'} address`
            : formType === 'SHIPPING'
              ? 'Add shipping address'
              : 'Add billing address'}
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-medium uppercase text-slate-500">
            Country
            <select
              required
              value={addressForm.countryId}
              onChange={(event) =>
                setAddressForm((prev) => ({
                  ...prev,
                  countryId: event.target.value,
                  stateId: '',
                  cityId: ''
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              disabled={countriesQuery.isLoading || isAddressMutationPending}
            >
              <option value="">Select country</option>
              {countryOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {optionLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium uppercase text-slate-500">
            State
            <select
              required
              value={addressForm.stateId}
              onChange={(event) =>
                setAddressForm((prev) => ({
                  ...prev,
                  stateId: event.target.value,
                  cityId: ''
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              disabled={!addressForm.countryId || statesQuery.isLoading || isAddressMutationPending}
            >
              <option value="">Select state</option>
              {stateOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {optionLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium uppercase text-slate-500">
            City
            <select
              required
              value={addressForm.cityId}
              onChange={(event) =>
                setAddressForm((prev) => ({
                  ...prev,
                  cityId: event.target.value
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              disabled={!addressForm.stateId || citiesQuery.isLoading || isAddressMutationPending}
            >
              <option value="">Select city</option>
              {cityOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {optionLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {countriesQuery.isLoading && (
          <p className="text-xs text-slate-500">Loading available countries…</p>
        )}
        {countryError && <p className="text-xs text-rose-600">{countryError}</p>}
        {stateError && <p className="text-xs text-rose-600">{stateError}</p>}
        {cityError && <p className="text-xs text-rose-600">{cityError}</p>}
        {addressForm.countryId && !statesQuery.isLoading && !stateOptions.length && (
          <p className="text-xs text-amber-600">No states are enabled for the selected country yet.</p>
        )}
        {addressForm.stateId && !citiesQuery.isLoading && !cityOptions.length && (
          <p className="text-xs text-amber-600">No cities are enabled for the selected state yet.</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium uppercase text-slate-500">
            Full name
            <input
              required
              value={addressForm.fullName}
              onChange={(event) =>
                setAddressForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              disabled={isAddressMutationPending}
            />
          </label>
          <label className="text-xs font-medium uppercase text-slate-500">
            Mobile number
            <input
              required
              value={addressForm.mobileNumber}
              onChange={(event) =>
                setAddressForm((prev) => ({ ...prev, mobileNumber: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              disabled={isAddressMutationPending}
            />
          </label>
        </div>
        <label className="text-xs font-medium uppercase text-slate-500">
          PIN code
          <input
            required
            value={addressForm.pinCode}
            onChange={(event) => setAddressForm((prev) => ({ ...prev, pinCode: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            placeholder="Postal code"
            inputMode="numeric"
            disabled={isAddressMutationPending}
          />
        </label>
        <label className="text-xs font-medium uppercase text-slate-500">
          Address line 1
          <input
            required
            value={addressForm.addressLine1}
            onChange={(event) =>
              setAddressForm((prev) => ({ ...prev, addressLine1: event.target.value }))
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            placeholder="Flat, House No., Building, Company, Apartment"
            disabled={isAddressMutationPending}
          />
        </label>
        <label className="text-xs font-medium uppercase text-slate-500">
          Address line 2
          <input
            value={addressForm.addressLine2}
            onChange={(event) =>
              setAddressForm((prev) => ({ ...prev, addressLine2: event.target.value }))
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            placeholder="Area, Street, Sector, Place"
            disabled={isAddressMutationPending}
          />
        </label>
        <label className="text-xs font-medium uppercase text-slate-500">
          Landmark
          <input
            value={addressForm.landmark}
            onChange={(event) => setAddressForm((prev) => ({ ...prev, landmark: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            placeholder="Nearby landmark"
            disabled={isAddressMutationPending}
          />
        </label>
        <div className="flex items-center gap-2">
          <input
            id={defaultCheckboxId}
            type="checkbox"
            checked={addressForm.makeDefault}
            onChange={(event) =>
              setAddressForm((prev) => ({ ...prev, makeDefault: event.target.checked }))
            }
            disabled={isAddressMutationPending}
          />
          <label htmlFor={defaultCheckboxId} className="text-sm text-slate-600">
            Make this my default address
          </label>
        </div>
        <Button type="submit" loading={isAddressMutationPending}>
          {formMode === 'edit' ? 'Update address' : 'Save address'}
        </Button>
      </form>
    );
  };

  const handleApplyCoupon = (coupon: CheckoutCoupon) => {
    setSelectedCouponCode(coupon.code);
    setIsCouponModalOpen(false);
    setCouponError(null);
  };

  const handleRemoveCoupon = () => {
    setSelectedCouponCode(null);
    setCouponError(null);
  };

  const isInitialLoading = summaryQuery.isLoading && !summaryQuery.data;
  const summaryError = summaryQuery.isError && !summaryQuery.data
    ? extractErrorMessage(summaryQuery.error, 'Unable to load checkout summary.')
    : null;
  const appliedCoupon = orderSummary?.appliedCoupon ?? null;
  const discountTotal = orderSummary?.discountTotal ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Secure checkout</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">Finish your purchase</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review your shipping, billing, and payment details to confirm your order. You are only a few clicks away
              from getting your items delivered.
            </p>
          </div>
          <Link
            to="/cart"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
          >
            ← Return to cart
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-6xl px-6">
        {lastOrderNumber && (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-sm text-emerald-700 shadow-sm">
            <p className="text-base font-semibold text-emerald-800">Order {lastOrderNumber} placed successfully.</p>
            <p className="text-xs text-emerald-700">
              Your order details are now available from the Orders section in your account.
            </p>
          </div>
        )}
        {!hasCartItems && !isInitialLoading && !summaryError && (
          <div className="mb-8 rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-700 shadow-sm">
            Your cart is currently empty. Browse the catalog and add items before completing checkout.
          </div>
        )}

        {summaryError ? (
          <div className="rounded-3xl border border-rose-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-rose-700">We couldn’t load your checkout summary</h2>
            <p className="mt-2 text-sm text-rose-600">{summaryError}</p>
            <Button className="mt-4" onClick={() => summaryQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Checkout steps</h2>
                <ol className="mt-4 grid gap-3 md:grid-cols-3">
                  {steps.map((step, index) => {
                    const isActive = activeStep === step;
                    const isAccessible = isStepAccessible(step);
                    const details = stepDetails[step];
                    const buttonClasses = isActive
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : isAccessible
                        ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        : 'border-slate-200 bg-white text-slate-400 opacity-60 cursor-not-allowed';
                    const indicatorClasses = isActive
                      ? 'border-blue-500 bg-white text-blue-600'
                      : isAccessible
                        ? 'border-slate-300 text-slate-500'
                        : 'border-slate-200 text-slate-400';
                    return (
                      <li key={step}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAccessible) {
                              setActiveStep(step);
                            }
                          }}
                          disabled={!isAccessible}
                          className={`flex h-full w-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${buttonClasses}`}
                        >
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${indicatorClasses}`}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold">{details.title}</p>
                            <p className="text-xs text-slate-500">{details.description}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {isInitialLoading ? (
                <div className="flex min-h-[18rem] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-6">
                  {activeStep === 'shipping' && (
                    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">Shipping address</h2>
                          <p className="text-sm text-slate-500">Choose the destination for your delivery.</p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (showAddressForm && addressForm.type === 'SHIPPING') {
                              setShowAddressForm(false);
                              resetAddressForm('SHIPPING');
                              return;
                            }
                            resetAddressForm('SHIPPING');
                            setShowAddressForm(true);
                          }}
                        >
                          {showAddressForm && addressForm.type === 'SHIPPING'
                            ? formMode === 'edit'
                              ? 'Cancel edit'
                              : 'Cancel'
                            : 'Add new address'}
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {sortedAddresses.map((address) =>
                          renderAddressCard(address, shippingAddressId, setShippingAddressId)
                        )}
                      </div>
                      {!sortedAddresses.length && (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          No addresses saved yet. Add one to continue.
                        </p>
                      )}
                      {renderAddressForm('SHIPPING')}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          Need to ship to a new location? Add as many addresses as you like and pick the best one.
                        </p>
                        <Button onClick={nextStep} disabled={!shippingStepComplete || !hasCartItems}>
                          Continue to billing
                        </Button>
                      </div>
                    </section>
                  )}

                  {activeStep === 'billing' && (
                    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">Billing address</h2>
                          <p className="text-sm text-slate-500">Tell us who will be charged for this order.</p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (showAddressForm && addressForm.type === 'BILLING') {
                              setShowAddressForm(false);
                              resetAddressForm('BILLING');
                              return;
                            }
                            resetAddressForm('BILLING');
                            setShowAddressForm(true);
                          }}
                        >
                          {showAddressForm && addressForm.type === 'BILLING'
                            ? formMode === 'edit'
                              ? 'Cancel edit'
                              : 'Cancel'
                            : 'Add new billing address'}
                        </Button>
                      </div>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={sameAsShipping}
                          onChange={(event) => setSameAsShipping(event.target.checked)}
                        />
                        Use shipping address for billing
                      </label>
                      {!sameAsShipping && (
                        <div className="grid gap-4 md:grid-cols-2">
                          {sortedAddresses.map((address) =>
                            renderAddressCard(address, billingAddressId, setBillingAddressId)
                          )}
                        </div>
                      )}
                      {!sameAsShipping && !sortedAddresses.length && (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          No billing addresses saved yet. Add one or use your shipping address.
                        </p>
                      )}
                      {renderAddressForm('BILLING')}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button variant="ghost" onClick={prevStep}>
                          Back to shipping
                        </Button>
                        <Button onClick={nextStep} disabled={!hasCartItems || !billingStepComplete}>
                          Continue to payment
                        </Button>
                      </div>
                    </section>
                  )}

                  {activeStep === 'payment' && (
                    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">Payment method</h2>
                          <p className="text-sm text-slate-500">Select how you’d like to pay and review our store policies.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {paymentMethods.length ? (
                          paymentMethods.map((method: PaymentMethod) => {
                            const isSelected = selectedPaymentKey === method.key;
                            return (
                              <label
                                key={method.key}
                                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-slate-400 ${
                                  isSelected ? 'border-blue-600 bg-blue-50/70 shadow-sm shadow-blue-100' : 'border-slate-200 bg-white shadow-sm'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value={method.key}
                                  checked={isSelected}
                                  onChange={() => setSelectedPaymentKey(method.key)}
                                  className="mt-1"
                                />
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{method.displayName}</p>
                                  {method.notes && <p className="text-xs text-slate-500">{method.notes}</p>}
                                </div>
                              </label>
                            );
                          })
                        ) : (
                          <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                            No payment methods are currently available. Please contact support for assistance.
                          </p>
                        )}
                      </div>
                      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={acceptPolicies}
                          onChange={(event) => setAcceptPolicies(event.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          I agree to the <span className="font-semibold text-slate-700">Terms & Conditions</span>, Return Policy, and
                          Privacy Policy.
                        </span>
                      </label>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button variant="ghost" onClick={prevStep}>
                          Back to billing
                        </Button>
                        <Button
                          onClick={() => placeOrderMutation.mutate()}
                          disabled={
                            !acceptPolicies ||
                            !selectedPaymentKey ||
                            placeOrderMutation.isPending ||
                            !paymentMethods.length ||
                            !hasCartItems ||
                            !paymentStepReady
                          }
                          loading={placeOrderMutation.isPending}
                        >
                          Complete order
                        </Button>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-32">
              <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
              {orderSummary ? (
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span>Products</span>
                    <span>{formatCurrency(orderSummary.productTotal ?? 0, currencyCode)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      Tax
                      {!!orderSummary.taxLines?.length && (
                        <InfoTooltip label="Tax breakdown">
                          <div className="space-y-1">
                            <ul className="space-y-1 text-left">
                              {orderSummary.taxLines.map((line) => (
                                <li key={`${line.productId ?? 'item'}-${line.taxRate}`}>
                                  <span className="block font-medium text-slate-700">
                                    {line.productName ?? 'Item'}
                                  </span>
                                  <span className="text-slate-500">
                                    {formatCurrency(line.taxAmount ?? 0, currencyCode)}
                                    {line.taxRate != null
                                      ? ` · ${(line.taxRate * 100).toFixed(1)}%`
                                      : ''}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2 border-t border-slate-200 pt-1 text-right font-semibold text-slate-700">
                              Total: {formatCurrency(orderSummary.taxTotal ?? 0, currencyCode)}
                            </div>
                          </div>
                        </InfoTooltip>
                      )}
                    </span>
                    <span>{formatCurrency(orderSummary.taxTotal ?? 0, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{formatCurrency(orderSummary.shippingTotal ?? 0, currencyCode)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(discountTotal, currencyCode)}</span>
                    </div>
                  )}
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Apply coupon</p>
                        <p>
                          {appliedCoupon
                            ? `Coupon ${appliedCoupon.code} is applied to this order.`
                            : 'Have a coupon code? Apply it to save instantly on your order.'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => setIsCouponModalOpen(true)}
                        disabled={!availableCoupons.length}
                      >
                        {availableCoupons.length ? 'View coupons' : 'No coupons available'}
                      </Button>
                    </div>
                    {!!featuredCoupons.length && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {featuredCoupons.map((coupon) => (
                          <button
                            key={coupon.id}
                            type="button"
                            onClick={() => handleApplyCoupon(coupon)}
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                          >
                            {coupon.code} · {describeCoupon(coupon)}
                          </button>
                        ))}
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-xs text-emerald-700">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-emerald-800">{appliedCoupon.name}</p>
                            <p className="font-medium">Code: {appliedCoupon.code}</p>
                            <p>
                              {describeCoupon(appliedCoupon)} — saves {formatCurrency(appliedCoupon.discountAmount ?? 0, currencyCode)}
                            </p>
                          </div>
                          <Button variant="ghost" className="px-3 py-1 text-xs" onClick={handleRemoveCoupon}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                    {couponError && <p className="mt-3 text-xs text-rose-600">{couponError}</p>}
                  </div>
                  {orderSummary.shippingBreakdown &&
                    (() => {
                      const breakdown = orderSummary.shippingBreakdown;
                      if (!breakdown || !breakdown.cityName) {
                        return null;
                      }
                      return (
                        <details className="rounded-2xl border border-slate-200 p-3 text-xs">
                          <summary className="cursor-pointer font-semibold text-slate-700">
                            Shipping breakdown
                          </summary>
                          <ul className="mt-2 space-y-1">
                            <li className="flex justify-between">
                              <span>{breakdown.cityName}</span>
                              <span>{formatMaybeCurrency(breakdown.cityCost)}</span>
                            </li>
                            <li className="flex justify-between font-medium text-slate-800">
                              <span>Effective rate</span>
                              <span>{formatMaybeCurrency(breakdown.effectiveCost)}</span>
                            </li>
                          </ul>
                        </details>
                      );
                    })()}
                  <div className="flex justify-between rounded-xl bg-slate-100 px-3 py-2 text-base font-semibold text-slate-900">
                    <span>Total due</span>
                    <span>{formatCurrency(orderSummary.grandTotal ?? 0, currencyCode)}</span>
                  </div>
                  {!!orderSummary.taxLines?.length && (
                    <details className="rounded-2xl border border-slate-200 p-3 text-xs">
                      <summary className="cursor-pointer font-semibold text-slate-700">Tax breakdown</summary>
                      <ul className="mt-2 space-y-1">
                        {orderSummary.taxLines.map((line: OrderTaxLine) => (
                          <li key={`${line.productId}-${line.taxRate}`} className="flex justify-between">
                            <span>{line.productName ?? 'Item'}</span>
                            <span>{formatCurrency(line.taxAmount, currencyCode)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                    Shipping and taxes are estimated based on your selected address.
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Add items to your cart to see a detailed summary.</p>
              )}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Need assistance?</p>
                <p>Contact our support team if you have questions about payments, shipping, or delivery timelines.</p>
              </div>
            </aside>
          </div>
        )}
      </main>
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Available coupons</h3>
                <p className="text-sm text-slate-500">Select a coupon to apply it to your order.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-lg text-slate-500 transition hover:bg-slate-100"
                aria-label="Close coupon list"
              >
                ×
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {availableCoupons.length ? (
                availableCoupons.map((coupon) => {
                  const discountLabel = describeCoupon(coupon);
                  const minimumLabel =
                    coupon.minimumCartValue != null
                      ? formatCurrency(coupon.minimumCartValue, currencyCode)
                      : null;
                  const isApplied = appliedCoupon?.code === coupon.code;
                  return (
                    <div
                      key={coupon.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-base font-semibold text-slate-900">{coupon.name}</p>
                        <p className="text-xs text-slate-500">
                          {coupon.shortDescription || 'Use this coupon to unlock a discount at checkout.'}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-600">Code: {coupon.code}</p>
                        <p className="text-xs text-slate-500">
                          {discountLabel}
                          {minimumLabel ? ` · Min cart ${minimumLabel}` : ''}
                        </p>
                        <p className="text-xs text-slate-400">Valid until {formatDateLabel(coupon.endDate)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-xs text-slate-500">
                        <Button
                          className="px-3 py-1 text-xs"
                          onClick={() => handleApplyCoupon(coupon)}
                          disabled={isApplied}
                        >
                          {isApplied ? 'Applied' : 'Apply coupon'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No coupons are currently available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
