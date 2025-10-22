import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/http';
import type { StorefrontProductListItem, StorefrontProductSearchResponse } from '../types/storefront';
import type { PublicCategory } from '../types/category';
import type { PublicCoupon, PublicCouponPage } from '../types/coupon';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency } from '../utils/currency';
import { addCartItem, addGuestItem } from '../features/cart/cartSlice';
import { useToast } from '../components/ToastProvider';
import StarRating from '../components/StarRating';

const HERO_PRODUCT_LIMIT = 8;
const FEATURED_LIMIT = 8;
const CATEGORY_LIMIT = 6;
const OFFER_LIMIT = 3;

const describeDiscount = (
  coupon: PublicCoupon,
  formatAmount: (value?: number | null) => string | null
) => {
  if (coupon.discountType === 'PERCENTAGE') {
    return `${coupon.discountValue}% off`;
  }
  const amount = formatAmount(Number(coupon.discountValue));
  return amount ? `${amount} off` : 'Special savings';
};

const formatDateLabel = (value: string) => {
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

const EcommerceHomePage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notify } = useToast();
  const authUser = useAppSelector((state) => state.auth.user);
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const currencyCode = baseCurrency ?? 'USD';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Aurora Market — Shop curated products and categories';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!copiedCode) {
      return undefined;
    }
    const handle = window.setTimeout(() => setCopiedCode(null), 2000);
    return () => window.clearTimeout(handle);
  }, [copiedCode]);

  const categoriesQuery = useQuery<PublicCategory[]>({
    queryKey: ['public', 'catalog', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<PublicCategory[]>('/public/catalog/categories');
      return data;
    }
  });

  const trendingQuery = useQuery<StorefrontProductSearchResponse>({
    queryKey: ['public-products', 'most_popular', { size: HERO_PRODUCT_LIMIT }],
    queryFn: async () => {
      const { data } = await api.get<StorefrontProductSearchResponse>('/public/products', {
        params: { page: 0, size: HERO_PRODUCT_LIMIT, sort: 'most_popular' }
      });
      return data;
    }
  });

  const featuredQuery = useQuery<StorefrontProductSearchResponse>({
    queryKey: ['public-products', 'highest_rated', { size: FEATURED_LIMIT }],
    queryFn: async () => {
      const { data } = await api.get<StorefrontProductSearchResponse>('/public/products', {
        params: { page: 0, size: FEATURED_LIMIT, sort: 'highest_rated' }
      });
      return data;
    }
  });

  const offersQuery = useQuery<PublicCouponPage>({
    queryKey: ['public-coupons', 'home', { size: OFFER_LIMIT }],
    queryFn: async () => {
      const { data } = await api.get<PublicCouponPage>('/public/coupons', {
        params: { page: 0, size: OFFER_LIMIT }
      });
      return data;
    }
  });

  const formatMoney = (value?: number | null) => (value == null ? null : formatCurrency(value, currencyCode));

  const categories = useMemo(() => {
    const sorted = [...(categoriesQuery.data ?? [])].sort((a, b) => {
      const aOrder = typeof a.orderNumber === 'number' ? a.orderNumber : Number.NEGATIVE_INFINITY;
      const bOrder = typeof b.orderNumber === 'number' ? b.orderNumber : Number.NEGATIVE_INFINITY;
      if (aOrder !== bOrder) {
        return bOrder - aOrder;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return sorted.slice(0, CATEGORY_LIMIT);
  }, [categoriesQuery.data]);

  const trendingProducts = trendingQuery.data?.items ?? [];
  const featuredProducts = featuredQuery.data?.items ?? [];
  const heroProduct = trendingProducts[0] ?? featuredProducts[0] ?? null;

  const activeOffers = useMemo(() => {
    const now = Date.now();
    return (offersQuery.data?.content ?? [])
      .filter((offer) => {
        const end = new Date(offer.endDate).getTime();
        return Number.isFinite(end) ? end >= now : true;
      })
      .slice(0, OFFER_LIMIT);
  }, [offersQuery.data]);

  const addProductToCart = (product: StorefrontProductListItem) => {
    const price = product.taxInclusivePrice ?? product.finalPrice ?? product.unitPrice ?? 0;
    if (authUser) {
      dispatch(addCartItem({ productId: product.id, variantId: null, quantity: 1 }))
        .unwrap()
        .then(() => {
          notify({ type: 'success', title: 'Added to cart', message: `${product.name} was added to your cart.` });
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

    dispatch(
      addGuestItem({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        sku: undefined,
        variantId: null,
        variantLabel: undefined,
        quantity: 1,
        unitPrice: price,
        thumbnailUrl: product.thumbnailUrl ?? undefined
      })
    );
    notify({ type: 'success', title: 'Saved to cart', message: `${product.name} was added to your cart.` });
  };

  const handlePrimaryAction = (product: StorefrontProductListItem) => {
    if (!product.inStock || product.hasVariants) {
      navigate(`/product/${product.slug}`);
      return;
    }
    addProductToCart(product);
  };

  const renderProductCard = (product: StorefrontProductListItem) => {
    const displayPrice = product.taxInclusivePrice ?? product.finalPrice ?? product.unitPrice ?? null;
    const comparePrice = product.unitPrice ?? null;
    const discountPercentage = product.discountPercentage ?? null;
    const primaryActionLabel = !product.inStock
      ? 'View details'
      : product.hasVariants
      ? 'Choose options'
      : 'Add to cart';

    return (
      <article
        key={product.id}
        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      >
        <Link to={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-blue-100 to-slate-100 text-3xl font-semibold text-primary">
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex flex-col gap-2">
            {product.brandName && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{product.brandName}</p>
            )}
            <Link to={`/product/${product.slug}`} className="text-lg font-semibold text-slate-900 transition hover:text-primary">
              {product.name}
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <StarRating value={product.averageRating} size="sm" allowHalf readOnly />
              <span>{product.averageRating.toFixed(1)}</span>
              <span className="text-xs text-slate-400">({product.reviewCount})</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-3">
              {displayPrice != null ? (
                <span className="text-xl font-semibold text-slate-900">{formatMoney(displayPrice)}</span>
              ) : (
                <span className="text-sm text-slate-500">Pricing available on detail page</span>
              )}
              {comparePrice != null && displayPrice != null && comparePrice > displayPrice && (
                <span className="text-sm text-slate-400 line-through">{formatMoney(comparePrice)}</span>
              )}
              {discountPercentage != null && discountPercentage > 0 && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Save {discountPercentage}%
                </span>
              )}
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                product.inStock ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {product.stockStatus}
            </span>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => handlePrimaryAction(product)}
              className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition ${
                !product.inStock || product.hasVariants
                  ? 'bg-slate-900 text-white hover:bg-primary'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {primaryActionLabel}
            </button>
            <Link to={`/product/${product.slug}`} className="text-sm font-semibold text-primary transition hover:text-primary/80">
              View product details →
            </Link>
          </div>
        </div>
      </article>
    );
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopiedCode(code);
    } catch (error) {
      console.error('Unable to copy coupon code', error);
    }
  };

  const heroPrice = formatMoney(
    heroProduct?.taxInclusivePrice ?? heroProduct?.finalPrice ?? heroProduct?.unitPrice ?? null
  );

  return (
    <div className="space-y-20 pb-20 pt-10 text-slate-900">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[2fr,1fr]">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white">
              {heroProduct ? (
                <>
                  {heroProduct.thumbnailUrl && (
                    <img
                      src={heroProduct.thumbnailUrl}
                      alt={heroProduct.name}
                      className="absolute inset-0 h-full w-full object-cover opacity-70"
                    />
                  )}
                  <div className="relative flex h-full flex-col justify-between gap-6 p-10">
                    <div className="space-y-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-white">
                        Trending
                      </span>
                      <h1 className="text-3xl font-semibold sm:text-4xl">{heroProduct.name}</h1>
                      {heroProduct.brandName && (
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-200">{heroProduct.brandName}</p>
                      )}
                      <p className="text-sm text-slate-100">
                        Discover our most-loved product right now. Shop it before it sells out or explore all trending arrivals.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {heroPrice && <span className="text-xl font-semibold text-white">{heroPrice}</span>}
                      <button
                        type="button"
                        onClick={() => handlePrimaryAction(heroProduct)}
                        className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                      >
                        {heroProduct.hasVariants ? 'Choose options' : heroProduct.inStock ? 'Add to cart' : 'View details'}
                      </button>
                      <Link
                        to="/products?sort=most_popular"
                        className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                      >
                        Browse trending
                        <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col justify-between gap-6 p-10">
                  <div className="space-y-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-primary">
                      Trending
                    </span>
                    <h1 className="text-3xl font-semibold text-white sm:text-4xl">Discover what&apos;s hot right now</h1>
                    <p className="text-sm text-slate-200">
                      We&apos;re curating today&apos;s most popular products. Check back shortly for fresh arrivals.
                    </p>
                  </div>
                  <Link
                    to="/products"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                  >
                    Browse all products
                    <span aria-hidden className="ml-2">
                      →
                    </span>
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Featured categories</h2>
                <Link to="/categories" className="text-sm font-semibold text-primary transition hover:text-primary/80">
                  View all
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {categoriesQuery.isLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
                        aria-hidden
                      />
                    ))
                  : categories.length
                  ? categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/products?categories=${encodeURIComponent(category.slug)}`}
                        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {category.imageUrl ? (
                            <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary">
                              {category.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{category.name}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {category.description || 'Curated products picked by our merchandising team.'}
                          </p>
                        </div>
                        <span
                          aria-hidden
                          className="text-lg text-slate-300 transition group-hover:text-primary"
                        >
                          →
                        </span>
                      </Link>
                    ))
                  : (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                        No categories available just yet. Please check back soon.
                      </div>
                    )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">Trending now</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Popular with shoppers</h2>
              <p className="mt-3 text-sm text-slate-600">
                Real-time best sellers updated as shoppers discover new arrivals across the marketplace.
              </p>
            </div>
            <Link to="/products?sort=most_popular" className="self-start rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary">
              Shop all trending
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {trendingQuery.isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-[26rem] animate-pulse rounded-3xl border border-slate-200 bg-white" aria-hidden />
                ))
              : trendingQuery.isError
              ? (
                  <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
                    Unable to load trending products right now. Please refresh to try again.
                  </div>
                )
              : trendingProducts.length
              ? trendingProducts.slice(0, 6).map((product) => renderProductCard(product))
              : (
                  <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                    No trending products yet. Explore the full catalog to find your next favorite.
                  </div>
                )}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-100">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">Editor&apos;s picks</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Highest rated selections</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Hand-picked products with stellar reviews and premium craftsmanship.
                </p>
              </div>
              <Link to="/products?sort=highest_rated" className="self-start rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary">
                View all featured
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featuredQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-[24rem] animate-pulse rounded-3xl border border-slate-200 bg-white" aria-hidden />
                  ))
                : featuredQuery.isError
                ? (
                    <div className="md:col-span-2 xl:col-span-4 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
                      Unable to load featured products right now. Please try again later.
                    </div>
                  )
                : featuredProducts.length
                ? featuredProducts.slice(0, 8).map((product) => renderProductCard(product))
                : (
                    <div className="md:col-span-2 xl:col-span-4 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                      Featured picks will appear as soon as ratings start rolling in.
                    </div>
                  )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">Current offers</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Claim limited-time deals</h2>
              <p className="mt-3 text-sm text-slate-600">
                Save more with promotions across popular categories and exclusive bundles.
              </p>
            </div>
            <Link to="/coupons" className="self-start rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary">
              View all offers
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {offersQuery.isLoading
              ? Array.from({ length: OFFER_LIMIT }).map((_, index) => (
                  <div key={index} className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white" aria-hidden />
                ))
              : offersQuery.isError
              ? (
                  <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
                    Unable to load offers. Please check back later.
                  </div>
                )
              : activeOffers.length
              ? activeOffers.map((offer) => {
                  const discountLabel = describeDiscount(offer, formatMoney);
                  const dateLabel = `${formatDateLabel(offer.startDate)} – ${formatDateLabel(offer.endDate)}`;
                  const productHighlights = offer.products.slice(0, 2).map((product) => product.name);
                  const extraProducts = Math.max(offer.products.length - productHighlights.length, 0);
                  const categoryHighlights = offer.categories.slice(0, 2).map((category) => category.name);
                  const extraCategories = Math.max(offer.categories.length - categoryHighlights.length, 0);
                  const isCopied = copiedCode === offer.code;

                  return (
                    <article
                      key={offer.id}
                      className="flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                          <span>{offer.type.replace('_', ' ')}</span>
                          <span>{discountLabel}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">{offer.name}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {offer.shortDescription || 'Limited-time savings on curated products.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Code {offer.code}</span>
                          <span>{dateLabel}</span>
                        </div>
                        {(productHighlights.length > 0 || categoryHighlights.length > 0) && (
                          <div className="space-y-1 text-xs text-slate-500">
                            {productHighlights.length > 0 && (
                              <p>
                                Applies to {productHighlights.join(', ')}{extraProducts ? ` +${extraProducts} more` : ''}
                              </p>
                            )}
                            {categoryHighlights.length > 0 && (
                              <p>
                                Featured categories: {categoryHighlights.join(', ')}
                                {extraCategories ? ` +${extraCategories} more` : ''}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(offer.code)}
                          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                        >
                          {isCopied ? 'Copied!' : 'Copy code'}
                        </button>
                        <Link
                          to="/coupons"
                          className="text-sm font-semibold text-primary transition hover:text-primary/80"
                        >
                          View coupon details →
                        </Link>
                      </div>
                    </article>
                  );
                })
              : (
                  <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                    No active offers at the moment. Subscribe to our newsletter to hear about the next drop.
                  </div>
                )}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center">
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Stay in the loop</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600">
              Subscribe for product drops, curated playlists, and exclusive offers tailored to your favorite categories.
            </p>
            <form className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
              >
                Notify me
              </button>
            </form>
          </div>
        </section>
    </div>
  );
};

export default EcommerceHomePage;
