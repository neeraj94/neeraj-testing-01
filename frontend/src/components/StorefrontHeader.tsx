import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../app/hooks';
import { selectCartCount } from '../features/cart/cartSlice';
import api from '../services/http';
import type { PublicProductSuggestion } from '../types/public-product';

type StorefrontNavKey = 'home' | 'products' | 'coupons' | 'categories' | 'brands' | 'blog';

interface StorefrontHeaderProps {
  activeKey?: StorefrontNavKey;
}

const navLinks: Array<{ key: StorefrontNavKey; href: string; label: string }> = [
  { key: 'home', href: '/', label: 'Home' },
  { key: 'products', href: '/products', label: 'All Products' },
  { key: 'coupons', href: '/coupons', label: 'All Coupons' },
  { key: 'categories', href: '/categories', label: 'All Categories' },
  { key: 'brands', href: '/brands', label: 'Brands' },
  { key: 'blog', href: '/blog', label: 'Blog' }
];

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const deriveActiveKeyFromPath = (pathname: string): StorefrontNavKey | undefined => {
  if (pathname === '/' || pathname === '') {
    return 'home';
  }
  if (pathname.startsWith('/products') || pathname.startsWith('/product/')) {
    return 'products';
  }
  if (pathname.startsWith('/coupons')) {
    return 'coupons';
  }
  if (pathname.startsWith('/categories')) {
    return 'categories';
  }
  if (pathname.startsWith('/brands')) {
    return 'brands';
  }
  if (pathname.startsWith('/blog')) {
    return 'blog';
  }
  return undefined;
};

const StorefrontHeader = ({ activeKey }: StorefrontHeaderProps) => {
  const location = useLocation();
  const resolvedActiveKey = useMemo(() => {
    if (activeKey) {
      return activeKey;
    }
    return deriveActiveKeyFromPath(location.pathname);
  }, [activeKey, location.pathname]);

  const cartCount = useAppSelector(selectCartCount) ?? 0;
  const hasItemsInCart = cartCount > 0;
  const cartLabel = hasItemsInCart ? (cartCount > 99 ? '99+' : cartCount.toString()) : undefined;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 200);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  const suggestionsQuery = useQuery<PublicProductSuggestion[]>({
    queryKey: ['public', 'product-suggestions', debouncedSearch],
    enabled: debouncedSearch.length >= 2,
    queryFn: async () => {
      const { data } = await api.get<PublicProductSuggestion[]>('/public/products/suggestions', {
        params: { q: debouncedSearch }
      });
      return data;
    },
    staleTime: 10_000
  });

  const suggestions = suggestionsQuery.data ?? [];
  const showSuggestions = suggestionsOpen && debouncedSearch.length >= 2;

  const closeSuggestions = () => {
    setSuggestionsOpen(false);
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
        <Link to="/" className="text-2xl font-semibold tracking-tight text-slate-900">
          Aurora Market
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600 sm:flex-1 sm:justify-center">
          {navLinks.map((link) => {
            const isActive = resolvedActiveKey === link.key;
            return (
              <Link
                key={link.key}
                to={link.href}
                className={classNames(
                  'rounded-full px-4 py-2 transition',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
                    : 'hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <div className="relative w-full sm:w-72 lg:w-96">
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  closeSuggestions();
                  (event.target as HTMLInputElement).blur();
                }
              }}
              onBlur={() => window.setTimeout(closeSuggestions, 120)}
              placeholder="Search products"
              className="w-full rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search products"
            />
            {showSuggestions && (
              <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {suggestionsQuery.isLoading ? (
                  <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
                ) : suggestions.length ? (
                  suggestions.map((suggestion) => (
                    <Link
                      key={suggestion.id}
                      to={`/product/${suggestion.slug}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                      onClick={() => {
                        setSearchTerm('');
                        closeSuggestions();
                      }}
                    >
                      {suggestion.thumbnailUrl ? (
                        <img
                          src={suggestion.thumbnailUrl}
                          alt=""
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                          No image
                        </span>
                      )}
                      <span className="font-medium text-slate-900">{suggestion.name}</span>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">No products found for “{searchTerm}”.</div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="hidden text-xs uppercase tracking-[0.35em] text-slate-500 sm:flex sm:flex-col sm:items-end">
              <span>Support</span>
              <a
                href="mailto:support@auroramarket.com"
                className="font-semibold text-slate-900 no-underline hover:text-primary"
              >
                support@auroramarket.com
              </a>
            </div>
            <Link
              to="/cart"
              className="relative inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              aria-label={hasItemsInCart ? `Cart with ${cartLabel} items` : 'Cart'}
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M3 3h2l2.4 12.3a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="17" cy="20" r="1.4" />
              </svg>
              {hasItemsInCart && (
                <span className="absolute -top-1 -right-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white shadow-sm">
                  {cartLabel}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StorefrontHeader;
