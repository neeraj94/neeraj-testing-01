import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import { useAppSelector } from '../../app/hooks';
import { hasAnyPermission } from '../../utils/permissions';
import type { PermissionKey } from '../../types/auth';
import { adminApi } from '../../services/http';
import type {
  StatusDetail,
  StatusPage,
  StatusPatchPayload,
  StatusRequestPayload,
  StatusReorderPayload,
  StatusSummary,
  StatusTransitionPayload,
  StatusTypeKey
} from '../../types/status';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { extractErrorMessage } from '../../utils/errors';

interface StatusFormState {
  name: string;
  code: string;
  icon: string;
  colorHex: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  visibleToCustomer: boolean;
  allowedTransitionIds: number[];
}

const createDefaultFormState = (type: StatusTypeKey): StatusFormState => ({
  name: '',
  code: '',
  icon: '',
  colorHex: '#6B7280',
  description: '',
  isDefault: false,
  isActive: true,
  visibleToCustomer: type === 'ORDER',
  allowedTransitionIds: []
});

const TABS: { key: StatusTypeKey; label: string; description: string }[] = [
  {
    key: 'ORDER',
    label: 'Order Status',
    description: 'Manage the lifecycle stages used throughout order processing.'
  },
  {
    key: 'PAYMENT',
    label: 'Payment Status',
    description: 'Control the payment states used for billing and finance workflows.'
  }
];

