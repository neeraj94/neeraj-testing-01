import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { Wedge, WedgeIconUploadResponse, WedgePage } from '../types/wedge';
import type { CategoryOption } from '../types/category';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { extractErrorMessage } from '../utils/errors';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import type { MediaSelection } from '../types/uploaded-file';

interface WedgeFormState {
  name: string;
  iconUrl: string;
  shortDescription: string;
  longDescription: string;
  defaultWedge: boolean;
  categoryId: string;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const defaultFormState: WedgeFormState = {
  name: '',
  iconUrl: '',
  shortDescription: '',
  longDescription: '',
  defaultWedge: false,
  categoryId: ''
};

const WedgesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<WedgeFormState>({ ...defaultFormState });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'content'>('general');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const wedgeModuleFilter = ['WEDGE_ICON'];

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['WEDGE_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['WEDGE_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['WEDGE_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const wedgesQuery = useQuery<WedgePage>({
    queryKey: ['wedges', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<WedgePage>('/wedges', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const categoryOptionsQuery = useQuery<CategoryOption[]>({
    queryKey: ['categories', 'options'],
    queryFn: async () => {
      const { data } = await api.get<CategoryOption[]>('/categories/options');
      return data;
    },
    enabled: panelMode !== 'list'
  });

  const wedges = wedgesQuery.data?.content ?? [];
  const totalElements = wedgesQuery.data?.totalElements ?? 0;

  const createMutation = useMutation({
    mutationFn: async (payload: WedgeFormState) => {
      const { data } = await api.post<Wedge>('/wedges', {
        name: payload.name,
        iconUrl: payload.iconUrl || null,
        shortDescription: payload.shortDescription || null,
        longDescription: payload.longDescription || null,
        defaultWedge: payload.defaultWedge,
        categoryId: payload.categoryId ? Number(payload.categoryId) : null
      });
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Wedge created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['wedges'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create wedge.') });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: WedgeFormState }) => {
      const { data } = await api.put<Wedge>(`/wedges/${id}`, {
        name: payload.name,
        iconUrl: payload.iconUrl || null,
        shortDescription: payload.shortDescription || null,
        longDescription: payload.longDescription || null,
        defaultWedge: payload.defaultWedge,
        categoryId: payload.categoryId ? Number(payload.categoryId) : null
      });
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Wedge updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['wedges'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update wedge.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/wedges/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Wedge deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['wedges'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete wedge.') });
    }
  });

  const iconUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<WedgeIconUploadResponse>('/wedges/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    }
  });

  const openCreateForm = () => {
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setPanelMode('create');
    setActiveTab('general');
    setIconPreview(null);
    setMediaLibraryOpen(false);
  };

  const openEditForm = (wedge: Wedge) => {
    setForm({
      name: wedge.name,
      iconUrl: wedge.iconUrl ?? '',
      shortDescription: wedge.shortDescription ?? '',
      longDescription: wedge.longDescription ?? '',
      defaultWedge: wedge.defaultWedge,
      categoryId: wedge.category?.id ? String(wedge.category.id) : ''
    });
    setFormError(null);
    setEditingId(wedge.id);
    setPanelMode('edit');
    setActiveTab('general');
    setIconPreview(wedge.iconUrl ?? null);
    setMediaLibraryOpen(false);
  };

  const closeForm = () => {
    setPanelMode('list');
    setForm({ ...defaultFormState });
    setFormError(null);
    setActiveTab('general');
    setIconPreview(null);
    setEditingId(null);
    setMediaLibraryOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Wedge name is required.');
      setActiveTab('general');
      return;
    }

    const payload: WedgeFormState = {
      name: form.name.trim(),
      iconUrl: form.iconUrl.trim(),
      shortDescription: form.shortDescription.trim(),
      longDescription: form.longDescription.trim(),
      defaultWedge: form.defaultWedge,
      categoryId: form.categoryId
    };

    try {
      if (panelMode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (panelMode === 'edit' && editingId != null) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      }
      closeForm();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Unable to save wedge.'));
    }
  };

  const openMediaLibraryDialog = () => {
    setMediaLibraryOpen(true);
  };

  const closeMediaLibraryDialog = () => {
    setMediaLibraryOpen(false);
  };

  const handleMediaSelect = (selection: MediaSelection | MediaSelection[]) => {
    const selected = Array.isArray(selection) ? selection[0] : selection;
    if (!selected) {
      return;
    }
    setForm((prev) => ({ ...prev, iconUrl: selected.url }));
    setIconPreview(selected.url);
    closeMediaLibraryDialog();
  };

  const handleMediaUpload = async (files: File[]): Promise<MediaSelection[]> => {
    const selections: MediaSelection[] = [];
    for (const file of files) {
      try {
        const data = await iconUploadMutation.mutateAsync(file);
        notify({ type: 'success', message: 'Icon uploaded successfully.' });
        selections.push({
          url: data.url,
          originalFilename: data.originalFilename ?? undefined,
          mimeType: data.mimeType ?? undefined,
          sizeBytes: data.sizeBytes ?? undefined
        });
      } catch (error) {
        notify({ type: 'error', message: extractErrorMessage(error, 'Failed to upload icon.') });
      }
    }
    if (!selections.length) {
      throw new Error('No icon uploaded');
    }
    return selections;
  };

  const handleIconRemove = () => {
    setForm((prev) => ({ ...prev, iconUrl: '' }));
    setIconPreview(null);
  };

  const confirm = useConfirm();

  const handleDelete = async (wedge: Wedge) => {
    if (!canDelete) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete wedge?',
      description: `Delete wedge "${wedge.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(wedge.id);
  };

  const renderDirectory = () => (
    <PageSection>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="wedge-search" className="text-sm font-medium text-slate-600">
            Search
          </label>
          <input
            id="wedge-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search wedges"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-64"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Default</th>
              <th className="px-4 py-3">Updated</th>
              {canUpdate || canDelete ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
            {wedges.length > 0 ? (
              wedges.map((wedge) => (
                <tr key={wedge.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        {wedge.iconUrl ? (
                          <img src={wedge.iconUrl} alt="Wedge icon" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-400">No icon</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{wedge.name}</span>
                        {wedge.shortDescription && (
                          <span className="text-xs text-slate-500">{wedge.shortDescription}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {wedge.category ? wedge.category.name : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {wedge.defaultWedge ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Default
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(wedge.updatedAt).toLocaleString()}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditForm(wedge)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(wedge)}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={canUpdate || canDelete ? 5 : 4}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  No wedges found.
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
        isLoading={wedgesQuery.isLoading}
      />
    </PageSection>
  );

  const renderForm = () => {
    const isCreate = panelMode === 'create';
    const isSaving = createMutation.isPending || updateMutation.isPending;
    const headerTitle = isCreate ? 'Create wedge' : form.name || 'Edit wedge';
    const headerSubtitle = isCreate ? 'Add a new wedge configuration for the catalog.' : editingId ? `#${editingId} wedge` : '';

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleSubmit();
    };

    return (
      <form
        onSubmit={handleFormSubmit}
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary/40 hover:text-primary"
              aria-label="Back to wedge directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {isCreate ? 'New wedge' : 'Edit wedge'}
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
              { key: 'content', label: 'Descriptions' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'general' | 'content')}
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
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {formError}
              </div>
            )}
            {activeTab === 'general' ? (
              <div className="space-y-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="wedge-name">
                    Name
                  </label>
                  <input
                    id="wedge-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Seasonal picks"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium text-slate-700">Icon</span>
                  <p className="mb-3 text-xs text-slate-500">Upload a square image in PNG, JPG, GIF, WEBP, or SVG format.</p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      {iconPreview ? (
                        <img src={iconPreview} alt="Wedge icon preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm text-slate-400">No icon</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={openMediaLibraryDialog}
                          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-600"
                          disabled={iconUploadMutation.isPending}
                        >
                          {iconUploadMutation.isPending ? 'Uploading…' : 'Select icon'}
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-sm font-medium text-slate-700">Default wedge</span>
                    <div className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="wedge-default"
                          value="true"
                          checked={form.defaultWedge}
                          onChange={() => setForm((prev) => ({ ...prev, defaultWedge: true }))}
                          className="h-4 w-4"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="wedge-default"
                          value="false"
                          checked={!form.defaultWedge}
                          onChange={() => setForm((prev) => ({ ...prev, defaultWedge: false }))}
                          className="h-4 w-4"
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="wedge-category">
                      Category <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <select
                      id="wedge-category"
                      value={form.categoryId}
                      onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">No category</option>
                      {(categoryOptionsQuery.data ?? []).map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    {categoryOptionsQuery.isError && (
                      <p className="mt-1 text-xs text-rose-600">Unable to load categories right now.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="wedge-short-description">
                    Short description <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="wedge-short-description"
                    value={form.shortDescription}
                    onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Quick summary for cards and highlights."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="wedge-long-description">
                    Long description <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="wedge-long-description"
                    value={form.longDescription}
                    onChange={(event) => setForm((prev) => ({ ...prev, longDescription: event.target.value }))}
                    rows={6}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Detailed description that appears on landing pages."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Keep descriptions concise—only highlight what helps merchandising.</span>
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
              {isSaving ? 'Saving…' : isCreate ? 'Create wedge' : 'Save changes'}
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
        title="Wedges"
        description="Organize catalog wedges, control featured groupings, and align storefront defaults."
        actions={
          isDirectoryView && canCreate
            ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                >
                  New wedge
                </button>
              )
            : undefined
        }
      />

      <MediaLibraryDialog
        open={mediaLibraryOpen}
        onClose={closeMediaLibraryDialog}
        moduleFilters={wedgeModuleFilter}
        onSelect={handleMediaSelect}
        onUpload={handleMediaUpload}
      />

      {isDirectoryView ? renderDirectory() : renderForm()}
    </div>
  );
};

export default WedgesPage;
