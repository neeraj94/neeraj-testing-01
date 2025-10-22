import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/http';
import type { BlogCategory, PublicBlogPost, PublicBlogPostPage } from '../types/blog';

const DEFAULT_PAGE_SIZE = 9;

const stripHtml = (value?: string | null) =>
  (value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

const formatDisplayDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString();
};

const PublicBlogListPage = () => {
  const [page, setPage] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setPage(0);
  }, [categoryFilter]);

  const categoriesQuery = useQuery<BlogCategory[]>({
    queryKey: ['public', 'blog', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<BlogCategory[]>('/blog/public/categories');
      return data;
    }
  });

  const postsQuery = useQuery<PublicBlogPostPage>({
    queryKey: ['public', 'blog', 'posts', { page, search, categoryFilter }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: DEFAULT_PAGE_SIZE, search };
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      const { data } = await api.get<PublicBlogPostPage>('/blog/public/posts', { params });
      return data;
    }
  });

  const totalPages = postsQuery.data?.totalPages ?? 0;
  const totalElements = postsQuery.data?.totalElements ?? 0;
  const pageCount = postsQuery.data?.content.length ?? 0;
  const showingFrom = totalElements === 0 ? 0 : page * DEFAULT_PAGE_SIZE + 1;
  const showingTo = totalElements === 0 ? 0 : page * DEFAULT_PAGE_SIZE + pageCount;

  const renderExcerpt = (post: PublicBlogPost) => {
    const plain = stripHtml(post.description);
    if (plain.length <= 160) {
      return plain;
    }
    return `${plain.slice(0, 157)}…`;
  };

  const buildMediaUrl = (key?: string | null) => {
    if (!key) {
      return null;
    }
    const base = api.defaults.baseURL ?? '';
    return `${base.replace(/\/$/, '')}/blog/media/${key}`;
  };

  const cards = useMemo(() => postsQuery.data?.content ?? [], [postsQuery.data?.content]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-12">

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Insights</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Latest from the Blog</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Explore product updates, customer stories, and best practices curated by our team.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:w-80">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search articles"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All categories</option>
              {categoriesQuery.data?.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {showingFrom}-{showingTo} of {totalElements}
          </span>
          <span>Page {page + 1} of {Math.max(totalPages, 1)}</span>
        </div>

        {postsQuery.isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading articles…
          </div>
        )}

        {!postsQuery.isLoading && cards.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            No blog posts found. Try adjusting your search.
          </div>
        )}

        {!postsQuery.isLoading && cards.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((post) => {
              const banner = buildMediaUrl(post.bannerImage) ?? 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80';
              const publishedLabel = formatDisplayDate(post.publishedAt);
              return (
                <article
                  key={post.slug}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-48 w-full overflow-hidden">
                    <img src={banner} alt={post.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold uppercase tracking-wide text-primary/80">{post.category}</span>
                      {publishedLabel && <time dateTime={post.publishedAt ?? undefined}>{publishedLabel}</time>}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-slate-900">
                      <Link to={`/blog/${post.slug}`} className="hover:text-primary">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{renderExcerpt(post)}</p>
                    <div className="mt-4">
                      <Link
                        to={`/blog/${post.slug}`}
                        className="inline-flex items-center text-sm font-semibold text-primary hover:text-blue-600"
                      >
                        Read more
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.6}
                          className="ml-1 h-4 w-4"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between text-sm text-slate-600">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0 || postsQuery.isLoading}
            className="rounded-lg border border-slate-200 px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary hover:text-primary"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() =>
              setPage((prev) =>
                postsQuery.data && prev < postsQuery.data.totalPages - 1 ? prev + 1 : prev
              )
            }
            disabled={
              postsQuery.isLoading || (postsQuery.data ? page >= postsQuery.data.totalPages - 1 : true)
            }
            className="rounded-lg border border-slate-200 px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary hover:text-primary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicBlogListPage;
