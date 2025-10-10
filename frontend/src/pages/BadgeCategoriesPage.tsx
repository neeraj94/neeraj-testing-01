import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { BadgeCategory, BadgeCategoryPage, BadgeCategoryUploadResponse } from '../types/badge';
import { useToast } from '../components/ToastProvider';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import { extractErrorMessage } from '../utils/errors';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';

interface BadgeCategoryFormState {
  title: string;
  description: string;
  iconUrl: string;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const defaultFormState: BadgeCategoryFormState = {
  title: '',
  description: '',
  iconUrl: ''
};

const BadgeCategoriesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<BadgeCategoryFormState>({ ...defaultFormState });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'details'>('general');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BADGE_CATEGORY_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BADGE_CATEGORY_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BADGE_CATEGORY_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const categoriesQuery = useQuery<BadgeCategoryPage>({
    queryKey: ['badgeCategories', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<BadgeCategoryPage>('/badge-categories', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const categories = categoriesQuery.data?.content ?? [];
  const totalElements = categoriesQuery.data?.totalElements ?? 0;

  const createMutation = useMutation({
    mutationFn: async (payload: BadgeCategoryFormState) => {
      const { data } = await api.post<BadgeCategory>('/badge-categories', {
        title: payload.title,
        description: payload.description || null,
        iconUrl: payload.iconUrl || null
      });
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Badge category created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['badgeCategories'] });
      setPanelMode('list');
      setForm({ ...defaultFormState });
      setIconPreview(null);
      setEditingId(null);
    },
    onError: (error: unknown) => {
      setFormError(extractErrorMessage(error, 'Failed to create badge category.'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: BadgeCategoryFormState }) => {
      const { data } = await api.put<BadgeCategory>(`/badge-categories/${id}`, {
        title: payload.title,
        description: payload.description || null,
        iconUrl: payload.iconUrl || null
      });
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Badge category updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['badgeCategories'] });
      setPanelMode('list');
      setForm({ ...defaultFormState });
      setIconPreview(null);
      setEditingId(null);
    },
    onError: (error: unknown) => {
      setFormError(extractErrorMessage(error, 'Failed to update badge category.'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/badge-categories/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Badge category deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['badgeCategories'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete badge category.') });
    }
  });

  const iconUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<BadgeCategoryUploadResponse>('/badge-categories/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: (data) => {
      setForm((prev) => ({ ...prev, iconUrl: data.url }));
      setIconPreview(data.url);
      notify({ type: 'success', message: 'Icon uploaded successfully.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to upload icon.') });
    }
  });

  const openCreateForm = () => {
    setForm({ ...defaultFormState });
    setFormError(null);
    setPanelMode('create');
    setActiveTab('general');
    setEditingId(null);
    setIconPreview(null);
  };

  const openEditForm = (category: BadgeCategory) => {
    setForm({
      title: category.title,
      description: category.description ?? '',
      iconUrl: category.iconUrl ?? ''
    });
    setFormError(null);
    setPanelMode('edit');
    setActiveTab('general');
    setEditingId(category.id);
    setIconPreview(category.iconUrl ?? null);
  };

  const handleDelete = (category: BadgeCategory) => {
    if (!canDelete) {
      return;
    }
    const confirmed = window.confirm(`Delete badge category "${category.title}"? This action cannot be undone.`);
    if (confirmed) {
      deleteMutation.mutate(category.id);
    }
  };

  const handleIconSelect = () => {
    fileInputRef.current?.click();
  };

  const handleIconChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      iconUploadMutation.mutate(file);
    }
    event.target.value = '';
  };

  const handleIconRemove = () => {
    setForm((prev) => ({ ...prev, iconUrl: '' }));
    setIconPreview(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError('Category title is required.');
      return;
    }

    const payload: BadgeCategoryFormState = {
      ...form,
      title: form.title.trim()
    };

    if (panelMode === 'create') {
      createMutation.mutate(payload);
    } else if (panelMode === 'edit' && editingId != null) {
      updateMutation.mutate({ id: editingId, payload });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const showForm = panelMode !== 'list';
  const isCreate = panelMode === 'create';

  return (
    <PageSection>
      <PageHeader
        title="Badge categories"
        description="Group badges into curated collections for merchandising workflows."
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={showForm && isCreate}
            >
              New badge category
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,minmax(320px,420px)]">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="badge-category-search" className="text-sm font-medium text-slate-600">
                Search categories
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="badge-category-search"
                  type="search"
                  placeholder="Search categories"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-64"
                />
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Updated
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {category.iconUrl ? (
                              <img src={category.iconUrl} alt={`${category.title} icon`} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs text-slate-400">No icon</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{category.title}</p>
                            {category.description && (
                              <p className="text-xs text-slate-500">{category.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(category.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditForm(category)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(category)}
                              className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-sm text-slate-500">
                      {categoriesQuery.isLoading ? 'Loading categories…' : 'No badge categories found.'}
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
            isLoading={categoriesQuery.isLoading}
            onPageChange={setPage}
          />
        </div>

        {showForm && (
          <aside className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-start gap-4 border-b border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={() => {
                  setPanelMode('list');
                  setForm({ ...defaultFormState });
                  setIconPreview(null);
                  setEditingId(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Back
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {isCreate ? 'New badge category' : 'Edit badge category'}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  {isCreate ? 'Create badge category' : form.title || 'Update badge category'}
                </h2>
                {editingId && !isCreate && <p className="text-xs text-slate-500">ID #{editingId}</p>}
              </div>
            </header>
            <form onSubmit={handleSubmit} className="grid border-t border-slate-200 lg:grid-cols-[180px,1fr]">
              <nav className="flex flex-row gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-600 lg:flex-col lg:border-b-0 lg:border-r">
                {[{ key: 'general', label: 'General' }, { key: 'details', label: 'Details' }].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as 'general' | 'details')}
                    className={`rounded-lg px-3 py-2 text-left transition ${
                      activeTab === tab.key ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
              <div className="px-6 py-6">
                {formError && (
                  <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                    {formError}
                  </div>
                )}
                {activeTab === 'general' ? (
                  <div className="space-y-6">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="badge-category-title">
                        Title
                      </label>
                      <input
                        id="badge-category-title"
                        type="text"
                        value={form.title}
                        onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Seasonal"
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-sm font-medium text-slate-700">Icon</span>
                      <p className="mb-3 text-xs text-slate-500">Upload an image to represent this category.</p>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                          {iconPreview ? (
                            <img src={iconPreview} alt="Badge category icon" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs text-slate-400">No icon</span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleIconChange}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleIconSelect}
                              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-600"
                              disabled={iconUploadMutation.isPending}
                            >
                              {iconUploadMutation.isPending ? 'Uploading…' : 'Upload icon'}
                            </button>
                            {iconPreview && (
                              <button
                                type="button"
                                onClick={handleIconRemove}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          {form.iconUrl && !iconPreview && (
                            <p className="break-words text-xs text-slate-500">{form.iconUrl}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="badge-category-description">
                        Description
                      </label>
                      <textarea
                        id="badge-category-description"
                        value={form.description}
                        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                        className="min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Explain how badges within this category should be used"
                      />
                    </div>
                  </div>
                )}
                <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPanelMode('list');
                      setForm({ ...defaultFormState });
                      setIconPreview(null);
                      setEditingId(null);
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving…' : isCreate ? 'Create category' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          </aside>
        )}
      </div>
    </PageSection>
  );
};

export default BadgeCategoriesPage;
