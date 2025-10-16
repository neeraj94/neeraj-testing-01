import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type {
  AddressType,
  CheckoutAddress,
  CheckoutOrderPayload,
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
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';

type StepKey = 'shipping' | 'billing' | 'payment';

const steps: StepKey[] = ['shipping', 'billing', 'payment'];

const defaultOrderLines = [
  { productId: 1, name: 'Sample Product', quantity: 1, unitPrice: 499, taxRate: 0.18 }
];

const CheckoutPage = () => {
  const { notify } = useToast();
  const baseCurrency = useAppSelector(selectBaseCurrency);
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

  const summaryQuery = useQuery<CheckoutSummary>({
    queryKey: ['checkout', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<CheckoutSummary>('/checkout/summary');
      return data;
    }
  });

  const addresses = summaryQuery.data?.addresses ?? [];
  const paymentMethods = summaryQuery.data?.paymentMethods ?? [];
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(summaryQuery.data?.orderSummary ?? null);

  useEffect(() => {
    if (!shippingAddressId && addresses.length) {
      const shipping = addresses.find((address) => address.type === 'SHIPPING');
      if (shipping) {
        setShippingAddressId(shipping.id);
      }
    }
    if (!billingAddressId && addresses.length) {
      const billing = addresses.find((address) => address.type === 'BILLING');
      if (billing) {
        setBillingAddressId(billing.id);
      }
    }
    if (!selectedPaymentKey && paymentMethods.length) {
      const enabled = paymentMethods.find((method) => method.enabled);
      if (enabled) {
        setSelectedPaymentKey(enabled.key);
      }
    }
  }, [addresses, billingAddressId, paymentMethods, selectedPaymentKey, shippingAddressId]);

  useEffect(() => {
    if (summaryQuery.data?.orderSummary) {
      setOrderSummary(summaryQuery.data.orderSummary);
    }
  }, [summaryQuery.data?.orderSummary]);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const payload: CheckoutOrderPayload = {
          shippingAddressId: shippingAddressId!,
          billingAddressId: sameAsShipping ? null : billingAddressId ?? undefined,
          sameAsShipping,
          paymentMethodKey: selectedPaymentKey ?? 'COD',
          lines: defaultOrderLines
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
  }, [shippingAddressId, billingAddressId, sameAsShipping, selectedPaymentKey]);

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

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!shippingAddressId || !selectedPaymentKey) {
        throw new Error('Please complete the checkout steps.');
      }
      const payload: CheckoutOrderPayload = {
        shippingAddressId,
        billingAddressId: sameAsShipping ? null : billingAddressId ?? undefined,
        sameAsShipping,
        paymentMethodKey: selectedPaymentKey,
        lines: defaultOrderLines
      };
      const { data } = await api.post('/checkout/orders', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Order placed successfully.' });
      queryClient.invalidateQueries({ queryKey: ['checkout', 'summary'] });
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
                    setAddressForm((prev) => ({ ...prev, type: 'SHIPPING' }));
                    setShowAddressForm((prev) => !prev);
                  }}
                >
                  {showAddressForm ? 'Cancel' : 'Add new address'}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {addresses
                  .filter((address) => address.type === 'SHIPPING')
                  .map((address) => renderAddressCard(address, shippingAddressId, setShippingAddressId))}
              </div>
              {showAddressForm && (
                <form onSubmit={handleSubmitAddress} className="space-y-3 rounded border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700">Add shipping address</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-medium uppercase text-slate-500">
                      Full name
                      <input
                        required
                        value={addressForm.fullName}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, fullName: event.target.value }))}
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs font-medium uppercase text-slate-500">
                      Mobile number
                      <input
                        required
                        value={addressForm.mobileNumber}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, mobileNumber: event.target.value }))}
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="text-xs font-medium uppercase text-slate-500">
                    Address line 1
                    <input
                      required
                      value={addressForm.addressLine1}
                      onChange={(event) => setAddressForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Flat, House No., Building"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase text-slate-500">
                    Address line 2
                    <input
                      value={addressForm.addressLine2}
                      onChange={(event) => setAddressForm((prev) => ({ ...prev, addressLine2: event.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Area, Street, Sector"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase text-slate-500">
                    Landmark
                    <input
                      value={addressForm.landmark}
                      onChange={(event) => setAddressForm((prev) => ({ ...prev, landmark: event.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="defaultAddress"
                      type="checkbox"
                      checked={addressForm.makeDefault}
                      onChange={(event) =>
                        setAddressForm((prev) => ({ ...prev, makeDefault: event.target.checked }))
                      }
                    />
                    <label htmlFor="defaultAddress" className="text-sm text-slate-600">
                      Make this my default address
                    </label>
                  </div>
                  <Button type="submit" loading={createAddressMutation.isPending}>
                    Save address
                  </Button>
                </form>
              )}
              <div className="flex justify-end gap-3">
                <Button onClick={nextStep} disabled={!shippingAddressId}>
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
                    setAddressForm((prev) => ({ ...prev, type: 'BILLING' }));
                    setShowAddressForm((prev) => !prev);
                  }}
                >
                  {showAddressForm ? 'Cancel' : 'Add new billing address'}
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
                  {addresses
                    .filter((address) => address.type === 'BILLING')
                    .map((address) => renderAddressCard(address, billingAddressId, setBillingAddressId))}
                </div>
              )}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={prevStep}>
                  Back to shipping
                </Button>
                <Button onClick={nextStep} disabled={!sameAsShipping && !billingAddressId}>
                  Continue to payment
                </Button>
              </div>
            </section>
          )}

          {activeStep === 'payment' && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Payment method</h2>
              <div className="space-y-3">
                {paymentMethods.map((method: PaymentMethod) => (
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
                ))}
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
                  disabled={!acceptPolicies || !selectedPaymentKey || placeOrderMutation.isPending}
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
