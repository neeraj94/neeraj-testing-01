import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/http';
import { useQuery } from '@tanstack/react-query';
import type { CouponType, PublicCoupon, PublicCouponPage } from '../types/coupon';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency as formatCurrencyValue } from '../utils/currency';
import StorefrontHeader from '../components/StorefrontHeader';

const PAGE_SIZE = 12;

const typeLabels: Record<CouponType, string> = {
  PRODUCT: 'Product specific',
  CART_VALUE: 'Cart threshold',
  NEW_SIGNUP: 'New signup'
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

const buildRangeLabel = (coupon: PublicCoupon) => {
  const start = formatDateLabel(coupon.startDate);
  const end = formatDateLabel(coupon.endDate);
  return `${start} – ${end}`;
};

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

const PublicCouponsPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const currencyCode = baseCurrency ?? 'USD';
  const formatAmount = useCallback(
    (value?: number | null) => (value == null ? null : formatCurrencyValue(value, currencyCode)),
    [currencyCode]
  );
  const [page, setPage] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CouponType>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setPage(0);
  }, [typeFilter]);

  useEffect(() => {
    if (!copiedCode) {
      return;
    }
    const timer = window.setTimeout(() => setCopiedCode(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedCode]);

  const couponsQuery = useQuery<PublicCouponPage>({
    queryKey: ['public', 'coupons', { page, search, typeFilter }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: PAGE_SIZE };
      if (search) {
        params.search = search;
      }
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      const { data } = await api.get<PublicCouponPage>('/public/coupons', { params });
      return data;
    }
  });

  const coupons = couponsQuery.data?.content ?? [];
  const totalElements = couponsQuery.data?.totalElements ?? 0;
  const totalPages = couponsQuery.data?.totalPages ?? 0;
  const pageCount = coupons.length;
  const showingFrom = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = totalElements === 0 ? 0 : page * PAGE_SIZE + pageCount;

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const confirmed = window.confirm(`Copy coupon code: ${code}`);
        if (!confirmed) {
          return;
        }
      }
      setCopiedCode(code);
    } catch (error) {
      console.error('Unable to copy coupon code', error);
    }
  };

  const heroDescription = useMemo(
    () =>
      search
        ? `Showing promotions matching “${search}”.`
        : 'Explore limited-time deals curated for shoppers. Claim a code and apply it at checkout for instant savings.',
    [search]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <StorefrontHeader activeKey="coupons" />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Exclusive offers</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Current Coupons &amp; Promotions</h1>
            <p className="mt-3 text-sm text-slate-600">{heroDescription}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-80">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search coupons by name or code"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All coupon types</option>
              <option value="PRODUCT">Product specific</option>
              <option value="CART_VALUE">Cart threshold</option>
              <option value="NEW_SIGNUP">New signup</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <span>
            Showing {showingFrom}-{showingTo} of {totalElements}
          </span>
          <span>Page {page + 1} of {Math.max(totalPages, 1)}</span>
        </div>

        {couponsQuery.isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading coupons…
          </div>
        )}

        {!couponsQuery.isLoading && coupons.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            No active coupons at the moment. Please check back soon.
          </div>
        )}

        {!couponsQuery.isLoading && coupons.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {coupons.map((coupon) => {
              const discountLabel = describeDiscount(coupon, formatAmount);
              const minimumLabel = formatAmount(coupon.minimumCartValue ?? null);
              const productHighlights = coupon.products.slice(0, 3).map((product) => product.name).filter(Boolean);
              const extraProducts = Math.max(coupon.products.length - productHighlights.length, 0);
              const categoryHighlights = coupon.categories.slice(0, 3);
              const extraCategories = Math.max(coupon.categories.length - categoryHighlights.length, 0);
              const isCopied = copiedCode === coupon.code;

              return (
                <article
                  key={coupon.id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-40 w-full overflow-hidden bg-gradient-to-r from-primary/10 to-slate-100">
                    {coupon.imageUrl ? (
                      <img src={coupon.imageUrl} alt={coupon.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary/70">
                        {coupon.code}
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {typeLabels[coupon.type]}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-5">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                      <span className="font-semibold text-primary/80">{discountLabel}</span>
                      <time className="font-medium text-slate-600" dateTime={coupon.endDate}>
                        Ends {formatDateLabel(coupon.endDate)}
                      </time>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-slate-900">{coupon.name}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                      {coupon.shortDescription || coupon.longDescription || 'Redeem this offer at checkout before it expires.'}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-semibold text-primary">
                        {coupon.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopyCode(coupon.code)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary hover:text-primary"
                      >
                        {isCopied ? 'Copied!' : 'Copy code'}
                        <span aria-hidden>⧉</span>
                      </button>
                    </div>
                    {minimumLabel && (
                      <p className="mt-3 text-xs text-slate-500">Minimum cart value: {minimumLabel}</p>
                    )}
                    {productHighlights.length > 0 && (
                      <p className="mt-3 text-xs text-slate-500">
                        Featured products: {productHighlights.join(', ')}
                        {extraProducts > 0 && ` +${extraProducts} more`}
                      </p>
                    )}
                    {categoryHighlights.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {categoryHighlights.map((category) => (
                          <span
                            key={category.id}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {category.name}
                          </span>
                        ))}
                        {extraCategories > 0 && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                            +{extraCategories} more
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                      Valid {buildRangeLabel(coupon)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0 || couponsQuery.isLoading}
            className="rounded-lg border border-slate-200 px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary hover:text-primary"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
            disabled={page + 1 >= totalPages || couponsQuery.isLoading || totalPages === 0}
            className="rounded-lg border border-slate-200 px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary hover:text-primary"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
};

export default PublicCouponsPage;
