import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import { useToast } from '../components/ToastProvider';
import api from '../services/http';
import type {
  ShippingAreaRate,
  ShippingAreaRatePage,
  ShippingCity,
  ShippingCountry,
  ShippingOption,
  ShippingState
} from '../types/shipping';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { extractErrorMessage } from '../utils/errors';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency } from '../utils/currency';

interface AreaShippingFormState {
  countryId: number | '';
  stateId: number | '';
  cityId: number | '';
  costValue: string;
  notes: string;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const defaultFormState: AreaShippingFormState = {
  countryId: '',
  stateId: '',
  cityId: '',
  costValue: '',
  notes: ''
};

const AreaShippingPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const baseCurrency = useAppSelector(selectBaseCurrency);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<AreaShippingFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'notes'>('general');

  const [showCountryComposer, setShowCountryComposer] = useState(false);
  const [showStateComposer, setShowStateComposer] = useState(false);
  const [showCityComposer, setShowCityComposer] = useState(false);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newStateName, setNewStateName] = useState('');
  const [newCityName, setNewCityName] = useState('');

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['SHIPPING_AREA_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['SHIPPING_AREA_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['SHIPPING_AREA_DELETE']),
    [permissions]
  );
  const canManageLocations = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['SHIPPING_LOCATION_MANAGE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const areaRatesQuery = useQuery<ShippingAreaRatePage>({
    queryKey: ['shipping-area-rates', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<ShippingAreaRatePage>('/shipping/area-rates', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const areaRates = areaRatesQuery.data?.content ?? [];
  const totalElements = areaRatesQuery.data?.totalElements ?? 0;

  const countriesQuery = useQuery<ShippingCountry[]>({
    queryKey: ['shipping', 'countries'],
    queryFn: async () => {
      const { data } = await api.get<ShippingCountry[]>('/shipping/countries');
      return data;
    }
  });

  const selectedCountryId = typeof form.countryId === 'number' ? form.countryId : null;
  const selectedStateId = typeof form.stateId === 'number' ? form.stateId : null;

  const statesQuery = useQuery<ShippingState[]>({
    queryKey: ['shipping', 'states', selectedCountryId],
    enabled: selectedCountryId !== null,
    queryFn: async () => {
      const { data } = await api.get<ShippingState[]>(`/shipping/countries/${selectedCountryId}/states`);
      return data;
    }
  });

  const citiesQuery = useQuery<ShippingCity[]>({
    queryKey: ['shipping', 'cities', selectedStateId],
    enabled: selectedStateId !== null,
    queryFn: async () => {
      const { data } = await api.get<ShippingCity[]>(`/shipping/states/${selectedStateId}/cities`);
      return data;
    }
  });

  interface AreaRatePayload {
    countryId: number;
    stateId: number;
    cityId: number;
    costValue: number;
    notes: string | null;
  }

  const createMutation = useMutation({
    mutationFn: async (payload: AreaRatePayload) => {
      const { data } = await api.post<ShippingAreaRate>('/shipping/area-rates', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Area shipping rate created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['shipping-area-rates'] });
      closeForm();
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create shipping rate.') });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: AreaRatePayload }) => {
      const { data } = await api.put<ShippingAreaRate>(`/shipping/area-rates/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Area shipping rate updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['shipping-area-rates'] });
      closeForm();
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update shipping rate.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/shipping/area-rates/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Area shipping rate deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['shipping-area-rates'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete shipping rate.') });
    }
  });

  const createCountryMutation = useMutation({
    mutationFn: async (payload: { name: string; code?: string | null }) => {
      const { data } = await api.post<ShippingCountry>('/shipping/countries', payload);
      return data;
    },
    onSuccess: (country) => {
      notify({ type: 'success', message: 'Country added successfully.' });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'countries'] });
      setForm((prev) => ({ ...prev, countryId: country.id, stateId: '', cityId: '' }));
      setShowCountryComposer(false);
      setNewCountryName('');
      setNewCountryCode('');
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create country.') });
    }
  });

  const createStateMutation = useMutation({
    mutationFn: async ({ countryId, name }: { countryId: number; name: string }) => {
      const { data } = await api.post<ShippingState>(`/shipping/countries/${countryId}/states`, { name });
      return data;
    },
    onSuccess: (state) => {
      notify({ type: 'success', message: 'State added successfully.' });
      if (selectedCountryId) {
        queryClient.invalidateQueries({ queryKey: ['shipping', 'states', selectedCountryId] });
      }
      setForm((prev) => ({ ...prev, stateId: state.id, cityId: '' }));
      setShowStateComposer(false);
      setNewStateName('');
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create state.') });
    }
  });

  const createCityMutation = useMutation({
    mutationFn: async ({ stateId, name }: { stateId: number; name: string }) => {
      const { data } = await api.post<ShippingCity>(`/shipping/states/${stateId}/cities`, { name });
      return data;
    },
    onSuccess: (city) => {
      notify({ type: 'success', message: 'City added successfully.' });
      if (selectedStateId) {
        queryClient.invalidateQueries({ queryKey: ['shipping', 'cities', selectedStateId] });
      }
      setForm((prev) => ({ ...prev, cityId: city.id }));
      setShowCityComposer(false);
      setNewCityName('');
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create city.') });
    }
  });

  const openCreateForm = () => {
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setPanelMode('create');
    setActiveTab('general');
    setShowCountryComposer(false);
    setShowStateComposer(false);
    setShowCityComposer(false);
    setNewCountryName('');
    setNewCountryCode('');
    setNewStateName('');
    setNewCityName('');
  };

  const openEditForm = (rate: ShippingAreaRate) => {
    setForm({
      countryId: rate.countryId,
      stateId: rate.stateId,
      cityId: rate.cityId,
      costValue: `${rate.costValue ?? ''}`,
      notes: rate.notes ?? ''
    });
    setFormError(null);
    setEditingId(rate.id);
    setPanelMode('edit');
    setActiveTab('general');
    setShowCountryComposer(false);
    setShowStateComposer(false);
    setShowCityComposer(false);
    setNewCountryName('');
    setNewCountryCode('');
    setNewStateName('');
    setNewCityName('');
  };

  const closeForm = () => {
    setPanelMode('list');
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setActiveTab('general');
    setShowCountryComposer(false);
    setShowStateComposer(false);
    setShowCityComposer(false);
    setNewCountryName('');
    setNewCountryCode('');
    setNewStateName('');
    setNewCityName('');
  };

  const handleDelete = (rate: ShippingAreaRate) => {
    if (!canDelete) {
      return;
    }
    const confirmed = window.confirm(`Delete the shipping rate for ${rate.cityName}?`);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(rate.id);
  };

  const formatDate = (value: string) => {
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      return value;
    }
  };

  const costLabel = (cost: number | null | undefined) => {
    if (cost == null) {
      return '--';
    }
    return formatCurrency(cost, baseCurrency);
  };

  const handleSubmit = async () => {
    const countryId = typeof form.countryId === 'number' ? form.countryId : NaN;
    const stateId = typeof form.stateId === 'number' ? form.stateId : NaN;
    const cityId = typeof form.cityId === 'number' ? form.cityId : NaN;

    if (!Number.isFinite(countryId)) {
      setFormError('Select a country for this shipping rate.');
      setActiveTab('general');
      return;
    }

    if (!Number.isFinite(stateId)) {
      setFormError('Select a state for this shipping rate.');
      setActiveTab('general');
      return;
    }

    if (!Number.isFinite(cityId)) {
      setFormError('Select a city for this shipping rate.');
      setActiveTab('general');
      return;
    }

    const normalizedCost = form.costValue.trim();
    if (!normalizedCost) {
      setFormError('Enter a shipping cost.');
      setActiveTab('general');
      return;
    }

    const parsedCost = Number.parseFloat(normalizedCost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setFormError('Shipping cost must be a non-negative number.');
      setActiveTab('general');
      return;
    }

    const payload: AreaRatePayload = {
      countryId,
      stateId,
      cityId,
      costValue: Number.parseFloat(parsedCost.toFixed(2)),
      notes: form.notes.trim() ? form.notes.trim() : null
    };

    if (panelMode === 'edit' && editingId) {
      await updateMutation.mutateAsync({ id: editingId, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const onCountryChange = (value: string) => {
    if (value === '') {
      setForm((prev) => ({ ...prev, countryId: '', stateId: '', cityId: '' }));
      return;
    }
    const numericValue = Number.parseInt(value, 10);
    setForm((prev) => ({ ...prev, countryId: Number.isNaN(numericValue) ? '' : numericValue, stateId: '', cityId: '' }));
  };

  const onStateChange = (value: string) => {
    if (value === '') {
      setForm((prev) => ({ ...prev, stateId: '', cityId: '' }));
      return;
    }
    const numericValue = Number.parseInt(value, 10);
    setForm((prev) => ({ ...prev, stateId: Number.isNaN(numericValue) ? '' : numericValue, cityId: '' }));
  };

  const onCityChange = (value: string) => {
    if (value === '') {
      setForm((prev) => ({ ...prev, cityId: '' }));
      return;
    }
    const numericValue = Number.parseInt(value, 10);
    setForm((prev) => ({ ...prev, cityId: Number.isNaN(numericValue) ? '' : numericValue }));
  };

  const submitNewCountry = () => {
    const trimmed = newCountryName.trim();
    if (!trimmed) {
      notify({ type: 'error', message: 'Enter a country name.' });
      return;
    }
    createCountryMutation.mutate({ name: trimmed, code: newCountryCode.trim() || undefined });
  };

  const submitNewState = () => {
    if (!selectedCountryId) {
      notify({ type: 'error', message: 'Select a country before adding a state.' });
      return;
    }
    const trimmed = newStateName.trim();
    if (!trimmed) {
      notify({ type: 'error', message: 'Enter a state name.' });
      return;
    }
    createStateMutation.mutate({ countryId: selectedCountryId, name: trimmed });
  };

  const submitNewCity = () => {
    if (!selectedStateId) {
      notify({ type: 'error', message: 'Select a state before adding a city.' });
      return;
    }
    const trimmed = newCityName.trim();
    if (!trimmed) {
      notify({ type: 'error', message: 'Enter a city name.' });
      return;
    }
    createCityMutation.mutate({ stateId: selectedStateId, name: trimmed });
  };

  const renderInlineComposer = (
    type: 'country' | 'state' | 'city',
    options: {
      visible: boolean;
      onCancel: () => void;
      onSubmit: () => void;
      name: string;
      onNameChange: (value: string) => void;
      secondaryField?: { label: string; value: string; onChange: (value: string) => void } | null;
      isSubmitting: boolean;
      helper?: string;
      placeholder?: string;
    }
  ) => {
    if (!options.visible) {
      return null;
    }
    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              {type === 'country' ? 'Country name' : type === 'state' ? 'State name' : 'City name'}
            </label>
            <input
              type="text"
              value={options.name}
              onChange={(event) => options.onNameChange(event.target.value)}
              placeholder={options.placeholder ?? ''}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {options.secondaryField ? (
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                {options.secondaryField.label}
              </label>
              <input
                type="text"
                value={options.secondaryField.value}
                onChange={(event) => options.secondaryField?.onChange(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={options.onSubmit}
              disabled={options.isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Save
            </button>
            <button
              type="button"
              onClick={options.onCancel}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
        {options.helper ? <p className="mt-3 text-xs text-slate-500">{options.helper}</p> : null}
      </div>
    );
  };

  const renderDirectory = () => (
    <PageSection>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Area-wise shipping</h2>
          <p className="text-sm text-slate-500">
            Define destination-based shipping charges for each country, state, and city you serve.
          </p>
        </div>
        <div className="flex w-full gap-3 sm:max-w-xs">
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search locations"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cost
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Updated
              </th>
              {(canUpdate || canDelete) && (
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {areaRates.length > 0 ? (
              areaRates.map((rate) => (
                <tr key={rate.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{rate.cityName}</div>
                    <p className="text-xs text-slate-500">
                      {rate.stateName} • {rate.countryName}
                    </p>
                    {rate.notes ? (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{rate.notes}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{costLabel(rate.costValue)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(rate.updatedAt)}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditForm(rate)}
                            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                            aria-label={`Edit shipping rate for ${rate.cityName}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(rate)}
                            className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                            aria-label={`Delete shipping rate for ${rate.cityName}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="h-4 w-4"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V4h6v3m2 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7h12Z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canUpdate || canDelete ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-500">
                  {areaRatesQuery.isLoading ? 'Loading shipping rates…' : 'No shipping rates found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        totalElements={totalElements}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        isLoading={areaRatesQuery.isLoading}
      />
    </PageSection>
  );

  const renderForm = () => {
    const isCreate = panelMode === 'create';
    const isSaving = createMutation.isPending || updateMutation.isPending;
    const headerTitle = isCreate ? 'Create shipping rate' : 'Edit shipping rate';

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleSubmit();
    };

    const renderSelect = (
      id: string,
      label: string,
      value: number | '',
      onChange: (value: string) => void,
      options: ShippingOption[],
      loading: boolean,
      placeholder: string,
      composerToggle?: () => void
    ) => (
      <div>
        <div className="flex items-center justify-between">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={id}>
            {label}
          </label>
          {composerToggle && canManageLocations ? (
            <button
              type="button"
              onClick={composerToggle}
              className="text-xs font-semibold text-primary hover:text-primary/80"
            >
              Add new
            </button>
          ) : null}
        </div>
        <select
          id={id}
          value={value === '' ? '' : value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">{loading ? 'Loading…' : placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );

    const countries: ShippingOption[] = (countriesQuery.data ?? []).map((country) => ({
      id: country.id,
      label: country.name
    }));

    const states: ShippingOption[] = (statesQuery.data ?? []).map((state) => ({
      id: state.id,
      label: state.name
    }));

    const cities: ShippingOption[] = (citiesQuery.data ?? []).map((city) => ({
      id: city.id,
      label: city.name
    }));

    return (
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary/40 hover:text-primary"
              aria-label="Back to area shipping directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{isCreate ? 'New shipping rate' : 'Edit shipping rate'}</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{headerTitle}</h2>
              {editingId && !isCreate ? (
                <p className="text-sm text-slate-500">Shipping rate ID #{editingId}</p>
              ) : null}
            </div>
          </div>
        </header>
        <div className="grid border-b border-slate-200 lg:grid-cols-[240px,1fr]">
          <nav className="flex shrink-0 flex-row gap-2 border-b border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 lg:flex-col lg:border-b-0 lg:border-r">
            {[
              { key: 'general', label: 'General' },
              { key: 'notes', label: 'Notes & visibility' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'general' | 'notes')}
                className={`rounded-lg px-3 py-2 text-left transition ${
                  activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 px-6 py-6">
            {formError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{formError}</div>
            )}
            {activeTab === 'general' ? (
              <div className="space-y-6">
                {renderSelect(
                  'shipping-country',
                  'Country',
                  form.countryId,
                  onCountryChange,
                  countries,
                  countriesQuery.isLoading,
                  'Select a country',
                  () => setShowCountryComposer((value) => !value)
                )}
                {renderInlineComposer('country', {
                  visible: showCountryComposer,
                  onCancel: () => {
                    setShowCountryComposer(false);
                    setNewCountryName('');
                    setNewCountryCode('');
                  },
                  onSubmit: submitNewCountry,
                  name: newCountryName,
                  onNameChange: setNewCountryName,
                  secondaryField: {
                    label: 'Country code (optional)',
                    value: newCountryCode,
                    onChange: setNewCountryCode
                  },
                  isSubmitting: createCountryMutation.isPending,
                  helper: 'The code helps match platform integrations. Example: US, IN, DE.',
                  placeholder: 'India'
                })}
                {renderSelect(
                  'shipping-state',
                  'State / Region',
                  form.stateId,
                  onStateChange,
                  states,
                  statesQuery.isLoading,
                  selectedCountryId ? 'Select a state' : 'Choose a country first',
                  selectedCountryId ? () => setShowStateComposer((value) => !value) : undefined
                )}
                {renderInlineComposer('state', {
                  visible: showStateComposer,
                  onCancel: () => {
                    setShowStateComposer(false);
                    setNewStateName('');
                  },
                  onSubmit: submitNewState,
                  name: newStateName,
                  onNameChange: setNewStateName,
                  isSubmitting: createStateMutation.isPending,
                  helper: selectedCountryId ? undefined : 'Select a country before adding states.',
                  placeholder: 'California'
                })}
                {renderSelect(
                  'shipping-city',
                  'City / Area',
                  form.cityId,
                  onCityChange,
                  cities,
                  citiesQuery.isLoading,
                  selectedStateId ? 'Select a city' : 'Choose a state first',
                  selectedStateId ? () => setShowCityComposer((value) => !value) : undefined
                )}
                {renderInlineComposer('city', {
                  visible: showCityComposer,
                  onCancel: () => {
                    setShowCityComposer(false);
                    setNewCityName('');
                  },
                  onSubmit: submitNewCity,
                  name: newCityName,
                  onNameChange: setNewCityName,
                  isSubmitting: createCityMutation.isPending,
                  helper: selectedStateId ? undefined : 'Select a state before adding cities.',
                  placeholder: 'San Francisco'
                })}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="shipping-cost">
                    Shipping cost
                  </label>
                  <input
                    id="shipping-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.costValue}
                    onChange={(event) => setForm((prev) => ({ ...prev, costValue: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Customers within this city will see this charge at checkout.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="shipping-notes">
                    Internal notes (optional)
                  </label>
                  <textarea
                    id="shipping-notes"
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={5}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Mention delivery timelines or courier preferences for this area."
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    These notes appear for your operations team and will not be shown to customers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Ensure delivery partners are ready for changes to this area before publishing.</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? 'Saving…' : isCreate ? 'Create shipping rate' : 'Save changes'}
            </button>
          </div>
        </footer>
      </form>
    );
  };

  const isDirectoryView = panelMode === 'list';

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Area-wise shipping"
        description="Manage granular shipping charges for each serviceable area."
        actions={
          isDirectoryView && canCreate ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary/90"
            >
              New area rate
            </button>
          ) : undefined
        }
      />

      {isDirectoryView ? renderDirectory() : renderForm()}
    </div>
  );
};

export default AreaShippingPage;
