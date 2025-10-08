import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { PublicBlogPost } from '../types/blog';

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const PublicBlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const postQuery = useQuery<PublicBlogPost>({
    queryKey: ['public', 'blog', 'post', slug],
    queryFn: async () => {
      if (!slug) {
        throw new Error('Missing slug');
      }
      const { data } = await api.get<PublicBlogPost>(`/blog/public/posts/${slug}`);
      return data;
    },
    enabled: Boolean(slug)
  });

  const originalTitleRef = useRef<string>(document.title);

  useEffect(() => {
    if (postQuery.data?.metaTitle) {
      document.title = postQuery.data.metaTitle;
    } else if (postQuery.data?.title) {
      document.title = `${postQuery.data.title} – Blog`;
    }
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [postQuery.data?.metaTitle, postQuery.data?.title]);

  if (postQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading article…
      </div>
    );
  }

  if (postQuery.isError || !postQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-800">Article not found</h1>
          <p className="mt-3 text-sm text-slate-500">
            We couldn't find the story you were looking for. It may have been moved or unpublished.
          </p>
          <Link
            to="/blog"
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
          >
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  const post = postQuery.data;
  const base = api.defaults.baseURL ?? '';
  const hero = post.bannerImage
    ? `${base.replace(/\/$/, '')}/blog/media/${post.bannerImage}`
    : 'https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80';
  const metaImage = post.metaImage ? `${base.replace(/\/$/, '')}/blog/media/${post.metaImage}` : undefined;

  const metaRef = useRef<HTMLMetaElement | null>(null);

  useEffect(() => {
    if (!metaImage) {
      if (metaRef.current) {
        metaRef.current.remove();
        metaRef.current = null;
      }
      return;
    }
    const element = document.createElement('meta');
    element.setAttribute('property', 'og:image');
    element.setAttribute('content', metaImage);
    document.head.appendChild(element);
    metaRef.current = element;
    return () => {
      element.remove();
      metaRef.current = null;
    };
  }, [metaImage]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Link to="/blog" className="inline-flex items-center text-sm font-semibold text-primary hover:text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              className="mr-1 h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to all articles
          </Link>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary/80">{post.category}</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">{post.title}</h1>
          {post.publishedAt && (
            <p className="mt-2 text-sm text-slate-500">Published on {new Date(post.publishedAt).toLocaleDateString()}</p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        <div className="mt-6 overflow-hidden rounded-3xl">
          <img src={hero} alt={post.title} className="h-80 w-full object-cover" />
        </div>
        <article className="mx-auto max-w-none py-10">
          <div
            className="space-y-4 text-base leading-relaxed text-slate-700"
            dangerouslySetInnerHTML={{ __html: post.description }}
          />
        </article>
        <aside className="mb-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Article metadata</h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Meta title</dt>
              <dd>{post.metaTitle || post.title}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Meta description</dt>
              <dd>{post.metaDescription || stripHtml(post.description).slice(0, 160)}</dd>
            </div>
            {post.metaKeywords && (
              <div className="sm:col-span-2">
                <dt className="font-medium text-slate-500">Keywords</dt>
                <dd>{post.metaKeywords}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
};

export default PublicBlogPostPage;