const ConfigOrderStatusPage = () => {
  const permissions = useAppSelector((state) => state.auth.permissions) as PermissionKey[];
  const { notify } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<StatusTypeKey>('ORDER');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<StatusFormState>(() => createDefaultFormState('ORDER'));
  const [formInitial, setFormInitial] = useState<StatusFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const canViewOrder = useMemo(
    () => hasAnyPermission(permissions, ['CONFIG.ORDER_STATUS.VIEW', 'CONFIG.ORDER_STATUS.MANAGE']),
    [permissions]
  );
  const canManageOrder = useMemo(
    () => hasAnyPermission(permissions, ['CONFIG.ORDER_STATUS.MANAGE']),
    [permissions]
  );
  const canViewPayment = useMemo(
    () => hasAnyPermission(permissions, ['CONFIG.PAYMENT_STATUS.VIEW', 'CONFIG.PAYMENT_STATUS.MANAGE']),
    [permissions]
  );
  const canManagePayment = useMemo(
    () => hasAnyPermission(permissions, ['CONFIG.PAYMENT_STATUS.MANAGE']),
    [permissions]
  );

  const canView = activeTab === 'ORDER' ? canViewOrder : canViewPayment;
  const canManage = activeTab === 'ORDER' ? canManageOrder : canManagePayment;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setForm(createDefaultFormState(activeTab));
    setFormInitial(createDefaultFormState(activeTab));
    setDrawerMode(null);
    setEditingId(null);
    setFormError(null);
  }, [activeTab]);

  const statusesQuery = useQuery<StatusPage>({
    queryKey: ['configStatuses', activeTab, search],
    enabled: canView,
    queryFn: async () => {
      const { data } = await adminApi.get<StatusPage>('/config/statuses', {
        params: { type: activeTab, search: search || undefined, page: 0, size: 200 }
      });
      return data;
    }
  });

  const statuses = statusesQuery.data?.content ?? [];

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const payload: StatusReorderPayload = { type: activeTab, ids };
      await adminApi.post('/config/statuses/reorder', payload);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Status order updated.' });
      queryClient.invalidateQueries({ queryKey: ['configStatuses', activeTab] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to reorder statuses.') });
      queryClient.invalidateQueries({ queryKey: ['configStatuses', activeTab] });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: StatusRequestPayload) => {
      const { data } = await adminApi.post<StatusDetail>('/config/statuses', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Status created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['configStatuses', activeTab] });
      closeDrawer(true);
    },
    onError: (error: unknown) => {
      setFormError(extractErrorMessage(error, 'Unable to create status.'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: StatusRequestPayload }) => {
      const { data } = await adminApi.put<StatusDetail>(`/config/statuses/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Status updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['configStatuses', activeTab] });
      closeDrawer(true);
    },
    onError: (error: unknown) => {
      setFormError(extractErrorMessage(error, 'Unable to update status.'));
    }
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: StatusPatchPayload }) => {
      const { data } = await adminApi.patch<StatusDetail>(`/config/statuses/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configStatuses', activeTab] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to update status.') });
      queryClient.invalidateQueries({ queryKey: ['configStatuses', activeTab] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/config/statuses/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Status deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['configStatuses', activeTab] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to delete status.') });
    }
  });

  const transitionsMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: StatusTransitionPayload }) => {
      const { data } = await adminApi.put<number[]>(`/config/statuses/${id}/transitions`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Transitions updated.' });
      queryClient.invalidateQueries({ queryKey: ['configStatuses', activeTab] });
      setFormInitial((prev) =>
        prev
          ? {
              ...form,
              allowedTransitionIds: [...form.allowedTransitionIds]
            }
          : prev
      );
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to update transitions.') });
    }
  });

  const currentFormSnapshot = JSON.stringify(form);
  const pristineSnapshot = formInitial ? JSON.stringify(formInitial) : currentFormSnapshot;
  const hasUnsavedChanges = currentFormSnapshot !== pristineSnapshot;

  const closeDrawer = (force = false) => {
    if (!force && hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    setDrawerMode(null);
    setEditingId(null);
    setForm(createDefaultFormState(activeTab));
    setFormInitial(createDefaultFormState(activeTab));
    setFormError(null);
  };

  const openCreate = () => {
    setForm(createDefaultFormState(activeTab));
    setFormInitial(createDefaultFormState(activeTab));
    setEditingId(null);
    setFormError(null);
    setDrawerMode('create');
  };

  const openEdit = async (status: StatusSummary) => {
    try {
      const { data } = await adminApi.get<StatusDetail>(`/config/statuses/${status.id}`, {
        params: { type: status.type }
      });
      setEditingId(status.id);
      setForm({
        name: data.name,
        code: data.code,
        icon: data.icon ?? '',
        colorHex: data.colorHex ?? '#6B7280',
        description: data.description ?? '',
        isDefault: data.isDefault,
        isActive: data.isActive,
        visibleToCustomer: activeTab === 'ORDER' ? Boolean(data.visibleToCustomer) : false,
        allowedTransitionIds: data.allowedTransitionIds ?? []
      });
      setFormInitial({
        name: data.name,
        code: data.code,
        icon: data.icon ?? '',
        colorHex: data.colorHex ?? '#6B7280',
        description: data.description ?? '',
        isDefault: data.isDefault,
        isActive: data.isActive,
        visibleToCustomer: activeTab === 'ORDER' ? Boolean(data.visibleToCustomer) : false,
        allowedTransitionIds: data.allowedTransitionIds ?? []
      });
      setFormError(null);
      setDrawerMode('edit');
    } catch (error) {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to load status.') });
    }
  };

  const handleFormChange = <K extends keyof StatusFormState>(key: K, value: StatusFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) {
      return;
    }
    setFormError(null);

    const payload: StatusRequestPayload = {
      type: activeTab,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      icon: form.icon.trim() ? form.icon.trim() : null,
      colorHex: form.colorHex.trim() ? form.colorHex.trim().toUpperCase() : null,
      description: form.description.trim() ? form.description.trim() : null,
      isDefault: form.isDefault,
      isActive: form.isActive,
      visibleToCustomer: activeTab === 'ORDER' ? form.visibleToCustomer : undefined,
      allowedTransitionIds: activeTab === 'ORDER' ? form.allowedTransitionIds : undefined
    };

    if (drawerMode === 'create') {
      createMutation.mutate(payload);
    } else if (drawerMode === 'edit' && editingId) {
      updateMutation.mutate({ id: editingId, payload });
    }
  };

  const handleSetDefault = (status: StatusSummary) => {
    if (!canManage) {
      return;
    }
    patchMutation.mutate({ id: status.id, payload: { isDefault: true } });
  };

  const handleToggleActive = (status: StatusSummary, active: boolean) => {
    if (!canManage) {
      return;
    }
    patchMutation.mutate({ id: status.id, payload: { isActive: active } });
  };

  const handleDelete = async (status: StatusSummary) => {
    if (!canManage) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete status',
      description: `Are you sure you want to delete “${status.name}”? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(status.id);
  };

  const handleDrop = (targetId: number) => {
    if (!canManage || draggingId === null || draggingId === targetId) {
      return;
    }
    const sourceIndex = statuses.findIndex((item) => item.id === draggingId);
    const targetIndex = statuses.findIndex((item) => item.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }
    const reordered = [...statuses];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    queryClient.setQueryData<StatusPage>(['configStatuses', activeTab, search], (previous) => {
      if (!previous) {
        return previous;
      }
      return { ...previous, content: reordered };
    });
    reorderMutation.mutate(reordered.map((item) => item.id));
    setDraggingId(null);
  };

  const handleTransitionsSave = () => {
    if (!canManage || activeTab !== 'ORDER' || !editingId) {
      return;
    }
    transitionsMutation.mutate({
      id: editingId,
      payload: { toStatusIds: form.allowedTransitionIds }
    });
  };

  const isLoading = statusesQuery.isLoading || statusesQuery.isRefetching;

  const renderStatusActions = (status: StatusSummary) => {
    if (!canManage) {
      return (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Edit</span>
          <span>Delete</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => openEdit(status)}
          className="text-primary hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => handleDelete(status)}
          className="text-rose-600 hover:underline"
        >
          Delete
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order & Payment statuses"
        description="Configure the status catalog that powers workflows across orders, fulfillment, and payments."
      />

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Status tabs">
          {TABS.map((tab) => {
            const tabDisabled = tab.key === 'ORDER' ? !canViewOrder : !canViewPayment;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                disabled={tabDisabled}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-600">
            {TABS.find((tab) => tab.key === activeTab)?.description}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by name or code"
              className="w-64 rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              disabled={!canView}
            />
            {isLoading && <span className="text-xs text-slate-400">Loading…</span>}
          </div>
          {canManage && (
            <Button onClick={openCreate}>New status</Button>
          )}
        </div>

        {!canView ? (
          <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            You do not have permission to view statuses for this section.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {canManage && <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Order</th>}
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Icon</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Color</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Default</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {statuses.map((status) => (
                  <tr
                    key={status.id}
                    draggable={canManage}
                    onDragStart={() => setDraggingId(status.id)}
                    onDragOver={(event) => {
                      if (canManage) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={() => handleDrop(status.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`transition hover:bg-slate-50 ${
                      draggingId === status.id ? 'opacity-60' : ''
                    }`}
                  >
                    {canManage && (
                      <td className="w-10 px-3 py-3 align-middle text-slate-400">
                        <span className="cursor-grab" aria-hidden>⋮⋮</span>
                      </td>
                    )}
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium text-slate-900">{status.name}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-xs font-mono text-slate-500">{status.code}</td>
                    <td className="px-3 py-3 align-top text-slate-500">{status.icon || '—'}</td>
                    <td className="px-3 py-3 align-top">
                      {status.colorHex ? (
                        <span
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 text-xs"
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-slate-300"
                            style={{ backgroundColor: status.colorHex }}
                          />
                          {status.colorHex}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-slate-500">
                      <span className="line-clamp-2 max-w-xs text-xs">{status.description || '—'}</span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {status.isDefault ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          Default
                        </span>
                      ) : canManage ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(status)}
                          className="text-xs text-primary hover:underline"
                        >
                          Make default
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={status.isActive}
                          disabled={!canManage}
                          onChange={(event) => handleToggleActive(status, event.target.checked)}
                        />
                        <span>{status.isActive ? 'Active' : 'Inactive'}</span>
                      </label>
                    </td>
                    <td className="px-3 py-3 align-top">{renderStatusActions(status)}</td>
                  </tr>
                ))}
                {statuses.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManage ? 9 : 8}
                      className="px-3 py-6 text-center text-sm text-slate-500"
                    >
                      No statuses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(drawerMode === 'create' || drawerMode === 'edit') && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-slate-900/40" onClick={() => closeDrawer(false)} aria-hidden />
          <aside className="relative flex w-full max-w-xl flex-col bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {drawerMode === 'create' ? 'Create status' : 'Edit status'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeTab === 'ORDER'
                    ? 'Order statuses power fulfillment flows and customer visibility.'
                    : 'Payment statuses drive billing, refunds, and financial reporting.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => closeDrawer(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const formElement = document.getElementById('status-form');
                    if (formElement instanceof HTMLFormElement) {
                      formElement.requestSubmit();
                    }
                  }}
                  disabled={!canManage || createMutation.isPending || updateMutation.isPending}
                  loading={createMutation.isPending || updateMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </header>
            <form id="status-form" className="flex-1 overflow-y-auto px-6 py-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => handleFormChange('name', event.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
                    disabled={!canManage}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Code
                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) => handleFormChange('code', event.target.value.toUpperCase())}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase tracking-wide focus:border-primary focus:outline-none"
                    required
                    disabled={!canManage || drawerMode === 'edit'}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Icon
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(event) => handleFormChange('icon', event.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="Optional — heroicon name or SVG"
                    disabled={!canManage}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Color
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={form.colorHex}
                        onChange={(event) => handleFormChange('colorHex', event.target.value)}
                        className="h-10 w-10 rounded border border-slate-300"
                        disabled={!canManage}
                      />
                      <input
                        type="text"
                        value={form.colorHex}
                        onChange={(event) => handleFormChange('colorHex', event.target.value.toUpperCase())}
                        className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none"
                        disabled={!canManage}
                      />
                    </div>
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) => handleFormChange('description', event.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="Optional notes displayed alongside the status"
                    disabled={!canManage}
                  />
                </label>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-700">Default status</legend>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name="isDefault"
                      checked={form.isDefault}
                      onChange={() => handleFormChange('isDefault', true)}
                      disabled={!canManage}
                    />
                    Set as default for this type
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name="isDefault"
                      checked={!form.isDefault}
                      onChange={() => handleFormChange('isDefault', false)}
                      disabled={!canManage}
                    />
                    Not default
                  </label>
                </fieldset>
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => handleFormChange('isActive', event.target.checked)}
                    disabled={!canManage}
                  />
                  Active
                </label>
                {activeTab === 'ORDER' && (
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.visibleToCustomer}
                      onChange={(event) => handleFormChange('visibleToCustomer', event.target.checked)}
                      disabled={!canManage}
                    />
                    Visible to customers
                  </label>
                )}
                {activeTab === 'ORDER' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Allowed transitions</span>
                      {drawerMode === 'edit' && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3 py-1 text-xs"
                          onClick={handleTransitionsSave}
                          disabled={!canManage || transitionsMutation.isPending}
                        >
                          Save transitions
                        </Button>
                      )}
                    </div>
                    <select
                      multiple
                      value={form.allowedTransitionIds.map(String)}
                      onChange={(event) => {
                        const values = Array.from(event.target.selectedOptions).map((option) => Number(option.value));
                        handleFormChange('allowedTransitionIds', values);
                      }}
                      className="h-40 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      disabled={!canManage}
                    >
                      {statuses
                        .filter((status) => status.id !== editingId)
                        .map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      Select statuses that this status can transition to when updating orders.
                    </p>
                  </div>
                )}
                {formError && <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</div>}
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
};

export default ConfigOrderStatusPage;
