import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { Attribute, AttributePage } from '../types/attribute';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { extractErrorMessage } from '../utils/errors';

interface AttributeFormState {
  name: string;
  slug: string;
  values: string[];
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const defaultFormState: AttributeFormState = {
  name: '',
  slug: '',
  values: []
};

const AttributesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<AttributeFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'values'>('general');
  const [valueDraft, setValueDraft] = useState('');

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['ATTRIBUTE_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['ATTRIBUTE_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['ATTRIBUTE_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const attributesQuery = useQuery<AttributePage>({
    queryKey: ['attributes', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<AttributePage>('/attributes', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const attributes = attributesQuery.data?.content ?? [];

  const createMutation = useMutation({
    mutationFn: async (payload: AttributeFormState) => {
      const { data } = await api.post<Attribute>('/attributes', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Attribute created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create attribute.') });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: AttributeFormState }) => {
      const { data } = await api.put<Attribute>(`/attributes/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Attribute updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update attribute.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/attributes/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Attribute deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete attribute.') });
    }
  });

  const openCreateForm = () => {
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setPanelMode('create');
    setActiveTab('general');
    setValueDraft('');
  };

  const openEditForm = (attribute: Attribute) => {
    setForm({
      name: attribute.name,
      slug: attribute.slug,
      values: attribute.values
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((value) => value.value)
    });
    setFormError(null);
    setEditingId(attribute.id);
    setPanelMode('edit');
    setActiveTab('general');
    setValueDraft('');
  };

  const closeForm = () => {
    setPanelMode('list');
    setForm({ ...defaultFormState });
    setFormError(null);
    setActiveTab('general');
    setEditingId(null);
    setValueDraft('');
  };

  const addValue = () => {
    const nextValue = valueDraft.trim();
    if (!nextValue) {
      setFormError('Enter a value before adding it to the attribute.');
      setActiveTab('values');
      return;
    }
    const duplicate = form.values.some((value) => value.toLowerCase() === nextValue.toLowerCase());
    if (duplicate) {
      setFormError('This value is already listed for the attribute.');
      setActiveTab('values');
      return;
    }
    setForm((prev) => ({ ...prev, values: [...prev.values, nextValue] }));
    setValueDraft('');
    setFormError(null);
  };

  const removeValue = (index: number) => {
    setForm((prev) => {
      const nextValues = [...prev.values];
      nextValues.splice(index, 1);
      return { ...prev, values: nextValues };
    });
    setFormError(null);
  };

  const moveValue = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const nextValues = [...prev.values];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= nextValues.length) {
        return prev;
      }
      const [moved] = nextValues.splice(index, 1);
      nextValues.splice(targetIndex, 0, moved);
      return { ...prev, values: nextValues };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Attribute name is required.');
      setActiveTab('general');
      return;
    }

    const normalizedValues = form.values
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (normalizedValues.length === 0) {
      setFormError('Add at least one value before saving the attribute.');
      setActiveTab('values');
      return;
    }

    const payload: AttributeFormState = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      values: normalizedValues
    };

    try {
      if (panelMode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (panelMode === 'edit' && editingId != null) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      }
      closeForm();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Failed to save attribute.'));
    }
  };

  const handleDelete = async (attribute: Attribute) => {
    if (!canDelete) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete attribute?',
      description: `Delete attribute "${attribute.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(attribute.id);
  };

  const totalElements = attributesQuery.data?.totalElements ?? 0;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(value));

  const renderDirectory = () => (
    <PageSection padded={false} bodyClassName="flex flex-col">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search attributes"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Attribute</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Values</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</th>
              {(canUpdate || canDelete) && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {attributesQuery.isLoading ? (
              <tr>
                <td colSpan={canUpdate || canDelete ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading attributes…
                </td>
              </tr>
            ) : attributes.length > 0 ? (
              attributes.map((attribute) => {
                const visibleValues = attribute.values.slice(0, 4);
                const remainingCount = attribute.values.length - visibleValues.length;
                return (
                  <tr key={attribute.id} className="transition hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{attribute.name}</span>
                        <span className="text-xs text-slate-500">{attribute.slug}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {visibleValues.map((value) => (
                          <span
                            key={value.id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {value.value}
                          </span>
                        ))}
                        {remainingCount > 0 && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                            +{remainingCount} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(attribute.updatedAt)}</td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditForm(attribute)}
                              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                              aria-label={`Edit ${attribute.name}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(attribute)}
                              className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                              aria-label={`Delete ${attribute.name}`}
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
                );
              })
            ) : (
              <tr>
                <td colSpan={canUpdate || canDelete ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-500">
                  No attributes found.
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
        isLoading={attributesQuery.isLoading}
      />
    </PageSection>
  );

  const renderForm = () => {
    const isCreate = panelMode === 'create';
    const isSaving = createMutation.isPending || updateMutation.isPending;
    const headerTitle = isCreate ? 'Create attribute' : form.name || 'Edit attribute';
    const headerSubtitle = isCreate
      ? 'Define catalog attributes and their selectable values.'
      : editingId
      ? `#${editingId} attribute`
      : '';

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
              aria-label="Back to attribute directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {isCreate ? 'New attribute' : 'Edit attribute'}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{headerTitle}</h2>
              {headerSubtitle && <p className="text-sm text-slate-500">{headerSubtitle}</p>}
            </div>
          </div>
        </header>
        <div className="grid border-b border-slate-200 lg:grid-cols-[240px,1fr]">
          <nav className="flex shrink-0 flex-row gap-2 border-b border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 lg:flex-col lg:border-b-0 lg:border-r">
            {[
              { key: 'general', label: 'General' },
              { key: 'values', label: 'Values' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'general' | 'values')}
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
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="attribute-name">
                    Name
                  </label>
                  <input
                    id="attribute-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Size"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="attribute-slug">
                    Slug <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="attribute-slug"
                    type="text"
                    value={form.slug}
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="size"
                  />
                  <p className="mt-1 text-xs text-slate-500">Used in URLs and product filters. Only lowercase letters, numbers, and dashes are recommended.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="attribute-value-input">
                    Add values
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="attribute-value-input"
                      type="text"
                      value={valueDraft}
                      onChange={(event) => setValueDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addValue();
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Large"
                    />
                    <button
                      type="button"
                      onClick={addValue}
                      className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                    >
                      Add value
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Keep values short and descriptive. Examples: XS, Small, 36, Cotton.</p>
                </div>
                <div className="space-y-2">
                  {form.values.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                      No values yet. Add the first one to define selectable options.
                    </p>
                  ) : (
                    form.values.map((value, index) => (
                      <div
                        key={`${value}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700"
                      >
                        <span className="font-medium">{value}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveValue(index, -1)}
                            className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            aria-label="Move value up"
                            disabled={index === 0}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M10 3a1 1 0 0 0-.832.445l-5 7A1 1 0 0 0 5 12h10a1 1 0 0 0 .832-1.555l-5-7A1 1 0 0 0 10 3Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveValue(index, 1)}
                            className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            aria-label="Move value down"
                            disabled={index === form.values.length - 1}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M10 17a1 1 0 0 0 .832-.445l5-7A1 1 0 0 0 15 8H5a1 1 0 0 0-.832 1.555l5 7A1 1 0 0 0 10 17Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeValue(index)}
                            className="rounded-full border border-rose-200 p-1 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                            aria-label="Remove value"
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
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Attributes power product filters and variant selection across the storefront.</span>
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
              {isSaving ? 'Saving…' : isCreate ? 'Create attribute' : 'Save changes'}
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
        title="Attributes"
        description="Organize storefront attributes and maintain the values customers can filter or choose from."
        actions={
          isDirectoryView && canCreate
            ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                >
                  New attribute
                </button>
              )
            : undefined
        }
      />

      {isDirectoryView ? renderDirectory() : renderForm()}
    </div>
  );
};

export default AttributesPage;
