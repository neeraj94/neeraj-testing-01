import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import ImagePreview from '../components/ImagePreview';
import StarRating from '../components/StarRating';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import api from '../services/http';
import { extractErrorMessage } from '../utils/errors';
import { formatCurrency } from '../utils/currency';
import type {
  ProductReviewPage,
  CreateProductReviewPayload,
  ProductDetail,
  ProductSummary,
  ProductReview
} from '../types/product';
import type { CategoryPage } from '../types/category';
import type { Pagination, Customer } from '../types/models';
import type { MediaSelection } from '../types/uploaded-file';

interface UploadedFileUploadResponse {
  url: string;
  storageKey?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

type PanelMode = 'list' | 'create' | 'edit';
type MediaDialogContext = 'attachments' | 'avatar';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const MEDIA_FILTERS: Record<MediaDialogContext, string[]> = {
  attachments: ['PRODUCT_MEDIA', 'PRODUCT_GALLERY_IMAGE', 'PRODUCT_VARIANT_IMAGE'],
  avatar: ['USER_PROFILE', 'PRODUCT_MEDIA']
};

const mediaAssetToSelection = (
  asset?: {
    url: string;
    storageKey?: string | null;
    originalFilename?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
  } | null
): MediaSelection | null => {
  if (!asset || !asset.url) {
    return null;
  }
  return {
    url: asset.url,
    storageKey: asset.storageKey ?? null,
    originalFilename: asset.originalFilename ?? null,
    mimeType: asset.mimeType ?? null,
    sizeBytes: asset.sizeBytes ?? null
  };
};

const toDateInput = (iso?: string | null) => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  return `${year}-${month}-${day}`;
};

