import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  createSearchParams,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  initializeCart,
  selectCartCount
} from '../features/cart/cartSlice';
import { logout as logoutAction } from '../features/auth/authSlice';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency } from '../utils/currency';
import { api } from '../services/http';
import StorefrontMiniCart from './StorefrontMiniCart';
import { useDebounce } from '../hooks/useDebounce';
import type { StorefrontProductSearchResponse } from '../types/storefront';

const navItems = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'categories', label: 'Categories', href: '/categories' },
  { key: 'coupons', label: 'Coupons', href: '/coupons' },
  { key: 'products', label: 'Products', href: '/products' },
  { key: 'orders', label: 'My Orders', href: '/account/orders', requiresAuth: true },
  { key: 'account', label: 'My Account', href: '/account', requiresAuth: true },
  { key: 'cart', label: 'Cart', href: '/cart' }
] as const;

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const StorefrontHeader = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const isCustomer = Boolean(auth.portal === 'client' && auth.user);
  const baseCurrency = useAppSelector(selectBaseCurrency) ?? 'USD';
  const cartCount = useAppSelector(selectCartCount) ?? 0;
  const hasItemsInCart = cartCount > 0;
  const cartBadgeLabel = hasItemsInCart ? (cartCount > 99 ? '99+' : cartCount.toString()) : undefined;

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const miniCartRef = useRef<HTMLDivElement>(null);
  const miniCartTimeoutRef = useRef<number | null>(null);

  const debouncedSearch = useDebounce(searchTerm.trim(), 250);

  const searchQuery = useQuery<StorefrontProductSearchResponse>({
    queryKey: ['storefront', 'header-search', debouncedSearch],
    enabled: debouncedSearch.length >= 2,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.get<StorefrontProductSearchResponse>('/public/products', {
        params: { page: 0, size: 6, search: debouncedSearch }
      });
      return data;
    }
  });

  const formatMoney = (value?: number | null) =>
    value == null ? null : formatCurrency(Number(value), baseCurrency);

  const suggestions = searchQuery.data?.items ?? [];
  const showSuggestions =
    searchFocused && debouncedSearch.length >= 2 && (searchQuery.isFetching || suggestions.length > 0);

  useEffect(() => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
    setMiniCartOpen(false);
    setSearchFocused(false);
    setSearchTerm('');
  }, [location.pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const desktopContains = desktopSearchRef.current?.contains(target);
      const mobileContains = mobileSearchRef.current?.contains(target);

      if (!desktopContains && !mobileContains) {
        setSearchFocused(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
      if (miniCartRef.current && !miniCartRef.current.contains(target)) {
        setMiniCartOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setAccountMenuOpen(false);
        setMiniCartOpen(false);
        setSearchFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    return () => {
      if (miniCartTimeoutRef.current) {
        window.clearTimeout(miniCartTimeoutRef.current);
      }
    };
  }, []);

  const displayName = useMemo(() => {
    if (!auth.user) {
      return 'Guest';
    }
    const { firstName, lastName, email } = auth.user;
    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ');
    }
    return email ?? 'Shopper';
  }, [auth.user]);

  const initials = useMemo(() => {
    if (!auth.user) {
      return 'G';
    }
    const { firstName, lastName, email } = auth.user;
    const fromName = [firstName, lastName]
      .filter((value) => Boolean(value && value.trim()))
      .map((value) => value!.trim()[0]?.toUpperCase())
      .join('');
    if (fromName) {
      return fromName;
    }
    return email?.[0]?.toUpperCase() ?? 'U';
  }, [auth.user]);

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      if (auth.refreshToken) {
        await api.post('/auth/logout', { refreshToken: auth.refreshToken });
      }
    } catch (error) {
      console.warn('Unable to revoke session', error);
    } finally {
      dispatch(logoutAction());
      dispatch(initializeCart());
      setSigningOut(false);
      setAccountMenuOpen(false);
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      return;
    }
    const params = createSearchParams({ search: query });
    navigate(`/products?${params.toString()}`);
    setMenuOpen(false);
    setSearchFocused(false);
  };

  const handleSuggestionSelect = (slug: string) => {
    navigate(`/product/${slug}`);
    setSearchFocused(false);
    setMenuOpen(false);
    setSearchTerm('');
  };

  const resolveNavHref = (href: string, requiresAuth?: boolean) => {
    if (requiresAuth && !isCustomer) {
      const params = createSearchParams({ redirect: href, fallback: '/' });
      return `/login?${params.toString()}`;
    }
    return href;
  };

  const openMiniCart = () => {
    if (miniCartTimeoutRef.current) {
      window.clearTimeout(miniCartTimeoutRef.current);
    }
    setMiniCartOpen(true);
  };

  const scheduleCloseMiniCart = () => {
    if (miniCartTimeoutRef.current) {
      window.clearTimeout(miniCartTimeoutRef.current);
    }
    miniCartTimeoutRef.current = window.setTimeout(() => setMiniCartOpen(false), 180);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 lg:hidden"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
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
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <Link to="/" className="text-2xl font-semibold text-slate-900">
          Aurora Market
        </Link>
        <div className="relative hidden flex-1 lg:block" ref={desktopSearchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <label className="sr-only" htmlFor="global-search">
              Search products
            </label>
            <input
              id="global-search"
              type="search"
              value={searchTerm}
              onFocus={() => setSearchFocused(true)}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for products, brands, or categories"
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 pl-12 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
          </form>
          {showSuggestions ? (
            <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <span>Suggestions</span>
                {searchQuery.isFetching ? <span className="animate-pulse text-slate-300">Loading…</span> : null}
              </div>
              <ul className="max-h-80 divide-y divide-slate-100">
                {suggestions.map((product) => {
                  const price = formatMoney(product.finalPrice ?? product.unitPrice);
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => handleSuggestionSelect(product.slug)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm text-slate-700 transition hover:bg-primary/5"
                      >
                        <span className="font-medium text-slate-900">{product.name}</span>
                        {price ? (
                          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{price}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
                {suggestions.length === 0 && !searchQuery.isFetching ? (
                  <li className="px-5 py-6 text-sm text-slate-500">
                    No products found. Try refining your search.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
        <nav className="hidden items-center gap-2 text-sm text-slate-600 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={resolveNavHref(item.href, item.requiresAuth)}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                classNames(
                  'rounded-full px-4 py-2 font-semibold transition',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
                    : 'hover:bg-slate-100 hover:text-slate-900',
                  item.key === 'cart' && hasItemsInCart ? 'relative pr-5' : undefined
                )
              }
            >
              <span>{item.label}</span>
              {item.key === 'cart' && hasItemsInCart ? (
                <span className="absolute -right-1 top-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-white shadow-sm">
                  {cartBadgeLabel}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </span>
              <span className="hidden max-w-[10rem] truncate sm:block">{displayName}</span>
            </button>
            {accountMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-3xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xl shadow-slate-900/10">
                {isCustomer ? (
                  <>
                    <NavLink
                      to="/account"
                      className={({ isActive }) =>
                        classNames(
                          'block rounded-2xl px-4 py-2 font-semibold transition hover:bg-primary/5',
                          isActive ? 'text-primary' : 'text-slate-700'
                        )
                      }
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      My Account
                    </NavLink>
                    <NavLink
                      to="/account/orders"
                      className={({ isActive }) =>
                        classNames(
                          'mt-1 block rounded-2xl px-4 py-2 font-semibold transition hover:bg-primary/5',
                          isActive ? 'text-primary' : 'text-slate-700'
                        )
                      }
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      My Orders
                    </NavLink>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                      disabled={signingOut}
                    >
                      {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setAccountMenuOpen(false)}
                      className="block rounded-2xl px-4 py-2 font-semibold text-slate-700 transition hover:bg-primary/5 hover:text-primary"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setAccountMenuOpen(false)}
                      className="mt-1 block rounded-2xl px-4 py-2 font-semibold text-slate-700 transition hover:bg-primary/5 hover:text-primary"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <div
            className="relative"
            ref={miniCartRef}
            onMouseEnter={openMiniCart}
            onMouseLeave={scheduleCloseMiniCart}
            onFocusCapture={openMiniCart}
            onBlurCapture={(event) => {
              if (!miniCartRef.current?.contains(event.relatedTarget as Node)) {
                setMiniCartOpen(false);
              }
            }}
          >
            <button
              type="button"
              onClick={() => setMiniCartOpen((open) => !open)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label={hasItemsInCart ? `Cart with ${cartBadgeLabel} items` : 'Cart'}
              aria-expanded={miniCartOpen}
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
              {hasItemsInCart ? (
                <span className="absolute -top-1 -right-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-white shadow-sm">
                  {cartBadgeLabel}
                </span>
              ) : null}
            </button>
            <StorefrontMiniCart open={miniCartOpen} onClose={() => setMiniCartOpen(false)} />
          </div>
        </div>
      </div>
      <div className="lg:hidden">
        <div className="px-4 pb-4" ref={mobileSearchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <label className="sr-only" htmlFor="global-search-mobile">
              Search products
            </label>
            <input
              id="global-search-mobile"
              type="search"
              value={searchTerm}
              onFocus={() => setSearchFocused(true)}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for products, brands, or categories"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-11 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-slate-400">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
          </form>
          {showSuggestions ? (
            <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <span>Suggestions</span>
                {searchQuery.isFetching ? <span className="animate-pulse text-slate-300">Loading…</span> : null}
              </div>
              <ul className="max-h-72 divide-y divide-slate-100">
                {suggestions.map((product) => {
                  const price = formatMoney(product.finalPrice ?? product.unitPrice);
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => handleSuggestionSelect(product.slug)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm text-slate-700 transition hover:bg-primary/5"
                      >
                        <span className="font-medium text-slate-900">{product.name}</span>
                        {price ? (
                          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{price}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
                {suggestions.length === 0 && !searchQuery.isFetching ? (
                  <li className="px-4 py-6 text-sm text-slate-500">
                    No products found. Try refining your search.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
        {menuOpen ? (
          <nav className="space-y-1 border-t border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 shadow-inner">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={resolveNavHref(item.href, item.requiresAuth)}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  classNames(
                    'block rounded-2xl px-4 py-3 transition hover:bg-primary/5',
                    isActive ? 'bg-primary/5 text-primary' : 'text-slate-700'
                  )
                }
              >
                <span>{item.label}</span>
                {item.key === 'cart' && hasItemsInCart ? (
                  <span className="ml-2 inline-flex min-w-[1.6rem] items-center justify-center rounded-full bg-primary px-1 text-[0.7rem] font-semibold text-white shadow-sm">
                    {cartBadgeLabel}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
};

export default StorefrontHeader;
