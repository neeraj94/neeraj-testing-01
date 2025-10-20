import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/http';
import type { BadgeCategory, BadgeCategoryPage, BadgeCategoryUploadResponse } from '../../types/badge';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import PageHeader from '../../components/PageHeader';
import PageSection from '../../components/PageSection';
import PaginationControls from '../../components/PaginationControls';
import { extractErrorMessage } from '../../utils/errors';
import { useAppSelector } from '../../app/hooks';
import { hasAnyPermission } from '../../utils/permissions';
import type { PermissionKey } from '../../types/auth';
import MediaLibraryDialog from '../../components/MediaLibraryDialog';
import type { MediaSelection } from '../../types/uploaded-file';

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
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);

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

  const closeForm = () => {
    setPanelMode('list');
    setForm({ ...defaultFormState });
    setFormError(null);
    setActiveTab('general');
    setEditingId(null);
    setIconPreview(null);
  };

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
      closeForm();
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
      closeForm();
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
    setActiveTab('general');
    setPanelMode('create');
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
    setActiveTab('general');
    setPanelMode('edit');
    setEditingId(category.id);
    setIconPreview(category.iconUrl ?? null);
  };

  const confirm = useConfirm();

  const handleDelete = async (category: BadgeCategory) => {
    if (!canDelete) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete badge category?',
      description: `Delete badge category "${category.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(category.id);
  };

  const handleIconSelect = () => {
    setMediaLibraryOpen(true);
  };

  const handleIconRemove = () => {
    setForm((prev) => ({ ...prev, iconUrl: '' }));
    setIconPreview(null);
  };

  const handleMediaUpload = async (files: File[]): Promise<MediaSelection[]> => {
    const [file] = files;
    if (!file) {
      return [];
    }
    const response = await iconUploadMutation.mutateAsync(file);
    return [
      {
        url: response.url,
        originalFilename: response.originalFilename,
        mimeType: response.mimeType,
        sizeBytes: response.sizeBytes
      }
    ];
  };

  const handleMediaSelect = (selection: MediaSelection | MediaSelection[]) => {
    const selected = Array.isArray(selection) ? selection[0] : selection;
    if (!selected) {
      return;
    }
    setForm((prev) => ({ ...prev, iconUrl: selected.url }));
    setIconPreview(selected.url);
    setMediaLibraryOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError('Category title is required.');
      setActiveTab('general');
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

  const isDirectoryView = panelMode === 'list';
  const isCreate = panelMode === 'create';
  const isSaving = createMutation.isPending || updateMutation.isPending;

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
          placeholder="Search badge categories"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</th>
              {(canUpdate || canDelete) && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {categoriesQuery.isLoading ? (
              <tr>
                <td colSpan={canUpdate || canDelete ? 3 : 2} className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading badge categories…
                </td>
              </tr>
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <tr key={category.id} className="transition hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {category.iconUrl ? (
                          <img src={category.iconUrl} alt={`${category.title} icon`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-400">No icon</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{category.title}</span>
                        {category.description && <span className="text-xs text-slate-500">{category.description}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(category.updatedAt)}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditForm(category)}
                            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                            aria-label={`Edit ${category.title}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                            aria-label={`Delete ${category.title}`}
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
                <td colSpan={canUpdate || canDelete ? 3 : 2} className="px-4 py-6 text-center text-sm text-slate-500">
                  No badge categories found.
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
        isLoading={categoriesQuery.isLoading}
      />
    </PageSection>
  );

  const renderForm = () => {
    const headerTitle = isCreate ? 'Create badge category' : form.title || 'Edit badge category';
    const headerSubtitle = isCreate
      ? 'Organize badges into thematic collections for merchandising workflows.'
      : editingId
      ? `#${editingId} category`
      : '';

    return (
      <>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary/40 hover:text-primary"
              aria-label="Back to badge categories"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {isCreate ? 'New badge category' : 'Edit badge category'}
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
              { key: 'details', label: 'Details' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'general' | 'details')}
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
                    Description <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="badge-category-description"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Explain how badges in this category should be used"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Badge categories help organize reusable badge assets across campaigns.</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : isCreate ? 'Create category' : 'Save changes'}
            </button>
          </div>
        </footer>
        </form>
        <MediaLibraryDialog
          open={mediaLibraryOpen}
          onClose={() => setMediaLibraryOpen(false)}
          moduleFilters={['BADGE_CATEGORY_ICON']}
          onSelect={handleMediaSelect}
          onUpload={handleMediaUpload}
        />
      </>
    );
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Badge categories"
        description="Group badges into curated collections for merchandising workflows."
        actions={
          isDirectoryView && canCreate ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
            >
              New badge category
            </button>
          ) : undefined
        }
      />

      {isDirectoryView ? renderDirectory() : renderForm()}
    </div>
  );
};

export default BadgeCategoriesPage;