const toIsoDate = (value: string): string | undefined => {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const date = new Date(`${normalized}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};

const createEmptyForm = () => ({
  productId: '',
  customerId: '',
  reviewerName: '',
  rating: '5',
  reviewDate: new Date().toISOString().slice(0, 10),
  comment: '',
  published: 'enabled' as 'enabled' | 'disabled'
});

type ReviewFormState = ReturnType<typeof createEmptyForm>;

const isVideoAsset = (asset: { url: string; mimeType?: string | null }) => {
  if (asset.mimeType && asset.mimeType.toLowerCase().startsWith('video/')) {
    return true;
  }
  return /\.(mp4|webm|ogg|mov)$/i.test(asset.url);
};

const reviewToPayload = (
  review: ProductReview,
  overrides: Partial<CreateProductReviewPayload> = {}
): CreateProductReviewPayload => {
  const media = (review.media ?? [])
    .map((asset) => mediaAssetToSelection(asset))
    .filter((asset): asset is MediaSelection => Boolean(asset));
  const payload: CreateProductReviewPayload = {
    productId: review.productId,
    customerId: review.customerId,
    reviewerName: review.customerId ? undefined : review.reviewerName ?? undefined,
    reviewerAvatar: review.customerId ? undefined : mediaAssetToSelection(review.reviewerAvatar) ?? undefined,
    rating: review.rating,
    comment: review.comment ?? undefined,
    reviewedAt: review.reviewedAt,
    media,
    published: review.published
  };
  return { ...payload, ...overrides };
};

const ReviewsPage = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const baseCurrency = useAppSelector((state) => state.settings.theme.baseCurrency);

  const canViewReviews = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_REVIEW_VIEW']),
    [permissions]
  );
  const canCreateReviews = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_REVIEW_CREATE']),
    [permissions]
  );
  const canUpdateReviews = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_REVIEW_UPDATE']),
    [permissions]
  );
  const canDeleteReviews = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_REVIEW_DELETE']),
    [permissions]
  );

  const [panelMode, setPanelMode] = useState<PanelMode>('list');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [productFilter, setProductFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  const [form, setForm] = useState<ReviewFormState>(createEmptyForm());
  const [reviewAttachments, setReviewAttachments] = useState<MediaSelection[]>([]);
  const [reviewerAvatar, setReviewerAvatar] = useState<MediaSelection | null>(null);
  const [mediaDialogContext, setMediaDialogContext] = useState<MediaDialogContext | null>(null);
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<number | null>(null);
  const editInitializedRef = useRef(false);

  const productsQuery = useQuery({
    queryKey: ['reviews', 'products'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<ProductSummary>>('/products', {
        params: { page: 0, size: 200 }
      });
      return data.content ?? [];
    }
  });

  const categoriesQuery = useQuery({
    queryKey: ['reviews', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<CategoryPage>('/categories', {
        params: { page: 0, size: 200 }
      });
      return data.content ?? [];
    }
  });

  const customersQuery = useQuery({
    queryKey: ['reviews', 'customers'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Customer>>('/customers', {
        params: { page: 0, size: 200 }
      });
      return data.content ?? [];
    }
  });

  const reviewsQuery = useQuery<ProductReviewPage>({
    queryKey: [
      'product-reviews',
      { page, pageSize, productFilter, categoryFilter, customerFilter, ratingFilter }
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize
      };
      if (productFilter) {
        params.productId = Number(productFilter);
      }
      if (categoryFilter) {
        params.categoryId = Number(categoryFilter);
      }
      if (customerFilter) {
        params.customerId = Number(customerFilter);
      }
      if (ratingFilter) {
        const rating = Number(ratingFilter);
        params.ratingMin = rating;
        params.ratingMax = rating;
      }
      const { data } = await api.get<ProductReviewPage>('/product-reviews', { params });
      return data;
    },
    enabled: canViewReviews
  });

  const selectedProductId = form.productId ? Number(form.productId) : null;

  const selectedProductDetailQuery = useQuery({
    queryKey: ['reviews', 'product-detail', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) {
        throw new Error('No product selected');
      }
      const { data } = await api.get<ProductDetail>(`/products/${selectedProductId}`);
      return data;
    },
    enabled: Boolean(selectedProductId)
  });

  const reviewDetailQuery = useQuery({
    queryKey: ['product-reviews', 'detail', editingId],
    queryFn: async () => {
      if (!editingId) {
        throw new Error('No review selected');
      }
      const { data } = await api.get<ProductReview>(`/product-reviews/${editingId}`);
      return data;
    },
    enabled: panelMode === 'edit' && editingId !== null
  });

  const createReviewMutation = useMutation({
    mutationFn: async (payload: CreateProductReviewPayload) => {
      await api.post('/product-reviews', payload);
    },
    onSuccess: (_data, variables) => {
      notify({ type: 'success', message: 'Review added successfully.' });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      if (variables.productId) {
        queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.productId] });
      }
      resetForm();
      setPanelMode('list');
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to create review. Please try again later.')
      });
    }
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CreateProductReviewPayload }) => {
      await api.put(`/product-reviews/${id}`, payload);
    },
    onSuccess: (_data, variables) => {
      notify({ type: 'success', message: 'Review updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      if (variables.payload.productId) {
        queryClient.invalidateQueries({
          queryKey: ['products', 'detail', variables.payload.productId]
        });
      }
      closeForm();
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to update review. Please try again later.')
      });
    }
  });

  const toggleReviewVisibilityMutation = useMutation({
    mutationFn: async (input: { review: ProductReview; published: boolean }) => {
      const payload = reviewToPayload(input.review, { published: input.published });
      await api.put(`/product-reviews/${input.review.id}`, payload);
      return input;
    },
    onMutate: ({ review }) => {
      setVisibilityUpdatingId(review.id);
    },
    onSuccess: (_data, variables) => {
      notify({
        type: 'success',
        message: variables.published ? 'Review enabled successfully.' : 'Review hidden successfully.'
      });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      if (variables.review.productId) {
        queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.review.productId] });
      }
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to update review visibility. Please try again later.')
      });
    },
    onSettled: () => {
      setVisibilityUpdatingId(null);
    }
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/product-reviews/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Review deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to delete review. Please try again later.')
      });
    }
  });

  const resetForm = () => {
    setForm(createEmptyForm());
    setReviewAttachments([]);
    setReviewerAvatar(null);
    setRatingHover(null);
  };

  const closeForm = () => {
    resetForm();
    setPanelMode('list');
    setEditingId(null);
    editInitializedRef.current = false;
  };

  const openCreateForm = () => {
    if (!canCreateReviews) {
      notify({ type: 'error', message: 'You do not have permission to add reviews.' });
      return;
    }
    resetForm();
    setPanelMode('create');
    setEditingId(null);
  };

  const openEditForm = (id: number) => {
    if (!canUpdateReviews) {
      notify({ type: 'error', message: 'You do not have permission to edit reviews.' });
      return;
    }
    resetForm();
    setPanelMode('edit');
    setEditingId(id);
    editInitializedRef.current = false;
  };

  const populateFormFromReview = (review: ProductReview) => {
    setForm({
      productId: review.productId ? String(review.productId) : '',
      customerId: review.customerId ? String(review.customerId) : '',
      reviewerName: review.reviewerName ?? '',
      rating: review.rating != null ? String(review.rating) : '5',
      reviewDate: toDateInput(review.reviewedAt) || new Date().toISOString().slice(0, 10),
      comment: review.comment ?? '',
      published: review.published ? 'enabled' : 'disabled'
    });
    const mediaSelections = (review.media ?? [])
      .map((asset) => mediaAssetToSelection(asset))
      .filter((asset): asset is MediaSelection => Boolean(asset));
    setReviewAttachments(mediaSelections);
    setReviewerAvatar(mediaAssetToSelection(review.reviewerAvatar));
    setRatingHover(null);
  };

  useEffect(() => {
    if (panelMode !== 'edit') {
      editInitializedRef.current = false;
      return;
    }
    if (reviewDetailQuery.isLoading || reviewDetailQuery.isError || !reviewDetailQuery.data) {
      return;
    }
    if (editInitializedRef.current) {
      return;
    }
    populateFormFromReview(reviewDetailQuery.data);
    editInitializedRef.current = true;
  }, [panelMode, reviewDetailQuery.data, reviewDetailQuery.isLoading, reviewDetailQuery.isError]);

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const reviews: ProductReview[] = reviewsQuery.data?.content ?? [];
  const totalElements = reviewsQuery.data?.totalElements ?? 0;

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === form.customerId) ?? null,
    [customers, form.customerId]
  );

  const ratingLabels: Record<number, string> = {
    1: 'Needs work',
    2: 'Below expectations',
    3: 'Solid',
    4: 'Great',
    5: 'Outstanding'
  };
  const ratingValue = Number(form.rating) || 0;

  const handleCustomerChange = (value: string) => {
    const selected = customers.find((customer) => String(customer.id) === value) ?? null;
    setForm((previous) => ({
      ...previous,
      customerId: value,
      reviewerName: selected ? selected.name ?? '' : ''
    }));
    if (selected && selected.profileImageUrl) {
      const avatar = mediaAssetToSelection({ url: selected.profileImageUrl });
      setReviewerAvatar(avatar);
    } else {
      setReviewerAvatar(null);
    }
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
    const context = mediaDialogContext ?? 'attachments';
    formData.append('module', context === 'avatar' ? 'USER_PROFILE' : 'PRODUCT_MEDIA');
    try {
      const { data } = await api.post<UploadedFileUploadResponse[]>('/uploaded-files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const selections = (data ?? [])
        .filter((item): item is UploadedFileUploadResponse => Boolean(item && item.url))
        .map((uploaded) => ({
          url: uploaded.url,
          storageKey: uploaded.storageKey ?? undefined,
          originalFilename: uploaded.originalFilename ?? undefined,
          mimeType: uploaded.mimeType ?? undefined,
          sizeBytes: uploaded.sizeBytes ?? undefined
        }));
      if (!selections.length) {
        throw new Error('Upload failed');
      }
      notify({
        type: 'success',
        message:
          selections.length === 1
            ? `Uploaded ${selections[0].originalFilename ?? 'file'} successfully.`
            : `Uploaded ${selections.length} files successfully.`
      });
      return selections;
    } catch (error) {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to upload files. Please try again.')
      });
      throw error;
    }
  };

  const openMediaDialog = (context: MediaDialogContext) => {
    const canSubmit = panelMode === 'create' ? canCreateReviews : canUpdateReviews;
    if (!canSubmit) {
      notify({ type: 'error', message: 'You do not have permission to update review media.' });
      return;
    }
    if (context === 'avatar' && form.customerId) {
      return;
    }
    setMediaDialogContext(context);
  };

  const closeMediaDialog = () => {
    setMediaDialogContext(null);
  };

  const handleMediaSelect = (selection: MediaSelection | MediaSelection[]) => {
    if (!mediaDialogContext) {
      return;
    }
    const selections = Array.isArray(selection) ? selection : [selection];
    if (!selections.length) {
      setMediaDialogContext(null);
      return;
    }
    if (mediaDialogContext === 'attachments') {
      setReviewAttachments((previous) => [...previous, ...selections]);
    } else {
      setReviewerAvatar(selections[0]);
    }
    setMediaDialogContext(null);
  };

  const removeAttachment = (index: number) => {
    setReviewAttachments((previous) => previous.filter((_, idx) => idx !== index));
  };

  const handleDeleteReview = async (review: ProductReview) => {
    if (!canDeleteReviews) {
      notify({ type: 'error', message: 'You do not have permission to delete reviews.' });
      return;
    }
    const confirmed = await confirm({
      title: 'Delete review?',
      description: `Delete review from "${review.reviewerName ?? review.customerName ?? 'Anonymous shopper'}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteReviewMutation.mutateAsync(review.id);
  };

  const handleVisibilityChange = (review: ProductReview, published: boolean) => {
    if (!canUpdateReviews) {
      notify({ type: 'error', message: 'You do not have permission to update reviews.' });
      return;
    }
    if (review.published === published) {
      return;
    }
    if (toggleReviewVisibilityMutation.isPending && visibilityUpdatingId === review.id) {
      return;
    }
    toggleReviewVisibilityMutation.mutate({ review, published });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isCreateMode = panelMode === 'create';
    const isEditMode = panelMode === 'edit';
    const canSubmit = isCreateMode ? canCreateReviews : canUpdateReviews;
    if (!canSubmit) {
      notify({ type: 'error', message: 'You do not have permission to save reviews.' });
      return;
    }
    if (createReviewMutation.isPending || updateReviewMutation.isPending) {
      return;
    }
    if (!form.productId) {
      notify({ type: 'error', message: 'Select a product before saving the review.' });
      return;
    }
    const ratingNumber = Number(form.rating);
    if (!Number.isFinite(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      notify({ type: 'error', message: 'Choose a rating between 1 and 5 stars.' });
      return;
    }

    const payload: CreateProductReviewPayload = {
      productId: Number(form.productId),
      customerId: form.customerId ? Number(form.customerId) : null,
      reviewerName: form.customerId ? undefined : form.reviewerName.trim() || undefined,
      reviewerAvatar: form.customerId ? undefined : reviewerAvatar ?? undefined,
      rating: Math.round(ratingNumber),
      comment: form.comment.trim() || undefined,
      reviewedAt: toIsoDate(form.reviewDate),
      media: reviewAttachments,
      published: form.published === 'enabled'
    };

    if (isEditMode && editingId != null) {
      updateReviewMutation.mutate({ id: editingId, payload });
    } else {
      createReviewMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    if (panelMode === 'edit' && reviewDetailQuery.data) {
      populateFormFromReview(reviewDetailQuery.data);
      return;
    }
    closeForm();
  };

  const renderAttachmentPreviews = (canSubmit: boolean) => (
    <div className="flex flex-wrap gap-3">
      {reviewAttachments.map((asset, index) => (
        <div
          key={`${asset.url}-${index}`}
          className="group relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200"
        >
          <ImagePreview
            src={asset.url}
            alt="Review attachment"
            className="h-full w-full"
            aspectClassName=""
            mode="contain"
            mimeType={asset.mimeType ?? null}
          />
          {canSubmit && (
            <button
              type="button"
              onClick={() => removeAttachment(index)}
              className="absolute right-1 top-1 hidden rounded-full bg-white/90 p-1 text-xs text-slate-600 shadow-sm transition group-hover:flex"
              aria-label="Remove attachment"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {canSubmit && (
        <button
          type="button"
          onClick={() => openMediaDialog('attachments')}
          className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary"
        >
          Add media
        </button>
      )}
    </div>
  );

  const renderForm = () => {
    const isCreateMode = panelMode === 'create';
    const isEditMode = panelMode === 'edit';
    const canSubmit = isCreateMode ? canCreateReviews : canUpdateReviews;
    const isSaving = createReviewMutation.isPending || updateReviewMutation.isPending;

    if (isEditMode && reviewDetailQuery.isLoading && !editInitializedRef.current) {
      return (
        <PageSection title="Loading review details">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            Loading review details…
          </div>
        </PageSection>
      );
    }

    if (isEditMode && reviewDetailQuery.isError && !reviewDetailQuery.data) {
      return (
        <PageSection title="Unable to load review">
          <div className="space-y-3 text-sm text-slate-600">
            <p>We couldn’t load this review right now. Please try again.</p>
            <button
              type="button"
              onClick={() => reviewDetailQuery.refetch()}
              className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              Retry
            </button>
          </div>
        </PageSection>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <PageSection
          title={isCreateMode ? 'Add manual review' : 'Edit review'}
          description={
            isCreateMode
              ? 'Capture testimonials collected offline and feature them alongside storefront reviews.'
              : 'Update the review content, rating, or attribution to keep information accurate.'
          }
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="review-product">
                  Product
                </label>
                <select
                  id="review-product"
                  value={form.productId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      productId: event.target.value
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                  disabled={!canSubmit}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductDetailQuery.data && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-inner">
                  <div className="flex items-center gap-3">
                    <ImagePreview
                      src={selectedProductDetailQuery.data.thumbnail?.url}
                      mimeType={selectedProductDetailQuery.data.thumbnail?.mimeType ?? null}
                      alt={`${selectedProductDetailQuery.data.name} thumbnail`}
                      className="h-16 w-16 rounded-lg border border-slate-200 bg-white"
                      aspectClassName=""
                      mode="contain"
                      fallback={
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
                      }
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedProductDetailQuery.data.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedProductDetailQuery.data.pricing.unitPrice != null
                          ? formatCurrency(
                              selectedProductDetailQuery.data.pricing.unitPrice,
                              baseCurrency
                            )
                          : 'Price unavailable'}
                      </p>
                      {selectedProductDetailQuery.data.pricing.sku && (
                        <p className="text-xs text-slate-400">
                          SKU · {selectedProductDetailQuery.data.pricing.sku}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="review-customer">
                  Customer (optional)
                </label>
                <select
                  id="review-customer"
                  value={form.customerId}
                  onChange={(event) => handleCustomerChange(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canSubmit}
                >
                  <option value="">Guest / anonymous</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <p className="text-xs text-slate-500">
                    Name and avatar use customer details. Clear the selection to customise.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="reviewer-name">
                  Reviewer name
                </label>
                <input
                  id="reviewer-name"
                  type="text"
                  value={form.reviewerName}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      reviewerName: event.target.value
                    }))
                  }
                  placeholder="E.g. Priya Sharma"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canSubmit || Boolean(form.customerId)}
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Reviewer avatar</span>
                <div className="flex items-center gap-3">
                  <ImagePreview
                    src={reviewerAvatar?.url || selectedCustomer?.profileImageUrl}
                    alt="Reviewer avatar preview"
                    mimeType={reviewerAvatar?.mimeType ?? null}
                    className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100"
                    aspectClassName=""
                    mode="contain"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                        {(form.reviewerName || selectedCustomer?.name || 'A').charAt(0).toUpperCase()}
                      </div>
                    }
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => openMediaDialog('avatar')}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      disabled={!canSubmit || Boolean(form.customerId)}
                    >
                      {reviewerAvatar ? 'Change avatar' : 'Upload avatar'}
                    </button>
                    {reviewerAvatar && !form.customerId && (
                      <button
                        type="button"
                        onClick={() => setReviewerAvatar(null)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Rating</span>
                <div className={`flex flex-col gap-2 ${!canSubmit ? 'opacity-60' : ''}`}>
                  <StarRating
                    value={ratingValue}
                    min={1}
                    max={5}
                    allowHalf={false}
                    disabled={!canSubmit}
                    onChange={(next) => {
                      if (!canSubmit) {
                        return;
                      }
                      setForm((previous) => ({ ...previous, rating: String(Math.round(next)) }));
                    }}
                    onHoverChange={(next) => setRatingHover(next)}
                    ariaLabel="Select review rating"
                  />
                  <div className="text-xs text-slate-500">
                    {ratingHover
                      ? ratingLabels[Math.round(ratingHover as number)] ?? ''
                      : ratingLabels[Math.round(ratingValue)] ?? ''}
                  </div>
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-700">Visibility</legend>
                <p className="text-xs text-slate-500">
                  Choose whether this review appears on customer-facing experiences or stays internal.
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name="review-visibility"
                      value="enabled"
                      checked={form.published === 'enabled'}
                      onChange={() => setForm((previous) => ({ ...previous, published: 'enabled' }))}
                      disabled={!canSubmit}
                      className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/40 disabled:cursor-not-allowed"
                    />
                    <span>Visible</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name="review-visibility"
                      value="disabled"
                      checked={form.published === 'disabled'}
                      onChange={() => setForm((previous) => ({ ...previous, published: 'disabled' }))}
                      disabled={!canSubmit}
                      className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/40 disabled:cursor-not-allowed"
                    />
                    <span>Hidden</span>
                  </label>
                </div>
              </fieldset>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="review-date">
                  Review date
                </label>
                <input
                  id="review-date"
                  type="date"
                  value={form.reviewDate}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      reviewDate: event.target.value
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canSubmit}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="review-comment">
                  Comment
                </label>
                <textarea
                  id="review-comment"
                  rows={6}
                  value={form.comment}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      comment: event.target.value
                    }))
                  }
                  placeholder="Share highlights, quotes, or customer sentiments."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canSubmit}
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Attachments</span>
                {renderAttachmentPreviews(canSubmit)}
              </div>
            </div>
          </div>
        </PageSection>

        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm text-slate-500">
            {!canSubmit && (
              <span>
                You do not have permission to {isCreateMode ? 'create' : 'update'} reviews. Contact an administrator to request
                access.
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              {isEditMode ? 'Reset changes' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
            >
              Back to list
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSaving}
              className={`inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                !canSubmit || isSaving ? 'bg-slate-400' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {isSaving ? 'Saving…' : isCreateMode ? 'Save review' : 'Update review'}
            </button>
          </div>
        </div>
      </form>
    );
  };

  const renderList = () => (
    <div className="space-y-6">
      <PageSection
        title="Filter reviews"
        description="Narrow results by product, category, customer, or rating."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="review-filter-product">
              Product
            </label>
            <select
              id="review-filter-product"
              value={productFilter}
              onChange={(event) => {
                setProductFilter(event.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="review-filter-category">
              Category
            </label>
            <select
              id="review-filter-category"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="review-filter-customer">
              Customer
            </label>
            <select
              id="review-filter-customer"
              value={customerFilter}
              onChange={(event) => {
                setCustomerFilter(event.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="review-filter-rating">
              Rating
            </label>
            <select
              id="review-filter-rating"
              value={ratingFilter}
              onChange={(event) => {
                setRatingFilter(event.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((score) => (
                <option key={score} value={score}>
                  {score} star{score === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </PageSection>

      <PageSection
        padded={false}
        title="All reviews"
        description="View, edit, and curate testimonials from every channel."
      >
        {!canViewReviews ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            You do not have permission to view existing reviews.
          </div>
        ) : reviewsQuery.isLoading && !reviews.length ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">Loading reviews…</div>
        ) : reviews.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewed on</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Media</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Comment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  {(canUpdateReviews || canDeleteReviews) && (
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reviews.map((review) => {
                  const displayName =
                    review.reviewerName?.trim() || review.customerName?.trim() || 'Anonymous shopper';
                  const reviewedOn = new Date(review.reviewedAt).toLocaleDateString();
                  const productName = review.productName;
                  return (
                    <tr key={review.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <ImagePreview
                            src={review.reviewerAvatar?.url}
                            mimeType={review.reviewerAvatar?.mimeType ?? null}
                            alt={`${displayName} avatar`}
                            className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100"
                            aspectClassName=""
                            mode="contain"
                            fallback={
                              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            }
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                            {review.customerName && (
                              <p className="text-xs text-slate-500">Customer · {review.customerName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        <div className="font-medium text-slate-800">{productName}</div>
                        {review.productCategories.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {review.productCategories.map((category) => (
                              <span
                                key={category.id}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                              >
                                {category.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                          <StarRating
                            value={review.rating}
                            min={0}
                            readOnly
                            size="sm"
                            ariaLabel={`Rating ${review.rating.toFixed(1)} out of 5`}
                          />
                          <span className="text-slate-600">{review.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{reviewedOn}</td>
                      <td className="px-4 py-4">
                        {review.media.length ? (
                          <div className="flex flex-wrap gap-2">
                            {review.media.slice(0, 3).map((asset, index) =>
                              isVideoAsset(asset) ? (
                                <span
                                  key={`${review.id}-video-${index}`}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                                >
                                  Video
                                </span>
                              ) : (
                                <ImagePreview
                                  key={`${review.id}-media-${index}`}
                                  src={asset.url}
                                  mimeType={asset.mimeType ?? null}
                                  alt="Review media"
                                  width={48}
                                  height={48}
                                  className="rounded-lg border border-slate-200"
                                  aspectClassName=""
                                  mode="contain"
                                />
                              )
                            )}
                            {review.media.length > 3 && (
                              <span className="text-xs text-slate-500">+{review.media.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        <div className="max-w-xs truncate" title={review.comment ?? ''}>
                          {review.comment ? review.comment : <span className="text-slate-400">No comment</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        <fieldset className="flex flex-wrap items-center gap-4" aria-label="Review visibility">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name={`review-${review.id}-status`}
                              value="enabled"
                              checked={review.published}
                              onChange={() => handleVisibilityChange(review, true)}
                              disabled={!canUpdateReviews || visibilityUpdatingId === review.id}
                              className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/40 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm">Visible</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name={`review-${review.id}-status`}
                              value="disabled"
                              checked={!review.published}
                              onChange={() => handleVisibilityChange(review, false)}
                              disabled={!canUpdateReviews || visibilityUpdatingId === review.id}
                              className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/40 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm">Hidden</span>
                          </label>
                        </fieldset>
                        {visibilityUpdatingId === review.id && (
                          <p className="mt-1 text-xs text-slate-400">Updating…</p>
                        )}
                      </td>
                      {(canUpdateReviews || canDeleteReviews) && (
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {canUpdateReviews && (
                              <button
                                type="button"
                                onClick={() => openEditForm(review.id)}
                                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                                aria-label={`Edit review from ${displayName}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                  <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                                </svg>
                              </button>
                            )}
                            {canDeleteReviews && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(review)}
                                className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                                aria-label={`Delete review from ${displayName}`}
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
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No reviews found for the selected filters.
          </div>
        )}
      </PageSection>

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
        isLoading={reviewsQuery.isLoading}
      />
    </div>
  );

  const headerActions =
    panelMode === 'list'
      ? canCreateReviews
        ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Add review
            </button>
          )
        : null
      : (
          <button
            type="button"
            onClick={closeForm}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Back to reviews
          </button>
        );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Monitor customer sentiment, curate featured testimonials, and manage review content across the catalog."
        actions={headerActions}
      />

      {panelMode === 'list' ? renderList() : renderForm()}

      <MediaLibraryDialog
        open={mediaDialogContext !== null}
        onClose={closeMediaDialog}
        onSelect={handleMediaSelect}
        onUpload={mediaDialogContext ? handleMediaUpload : undefined}
        onUploadComplete={handleMediaSelect}
        moduleFilters={mediaDialogContext ? MEDIA_FILTERS[mediaDialogContext] : undefined}
      />
    </div>
  );
};

export default ReviewsPage;
