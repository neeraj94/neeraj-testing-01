import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/http';
import type { PublicBrand } from '../types/brand';
import StorefrontHeader from '../components/StorefrontHeader';

const PublicBrandsPage = () => {
  const [search, setSearch] = useState('');

  const brandsQuery = useQuery<PublicBrand[]>({
    queryKey: ['public', 'catalog', 'brands'],
    queryFn: async () => {
      const { data } = await api.get<PublicBrand[]>('/public/catalog/brands');
      return data;
    }
  });

  const brands = brandsQuery.data ?? [];

  const filteredBrands = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const sorted = [...brands].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    if (!normalizedSearch) {
      return sorted;
    }
    return sorted.filter((brand) =>
      [brand.name, brand.slug, brand.description ?? ''].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [brands, search]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StorefrontHeader activeKey="brands" />

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Brand collective</p>
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
                Discover the makers behind our most-loved products
              </h1>
              <p className="text-sm text-slate-600">
                From iconic powerhouses to emerging artisans, our partner brands balance innovation, sustainability, and
                craftsmanship. Explore their stories and shop collections curated exclusively for Aurora Market.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 font-semibold uppercase tracking-[0.3em] text-slate-600">
                  50+ global brands
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 font-semibold uppercase tracking-[0.3em] text-slate-600">
                  Curated weekly
                </span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-100/60 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Search the collective</h2>
              <p className="mt-2 text-sm text-slate-600">
                Filter by name, slug, or specialty to find the brand you want to explore.
              </p>
              <div className="mt-6">
                <label htmlFor="brand-search" className="sr-only">
                  Search brands
                </label>
                <div className="relative">
                  <input
                    id="brand-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search brands"
                    className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-slate-400">⌕</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {filteredBrands.length} {filteredBrands.length === 1 ? 'brand' : 'brands'} found
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          {brandsQuery.isError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
              Unable to load brands right now. Please refresh to try again.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {brandsQuery.isLoading
                ? Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white" aria-hidden />
                  ))
                : filteredBrands.map((brand) => (
                    <article
                      key={brand.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                    >
                      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" aria-hidden>
                        <div className="absolute -top-14 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                      </div>
                      <div className="relative flex items-center gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          {brand.logoUrl ? (
                            <img
                              src={brand.logoUrl}
                              alt={`${brand.name} logo`}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <span className="text-2xl font-semibold text-primary">{brand.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{brand.name}</h3>
                          <p className="text-xs uppercase tracking-[0.3em] text-primary">{brand.slug}</p>
                        </div>
                      </div>
                      <p className="mt-6 text-sm text-slate-600 line-clamp-3">
                        {brand.description || 'A spotlight brand featuring exclusive drops for Aurora Market shoppers.'}
                      </p>
                      <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        <span>View collection</span>
                        <span aria-hidden>→</span>
                      </div>
                    </article>
                  ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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

export default PublicBrandsPage;
