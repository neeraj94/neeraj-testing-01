import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import { useToast } from '../components/ToastProvider';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import api from '../services/http';
import { extractErrorMessage } from '../utils/errors';
import { formatCurrency } from '../utils/currency';
import type { ProductReviewPage, CreateProductReviewPayload, ProductDetail, ProductSummary } from '../types/product';
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

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const ReviewsPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const baseCurrency = useAppSelector((state) => state.settings.theme.baseCurrency);

  const canManageReviews = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_CREATE', 'PRODUCT_UPDATE']),
    [permissions]
  );

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [productFilter, setProductFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  const [manualReviewForm, setManualReviewForm] = useState({
    productId: '',
    customerId: '',
    reviewerName: '',
    rating: '5',
    reviewDate: new Date().toISOString().slice(0, 10),
    comment: ''
  });
  const [reviewAttachments, setReviewAttachments] = useState<MediaSelection[]>([]);
  const [reviewerAvatar, setReviewerAvatar] = useState<MediaSelection | null>(null);
  const [mediaDialogContext, setMediaDialogContext] = useState<'attachments' | 'avatar' | null>(null);
  const [ratingHover, setRatingHover] = useState<number | null>(null);

  const MEDIA_FILTERS: Record<'attachments' | 'avatar', string[]> = {
    attachments: ['PRODUCT_MEDIA', 'PRODUCT_GALLERY_IMAGE', 'PRODUCT_VARIANT_IMAGE'],
    avatar: ['USER_PROFILE', 'PRODUCT_MEDIA']
  };

  const selectionFromUrl = (url?: string | null): MediaSelection | null => {
    if (!url || !url.trim()) {
      return null;
    }
    const trimmed = url.trim();
    return {
      url: trimmed,
      storageKey: null,
      originalFilename: null,
      mimeType: undefined,
      sizeBytes: undefined
    };
  };

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

  const reviewsQuery = useQuery({
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
    }
  });

  const selectedProductId = manualReviewForm.productId ? Number(manualReviewForm.productId) : null;
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

  const manualReviewMutation = useMutation({
    mutationFn: async (payload: CreateProductReviewPayload) => {
      await api.post('/product-reviews', payload);
    },
    onSuccess: (_data, variables) => {
      notify({ type: 'success', message: 'Review added successfully.' });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      if (variables.productId) {
        queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.productId] });
      }
      resetManualReviewForm();
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to create review. Please try again later.')
      });
    }
  });

  const resetManualReviewForm = () => {
    setManualReviewForm({
      productId: '',
      customerId: '',
      reviewerName: '',
      rating: '5',
      reviewDate: new Date().toISOString().slice(0, 10),
      comment: ''
    });
    setReviewAttachments([]);
    setReviewerAvatar(null);
    setRatingHover(null);
  };

  const handleManualReviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageReviews) {
      notify({ type: 'error', message: 'You do not have permission to add manual reviews.' });
      return;
    }
    if (!manualReviewForm.productId) {
      notify({ type: 'error', message: 'Select a product before saving the review.' });
      return;
    }
    const ratingNumber = Number(manualReviewForm.rating);
    if (!Number.isFinite(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      notify({ type: 'error', message: 'Choose a rating between 1 and 5 stars.' });
      return;
    }

    const payload: CreateProductReviewPayload = {
      productId: Number(manualReviewForm.productId),
      customerId: manualReviewForm.customerId ? Number(manualReviewForm.customerId) : null,
      reviewerName: manualReviewForm.reviewerName.trim() || undefined,
      reviewerAvatar: reviewerAvatar ?? undefined,
      rating: ratingNumber,
      comment: manualReviewForm.comment.trim() || undefined,
      reviewedAt: manualReviewForm.reviewDate
        ? new Date(`${manualReviewForm.reviewDate}T00:00:00Z`).toISOString()
        : undefined,
      media: reviewAttachments
    };

    manualReviewMutation.mutate(payload);
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

  const openMediaDialog = (context: 'attachments' | 'avatar') => {
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

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const reviews = reviewsQuery.data?.content ?? [];
  const totalElements = reviewsQuery.data?.totalElements ?? 0;

  const ratingLabels: Record<number, string> = {
    1: 'Needs work',
    2: 'Below expectations',
    3: 'Solid',
    4: 'Great',
    5: 'Outstanding'
  };
  const ratingValue = Number(manualReviewForm.rating) || 0;

  const handleCustomerChange = (value: string) => {
    const selected = customers.find((customer) => String(customer.id) === value) ?? null;
    setManualReviewForm((previous) => ({
      ...previous,
      customerId: value,
      reviewerName: selected ? selected.name ?? '' : ''
    }));
    if (selected && selected.profileImageUrl) {
      const nextAvatar = selectionFromUrl(selected.profileImageUrl);
      setReviewerAvatar(nextAvatar);
    } else {
      setReviewerAvatar(null);
    }
  };

  const renderStars = (rating: number) => (
    <span className="inline-flex items-center gap-0.5 text-base leading-none">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < rating ? 'text-amber-400' : 'text-slate-300'}>
          ★
        </span>
      ))}
      <span className="sr-only">{`${rating} out of 5 stars`}</span>
    </span>
  );

  const isVideoAsset = (asset: { url: string; mimeType?: string | null }) => {
    if (asset.mimeType && asset.mimeType.toLowerCase().startsWith('video/')) {
      return true;
    }
    return /\.(mp4|webm|ogg|mov)$/i.test(asset.url);
  };

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === manualReviewForm.customerId) ?? null,
    [customers, manualReviewForm.customerId]
  );

  const selectedProductCategories = selectedProductDetailQuery.data?.categories ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Monitor customer sentiment, curate featured testimonials, and manage review content across the catalog."
      />

      <PageSection
        title="Create manual review"
        description="Add curated testimonials or post-purchase feedback captured outside the storefront."
      >
        <form onSubmit={handleManualReviewSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="manual-review-product">
                  Product
                </label>
                <select
                  id="manual-review-product"
                  value={manualReviewForm.productId}
                  onChange={(event) =>
                    setManualReviewForm((previous) => ({
                      ...previous,
                      productId: event.target.value
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                  disabled={!canManageReviews}
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
                    {selectedProductDetailQuery.data.thumbnail?.url ? (
                      <div className="aspect-square w-16 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <img
                          src={selectedProductDetailQuery.data.thumbnail.url}
                          alt=""
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                        No image
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedProductDetailQuery.data.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedProductDetailQuery.data.pricing.unitPrice != null
                          ? formatCurrency(selectedProductDetailQuery.data.pricing.unitPrice, baseCurrency)
                          : 'Price unavailable'}
                      </p>
                      {selectedProductDetailQuery.data.pricing.sku && (
                        <p className="text-xs text-slate-400">
                          SKU · {selectedProductDetailQuery.data.pricing.sku}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedProductCategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedProductCategories.map((category) => (
                        <span
                          key={category.id}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="manual-review-customer">
                  Customer (optional)
                </label>
                <select
                  id="manual-review-customer"
                  value={manualReviewForm.customerId}
                  onChange={(event) => handleCustomerChange(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canManageReviews}
                >
                  <option value="">Guest / anonymous</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    {selectedCustomer.profileImageUrl ? (
                      <div className="aspect-square w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        <img
                          src={selectedCustomer.profileImageUrl}
                          alt=""
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                    ) : (
                      <span className="inline-flex aspect-square w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{selectedCustomer.name}</p>
                      {selectedCustomer.email && <p className="text-xs text-slate-500">{selectedCustomer.email}</p>}
                      {selectedCustomer.phone && <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Their profile details are linked automatically. Clear the selection for a custom reviewer.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700" htmlFor="manual-review-name">
                  Reviewer name
                </label>
                <input
                  id="manual-review-name"
                  type="text"
                  value={manualReviewForm.reviewerName}
                  onChange={(event) =>
                    setManualReviewForm((previous) => ({
                      ...previous,
                      reviewerName: event.target.value
                    }))
                  }
                  placeholder="E.g. Priya Sharma"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canManageReviews || Boolean(manualReviewForm.customerId)}
                />
                {manualReviewForm.customerId && (
                  <p className="text-xs text-slate-500">Select “Guest / anonymous” to type a custom name.</p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Rating</span>
                <div className={`flex flex-col gap-2 ${!canManageReviews ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const score = index + 1;
                      const active = ratingHover != null ? score <= ratingHover : score <= ratingValue;
                      return (
                        <button
                          key={score}
                          type="button"
                          className={`transition focus:outline-none ${
                            active ? 'text-amber-400' : 'text-slate-300'
                          } ${
                            canManageReviews ? 'hover:text-amber-400 focus:ring-2 focus:ring-amber-200 rounded-full p-0.5' : ''
                          }`}
                          onMouseEnter={() => canManageReviews && setRatingHover(score)}
                          onMouseLeave={() => canManageReviews && setRatingHover(null)}
                          onClick={() => {
                            if (!canManageReviews) {
                              return;
                            }
                            setManualReviewForm((previous) => ({ ...previous, rating: String(score) }));
                          }}
                          disabled={!canManageReviews}
                          aria-label={`${score} star${score === 1 ? '' : 's'}`}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                            <path d="M11.48 3.499a.75.75 0 011.04.335l1.875 3.804 4.2.611a.75.75 0 01.416 1.28l-3.037 2.96.717 4.186a.75.75 0 01-1.088.791L12 15.347l-3.763 1.98a.75.75 0 01-1.088-.79l.717-4.187-3.037-2.96a.75.75 0 01.416-1.28l4.2-.611 1.875-3.804a.75.75 0 01.358-.335z" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {ratingHover
                      ? `${ratingHover} / 5 · ${ratingLabels[ratingHover] ?? 'Select a rating'}`
                      : ratingValue
                        ? `${ratingValue} / 5 · ${ratingLabels[ratingValue] ?? 'Select a rating'}`
                        : 'Select a rating'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="manual-review-date">
                  Review date
                </label>
                <input
                  id="manual-review-date"
                  type="date"
                  value={manualReviewForm.reviewDate}
                  onChange={(event) =>
                    setManualReviewForm((previous) => ({
                      ...previous,
                      reviewDate: event.target.value
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canManageReviews}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="manual-review-comment">
                  Comment
                </label>
                <textarea
                  id="manual-review-comment"
                  value={manualReviewForm.comment}
                  onChange={(event) =>
                    setManualReviewForm((previous) => ({
                      ...previous,
                      comment: event.target.value
                    }))
                  }
                  rows={6}
                  placeholder="Share the customer's story, highlight use cases, or capture qualitative feedback."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!canManageReviews}
                />
              </div>

            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Review media</p>
              <div className="flex flex-wrap gap-3">
                {reviewAttachments.map((asset, index) => (
                  <div
                    key={`${asset.url}-${index}`}
                    className="relative aspect-square w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
                  >
                    {isVideoAsset(asset) ? (
                      <video src={asset.url} className="h-full w-full object-cover object-center" controls />
                    ) : (
                      <img src={asset.url} alt="" className="h-full w-full object-cover object-center" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white shadow-sm"
                      aria-label="Remove attachment"
                      disabled={!canManageReviews}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => openMediaDialog('attachments')}
                  className="inline-flex aspect-square w-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                  disabled={!canManageReviews}
                >
                  Add media
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Attach lifestyle photos or video testimonials. These assets will surface alongside the review.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Reviewer avatar</p>
              <div className="flex items-center gap-4">
                {reviewerAvatar?.url ? (
                  <div className="aspect-square w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
                    <img
                      src={reviewerAvatar.url}
                      alt=""
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-16 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
                    {manualReviewForm.reviewerName
                      ? manualReviewForm.reviewerName.charAt(0).toUpperCase()
                      : '👤'}
                  </div>
                )}
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => openMediaDialog('avatar')}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    disabled={!canManageReviews}
                  >
                    {reviewerAvatar ? 'Replace avatar' : 'Upload avatar'}
                  </button>
                  {reviewerAvatar && (
                    <button
                      type="button"
                      onClick={() => setReviewerAvatar(null)}
                      className="text-sm font-medium text-rose-500 transition hover:text-rose-600 disabled:opacity-60"
                      disabled={!canManageReviews}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                We’ll default to the customer’s profile photo when available. Upload a custom avatar to override it.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {!canManageReviews && (
              <p className="text-sm text-rose-500">
                You need product creation or update permissions to add manual reviews.
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetManualReviewForm}
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                disabled={manualReviewMutation.isPending}
              >
                Reset
              </button>
              <button
                type="submit"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                disabled={!canManageReviews || manualReviewMutation.isPending}
              >
                {manualReviewMutation.isPending ? 'Saving…' : 'Save review'}
              </button>
            </div>
          </div>
        </form>
      </PageSection>

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
        bodyClassName="flex flex-col"
        title="All reviews"
        description="View every submission along with attachments and customer context."
      >
        <div className="space-y-4 px-4 py-4 sm:px-6">
          {reviewsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
              Loading reviews…
            </div>
          ) : reviews.length ? (
            reviews.map((review) => {
              const displayName =
                review.reviewerName?.trim() || review.customerName?.trim() || 'Anonymous shopper';
              const reviewedOn = new Date(review.reviewedAt).toLocaleDateString();
              return (
                <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                                {review.reviewerAvatar?.url ? (
                                  <img
                                    src={review.reviewerAvatar.url}
                                    alt=""
                                    className="h-12 w-12 rounded-full border border-slate-200 object-cover object-center"
                                  />
                      ) : (
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                        <p className="text-xs text-slate-500">Product · {review.productName}</p>
                        <p className="mt-1 text-xs text-slate-400">Reviewed on {reviewedOn}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                      {renderStars(Math.round(review.rating ?? 0))}
                      <span className="text-slate-600">{review.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4 text-sm text-slate-700">
                    {review.comment ? (
                      <p className="whitespace-pre-line leading-relaxed">{review.comment}</p>
                    ) : (
                      <p className="italic text-slate-500">No written comment provided.</p>
                    )}

                    {review.productCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {review.productCategories.map((category) => (
                          <span
                            key={category.id}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {category.name}
                          </span>
                        ))}
                      </div>
                    )}

                            {review.media.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {review.media.map((asset, index) =>
                          isVideoAsset(asset) ? (
                            <video
                              key={`${review.id}-video-${index}`}
                              src={asset.url}
                              controls
                              className="aspect-video w-full rounded-xl border border-slate-200 object-cover object-center shadow-sm"
                            />
                          ) : (
                            <img
                              key={`${review.id}-media-${index}`}
                              src={asset.url}
                              alt=""
                              className="aspect-video w-full rounded-xl border border-slate-200 object-cover object-center shadow-sm"
                            />
                          )
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No reviews found for the selected filters.
            </div>
          )}
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
          isLoading={reviewsQuery.isLoading}
        />
      </PageSection>

      <MediaLibraryDialog
        open={mediaDialogContext !== null}
        onClose={closeMediaDialog}
        onSelect={handleMediaSelect}
        onUpload={handleMediaUpload}
        onUploadComplete={handleMediaSelect}
        moduleFilters={mediaDialogContext ? MEDIA_FILTERS[mediaDialogContext] : undefined}
      />
    </div>
  );
};

export default ReviewsPage;
