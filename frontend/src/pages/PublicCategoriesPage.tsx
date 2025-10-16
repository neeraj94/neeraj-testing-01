import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/http';
import type { PublicCategory } from '../types/category';
import type { PublicBrand } from '../types/brand';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/brands', label: 'Brands' },
  { href: '/blog', label: 'Blog' },
  { href: '/product/demo-product', label: 'Product' }
];

const PublicCategoriesPage = () => {
  const [search, setSearch] = useState('');

  const categoriesQuery = useQuery<PublicCategory[]>({
    queryKey: ['public', 'catalog', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<PublicCategory[]>('/public/catalog/categories');
      return data;
    }
  });

  const categories = categoriesQuery.data ?? [];

  const brandsQuery = useQuery<PublicBrand[]>({
    queryKey: ['public', 'catalog', 'brands'],
    queryFn: async () => {
      const { data } = await api.get<PublicBrand[]>('/public/catalog/brands');
      return data;
    }
  });

  const featuredBrands = useMemo(() => {
    const sorted = [...(brandsQuery.data ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    return sorted.slice(0, 8);
  }, [brandsQuery.data]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const sorted = [...categories].sort((a, b) => {
      const aOrder = typeof a.orderNumber === 'number' ? a.orderNumber : Number.NEGATIVE_INFINITY;
      const bOrder = typeof b.orderNumber === 'number' ? b.orderNumber : Number.NEGATIVE_INFINITY;
      if (aOrder !== bOrder) {
        return bOrder - aOrder;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    if (!normalizedSearch) {
      return sorted;
    }

    return sorted.filter((category) =>
      [category.name, category.slug, category.description ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [categories, search]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-slate-900">
            Aurora Market
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-full px-4 py-2 transition ${
                  link.href === '/categories'
                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                    : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
            <span className="hidden sm:inline">Call us</span>
            <a href="tel:+18004561234" className="font-semibold text-slate-900">
              +1 (800) 456-1234
            </a>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">
                Our catalog
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Discover product categories curated for every lifestyle
              </h1>
              <p className="mt-4 text-sm text-slate-600">
                Explore the full catalog across apparel, gear, and home goods. Categories are ranked by merchandising
                priority so you can quickly browse the latest highlights.
              </p>
            </div>
            <div className="w-full max-w-md">
              <label htmlFor="category-search" className="sr-only">
                Search categories
              </label>
              <div className="relative">
                <input
                  id="category-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search categories"
                  className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-slate-400">⌕</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} found
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {categoriesQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white"
                  aria-hidden
                />
              ))
            ) : categoriesQuery.isError ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700 md:col-span-2 xl:col-span-3">
                Unable to load categories. Please try again shortly.
              </div>
            ) : !filteredCategories.length ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                No categories match your search right now.
              </div>
            ) : (
              filteredCategories.map((category) => (
                <article
                  key={category.id}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" aria-hidden>
                    <div className="absolute -top-12 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                  </div>
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      <span>{category.type === 'DIGITAL' ? 'Digital' : 'Physical'}</span>
                      {typeof category.orderNumber === 'number' && (
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] text-slate-500">
                          Priority {category.orderNumber}
                        </span>
                      )}
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt="Category visual"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-blue-200 to-slate-100 text-2xl font-semibold text-primary">
                            {category.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{category.name}</h2>
                        <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                          {category.description || 'A curated mix of products designed to elevate daily rituals.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                      <span>Shop now</span>
                      <span aria-hidden>→</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Our partners</p>
                <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Brands we champion</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Meet the labels shaping our marketplace—from heritage designers to emerging innovators. Explore the full
                  roster or jump straight to featured collections curated by our buyers.
                </p>
              </div>
              <Link
                to="/brands"
                className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:self-auto"
              >
                View all brands
                <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {brandsQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white" aria-hidden />
                  ))
                : brandsQuery.isError || featuredBrands.length === 0
                ? (
                    <div className="sm:col-span-2 lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                      {brandsQuery.isError
                        ? 'Unable to load featured brands at the moment. Please refresh to try again.'
                        : 'Check back soon for our curated brand lineup.'}
                    </div>
                  )
                : (
                    featuredBrands.map((brand) => (
                      <article
                        key={brand.id}
                        className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            {brand.logoUrl ? (
                              <img src={brand.logoUrl} alt={`${brand.name} logo`} className="h-full w-full object-contain p-2" />
                            ) : (
                              <span className="text-xl font-semibold text-primary">{brand.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{brand.name}</h3>
                            <p className="text-xs uppercase tracking-[0.3em] text-primary">{brand.slug}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-600 line-clamp-2">
                          {brand.description || 'Exclusive collaborations launching soon.'}
                        </p>
                      </article>
                    ))
                  )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Aurora Market. Crafted with purpose.</div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#" className="hover:text-slate-900">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-900">
              Terms
            </a>
            <a href="#" className="hover:text-slate-900">
              Instagram
            </a>
            <a href="#" className="hover:text-slate-900">
              Pinterest
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicCategoriesPage;
