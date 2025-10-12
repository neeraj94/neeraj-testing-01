import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { TaxRate, TaxRatePage, TaxRateType } from '../types/tax-rate';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { extractErrorMessage } from '../utils/errors';
import { formatCurrency } from '../utils/currency';
import { selectBaseCurrency } from '../features/settings/selectors';

interface TaxRateFormState {
  name: string;
  rateType: TaxRateType;
  rateValue: string;
  description: string;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const defaultFormState: TaxRateFormState = {
  name: '',
  rateType: 'PERCENTAGE',
  rateValue: '',
  description: ''
};

const percentageFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const TaxRatesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const baseCurrency = useAppSelector(selectBaseCurrency);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<TaxRateFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'metadata'>('general');

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['TAX_RATE_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['TAX_RATE_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['TAX_RATE_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const taxRatesQuery = useQuery<TaxRatePage>({
    queryKey: ['tax-rates', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<TaxRatePage>('/tax-rates', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const taxRates = taxRatesQuery.data?.content ?? [];
  const totalElements = taxRatesQuery.data?.totalElements ?? 0;

  interface TaxRatePayload {
    name: string;
    rateType: TaxRateType;
    rateValue: number;
    description: string | null;
  }

  const createMutation = useMutation({
    mutationFn: async (payload: TaxRatePayload) => {
      const { data } = await api.post<TaxRate>('/tax-rates', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Tax rate created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create tax rate.') });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: TaxRatePayload }) => {
      const { data } = await api.put<TaxRate>(`/tax-rates/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Tax rate updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update tax rate.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tax-rates/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Tax rate deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete tax rate.') });
    }
  });

  const openCreateForm = () => {
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setPanelMode('create');
    setActiveTab('general');
  };

  const openEditForm = (taxRate: TaxRate) => {
    setForm({
      name: taxRate.name,
      rateType: taxRate.rateType,
      rateValue: `${taxRate.rateValue ?? ''}`,
      description: taxRate.description ?? ''
    });
    setFormError(null);
    setEditingId(taxRate.id);
    setPanelMode('edit');
    setActiveTab('general');
  };

  const closeForm = () => {
    setPanelMode('list');
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setActiveTab('general');
  };

  const handleSubmit = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setFormError('Tax name is required.');
      setActiveTab('general');
      return;
    }

    const normalizedValue = form.rateValue.trim();
    if (!normalizedValue) {
      setFormError('Enter a tax amount or percentage.');
      setActiveTab('general');
      return;
    }

    const parsedValue = Number.parseFloat(normalizedValue);
    if (!Number.isFinite(parsedValue)) {
      setFormError('Enter a numeric tax value.');
      setActiveTab('general');
      return;
    }

    if (parsedValue < 0) {
      setFormError('Tax values cannot be negative.');
      setActiveTab('general');
      return;
    }

    if (form.rateType === 'PERCENTAGE' && parsedValue > 100) {
      setFormError('Percentage-based taxes cannot exceed 100%.');
      setActiveTab('general');
      return;
    }

    const scaledValue = Number.parseFloat(parsedValue.toFixed(4));

    const payload: TaxRatePayload = {
      name: trimmedName,
      rateType: form.rateType,
      rateValue: scaledValue,
      description: form.description.trim() ? form.description.trim() : null
    };

    try {
      if (panelMode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (panelMode === 'edit' && editingId != null) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      }
      closeForm();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Failed to save tax rate.'));
    }
  };

  const handleDelete = async (taxRate: TaxRate) => {
    if (!canDelete) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete tax rate?',
      description: `Delete tax rate "${taxRate.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(taxRate.id);
  };

  const formatDate = (value: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(value));
    } catch (error) {
      return value;
    }
  };

  const formatRate = (taxRate: TaxRate) => {
    if (taxRate.rateType === 'PERCENTAGE') {
      return `${percentageFormatter.format(taxRate.rateValue ?? 0)}%`;
    }
    return formatCurrency(taxRate.rateValue ?? 0, baseCurrency);
  };

  const renderDirectory = () => (
    <PageSection>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">All tax rates</h2>
          <p className="text-sm text-slate-500">Configure the taxes applied to invoices and orders.</p>
        </div>
        <div className="flex w-full gap-3 sm:max-w-xs">
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search tax rates"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Rate
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
            {taxRates.length > 0 ? (
              taxRates.map((taxRate) => (
                <tr key={taxRate.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{taxRate.name}</div>
                    {taxRate.description ? (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{taxRate.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {taxRate.rateType === 'PERCENTAGE' ? 'Percentage' : 'Flat amount'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatRate(taxRate)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(taxRate.updatedAt)}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditForm(taxRate)}
                            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                            aria-label={`Edit ${taxRate.name}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(taxRate)}
                            className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                            aria-label={`Delete ${taxRate.name}`}
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
                <td colSpan={canUpdate || canDelete ? 5 : 4} className="px-4 py-6 text-center text-sm text-slate-500">
                  No tax rates found.
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
        isLoading={taxRatesQuery.isLoading}
      />
    </PageSection>
  );

  const renderForm = () => {
    const isCreate = panelMode === 'create';
    const isSaving = createMutation.isPending || updateMutation.isPending;
    const headerTitle = isCreate ? 'Create tax rate' : form.name || 'Edit tax rate';

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleSubmit();
    };

    return (
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary/40 hover:text-primary"
              aria-label="Back to tax rate directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{isCreate ? 'New tax rate' : 'Edit tax rate'}</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{headerTitle}</h2>
              {editingId && !isCreate ? (
                <p className="text-sm text-slate-500">Tax rate ID #{editingId}</p>
              ) : null}
            </div>
          </div>
        </header>
        <div className="grid border-b border-slate-200 lg:grid-cols-[240px,1fr]">
          <nav className="flex shrink-0 flex-row gap-2 border-b border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 lg:flex-col lg:border-b-0 lg:border-r">
            {[
              { key: 'general', label: 'General' },
              { key: 'metadata', label: 'Metadata' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'general' | 'metadata')}
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tax-rate-name">
                    Tax name
                  </label>
                  <input
                    id="tax-rate-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="VAT"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-slate-700">Rate type</span>
                    <p className="text-xs text-slate-500">Choose how this tax should be applied during checkout.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: 'PERCENTAGE' as TaxRateType,
                          title: 'Percentage',
                          description: 'Applied as a percent of the taxable subtotal.'
                        },
                        {
                          value: 'FLAT' as TaxRateType,
                          title: 'Flat amount',
                          description: 'Applied as a fixed amount on the order.'
                        }
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, rateType: option.value }))}
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          form.rateType === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                        aria-pressed={form.rateType === option.value}
                      >
                        <div className="font-semibold">{option.title}</div>
                        <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tax-rate-value">
                    {form.rateType === 'PERCENTAGE' ? 'Percentage' : 'Flat amount'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="tax-rate-value"
                      type="number"
                      value={form.rateValue}
                      min={0}
                      step={0.01}
                      max={form.rateType === 'PERCENTAGE' ? 100 : undefined}
                      onChange={(event) => setForm((prev) => ({ ...prev, rateValue: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder={form.rateType === 'PERCENTAGE' ? '18' : '15.00'}
                    />
                    <span className="text-sm font-medium text-slate-600">
                      {form.rateType === 'PERCENTAGE' ? '%' : baseCurrency?.toUpperCase() ?? 'USD'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tax-rate-description">
                    Description <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="tax-rate-description"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={5}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Describe where this tax applies."
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Keep internal notes here for finance teams. Customers will not see this description.
                </p>
              </div>
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Ensure tax changes align with your regional compliance policies.</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : isCreate ? 'Create tax rate' : 'Save changes'}
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
        title="Tax rates"
        description="Manage tax rules that finance teams apply to orders and invoices across regions."
        actions={
          isDirectoryView && canCreate
            ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                >
                  New tax rate
                </button>
              )
            : undefined
        }
      />

      {isDirectoryView ? renderDirectory() : renderForm()}
    </div>
  );
};

export default TaxRatesPage;
