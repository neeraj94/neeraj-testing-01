import { useEffect, useMemo, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import StorefrontHeader from '../components/StorefrontHeader';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import api from '../services/http';
import { formatCurrency } from '../utils/currency';
import type {
  StorefrontFilterValue,
  StorefrontProductListItem,
  StorefrontProductSearchResponse
} from '../types/storefront';
import { addCartItem, addGuestItem } from '../features/cart/cartSlice';
import { useToast } from '../components/ToastProvider';
import StarRating from '../components/StarRating';

const DEFAULT_PAGE_SIZE = 12;

const sortOptions: Array<{ value: string; label: string }> = [
  { value: 'newest', label: 'Latest arrivals' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'most_popular', label: 'Most Popular' }
];

const toNumberOrNull = (value: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return null;
};

const PublicProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { notify } = useToast();

  const baseCurrency = useAppSelector(selectBaseCurrency);
  const currencyCode = baseCurrency ?? 'USD';
  const authUser = useAppSelector((state) => state.auth.user);

  const pageParam = toNumberOrNull(searchParams.get('page')) ?? 1;
  const currentPage = pageParam > 0 ? pageParam : 1;
  const sizeParam = toNumberOrNull(searchParams.get('size')) ?? DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(sizeParam, 1), 60);

  const categoriesParam = searchParams.get('categories');
  const activeCategories = useMemo(
    () =>
      categoriesParam
        ? categoriesParam
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    [categoriesParam]
  );

  const brandsParam = searchParams.get('brands');
  const activeBrands = useMemo(
    () =>
      brandsParam
        ? brandsParam
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    [brandsParam]
  );

  const minPriceParam = searchParams.get('min_price');
  const maxPriceParam = searchParams.get('max_price');
  const minPriceFilter = toNumberOrNull(minPriceParam);
  const maxPriceFilter = toNumberOrNull(maxPriceParam);

  const ratingParam = searchParams.get('rating');
  const ratingFilter = toNumberOrNull(ratingParam);

  const availabilityParam = searchParams.get('availability');
  const sortParam = searchParams.get('sort') ?? 'newest';

  const pageIndex = currentPage - 1;

  const [pendingPriceRange, setPendingPriceRange] = useState<{ min: number | null; max: number | null }>(
    () => ({ min: minPriceFilter, max: maxPriceFilter })
  );

  useEffect(() => {
    setPendingPriceRange({ min: minPriceFilter, max: maxPriceFilter });
  }, [minPriceFilter, maxPriceFilter]);

  const updateParams = (
    updates: Record<string, string | null | undefined>,
    options: { resetPage?: boolean } = { resetPage: true }
  ) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      if (options.resetPage) {
        next.delete('page');
      }
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const normalizedMin = pendingPriceRange.min ?? null;
      const normalizedMax = pendingPriceRange.max ?? null;
      const targetMin = minPriceFilter ?? null;
      const targetMax = maxPriceFilter ?? null;
      const minChanged = normalizedMin !== targetMin;
      const maxChanged = normalizedMax !== targetMax;
      if (minChanged || maxChanged) {
        updateParams(
          {
            min_price: normalizedMin != null ? Math.max(normalizedMin, 0).toString() : null,
            max_price: normalizedMax != null ? Math.max(normalizedMax, 0).toString() : null
          },
          { resetPage: true }
        );
      }
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPriceRange]);

  const queryKey = useMemo(
    () => [
      'public-products',
      {
        pageIndex,
        pageSize,
        categories: activeCategories,
        brands: activeBrands,
        minPrice: minPriceFilter,
        maxPrice: maxPriceFilter,
        rating: ratingFilter,
        availability: availabilityParam,
        sort: sortParam
      }
    ],
    [
      pageIndex,
      pageSize,
      activeCategories,
      activeBrands,
      minPriceFilter,
      maxPriceFilter,
      ratingFilter,
      availabilityParam,
      sortParam
    ]
  );

  const productsQuery: UseQueryResult<StorefrontProductSearchResponse, Error> = useQuery<
    StorefrontProductSearchResponse,
    Error,
    StorefrontProductSearchResponse
  >({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<StorefrontProductSearchResponse>('/public/products', {
        params: {
          page: pageIndex,
          size: pageSize,
          categories: activeCategories.length ? activeCategories.join(',') : undefined,
          brands: activeBrands.length ? activeBrands.join(',') : undefined,
          min_price: minPriceFilter != null ? minPriceFilter : undefined,
          max_price: maxPriceFilter != null ? maxPriceFilter : undefined,
          rating: ratingFilter != null ? ratingFilter : undefined,
          availability: availabilityParam ?? undefined,
          sort: sortParam
        }
      });
      return data;
    }
  });

  useEffect(() => {
    if (!productsQuery.data) {
      return;
    }
    const totalPages = productsQuery.data.totalPages;
    if (totalPages > 0 && currentPage > totalPages) {
      updateParams({ page: totalPages.toString() }, { resetPage: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsQuery.data, currentPage]);

  useEffect(() => {
    const originalTitle = document.title;
    const descriptionContent =
      'Browse every product available at Aurora Market with powerful filters for categories, brands, price, rating, and stock status.';

    let descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const createdDescription = !descriptionMeta;
    const previousDescription = descriptionMeta?.getAttribute('content') ?? '';
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute('content', descriptionContent);

    let ogTitleMeta = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const createdOgTitle = !ogTitleMeta;
    const previousOgTitle = ogTitleMeta?.getAttribute('content') ?? '';
    if (!ogTitleMeta) {
      ogTitleMeta = document.createElement('meta');
      ogTitleMeta.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitleMeta);
    }
    ogTitleMeta.setAttribute('content', 'All Products | Aurora Market');

    let ogDescriptionMeta = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const createdOgDescription = !ogDescriptionMeta;
    const previousOgDescription = ogDescriptionMeta?.getAttribute('content') ?? '';
    if (!ogDescriptionMeta) {
      ogDescriptionMeta = document.createElement('meta');
      ogDescriptionMeta.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescriptionMeta);
    }
    ogDescriptionMeta.setAttribute('content', descriptionContent);

    document.title = 'All Products | Aurora Market';

    return () => {
      document.title = originalTitle;
      if (descriptionMeta) {
        if (createdDescription) {
          descriptionMeta.remove();
        } else {
          descriptionMeta.setAttribute('content', previousDescription);
        }
      }
      if (ogTitleMeta) {
        if (createdOgTitle) {
          ogTitleMeta.remove();
        } else {
          ogTitleMeta.setAttribute('content', previousOgTitle);
        }
      }
      if (ogDescriptionMeta) {
        if (createdOgDescription) {
          ogDescriptionMeta.remove();
        } else {
          ogDescriptionMeta.setAttribute('content', previousOgDescription);
        }
      }
    };
  }, []);

  const filterList = (values: StorefrontFilterValue[], active: string[], toggle: (slug: string) => void) => {
    if (!values.length) {
      return <p className="text-sm text-slate-500">No options available yet.</p>;
    }
    return (
      <ul className="space-y-2">
        {values.map((item) => {
          const checked = active.includes(item.slug);
          return (
            <li key={item.slug}>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-primary/40">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                  checked={checked}
                  onChange={() => toggle(item.slug)}
                />
                <span className="flex-1">{item.name}</span>
                <span className="text-xs text-slate-400">{item.productCount}</span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  };

  const priceBounds = useMemo(() => {
    const minimum = productsQuery.data?.filters?.priceRange?.minimum;
    const maximum = productsQuery.data?.filters?.priceRange?.maximum;
    if (minimum == null || maximum == null) {
      return null;
    }
    const minValue = Math.max(0, Math.floor(minimum));
    const maxValue = Math.max(minValue + 1, Math.ceil(maximum));
    return { min: minValue, max: maxValue };
  }, [productsQuery.data?.filters?.priceRange?.minimum, productsQuery.data?.filters?.priceRange?.maximum]);

  const formatMoney = (value: number | null | undefined) =>
    formatCurrency(Number.isFinite(value ?? 0) ? (value ?? 0) : 0, currencyCode);

  const toggleCategory = (slug: string) => {
    const set = new Set(activeCategories);
    if (set.has(slug)) {
      set.delete(slug);
    } else {
      set.add(slug);
    }
    updateParams({ categories: set.size ? Array.from(set).join(',') : null });
  };

  const toggleBrand = (slug: string) => {
    const set = new Set(activeBrands);
    if (set.has(slug)) {
      set.delete(slug);
    } else {
      set.add(slug);
    }
    updateParams({ brands: set.size ? Array.from(set).join(',') : null });
  };

  const applyRatingFilter = (value: number | null) => {
    updateParams({ rating: value != null ? value.toString() : null });
  };

  const applyAvailabilityFilter = (value: string | null) => {
    updateParams({ availability: value });
  };

  const resetFilters = () => {
    setPendingPriceRange({ min: null, max: null });
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      ['categories', 'brands', 'min_price', 'max_price', 'rating', 'availability', 'page'].forEach((key) =>
        next.delete(key)
      );
      return next;
    }, { replace: true });
  };

  const handlePageChange = (nextPage: number) => {
    updateParams({ page: nextPage.toString() }, { resetPage: false });
  };

  const handleSortChange = (value: string) => {
    updateParams({ sort: value });
  };

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
      ? 'View Details'
      : product.hasVariants
      ? 'Choose Options'
      : 'Add to Cart';

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
        <div className="flex flex-1 flex-col gap-5 p-6">
          <div className="flex flex-col gap-2">
            {product.brandName && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{product.brandName}</p>
            )}
            <Link to={`/product/${product.slug}`} className="text-lg font-semibold text-slate-900 hover:text-primary">
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
              <span className="text-xl font-semibold text-slate-900">{formatMoney(displayPrice)}</span>
              {comparePrice != null && displayPrice != null && comparePrice > displayPrice && (
                <span className="text-sm text-slate-400 line-through">{formatMoney(comparePrice)}</span>
              )}
              {discountPercentage != null && discountPercentage > 0 && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Save {discountPercentage}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Price inclusive of taxes.</p>
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
            <Link
              to={`/product/${product.slug}`}
              className="text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              View product details →
            </Link>
          </div>
        </div>
      </article>
    );
  };

  const visiblePages = useMemo(() => {
    const total = productsQuery.data?.totalPages ?? 0;
    if (total <= 1) {
      return [currentPage];
    }
    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let candidate = currentPage - 1; candidate <= currentPage + 1; candidate += 1) {
      if (candidate >= 1 && candidate <= total) {
        pages.add(candidate);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }, [productsQuery.data, currentPage]);

  const renderPagination = () => {
    const totalPages = productsQuery.data?.totalPages ?? 0;
    if (totalPages <= 1) {
      return null;
    }
    const totalElements = productsQuery.data?.totalElements ?? 0;
    return (
      <div className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Showing page {currentPage} of {totalPages} — {totalElements} product
          {totalElements === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
          >
            Previous
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            {visiblePages.map((pageNumber, index) => {
              const previous = visiblePages[index - 1];
              const shouldShowEllipsis = previous && pageNumber - previous > 1;
              return (
                <div key={pageNumber} className="flex items-center gap-2">
                  {shouldShowEllipsis && <span className="text-sm text-slate-400">…</span>}
                  <button
                    type="button"
                    onClick={() => handlePageChange(pageNumber)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                      pageNumber === currentPage
                        ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
                        : 'border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    {pageNumber}
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderProducts = () => {
    if (productsQuery.isLoading && !productsQuery.data) {
      return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: pageSize }).map((_, index) => (
            <div key={index} className="h-[28rem] animate-pulse rounded-3xl border border-slate-200 bg-white" aria-hidden />
          ))}
        </div>
      );
    }

    if (productsQuery.isError) {
      return (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
          We were unable to load products right now. Please refresh the page or try again in a few moments.
        </div>
      );
    }

    const items: StorefrontProductListItem[] = productsQuery.data?.items ?? [];
    if (items.length === 0) {
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          No products match the filters you selected. Try adjusting your filters to discover more items.
        </div>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((product) => renderProductCard(product))}
      </div>
    );
  };

  const renderAvailabilityControls = () => (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => applyAvailabilityFilter(null)}
        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
          !availabilityParam ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15' : 'border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
        }`}
      >
        All
      </button>
      <button
        type="button"
        onClick={() => applyAvailabilityFilter('IN_STOCK')}
        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
          availabilityParam === 'IN_STOCK'
            ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
            : 'border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
        }`}
      >
        In Stock
      </button>
      <button
        type="button"
        onClick={() => applyAvailabilityFilter('OUT_OF_STOCK')}
        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
          availabilityParam === 'OUT_OF_STOCK'
            ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
            : 'border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
        }`}
      >
        Out of Stock
      </button>
    </div>
  );

  const renderRatingControls = () => {
    const ratingChoices = [4, 3, 2, 1];
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => applyRatingFilter(null)}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
            ratingFilter == null
              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
              : 'border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
          }`}
        >
          Any rating
        </button>
        {ratingChoices.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => applyRatingFilter(rating)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              ratingFilter === rating
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
                : 'border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {rating}★ & up
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StorefrontHeader activeKey="products" />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[280px_1fr]">
          <aside className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Filter</h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm font-semibold text-primary transition hover:text-primary/80"
              >
                Reset
              </button>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Categories</h3>
              {filterList(productsQuery.data?.filters?.categories ?? [], activeCategories, toggleCategory)}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Brands</h3>
              {filterList(productsQuery.data?.filters?.brands ?? [], activeBrands, toggleBrand)}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Price range</h3>
                <span className="text-xs text-slate-400">{priceBounds ? `${formatMoney(priceBounds.min)} – ${formatMoney(priceBounds.max)}` : 'N/A'}</span>
              </div>
              {priceBounds ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-slate-400">Min</span>
                      <span>{pendingPriceRange.min != null ? formatMoney(pendingPriceRange.min) : 'Any'}</span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-slate-400">Max</span>
                      <span>{pendingPriceRange.max != null ? formatMoney(pendingPriceRange.max) : 'Any'}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      step={1}
                      value={pendingPriceRange.min ?? priceBounds.min}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setPendingPriceRange((current) => ({
                          min: Math.min(value, current.max ?? priceBounds.max),
                          max: current.max ?? priceBounds.max
                        }));
                      }}
                      className="w-full accent-primary"
                    />
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      step={1}
                      value={pendingPriceRange.max ?? priceBounds.max}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setPendingPriceRange((current) => ({
                          min: current.min ?? priceBounds.min,
                          max: Math.max(value, current.min ?? priceBounds.min)
                        }));
                      }}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Price filters will appear once products are available.</p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Availability</h3>
              {renderAvailabilityControls()}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rating</h3>
              {renderRatingControls()}
            </section>
          </aside>

          <section className="space-y-8">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">All Products</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Discover the entire Aurora Market catalog</h1>
                <p className="mt-3 text-sm text-slate-600">
                  Filter by category, brand, price, rating, and stock status to find the perfect items for your cart.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort by</label>
                <select
                  value={sortParam}
                  onChange={(event) => handleSortChange(event.target.value)}
                  className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-56"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {renderProducts()}

            {renderPagination()}
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">Aurora Market</h2>
              <p className="text-sm text-slate-600">
                We curate mindful products from independent makers and global brands. Every item is crafted to elevate your
                everyday rituals.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Explore</p>
                <Link to="/" className="block transition hover:text-primary">
                  Home
                </Link>
                <Link to="/products" className="block transition hover:text-primary">
                  All Products
                </Link>
                <Link to="/categories" className="block transition hover:text-primary">
                  Categories
                </Link>
                <Link to="/brands" className="block transition hover:text-primary">
                  Brands
                </Link>
                <Link to="/coupons" className="block transition hover:text-primary">
                  Coupons
                </Link>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Support</p>
                <a href="mailto:support@auroramarket.com" className="block transition hover:text-primary">
                  Email Us
                </a>
                <a href="tel:+18004561234" className="block transition hover:text-primary">
                  +1 (800) 456-1234
                </a>
                <a href="/privacy" className="block transition hover:text-primary">
                  Privacy Policy
                </a>
                <a href="/terms" className="block transition hover:text-primary">
                  Terms & Conditions
                </a>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Join our newsletter for launch announcements, curated edits, and exclusive offers.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  notify({
                    type: 'success',
                    title: 'Thank you!',
                    message: 'You are on the list. Look out for upcoming product drops.'
                  });
                  (event.currentTarget.elements.namedItem('email') as HTMLInputElement | null)?.blur();
                  event.currentTarget.reset();
                }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                >
                  Subscribe
                </button>
              </form>
              <div className="flex items-center gap-4 text-slate-500">
                <a href="https://www.instagram.com" className="transition hover:text-primary" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M7 2C4.2 2 2 4.2 2 7v10c0 2.8 2.2 5 5 5h10c2.8 0 5-2.2 5-5V7c0-2.8-2.2-5-5-5H7zm0 2h10c1.7 0 3 1.3 3 3v10c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3V7c0-1.7 1.3-3 3-3zm10 1a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
                  </svg>
                </a>
                <a href="https://www.twitter.com" className="transition hover:text-primary" aria-label="Twitter">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M20.9 7.5c.6-.4 1.1-.9 1.5-1.5-.6.3-1.2.5-1.8.6a3.16 3.16 0 001.4-1.7 6.18 6.18 0 01-2 .8A3.1 3.1 0 0016.2 5c-1.7 0-3.2 1.4-3.2 3.2 0 .3 0 .6.1.8-2.7-.1-5.1-1.4-6.7-3.4-.3.6-.5 1.2-.5 1.9 0 1.2.6 2.3 1.5 2.9-.6 0-1.1-.2-1.6-.4v.1c0 1.7 1.2 3.1 2.7 3.4-.3.1-.7.1-1 .1-.2 0-.5 0-.7-.1.5 1.5 1.9 2.6 3.6 2.6A6.24 6.24 0 014 18.6a8.8 8.8 0 004.8 1.4c5.7 0 8.8-4.8 8.8-8.8v-.4c.6-.4 1.1-.9 1.5-1.5z" />
                  </svg>
                </a>
                <a href="https://www.linkedin.com" className="transition hover:text-primary" aria-label="LinkedIn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M4.5 3A2.5 2.5 0 102 5.5 2.5 2.5 0 004.5 3zM3 8h3v12H3zm7 0h2.9v1.8h.1c.4-.7 1.4-1.6 3-1.6 3.2 0 3.8 2.1 3.8 4.8V20H18v-6c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3v6h-3z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Aurora Market. All rights reserved.</p>
            <div className="mt-4 flex items-center gap-3 sm:mt-0">
              <span>Made with care in NYC.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicProductsPage;
