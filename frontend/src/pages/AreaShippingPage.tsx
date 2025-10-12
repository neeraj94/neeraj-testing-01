import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import { useToast } from '../components/ToastProvider';
import api from '../services/http';
import type { ShippingCity, ShippingCountry, ShippingState } from '../types/shipping';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { extractErrorMessage } from '../utils/errors';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency } from '../utils/currency';

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

const renderCost = (value: number | null | undefined, currency: string | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? formatCurrency(value, currency) : '—';

const AreaShippingPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const baseCurrency = useAppSelector(selectBaseCurrency);

  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
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

  const countriesQuery = useQuery<ShippingCountry[]>({
    queryKey: ['shipping', 'countries'],
    queryFn: async () => {
      const { data } = await api.get<ShippingCountry[]>('/shipping/countries');
      return data;
    }
  });

  const countries = countriesQuery.data ?? [];

  useEffect(() => {
    if (!countries.length) {
      if (selectedCountryId !== null) {
        setSelectedCountryId(null);
      }
      return;
    }
    if (!selectedCountryId || !countries.some((country) => country.id === selectedCountryId)) {
      setSelectedCountryId(countries[0].id);
    }
  }, [countries, selectedCountryId]);

  const selectedCountry = countries.find((country) => country.id === selectedCountryId) ?? null;

  const statesQuery = useQuery<ShippingState[]>({
    queryKey: ['shipping', 'states', selectedCountryId],
    enabled: selectedCountryId !== null,
    queryFn: async () => {
      const { data } = await api.get<ShippingState[]>(`/shipping/countries/${selectedCountryId}/states`);
      return data;
    }
  });

  const states = statesQuery.data ?? [];

  useEffect(() => {
    if (!states.length) {
      if (selectedStateId !== null) {
        setSelectedStateId(null);
      }
      return;
    }
    if (!selectedStateId || !states.some((state) => state.id === selectedStateId)) {
      setSelectedStateId(states[0].id);
    }
  }, [states, selectedStateId]);

  const selectedState = states.find((state) => state.id === selectedStateId) ?? null;

  const citiesQuery = useQuery<ShippingCity[]>({
    queryKey: ['shipping', 'cities', selectedStateId],
    enabled: selectedStateId !== null,
    queryFn: async () => {
      const { data } = await api.get<ShippingCity[]>(`/shipping/states/${selectedStateId}/cities`);
      return data;
    }
  });

  const cities = citiesQuery.data ?? [];

  const getCountryDraft = (country: ShippingCountry) =>
    countryCostDrafts[country.id] ?? (typeof country.costValue === 'number' ? country.costValue.toString() : '');

  const getStateDraft = (state: ShippingState) =>
    stateCostDrafts[state.id] ?? (typeof state.overrideCost === 'number' ? state.overrideCost.toString() : '');

  const getCityDraft = (city: ShippingCity) =>
    cityCostDrafts[city.id] ?? (typeof city.overrideCost === 'number' ? city.overrideCost.toString() : '');

  const updateCountrySettings = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['shipping', 'states', data.id] });
      notify({ type: 'success', message: 'Country settings updated.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update country settings.') });
    },
    onSettled: () => {
      setPendingCountryId(null);
    }
  });

  const updateStateSettings = useMutation({
    mutationFn: async ({
      id,
      countryId,
      payload
    }: {
      id: number;
      countryId: number;
      payload: StateSettingsPayload;
    }) => {
      const { data } = await api.put<ShippingState>(`/shipping/states/${id}/settings`, payload);
      return data;
    },
    onMutate: ({ id }) => {
      setPendingStateId(id);
    },
    onSuccess: (data, variables) => {
      setStateCostDrafts((prev) => ({
        ...prev,
        [data.id]: typeof data.overrideCost === 'number' ? data.overrideCost.toString() : ''
      }));
      queryClient.invalidateQueries({ queryKey: ['shipping', 'states', variables.countryId] });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'cities', variables.id] });
      notify({ type: 'success', message: 'State settings updated.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update state settings.') });
    },
    onSettled: () => {
      setPendingStateId(null);
    }
  });

  const updateCitySettings = useMutation({
    mutationFn: async ({ id, stateId, payload }: { id: number; stateId: number; payload: CitySettingsPayload }) => {
      const { data } = await api.put<ShippingCity>(`/shipping/cities/${id}/settings`, payload);
      return data;
    },
    onMutate: ({ id }) => {
      setPendingCityId(id);
    },
    onSuccess: (data, variables) => {
      setCityCostDrafts((prev) => ({
        ...prev,
        [data.id]: typeof data.overrideCost === 'number' ? data.overrideCost.toString() : ''
      }));
      queryClient.invalidateQueries({ queryKey: ['shipping', 'cities', variables.stateId] });
      notify({ type: 'success', message: 'City settings updated.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update city settings.') });
    },
    onSettled: () => {
      setPendingCityId(null);
    }
  });

  const handleCountryToggle = (country: ShippingCountry) => {
    if (!canManageLocations) {
      return;
    }
    updateCountrySettings.mutate({ id: country.id, payload: { enabled: !country.enabled } });
  };

  const handleStateToggle = (state: ShippingState) => {
    if (!canManageLocations) {
      return;
    }
    updateStateSettings.mutate({ id: state.id, countryId: state.countryId, payload: { enabled: !state.enabled } });
  };

  const handleCityToggle = (city: ShippingCity) => {
    if (!canManageLocations) {
      return;
    }
    updateCitySettings.mutate({ id: city.id, stateId: city.stateId, payload: { enabled: !city.enabled } });
  };

  const handleCountryCostSave = (country: ShippingCountry) => {
    if (!canManageLocations) {
      return;
    }
    const rawValue = (countryCostDrafts[country.id] ?? '').trim();
    if (!rawValue) {
      updateCountrySettings.mutate({ id: country.id, payload: { clearCost: true } });
      return;
    }
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      notify({ type: 'error', message: 'Enter a valid number for the country rate.' });
      return;
    }
    updateCountrySettings.mutate({ id: country.id, payload: { costValue: numericValue } });
  };

  const handleStateCostSave = (state: ShippingState) => {
    if (!canManageLocations) {
      return;
    }
    const rawValue = (stateCostDrafts[state.id] ?? '').trim();
    if (!rawValue) {
      updateStateSettings.mutate({ id: state.id, countryId: state.countryId, payload: { clearOverride: true } });
      return;
    }
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      notify({ type: 'error', message: 'Enter a valid number for the state override.' });
      return;
    }
    updateStateSettings.mutate({ id: state.id, countryId: state.countryId, payload: { overrideCost: numericValue } });
  };

  const handleCityCostSave = (city: ShippingCity) => {
    if (!canManageLocations) {
      return;
    }
    const rawValue = (cityCostDrafts[city.id] ?? '').trim();
    if (!rawValue) {
      updateCitySettings.mutate({ id: city.id, stateId: city.stateId, payload: { clearOverride: true } });
      return;
    }
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      notify({ type: 'error', message: 'Enter a valid number for the city override.' });
      return;
    }
    updateCitySettings.mutate({ id: city.id, stateId: city.stateId, payload: { overrideCost: numericValue } });
  };

  return (
    <>
      <PageHeader
        title="Area-wise Shipping"
        description="Quickly enable countries, states, and cities while overriding delivery costs where required."
      />
      <PageSection>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Countries</h2>
              <p className="mt-1 text-xs text-slate-500">
                Enable destinations and set the default shipping rate for each country.
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              {countriesQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-500">Loading countries…</div>
              ) : !countries.length ? (
                <div className="px-4 py-6 text-sm text-slate-500">No countries available.</div>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <tbody className="divide-y divide-slate-100">
                      {countries.map((country) => {
                        const isSelected = country.id === selectedCountryId;
                        const draftValue = getCountryDraft(country);
                        const isDisabled = pendingCountryId === country.id;
                        return (
                          <tr
                            key={country.id}
                            onClick={() => setSelectedCountryId(country.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedCountryId(country.id);
                              }
                            }}
                            tabIndex={0}
                            aria-selected={isSelected}
                            className={`cursor-pointer transition hover:bg-blue-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                              isSelected ? 'bg-blue-50/60' : ''
                            }`}
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="text-sm font-semibold text-slate-800">{country.name}</div>
                              <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                                {country.code ?? '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-sm text-slate-700">
                              <div className="font-semibold">{renderCost(country.effectiveCost, baseCurrency)}</div>
                              <div className="mt-1 text-xs text-slate-500">Base rate</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col items-end gap-3">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCountryToggle(country);
                                  }}
                                  disabled={!canManageLocations || isDisabled}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                                    country.enabled
                                      ? 'border-emerald-200 bg-emerald-500/90'
                                      : 'border-slate-300 bg-slate-200'
                                  }`}
                                  aria-label={country.enabled ? `Disable ${country.name}` : `Enable ${country.name}`}
                                >
                                  <span
                                    className={`absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                      country.enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={draftValue}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) =>
                                      setCountryCostDrafts((prev) => ({ ...prev, [country.id]: event.target.value }))
                                    }
                                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    placeholder="0.00"
                                    disabled={!canManageLocations || isDisabled}
                                  />
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleCountryCostSave(country);
                                    }}
                                    disabled={!canManageLocations || isDisabled}
                                    className="rounded-md border border-primary px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">States</h2>
              <p className="mt-1 text-xs text-slate-500">
                Enable specific states and override the inherited country rate when needed.
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              {!selectedCountry ? (
                <div className="px-4 py-6 text-sm text-slate-500">Select a country to manage its states.</div>
              ) : statesQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-500">Loading states…</div>
              ) : !states.length ? (
                <div className="px-4 py-6 text-sm text-slate-500">No states available for this country.</div>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <tbody className="divide-y divide-slate-100">
                      {states.map((state) => {
                        const isSelected = state.id === selectedStateId;
                        const draftValue = getStateDraft(state);
                        const isDisabled = pendingStateId === state.id;
                        return (
                          <tr
                            key={state.id}
                            onClick={() => setSelectedStateId(state.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedStateId(state.id);
                              }
                            }}
                            tabIndex={0}
                            aria-selected={isSelected}
                            className={`cursor-pointer transition hover:bg-blue-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                              isSelected ? 'bg-blue-50/60' : ''
                            }`}
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="text-sm font-semibold text-slate-800">{state.name}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                Inherited: {renderCost(state.inheritedCost ?? null, baseCurrency)}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-sm text-slate-700">
                              <div className="font-semibold">{renderCost(state.effectiveCost, baseCurrency)}</div>
                              <div className="mt-1 text-xs text-slate-500">Effective rate</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col items-end gap-3">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleStateToggle(state);
                                  }}
                                  disabled={!canManageLocations || isDisabled}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                                    state.enabled
                                      ? 'border-emerald-200 bg-emerald-500/90'
                                      : 'border-slate-300 bg-slate-200'
                                  }`}
                                  aria-label={state.enabled ? `Disable ${state.name}` : `Enable ${state.name}`}
                                >
                                  <span
                                    className={`absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                      state.enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={draftValue}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) =>
                                      setStateCostDrafts((prev) => ({ ...prev, [state.id]: event.target.value }))
                                    }
                                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    placeholder="0.00"
                                    disabled={!canManageLocations || isDisabled}
                                  />
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleStateCostSave(state);
                                    }}
                                    disabled={!canManageLocations || isDisabled}
                                    className="rounded-md border border-primary px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Cities</h2>
              <p className="mt-1 text-xs text-slate-500">
                Fine-tune delivery costs for enabled cities or inherit the selected state value.
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              {!selectedState ? (
                <div className="px-4 py-6 text-sm text-slate-500">Select a state to manage its cities.</div>
              ) : citiesQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-500">Loading cities…</div>
              ) : !cities.length ? (
                <div className="px-4 py-6 text-sm text-slate-500">No cities available for this state.</div>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <tbody className="divide-y divide-slate-100">
                      {cities.map((city) => {
                        const draftValue = getCityDraft(city);
                        const isDisabled = pendingCityId === city.id;
                        return (
                          <tr key={city.id} className="transition hover:bg-blue-50/40">
                            <td className="px-4 py-3 align-top">
                              <div className="text-sm font-semibold text-slate-800">{city.name}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                Inherited: {renderCost(city.inheritedCost ?? null, baseCurrency)}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-sm text-slate-700">
                              <div className="font-semibold">{renderCost(city.effectiveCost, baseCurrency)}</div>
                              <div className="mt-1 text-xs text-slate-500">Effective rate</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col items-end gap-3">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCityToggle(city);
                                  }}
                                  disabled={!canManageLocations || isDisabled}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                                    city.enabled
                                      ? 'border-emerald-200 bg-emerald-500/90'
                                      : 'border-slate-300 bg-slate-200'
                                  }`}
                                  aria-label={city.enabled ? `Disable ${city.name}` : `Enable ${city.name}`}
                                >
                                  <span
                                    className={`absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                      city.enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={draftValue}
                                    onChange={(event) =>
                                      setCityCostDrafts((prev) => ({ ...prev, [city.id]: event.target.value }))
                                    }
                                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    placeholder="0.00"
                                    disabled={!canManageLocations || isDisabled}
                                  />
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleCityCostSave(city);
                                    }}
                                    disabled={!canManageLocations || isDisabled}
                                    className="rounded-md border border-primary px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageSection>
    </>
  );
};

export default AreaShippingPage;
