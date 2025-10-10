import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { Brand, BrandPage } from '../types/brand';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';

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

type FormMode = 'create' | 'edit';

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
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [form, setForm] = useState<BrandFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const openCreateModal = () => {
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setFormMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (brand: Brand) => {
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
    setFormMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Brand name is required.');
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
      if (formMode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (editingId != null) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      }
      closeModal();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Failed to save brand.'));
    }
  };

  const handleDelete = async (brand: Brand) => {
    if (!canDelete) {
      return;
    }
    const confirmed = window.confirm(`Delete brand "${brand.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(brand.id);
  };

  const totalElements = brandsQuery.data?.totalElements ?? 0;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(value));

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Brands"
        description="Manage e-commerce brands, update SEO metadata, and control how collections surface across the storefront."
        actions={
          canCreate
            ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                >
                  New brand
                </button>
              )
            : undefined
        }
      />

      <PageSection padded={false} bodyClassName="flex flex-col">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{brand.name}</span>
                        <span className="text-xs text-slate-500">{brand.metaTitle ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{brand.slug}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(brand.updatedAt)}</td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditModal(brand)}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {formMode === 'create' ? 'Create Brand' : 'Edit Brand'}
                </h2>
                <p className="text-sm text-slate-500">
                  Keep brand identities consistent and searchable with structured SEO metadata.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto px-6 py-4 md:grid-cols-2">
              <div className="md:col-span-2">
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
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="brand-logo">
                  Logo URL <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="brand-logo"
                  type="url"
                  value={form.logoUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://cdn.example.com/brands/aurora.svg"
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
                  placeholder="Premium lifestyle goods | Aurora Market"
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
              {formError && (
                <div className="md:col-span-2">
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{formError}</div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandsPage;
