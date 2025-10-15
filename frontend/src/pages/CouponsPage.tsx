import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import ImagePreview from '../components/ImagePreview';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import { extractErrorMessage } from '../utils/errors';
import type { PermissionKey } from '../types/auth';
import type {
  CouponCategorySummary,
  CouponDetail,
  CouponFormState,
  CouponPage,
  CouponProductSummary,
  CouponState,
  CouponSummary,
  CouponType,
  CouponUserSummary,
  SaveCouponPayload
} from '../types/coupon';
import type { DiscountType } from '../types/product';
import type { MediaSelection } from '../types/uploaded-file';

const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [6, 12, 24];
const STATUS_DISPLAY: Record<CouponState, { label: string; tone: string; bg: string }> = {
  ENABLED: { label: 'Enabled', tone: 'text-emerald-700', bg: 'bg-emerald-100' },
  DISABLED: { label: 'Disabled', tone: 'text-amber-700', bg: 'bg-amber-100' },
  EXPIRED: { label: 'Expired', tone: 'text-rose-700', bg: 'bg-rose-100' }
};

const formatAmount = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

interface UploadedFileUploadResponse {
  url: string;
  storageKey?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

const defaultFormState = (): CouponFormState => {
  const now = new Date();
  const plusSeven = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    type: 'PRODUCT',
    name: '',
    code: '',
    shortDescription: '',
    longDescription: '',
    discountType: 'PERCENTAGE',
    discountValue: '10',
    minimumCartValue: '',
    startDate: formatDateForInput(now),
    endDate: formatDateForInput(plusSeven),
    status: 'ENABLED',
    applyToAllNewUsers: true,
    productIds: [],
    categoryIds: [],
    userIds: [],
    image: null,
    imageUrl: ''
  };
};

const formatDate = (value: string) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

function formatDateForInput(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return normalized.toISOString().slice(0, 16);
}

const parseInputDate = (value: string) => (value ? new Date(value).toISOString() : '');

const CouponsPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CouponType | 'ALL'>('ALL');
  const [stateFilter, setStateFilter] = useState<CouponState | 'ALL'>('ALL');
  const [discountFilter, setDiscountFilter] = useState<DiscountType | 'ALL'>('ALL');
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<CouponFormState>(() => defaultFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [productSearchDraft, setProductSearchDraft] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categorySearchDraft, setCategorySearchDraft] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [productCache, setProductCache] = useState<Record<number, CouponProductSummary>>({});
  const [categoryCache, setCategoryCache] = useState<Record<number, CouponCategorySummary>>({});

  const openDetailModal = useCallback((couponId: number) => {
    setSelectedCouponId(couponId);
    setDetailModalOpen(true);
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedCouponId(null);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchDraft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProductSearch(productSearchDraft.trim());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [productSearchDraft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCategorySearch(categorySearchDraft.trim());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [categorySearchDraft]);

  useEffect(() => {
    if (!isDetailModalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetailModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailModalOpen, closeDetailModal]);

  const canManageCoupons = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['COUPON_MANAGE']),
    [permissions]
  );

  const couponsQuery = useQuery<CouponPage>({
    queryKey: [
      'coupons',
      {
        page,
        size: pageSize,
        search,
        type: typeFilter,
        state: stateFilter,
        discountType: discountFilter
      }
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize };
      if (search) params.search = search;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (stateFilter !== 'ALL') params.state = stateFilter;
      if (discountFilter !== 'ALL') params.discountType = discountFilter;
      const { data } = await api.get<CouponPage>('/coupons', { params });
      return data;
    }
  });

  const coupons = couponsQuery.data?.content ?? [];
  const totalElements = couponsQuery.data?.totalElements ?? 0;

  const detailQuery = useQuery<CouponDetail>({
    queryKey: ['coupon', selectedCouponId],
    queryFn: async () => {
      const { data } = await api.get<CouponDetail>(`/coupons/${selectedCouponId}`);
      return data;
    },
    enabled: selectedCouponId != null
  });

  const editDetailQuery = useQuery<CouponDetail>({
    queryKey: ['coupon-edit', editingId],
    queryFn: async () => {
      const { data } = await api.get<CouponDetail>(`/coupons/${editingId}`);
      return data;
    },
    enabled: panelMode === 'edit' && editingId != null
  });

  const productOptionsQuery = useQuery<CouponProductSummary[]>({
    queryKey: ['coupon-product-options', panelMode, form.type, productSearch],
    queryFn: async () => {
      const params: Record<string, unknown> = { size: 50 };
      if (productSearch) {
        params.search = productSearch;
      }
      const { data } = await api.get<CouponProductSummary[]>('/coupons/reference/products', {
        params
      });
      return data;
    },
    enabled: panelMode !== 'list' && form.type === 'PRODUCT'
  });

  const categoryOptionsQuery = useQuery<CouponCategorySummary[]>({
    queryKey: ['coupon-category-options', panelMode, form.type, categorySearch],
    queryFn: async () => {
      const params: Record<string, unknown> = { size: 50 };
      if (categorySearch) {
        params.search = categorySearch;
      }
      const { data } = await api.get<CouponCategorySummary[]>('/coupons/reference/categories', {
        params
      });
      return data;
    },
    enabled: panelMode !== 'list' && form.type === 'PRODUCT'
  });

  const userOptionsQuery = useQuery<CouponUserSummary[]>({
    queryKey: ['coupon-user-options', panelMode, form.type],
    queryFn: async () => {
      const { data } = await api.get<CouponUserSummary[]>('/coupons/reference/users', {
        params: { size: 50 }
      });
      return data;
    },
    enabled: panelMode !== 'list' && form.type === 'NEW_SIGNUP'
  });

  const productOptions = productOptionsQuery.data ?? [];
  const categoryOptions = categoryOptionsQuery.data ?? [];
  const userOptions = userOptionsQuery.data ?? [];

  const selectedProducts = useMemo(
    () => form.productIds.map((id) => productCache[id]).filter((item): item is CouponProductSummary => Boolean(item)),
    [form.productIds, productCache]
  );

  const selectedCategories = useMemo(
    () =>
      form.categoryIds
        .map((id) => categoryCache[id])
        .filter((item): item is CouponCategorySummary => Boolean(item)),
    [form.categoryIds, categoryCache]
  );

  useEffect(() => {
    if (!productOptionsQuery.data) {
      return;
    }
    setProductCache((previous) => {
      const next = { ...previous };
      productOptionsQuery.data?.forEach((product) => {
        next[product.id] = product;
      });
      return next;
    });
  }, [productOptionsQuery.data]);

  useEffect(() => {
    if (!categoryOptionsQuery.data) {
      return;
    }
    setCategoryCache((previous) => {
      const next = { ...previous };
      categoryOptionsQuery.data?.forEach((category) => {
        next[category.id] = category;
      });
      return next;
    });
  }, [categoryOptionsQuery.data]);

  useEffect(() => {
    if (panelMode !== 'edit') {
      return;
    }
    if (!editDetailQuery.data || editDetailQuery.isLoading || editDetailQuery.isError) {
      return;
    }
    const detail = editDetailQuery.data;
    setForm({
      type: detail.type,
      name: detail.name,
      code: detail.code,
      shortDescription: detail.shortDescription ?? '',
      longDescription: detail.longDescription ?? '',
      discountType: detail.discountType,
      discountValue: detail.discountValue.toString(),
      minimumCartValue: detail.minimumCartValue != null ? detail.minimumCartValue.toString() : '',
      startDate: formatDateForInput(detail.startDate),
      endDate: formatDateForInput(detail.endDate),
      status: detail.status,
      applyToAllNewUsers: detail.applyToAllNewUsers,
      productIds: detail.products.map((product) => product.id),
      categoryIds: detail.categories.map((category) => category.id),
      userIds: detail.users.map((user) => user.id),
      image: detail.imageUrl ? { url: detail.imageUrl } : null,
      imageUrl: detail.imageUrl ?? ''
    });
    setFormError(null);
    setProductCache((previous) => {
      const next = { ...previous };
      detail.products.forEach((product) => {
        next[product.id] = product;
      });
      return next;
    });
    setCategoryCache((previous) => {
      const next = { ...previous };
      detail.categories.forEach((category) => {
        next[category.id] = category;
      });
      return next;
    });
    setProductSearchDraft('');
    setProductSearch('');
    setCategorySearchDraft('');
    setCategorySearch('');
  }, [panelMode, editDetailQuery.data, editDetailQuery.isLoading, editDetailQuery.isError]);

  const createMutation = useMutation({
    mutationFn: async (payload: SaveCouponPayload) => {
      const { data } = await api.post<CouponDetail>('/coupons', payload);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: `Coupon ${data.code} created.` });
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      closeForm();
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create coupon.') });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: SaveCouponPayload }) => {
      const { data } = await api.put<CouponDetail>(`/coupons/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: `Coupon ${data.code} updated.` });
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      if (selectedCouponId === data.id) {
        queryClient.invalidateQueries({ queryKey: ['coupon', data.id] });
      }
      closeForm();
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update coupon.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/coupons/${id}`);
    },
    onSuccess: (_, id) => {
      notify({ type: 'success', message: 'Coupon deleted.' });
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      if (selectedCouponId === id) {
        closeDetailModal();
      }
      if (editingId === id) {
        closeForm();
      }
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete coupon.') });
    }
  });

  const openCreateForm = () => {
    setForm(defaultFormState());
    setFormError(null);
    setEditingId(null);
    setSelectedCouponId(null);
    setDetailModalOpen(false);
    setPanelMode('create');
    setProductSearchDraft('');
    setProductSearch('');
    setCategorySearchDraft('');
    setCategorySearch('');
    setProductCache({});
    setCategoryCache({});
  };

  const openEditForm = (id: number) => {
    setForm(defaultFormState());
    setFormError(null);
    setEditingId(id);
    setSelectedCouponId(null);
    setDetailModalOpen(false);
    setPanelMode('edit');
    setProductSearchDraft('');
    setProductSearch('');
    setCategorySearchDraft('');
    setCategorySearch('');
    setProductCache({});
    setCategoryCache({});
  };

  const closeForm = () => {
    setPanelMode('list');
    setEditingId(null);
    setForm(defaultFormState());
    setFormError(null);
    setMediaLibraryOpen(false);
    setDetailModalOpen(false);
    setProductSearchDraft('');
    setProductSearch('');
    setCategorySearchDraft('');
    setCategorySearch('');
    setProductCache({});
    setCategoryCache({});
  };

  const handleDelete = async (coupon: CouponSummary) => {
    const confirmed = await confirm({
      title: 'Delete coupon',
      description: `Are you sure you want to delete ${coupon.code}? This action cannot be undone.`,
      confirmLabel: 'Delete coupon',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(coupon.id);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Coupon name is required.');
      return;
    }
    if (!form.code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setFormError('Start and end date are required.');
      return;
    }
    const discountValue = Number(form.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError('Enter a valid discount value greater than zero.');
      return;
    }
    let minimumCartValue: number | null = null;
    if (form.type === 'CART_VALUE') {
      minimumCartValue = Number(form.minimumCartValue);
      if (!Number.isFinite(minimumCartValue) || minimumCartValue <= 0) {
        setFormError('Minimum cart value must be greater than zero.');
        return;
      }
    }
    if (form.type === 'PRODUCT') {
      if (form.productIds.length === 0 && form.categoryIds.length === 0) {
        setFormError('Select at least one product or category.');
        return;
      }
    }
    if (form.type === 'NEW_SIGNUP' && !form.applyToAllNewUsers && form.userIds.length === 0) {
      setFormError('Select specific users or enable apply to all new users.');
      return;
    }

    const payload: SaveCouponPayload = {
      type: form.type,
      name: form.name.trim(),
      code: form.code.trim(),
      shortDescription: form.shortDescription.trim() || undefined,
      longDescription: form.longDescription.trim() || undefined,
      discountType: form.discountType,
      discountValue,
      minimumCartValue: form.type === 'CART_VALUE' ? minimumCartValue ?? undefined : undefined,
      startDate: parseInputDate(form.startDate),
      endDate: parseInputDate(form.endDate),
      status: form.status,
      imageUrl: form.image?.url?.trim() || form.imageUrl.trim() || undefined,
      productIds: form.type === 'PRODUCT' ? form.productIds : undefined,
      categoryIds: form.type === 'PRODUCT' ? form.categoryIds : undefined,
      userIds: form.type === 'NEW_SIGNUP' && !form.applyToAllNewUsers ? form.userIds : undefined,
      applyToAllNewUsers: form.type === 'NEW_SIGNUP' ? form.applyToAllNewUsers : undefined
    };

    if (panelMode === 'create') {
      createMutation.mutate(payload);
    } else if (panelMode === 'edit' && editingId != null) {
      updateMutation.mutate({ id: editingId, payload });
    }
  };

  const handleMediaSelect = (selection: MediaSelection) => {
    setForm((previous) => ({
      ...previous,
      image: selection,
      imageUrl: selection.url
    }));
    setMediaLibraryOpen(false);
  };

  const handleMediaUpload = async (files: File[]): Promise<MediaSelection[]> => {
    const sanitized = files.filter(Boolean);
    if (!sanitized.length) {
      return [];
    }
    const formData = new FormData();
    sanitized.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('module', 'COUPON_MEDIA');
    try {
      const { data } = await api.post<UploadedFileUploadResponse[]>('/uploaded-files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploads = (data ?? []).filter(
        (item): item is UploadedFileUploadResponse => Boolean(item && item.url)
      );
      if (!uploads.length) {
        throw new Error('Upload failed');
      }
      notify({ type: 'success', message: uploads.length === 1 ? 'Image uploaded.' : 'Images uploaded.' });
      return uploads.map((item) => ({
        url: item.url,
        storageKey: item.storageKey ?? undefined,
        originalFilename: item.originalFilename ?? undefined,
        mimeType: item.mimeType ?? undefined,
        sizeBytes: item.sizeBytes ?? undefined
      }));
    } catch (error) {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to upload image.') });
      throw error;
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderFilters = () => (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="coupon-search">
            Search
          </label>
          <input
            id="coupon-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search by name or code"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="coupon-type-filter">
            Type
          </label>
          <select
            id="coupon-type-filter"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as CouponType | 'ALL');
              setPage(0);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All types</option>
            <option value="PRODUCT">Product based</option>
            <option value="CART_VALUE">Cart value</option>
            <option value="NEW_SIGNUP">New signup</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="coupon-state-filter">
            Status
          </label>
          <select
            id="coupon-state-filter"
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value as CouponState | 'ALL');
              setPage(0);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All statuses</option>
            <option value="ENABLED">Enabled</option>
            <option value="DISABLED">Disabled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <div>
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
            htmlFor="coupon-discount-filter"
          >
            Discount type
          </label>
          <select
            id="coupon-discount-filter"
            value={discountFilter}
            onChange={(event) => {
              setDiscountFilter(event.target.value as DiscountType | 'ALL');
              setPage(0);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">All discounts</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FLAT">Flat amount</option>
          </select>
        </div>
      </div>
      {canManageCoupons && (
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600"
        >
          New coupon
        </button>
      )}
    </div>
  );

  const renderCouponCard = (coupon: CouponSummary) => {
    const statusDisplay = STATUS_DISPLAY[coupon.state];
    return (
      <article key={coupon.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {coupon.imageUrl && (
          <div className="relative h-32 w-full overflow-hidden bg-slate-100">
            <img src={coupon.imageUrl} alt={coupon.name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{coupon.name}</h3>
              <p className="text-sm text-slate-500">Code: {coupon.code}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusDisplay.bg} ${statusDisplay.tone}`}>
              {statusDisplay.label}
            </span>
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-700">Type:</span> {coupon.type === 'PRODUCT' ? 'Product based' : coupon.type === 'CART_VALUE' ? 'Cart value' : 'New signup'}
            </p>
            <p>
              <span className="font-medium text-slate-700">Discount:</span>{' '}
              {coupon.discountType === 'PERCENTAGE'
                ? `${coupon.discountValue}%`
                : `Flat ${formatAmount(coupon.discountValue)}`}
            </p>
            <p>
              <span className="font-medium text-slate-700">Valid:</span> {formatDate(coupon.startDate)} – {formatDate(coupon.endDate)}
            </p>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openDetailModal(coupon.id)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              View details
            </button>
            {canManageCoupons && (
              <>
                <button
                  type="button"
                  onClick={() => openEditForm(coupon.id)}
                  className="rounded-lg border border-primary/30 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(coupon)}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  disabled={deleteMutation.isPending && deleteMutation.variables === coupon.id}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  const renderDetailDialog = () => {
    if (!isDetailModalOpen || !selectedCouponId) {
      return null;
    }

    const renderHeader = (title: string, subtitle?: string) => (
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            closeDetailModal();
          }}
          className="inline-flex items-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Close details"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      </div>
    );

    let body: JSX.Element;

    if (detailQuery.isLoading) {
      body = (
        <div className="space-y-4">
          {renderHeader('Coupon details')}
          <p className="text-sm text-slate-500">Loading details…</p>
        </div>
      );
    } else if (detailQuery.isError || !detailQuery.data) {
      body = (
        <div className="space-y-4">
          {renderHeader('Coupon details')}
          <p className="text-sm text-rose-500">Unable to load coupon details.</p>
        </div>
      );
    } else {
      const detail = detailQuery.data;
      const statusDisplay = STATUS_DISPLAY[detail.state];
      body = (
        <div className="space-y-6">
          {renderHeader(detail.name, `Code: ${detail.code}`)}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusDisplay.bg} ${statusDisplay.tone}`}
            >
              {statusDisplay.label}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {detail.type === 'PRODUCT'
                ? 'Product coupon'
                : detail.type === 'CART_VALUE'
                  ? 'Cart value coupon'
                  : 'New signup coupon'}
            </span>
          </div>
          {detail.imageUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <img src={detail.imageUrl} alt={detail.name} className="max-h-64 w-full object-cover" />
            </div>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600">
                <div>
                  <dt className="font-medium text-slate-700">Description</dt>
                  <dd>{detail.shortDescription || detail.longDescription || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Discount</dt>
                  <dd>
                    {detail.discountType === 'PERCENTAGE'
                      ? `${detail.discountValue}%`
                      : `Flat ${formatAmount(detail.discountValue)}`}
                  </dd>
                </div>
                {detail.type === 'CART_VALUE' && (
                  <div>
                    <dt className="font-medium text-slate-700">Minimum cart value</dt>
                    <dd>{detail.minimumCartValue != null ? formatAmount(detail.minimumCartValue) : '—'}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-slate-700">Validity</dt>
                  <dd>
                    {formatDate(detail.startDate)} – {formatDate(detail.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Created</dt>
                  <dd>{formatDate(detail.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Updated</dt>
                  <dd>{formatDate(detail.updatedAt)}</dd>
                </div>
              </dl>
            </div>
            <div className="space-y-6">
              {detail.type === 'PRODUCT' && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">Eligible catalog items</h4>
                  <div className="mt-2 space-y-2 text-sm text-slate-600">
                    {detail.products.length > 0 ? (
                      detail.products.map((product) => (
                        <div key={product.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-500">
                              {product.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-slate-700">{product.name}</p>
                            <p className="text-xs text-slate-500">SKU: {product.sku || '—'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                        No specific products selected.
                      </p>
                    )}
                    {detail.categories.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</h5>
                        {detail.categories.map((category) => (
                          <div key={category.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                            {category.imageUrl ? (
                              <img src={category.imageUrl} alt={category.name} className="h-10 w-10 rounded object-cover" />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-500">
                                {category.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <p className="font-medium text-slate-700">{category.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {detail.type === 'NEW_SIGNUP' && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">Eligible users</h4>
                  {detail.applyToAllNewUsers ? (
                    <p className="mt-2 text-sm text-slate-600">Applies to all newly registered users.</p>
                  ) : detail.users.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {detail.users.map((user) => (
                        <li key={user.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                              {user.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-slate-700">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email || '—'}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No specific users linked.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return createPortal(
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 py-8"
        onClick={closeDetailModal}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          {body}
        </div>
      </div>,
      document.body
    );
  };

  const renderForm = () => {
    return (
      <form onSubmit={handleFormSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
        <header className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {panelMode === 'create' ? 'Create coupon' : 'Edit coupon'}
          </h2>
          <p className="text-sm text-slate-500">
            Configure eligibility, timing, and messaging for this promotion.
          </p>
        </header>
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-name">
                Coupon name
              </label>
              <input
                id="coupon-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Holiday savings"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-code">
                Coupon code
              </label>
              <input
                id="coupon-code"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="SAVE20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-type">
                Coupon type
              </label>
              <select
                id="coupon-type"
                value={form.type}
                onChange={(event) => {
                  const nextType = event.target.value as CouponType;
                  setForm((prev) => ({
                    ...prev,
                    type: nextType,
                    productIds: nextType === 'PRODUCT' ? prev.productIds : [],
                    categoryIds: nextType === 'PRODUCT' ? prev.categoryIds : [],
                    userIds: nextType === 'NEW_SIGNUP' ? prev.userIds : [],
                    applyToAllNewUsers: nextType === 'NEW_SIGNUP' ? prev.applyToAllNewUsers : true,
                    minimumCartValue: nextType === 'CART_VALUE' ? prev.minimumCartValue : ''
                  }));
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="PRODUCT">Product based</option>
                <option value="CART_VALUE">Cart value</option>
                <option value="NEW_SIGNUP">New signup</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-status">
                Status
              </label>
              <select
                id="coupon-status"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as typeof prev.status }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ENABLED">Enabled</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-discount-type">
                Discount type
              </label>
              <select
                id="coupon-discount-type"
                value={form.discountType}
                onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value as DiscountType }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat value</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-discount-value">
                Discount value
              </label>
              <input
                id="coupon-discount-value"
                type="number"
                min={0}
                step={form.discountType === 'PERCENTAGE' ? 1 : 0.01}
                value={form.discountValue}
                onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {form.type === 'CART_VALUE' ? (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-min-cart">
                  Minimum cart value
                </label>
                <input
                  id="coupon-min-cart"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.minimumCartValue}
                  onChange={(event) => setForm((prev) => ({ ...prev, minimumCartValue: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="500"
                />
              </div>
            ) : (
              <div className="hidden md:block" aria-hidden="true" />
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-start">
                Start date
              </label>
              <input
                id="coupon-start"
                type="datetime-local"
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-end">
                End date
              </label>
              <input
                id="coupon-end"
                type="datetime-local"
                value={form.endDate}
                onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-short-description">
                Short description
              </label>
              <textarea
                id="coupon-short-description"
                value={form.shortDescription}
                onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Shown in coupon lists"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="coupon-long-description">
                Long description
              </label>
              <textarea
                id="coupon-long-description"
                value={form.longDescription}
                onChange={(event) => setForm((prev) => ({ ...prev, longDescription: event.target.value }))}
                className="min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Eligibility notes, restrictions, or messaging"
              />
            </div>
          </div>
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700">Media</h3>
              <p className="mt-1 text-xs text-slate-500">Optional artwork shown on coupon cards.</p>
              <div className="mt-4 space-y-3">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Coupon artwork" className="max-h-48 w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
                    No image selected
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaLibraryOpen(true)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Choose image
                  </button>
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, image: null, imageUrl: '' }))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            {form.type === 'PRODUCT' && (
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700">Catalog targeting</h3>
                <p className="mt-1 text-xs text-slate-500">Select specific products or categories.</p>
                <div className="mt-3 space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Products</h4>
                      {selectedProducts.length > 0 && (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                          {selectedProducts.length} selected
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <input
                          type="search"
                          value={productSearchDraft}
                          onChange={(event) => setProductSearchDraft(event.target.value)}
                          placeholder="Search products by name or SKU"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {productSearchDraft && (
                          <button
                            type="button"
                            onClick={() => setProductSearchDraft('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-inner">
                        {productOptionsQuery.isLoading ? (
                          <div className="px-4 py-3 text-sm text-slate-500">Loading products…</div>
                        ) : productOptionsQuery.isError ? (
                          <div className="px-4 py-3 text-sm text-rose-500">Unable to load products right now.</div>
                        ) : productOptions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-500">
                            {productSearch.trim() ? 'No products match your search.' : 'No products available.'}
                          </div>
                        ) : (
                          productOptions.map((product) => {
                            const checked = form.productIds.includes(product.id);
                            const label = product.name || `Product #${product.id}`;
                            return (
                              <label
                                key={product.id}
                                className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm transition last:border-b-0 ${
                                  checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                  checked={checked}
                                  onChange={(event) => {
                                    setForm((prev) => ({
                                      ...prev,
                                      productIds: event.target.checked
                                        ? [...prev.productIds, product.id]
                                        : prev.productIds.filter((id) => id !== product.id)
                                    }));
                                  }}
                                />
                                <ImagePreview
                                  src={product.imageUrl ?? undefined}
                                  alt={label}
                                  className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                                  aspectClassName=""
                                  mode="cover"
                                  fallback={
                                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                                      {label.charAt(0).toUpperCase()}
                                    </div>
                                  }
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-900">{label}</p>
                                  {product.sku && (
                                    <p className="mt-0.5 text-xs text-slate-500">SKU · {product.sku}</p>
                                  )}
                                </div>
                                {checked && (
                                  <span className="text-[11px] font-semibold uppercase text-primary">Selected</span>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                    {selectedProducts.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected products</h5>
                        <ul className="space-y-2">
                          {selectedProducts.map((product) => {
                            const label = product.name || `Product #${product.id}`;
                            return (
                              <li
                                key={product.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <ImagePreview
                                    src={product.imageUrl ?? undefined}
                                    alt={label}
                                    className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                                    aspectClassName=""
                                    fallback={
                                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                                        {label.charAt(0).toUpperCase()}
                                      </div>
                                    }
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{label}</p>
                                    {product.sku && <p className="text-xs text-slate-500">SKU · {product.sku}</p>}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      productIds: prev.productIds.filter((id) => id !== product.id)
                                    }))
                                  }
                                  className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                                  aria-label={`Remove ${label}`}
                                >
                                  ×
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</h4>
                      {selectedCategories.length > 0 && (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                          {selectedCategories.length} selected
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <input
                          type="search"
                          value={categorySearchDraft}
                          onChange={(event) => setCategorySearchDraft(event.target.value)}
                          placeholder="Search categories"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {categorySearchDraft && (
                          <button
                            type="button"
                            onClick={() => setCategorySearchDraft('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-inner">
                        {categoryOptionsQuery.isLoading ? (
                          <div className="px-4 py-3 text-sm text-slate-500">Loading categories…</div>
                        ) : categoryOptionsQuery.isError ? (
                          <div className="px-4 py-3 text-sm text-rose-500">Unable to load categories right now.</div>
                        ) : categoryOptions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-500">
                            {categorySearch.trim() ? 'No categories match your search.' : 'No categories available.'}
                          </div>
                        ) : (
                          categoryOptions.map((category) => {
                            const checked = form.categoryIds.includes(category.id);
                            const label = category.name || `Category #${category.id}`;
                            return (
                              <label
                                key={category.id}
                                className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-2 text-sm transition last:border-b-0 ${
                                  checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                  checked={checked}
                                  onChange={(event) => {
                                    setForm((prev) => ({
                                      ...prev,
                                      categoryIds: event.target.checked
                                        ? [...prev.categoryIds, category.id]
                                        : prev.categoryIds.filter((id) => id !== category.id)
                                    }));
                                  }}
                                />
                                <ImagePreview
                                  src={category.imageUrl ?? undefined}
                                  alt={label}
                                  className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                                  aspectClassName=""
                                  fallback={
                                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                                      {label.charAt(0).toUpperCase()}
                                    </div>
                                  }
                                />
                                <span className="text-slate-700">{label}</span>
                                {checked && (
                                  <span className="ml-auto text-[11px] font-semibold uppercase text-primary">Selected</span>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                    {selectedCategories.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedCategories.map((category) => {
                          const label = category.name || `Category #${category.id}`;
                          return (
                            <span
                              key={category.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                            >
                              {label}
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    categoryIds: prev.categoryIds.filter((id) => id !== category.id)
                                  }))
                                }
                                className="text-primary/70 transition hover:text-primary"
                                aria-label={`Remove ${label}`}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {form.type === 'NEW_SIGNUP' && (
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700">User targeting</h3>
                <p className="mt-1 text-xs text-slate-500">Choose whether this coupon applies to everyone or hand-picked users.</p>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                      checked={form.applyToAllNewUsers}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          applyToAllNewUsers: event.target.checked,
                          userIds: event.target.checked ? [] : prev.userIds
                        }))
                      }
                    />
                    <span>Automatically include all newly registered users</span>
                  </label>
                  {!form.applyToAllNewUsers && (
                    <div className="rounded-lg border border-slate-200 p-2">
                      {userOptionsQuery.isLoading ? (
                        <p className="text-sm text-slate-500">Loading users…</p>
                      ) : userOptions.length === 0 ? (
                        <p className="text-sm text-slate-500">No users available.</p>
                      ) : (
                        <div className="flex max-h-36 flex-col gap-2 overflow-y-auto">
                          {userOptions.map((user) => {
                            const checked = form.userIds.includes(user.id);
                            return (
                              <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 text-sm hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                  checked={checked}
                                  onChange={(event) => {
                                    setForm((prev) => ({
                                      ...prev,
                                      userIds: event.target.checked
                                        ? [...prev.userIds, user.id]
                                        : prev.userIds.filter((id) => id !== user.id)
                                    }));
                                  }}
                                />
                                <div>
                                  <p className="font-medium text-slate-700">{user.name}</p>
                                  <p className="text-xs text-slate-500">{user.email || '—'}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {formError && (
          <div className="px-6">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{formError}</div>
          </div>
        )}
        <footer className="mt-6 flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">Coupon codes must remain unique across the entire system.</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : panelMode === 'create' ? 'Create coupon' : 'Save changes'}
            </button>
          </div>
        </footer>
        <MediaLibraryDialog
          open={mediaLibraryOpen}
          onClose={() => setMediaLibraryOpen(false)}
          moduleFilters={['COUPON_MEDIA']}
          onSelect={handleMediaSelect}
          onUpload={handleMediaUpload}
        />
      </form>
    );
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Coupons"
        description="Create targeted promotions that reward shoppers at the right moment."
      />

      {renderFilters()}

      {panelMode === 'list' ? (
        <PageSection title="Available coupons">
          {couponsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading coupons…</p>
          ) : couponsQuery.isError ? (
            <p className="text-sm text-rose-500">Unable to load coupons. Please try again shortly.</p>
          ) : coupons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">No coupons yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Kickstart your first promotion by creating a coupon. Use filters to locate coupons quickly.
              </p>
              {canManageCoupons && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600"
                >
                  Create coupon
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {coupons.map((coupon) => renderCouponCard(coupon))}
              </div>
              <PaginationControls
                page={page}
                pageSize={pageSize}
                totalElements={totalElements}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(0);
                }}
              />
            </div>
          )}
        </PageSection>
      ) : (
        renderForm()
      )}

      {panelMode === 'list' && renderDetailDialog()}
    </div>
  );
};

export default CouponsPage;
