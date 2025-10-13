import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/http';
import type { PublicCategory } from '../types/category';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/products/showcase', label: 'Product' }
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-black/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-white">
            Aurora Market
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-full px-4 py-2 transition hover:bg-white/10 ${
                  link.href === '/categories' ? 'bg-white/10 text-white' : 'text-slate-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
            <span className="hidden sm:inline">Call us</span>
            <a href="tel:+18004561234" className="font-semibold text-white">
              +1 (800) 456-1234
            </a>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">Our catalog</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Discover product categories curated for every lifestyle
              </h1>
              <p className="mt-4 text-sm text-slate-300">
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
                  className="w-full rounded-full border border-white/20 bg-black/50 px-5 py-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-slate-400">⌕</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} found
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {categoriesQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-3xl border border-white/5 bg-white/5"
                  aria-hidden
                />
              ))
            ) : categoriesQuery.isError ? (
              <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-8 text-sm text-rose-100 md:col-span-2 xl:col-span-3">
                Unable to load categories. Please try again shortly.
              </div>
            ) : !filteredCategories.length ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300 md:col-span-2 xl:col-span-3">
                No categories match your search right now.
              </div>
            ) : (
              filteredCategories.map((category) => (
                <article
                  key={category.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-white/30"
                >
                  <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" aria-hidden>
                    <div className="absolute -top-12 right-0 h-40 w-40 rounded-full bg-primary/40 blur-3xl" />
                  </div>
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                      <span>{category.type === 'DIGITAL' ? 'Digital' : 'Physical'}</span>
                      {typeof category.orderNumber === 'number' && (
                        <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-white/80">
                          Priority {category.orderNumber}
                        </span>
                      )}
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt="Category visual"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/40 via-purple-500/40 to-slate-900 text-2xl font-semibold text-white">
                            {category.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">{category.name}</h2>
                        <p className="mt-2 text-xs text-slate-300 line-clamp-2">
                          {category.description || 'A curated mix of products designed to elevate daily rituals.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                      <span>Shop now</span>
                      <span aria-hidden>→</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Aurora Market. Crafted with purpose.</div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#" className="hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white">
              Terms
            </a>
            <a href="#" className="hover:text-white">
              Instagram
            </a>
            <a href="#" className="hover:text-white">
              Pinterest
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicCategoriesPage;
