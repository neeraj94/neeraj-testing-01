import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import ImagePreview from '../components/ImagePreview';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import api from '../services/http';
import type {
  CouponCategorySummary,
  CouponDetail,
  CouponPage,
  CouponProductSummary,
  CouponStatus,
  CouponSummary,
  CouponType,
  CouponUserSummary,
  SaveCouponPayload
} from '../types/coupon';
import type { DiscountType, ProductSummary, ProductSummaryPage } from '../types/product';
import type { Category, CategoryPage } from '../types/category';
import type { Pagination, User } from '../types/models';
import type { MediaSelection } from '../types/uploaded-file';
import { extractErrorMessage } from '../utils/errors';
import { formatCurrency } from '../utils/currency';

const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [6, 12, 24];

const couponTypeLabels: Record<CouponType, string> = {
  PRODUCT: 'Product-based',
  CART_VALUE: 'Cart value-based',
  NEW_SIGNUP: 'New signup incentive'
};

const couponStatusStyles: Record<CouponStatus, string> = {
  ENABLED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  DISABLED: 'border-amber-200 bg-amber-50 text-amber-700',
  EXPIRED: 'border-rose-200 bg-rose-50 text-rose-700'
};

const discountTypeLabels: Record<DiscountType, string> = {
  FLAT: 'Flat value',
  PERCENTAGE: 'Percentage'
};

interface CouponFormState {
  type: CouponType;
  name: string;
  code: string;
  shortDescription: string;
  longDescription: string;
  discountType: DiscountType;
  discountValue: string;
  minimumCartValue: string;
  startDate: string;
  endDate: string;
  status: CouponStatus;
}

const defaultFormState: CouponFormState = {
  type: 'PRODUCT',
  name: '',
  code: '',
  shortDescription: '',
  longDescription: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minimumCartValue: '',
  startDate: '',
  endDate: '',
  status: 'ENABLED'
};

const sortOptions = [
  { value: 'CREATED_DESC', label: 'Newest first' },
  { value: 'CREATED_ASC', label: 'Oldest first' },
  { value: 'EXPIRING_ASC', label: 'Expiring soon' },
  { value: 'DISCOUNT_DESC', label: 'Highest discount' }
];

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

const formatDateRange = (start: string | null | undefined, end: string | null | undefined) => {
  const startText = formatDate(start);
  const endText = formatDate(end);
  return `${startText} → ${endText}`;
};

const resolveCouponImageUrl = (coupon: CouponSummary | CouponDetail) => {
  return coupon.image?.url ?? coupon.imageUrl ?? null;
};

const resolveUserName = (user: User): string => {
  if (user.fullName && user.fullName.trim()) {
    return user.fullName.trim();
  }
  const combined = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (combined) {
    return combined;
  }
  return user.email;
};

const CouponsPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const baseCurrency = useAppSelector(selectBaseCurrency);

  const canManage = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['COUPON_MANAGE']),
    [permissions]
  );

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CouponType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CouponStatus>('ALL');
  const [discountFilter, setDiscountFilter] = useState<'ALL' | DiscountType>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState(sortOptions[0].value);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<number, CouponDetail>>({});

  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [form, setForm] = useState<CouponFormState>({ ...defaultFormState });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [couponImage, setCouponImage] = useState<MediaSelection | null>(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<CouponProductSummary[]>([]);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const productSelectorRef = useRef<HTMLDivElement | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const [selectedCategories, setSelectedCategories] = useState<CouponCategorySummary[]>([]);
  const [categorySearch, setCategorySearch] = useState('');

  const [selectedUsers, setSelectedUsers] = useState<CouponUserSummary[]>([]);
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);
  const userSelectorRef = useRef<HTMLDivElement | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [applyToAllNewUsers, setApplyToAllNewUsers] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setPage(0);
  }, [typeFilter, statusFilter, discountFilter, fromDate, toDate, sort]);

  useEffect(() => {
    if (!productSelectorOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!productSelectorRef.current) {
        return;
      }
      if (!productSelectorRef.current.contains(event.target as Node)) {
        setProductSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [productSelectorOpen]);

  useEffect(() => {
    if (!userSelectorOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!userSelectorRef.current) {
        return;
      }
      if (!userSelectorRef.current.contains(event.target as Node)) {
        setUserSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userSelectorOpen]);

  useEffect(() => {
    if (form.type !== 'PRODUCT') {
      setProductSelectorOpen(false);
    }
    if (form.type !== 'NEW_SIGNUP') {
      setUserSelectorOpen(false);
    }
  }, [form.type]);

  useEffect(() => {
    if (applyToAllNewUsers) {
      setSelectedUsers([]);
      setUserSelectorOpen(false);
    }
  }, [applyToAllNewUsers]);

  const couponsQuery = useQuery<CouponPage>({
    queryKey: [
      'coupons',
      {
        page,
        pageSize,
        search,
        typeFilter,
        statusFilter,
        discountFilter,
        fromDate,
        toDate,
        sort
      }
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize };
      if (search) params.search = search;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (discountFilter !== 'ALL') params.discountType = discountFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (sort) params.sort = sort;
      const { data } = await api.get<CouponPage>('/coupons', { params });
      return data;
    },
    enabled: panelMode === 'list'
  });

  const coupons = couponsQuery.data?.content ?? [];
  const totalElements = couponsQuery.data?.totalElements ?? 0;

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['coupons', 'category-options'],
    queryFn: async () => {
      const { data } = await api.get<CategoryPage>('/categories', {
        params: { page: 0, size: 200 }
      });
      return data.content ?? [];
    },
    enabled: panelMode !== 'list'
  });

  const categoryOptions = useMemo<CouponCategorySummary[]>(() => {
    return (categoriesQuery.data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      imageUrl: category.iconUrl ?? category.coverUrl ?? category.bannerUrl ?? undefined
    }));
  }, [categoriesQuery.data]);

  const filteredCategoryOptions = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) {
      return categoryOptions;
    }
    return categoryOptions.filter((category) => category.name.toLowerCase().includes(term));
  }, [categoryOptions, categorySearch]);

  const productSearchTerm = productSearch.trim();
  const productSuggestionsQuery = useQuery<ProductSummary[]>({
    queryKey: ['products', 'coupon-selector', { term: productSearchTerm }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: 0, size: 50 };
      if (productSearchTerm) {
        params.search = productSearchTerm;
      }
      const { data } = await api.get<ProductSummaryPage>('/products', { params });
      return data.content ?? [];
    },
    enabled: productSelectorOpen && form.type === 'PRODUCT',
    staleTime: 60_000
  });

  const productOptions = useMemo<CouponProductSummary[]>(() => {
    return (productSuggestionsQuery.data ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      imageUrl: product.thumbnailUrl ?? undefined
    }));
  }, [productSuggestionsQuery.data]);

  const userSearchTerm = userSearch.trim();
  const userSuggestionsQuery = useQuery<User[]>({
    queryKey: ['users', 'coupon-selector', { term: userSearchTerm }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: 0, size: 50 };
      if (userSearchTerm) {
        params.search = userSearchTerm;
      }
      const { data } = await api.get<Pagination<User>>('/users', { params });
      return data.content ?? [];
    },
    enabled: userSelectorOpen && form.type === 'NEW_SIGNUP' && !applyToAllNewUsers,
    staleTime: 60_000
  });

  const userOptions = useMemo<CouponUserSummary[]>(() => {
    return (userSuggestionsQuery.data ?? []).map((user) => ({
      id: user.id,
      name: resolveUserName(user),
      email: user.email,
      avatarUrl:
        typeof user.profileImageUrl === 'string' && user.profileImageUrl.trim()
          ? user.profileImageUrl
          : undefined
    }));
  }, [userSuggestionsQuery.data]);
  const createMutation = useMutation({
    mutationFn: async (payload: SaveCouponPayload) => {
      const { data } = await api.post<CouponDetail>('/coupons', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Coupon created successfully.' });
      void queryClient.invalidateQueries({ queryKey: ['coupons'] });
      closeForm();
    },
    onError: (error: unknown) => {
      const message = extractErrorMessage(error, 'Failed to create coupon.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: SaveCouponPayload }) => {
      const { data } = await api.put<CouponDetail>(`/coupons/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      notify({ type: 'success', message: 'Coupon updated successfully.' });
      setExpandedDetails((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ['coupons'] });
      closeForm();
    },
    onError: (error: unknown) => {
      const message = extractErrorMessage(error, 'Failed to update coupon.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/coupons/${id}`);
    },
    onSuccess: (_, id) => {
      notify({ type: 'success', message: 'Coupon deleted successfully.' });
      setExpandedDetails((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete coupon.') });
    }
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const resetFilters = () => {
    setSearchDraft('');
    setSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setDiscountFilter('ALL');
    setFromDate('');
    setToDate('');
    setSort(sortOptions[0].value);
    setPage(0);
    setExpandedId(null);
  };

  const closeForm = () => {
    setPanelMode('list');
    setEditingId(null);
    setForm({ ...defaultFormState });
    setFormError(null);
    setFormLoading(false);
    setCouponImage(null);
    setSelectedProducts([]);
    setSelectedCategories([]);
    setSelectedUsers([]);
    setApplyToAllNewUsers(true);
    setProductSearch('');
    setCategorySearch('');
    setUserSearch('');
    setMediaDialogOpen(false);
  };

  const openCreateForm = () => {
    setPanelMode('create');
    setForm({ ...defaultFormState });
    setFormError(null);
    setCouponImage(null);
    setSelectedProducts([]);
    setSelectedCategories([]);
    setSelectedUsers([]);
    setApplyToAllNewUsers(true);
    setProductSearch('');
    setCategorySearch('');
    setUserSearch('');
  };

  const loadCouponDetail = async (id: number) => {
    const existing = expandedDetails[id];
    if (existing) {
      return existing;
    }
    setDetailLoadingId(id);
    try {
      const { data } = await api.get<CouponDetail>(`/coupons/${id}`);
      setExpandedDetails((prev) => ({ ...prev, [id]: data }));
      return data;
    } finally {
      setDetailLoadingId((current) => (current === id ? null : current));
    }
  };

  const handleToggleExpand = async (coupon: CouponSummary) => {
    if (expandedId === coupon.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(coupon.id);
    try {
      await loadCouponDetail(coupon.id);
    } catch (error) {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to load coupon details.')
      });
    }
  };

  const openEditForm = async (coupon: CouponSummary) => {
    setPanelMode('edit');
    setEditingId(coupon.id);
    setFormError(null);
    setFormLoading(true);
    try {
      const detail = await loadCouponDetail(coupon.id);
      setForm({
        type: detail.type,
        name: detail.name,
        code: detail.code,
        shortDescription: detail.shortDescription ?? '',
        longDescription: detail.longDescription ?? '',
        discountType: detail.discountType,
        discountValue: detail.discountValue != null ? `${detail.discountValue}` : '',
        minimumCartValue: detail.minimumCartValue != null ? `${detail.minimumCartValue}` : '',
        startDate: detail.startDate ? detail.startDate.slice(0, 10) : '',
        endDate: detail.endDate ? detail.endDate.slice(0, 10) : '',
        status: detail.status
      });
      setCouponImage(detail.image ?? (detail.imageUrl ? { url: detail.imageUrl } : null));
      setSelectedProducts(detail.products ?? []);
      setSelectedCategories(detail.categories ?? []);
      setSelectedUsers(detail.users ?? []);
      setApplyToAllNewUsers(detail.type === 'NEW_SIGNUP' ? detail.applyToAllNewUsers ?? true : true);
      setProductSearch('');
      setCategorySearch('');
      setUserSearch('');
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to load coupon details.');
      notify({ type: 'error', message });
      closeForm();
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formLoading || saving) {
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedCode = form.code.trim();
    if (!trimmedName) {
      setFormError('Coupon name is required.');
      return;
    }
    if (!trimmedCode) {
      setFormError('Coupon code is required.');
      return;
    }

    const discountValue = Number.parseFloat(form.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError('Enter a valid discount value greater than zero.');
      return;
    }

    let minimumCartValue: number | null = null;
    if (form.type === 'CART_VALUE') {
      minimumCartValue = form.minimumCartValue.trim() ? Number.parseFloat(form.minimumCartValue) : NaN;
      if (!Number.isFinite(minimumCartValue) || minimumCartValue <= 0) {
        setFormError('Enter a valid minimum cart value.');
        return;
      }
    }

    if (!form.startDate) {
      setFormError('Select a start date.');
      return;
    }
    if (!form.endDate) {
      setFormError('Select an end date.');
      return;
    }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setFormError('End date must be on or after the start date.');
      return;
    }

    if (form.type === 'PRODUCT' && selectedProducts.length === 0 && selectedCategories.length === 0) {
      setFormError('Select at least one product or category for product-based coupons.');
      return;
    }

    if (form.type === 'NEW_SIGNUP' && !applyToAllNewUsers && selectedUsers.length === 0) {
      setFormError('Select at least one user or enable automatic assignment to all new signups.');
      return;
    }

    const payload: SaveCouponPayload = {
      type: form.type,
      name: trimmedName,
      code: trimmedCode,
      shortDescription: form.shortDescription.trim() || undefined,
      longDescription: form.longDescription.trim() || undefined,
      discountType: form.discountType,
      discountValue,
      minimumCartValue: form.type === 'CART_VALUE' ? minimumCartValue : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      image: couponImage ?? undefined,
      productIds: form.type === 'PRODUCT' ? selectedProducts.map((product) => product.id) : undefined,
      categoryIds: form.type === 'PRODUCT' ? selectedCategories.map((category) => category.id) : undefined,
      userIds:
        form.type === 'NEW_SIGNUP' && !applyToAllNewUsers
          ? selectedUsers.map((user) => user.id)
          : undefined,
      applyToAllNewUsers: form.type === 'NEW_SIGNUP' ? applyToAllNewUsers : undefined
    };

    setFormError(null);

    if (panelMode === 'create') {
      await createMutation.mutateAsync(payload);
    } else if (panelMode === 'edit' && editingId != null) {
      await updateMutation.mutateAsync({ id: editingId, payload });
    }
  };

  const handleDelete = async (coupon: CouponSummary) => {
    const confirmed = await confirm({
      title: 'Delete coupon',
      description: `Are you sure you want to delete “${coupon.name}”? This action cannot be undone.`,
      confirmLabel: 'Delete coupon',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(coupon.id);
  };

  const toggleProduct = (product: CouponProductSummary) => {
    setSelectedProducts((previous) => {
      const exists = previous.some((item) => item.id === product.id);
      if (exists) {
        return previous.filter((item) => item.id !== product.id);
      }
      return [...previous, product];
    });
  };

  const toggleCategory = (category: CouponCategorySummary) => {
    setSelectedCategories((previous) => {
      const exists = previous.some((item) => item.id === category.id);
      if (exists) {
        return previous.filter((item) => item.id !== category.id);
      }
      return [...previous, category];
    });
  };

  const toggleUser = (user: CouponUserSummary) => {
    setSelectedUsers((previous) => {
      const exists = previous.some((item) => item.id === user.id);
      if (exists) {
        return previous.filter((item) => item.id !== user.id);
      }
      return [...previous, user];
    });
  };
  const renderCouponCards = () => {
    if (couponsQuery.isLoading) {
      return <div className="py-8 text-center text-sm text-slate-500">Loading coupons…</div>;
    }

    if (couponsQuery.isError) {
      return (
        <div className="py-8 text-center text-sm text-rose-500">
          Something went wrong while loading coupons. Please try again.
        </div>
      );
    }

    if (!coupons.length) {
      return (
        <div className="py-8 text-center text-sm text-slate-500">
          {search || typeFilter !== 'ALL' || statusFilter !== 'ALL' || discountFilter !== 'ALL' || fromDate || toDate
            ? 'No coupons match the current filters.'
            : 'You have not created any coupons yet.'}
        </div>
      );
    }

    return (
      <div className="grid gap-6 xl:grid-cols-2">
        {coupons.map((coupon) => {
          const imageUrl = resolveCouponImageUrl(coupon);
          const isExpanded = expandedId === coupon.id;
          const detail = expandedDetails[coupon.id];
          const loadingDetails = detailLoadingId === coupon.id;
          const discountLabel =
            coupon.discountType === 'PERCENTAGE'
              ? `${coupon.discountValue}%`
              : formatCurrency(coupon.discountValue, baseCurrency);
          const minCartLabel =
            coupon.type === 'CART_VALUE' && coupon.minimumCartValue != null
              ? formatCurrency(coupon.minimumCartValue, baseCurrency)
              : null;

          return (
            <article
              key={coupon.id}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative h-40 bg-slate-100 sm:h-48">
                <ImagePreview
                  src={imageUrl ?? undefined}
                  alt={`${coupon.name} artwork`}
                  className="h-full w-full"
                  aspectClassName=""
                  mode="cover"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-400">
                      No coupon artwork
                    </div>
                  }
                />
                <span
                  className={`absolute left-4 top-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    couponStatusStyles[coupon.status]
                  }`}
                >
                  {coupon.status === 'ENABLED'
                    ? 'Enabled'
                    : coupon.status === 'DISABLED'
                    ? 'Disabled'
                    : 'Expired'}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-900">{coupon.name}</h3>
                  <p className="text-sm font-mono uppercase tracking-wide text-primary">{coupon.code}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {couponTypeLabels[coupon.type]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {discountTypeLabels[coupon.discountType]} · {discountLabel}
                  </span>
                  {minCartLabel && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Min cart · {minCartLabel}</span>
                  )}
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {coupon.shortDescription || 'No short description provided yet.'}
                </p>
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
                  Valid {formatDateRange(coupon.startDate, coupon.endDate)}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleToggleExpand(coupon)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {isExpanded ? 'Hide details' : 'View details'}
                  </button>
                  {canManage && (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void openEditForm(coupon)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(coupon)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="mt-4 space-y-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
                    {loadingDetails && (
                      <div className="text-sm text-slate-500">Loading detailed configuration…</div>
                    )}
                    {!loadingDetails && detail && (
                      <>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">Descriptions</h4>
                          <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                            {detail.shortDescription && <p>{detail.shortDescription}</p>}
                            {detail.longDescription ? (
                              <p className="whitespace-pre-line">{detail.longDescription}</p>
                            ) : (
                              <p className="text-slate-400">No extended description provided.</p>
                            )}
                          </div>
                        </div>
                        {detail.type === 'PRODUCT' && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900">Applicable products</h4>
                              {detail.products?.length ? (
                                <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                                  {detail.products.map((product) => (
                                    <li
                                      key={product.id}
                                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                                    >
                                      <ImagePreview
                                        src={product.imageUrl ?? undefined}
                                        alt={product.name}
                                        className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200"
                                        aspectClassName=""
                                        mode="cover"
                                        fallback={
                                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                            {product.name.charAt(0).toUpperCase()}
                                          </div>
                                        }
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                                        {product.sku && (
                                          <p className="truncate text-xs text-slate-500">SKU · {product.sku}</p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-sm text-slate-500">
                                  No individual products selected. The coupon may be applied via categories instead.
                                </p>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900">Applicable categories</h4>
                              {detail.categories?.length ? (
                                <ul className="mt-2 flex flex-wrap gap-2">
                                  {detail.categories.map((category) => (
                                    <li
                                      key={category.id}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                                    >
                                      <span>{category.name}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-sm text-slate-500">No category restrictions configured.</p>
                              )}
                            </div>
                          </div>
                        )}
                        {detail.type === 'NEW_SIGNUP' && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-900">Eligible users</h4>
                            {detail.applyToAllNewUsers ? (
                              <p className="text-sm text-slate-500">
                                Available to all newly registered customers.
                              </p>
                            ) : detail.users?.length ? (
                              <ul className="mt-1 space-y-2">
                                {detail.users.map((user) => (
                                  <li key={user.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <ImagePreview
                                      src={user.avatarUrl ?? undefined}
                                      alt={user.name}
                                      className="h-10 w-10 overflow-hidden rounded-full border border-slate-200"
                                      aspectClassName=""
                                      mode="cover"
                                      fallback={
                                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                          {user.name.charAt(0).toUpperCase()}
                                        </div>
                                      }
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                                      {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-500">No individual users selected yet.</p>
                            )}
                          </div>
                        )}
                        <div className="grid gap-3 text-xs uppercase tracking-wide text-slate-500 md:grid-cols-2">
                          <span>
                            Created · {formatDate(detail.createdAt)}
                          </span>
                          <span>
                            Last updated · {formatDate(detail.updatedAt)}
                          </span>
                        </div>
                      </>
                    )}
                    {!loadingDetails && !detail && (
                      <div className="text-sm text-slate-500">No additional details available.</div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  };
  if (panelMode !== 'list') {
    return (
      <div className="space-y-6">
        <PageHeader
          title={panelMode === 'create' ? 'Create coupon' : 'Edit coupon'}
          description="Design targeted incentives to reward loyal customers and boost conversions."
          actions={
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to coupons
            </button>
          }
        />
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
          )}
          <PageSection
            title="General information"
            description="Give the coupon a clear identity and define its incentive structure."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-name">
                  Coupon name
                </label>
                <input
                  id="coupon-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Summer Savings Event"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-code">
                  Coupon code
                </label>
                <input
                  id="coupon-code"
                  type="text"
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-wide shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="SAVE20"
                  required
                />
              </div>
              <div className="lg:col-span-2">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-slate-700">Coupon type</legend>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {(Object.keys(couponTypeLabels) as CouponType[]).map((type) => (
                      <label
                        key={type}
                        className={`flex cursor-pointer flex-col gap-2 rounded-xl border px-4 py-3 transition ${
                          form.type === type ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="coupon-type"
                            value={type}
                            checked={form.type === type}
                            onChange={() => {
                              setForm((prev) => ({
                                ...prev,
                                type,
                                minimumCartValue: type === 'CART_VALUE' ? prev.minimumCartValue : '',
                                discountType: prev.discountType
                              }));
                              if (type !== 'PRODUCT') {
                                setSelectedProducts([]);
                                setSelectedCategories([]);
                              }
                              if (type !== 'NEW_SIGNUP') {
                                setSelectedUsers([]);
                                setApplyToAllNewUsers(true);
                              }
                            }}
                            className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-semibold">{couponTypeLabels[type]}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {type === 'PRODUCT'
                            ? 'Target specific products or categories to boost sell-through.'
                            : type === 'CART_VALUE'
                            ? 'Reward customers when their cart reaches a minimum spend.'
                            : 'Delight new customers with a welcome incentive.'}
                        </p>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-short-description">
                  Short description
                </label>
                <textarea
                  id="coupon-short-description"
                  value={form.shortDescription}
                  onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Perfect for gifting season shoppers."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-long-description">
                  Long description
                </label>
                <textarea
                  id="coupon-long-description"
                  value={form.longDescription}
                  onChange={(event) => setForm((prev) => ({ ...prev, longDescription: event.target.value }))}
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Share qualification rules, exclusions, or storytelling copy."
                />
              </div>
            </div>
          </PageSection>
          <PageSection
            title="Discount configuration"
            description="Control how the benefit is calculated and when it triggers."
          >
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-discount-type">
                  Discount type
                </label>
                <select
                  id="coupon-discount-type"
                  value={form.discountType}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, discountType: event.target.value as DiscountType }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="PERCENTAGE">Percentage off</option>
                  <option value="FLAT">Flat value</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-discount-value">
                  Discount value
                </label>
                <input
                  id="coupon-discount-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={form.discountType === 'PERCENTAGE' ? '10' : '25'}
                  required
                />
              </div>
              {form.type === 'CART_VALUE' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-minimum-cart">
                    Minimum cart value
                  </label>
                  <input
                    id="coupon-minimum-cart"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minimumCartValue}
                    onChange={(event) => setForm((prev) => ({ ...prev, minimumCartValue: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="100"
                  />
                  <p className="text-xs text-slate-500">Customers must reach this subtotal before the discount applies.</p>
                </div>
              )}
            </div>
          </PageSection>

          {form.type === 'PRODUCT' && (
            <PageSection
              title="Product & category targeting"
              description="Choose where the coupon can be redeemed."
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4" ref={productSelectorRef}>
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="coupon-product-selector">
                      Applicable products
                    </label>
                    <p className="mt-1 text-xs text-slate-500">
                      Search and select specific SKUs to include alongside any chosen categories.
                    </p>
                    <div className="relative mt-2">
                      <button
                        type="button"
                        id="coupon-product-selector"
                        onClick={() => {
                          if (!productSelectorOpen) {
                            void productSuggestionsQuery.refetch();
                          }
                          setProductSelectorOpen((open) => !open);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <span className="truncate text-slate-600">
                          {selectedProducts.length
                            ? `${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'} selected`
                            : 'Search or browse products'}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          className={`h-4 w-4 text-slate-500 transition-transform ${productSelectorOpen ? 'rotate-180' : ''}`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
                        </svg>
                      </button>
                      {productSelectorOpen && (
                        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                          <div className="border-b border-slate-100 p-3">
                            <label htmlFor="coupon-product-search" className="sr-only">
                              Search products
                            </label>
                            <div className="relative flex items-center">
                              <input
                                id="coupon-product-search"
                                type="text"
                                value={productSearch}
                                onChange={(event) => setProductSearch(event.target.value)}
                                placeholder="Search by name or SKU"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              {productSearch && (
                                <button
                                  type="button"
                                  onClick={() => setProductSearch('')}
                                  className="absolute right-2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {productSuggestionsQuery.isLoading ? (
                              <div className="px-4 py-3 text-sm text-slate-500">Loading products…</div>
                            ) : productSuggestionsQuery.isError ? (
                              <div className="px-4 py-3 text-sm text-rose-500">Unable to load product suggestions.</div>
                            ) : productOptions.length ? (
                              productOptions.map((product) => {
                                const checked = selectedProducts.some((item) => item.id === product.id);
                                return (
                                  <label
                                    key={product.id}
                                    className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm transition last:border-b-0 ${
                                      checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleProduct(product)}
                                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                    />
                                    <ImagePreview
                                      src={product.imageUrl ?? undefined}
                                      alt={product.name}
                                      className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200"
                                      aspectClassName=""
                                      mode="cover"
                                      fallback={
                                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                          {product.name.charAt(0).toUpperCase()}
                                        </div>
                                      }
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                                      {product.sku && <p className="truncate text-xs text-slate-500">SKU · {product.sku}</p>}
                                    </div>
                                    {checked && (
                                      <span className="text-[11px] font-semibold uppercase text-primary">Selected</span>
                                    )}
                                  </label>
                                );
                              })
                            ) : (
                              <div className="px-4 py-3 text-sm text-slate-500">
                                {productSearchTerm
                                  ? `No products match “${productSearchTerm}”.`
                                  : 'No products available yet.'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedProducts.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-700">Selected products</h4>
                        <button
                          type="button"
                          onClick={() => setSelectedProducts([])}
                          className="text-xs font-semibold uppercase tracking-wide text-primary hover:text-primary/80"
                        >
                          Clear all
                        </button>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {selectedProducts.map((product) => (
                          <li
                            key={product.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <ImagePreview
                                src={product.imageUrl ?? undefined}
                                alt={product.name}
                                className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200"
                                aspectClassName=""
                                mode="cover"
                                fallback={
                                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                    {product.name.charAt(0).toUpperCase()}
                                  </div>
                                }
                              />
                              <div>
                                <p className="text-sm font-medium text-slate-900">{product.name}</p>
                                {product.sku && <p className="text-xs text-slate-500">SKU · {product.sku}</p>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleProduct(product)}
                              className="text-xs font-semibold uppercase tracking-wide text-rose-600 hover:text-rose-700"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="coupon-category-search">
                      Applicable categories
                    </label>
                    <p className="mt-1 text-xs text-slate-500">
                      Selecting categories automatically includes all products within them.
                    </p>
                    <input
                      id="coupon-category-search"
                      type="text"
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      placeholder="Quick filter"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                      {filteredCategoryOptions.length ? (
                        <ul className="divide-y divide-slate-200">
                          {filteredCategoryOptions.map((category) => {
                            const checked = selectedCategories.some((item) => item.id === category.id);
                            return (
                              <li key={category.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                <label className="flex flex-1 cursor-pointer items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleCategory(category)}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                  />
                                  <span className="truncate text-slate-700">{category.name}</span>
                                </label>
                                {checked && (
                                  <span className="text-[11px] font-semibold uppercase text-primary">Selected</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="px-3 py-4 text-sm text-slate-500">
                          {categorySearch.trim()
                            ? `No categories match “${categorySearch.trim()}”.`
                            : 'No categories available yet.'}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedCategories.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-700">Selected categories</h4>
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="text-xs font-semibold uppercase tracking-wide text-primary hover:text-primary/80"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedCategories.map((category) => (
                          <span
                            key={category.id}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {category.name}
                            <button
                              type="button"
                              onClick={() => toggleCategory(category)}
                              className="text-[10px] uppercase text-rose-600 hover:text-rose-700"
                            >
                              Remove
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </PageSection>
          )}
          {form.type === 'NEW_SIGNUP' && (
            <PageSection
              title="New customer targeting"
              description="Decide whether the coupon applies to every new signup or a curated segment."
            >
              <div className="space-y-4">
                <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={applyToAllNewUsers}
                    onChange={(event) => setApplyToAllNewUsers(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Apply automatically to all newly registered users
                </label>
                {!applyToAllNewUsers && (
                  <div className="space-y-4" ref={userSelectorRef}>
                    <div>
                      <label className="text-sm font-medium text-slate-700" htmlFor="coupon-user-selector">
                        Eligible users
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        Handpick recently registered customers for personalised rewards.
                      </p>
                      <div className="relative mt-2">
                        <button
                          type="button"
                          id="coupon-user-selector"
                          onClick={() => {
                            if (!userSelectorOpen) {
                              void userSuggestionsQuery.refetch();
                            }
                            setUserSelectorOpen((open) => !open);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <span className="truncate text-slate-600">
                            {selectedUsers.length
                              ? `${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'} selected`
                              : 'Browse or search for customers'}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            className={`h-4 w-4 text-slate-500 transition-transform ${userSelectorOpen ? 'rotate-180' : ''}`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
                          </svg>
                        </button>
                        {userSelectorOpen && (
                          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                            <div className="border-b border-slate-100 p-3">
                              <label htmlFor="coupon-user-search" className="sr-only">
                                Search users
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  id="coupon-user-search"
                                  type="text"
                                  value={userSearch}
                                  onChange={(event) => setUserSearch(event.target.value)}
                                  placeholder="Search by name or email"
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                {userSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setUserSearch('')}
                                    className="absolute right-2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                              {userSuggestionsQuery.isLoading ? (
                                <div className="px-4 py-3 text-sm text-slate-500">Loading users…</div>
                              ) : userSuggestionsQuery.isError ? (
                                <div className="px-4 py-3 text-sm text-rose-500">Unable to load user suggestions.</div>
                              ) : userOptions.length ? (
                                userOptions.map((user) => {
                                  const checked = selectedUsers.some((item) => item.id === user.id);
                                  return (
                                    <label
                                      key={user.id}
                                      className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm transition last:border-b-0 ${
                                        checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleUser(user)}
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                      />
                                      <ImagePreview
                                        src={user.avatarUrl ?? undefined}
                                        alt={user.name}
                                        className="h-10 w-10 overflow-hidden rounded-full border border-slate-200"
                                        aspectClassName=""
                                        mode="cover"
                                        fallback={
                                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                            {user.name.charAt(0).toUpperCase()}
                                          </div>
                                        }
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                                        {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
                                      </div>
                                      {checked && (
                                        <span className="text-[11px] font-semibold uppercase text-primary">Selected</span>
                                      )}
                                    </label>
                                  );
                                })
                              ) : (
                                <div className="px-4 py-3 text-sm text-slate-500">
                                  {userSearchTerm
                                    ? `No users match “${userSearchTerm}”.`
                                    : 'No eligible users available yet.'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedUsers.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-700">Selected users</h4>
                          <button
                            type="button"
                            onClick={() => setSelectedUsers([])}
                            className="text-xs font-semibold uppercase tracking-wide text-primary hover:text-primary/80"
                          >
                            Clear all
                          </button>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {selectedUsers.map((user) => (
                            <li
                              key={user.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <ImagePreview
                                  src={user.avatarUrl ?? undefined}
                                  alt={user.name}
                                  className="h-10 w-10 overflow-hidden rounded-full border border-slate-200"
                                  aspectClassName=""
                                  mode="cover"
                                  fallback={
                                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                      {user.name.charAt(0).toUpperCase()}
                                    </div>
                                  }
                                />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                  {user.email && <p className="text-xs text-slate-500">{user.email}</p>}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleUser(user)}
                                className="text-xs font-semibold uppercase tracking-wide text-rose-600 hover:text-rose-700"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </PageSection>
          )}

          <PageSection
            title="Scheduling & availability"
            description="Control when the coupon activates and whether it is redeemable."
          >
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-start-date">
                  Start date
                </label>
                <input
                  id="coupon-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-end-date">
                  End date
                </label>
                <input
                  id="coupon-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-status">
                  Status
                </label>
                <select
                  id="coupon-status"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as CouponStatus }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ENABLED">Enabled</option>
                  <option value="DISABLED">Disabled</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-slate-700">Coupon artwork</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Upload an optional banner to highlight the offer across the dashboard.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMediaDialogOpen(true)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {couponImage ? 'Change image' : 'Select image'}
                  </button>
                  {couponImage && (
                    <button
                      type="button"
                      onClick={() => setCouponImage(null)}
                      className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-3 h-40 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  {couponImage ? (
                    <ImagePreview src={couponImage.url} alt="Coupon artwork" className="h-full w-full" aspectClassName="" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No image selected yet.
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                <h4 className="text-sm font-semibold text-slate-700">Tips for success</h4>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>Align coupon validity with marketing campaigns for maximum impact.</li>
                  <li>Pair product-specific coupons with featured merchandising slots.</li>
                  <li>Use disabled status to pause offers without losing configuration work.</li>
                </ul>
              </div>
            </div>
          </PageSection>

          {formLoading && (
            <PageSection>
              <div className="text-sm text-slate-500">Loading coupon details…</div>
            </PageSection>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={saving || formLoading}
            >
              {saving ? 'Saving…' : panelMode === 'create' ? 'Create coupon' : 'Update coupon'}
            </button>
          </div>
        </form>
        <MediaLibraryDialog
          open={mediaDialogOpen}
          onClose={() => setMediaDialogOpen(false)}
          moduleFilters={['COUPON_IMAGE']}
          title="Coupon artwork"
          onSelect={(selection) => {
            setCouponImage(selection);
            setMediaDialogOpen(false);
          }}
        />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Create, target, and monitor promotional offers across your catalogue."
        actions={
          canManage && (
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              New coupon
            </button>
          )
        }
      />

      <PageSection title="Filters" description="Refine the list by coupon type, status, and validity window.">
        <div className="grid gap-4 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-search">
              Search
            </label>
            <input
              id="coupon-search"
              type="text"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by name or code"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-type-filter">
              Coupon type
            </label>
            <select
              id="coupon-type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">All types</option>
              <option value="PRODUCT">Product-based</option>
              <option value="CART_VALUE">Cart value-based</option>
              <option value="NEW_SIGNUP">New signup</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-status-filter">
              Status
            </label>
            <select
              id="coupon-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">All statuses</option>
              <option value="ENABLED">Enabled</option>
              <option value="DISABLED">Disabled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-discount-filter">
              Discount type
            </label>
            <select
              id="coupon-discount-filter"
              value={discountFilter}
              onChange={(event) => setDiscountFilter(event.target.value as typeof discountFilter)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">All discounts</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FLAT">Flat value</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-from-date">
              Start date from
            </label>
            <input
              id="coupon-from-date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="coupon-to-date">
              End date to
            </label>
            <input
              id="coupon-to-date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700" htmlFor="coupon-sort">
              Sort by
            </label>
            <select
              id="coupon-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            Reset filters
          </button>
        </div>
      </PageSection>

      <PageSection
        title="Coupons overview"
        description="Monitor active, scheduled, and expired offers in a card-first layout."
        footer={
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalElements={totalElements}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={couponsQuery.isLoading}
            prefix={<span>Sorted by {sortOptions.find((option) => option.value === sort)?.label.toLowerCase()}</span>}
          />
        }
      >
        {renderCouponCards()}
      </PageSection>
    </div>
  );
};

export default CouponsPage;

