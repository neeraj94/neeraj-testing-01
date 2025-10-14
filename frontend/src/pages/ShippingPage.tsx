import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import { useToast } from '../components/ToastProvider';
import api from '../services/http';
import type { ShippingCity, ShippingCountry, ShippingState } from '../types/shipping';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { extractErrorMessage } from '../utils/errors';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency } from '../utils/currency';

type TabKey = 'countries' | 'states' | 'cities';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

type CountrySettingsPayload = {
  enabled?: boolean;
  costValue?: number;
  clearCost?: boolean;
};

type StateSettingsPayload = {
  enabled?: boolean;
  overrideCost?: number;
  clearOverride?: boolean;
};

type CitySettingsPayload = {
  enabled?: boolean;
  overrideCost?: number;
  clearOverride?: boolean;
};

type CountryFormState = {
  name: string;
  code: string;
  rate: string;
};

type StateFormState = {
  name: string;
};

type CityFormState = {
  name: string;
};

const defaultCountryForm: CountryFormState = {
  name: '',
  code: '',
  rate: ''
};

const defaultStateForm: StateFormState = {
  name: ''
};

const defaultCityForm: CityFormState = {
  name: ''
};

const renderCost = (value: number | null | undefined, currency: string | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? formatCurrency(value, currency) : '—';

const sortByEnabledThenName = <T extends { enabled?: boolean; name: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const enabledDelta = Number(Boolean(b.enabled)) - Number(Boolean(a.enabled));
    if (enabledDelta !== 0) {
      return enabledDelta;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

const AreaShippingManager = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const baseCurrency = useAppSelector(selectBaseCurrency);

  const [activeTab, setActiveTab] = useState<TabKey>('countries');

  const [countrySearchDraft, setCountrySearchDraft] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryPage, setCountryPage] = useState(0);
  const [countryPageSize, setCountryPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [showCountryForm, setShowCountryForm] = useState(false);
  const [countryForm, setCountryForm] = useState<CountryFormState>(defaultCountryForm);
  const [countryFormError, setCountryFormError] = useState<string | null>(null);

  const [stateCountryId, setStateCountryId] = useState<number | null>(null);
  const [stateSearchDraft, setStateSearchDraft] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [statePage, setStatePage] = useState(0);
  const [statePageSize, setStatePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [showStateForm, setShowStateForm] = useState(false);
  const [stateForm, setStateForm] = useState<StateFormState>(defaultStateForm);
  const [stateFormError, setStateFormError] = useState<string | null>(null);

  const [cityCountryId, setCityCountryId] = useState<number | null>(null);
  const [cityStateId, setCityStateId] = useState<number | null>(null);
  const [citySearchDraft, setCitySearchDraft] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cityPage, setCityPage] = useState(0);
  const [cityPageSize, setCityPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [showCityForm, setShowCityForm] = useState(false);
  const [cityForm, setCityForm] = useState<CityFormState>(defaultCityForm);
  const [cityFormError, setCityFormError] = useState<string | null>(null);

  const [countryCostDrafts, setCountryCostDrafts] = useState<Record<number, string>>({});
  const [stateCostDrafts, setStateCostDrafts] = useState<Record<number, string>>({});
  const [cityCostDrafts, setCityCostDrafts] = useState<Record<number, string>>({});

  const [pendingCountryId, setPendingCountryId] = useState<number | null>(null);
  const [pendingStateId, setPendingStateId] = useState<number | null>(null);
  const [pendingCityId, setPendingCityId] = useState<number | null>(null);

  const canManageLocations = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['SHIPPING_LOCATION_MANAGE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCountrySearch(countrySearchDraft.trim());
      setCountryPage(0);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [countrySearchDraft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStateSearch(stateSearchDraft.trim());
      setStatePage(0);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [stateSearchDraft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCitySearch(citySearchDraft.trim());
      setCityPage(0);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [citySearchDraft]);

  const countriesQuery = useQuery<ShippingCountry[]>({
    queryKey: ['shipping', 'countries'],
    queryFn: async () => {
      const { data } = await api.get<ShippingCountry[]>('/shipping/countries');
      return data;
    }
  });

  const countries = countriesQuery.data ?? [];
  const sortedCountries = useMemo(() => sortByEnabledThenName(countries), [countries]);
  const enabledCountries = useMemo(
    () => sortedCountries.filter((country) => country.enabled),
    [sortedCountries]
  );
  const stateCountryOptions = useMemo(
    () => (enabledCountries.length ? enabledCountries : sortedCountries),
    [enabledCountries, sortedCountries]
  );
  useEffect(() => {
    if (!stateCountryOptions.length) {
      if (stateCountryId !== null) {
        setStateCountryId(null);
      }
      return;
    }

    if (!stateCountryOptions.some((country) => country.id === stateCountryId)) {
      setStateCountryId(stateCountryOptions[0].id);
    }
  }, [stateCountryOptions, stateCountryId]);

  useEffect(() => {
    setStatePage(0);
  }, [stateCountryId]);

  useEffect(() => {
    if (stateCountryId === null) {
      setShowStateForm(false);
    }
  }, [stateCountryId]);

  const cityCountryOptions = stateCountryOptions;
  useEffect(() => {
    if (!cityCountryOptions.length) {
      if (cityCountryId !== null) {
        setCityCountryId(null);
      }
      return;
    }

    if (!cityCountryOptions.some((country) => country.id === cityCountryId)) {
      setCityCountryId(cityCountryOptions[0].id);
    }
  }, [cityCountryOptions, cityCountryId]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) {
      return sortedCountries;
    }
    const term = countrySearch.toLowerCase();
    return sortedCountries.filter((country) =>
      [country.name, country.code ?? ''].some((value) => value?.toLowerCase().includes(term))
    );
  }, [sortedCountries, countrySearch]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(filteredCountries.length / countryPageSize) - 1, 0);
    if (countryPage > maxPage) {
      setCountryPage(maxPage);
    }
  }, [filteredCountries, countryPage, countryPageSize]);

  const paginatedCountries = useMemo(() => {
    const start = countryPage * countryPageSize;
    return filteredCountries.slice(start, start + countryPageSize);
  }, [filteredCountries, countryPage, countryPageSize]);

  const statesQuery = useQuery<ShippingState[]>({
    queryKey: ['shipping', 'states', 'list', stateCountryId],
    enabled: stateCountryId !== null,
    queryFn: async () => {
      const { data } = await api.get<ShippingState[]>(`/shipping/countries/${stateCountryId}/states`);
      return data;
    }
  });

  const states = statesQuery.data ?? [];
  const sortedStates = useMemo(() => sortByEnabledThenName(states), [states]);

  const filteredStates = useMemo(() => {
    if (!stateSearch) {
      return sortedStates;
    }
    const term = stateSearch.toLowerCase();
    return sortedStates.filter((state) => state.name.toLowerCase().includes(term));
  }, [sortedStates, stateSearch]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(filteredStates.length / statePageSize) - 1, 0);
    if (statePage > maxPage) {
      setStatePage(maxPage);
    }
  }, [filteredStates, statePage, statePageSize]);

  const paginatedStates = useMemo(() => {
    const start = statePage * statePageSize;
    return filteredStates.slice(start, start + statePageSize);
  }, [filteredStates, statePage, statePageSize]);

  const cityStatesQuery = useQuery<ShippingState[]>({
    queryKey: ['shipping', 'states', 'list', cityCountryId, 'city'],
    enabled: cityCountryId !== null,
    queryFn: async () => {
      const { data } = await api.get<ShippingState[]>(`/shipping/countries/${cityCountryId}/states`);
      return data;
    }
  });

  const cityStates = cityStatesQuery.data ?? [];
  const sortedCityStates = useMemo(() => sortByEnabledThenName(cityStates), [cityStates]);
  const enabledCityStates = useMemo(
    () => sortedCityStates.filter((state) => state.enabled),
    [sortedCityStates]
  );
  const cityStateOptions = useMemo(
    () => (enabledCityStates.length ? enabledCityStates : sortedCityStates),
    [enabledCityStates, sortedCityStates]
  );
  useEffect(() => {
    if (!cityStateOptions.length) {
      if (cityStateId !== null) {
        setCityStateId(null);
      }
      return;
    }
    if (!cityStateOptions.some((state) => state.id === cityStateId)) {
      setCityStateId(cityStateOptions[0].id);
    }
  }, [cityStateOptions, cityStateId]);

  useEffect(() => {
    setCityPage(0);
  }, [cityStateId, cityCountryId]);

  useEffect(() => {
    if (cityStateId === null) {
      setShowCityForm(false);
    }
  }, [cityStateId]);

  const citiesQuery = useQuery<ShippingCity[]>({
    queryKey: ['shipping', 'cities', 'list', cityStateId],
    enabled: cityStateId !== null,
    queryFn: async () => {
      const { data } = await api.get<ShippingCity[]>(`/shipping/states/${cityStateId}/cities`);
      return data;
    }
  });

  const cities = citiesQuery.data ?? [];
  const sortedCities = useMemo(() => sortByEnabledThenName(cities), [cities]);

  const filteredCities = useMemo(() => {
    if (!citySearch) {
      return sortedCities;
    }
    const term = citySearch.toLowerCase();
    return sortedCities.filter((city) => city.name.toLowerCase().includes(term));
  }, [sortedCities, citySearch]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(filteredCities.length / cityPageSize) - 1, 0);
    if (cityPage > maxPage) {
      setCityPage(maxPage);
    }
  }, [filteredCities, cityPage, cityPageSize]);

  const paginatedCities = useMemo(() => {
    const start = cityPage * cityPageSize;
    return filteredCities.slice(start, start + cityPageSize);
  }, [filteredCities, cityPage, cityPageSize]);

  const updateCountrySettingsMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CountrySettingsPayload }) => {
      const { data } = await api.put<ShippingCountry>(`/shipping/countries/${id}/settings`, payload);
      return data;
    },
    onMutate: ({ id }) => {
      setPendingCountryId(id);
    },
    onSuccess: (data) => {
      setCountryCostDrafts((prev) => ({
        ...prev,
        [data.id]: typeof data.costValue === 'number' ? data.costValue.toString() : ''
      }));
      queryClient.invalidateQueries({ queryKey: ['shipping', 'countries'] });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'states'] });
      notify({ type: 'success', message: 'Country settings updated.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update country settings.') });
    },
    onSettled: () => {
      setPendingCountryId(null);
    }
  });

  const updateStateSettingsMutation = useMutation({
    mutationFn: async ({
      id,
      payload
    }: {
      id: number;
      payload: StateSettingsPayload;
    }) => {
      const { data } = await api.put<ShippingState>(`/shipping/states/${id}/settings`, payload);
      return data;
    },
    onMutate: ({ id }) => {
      setPendingStateId(id);
    },
    onSuccess: (data) => {
      setStateCostDrafts((prev) => ({
        ...prev,
        [data.id]: typeof data.overrideCost === 'number' ? data.overrideCost.toString() : ''
      }));
      queryClient.invalidateQueries({ queryKey: ['shipping', 'states'] });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'cities'] });
      notify({ type: 'success', message: 'State settings updated.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update state settings.') });
    },
    onSettled: () => {
      setPendingStateId(null);
    }
  });

  const updateCitySettingsMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CitySettingsPayload }) => {
      const { data } = await api.put<ShippingCity>(`/shipping/cities/${id}/settings`, payload);
      return data;
    },
    onMutate: ({ id }) => {
      setPendingCityId(id);
    },
    onSuccess: (data) => {
      setCityCostDrafts((prev) => ({
        ...prev,
        [data.id]: typeof data.overrideCost === 'number' ? data.overrideCost.toString() : ''
      }));
      queryClient.invalidateQueries({ queryKey: ['shipping', 'cities'] });
      notify({ type: 'success', message: 'City settings updated.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update city settings.') });
    },
    onSettled: () => {
      setPendingCityId(null);
    }
  });

  const createCountryMutation = useMutation({
    mutationFn: async ({ name, code }: { name: string; code?: string }) => {
      const { data } = await api.post<ShippingCountry>('/shipping/countries', { name, code });
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Country added successfully.' });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'countries'] });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'states'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to add country.') });
    }
  });

  const createStateMutation = useMutation({
    mutationFn: async ({ countryId, name }: { countryId: number; name: string }) => {
      const { data } = await api.post<ShippingState>(`/shipping/countries/${countryId}/states`, { name });
      return data;
    },
    onSuccess: (_, variables) => {
      notify({ type: 'success', message: 'State added successfully.' });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'states', 'list', variables.countryId] });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'states'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to add state.') });
    }
  });

  const createCityMutation = useMutation({
    mutationFn: async ({ stateId, name }: { stateId: number; name: string }) => {
      const { data } = await api.post<ShippingCity>(`/shipping/states/${stateId}/cities`, { name });
      return data;
    },
    onSuccess: (_, variables) => {
      notify({ type: 'success', message: 'City added successfully.' });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'cities', 'list', variables.stateId] });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'cities'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to add city.') });
    }
  });

  const getCountryDraft = (country: ShippingCountry) =>
    countryCostDrafts[country.id] ?? (typeof country.costValue === 'number' ? country.costValue.toString() : '');

  const getStateDraft = (state: ShippingState) =>
    stateCostDrafts[state.id] ?? (typeof state.overrideCost === 'number' ? state.overrideCost.toString() : '');

  const getCityDraft = (city: ShippingCity) =>
    cityCostDrafts[city.id] ?? (typeof city.overrideCost === 'number' ? city.overrideCost.toString() : '');

  const handleCountryToggle = (country: ShippingCountry) => {
    if (!canManageLocations) {
      return;
    }
    updateCountrySettingsMutation.mutate({ id: country.id, payload: { enabled: !country.enabled } });
  };

  const handleStateToggle = (state: ShippingState) => {
    if (!canManageLocations) {
      return;
    }
    updateStateSettingsMutation.mutate({ id: state.id, payload: { enabled: !state.enabled } });
  };

  const handleCityToggle = (city: ShippingCity) => {
    if (!canManageLocations) {
      return;
    }
    updateCitySettingsMutation.mutate({ id: city.id, payload: { enabled: !city.enabled } });
  };

  const handleCountryCostSave = (country: ShippingCountry) => {
    if (!canManageLocations) {
      return;
    }
    const rawValue = (countryCostDrafts[country.id] ?? '').trim();
    if (!rawValue) {
      updateCountrySettingsMutation.mutate({ id: country.id, payload: { clearCost: true } });
      return;
    }
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      notify({ type: 'error', message: 'Enter a valid number for the country rate.' });
      return;
    }
    updateCountrySettingsMutation.mutate({ id: country.id, payload: { costValue: numericValue } });
  };

  const handleStateCostSave = (state: ShippingState) => {
    if (!canManageLocations) {
      return;
    }
    const rawValue = (stateCostDrafts[state.id] ?? '').trim();
    if (!rawValue) {
      updateStateSettingsMutation.mutate({ id: state.id, payload: { clearOverride: true } });
      return;
    }
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      notify({ type: 'error', message: 'Enter a valid number for the state override.' });
      return;
    }
    updateStateSettingsMutation.mutate({ id: state.id, payload: { overrideCost: numericValue } });
  };

  const handleCityCostSave = (city: ShippingCity) => {
    if (!canManageLocations) {
      return;
    }
    const rawValue = (cityCostDrafts[city.id] ?? '').trim();
    if (!rawValue) {
      updateCitySettingsMutation.mutate({ id: city.id, payload: { clearOverride: true } });
      return;
    }
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      notify({ type: 'error', message: 'Enter a valid number for the city override.' });
      return;
    }
    updateCitySettingsMutation.mutate({ id: city.id, payload: { overrideCost: numericValue } });
  };

  const handleCountryFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCountryFormError(null);

    if (!canManageLocations) {
      return;
    }

    const name = countryForm.name.trim();
    const code = countryForm.code.trim();
    const rate = countryForm.rate.trim();

    if (!name) {
      setCountryFormError('Country name is required.');
      return;
    }

    try {
      const created = await createCountryMutation.mutateAsync({ name, code: code || undefined });
      if (rate) {
        const numericValue = Number(rate);
        if (!Number.isNaN(numericValue)) {
          await updateCountrySettingsMutation.mutateAsync({ id: created.id, payload: { costValue: numericValue } });
        }
      }
      setCountryForm(defaultCountryForm);
      setShowCountryForm(false);
    } catch (error) {
      // error handled by mutation toasts
      if (error instanceof Error) {
        setCountryFormError(error.message);
      }
    }
  };

  const handleStateFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStateFormError(null);

    if (!canManageLocations || stateCountryId === null) {
      return;
    }

    const name = stateForm.name.trim();
    if (!name) {
      setStateFormError('State name is required.');
      return;
    }

    try {
      await createStateMutation.mutateAsync({ countryId: stateCountryId, name });
      setStateForm(defaultStateForm);
      setShowStateForm(false);
    } catch (error) {
      if (error instanceof Error) {
        setStateFormError(error.message);
      }
    }
  };

  const handleCityFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCityFormError(null);

    if (!canManageLocations || cityStateId === null) {
      return;
    }

    const name = cityForm.name.trim();
    if (!name) {
      setCityFormError('City name is required.');
      return;
    }

    try {
      await createCityMutation.mutateAsync({ stateId: cityStateId, name });
      setCityForm(defaultCityForm);
      setShowCityForm(false);
    } catch (error) {
      if (error instanceof Error) {
        setCityFormError(error.message);
      }
    }
  };

  const renderCountryTab = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="flex w-full max-w-xs flex-col gap-1 text-sm font-medium text-slate-600">
          Search countries
          <input
            type="search"
            value={countrySearchDraft}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setCountrySearchDraft(event.target.value)}
            placeholder="Start typing to filter"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Search countries"
          />
        </label>
        {canManageLocations && (
          <button
            type="button"
            onClick={() => {
              setShowCountryForm((prev) => !prev);
              setCountryFormError(null);
            }}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-600 lg:self-auto"
          >
            {showCountryForm ? 'Cancel' : 'Add country'}
          </button>
        )}
      </div>

      {showCountryForm && canManageLocations && (
        <form
          onSubmit={handleCountryFormSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New country</h2>
            <p className="text-sm text-slate-500">Provide the name, code, and optional default shipping rate.</p>
          </div>
          {countryFormError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {countryFormError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Name
              <input
                type="text"
                value={countryForm.name}
                onChange={(event) => setCountryForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="India"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              ISO code
              <input
                type="text"
                value={countryForm.code}
                onChange={(event) =>
                  setCountryForm((prev) => ({ ...prev, code: event.target.value.toUpperCase().slice(0, 3) }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="IN"
                maxLength={3}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Default rate
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={countryForm.rate}
                onChange={(event) => setCountryForm((prev) => ({ ...prev, rate: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="100"
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCountryForm(false);
                setCountryForm(defaultCountryForm);
                setCountryFormError(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCountryMutation.isPending || updateCountrySettingsMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save country
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Country</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {countriesQuery.isLoading ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={4}>
                    Loading countries…
                  </td>
                </tr>
              ) : !filteredCountries.length ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={4}>
                    No countries found.
                  </td>
                </tr>
              ) : (
                paginatedCountries.map((country) => {
                  const draftValue = getCountryDraft(country);
                  const isDisabled = pendingCountryId === country.id;
                  return (
                    <tr key={country.id}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{country.name}</div>
                        <div className="text-xs text-slate-500">Created {new Date(country.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{country.code ?? '—'}</td>
                      <td className="px-6 py-4">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-400 text-primary focus:ring-primary/40"
                            checked={country.enabled}
                            onChange={() => handleCountryToggle(country)}
                            disabled={!canManageLocations || isDisabled}
                          />
                          {country.enabled ? 'Enabled' : 'Disabled'}
                        </label>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={draftValue}
                            onChange={(event) =>
                              setCountryCostDrafts((prev) => ({ ...prev, [country.id]: event.target.value }))
                            }
                            className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
                            placeholder="0.00"
                            disabled={!canManageLocations || isDisabled}
                          />
                          <button
                            type="button"
                            onClick={() => handleCountryCostSave(country)}
                            disabled={!canManageLocations || isDisabled}
                            className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                          >
                            Save
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Effective rate: {renderCost(country.effectiveCost, baseCurrency)}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={countryPage}
          pageSize={countryPageSize}
          totalElements={filteredCountries.length}
          onPageChange={setCountryPage}
          onPageSizeChange={(size) => {
            setCountryPageSize(size);
            setCountryPage(0);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          isLoading={countriesQuery.isLoading}
        />
      </div>
    </div>
  );

  const renderStateTab = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
          <label className="flex min-w-[220px] flex-col gap-1 text-sm font-medium text-slate-600">
            Country
            <select
              value={stateCountryId ?? ''}
              onChange={(event) => {
                const rawValue = event.target.value;
                const value = Number(rawValue);
                setStateCountryId(rawValue === '' || Number.isNaN(value) ? null : value);
                setStatePage(0);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!stateCountryOptions.length}
            >
              {!stateCountryOptions.length ? (
                <option value="">Enable a country first</option>
              ) : (
                stateCountryOptions.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex w-full max-w-xs flex-col gap-1 text-sm font-medium text-slate-600">
            Search
            <input
              type="search"
              value={stateSearchDraft}
              onChange={(event) => setStateSearchDraft(event.target.value)}
              placeholder="Search states"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search states"
            />
          </label>
        </div>
        {canManageLocations && (
          <button
            type="button"
            onClick={() => {
              setShowStateForm((prev) => !prev);
              setStateFormError(null);
            }}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
            disabled={stateCountryId === null}
          >
            {showStateForm ? 'Cancel' : 'Add state'}
          </button>
        )}
      </div>

      {showStateForm && canManageLocations && stateCountryId !== null && (
        <form
          onSubmit={handleStateFormSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New state</h2>
            <p className="text-sm text-slate-500">
              The state will inherit the selected country&apos;s shipping rate until you override it.
            </p>
          </div>
          {stateFormError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {stateFormError}
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name
            <input
              type="text"
              value={stateForm.name}
              onChange={(event) => setStateForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Uttar Pradesh"
              required
            />
          </label>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowStateForm(false);
                setStateForm(defaultStateForm);
                setStateFormError(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStateMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save state
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">State</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Override rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {statesQuery.isLoading ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={3}>
                    Loading states…
                  </td>
                </tr>
              ) : stateCountryId === null ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={3}>
                    {sortedCountries.length
                      ? 'Select a country to view its states.'
                      : 'Add a country to manage states.'}
                  </td>
                </tr>
              ) : !filteredStates.length ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={3}>
                    No states found.
                  </td>
                </tr>
              ) : (
                paginatedStates.map((state) => {
                  const draftValue = getStateDraft(state);
                  const isDisabled = pendingStateId === state.id;
                  return (
                    <tr key={state.id}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{state.name}</div>
                        <div className="text-xs text-slate-500">
                          Inherits {renderCost(state.inheritedCost, baseCurrency)} from country
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-400 text-primary focus:ring-primary/40"
                            checked={state.enabled}
                            onChange={() => handleStateToggle(state)}
                            disabled={!canManageLocations || isDisabled}
                          />
                          {state.enabled ? 'Enabled' : 'Disabled'}
                        </label>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={draftValue}
                            onChange={(event) =>
                              setStateCostDrafts((prev) => ({ ...prev, [state.id]: event.target.value }))
                            }
                            className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
                            placeholder={state.inheritedCost ? state.inheritedCost.toString() : '0.00'}
                            disabled={!canManageLocations || isDisabled}
                          />
                          <button
                            type="button"
                            onClick={() => handleStateCostSave(state)}
                            disabled={!canManageLocations || isDisabled}
                            className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                          >
                            Save
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Effective rate: {renderCost(state.effectiveCost, baseCurrency)}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={statePage}
          pageSize={statePageSize}
          totalElements={filteredStates.length}
          onPageChange={setStatePage}
          onPageSizeChange={(size) => {
            setStatePageSize(size);
            setStatePage(0);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          isLoading={statesQuery.isLoading}
        />
      </div>
    </div>
  );

  const renderCityTab = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
          <label className="flex min-w-[220px] flex-col gap-1 text-sm font-medium text-slate-600">
            Country
            <select
              value={cityCountryId ?? ''}
              onChange={(event) => {
                const rawValue = event.target.value;
                const value = Number(rawValue);
                const nextCountryId = rawValue === '' || Number.isNaN(value) ? null : value;
                setCityCountryId(nextCountryId);
                setCityStateId(null);
                setCityPage(0);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!cityCountryOptions.length}
            >
              {!cityCountryOptions.length ? (
                <option value="">Enable a country first</option>
              ) : (
                cityCountryOptions.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex min-w-[220px] flex-col gap-1 text-sm font-medium text-slate-600">
            State
            <select
              value={cityStateId ?? ''}
              onChange={(event) => {
                const rawValue = event.target.value;
                const value = Number(rawValue);
                setCityStateId(rawValue === '' || Number.isNaN(value) ? null : value);
                setCityPage(0);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!cityStateOptions.length}
            >
              {!cityStateOptions.length ? (
                <option value="">Enable a state first</option>
              ) : (
                cityStateOptions.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex w-full max-w-xs flex-col gap-1 text-sm font-medium text-slate-600">
            Search
            <input
              type="search"
              value={citySearchDraft}
              onChange={(event) => setCitySearchDraft(event.target.value)}
              placeholder="Search cities"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search cities"
            />
          </label>
        </div>
        {canManageLocations && (
          <button
            type="button"
            onClick={() => {
              setShowCityForm((prev) => !prev);
              setCityFormError(null);
            }}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
            disabled={cityStateId === null}
          >
            {showCityForm ? 'Cancel' : 'Add city'}
          </button>
        )}
      </div>

      {showCityForm && canManageLocations && cityStateId !== null && (
        <form
          onSubmit={handleCityFormSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New city</h2>
            <p className="text-sm text-slate-500">
              Cities inherit their parent state rate until you provide a custom amount.
            </p>
          </div>
          {cityFormError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {cityFormError}
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name
            <input
              type="text"
              value={cityForm.name}
              onChange={(event) => setCityForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Lucknow"
              required
            />
          </label>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCityForm(false);
                setCityForm(defaultCityForm);
                setCityFormError(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCityMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save city
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">City</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Override rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {citiesQuery.isLoading ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={3}>
                    Loading cities…
                  </td>
                </tr>
              ) : cityCountryId === null ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={3}>
                    {sortedCountries.length
                      ? 'Select a country to manage its cities.'
                      : 'Add a country to manage cities.'}
                  </td>
                </tr>
              ) : cityStateId === null ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={3}>
                    {sortedCityStates.length
                      ? 'Select a state to view its cities.'
                      : 'Add a state to manage cities.'}
                  </td>
                </tr>
              ) : !filteredCities.length ? (
                <tr>
                  <td className="px-6 py-6 text-center text-slate-500" colSpan={3}>
                    No cities found.
                  </td>
                </tr>
              ) : (
                paginatedCities.map((city) => {
                  const draftValue = getCityDraft(city);
                  const isDisabled = pendingCityId === city.id;
                  return (
                    <tr key={city.id}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{city.name}</div>
                        <div className="text-xs text-slate-500">
                          Inherits {renderCost(city.inheritedCost, baseCurrency)} from state
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-400 text-primary focus:ring-primary/40"
                            checked={city.enabled}
                            onChange={() => handleCityToggle(city)}
                            disabled={!canManageLocations || isDisabled}
                          />
                          {city.enabled ? 'Enabled' : 'Disabled'}
                        </label>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={draftValue}
                            onChange={(event) =>
                              setCityCostDrafts((prev) => ({ ...prev, [city.id]: event.target.value }))
                            }
                            className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
                            placeholder={city.inheritedCost ? city.inheritedCost.toString() : '0.00'}
                            disabled={!canManageLocations || isDisabled}
                          />
                          <button
                            type="button"
                            onClick={() => handleCityCostSave(city)}
                            disabled={!canManageLocations || isDisabled}
                            className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                          >
                            Save
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Effective rate: {renderCost(city.effectiveCost, baseCurrency)}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={cityPage}
          pageSize={cityPageSize}
          totalElements={filteredCities.length}
          onPageChange={setCityPage}
          onPageSizeChange={(size) => {
            setCityPageSize(size);
            setCityPage(0);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          isLoading={citiesQuery.isLoading}
        />
      </div>
    </div>
  );

  return (
    <PageSection
      title="Area-wide shipping"
      description="Toggle available destinations and fine-tune delivery rates by country, state, and city."
      padded={false}
      bodyClassName="lg:flex"
    >
      <div className="grid w-full border-t border-slate-200 lg:grid-cols-[240px,1fr] lg:border-t-0 lg:divide-x lg:divide-slate-200">
        <nav className="flex shrink-0 flex-row gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-600 lg:h-full lg:flex-col lg:border-b-0">
          {[
            { key: 'countries', label: 'Countries' },
            { key: 'states', label: 'States' },
            { key: 'cities', label: 'Cities' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`rounded-lg px-3 py-2 text-left transition ${
                activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 px-6 py-6">
          {activeTab === 'countries' && renderCountryTab()}
          {activeTab === 'states' && renderStateTab()}
          {activeTab === 'cities' && renderCityTab()}
        </div>
      </div>
    </PageSection>
  );
};

const CarrierShippingPlaceholder = () => (
  <PageSection
    title="Carrier-wide shipping"
    description="Configure carrier-based pricing, service levels, and transit promises."
  >
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-500">
      Carrier integrations are coming soon. Use this space to connect logistics partners, negotiate rates, and
      publish carrier-specific delivery options.
    </div>
  </PageSection>
);

type ShippingSection = 'area' | 'carrier';

const ShippingPage = () => {
  const [activeSection, setActiveSection] = useState<ShippingSection>('area');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping"
        description="Manage location-based delivery rules today and prepare for carrier-based fulfillment tomorrow."
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <nav className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          {[
            { key: 'area' as ShippingSection, label: 'Area-wide shipping' },
            { key: 'carrier' as ShippingSection, label: 'Carrier-wide shipping' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeSection === tab.key
                  ? 'bg-primary text-white shadow'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="space-y-6">
        <div className={activeSection === 'area' ? 'block' : 'hidden'} aria-hidden={activeSection !== 'area'}>
          <AreaShippingManager />
        </div>
        <div className={activeSection === 'carrier' ? 'block' : 'hidden'} aria-hidden={activeSection !== 'carrier'}>
          <CarrierShippingPlaceholder />
        </div>
      </div>
    </div>
  );
};

export default ShippingPage;

