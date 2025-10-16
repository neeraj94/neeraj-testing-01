import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type {
  AddressType,
  CheckoutAddress,
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
import { formatCurrency } from '../utils/currency';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import { fetchCart, selectCart } from '../features/cart/cartSlice';

type StepKey = 'shipping' | 'billing' | 'payment';

const steps: StepKey[] = ['shipping', 'billing', 'payment'];

const CheckoutPage = () => {
  const { notify } = useToast();
  const dispatch = useAppDispatch();
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const cart = useAppSelector(selectCart);
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState<StepKey>('shipping');
  const [shippingAddressId, setShippingAddressId] = useState<number | null>(null);
  const [billingAddressId, setBillingAddressId] = useState<number | null>(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [selectedPaymentKey, setSelectedPaymentKey] = useState<string | null>(null);
  const [acceptPolicies, setAcceptPolicies] = useState(false);
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
    }
  });

  const addresses = useMemo(
    () => summaryQuery.data?.addresses ?? [],
    [summaryQuery.data?.addresses]
  );
  const paymentMethods = useMemo(
    () => summaryQuery.data?.paymentMethods ?? [],
    [summaryQuery.data?.paymentMethods]
  );
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(summaryQuery.data?.orderSummary ?? null);
  const checkoutLines: CheckoutOrderLine[] = useMemo(
    () =>
      (cart.items ?? []).map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
    [cart.items]
  );
  const hasCartItems = checkoutLines.length > 0;
  const shippingAddresses = useMemo(
    () => addresses.filter((address) => address.type === 'SHIPPING'),
    [addresses]
  );
  const billingAddresses = useMemo(
    () => addresses.filter((address) => address.type === 'BILLING'),
    [addresses]
  );

  const formatMaybeCurrency = (value?: number | null) =>
    value == null ? '—' : formatCurrency(value, baseCurrency);

  useEffect(() => {
    if (!shippingAddressId && shippingAddresses.length) {
      const preferredShipping =
        shippingAddresses.find((address) => address.defaultAddress) ?? shippingAddresses[0];
      setShippingAddressId(preferredShipping.id);
    }
    if (!billingAddressId && billingAddresses.length) {
      const preferredBilling =
        billingAddresses.find((address) => address.defaultAddress) ?? billingAddresses[0];
      setBillingAddressId(preferredBilling.id);
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
    billingAddresses,
    paymentMethods,
    selectedPaymentKey,
    shippingAddressId,
    shippingAddresses
  ]);

  useEffect(() => {
    if (summaryQuery.data?.orderSummary) {
      setOrderSummary(summaryQuery.data.orderSummary);
    }
  }, [summaryQuery.data?.orderSummary]);

  useEffect(() => {
    if (!hasCartItems) {
      setOrderSummary(summaryQuery.data?.orderSummary ?? null);
      return;
    }
    const fetchPreview = async () => {
      try {
        const payload: CheckoutOrderPayload = {
          shippingAddressId: shippingAddressId!,
          billingAddressId: sameAsShipping ? null : billingAddressId ?? undefined,
          sameAsShipping,
          paymentMethodKey: selectedPaymentKey ?? 'COD',
          lines: checkoutLines
        };
        const { data } = await api.post<OrderSummary>('/checkout/summary', payload);
        setOrderSummary(data);
      } catch (error) {
        console.error('Failed to update order summary', error);
      }
    };
    if (shippingAddressId) {
      fetchPreview();
    }
  }, [
    billingAddressId,
    checkoutLines,
    hasCartItems,
    sameAsShipping,
    selectedPaymentKey,
    shippingAddressId,
    summaryQuery.data?.orderSummary
  ]);

  const createAddressMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...addressForm,
        countryId: addressForm.countryId ? Number(addressForm.countryId) : undefined,
        stateId: addressForm.stateId ? Number(addressForm.stateId) : undefined,
        cityId: addressForm.cityId ? Number(addressForm.cityId) : undefined,
        makeDefault: Boolean(addressForm.makeDefault)
      };
      const { data } = await api.post<CheckoutAddress>('/checkout/addresses', payload);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: 'Address saved successfully.' });
      setShowAddressForm(false);
      setAddressForm((prev) => ({ ...defaultAddressForm, type: prev.type }));
      queryClient.invalidateQueries({ queryKey: ['checkout', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey.includes('addresses')
      });
      if (data.type === 'SHIPPING') {
        setShippingAddressId(data.id);
      } else {
        setBillingAddressId(data.id);
      }
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to save address.') });
    }
  });

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
        lines: checkoutLines
      };
      const { data } = await api.post<CheckoutOrderResponse>('/checkout/orders', payload);
      return data;
    },
    onSuccess: (data) => {
      notify({
        type: 'success',
        message: data.orderNumber ? `Order ${data.orderNumber} placed successfully.` : 'Order placed successfully.'
      });
      setOrderSummary(data.summary);
      setActiveStep('shipping');
      setAcceptPolicies(false);
      setSameAsShipping(true);
      setShowAddressForm(false);
      queryClient.invalidateQueries({ queryKey: ['checkout', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey.includes('addresses')
      });
      dispatch(fetchCart());
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to complete order.') });
    }
  });

  const handleSubmitAddress = (event: FormEvent) => {
    event.preventDefault();
    if (createAddressMutation.isPending) {
      return;
    }
    createAddressMutation.mutate();
  };

  const nextStep = () => {
    const index = steps.indexOf(activeStep);
    if (index < steps.length - 1) {
      setActiveStep(steps[index + 1]);
    }
  };

  const prevStep = () => {
    const index = steps.indexOf(activeStep);
    if (index > 0) {
      setActiveStep(steps[index - 1]);
    }
  };

  const renderAddressCard = (address: CheckoutAddress, selectedId: number | null, onSelect: (id: number) => void) => (
    <button
      key={address.id}
      type="button"
      onClick={() => onSelect(address.id)}
      className={`w-full text-left rounded border p-4 transition hover:border-slate-500 ${
        selectedId === address.id ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">{address.fullName}</h4>
        {address.defaultAddress && (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Default</span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {address.addressLine1}
        {address.addressLine2 ? `, ${address.addressLine2}` : ''}
      </p>
      <p className="text-sm text-slate-600">
        {[address.cityName, address.stateName, address.countryName].filter(Boolean).join(', ')}
      </p>
      <p className="text-xs text-slate-500">{address.mobileNumber}</p>
    </button>
  );

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
      <form onSubmit={handleSubmitAddress} className="space-y-3 rounded border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700">
          {formType === 'SHIPPING' ? 'Add shipping address' : 'Add billing address'}
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
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              disabled={countriesQuery.isLoading}
            >
              <option value="">Select country</option>
              {countryOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name}
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
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              disabled={!addressForm.countryId || statesQuery.isLoading}
            >
              <option value="">Select state</option>
              {stateOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name}
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
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              disabled={!addressForm.stateId || citiesQuery.isLoading}
            >
              <option value="">Select city</option>
              {cityOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name}
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
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="text-xs font-medium uppercase text-slate-500">
          PIN code
          <input
            required
            value={addressForm.pinCode}
            onChange={(event) => setAddressForm((prev) => ({ ...prev, pinCode: event.target.value }))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Postal code"
            inputMode="numeric"
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
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Flat, House No., Building, Company, Apartment"
          />
        </label>
        <label className="text-xs font-medium uppercase text-slate-500">
          Address line 2
          <input
            value={addressForm.addressLine2}
            onChange={(event) =>
              setAddressForm((prev) => ({ ...prev, addressLine2: event.target.value }))
            }
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Area, Street, Sector, Place"
          />
        </label>
        <label className="text-xs font-medium uppercase text-slate-500">
          Landmark
          <input
            value={addressForm.landmark}
            onChange={(event) => setAddressForm((prev) => ({ ...prev, landmark: event.target.value }))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nearby landmark"
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
          />
          <label htmlFor={defaultCheckboxId} className="text-sm text-slate-600">
            Make this my default address
          </label>
        </div>
        <Button type="submit" loading={createAddressMutation.isPending}>
          Save address
        </Button>
      </form>
    );
  };

  if (summaryQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
        <p className="text-sm text-slate-500">Confirm shipping, billing, and payment details to place your order.</p>
        {!hasCartItems && (
          <p className="text-sm font-medium text-amber-600">
            Add items to your cart before completing checkout.
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <nav className="flex items-center gap-3">
            {steps.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(step)}
                className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
                  activeStep === step ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                {step === 'shipping' && '1. Shipping'}
                {step === 'billing' && '2. Billing'}
                {step === 'payment' && '3. Payment'}
              </button>
            ))}
          </nav>

          {activeStep === 'shipping' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Shipping address</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (showAddressForm && addressForm.type === 'SHIPPING') {
                      setShowAddressForm(false);
                      return;
                    }
                    setAddressForm({ ...defaultAddressForm, type: 'SHIPPING' });
                    setShowAddressForm(true);
                  }}
                >
                  {showAddressForm && addressForm.type === 'SHIPPING' ? 'Cancel' : 'Add new address'}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {shippingAddresses.map((address) =>
                  renderAddressCard(address, shippingAddressId, setShippingAddressId)
                )}
              </div>
              {!shippingAddresses.length && (
                <p className="text-sm text-slate-500">No shipping addresses saved yet. Add one to continue.</p>
              )}
              {renderAddressForm('SHIPPING')}
              <div className="flex justify-end gap-3">
                <Button onClick={nextStep} disabled={!shippingAddressId || !hasCartItems}>
                  Continue to billing
                </Button>
              </div>
            </section>
          )}

          {activeStep === 'billing' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Billing address</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (showAddressForm && addressForm.type === 'BILLING') {
                      setShowAddressForm(false);
                      return;
                    }
                    setAddressForm({ ...defaultAddressForm, type: 'BILLING' });
                    setShowAddressForm(true);
                  }}
                >
                  {showAddressForm && addressForm.type === 'BILLING'
                    ? 'Cancel'
                    : 'Add new billing address'}
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(event) => setSameAsShipping(event.target.checked)}
                />
                Same as shipping address
              </label>
              {!sameAsShipping && (
                <div className="grid gap-3 md:grid-cols-2">
                  {billingAddresses.map((address) =>
                    renderAddressCard(address, billingAddressId, setBillingAddressId)
                  )}
                </div>
              )}
              {!sameAsShipping && !billingAddresses.length && (
                <p className="text-sm text-slate-500">
                  No billing addresses saved yet. Add one or use your shipping address.
                </p>
              )}
              {renderAddressForm('BILLING')}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={prevStep}>
                  Back to shipping
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!hasCartItems || (!sameAsShipping && !billingAddressId)}
                >
                  Continue to payment
                </Button>
              </div>
            </section>
          )}

          {activeStep === 'payment' && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Payment method</h2>
              <div className="space-y-3">
                {paymentMethods.length ? (
                  paymentMethods.map((method: PaymentMethod) => (
                    <label
                      key={method.key}
                      className={`flex cursor-pointer items-start gap-3 rounded border p-4 transition ${
                        selectedPaymentKey === method.key
                          ? 'border-blue-600 ring-2 ring-blue-100'
                          : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.key}
                        checked={selectedPaymentKey === method.key}
                        onChange={() => setSelectedPaymentKey(method.key)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{method.displayName}</p>
                        {method.notes && <p className="text-xs text-slate-500">{method.notes}</p>}
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-amber-600">
                    No payment methods are currently available. Please contact support for assistance.
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptPolicies}
                  onChange={(event) => setAcceptPolicies(event.target.checked)}
                />
                I agree to the Terms & Conditions, Return Policy, and Privacy Policy.
              </label>
              <div className="flex justify-between">
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
                    !hasCartItems
                  }
                  loading={placeOrderMutation.isPending}
                >
                  Complete order
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 rounded border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
          {orderSummary ? (
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Products</span>
                <span>{formatCurrency(orderSummary.productTotal ?? 0, baseCurrency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(orderSummary.taxTotal ?? 0, baseCurrency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(orderSummary.shippingTotal ?? 0, baseCurrency)}</span>
              </div>
              {orderSummary.shippingBreakdown &&
                (() => {
                  const breakdown = orderSummary.shippingBreakdown;
                  const levels = [
                    breakdown.countryName
                      ? { label: breakdown.countryName, amount: breakdown.countryCost }
                      : null,
                    breakdown.stateName
                      ? { label: breakdown.stateName, amount: breakdown.stateCost }
                      : null,
                    breakdown.cityName
                      ? { label: breakdown.cityName, amount: breakdown.cityCost }
                      : null
                  ].filter((entry): entry is { label: string; amount: number | null } => Boolean(entry));
                  return (
                    <details className="rounded border border-slate-200 p-2 text-xs">
                      <summary className="cursor-pointer font-semibold text-slate-700">
                        Shipping breakdown
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {levels.map((entry) => (
                          <li key={entry.label} className="flex justify-between">
                            <span>{entry.label}</span>
                            <span>{formatMaybeCurrency(entry.amount)}</span>
                          </li>
                        ))}
                        <li className="flex justify-between font-medium text-slate-800">
                          <span>Effective rate</span>
                          <span>{formatMaybeCurrency(breakdown.effectiveCost)}</span>
                        </li>
                      </ul>
                    </details>
                  );
                })()}
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(orderSummary.grandTotal ?? 0, baseCurrency)}</span>
              </div>
              {!!orderSummary.taxLines?.length && (
                <details className="rounded border border-slate-200 p-2 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-700">Tax breakdown</summary>
                  <ul className="mt-2 space-y-1">
                    {orderSummary.taxLines.map((line: OrderTaxLine) => (
                      <li key={`${line.productId}-${line.taxRate}`} className="flex justify-between">
                        <span>{line.productName ?? 'Item'}</span>
                        <span>{formatCurrency(line.taxAmount, baseCurrency)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No items to display yet.</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
