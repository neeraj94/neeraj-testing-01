import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import api from '../services/http';
import type {
  PublicProductDetail,
  PublicProductOffer,
  PublicProductRecommendation,
  PublicProductSection,
  PublicProductVariant,
  PublicProductVariantAttribute,
  PublicProductVariantAttributeValue
} from '../types/public-product';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/brands', label: 'Brands' },
  { href: '/blog', label: 'Blog' },
  { href: '/product/demo-product', label: 'Product' }
];

const formatCurrency = (value?: number | null) => {
  if (value == null) {
    return null;
  }
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

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

const buildStatusTone = (inStock: boolean) =>
  inStock ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-rose-600 bg-rose-50 border border-rose-200';

const resolveVariantValueTooltip = (attribute: PublicProductVariantAttribute, value: PublicProductVariantAttributeValue) => {
  if (attribute.displayType === 'swatch' && value.swatchColor) {
    return `${attribute.attributeName}: ${value.label}`;
  }
  return value.label;
};

const PublicProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const reviewsRef = useRef<HTMLDivElement | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const productQuery = useQuery<PublicProductDetail>({
    queryKey: ['public-product', slug],
    queryFn: async () => {
      const { data } = await api.get<PublicProductDetail>(`/public/products/${slug}`);
      return data;
    },
    enabled: Boolean(slug)
  });

  const product = productQuery.data;

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
  const discountLabel =
    product?.pricing.discountType === 'PERCENTAGE' && product.pricing.discountPercentage != null
      ? `${product.pricing.discountPercentage}% off`
      : savings > 0
        ? `${formatCurrency(savings)} off`
        : null;

  const inStock = activeVariant ? activeVariant.inStock : product?.stock.inStock ?? false;
  const availableQuantity = activeVariant?.quantity ?? product?.stock.availableQuantity ?? null;
  const maxPurchaseLimit = product?.maxPurchaseQuantity ?? availableQuantity ?? null;
  const minPurchase = product?.minPurchaseQuantity ?? 1;

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

  const loadError = productQuery.isError ? (productQuery.error as AxiosError | undefined) : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-slate-900">
            ShopHub
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-full px-4 py-2 transition ${link.href.includes(slug ?? '') ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20' : 'hover:bg-slate-100 hover:text-slate-900'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

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
          <div className="flex flex-col gap-12">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="flex flex-col gap-6">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  {gallery.length === 0 && (
                    <div className="flex h-96 items-center justify-center text-sm text-slate-400">No imagery available</div>
                  )}
                  {gallery.length > 0 && (
                    <img
                      src={gallery[activeImageIndex]?.url}
                      alt={product.name}
                      className="h-[26rem] w-full object-cover"
                    />
                  )}
                  {gallery.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-600 shadow">
                      {gallery.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`h-2.5 w-2.5 rounded-full ${index === activeImageIndex ? 'bg-slate-900' : 'bg-slate-300'}`}
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
                        className={`overflow-hidden rounded-xl border transition ${
                          index === activeImageIndex
                            ? 'border-slate-900 ring-2 ring-slate-900'
                            : 'border-transparent hover:border-slate-200'
                        }`}
                      >
                        <img src={image.url} alt={`${product.name} thumbnail ${index + 1}`} className="h-24 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    {product.categoryNames.map((category) => (
                      <span key={category} className="rounded-full bg-slate-100 px-3 py-1">
                        {category}
                      </span>
                    ))}
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{product.name}</h1>
                  {product.brandName && <p className="text-sm text-slate-500">By {product.brandName}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <button type="button" onClick={scrollToReviews} className="flex items-center gap-2 text-amber-500">
                      <span className="text-base">{'★'.repeat(Math.round(product.reviewSummary.averageRating) || 0).padEnd(5, '☆')}</span>
                      <span className="text-slate-600">
                        {product.reviewSummary.averageRating.toFixed(1)} ({product.reviewSummary.totalReviews} reviews)
                      </span>
                    </button>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${buildStatusTone(inStock)}`}>
                      {inStock ? '✅ In Stock' : '❌ Out of Stock'}
                    </span>
                    {product.sku && <span className="text-xs text-slate-500">SKU: {product.sku}</span>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-slate-900">{formatCurrency(displayPrice)}</span>
                      {originalPrice != null && originalPrice > (displayPrice ?? 0) && (
                        <span className="text-sm text-slate-400 line-through">{formatCurrency(originalPrice)}</span>
                      )}
                      {discountLabel && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          {discountLabel}
                        </span>
                      )}
                    </div>
                    {savings > 0 && (
                      <p className="text-xs text-emerald-600">You save {formatCurrency(savings)}</p>
                    )}
                    {product.shortDescription && (
                      <p className="text-sm text-slate-600">{product.shortDescription}</p>
                    )}
                  </div>

                  {product.offers.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Available offers</h2>
                      <div className="space-y-3">
                        {product.offers.map((offer) => (
                          <OfferCard key={offer.id} offer={offer} />
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

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-full border border-slate-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={decrementQuantity}
                        className="px-4 py-2 text-lg font-semibold text-slate-600 hover:text-slate-900"
                        disabled={quantity <= minPurchase}
                      >
                        –
                      </button>
                      <span className="min-w-[3rem] text-center text-lg font-semibold text-slate-900">{quantity}</span>
                      <button
                        type="button"
                        onClick={incrementQuantity}
                        className="px-4 py-2 text-lg font-semibold text-slate-600 hover:text-slate-900"
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
                      className="flex-1 rounded-full bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-400"
                      disabled={!inStock || !hasValidSelection}
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-full border border-slate-900 px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-300"
                      disabled={!inStock || !hasValidSelection}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>

                {product.wedges.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Why shoppers love it</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {product.wedges.map((wedge) => (
                        <div key={wedge.id} className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/10 text-lg">{wedge.iconUrl ? '🔗' : '✨'}</div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{wedge.name}</p>
                            {wedge.shortDescription && <p className="mt-1 text-sm text-slate-600">{wedge.shortDescription}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {product.frequentlyBought.length > 0 && (
              <FrequentlyBoughtTogether product={product} items={product.frequentlyBought} />
            )}

            <SectionAccordion title="Key Features" sections={product.expandableSections} />
            <SectionAccordion title="Technical Specifications" sections={product.infoSections} />

            <div ref={reviewsRef} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Customer Reviews</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Rated {product.reviewSummary.averageRating.toFixed(1)} out of 5 based on {product.reviewSummary.totalReviews}{' '}
                    review{product.reviewSummary.totalReviews === 1 ? '' : 's'}.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-900 px-6 py-4 text-white">
                  <p className="text-sm uppercase tracking-wide text-white/70">Average rating</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{product.reviewSummary.averageRating.toFixed(1)}</span>
                    <span className="text-sm">/ 5</span>
                  </div>
                  <div className="mt-2 text-xl">{'★'.repeat(Math.round(product.reviewSummary.averageRating)).padEnd(5, '☆')}</div>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                {product.reviews.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                    There are no published reviews yet. Be the first to share your experience!
                  </div>
                )}

                {product.reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{review.reviewerName}</p>
                        {review.customerAddress && <p className="text-xs text-slate-500">{review.customerAddress}</p>}
                      </div>
                      <div className="text-amber-500">{'★'.repeat(review.rating).padEnd(5, '☆')}</div>
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
                ))}
              </div>
            </div>

            {product.recentlyViewed.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">Recently viewed</h2>
                  <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                    Explore more
                  </Link>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {product.recentlyViewed.map((item) => (
                    <RecommendationCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const OfferCard = ({ offer }: { offer: PublicProductOffer }) => {
  const discountLabel =
    offer.discountType === 'PERCENTAGE'
      ? `${offer.discountValue}% off`
      : offer.discountValue
        ? `${formatCurrency(offer.discountValue)} off`
        : 'Special savings';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{offer.name}</p>
          <p className="text-xs text-slate-500">{discountLabel}</p>
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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{attribute.attributeName}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {attribute.values.map((value) => {
          const isSelected = value.id === selectedValueId;
          if (attribute.displayType === 'swatch' && value.swatchColor) {
            return (
              <button
                key={value.id}
                type="button"
                onClick={() => onSelect(value.id)}
                disabled={disabled}
                title={resolveVariantValueTooltip(attribute, value)}
                className={`h-10 w-10 rounded-full border-2 transition ${
                  isSelected ? 'border-slate-900 ring-2 ring-slate-900/30' : 'border-slate-200 hover:border-slate-400'
                } disabled:cursor-not-allowed disabled:opacity-60`}
                style={{ backgroundColor: value.swatchColor ?? undefined }}
              />
            );
          }
          return (
            <button
              key={value.id}
              type="button"
              onClick={() => onSelect(value.id)}
              disabled={disabled}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
              } disabled:cursor-not-allowed disabled:opacity-60`}
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
  items
}: {
  product: PublicProductDetail;
  items: PublicProductRecommendation[];
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Frequently bought together</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr] md:items-start">
        <div className="space-y-4">
          {[{ id: product.id, name: product.name, slug: product.slug, imageUrl: product.primaryImage?.url ?? '', finalPrice: product.pricing.finalPrice ?? product.pricing.unitPrice } as PublicProductRecommendation]
            .concat(items)
            .map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {item.id !== product.id && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                )}
                <img
                  src={item.imageUrl || product.primaryImage?.url}
                  alt={item.name}
                  className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
                />
                <div className="flex flex-col">
                  <Link to={`/product/${item.slug}`} className="text-sm font-semibold text-slate-800 hover:text-slate-900">
                    {item.name}
                  </Link>
                  <span className="text-sm text-slate-500">{formatCurrency(item.finalPrice ?? item.originalPrice)}</span>
                </div>
              </div>
            ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-wide text-white/70">Bundle total</p>
          <p className="mt-3 text-3xl font-bold">{formatCurrency(bundlePrice)}</p>
          <p className="mt-2 text-xs text-white/70">
            Includes base product and {selectedIds.size} add-on{selectedIds.size === 1 ? '' : 's'}.
          </p>
          <button className="mt-6 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow">
            Add bundle to cart
          </button>
        </div>
      </div>
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

const RecommendationCard = ({ item }: { item: PublicProductRecommendation }) => (
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
      <p className="text-sm text-slate-500">{formatCurrency(item.finalPrice ?? item.originalPrice)}</p>
      <span className="mt-auto text-xs font-medium text-slate-900">View details →</span>
    </div>
  </Link>
);

export default PublicProductPage;
