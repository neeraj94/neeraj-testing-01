import { Fragment, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { api } from '../services/http';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { addCartItem, addGuestItem } from '../features/cart/cartSlice';
import { useToast } from '../components/ToastProvider';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency as formatCurrencyValue } from '../utils/currency';
import StorefrontHeader from '../components/StorefrontHeader';
import type {
  PublicProductDetail,
  PublicProductOffer,
  PublicProductRecommendation,
  PublicProductReview,
  PublicProductReviewSummary,
  PublicProductSection,
  PublicProductVariant,
  PublicProductVariantAttribute,
  PublicProductVariantAttributeValue
} from '../types/public-product';

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const classNames = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const buildStatusTone = (inStock: boolean) =>
  inStock
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-600';

const RECENT_STORAGE_KEY = 'storefront:recent-products';

const readRecentProductIds = (): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .slice(0, 20);
    }
  } catch (_error) {
    return [];
  }
  return [];
};

const writeRecentProductIds = (ids: number[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids.slice(0, 20)));
};

const PublicProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const reviewsRef = useRef<HTMLDivElement | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reviewLimit, setReviewLimit] = useState(3);
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const authUser = useAppSelector((state) => state.auth.user);
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const currencyCode = baseCurrency ?? 'USD';

  const formatPrice = useCallback(
    (value?: number | null) => (value == null ? null : formatCurrencyValue(value, currencyCode)),
    [currencyCode]
  );

  const productQuery = useQuery<PublicProductDetail>({
    queryKey: ['public-product', slug],
    queryFn: async () => {
      const recentIds = readRecentProductIds();
      const params = recentIds.length ? { recent: recentIds.join(',') } : undefined;
      const { data } = await api.get<PublicProductDetail>(`/public/products/${slug}`, { params });
      return data;
    },
    enabled: Boolean(slug)
  });

  const product = productQuery.data;

  useEffect(() => {
    if (!product?.id) {
      return;
    }
    const existing = readRecentProductIds();
    const deduped = existing.filter((value) => value !== product.id);
    const next = [product.id, ...deduped];
    writeRecentProductIds(next);
  }, [product?.id]);

  useEffect(() => {
    if (!product) {
      return;
    }
    const defaults: Record<number, number> = {};
    const preferredVariant = product.variants.find((variant) => variant.inStock) ?? product.variants[0];
    if (preferredVariant) {
      preferredVariant.selections.forEach((selection) => {
        defaults[selection.attributeId] = selection.valueId;
      });
    } else {
      product.variantAttributes.forEach((attribute) => {
        const firstValue = attribute.values[0];
        if (firstValue) {
          defaults[attribute.attributeId] = firstValue.id;
        }
      });
    }
    setSelectedValues(defaults);
    setQuantity(Math.max(product.minPurchaseQuantity ?? 1, 1));
    setActiveImageIndex(0);
    setReviewLimit(3);
  }, [product?.id]);

  const activeVariant: PublicProductVariant | undefined = useMemo(() => {
    if (!product || product.variantAttributes.length === 0) {
      return undefined;
    }
    return product.variants.find((variant) =>
      variant.selections.every((selection) => selectedValues[selection.attributeId] === selection.valueId)
    );
  }, [product, selectedValues]);

  const gallery = useMemo(() => {
    if (!product) {
      return [] as PublicProductDetail['gallery'];
    }
    if (activeVariant?.media?.length) {
      return activeVariant.media;
    }
    return product.gallery.length ? product.gallery : product.primaryImage ? [product.primaryImage] : [];
  }, [product, activeVariant]);

  useEffect(() => {
    if (!gallery.length) {
      setActiveImageIndex(0);
      return;
    }
    if (activeImageIndex >= gallery.length) {
      setActiveImageIndex(0);
    }
  }, [gallery, activeImageIndex]);

  const basePrice = product?.pricing.finalPrice ?? product?.pricing.unitPrice ?? null;
  const displayPrice = activeVariant?.finalPrice ?? basePrice;
  const originalPrice = product?.pricing.unitPrice ?? displayPrice;
  const savings = originalPrice != null && displayPrice != null ? Math.max(originalPrice - displayPrice, 0) : 0;
  const savingsLabel = savings > 0 ? formatPrice(savings) : null;
  const discountLabel =
    product?.pricing.discountType === 'PERCENTAGE' && product.pricing.discountPercentage != null
      ? `${product.pricing.discountPercentage}% off`
      : savingsLabel
        ? `${savingsLabel} off`
        : null;

  const inStock = activeVariant ? activeVariant.inStock : product?.stock.inStock ?? false;
  const availableQuantity = activeVariant?.quantity ?? product?.stock.availableQuantity ?? null;
  const maxPurchaseLimit = product?.maxPurchaseQuantity ?? availableQuantity ?? null;
  const minPurchase = product?.minPurchaseQuantity ?? 1;
  const variantLabel = useMemo(() => {
    if (!activeVariant) {
      return null;
    }
    if (!activeVariant.selections.length) {
      return activeVariant.key ?? null;
    }
    const labels = activeVariant.selections
      .map((selection) => selection.value)
      .filter((value): value is string => Boolean(value));
    if (labels.length === 0) {
      return activeVariant.key ?? null;
    }
    return labels.join(' • ');
  }, [activeVariant]);
  const currentUnitPrice = Number(displayPrice ?? 0);
  const productThumbnail =
    activeVariant?.media?.[0]?.url ?? product?.primaryImage?.url ?? product?.gallery[0]?.url ?? null;

  const incrementQuantity = () => {
    setQuantity((current) => {
      const next = current + 1;
      if (maxPurchaseLimit != null && next > maxPurchaseLimit) {
        return current;
      }
      return next;
    });
  };

  const decrementQuantity = () => {
    setQuantity((current) => Math.max(minPurchase, current - 1));
  };

  const handleSelectAttribute = (attributeId: number, valueId: number) => {
    setSelectedValues((prev) => ({ ...prev, [attributeId]: valueId }));
  };

  const requiresVariantSelection = Boolean(product?.variantAttributes.length);
  const hasValidSelection = !requiresVariantSelection || Boolean(activeVariant);

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAddToCart = () => {
    if (!product || !hasValidSelection || !inStock) {
      notify({
        type: 'error',
        title: 'Unable to add to cart',
        message: 'Please select available options before adding this product to your cart.'
      });
      return;
    }
    const payload = {
      productId: product.id,
      variantId: activeVariant?.id ?? null,
      quantity
    };
    if (authUser) {
      dispatch(addCartItem(payload))
        .unwrap()
        .then(() => {
          notify({
            type: 'success',
            title: 'Added to cart',
            message: `${quantity} × ${product.name} added to your cart.`
          });
        })
        .catch((error: unknown) => {
          notify({
            type: 'error',
            title: 'Unable to add to cart',
            message: error instanceof Error ? error.message : 'Please try again later.'
          });
        });
      return;
    }
    const cappedQuantity = availableQuantity != null ? Math.min(quantity, availableQuantity) : quantity;
    dispatch(
      addGuestItem({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        sku: activeVariant?.sku ?? product.sku,
        variantId: activeVariant?.id ?? null,
        variantLabel: variantLabel ?? undefined,
        quantity: cappedQuantity,
        availableQuantity: availableQuantity ?? undefined,
        unitPrice: currentUnitPrice,
        thumbnailUrl: productThumbnail ?? undefined
      })
    );
    notify({
      type: 'success',
      title: 'Saved to cart',
      message: `${cappedQuantity} × ${product.name} saved in your cart.`
    });
  };

  const loadError = productQuery.isError ? (productQuery.error as AxiosError | undefined) : undefined;

  const visibleReviews = product ? product.reviews.slice(0, reviewLimit) : [];
  const canLoadMoreReviews = Boolean(product && reviewLimit < product.reviews.length);

  return (
    <div className="min-h-screen bg-[#EEF2F7] text-slate-900">
      <StorefrontHeader activeKey="products" />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {productQuery.isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-sm text-slate-500 shadow-sm">
            Loading product details…
          </div>
        )}

        {!productQuery.isLoading && !product && (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-sm text-slate-500 shadow-sm">
            {loadError?.response?.status === 404
              ? 'This product could not be found.'
              : 'We were unable to load this product. Please try again later.'}
          </div>
        )}

        {product && (
          <div className="flex flex-col gap-10">
            <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8">
              <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
                <div className="flex flex-col gap-5">
                  <div className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-slate-50">
                    {gallery.length === 0 && (
                      <div className="flex h-[28rem] items-center justify-center text-sm text-slate-400">
                        No imagery available
                      </div>
                    )}
                    {gallery.length > 0 && (
                      <img
                        src={gallery[activeImageIndex]?.url}
                        alt={product.name}
                        className="h-[28rem] w-full object-cover"
                      />
                    )}
                    {gallery.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-600 shadow">
                        {gallery.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setActiveImageIndex(index)}
                            className={classNames(
                              'h-2.5 w-2.5 rounded-full transition',
                              index === activeImageIndex ? 'bg-emerald-500' : 'bg-slate-300'
                            )}
                            aria-label={`Show image ${index + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {gallery.length > 1 && (
                    <div className="grid grid-cols-4 gap-3">
                      {gallery.map((image, index) => (
                        <button
                          key={image.url + index}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={classNames(
                            'overflow-hidden rounded-2xl border-2 transition',
                            index === activeImageIndex
                              ? 'border-emerald-500 shadow-lg shadow-emerald-200/40'
                              : 'border-transparent hover:border-emerald-200'
                          )}
                        >
                          <img
                            src={image.url}
                            alt={`${product.name} thumbnail ${index + 1}`}
                            className="h-24 w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-600">
                      {product.categoryNames.map((category) => (
                        <span key={category} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                          {category}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{product.name}</h1>
                      {product.brandName && <p className="text-sm text-slate-500">By {product.brandName}</p>}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <button
                          type="button"
                          onClick={scrollToReviews}
                          className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-600 transition hover:bg-amber-100"
                        >
                          <StarRating rating={product.reviewSummary.averageRating} />
                          <span>
                            {product.reviewSummary.averageRating.toFixed(1)} ({product.reviewSummary.totalReviews} reviews)
                          </span>
                        </button>
                        <span
                          className={classNames(
                            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold',
                            buildStatusTone(inStock)
                          )}
                        >
                          {inStock ? '✅ In Stock' : '❌ Out of Stock'}
                        </span>
                        {product.sku && <span className="text-xs text-slate-400">SKU: {product.sku}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 rounded-[24px] border border-slate-100 bg-[#F8FAFF] p-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-baseline gap-4">
                        <span className="text-4xl font-semibold text-slate-900">
                          {formatPrice(displayPrice) ?? '—'}
                        </span>
                        {originalPrice != null && originalPrice > (displayPrice ?? 0) && (
                          <span className="text-base text-slate-400 line-through">{formatPrice(originalPrice)}</span>
                        )}
                        {discountLabel && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            {discountLabel}
                          </span>
                        )}
                      </div>
                      {savingsLabel && <p className="text-sm text-emerald-600">You save {savingsLabel}</p>}
                      {product.shortDescription && (
                        <p className="text-sm text-slate-600">{product.shortDescription}</p>
                      )}
                    </div>

                    {product.offers.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Available offers</h2>
                          <span className="text-xs text-slate-400">Apply at checkout</span>
                        </div>
                        <div className="space-y-3">
                    {product.offers.map((offer) => (
                      <OfferCard key={offer.id} offer={offer} formatPrice={formatPrice} />
                    ))}
                  </div>
                </div>
              )}
            </div>

                  {product.variantAttributes.length > 0 && (
                    <div className="space-y-6">
                      {product.variantAttributes.map((attribute) => (
                        <VariantSelector
                          key={attribute.attributeId}
                          attribute={attribute}
                          selectedValueId={selectedValues[attribute.attributeId]}
                          onSelect={(valueId) => handleSelectAttribute(attribute.attributeId, valueId)}
                          disabled={!inStock}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center rounded-full border border-slate-200 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={decrementQuantity}
                          className="px-4 py-2 text-lg font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-40"
                          disabled={quantity <= minPurchase}
                        >
                          –
                        </button>
                        <span className="min-w-[3rem] text-center text-lg font-semibold text-slate-900">{quantity}</span>
                        <button
                          type="button"
                          onClick={incrementQuantity}
                          className="px-4 py-2 text-lg font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-40"
                          disabled={maxPurchaseLimit != null && quantity >= maxPurchaseLimit}
                        >
                          +
                        </button>
                      </div>
                      <div className="flex flex-col text-xs text-slate-500">
                        <span>Minimum order: {minPurchase}</span>
                        {maxPurchaseLimit != null && (
                          <span>You can purchase up to {maxPurchaseLimit} units of this product.</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="flex-1 rounded-full bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        disabled={!inStock || !hasValidSelection}
                      >
                        <span className="mr-2">🛒</span>Add to Cart
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-full border border-emerald-500 px-6 py-3 text-center text-sm font-semibold text-emerald-600 transition hover:-translate-y-0.5 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        disabled={!inStock || !hasValidSelection}
                      >
                        <span className="mr-2">⚡</span>Buy Now
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {product.frequentlyBought.length > 0 && (
              <FrequentlyBoughtTogether
                product={product}
                items={product.frequentlyBought}
                formatPrice={formatPrice}
              />
            )}

            {(product.expandableSections.length > 0 || product.infoSections.length > 0) && (
              <HighlightsPanel expandable={product.expandableSections} info={product.infoSections} />
            )}

            <ReviewSection
              ref={reviewsRef}
              reviews={visibleReviews}
              summary={product.reviewSummary}
              totalReviews={product.reviews.length}
              canLoadMore={canLoadMoreReviews}
              onLoadMore={() => setReviewLimit((limit) => Math.min(limit + 3, product.reviews.length))}
            />

            {product.recentlyViewed.length > 0 && (
              <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">Recently viewed</h2>
                  <Link to="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                    Explore more
                  </Link>
                </div>
                <div className="mt-6 overflow-x-auto pb-2">
                  <div className="flex gap-6">
                    {product.recentlyViewed.map((item) => (
                      <RecommendationTile key={item.id} item={item} formatPrice={formatPrice} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const OfferCard = ({
  offer,
  formatPrice
}: {
  offer: PublicProductOffer;
  formatPrice: (value?: number | null) => string | null;
}) => {
  const discountLabel =
    offer.discountType === 'PERCENTAGE'
      ? `${offer.discountValue}% off`
      : (() => {
          const amount = formatPrice(offer.discountValue);
          return amount ? `${amount} off` : 'Special savings';
        })();

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{offer.name}</p>
          <p className="text-xs text-emerald-600">{discountLabel}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-mono text-slate-700 shadow">{offer.code}</span>
      </div>
      {offer.shortDescription && <p className="text-xs text-slate-600">{offer.shortDescription}</p>}
      <p className="text-[11px] uppercase tracking-wide text-slate-400">
        Valid {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
      </p>
    </div>
  );
};

const VariantSelector = ({
  attribute,
  selectedValueId,
  onSelect,
  disabled
}: {
  attribute: PublicProductVariantAttribute;
  selectedValueId?: number;
  onSelect: (valueId: number) => void;
  disabled: boolean;
}) => {
  const isSwatch = attribute.displayType === 'swatch';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{attribute.attributeName}</span>
        {selectedValueId != null && (
          <span className="text-xs text-slate-400">
            {attribute.values.find((value) => value.id === selectedValueId)?.label ?? ''}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {attribute.values.map((value) => {
          const isSelected = value.id === selectedValueId;
          if (isSwatch) {
            return (
              <button
                key={value.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(value.id)}
                className={classNames(
                  'flex h-12 w-12 items-center justify-center rounded-full border-2 transition',
                  isSelected ? 'border-emerald-500 shadow-lg shadow-emerald-200/50' : 'border-transparent',
                  disabled ? 'opacity-40' : 'hover:border-emerald-300'
                )}
                title={value.label}
              >
                <span
                  className="h-8 w-8 rounded-full border border-white"
                  style={{ backgroundColor: value.swatchColor ?? '#CBD5F5' }}
                />
              </button>
            );
          }
          return (
            <button
              key={value.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(value.id)}
              className={classNames(
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700',
                disabled ? 'opacity-40' : 'hover:border-emerald-300 hover:text-emerald-700'
              )}
            >
              {value.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FrequentlyBoughtTogether = ({
  product,
  items,
  formatPrice
}: {
  product: PublicProductDetail;
  items: PublicProductRecommendation[];
  formatPrice: (value?: number | null) => string | null;
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(items.map((item) => item.id)));

  useEffect(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const bundlePrice = useMemo(() => {
    const extras = items.filter((item) => selectedIds.has(item.id));
    const extrasTotal = extras.reduce((acc, item) => acc + (item.finalPrice ?? item.originalPrice ?? 0), 0);
    const primaryPrice = product.pricing.finalPrice ?? product.pricing.unitPrice ?? 0;
    return primaryPrice + extrasTotal;
  }, [items, selectedIds, product.pricing.finalPrice, product.pricing.unitPrice]);

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/40">
      <h2 className="text-xl font-semibold text-slate-900">Frequently bought together</h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-[2.3fr_1fr] lg:items-start">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[{ id: product.id, name: product.name, slug: product.slug, imageUrl: product.primaryImage?.url ?? '', finalPrice: product.pricing.finalPrice ?? product.pricing.unitPrice } as PublicProductRecommendation]
            .concat(items)
            .map((item) => {
              const isPrimary = item.id === product.id;
              const price = item.finalPrice ?? item.originalPrice;
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    {!isPrimary && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    )}
                    <img
                      src={item.imageUrl || product.primaryImage?.url || ''}
                      alt={item.name}
                      className="h-16 w-16 rounded-2xl border border-slate-100 object-cover"
                    />
                    <div className="flex flex-col gap-1">
                      <Link to={`/product/${item.slug}`} className="text-sm font-semibold text-slate-800 hover:text-emerald-600">
                        {item.name}
                      </Link>
                      <span className="text-sm text-slate-500">{formatPrice(price) ?? '—'}</span>
                    </div>
                  </div>
                  {isPrimary && <span className="text-xs font-medium uppercase tracking-wide text-emerald-600">Main product</span>}
                </div>
              );
            })}
        </div>
        <div className="rounded-[28px] border border-emerald-100 bg-emerald-500 p-6 text-white shadow-xl shadow-emerald-200/70">
          <p className="text-sm uppercase tracking-wide text-white/80">Bundle total</p>
          <p className="mt-3 text-3xl font-bold">{formatPrice(bundlePrice) ?? '—'}</p>
          <p className="mt-2 text-xs text-white/80">
            Includes base product and {selectedIds.size} add-on{selectedIds.size === 1 ? '' : 's'}.
          </p>
          <button className="mt-6 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-600 shadow-lg shadow-emerald-200/70">
            Add bundle to cart
          </button>
        </div>
      </div>
    </section>
  );
};

const HighlightsPanel = ({
  expandable,
  info
}: {
  expandable: PublicProductSection[];
  info: PublicProductSection[];
}) => {
  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/40">
      <div className="grid gap-6 md:grid-cols-2">
        <SectionContent title="Key Features" sections={expandable} />
        <SectionContent title="Technical Specifications" sections={info} />
      </div>
    </section>
  );
};

const SectionContent = ({ title, sections }: { title: string; sections: PublicProductSection[] }) => {
  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">Details coming soon.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">
        {sections.map((section, index) => (
          <Fragment key={`${section.title ?? 'section'}-${index}`}>
            <div className="space-y-2">
              {section.title && <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>}
              {section.content && <p className="text-sm text-slate-600">{section.content}</p>}
              {section.bulletPoints.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {section.bulletPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
            {index !== sections.length - 1 && <div className="h-px w-full bg-slate-200" />}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const ReviewSection = forwardRef<
  HTMLDivElement,
  {
    reviews: PublicProductReview[];
    summary: PublicProductReviewSummary;
    totalReviews: number;
    canLoadMore: boolean;
    onLoadMore: () => void;
  }
>(({ reviews, summary, totalReviews, canLoadMore, onLoadMore }, ref) => {
  return (
    <section
      ref={ref}
      className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/40"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Customer Reviews</h2>
          <p className="mt-2 text-sm text-slate-500">
            Rated {summary.averageRating.toFixed(1)} out of 5 based on {totalReviews} review
            {totalReviews === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-500 px-6 py-4 text-white shadow-lg shadow-emerald-200/60">
          <p className="text-sm uppercase tracking-wide text-white/80">Average rating</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold">{summary.averageRating.toFixed(1)}</span>
            <span className="text-sm">/ 5</span>
          </div>
          <StarRating rating={summary.averageRating} className="mt-2" size="text-lg" />
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {reviews.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            There are no published reviews yet. Be the first to share your experience!
          </div>
        )}

        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {canLoadMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-full border border-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            Load more reviews
          </button>
        </div>
      )}
    </section>
  );
});

ReviewSection.displayName = 'ReviewSection';

const ReviewCard = ({ review }: { review: PublicProductReview }) => (
  <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-base font-semibold text-slate-900">{review.reviewerName}</p>
        {review.customerAddress && <p className="text-xs text-slate-500">{review.customerAddress}</p>}
      </div>
      <StarRating rating={review.rating} size="text-base" />
    </div>
    {review.comment && <p className="mt-4 text-sm text-slate-700">{review.comment}</p>}
    <p className="mt-3 text-xs text-slate-400">Reviewed on {formatDate(review.reviewedAt)}</p>
    {review.media.length > 0 && (
      <div className="mt-4 flex flex-wrap gap-3">
        {review.media.map((media) => (
          <img
            key={media.url}
            src={media.url}
            alt={`${review.reviewerName} upload`}
            className="h-24 w-24 rounded-xl border border-slate-200 object-cover"
          />
        ))}
      </div>
    )}
  </article>
);

const RecommendationTile = ({
  item,
  formatPrice
}: {
  item: PublicProductRecommendation;
  formatPrice: (value?: number | null) => string | null;
}) => {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const authUser = useAppSelector((state) => state.auth.user);
  const unitPrice = Number(item.finalPrice ?? item.originalPrice ?? 0);

  const handleQuickAdd = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (authUser) {
      dispatch(addCartItem({ productId: item.id, variantId: null, quantity: 1 }))
        .unwrap()
        .then(() => {
          notify({ type: 'success', title: 'Added to cart', message: `${item.name} added to your cart.` });
        })
        .catch((error: unknown) => {
          notify({
            type: 'error',
            title: 'Unable to add',
            message: error instanceof Error ? error.message : 'Please try again later.'
          });
        });
      return;
    }
    dispatch(
      addGuestItem({
        productId: item.id,
        productName: item.name,
        productSlug: item.slug,
        quantity: 1,
        unitPrice,
        variantId: null,
        variantLabel: undefined,
        thumbnailUrl: item.imageUrl ?? undefined
      })
    );
    notify({ type: 'success', title: 'Saved to cart', message: `${item.name} saved in your cart.` });
  };

  return (
    <div className="flex w-64 min-w-[16rem] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link to={`/product/${item.slug}`} className="flex flex-1 flex-col">
        <div className="h-48 w-full overflow-hidden bg-slate-100">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 px-4 py-4">
          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
          <p className="text-sm text-slate-500">{formatPrice(item.finalPrice ?? item.originalPrice) ?? '—'}</p>
          <span className="mt-auto text-xs font-medium text-emerald-600">View details →</span>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleQuickAdd}
        className="m-4 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-600"
      >
        Quick add
      </button>
    </div>
  );
};

const StarRating = ({
  rating,
  className,
  size
}: {
  rating: number;
  className?: string;
  size?: string;
}) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className={classNames('flex items-center gap-1 text-amber-500', className, size)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = index < fullStars ? '#F59E0B' : index === fullStars && hasHalf ? 'url(#half)' : '#E5E7EB';
        return (
          <svg key={index} width="18" height="18" viewBox="0 0 20 20" fill={fill} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="half" x1="0" y1="0" x2="20" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.5l2.472 5.004 5.528.804-4 3.898.944 5.5L10 14.75 5.056 16.7l.944-5.5-4-3.898 5.528-.804L10 1.5z"
              stroke="none"
            />
          </svg>
        );
      })}
    </div>
  );
};

const SectionAccordion = ({ title, sections }: { title: string; sections: PublicProductSection[] }) => {
  if (sections.length === 0) {
    return null;
  }
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">
        {sections.map((section, index) => (
          <Fragment key={`${section.title ?? 'section'}-${index}`}>
            <div className="space-y-2">
              {section.title && <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>}
              {section.content && <p className="text-sm text-slate-600">{section.content}</p>}
              {section.bulletPoints.length > 0 && (
                <ul className="list-inside list-disc text-sm text-slate-600">
                  {section.bulletPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
            {index !== sections.length - 1 && <div className="h-px w-full bg-slate-200" />}
          </Fragment>
        ))}
      </div>
    </section>
  );
};

const RecommendationCard = ({ item }: { item: PublicProductRecommendation }) => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const currencyCode = baseCurrency ?? 'USD';
  const priceAmount = item.finalPrice ?? item.originalPrice;
  const priceLabel = priceAmount == null ? '—' : formatCurrencyValue(priceAmount, currencyCode);

  return (
    <Link
      to={`/product/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="h-48 w-full overflow-hidden bg-slate-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <p className="text-sm font-semibold text-slate-800">{item.name}</p>
        <p className="text-sm text-slate-500">{priceLabel}</p>
        <span className="mt-auto text-xs font-medium text-slate-900">View details →</span>
      </div>
    </Link>
  );
};

export default PublicProductPage;
