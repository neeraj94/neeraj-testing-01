import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import StorefrontHeader from '../components/StorefrontHeader';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { loadCurrentUser } from '../features/auth/authSlice';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import { api } from '../services/http';
import type {
  AddressType,
  CheckoutAddress,
  CheckoutAddressPayload,
  CheckoutRegionOption
} from '../types/checkout';
import type { UserSummary } from '../types/auth';

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
}

interface PasswordFormState {
  current: string;
  next: string;
  confirm: string;
}

interface ProfileUpdatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  oldPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

interface AddressFormState {
  type: AddressType;
  fullName: string;
  mobileNumber: string;
  pinCode: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  countryId: string;
  stateId: string;
  cityId: string;
  makeDefault: boolean;
}

const emptyAddressForm: AddressFormState = {
  type: 'SHIPPING',
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

const emailPattern = /.+@.+\..+/i;

const MyAccountPage = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user;

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phoneNumber: user?.phoneNumber ?? '',
    whatsappNumber: user?.whatsappNumber ?? ''
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({ current: '', next: '', confirm: '' });
  const [profileError, setProfileError] = useState<string | null>(null);

  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);
  const [addressMode, setAddressMode] = useState<'create' | 'edit'>('create');
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'My Account — Aurora Market';
  }, []);

  useEffect(() => {
    setProfileForm({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      whatsappNumber: user?.whatsappNumber ?? ''
    });
  }, [user?.firstName, user?.lastName, user?.email, user?.phoneNumber, user?.whatsappNumber]);

  const addressesQuery = useQuery<CheckoutAddress[]>({
    queryKey: ['profile', 'addresses'],
    enabled: Boolean(auth.accessToken && auth.portal === 'client'),
    queryFn: async () => {
      const { data } = await api.get<CheckoutAddress[]>('/checkout/addresses');
      return data;
    }
  });

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

  const profileMutation = useMutation({
    mutationFn: async (payload: ProfileUpdatePayload) => {
      const { data } = await api.put<UserSummary>('/profile', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Profile updated successfully.' });
      setProfileError(null);
      setPasswordForm({ current: '', next: '', confirm: '' });
      void dispatch(loadCurrentUser());
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Unable to update your profile. Please try again.');
      setProfileError(message);
      notify({ type: 'error', message });
    }
  });

  const createAddressMutation = useMutation({
    mutationFn: async (payload: CheckoutAddressPayload) => {
      const { data } = await api.post<CheckoutAddress>('/checkout/addresses', payload);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: `Added ${data.type.toLowerCase()} address.` });
      setAddressError(null);
      closeAddressForm();
      queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Unable to save the address.');
      setAddressError(message);
      notify({ type: 'error', message });
    }
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CheckoutAddressPayload }) => {
      const { data } = await api.put<CheckoutAddress>(`/checkout/addresses/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: `Updated ${data.type.toLowerCase()} address.` });
      setAddressError(null);
      closeAddressForm();
      queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Unable to update the address.');
      setAddressError(message);
      notify({ type: 'error', message });
    }
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: number) => {
      await api.delete(`/checkout/addresses/${addressId}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Address removed successfully.' });
      queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Unable to delete the address.');
      notify({ type: 'error', message });
    }
  });

  const addresses = useMemo(() => {
    const list = addressesQuery.data ?? [];
    return [...list].sort((a, b) => Number(b.defaultAddress) - Number(a.defaultAddress));
  }, [addressesQuery.data]);

  const emailValid = emailPattern.test(profileForm.email.trim());
  const nameValid = profileForm.firstName.trim().length > 0 && profileForm.lastName.trim().length > 0;
  const passwordMatch = passwordForm.next.trim() === passwordForm.confirm.trim();
  const passwordLengthOk = !passwordForm.next.trim().length || passwordForm.next.trim().length >= 8;

  const handleProfileSubmit = (event: FormEvent) => {
    event.preventDefault();
    setProfileError(null);

    if (!nameValid) {
      setProfileError('Please provide your first and last name.');
      return;
    }

    if (!emailValid) {
      setProfileError('Please provide a valid email address.');
      return;
    }

    if (!passwordMatch) {
      setProfileError('New passwords do not match.');
      return;
    }

    if (!passwordLengthOk) {
      setProfileError('New password must be at least 8 characters long.');
      return;
    }

    const payload: ProfileUpdatePayload = {
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim(),
      phoneNumber: profileForm.phoneNumber.trim() || undefined,
      whatsappNumber: profileForm.whatsappNumber.trim() || undefined,
      oldPassword: passwordForm.current.trim() || undefined,
      newPassword: passwordForm.next.trim() || undefined,
      confirmNewPassword: passwordForm.confirm.trim() || undefined
    };

    profileMutation.mutate(payload);
  };

  const buildAddressPayload = (): CheckoutAddressPayload => ({
    type: addressForm.type,
    fullName: addressForm.fullName.trim(),
    mobileNumber: addressForm.mobileNumber.trim(),
    pinCode: addressForm.pinCode.trim() || undefined,
    addressLine1: addressForm.addressLine1.trim(),
    addressLine2: addressForm.addressLine2.trim() || undefined,
    landmark: addressForm.landmark.trim() || undefined,
    countryId: addressForm.countryId ? Number(addressForm.countryId) : undefined,
    stateId: addressForm.stateId ? Number(addressForm.stateId) : undefined,
    cityId: addressForm.cityId ? Number(addressForm.cityId) : undefined,
    makeDefault: addressForm.makeDefault
  });

  const handleAddressSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAddressError(null);

    if (!addressForm.fullName.trim() || !addressForm.mobileNumber.trim() || !addressForm.addressLine1.trim()) {
      setAddressError('Name, phone number, and address line 1 are required.');
      return;
    }

    const payload = buildAddressPayload();

    if (addressMode === 'edit' && editingAddressId != null) {
      updateAddressMutation.mutate({ id: editingAddressId, payload });
      return;
    }

    createAddressMutation.mutate(payload);
  };

  const startCreateAddress = (type: AddressType) => {
    setAddressForm({ ...emptyAddressForm, type });
    setAddressMode('create');
    setEditingAddressId(null);
    setAddressError(null);
    setAddressFormOpen(true);
  };

  const startEditAddress = (address: CheckoutAddress) => {
    setAddressMode('edit');
    setEditingAddressId(address.id);
    setAddressError(null);
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
    setAddressFormOpen(true);
  };

  const closeAddressForm = () => {
    setAddressFormOpen(false);
    setAddressMode('create');
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
  };

  const handleDeleteAddress = (address: CheckoutAddress) => {
    if (deleteAddressMutation.isPending) {
      return;
    }
    const confirmed = window.confirm('Remove this address? You can add it again later.');
    if (!confirmed) {
      return;
    }
    deleteAddressMutation.mutate(address.id);
  };

  const addressSubmitting = createAddressMutation.isPending || updateAddressMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <StorefrontHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-semibold text-slate-900">My Account</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your personal details, saved addresses, and password from a single place.
            </p>
          </header>
          <form className="mt-8 grid gap-6 lg:grid-cols-[2fr,1fr]" onSubmit={handleProfileSubmit}>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Profile information</h2>
                <p className="text-sm text-slate-500">Keep your contact details up to date so we can reach you.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  First name
                  <input
                    type="text"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                    value={profileForm.firstName}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Last name
                  <input
                    type="text"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                    value={profileForm.lastName}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    required
                  />
                </label>
              </div>
              <label className="flex flex-col text-sm font-medium text-slate-600">
                Email address
                <input
                  type="email"
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Phone number
                  <input
                    type="tel"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                    value={profileForm.phoneNumber}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  WhatsApp number
                  <input
                    type="tel"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                    value={profileForm.whatsappNumber}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, whatsappNumber: event.target.value }))}
                  />
                </label>
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Password &amp; security</h3>
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Current password
                  <input
                    type="password"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                    value={passwordForm.current}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, current: event.target.value }))}
                    placeholder="Leave blank to keep unchanged"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col text-sm font-medium text-slate-600">
                    New password
                    <input
                      type="password"
                      className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                      value={passwordForm.next}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, next: event.target.value }))}
                      placeholder="Minimum 8 characters"
                    />
                  </label>
                  <label className="flex flex-col text-sm font-medium text-slate-600">
                    Confirm new password
                    <input
                      type="password"
                      className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                      value={passwordForm.confirm}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  We only update your password if you provide your current password and a matching new password.
                </p>
              </div>
            </div>
            <aside className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account snapshot</h2>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <span className="font-semibold text-slate-900">Name:</span> {user?.fullName ?? 'Not set'}
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Email verified:</span>{' '}
                  {user?.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleDateString() : 'Pending'}
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Saved addresses:</span> {addresses.length}
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Order history:</span>{' '}
                  <a className="text-primary underline-offset-2 transition hover:underline" href="/account/orders">
                    View my orders
                  </a>
                </li>
              </ul>
            </aside>
            {profileError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 lg:col-span-2">
                {profileError}
              </div>
            )}
            <div className="lg:col-span-2">
              <Button type="submit" loading={profileMutation.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </section>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Saved addresses</h2>
              <p className="text-sm text-slate-500">Choose where we should ship and bill your orders.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => startCreateAddress('SHIPPING')}>
                Add shipping address
              </Button>
              <Button variant="ghost" onClick={() => startCreateAddress('BILLING')}>
                Add billing address
              </Button>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {addressesQuery.isLoading ? (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Spinner /> Loading your addresses…
              </div>
            ) : addresses.length ? (
              addresses.map((address) => (
                <article
                  key={address.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 md:flex-row md:items-start"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                        {address.type.toLowerCase()} address
                      </span>
                      {address.defaultAddress && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">{address.fullName}</p>
                      <p>{address.addressLine1}</p>
                      {address.addressLine2 && <p>{address.addressLine2}</p>}
                      {address.landmark && <p>Landmark: {address.landmark}</p>}
                      <p>
                        {[address.cityName, address.stateName, address.countryName].filter(Boolean).join(', ')}
                        {address.pinCode ? ` · ${address.pinCode}` : ''}
                      </p>
                      <p>Phone: {address.mobileNumber}</p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <Button variant="ghost" onClick={() => startEditAddress(address)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="border-rose-200 text-rose-600 hover:border-rose-300 hover:text-rose-700"
                      onClick={() => handleDeleteAddress(address)}
                      disabled={deleteAddressMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                You have not saved any addresses yet. Add a shipping or billing address to speed up checkout.
              </div>
            )}
          </div>

          {addressFormOpen && (
            <form
              className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-6"
              onSubmit={handleAddressSubmit}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  {addressMode === 'edit' ? 'Edit address' : 'Add new address'}
                </h3>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={closeAddressForm}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={addressSubmitting}>
                    {addressMode === 'edit' ? 'Update address' : 'Save address'}
                  </Button>
                </div>
              </div>
              {addressError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{addressError}</div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Address type
                  <select
                    value={addressForm.type}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, type: event.target.value as AddressType }))
                    }
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                  >
                    <option value="SHIPPING">Shipping</option>
                    <option value="BILLING">Billing</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={addressForm.makeDefault}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, makeDefault: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Make this my default {addressForm.type.toLowerCase()} address
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Full name
                  <input
                    type="text"
                    value={addressForm.fullName}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    required
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Phone number
                  <input
                    type="tel"
                    value={addressForm.mobileNumber}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, mobileNumber: event.target.value }))
                    }
                    required
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
              <label className="flex flex-col text-sm font-medium text-slate-600">
                Address line 1
                <input
                  type="text"
                  value={addressForm.addressLine1}
                  onChange={(event) =>
                    setAddressForm((prev) => ({ ...prev, addressLine1: event.target.value }))
                  }
                  required
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Address line 2 (optional)
                  <input
                    type="text"
                    value={addressForm.addressLine2}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, addressLine2: event.target.value }))
                    }
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Landmark (optional)
                  <input
                    type="text"
                    value={addressForm.landmark}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, landmark: event.target.value }))
                    }
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Country
                  <select
                    value={addressForm.countryId}
                    onChange={(event) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        countryId: event.target.value,
                        stateId: '',
                        cityId: ''
                      }))
                    }
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                  >
                    <option value="">Select country</option>
                    {(countriesQuery.data ?? []).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label ?? option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  State
                  <select
                    value={addressForm.stateId}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, stateId: event.target.value, cityId: '' }))
                    }
                    disabled={!addressForm.countryId}
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Select state</option>
                    {(statesQuery.data ?? []).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label ?? option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  City
                  <select
                    value={addressForm.cityId}
                    onChange={(event) =>
                      setAddressForm((prev) => ({ ...prev, cityId: event.target.value }))
                    }
                    disabled={!addressForm.stateId}
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Select city</option>
                    {(citiesQuery.data ?? []).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label ?? option.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col text-sm font-medium text-slate-600">
                PIN / Postal code
                <input
                  type="text"
                  value={addressForm.pinCode}
                  onChange={(event) =>
                    setAddressForm((prev) => ({ ...prev, pinCode: event.target.value }))
                  }
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
                />
              </label>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

export default MyAccountPage;
