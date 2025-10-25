import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/http';
import PageHeader from '../../components/PageHeader';
import PageSection from '../../components/PageSection';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { extractErrorMessage } from '../../utils/errors';
import { useAppSelector } from '../../app/hooks';
import { hasAnyPermission } from '../../utils/permissions';
import type { PermissionKey } from '../../types/auth';
import type { StatusCategory, StatusConfig, StatusConfigPayload } from '../../types/status-config';
import { STATUS_CATEGORY_LABELS } from '../../types/status-config';

interface StatusFormState {
  name: string;
  category: StatusCategory;
  colorCode: string;
  icon: string;
  description: string;
  isDefault: boolean;
  active: boolean;
}

type PanelMode = 'list' | 'create' | 'edit';

type CategoryFilter = StatusCategory | 'ALL';

const defaultFormState: StatusFormState = {
  name: '',
  category: 'ORDER',
  colorCode: '#06B6D4',
  icon: '',
  description: '',
  isDefault: false,
  active: true
};

const StatusConfigurationPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const canManage = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['CONFIG.STATUS.MANAGE']),
    [permissions]
  );
  const canView = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['CONFIG.STATUS.VIEW', 'CONFIG.STATUS.MANAGE']),
    [permissions]
  );

  const [panelMode, setPanelMode] = useState<PanelMode>('list');
  const [form, setForm] = useState<StatusFormState>({ ...defaultFormState });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const statusesQuery = useQuery<StatusConfig[]>({
    queryKey: ['status-config', { category: categoryFilter, search }],
    enabled: canView,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (categoryFilter !== 'ALL') {
        params.category = categoryFilter;
      }
      if (search) {
        params.search = search;
      }
      const { data } = await adminApi.get<StatusConfig[]>('/config/status', {
        params
      });
      return data;
    }
  });

  const statuses = statusesQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: async (payload: StatusConfigPayload) => {
      const { data } = await adminApi.post<StatusConfig>('/config/status', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Status created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['status-config'] });
      closeForm();
    },
    onError: (error: unknown) => {
      setFormError(extractErrorMessage(error, 'Unable to create status.'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: StatusConfigPayload }) => {
      const { data } = await adminApi.put<StatusConfig>(`/config/status/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Status updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['status-config'] });
      closeForm();
    },
    onError: (error: unknown) => {
      setFormError(extractErrorMessage(error, 'Unable to update status.'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/config/status/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Status deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['status-config'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to delete status.') });
    }
  });

  const markDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await adminApi.patch<StatusConfig>(`/config/status/${id}/default`);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: `“${data.name}” is now the default status.` });
      queryClient.invalidateQueries({ queryKey: ['status-config'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to update default status.') });
    }
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreateForm = () => {
    if (!canManage) {
      return;
    }
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setPanelMode('create');
  };

  const openEditForm = (status: StatusConfig) => {
    if (!canManage) {
      return;
    }
    setForm({
      name: status.name,
      category: status.category,
      colorCode: status.colorCode,
      icon: status.icon ?? '',
      description: status.description ?? '',
      isDefault: status.isDefault,
      active: status.active
    });
    setFormError(null);
    setEditingId(status.id);
    setPanelMode('edit');
  };

  const closeForm = () => {
    setPanelMode('list');
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
  };

  const handleDelete = async (status: StatusConfig) => {
    if (!canManage) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete status',
      description: `Are you sure you want to delete “${status.name}”?`
    });
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(status.id);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setFormError('Status name is required.');
      return;
    }
    if (!form.category) {
      setFormError('Select a status category.');
      return;
    }
    const normalizedColor = form.colorCode.trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(normalizedColor)) {
      setFormError('Color must be a valid 6-digit HEX code, e.g. #06B6D4.');
      return;
    }

    const payload: StatusConfigPayload = {
      name: trimmedName,
      category: form.category,
      colorCode: normalizedColor,
      icon: form.icon.trim() ? form.icon.trim() : null,
      description: form.description.trim() ? form.description.trim() : null,
      isDefault: form.isDefault,
      active: form.active
    };

    if (panelMode === 'create') {
      createMutation.mutate(payload);
    } else if (panelMode === 'edit' && editingId != null) {
      updateMutation.mutate({ id: editingId, payload });
    }
  };

  const categoryOptions = useMemo(() => Object.entries(STATUS_CATEGORY_LABELS) as [StatusCategory, string][], []);

  const renderList = () => (
    <PageSection padded={false} bodyClassName="flex flex-col">
      <DataTable
        title="Defined statuses"
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search statuses"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-48"
            >
              <option value="ALL">All categories</option>
              {categoryOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name & category</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Color</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Icon</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Default</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {statusesQuery.isLoading ? (
            <tr>
              <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-500">
                Loading statuses…
              </td>
            </tr>
          ) : statusesQuery.isError ? (
            <tr>
              <td colSpan={7} className="px-6 py-6 text-center text-sm text-rose-500">
                Unable to load statuses.
              </td>
            </tr>
          ) : statuses.length > 0 ? (
            statuses.map((status) => (
              <tr key={status.id} className="transition hover:bg-primary/5">
                <td className="px-6 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-900">{status.name}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {STATUS_CATEGORY_LABELS[status.category] ?? status.category}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span
                      className="inline-flex h-5 w-5 rounded-full border border-slate-200"
                      style={{ backgroundColor: status.colorCode }}
                      aria-label={`Color swatch ${status.colorCode}`}
                    />
                    <span>{status.colorCode}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {status.icon ? <span className="break-words">{status.icon}</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {status.description ? (
                    <span className="line-clamp-2 max-w-xs text-slate-600">{status.description}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm">
                  {status.isDefault ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Default
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm">
                  {status.active ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!canManage || status.isDefault) {
                          return;
                        }
                        markDefaultMutation.mutate(status.id);
                      }}
                      disabled={!canManage || status.isDefault || markDefaultMutation.isPending}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        status.isDefault || !canManage
                          ? 'border-slate-200 text-slate-400'
                          : 'border-primary/40 text-primary hover:border-primary hover:bg-primary/10'
                      }`}
                    >
                      Set default
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(status)}
                      disabled={!canManage}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        canManage
                          ? 'border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
                          : 'border-slate-200 text-slate-300'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(status)}
                      disabled={!canManage || deleteMutation.isPending}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        canManage
                          ? 'border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                          : 'border-slate-200 text-slate-300'
                      }`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-500">
                No statuses found.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </PageSection>
  );

  const renderForm = () => {
    const isCreate = panelMode === 'create';
    const headerTitle = isCreate ? 'Create status' : `Edit ${form.name || 'status'}`;

    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary/40 hover:text-primary"
              aria-label="Back to status list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {isCreate ? 'New status' : 'Edit status'}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{headerTitle}</h2>
              {editingId && !isCreate ? (
                <p className="text-sm text-slate-500">Status ID #{editingId}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : isCreate ? 'Create status' : 'Save changes'}
            </Button>
          </div>
        </header>
        <div className="grid border-b border-slate-200 lg:grid-cols-[260px,1fr]">
          <nav className="flex shrink-0 flex-row gap-2 border-b border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 lg:flex-col lg:border-b-0 lg:border-r">
            <span className="rounded-lg bg-primary/10 px-3 py-2 text-primary">General</span>
          </nav>
          <div className="flex-1 px-6 py-6">
            {formError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{formError}</div>
            )}
            <div className="space-y-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status-name">
                  Name
                </label>
                <input
                  id="status-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Processing"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status-category">
                  Category
                </label>
                <select
                  id="status-category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as StatusCategory }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Color</label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="color"
                    value={form.colorCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, colorCode: event.target.value.toUpperCase() }))}
                    className="h-12 w-20 cursor-pointer rounded-lg border border-slate-200"
                  />
                  <input
                    type="text"
                    value={form.colorCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, colorCode: event.target.value.toUpperCase() }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
                    placeholder="#06B6D4"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status-icon">
                  Icon <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="status-icon"
                  type="text"
                  value={form.icon}
                  onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. heroicons:truck"
                />
                <p className="mt-1 text-xs text-slate-500">Provide an icon class or emoji to visually identify the status.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status-description">
                  Description <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="status-description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Internal notes or context for this status"
                />
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700">Default status</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name="status-default"
                      checked={form.isDefault}
                      onChange={() => setForm((prev) => ({ ...prev, isDefault: true }))}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name="status-default"
                      checked={!form.isDefault}
                      onChange={() => setForm((prev) => ({ ...prev, isDefault: false }))}
                    />
                    No
                  </label>
                </div>
                <p className="mt-1 text-xs text-slate-500">Only one status per category can be set as the default.</p>
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700">Active</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name="status-active"
                      checked={form.active}
                      onChange={() => setForm((prev) => ({ ...prev, active: true }))}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name="status-active"
                      checked={!form.active}
                      onChange={() => setForm((prev) => ({ ...prev, active: false }))}
                    />
                    Inactive
                  </label>
                </div>
                <p className="mt-1 text-xs text-slate-500">Inactive statuses remain in history but are hidden from new selections.</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    );
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
        You do not have permission to view the status configuration module.
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Status Configuration"
        description="Define standardized system statuses and manage their defaults across the admin portal."
        actions={
          panelMode === 'list'
            ? (
                <Button onClick={openCreateForm} variant="primary" disabled={!canManage}>
                  + Create New Status
                </Button>
              )
            : undefined
        }
      />
      {panelMode === 'list' ? renderList() : renderForm()}
    </div>
  );
};

export default StatusConfigurationPage;
