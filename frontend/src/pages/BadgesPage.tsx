import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type {
  Badge,
  BadgeCategoryOption,
  BadgeIconUploadResponse,
  BadgePage
} from '../types/badge';
import { useToast } from '../components/ToastProvider';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import { extractErrorMessage } from '../utils/errors';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';

interface BadgeFormState {
  name: string;
  iconUrl: string;
  badgeCategoryId: string;
  shortDescription: string;
  longDescription: string;
  defaultBadge: boolean;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const defaultFormState: BadgeFormState = {
  name: '',
  iconUrl: '',
  badgeCategoryId: '',
  shortDescription: '',
  longDescription: '',
  defaultBadge: false
};

const BadgesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<BadgeFormState>({ ...defaultFormState });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'content'>('general');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BADGE_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BADGE_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BADGE_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const badgesQuery = useQuery<BadgePage>({
    queryKey: ['badges', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<BadgePage>('/badges', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const badgeCategoriesQuery = useQuery<BadgeCategoryOption[]>({
    queryKey: ['badgeCategories', 'options'],
    queryFn: async () => {
      const { data } = await api.get<BadgeCategoryOption[]>('/badge-categories/options');
      return data;
    }
  });

  const badges = badgesQuery.data?.content ?? [];
  const totalElements = badgesQuery.data?.totalElements ?? 0;

  const createMutation = useMutation({
    mutationFn: async (payload: BadgeFormState) => {
      const { data } = await api.post<Badge>('/badges', {
        name: payload.name,
        iconUrl: payload.iconUrl || null,
        shortDescription: payload.shortDescription || null,
        longDescription: payload.longDescription || null,
        defaultBadge: payload.defaultBadge,
        badgeCategoryId: payload.badgeCategoryId ? Number(payload.badgeCategoryId) : null
      });
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Badge created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setPanelMode('list');
      setEditingId(null);
      setForm({ ...defaultFormState });
      setIconPreview(null);
    },
    onError: (error: unknown) => {
      setFormError(extractErrorMessage(error, 'Failed to create badge.'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: BadgeFormState }) => {
      const { data } = await api.put<Badge>(`/badges/${id}`, {
        name: payload.name,
        iconUrl: payload.iconUrl || null,
        shortDescription: payload.shortDescription || null,
        longDescription: payload.longDescription || null,
        defaultBadge: payload.defaultBadge,
        badgeCategoryId: payload.badgeCategoryId ? Number(payload.badgeCategoryId) : null
      });
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Badge updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setPanelMode('list');
      setEditingId(null);
      setForm({ ...defaultFormState });
      setIconPreview(null);
    },
    onError: (error: unknown) => {
      setFormError(extractErrorMessage(error, 'Failed to update badge.'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/badges/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Badge deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete badge.') });
    }
  });

  const iconUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<BadgeIconUploadResponse>('/badges/assets', formData, {
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

  const openEditForm = (badge: Badge) => {
    setForm({
      name: badge.name,
      iconUrl: badge.iconUrl ?? '',
      badgeCategoryId: badge.badgeCategory?.id ? String(badge.badgeCategory.id) : '',
      shortDescription: badge.shortDescription ?? '',
      longDescription: badge.longDescription ?? '',
      defaultBadge: badge.defaultBadge
    });
    setFormError(null);
    setActiveTab('general');
    setPanelMode('edit');
    setEditingId(badge.id);
    setIconPreview(badge.iconUrl ?? null);
  };

  const handleDelete = (badge: Badge) => {
    if (!canDelete) {
      return;
    }
    const confirmed = window.confirm(`Delete badge "${badge.name}"? This action cannot be undone.`);
    if (confirmed) {
      deleteMutation.mutate(badge.id);
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

    if (!form.name.trim()) {
      setFormError('Badge name is required.');
      return;
    }

    const payload: BadgeFormState = {
      ...form,
      name: form.name.trim()
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
        title="Badges"
        description="Create reusable merchandising badges for storefront highlights."
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={showForm && isCreate}
            >
              New badge
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,minmax(320px,420px)]">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="badge-search" className="text-sm font-medium text-slate-600">
                Search badges
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="badge-search"
                  type="search"
                  placeholder="Search badges"
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
                    Badge
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Default
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
                {badges.length > 0 ? (
                  badges.map((badge) => (
                    <tr key={badge.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {badge.iconUrl ? (
                              <img src={badge.iconUrl} alt={`${badge.name} icon`} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs text-slate-400">No icon</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{badge.name}</p>
                            {badge.shortDescription && (
                              <p className="text-xs text-slate-500">{badge.shortDescription}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {badge.badgeCategory ? badge.badgeCategory.title : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {badge.defaultBadge ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                            Default
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(badge.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditForm(badge)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(badge)}
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
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                      {badgesQuery.isLoading ? 'Loading badges…' : 'No badges found.'}
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
            isLoading={badgesQuery.isLoading}
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
                  setEditingId(null);
                  setForm({ ...defaultFormState });
                  setIconPreview(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Back
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {isCreate ? 'New badge' : 'Edit badge'}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  {isCreate ? 'Create badge' : form.name || 'Update badge'}
                </h2>
                {editingId && !isCreate && (
                  <p className="text-xs text-slate-500">ID #{editingId}</p>
                )}
              </div>
            </header>
            <form onSubmit={handleSubmit} className="grid border-t border-slate-200 lg:grid-cols-[180px,1fr]">
              <nav className="flex flex-row gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-600 lg:flex-col lg:border-b-0 lg:border-r">
                {[{ key: 'general', label: 'General' }, { key: 'content', label: 'Content' }].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as 'general' | 'content')}
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
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="badge-name">
                        Name
                      </label>
                      <input
                        id="badge-name"
                        type="text"
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Limited Edition"
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-sm font-medium text-slate-700">Icon</span>
                      <p className="mb-3 text-xs text-slate-500">Upload a square image (PNG, JPG, GIF, WEBP, or SVG).</p>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                          {iconPreview ? (
                            <img src={iconPreview} alt="Badge icon preview" className="h-full w-full object-cover" />
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
                    <div>
                      <span className="mb-1 block text-sm font-medium text-slate-700">Default badge</span>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="radio"
                            name="badge-default"
                            checked={form.defaultBadge}
                            onChange={() => setForm((prev) => ({ ...prev, defaultBadge: true }))}
                          />
                          Yes
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="radio"
                            name="badge-default"
                            checked={!form.defaultBadge}
                            onChange={() => setForm((prev) => ({ ...prev, defaultBadge: false }))}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="badge-category">
                        Badge category
                      </label>
                      <select
                        id="badge-category"
                        value={form.badgeCategoryId}
                        onChange={(event) => setForm((prev) => ({ ...prev, badgeCategoryId: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">No category</option>
                        {(badgeCategoriesQuery.data ?? []).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.title}
                          </option>
                        ))}
                      </select>
                      {badgeCategoriesQuery.isLoading && (
                        <p className="mt-1 text-xs text-slate-500">Loading categories…</p>
                      )}
                      {badgeCategoriesQuery.isError && (
                        <p className="mt-1 text-xs text-rose-500">Unable to load badge categories.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="badge-short-description">
                        Short description
                      </label>
                      <textarea
                        id="badge-short-description"
                        value={form.shortDescription}
                        onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                        className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Appears in badge listings"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="badge-long-description">
                        Long description
                      </label>
                      <textarea
                        id="badge-long-description"
                        value={form.longDescription}
                        onChange={(event) => setForm((prev) => ({ ...prev, longDescription: event.target.value }))}
                        className="min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Detail how this badge should be used"
                      />
                    </div>
                  </div>
                )}
                <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPanelMode('list');
                      setEditingId(null);
                      setForm({ ...defaultFormState });
                      setIconPreview(null);
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
                    {isSaving ? 'Saving…' : isCreate ? 'Create badge' : 'Save changes'}
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

export default BadgesPage;
