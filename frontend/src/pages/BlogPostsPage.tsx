import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { BlogCategory, BlogMediaUploadResponse, BlogPost, BlogPostPage } from '../types/blog';
import { useToast } from '../components/ToastProvider';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { extractErrorMessage } from '../utils/errors';
import RichTextEditor from '../components/RichTextEditor';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import type { MediaSelection } from '../types/uploaded-file';

interface PostFormState {
  title: string;
  slug: string;
  categoryId: number | null;
  description: string;
  published: boolean;
  bannerImage: string | null;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  metaImage: string | null;
}

type FormMode = 'create' | 'edit';

type BlogPostPayload = Omit<PostFormState, 'categoryId'> & { categoryId: number };

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const EMPTY_FORM: PostFormState = {
  title: '',
  slug: '',
  categoryId: null,
  description: '',
  published: false,
  bannerImage: null,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  metaImage: null
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const buildMediaUrl = (key?: string | null) => {
  if (!key) {
    return null;
  }
  const base = api.defaults.baseURL ?? '';
  return `${base.replace(/\/$/, '')}/blog/media/${key}`;
};

const BlogPostsPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [form, setForm] = useState<PostFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ bannerImage: string | null; metaImage: string | null }>({
    bannerImage: null,
    metaImage: null
  });
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaLibraryTarget, setMediaLibraryTarget] = useState<'bannerImage' | 'metaImage' | null>(null);

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BLOG_POST_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BLOG_POST_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BLOG_POST_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setPage(0);
  }, [categoryFilter, statusFilter]);

  const categoriesQuery = useQuery<BlogCategory[]>({
    queryKey: ['blog', 'categories', 'all'],
    queryFn: async () => {
      const { data } = await api.get<BlogCategory[]>('/blog/categories/all');
      return data;
    }
  });

  const postsQuery = useQuery<BlogPostPage>({
    queryKey: ['blog', 'posts', { page, pageSize, search, categoryFilter, statusFilter }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize, search };
      if (categoryFilter !== 'all') {
        params.categoryId = categoryFilter;
      }
      if (statusFilter === 'published') {
        params.published = true;
      } else if (statusFilter === 'draft') {
        params.published = false;
      }
      const { data } = await api.get<BlogPostPage>('/blog/posts', { params });
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: BlogPostPayload) => {
      const { data } = await api.post<BlogPost>('/blog/posts', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Post created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create post.') });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: BlogPostPayload }) => {
      const { data } = await api.put<BlogPost>(`/blog/posts/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Post updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update post.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/blog/posts/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Post deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete post.') });
    }
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setMediaPreview({ bannerImage: null, metaImage: null });
    setFormError(null);
    setEditingId(null);
    setMediaLibraryOpen(false);
    setMediaLibraryTarget(null);
  };

  const openCreateModal = () => {
    resetForm();
    setFormMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      categoryId: post.categoryId,
      description: post.description,
      published: post.published,
      bannerImage: post.bannerImage ?? null,
      metaTitle: post.metaTitle ?? '',
      metaDescription: post.metaDescription ?? '',
      metaKeywords: post.metaKeywords ?? '',
      metaImage: post.metaImage ?? null
    });
    setMediaPreview({
      bannerImage: buildMediaUrl(post.bannerImage),
      metaImage: buildMediaUrl(post.metaImage)
    });
    setFormError(null);
    setEditingId(post.id);
    setFormMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setMediaLibraryOpen(false);
    setMediaLibraryTarget(null);
  };

  const openMediaLibrary = (target: 'bannerImage' | 'metaImage') => {
    setMediaLibraryTarget(target);
    setMediaLibraryOpen(true);
  };

  const closeMediaLibrary = () => {
    setMediaLibraryOpen(false);
    setMediaLibraryTarget(null);
  };

  const resolveMediaKey = (selection: MediaSelection): string | null => {
    if (selection.storageKey && selection.storageKey.trim() !== '') {
      return selection.storageKey;
    }
    if (!selection.url) {
      return null;
    }
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const parsed = new URL(selection.url, origin);
      const segments = parsed.pathname.split('/').filter(Boolean);
      return segments.length > 0 ? segments[segments.length - 1] : selection.url;
    } catch (error) {
      const parts = selection.url.split('/').filter(Boolean);
      return parts.length > 0 ? parts[parts.length - 1] : selection.url;
    }
  };

  const handleMediaSelect = (selection: MediaSelection) => {
    if (!mediaLibraryTarget) {
      closeMediaLibrary();
      return;
    }
    const key = resolveMediaKey(selection);
    setForm((prev) => ({ ...prev, [mediaLibraryTarget]: key ?? null }));
    setMediaPreview((prev) => ({ ...prev, [mediaLibraryTarget]: selection.url }));
    closeMediaLibrary();
  };

  const handleMediaUpload = async (file: File): Promise<MediaSelection> => {
    if (!mediaLibraryTarget) {
      throw new Error('No media target selected.');
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const usage = mediaLibraryTarget === 'bannerImage' ? 'BANNER' : 'META';
      const { data } = await api.post<BlogMediaUploadResponse>('/blog/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { usage }
      });
      notify({ type: 'success', message: 'Media uploaded successfully.' });
      return {
        url: data.url,
        storageKey: data.key,
        originalFilename: data.originalFilename ?? undefined,
        mimeType: data.mimeType ?? undefined,
        sizeBytes: data.sizeBytes ?? undefined
      };
    } catch (error) {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to upload media.') });
      throw error;
    }
  };

  const handleMediaRemove = (target: 'bannerImage' | 'metaImage') => {
    setForm((prev) => ({ ...prev, [target]: null }));
    setMediaPreview((prev) => ({ ...prev, [target]: null }));
  };

  const moduleForTarget: Record<'bannerImage' | 'metaImage', string> = {
    bannerImage: 'BLOG_BANNER_IMAGE',
    metaImage: 'BLOG_META_IMAGE'
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return false;
    }
    if (form.categoryId === null) {
      setFormError('Please select a category.');
      return false;
    }
    if (!form.description || stripHtml(form.description).length === 0) {
      setFormError('Post content cannot be empty.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    const payload: BlogPostPayload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      categoryId: form.categoryId as number,
      description: form.description,
      published: form.published,
      bannerImage: form.bannerImage,
      metaTitle: form.metaTitle.trim(),
      metaDescription: form.metaDescription.trim(),
      metaKeywords: form.metaKeywords.trim(),
      metaImage: form.metaImage
    };
    try {
      if (formMode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (editingId != null) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      }
      closeModal();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Failed to save post.'));
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!canDelete) {
      return;
    }
    const confirmed = window.confirm(`Delete the post "${post.title}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(post.id);
  };

  const posts = postsQuery.data?.content ?? [];
  const totalElements = postsQuery.data?.totalElements ?? 0;

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Blog Posts"
        description="Manage rich blog content with SEO metadata and visual assets."
        actions={
          canCreate
            ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                >
                  New post
                </button>
              )
            : undefined
        }
      />

      <MediaLibraryDialog
        open={mediaLibraryOpen}
        onClose={closeMediaLibrary}
        moduleFilters={mediaLibraryTarget ? [moduleForTarget[mediaLibraryTarget]] : undefined}
        onSelect={handleMediaSelect}
        onUpload={mediaLibraryTarget ? handleMediaUpload : undefined}
      />

      <PageSection padded={false} bodyClassName="flex flex-col">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search posts"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
            />
            <select
              value={categoryFilter === 'all' ? 'all' : String(categoryFilter)}
              onChange={(event) => {
                const value = event.target.value;
                setCategoryFilter(value === 'all' ? 'all' : Number(value));
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
            >
              <option value="all">All categories</option>
              {categoriesQuery.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</th>
                {(canUpdate || canDelete) && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {postsQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading posts…
                  </td>
                </tr>
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <tr key={post.id} className="transition hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{post.title}</span>
                        <span className="text-xs text-slate-400">/{post.slug}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{post.categoryName}</td>
                    <td className="px-4 py-3">
                      {post.published ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {post.updatedAt ? new Date(post.updatedAt).toLocaleString() : '—'}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditModal(post)}
                              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                              aria-label={`Edit ${post.title}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(post)}
                              className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                              aria-label={`Delete ${post.title}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                                className="h-4 w-4"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V4h6v3m2 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7h12Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No posts match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalElements={totalElements}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
          isLoading={postsQuery.isLoading}
        />
      </PageSection>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {formMode === 'create' ? 'Create Post' : 'Edit Post'}
                </h2>
                <p className="text-sm text-slate-500">
                  Craft engaging content and optimize metadata for search visibility.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeModal();
                }}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="h-[calc(90vh-160px)] overflow-y-auto px-6 py-6">
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-5">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="post-title">
                      Title
                    </label>
                    <input
                      id="post-title"
                      type="text"
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter a descriptive title"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="post-slug">
                        Slug <span className="text-xs font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        id="post-slug"
                        type="text"
                        value={form.slug}
                        onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="feature-announcement"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="post-category">
                        Category
                      </label>
                      <select
                        id="post-category"
                      value={form.categoryId === null ? '' : String(form.categoryId)}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          categoryId: event.target.value ? Number(event.target.value) : null
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select a category</option>
                        {categoriesQuery.data?.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Content</label>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.published}
                          onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        Publish immediately
                      </label>
                    </div>
                    <RichTextEditor
                      value={form.description}
                      onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                    />
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Banner Image</h3>
                  <div className="space-y-3">
                    {mediaPreview.bannerImage ? (
                      <img
                        src={mediaPreview.bannerImage}
                        alt="Banner preview"
                        className="h-40 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                        No banner selected
                      </div>
                    )}
                    {form.bannerImage && !mediaPreview.bannerImage && (
                      <p className="break-all text-xs text-slate-500">{form.bannerImage}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openMediaLibrary('bannerImage')}
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600"
                      >
                        Select banner
                      </button>
                      {form.bannerImage && (
                        <button
                          type="button"
                          onClick={() => handleMediaRemove('bannerImage')}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">SEO Metadata</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="meta-title">
                          Meta Title
                        </label>
                        <input
                          id="meta-title"
                          type="text"
                          value={form.metaTitle}
                          onChange={(event) => setForm((prev) => ({ ...prev, metaTitle: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Title displayed in search results"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="meta-description">
                          Meta Description
                        </label>
                        <textarea
                          id="meta-description"
                          value={form.metaDescription}
                          onChange={(event) => setForm((prev) => ({ ...prev, metaDescription: event.target.value }))}
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Short summary for search engines"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="meta-keywords">
                          Meta Keywords
                        </label>
                        <input
                          id="meta-keywords"
                          type="text"
                          value={form.metaKeywords}
                          onChange={(event) => setForm((prev) => ({ ...prev, metaKeywords: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="keyword one, keyword two"
                        />
                      </div>
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-slate-500">Meta Image</p>
                        {mediaPreview.metaImage ? (
                          <img
                            src={mediaPreview.metaImage}
                            alt="Meta preview"
                            className="h-32 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                            No meta image selected
                          </div>
                        )}
                        {form.metaImage && !mediaPreview.metaImage && (
                          <p className="break-all text-xs text-slate-500">{form.metaImage}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openMediaLibrary('metaImage')}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600"
                          >
                            Select meta image
                          </button>
                          {form.metaImage && (
                            <button
                              type="button"
                              onClick={() => handleMediaRemove('metaImage')}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {formError && (
                <div className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{formError}</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPostsPage;
