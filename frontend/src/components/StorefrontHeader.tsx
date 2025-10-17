import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAppSelector } from '../app/hooks';
import { selectCartCount } from '../features/cart/cartSlice';

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

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link to="/" className="text-2xl font-semibold tracking-tight text-slate-900">
          Aurora Market
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
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
        <div className="flex items-center gap-4">
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
    </header>
  );
};

export default StorefrontHeader;
