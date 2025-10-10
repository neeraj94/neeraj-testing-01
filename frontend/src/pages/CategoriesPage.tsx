import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type {
  Category,
  CategoryAssetUploadResponse,
  CategoryOption,
  CategoryPage,
  CategoryType
} from '../types/category';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';

interface CategoryFormState {
  name: string;
  slug: string;
  type: CategoryType;
  parentId: string;
  orderNumber: string;
  bannerUrl: string;
  iconUrl: string;
  coverUrl: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  metaCanonicalUrl: string;
  metaRobots: string;
  metaOgTitle: string;
  metaOgDescription: string;
  metaOgImage: string;
}

interface CategoryPayload {
  name: string;
  slug: string;
  type: CategoryType;
  parentId: number | null;
  orderNumber: number | null;
  bannerUrl: string;
  iconUrl: string;
  coverUrl: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  metaCanonicalUrl: string;
  metaRobots: string;
  metaOgTitle: string;
  metaOgDescription: string;
  metaOgImage: string;
}

type AssetUploadType = 'banner' | 'icon' | 'cover';

type AssetUploadVariables = { type: AssetUploadType; file: File };

type AssetUploadResult = { type: AssetUploadType; data: CategoryAssetUploadResponse };

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const defaultFormState: CategoryFormState = {
  name: '',
  slug: '',
  type: 'PHYSICAL',
  parentId: '',
  orderNumber: '',
  bannerUrl: '',
  iconUrl: '',
  coverUrl: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  metaCanonicalUrl: '',
  metaRobots: '',
  metaOgTitle: '',
  metaOgDescription: '',
  metaOgImage: ''
};

const categoryTypeOptions: { value: CategoryType; label: string }[] = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'DIGITAL', label: 'Digital' }
];

const CategoriesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<CategoryFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'seo'>('general');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['CATEGORY_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['CATEGORY_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['CATEGORY_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const categoriesQuery = useQuery<CategoryPage>({
    queryKey: ['categories', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<CategoryPage>('/categories', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const categoryOptionsQuery = useQuery<CategoryOption[]>({
    queryKey: ['category-options'],
    queryFn: async () => {
      const { data } = await api.get<CategoryOption[]>('/categories/options');
      return data;
    }
  });

  const categoryOptions = useMemo(() => {
    const options = categoryOptionsQuery.data ?? [];
    if (editingId == null) {
      return options;
    }
    return options.filter((option) => option.id !== editingId);
  }, [categoryOptionsQuery.data, editingId]);

  const createMutation = useMutation<Category, unknown, CategoryPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Category>('/categories', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Category created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-options'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create category.') });
    }
  });

  const updateMutation = useMutation<Category, unknown, { id: number; payload: CategoryPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put<Category>(`/categories/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Category updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-options'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update category.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Category deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-options'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete category.') });
    }
  });

  const assetUploadMutation = useMutation<AssetUploadResult, unknown, AssetUploadVariables>({
    mutationFn: async ({ type, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<CategoryAssetUploadResponse>(`/categories/assets/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return { type, data };
    },
    onSuccess: ({ type, data }) => {
      setForm((prev) => {
        if (type === 'banner') {
          setBannerPreview(data.url);
          return { ...prev, bannerUrl: data.url };
        }
        if (type === 'icon') {
          setIconPreview(data.url);
          return { ...prev, iconUrl: data.url };
        }
        setCoverPreview(data.url);
        return { ...prev, coverUrl: data.url };
      });
      notify({ type: 'success', message: 'Image uploaded successfully.' });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to upload image.') });
    }
  });

  const openCreateForm = () => {
    setForm({ ...defaultFormState });
    setFormError(null);
    setEditingId(null);
    setPanelMode('create');
    setActiveTab('general');
    setBannerPreview(null);
    setIconPreview(null);
    setCoverPreview(null);
  };

  const openEditForm = (category: Category) => {
    setForm({
      name: category.name,
      slug: category.slug ?? '',
      type: category.type ?? 'PHYSICAL',
      parentId: category.parentId != null ? String(category.parentId) : '',
      orderNumber: category.orderNumber != null ? String(category.orderNumber) : '',
      bannerUrl: category.bannerUrl ?? '',
      iconUrl: category.iconUrl ?? '',
      coverUrl: category.coverUrl ?? '',
      metaTitle: category.metaTitle ?? '',
      metaDescription: category.metaDescription ?? '',
      metaKeywords: category.metaKeywords ?? '',
      metaCanonicalUrl: category.metaCanonicalUrl ?? '',
      metaRobots: category.metaRobots ?? '',
      metaOgTitle: category.metaOgTitle ?? '',
      metaOgDescription: category.metaOgDescription ?? '',
      metaOgImage: category.metaOgImage ?? ''
    });
    setFormError(null);
    setEditingId(category.id);
    setPanelMode('edit');
    setActiveTab('general');
    setBannerPreview(category.bannerUrl ?? null);
    setIconPreview(category.iconUrl ?? null);
    setCoverPreview(category.coverUrl ?? null);
  };

  const closeForm = () => {
    setPanelMode('list');
    setFormError(null);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }

    const parsedOrderNumber = form.orderNumber.trim() === '' ? null : Number(form.orderNumber);
    if (parsedOrderNumber != null && Number.isNaN(parsedOrderNumber)) {
      setFormError('Ordering number must be a valid number.');
      return;
    }

    const payload: CategoryPayload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      type: form.type,
      parentId: form.parentId ? Number(form.parentId) : null,
      orderNumber: parsedOrderNumber,
      bannerUrl: form.bannerUrl.trim(),
      iconUrl: form.iconUrl.trim(),
      coverUrl: form.coverUrl.trim(),
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
      setFormError(extractErrorMessage(error, 'Failed to save category.'));
    }
  };

  const handleDelete = async (category: Category) => {
    if (!canDelete) {
      return;
    }
    const confirmed = window.confirm(
      `Delete category "${category.name}"? Child categories will need to be reassigned first.`
    );
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(category.id);
  };

  const handleAssetSelect = (type: AssetUploadType) => {
    if (type === 'banner') {
      bannerInputRef.current?.click();
      return;
    }
    if (type === 'icon') {
      iconInputRef.current?.click();
      return;
    }
    coverInputRef.current?.click();
  };

  const handleAssetFileChange = async (type: AssetUploadType, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await assetUploadMutation.mutateAsync({ type, file });
    }
    event.target.value = '';
  };

  const handleAssetRemove = (type: AssetUploadType) => {
    if (type === 'banner') {
      setForm((prev) => ({ ...prev, bannerUrl: '' }));
      setBannerPreview(null);
      return;
    }
    if (type === 'icon') {
      setForm((prev) => ({ ...prev, iconUrl: '' }));
      setIconPreview(null);
      return;
    }
    setForm((prev) => ({ ...prev, coverUrl: '' }));
    setCoverPreview(null);
  };

  const categories = categoriesQuery.data?.content ?? [];
  const totalElements = categoriesQuery.data?.totalElements ?? 0;
  const uploadingType = assetUploadMutation.isPending ? assetUploadMutation.variables?.type : null;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(value));

  const renderDirectory = () => (
    <PageSection padded={false} bodyClassName="flex flex-col">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search categories"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Parent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</th>
              {(canUpdate || canDelete) && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {categoriesQuery.isLoading ? (
              <tr>
                <td colSpan={canUpdate || canDelete ? 5 : 4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading categories…
                </td>
              </tr>
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <tr key={category.id} className="transition hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {(category.iconUrl || category.bannerUrl || category.coverUrl) ? (
                        <img
                          src={category.iconUrl || category.bannerUrl || category.coverUrl || ''}
                          alt="Category visual"
                          className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                          {category.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{category.name}</span>
                        <span className="text-xs text-slate-500">{category.slug || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {category.type === 'DIGITAL' ? 'Digital' : 'Physical'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{category.parentName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(category.updatedAt)}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditForm(category)}
                            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                            aria-label={`Edit ${category.name}`}
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
                            aria-label={`Delete ${category.name}`}
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
                  No categories found.
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
    const isCreate = panelMode === 'create';
    const isSaving = createMutation.isPending || updateMutation.isPending;
    const headerTitle = isCreate ? 'Create category' : form.name || 'Edit category';
    const headerSubtitle = isCreate
      ? 'Organize products with storefront-ready categories.'
      : editingId
      ? `#${editingId} category`
      : '';

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
              aria-label="Back to category directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {isCreate ? 'New category' : 'Edit category'}
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-name">
                      Name
                    </label>
                    <input
                      id="category-name"
                      type="text"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Footwear"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-type">
                      Type
                    </label>
                    <select
                      id="category-type"
                      value={form.type}
                      onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as CategoryType }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {categoryTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-parent">
                      Parent category <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <select
                      id="category-parent"
                      value={form.parentId}
                      onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">No parent</option>
                      {categoryOptions.map((option) => (
                        <option key={option.id} value={String(option.id)}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-order">
                      Ordering number <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="category-order"
                      type="number"
                      value={form.orderNumber}
                      onChange={(event) => setForm((prev) => ({ ...prev, orderNumber: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {(
                      [
                        {
                          key: 'banner' as AssetUploadType,
                          label: 'Banner image',
                          description: 'Recommended 1440×400px.',
                          preview: bannerPreview,
                          value: form.bannerUrl
                        },
                        {
                          key: 'icon' as AssetUploadType,
                          label: 'Icon',
                          description: 'Square icon for navigation menus.',
                          preview: iconPreview,
                          value: form.iconUrl
                        },
                        {
                          key: 'cover' as AssetUploadType,
                          label: 'Cover image',
                          description: 'Used on landing pages and featured sections.',
                          preview: coverPreview,
                          value: form.coverUrl
                        }
                      ] as const
                    ).map((asset) => (
                      <div key={asset.key} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{asset.label}</p>
                            <p className="text-xs text-slate-500">{asset.description}</p>
                          </div>
                        </div>
                        <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                          {asset.preview ? (
                            <img src={asset.preview} alt={`${asset.label} preview`} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs text-slate-400">No image</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAssetSelect(asset.key)}
                            disabled={uploadingType === asset.key}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {uploadingType === asset.key ? 'Uploading…' : 'Upload image'}
                          </button>
                          {asset.preview && (
                            <button
                              type="button"
                              onClick={() => handleAssetRemove(asset.key)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {asset.value && !asset.preview && (
                          <p className="break-words text-xs text-slate-500">{asset.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-slug">
                      Slug <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="category-slug"
                      type="text"
                      value={form.slug}
                      onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="footwear"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-meta-title">
                      Meta title <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="category-meta-title"
                      type="text"
                      value={form.metaTitle}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaTitle: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Footwear — Latest arrivals"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-meta-description">
                      Meta description <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="category-meta-description"
                      value={form.metaDescription}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaDescription: event.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Showcase product highlights and primary search keywords."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-meta-keywords">
                      Meta keywords <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="category-meta-keywords"
                      type="text"
                      value={form.metaKeywords}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaKeywords: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="sneakers, loafers, sandals"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-meta-canonical">
                      Canonical URL <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="category-meta-canonical"
                      type="url"
                      value={form.metaCanonicalUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaCanonicalUrl: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="https://example.com/categories/footwear"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-meta-robots">
                      Robots directive <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="category-meta-robots"
                      type="text"
                      value={form.metaRobots}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaRobots: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="index,follow"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-og-title">
                      Open Graph title <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="category-og-title"
                      type="text"
                      value={form.metaOgTitle}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaOgTitle: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Shop the latest footwear"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-og-description">
                      Open Graph description <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="category-og-description"
                      value={form.metaOgDescription}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaOgDescription: event.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Curated picks for every season and occasion."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-og-image">
                      Open Graph image URL <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="category-og-image"
                      type="url"
                      value={form.metaOgImage}
                      onChange={(event) => setForm((prev) => ({ ...prev, metaOgImage: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="https://cdn.example.com/categories/footwear-social.png"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Keep SEO fields optional—publish the essentials for discovery.</span>
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
              {isSaving ? 'Saving…' : isCreate ? 'Create category' : 'Save changes'}
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
        title="Categories"
        description="Structure your catalog with hierarchical categories, upload merchandising imagery, and manage SEO essentials."
        actions={
          isDirectoryView && canCreate
            ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                >
                  New category
                </button>
              )
            : undefined
        }
      />

      <input
        type="file"
        accept="image/*"
        ref={bannerInputRef}
        className="hidden"
        onChange={(event) => handleAssetFileChange('banner', event)}
      />
      <input
        type="file"
        accept="image/*"
        ref={iconInputRef}
        className="hidden"
        onChange={(event) => handleAssetFileChange('icon', event)}
      />
      <input
        type="file"
        accept="image/*"
        ref={coverInputRef}
        className="hidden"
        onChange={(event) => handleAssetFileChange('cover', event)}
      />

      {isDirectoryView ? renderDirectory() : renderForm()}
    </div>
  );
};

export default CategoriesPage;
