import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { Brand, BrandLogoUploadResponse, BrandPage } from '../types/brand';
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

interface BrandFormState {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  metaCanonicalUrl: string;
  metaRobots: string;
  metaOgTitle: string;
  metaOgDescription: string;
  metaOgImage: string;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const defaultFormState: BrandFormState = {
  name: '',
  slug: '',
  description: '',
  logoUrl: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  metaCanonicalUrl: '',
  metaRobots: '',
  metaOgTitle: '',
  metaOgDescription: '',
  metaOgImage: ''
};

const BrandsPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<BrandFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'seo'>('general');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BRAND_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BRAND_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BRAND_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const brandsQuery = useQuery<BrandPage>({
    queryKey: ['brands', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<BrandPage>('/brands', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const brands = brandsQuery.data?.content ?? [];

  const createMutation = useMutation({
    mutationFn: async (payload: BrandFormState) => {
      const { data } = await api.post<Brand>('/brands', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Brand created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create brand.') });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: BrandFormState }) => {
      const { data } = await api.put<Brand>(`/brands/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Brand updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update brand.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/brands/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Brand deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete brand.') });
    }
  });

  const openCreateForm = () => {
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setPanelMode('create');
    setActiveTab('general');
    setLogoPreview(null);
  };

  const openEditForm = (brand: Brand) => {
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description ?? '',
      logoUrl: brand.logoUrl ?? '',
      metaTitle: brand.metaTitle ?? '',
      metaDescription: brand.metaDescription ?? '',
      metaKeywords: brand.metaKeywords ?? '',
      metaCanonicalUrl: brand.metaCanonicalUrl ?? '',
      metaRobots: brand.metaRobots ?? '',
      metaOgTitle: brand.metaOgTitle ?? '',
      metaOgDescription: brand.metaOgDescription ?? '',
      metaOgImage: brand.metaOgImage ?? ''
    });
    setFormError(null);
    setEditingId(brand.id);
    setPanelMode('edit');
    setActiveTab('general');
    setLogoPreview(brand.logoUrl ?? null);
  };

  const closeForm = () => {
    setPanelMode('list');
    setForm({ ...defaultFormState });
    setFormError(null);
    setActiveTab('general');
    setLogoPreview(null);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Brand name is required.');
      setActiveTab('general');
      return;
    }

    const payload: BrandFormState = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      logoUrl: form.logoUrl.trim(),
      metaTitle: form.metaTitle.trim(),
      metaDescription: form.metaDescription.trim(),
      metaKeywords: form.metaKeywords.trim(),
      metaCanonicalUrl: form.metaCanonicalUrl.trim(),
      metaRobots: form.metaRobots.trim(),
      metaOgTitle: form.metaOgTitle.trim(),
      metaOgDescription: form.metaOgDescription.trim(),
      metaOgImage: form.metaOgImage.trim()
    };

    try {
      if (panelMode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (panelMode === 'edit' && editingId != null) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      }
      closeForm();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Failed to save brand.'));
    }
  };

  const handleDelete = async (brand: Brand) => {
    if (!canDelete) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete brand?',
      description: `Delete brand "${brand.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(brand.id);
  };

  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<BrandLogoUploadResponse>('/brands/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: (data) => {
      setForm((prev) => ({ ...prev, logoUrl: data.url }));
      setLogoPreview(data.url);
      notify({ type: 'success', message: 'Logo uploaded successfully.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to upload logo.') });
    }
  });

  const handleLogoSelect = () => {
    setMediaLibraryOpen(true);
  };

  const handleLogoRemove = () => {
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    setLogoPreview(null);
  };

  const handleMediaUpload = async (files: File[]): Promise<MediaSelection[]> => {
    const [file] = files;
    if (!file) {
      return [];
    }
    const response = await logoUploadMutation.mutateAsync(file);
    return [
      {
        url: response.url,
        originalFilename: response.originalFilename,
        mimeType: response.mimeType,
        sizeBytes: response.sizeBytes
      }
    ];
  };

  const handleMediaSelect = (selection: MediaSelection) => {
    setForm((prev) => ({ ...prev, logoUrl: selection.url }));
    setLogoPreview(selection.url);
    setMediaLibraryOpen(false);
  };

  const totalElements = brandsQuery.data?.totalElements ?? 0;

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
          placeholder="Search brands"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Brand</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</th>
              {(canUpdate || canDelete) && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {brandsQuery.isLoading ? (
              <tr>
                <td colSpan={canUpdate || canDelete ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading brands…
                </td>
              </tr>
            ) : brands.length > 0 ? (
              brands.map((brand) => (
                <tr key={brand.id} className="transition hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt="Brand logo"
                          className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                          {brand.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{brand.name}</span>
                        <span className="text-xs text-slate-500">{brand.metaTitle ?? '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{brand.slug || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(brand.updatedAt)}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditForm(brand)}
                            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                            aria-label={`Edit ${brand.name}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(brand)}
                            className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                            aria-label={`Delete ${brand.name}`}
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
                <td colSpan={canUpdate || canDelete ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-500">
                  No brands found.
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
        isLoading={brandsQuery.isLoading}
      />
    </PageSection>
  );

  const renderForm = () => {
    const isCreate = panelMode === 'create';
    const isSaving = createMutation.isPending || updateMutation.isPending;
    const headerTitle = isCreate ? 'Create brand' : form.name || 'Edit brand';
    const headerSubtitle = isCreate
      ? 'Add a new brand to your storefront catalog.'
      : editingId
      ? `#${editingId} brand`
      : '';

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleSubmit();
    };

    return (
      <>
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
              aria-label="Back to brand directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {isCreate ? 'New brand' : 'Edit brand'}
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
              { key: 'seo', label: 'SEO & metadata' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'general' | 'seo')}
                className={`rounded-lg px-3 py-2 text-left transition ${
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100'
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
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-name">
                    Name
                  </label>
                  <input
                    id="brand-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Aurora Market"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium text-slate-700">Logo</span>
                  <p className="mb-3 text-xs text-slate-500">Upload a square logo in PNG, JPG, GIF, WEBP, or SVG format.</p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Brand logo preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm text-slate-400">No logo</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleLogoSelect}
                          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-600"
                          disabled={logoUploadMutation.isPending}
                        >
                          {logoUploadMutation.isPending ? 'Uploading…' : 'Upload logo'}
                        </button>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={handleLogoRemove}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {form.logoUrl && !logoPreview && (
                        <p className="break-words text-xs text-slate-500">{form.logoUrl}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-slug">
                      Slug <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="brand-slug"
                      type="text"
                      value={form.slug}
                      onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="aurora-market"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-description">
                      Description <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="brand-description"
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Short summary that appears on collection and landing pages."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-meta-title">
                      Meta title <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="brand-meta-title"
                      type="text"
                      value={form.metaTitle}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaTitle: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Aurora Market — Mindfully crafted essentials"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-meta-description">
                      Meta description <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="brand-meta-description"
                      value={form.metaDescription}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaDescription: event.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Crafted collections designed for mindful living and sustainable style."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-meta-keywords">
                      Meta keywords <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="brand-meta-keywords"
                      value={form.metaKeywords}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaKeywords: event.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="lifestyle, eco-friendly, apparel"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-meta-canonical">
                      Canonical URL <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="brand-meta-canonical"
                      type="url"
                      value={form.metaCanonicalUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaCanonicalUrl: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="https://example.com/brands/aurora"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-meta-robots">
                      Robots directive <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="brand-meta-robots"
                      type="text"
                      value={form.metaRobots}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaRobots: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="index,follow"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-og-title">
                      Open Graph title <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="brand-og-title"
                      type="text"
                      value={form.metaOgTitle}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaOgTitle: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Aurora Market — Elevated essentials"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-og-description">
                      Open Graph description <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="brand-og-description"
                      value={form.metaOgDescription}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaOgDescription: event.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Discover the story behind Aurora Market and explore curated looks for every occasion."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-og-image">
                      Open Graph image URL <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="brand-og-image"
                      type="url"
                      value={form.metaOgImage}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaOgImage: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="https://cdn.example.com/brands/aurora-social.png"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">
            Keep SEO fields optional—only publish what you need for discovery.
          </span>
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
              {isSaving ? 'Saving…' : isCreate ? 'Create brand' : 'Save changes'}
            </button>
          </div>
        </footer>
        </form>
        <MediaLibraryDialog
          open={mediaLibraryOpen}
          onClose={() => setMediaLibraryOpen(false)}
          moduleFilters={['BRAND_LOGO']}
          onSelect={handleMediaSelect}
          onUpload={handleMediaUpload}
        />
      </>
    );
  };

  const isDirectoryView = panelMode === 'list';

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Brands"
        description="Manage e-commerce brands, update SEO metadata, and control how collections surface across the storefront."
        actions={
          isDirectoryView && canCreate
            ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                >
                  New brand
                </button>
              )
            : undefined
        }
      />

      {isDirectoryView ? renderDirectory() : renderForm()}
    </div>
  );
};

export default BrandsPage;
