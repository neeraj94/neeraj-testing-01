import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { BlogCategory, BlogMediaUploadResponse, BlogPost, BlogPostPage } from '../types/blog';
import { useToast } from '../components/ToastProvider';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { extractErrorMessage } from '../utils/errors';

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

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p><br></p>';
    }
  }, [value]);

  const exec = useCallback((command: string, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    onChange(editorRef.current?.innerHTML ?? '');
  }, [onChange]);

  const handleInput = useCallback(() => {
    onChange(editorRef.current?.innerHTML ?? '');
  }, [onChange]);

  const handleInsertLink = () => {
    const url = window.prompt('Enter link URL');
    if (url) {
      exec('createLink', url);
    }
  };

  const handleInsertImage = () => {
    const url = window.prompt('Enter image URL');
    if (url) {
      exec('insertImage', url);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <EditorButton label="Bold" onClick={() => exec('bold')} icon="B" />
        <EditorButton label="Italic" onClick={() => exec('italic')} icon="I" italic />
        <EditorButton label="Underline" onClick={() => exec('underline')} icon="U" underline />
        <EditorButton label="Heading" onClick={() => exec('formatBlock', 'h2')} icon="H2" />
        <EditorButton label="Paragraph" onClick={() => exec('formatBlock', 'p')} icon="P" />
        <EditorButton label="Bullet list" onClick={() => exec('insertUnorderedList')} icon="•" />
        <EditorButton label="Numbered list" onClick={() => exec('insertOrderedList')} icon="1." />
        <EditorButton label="Quote" onClick={() => exec('formatBlock', 'blockquote')} icon="❝" />
        <EditorButton label="Link" onClick={handleInsertLink} icon="🔗" />
        <EditorButton label="Image" onClick={handleInsertImage} icon="🖼️" />
        <EditorButton label="Clear formatting" onClick={() => exec('removeFormat')} icon="⌫" />
      </div>
      <div
        ref={editorRef}
        className="min-h-[240px] overflow-auto bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 focus:outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
      />
    </div>
  );
};

interface EditorButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
  italic?: boolean;
  underline?: boolean;
}

const EditorButton = ({ label, icon, onClick, italic, underline }: EditorButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
  >
    <span className={italic ? 'italic' : underline ? 'underline' : undefined}>{icon}</span>
  </button>
);

const BlogPostsPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
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
  const [mediaUploading, setMediaUploading] = useState<{ bannerImage: boolean; metaImage: boolean }>({
    bannerImage: false,
    metaImage: false
  });

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
    queryKey: ['blog', 'posts', { page, search, categoryFilter, statusFilter }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: DEFAULT_PAGE_SIZE, search };
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
  };

  const handleFileUpload = async (file: File, target: 'bannerImage' | 'metaImage') => {
    setMediaUploading((prev) => ({ ...prev, [target]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<BlogMediaUploadResponse>('/blog/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm((prev) => ({ ...prev, [target]: data.key }));
      setMediaPreview((prev) => ({ ...prev, [target]: data.url }));
      notify({ type: 'success', message: 'Media uploaded successfully.' });
    } catch (error) {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to upload media.') });
    } finally {
      setMediaUploading((prev) => ({ ...prev, [target]: false }));
    }
  };

  const handleBannerFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileUpload(file, 'bannerImage');
    }
  };

  const handleMetaFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileUpload(file, 'metaImage');
    }
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

  const totalPages = postsQuery.data?.totalPages ?? 0;
  const totalElements = postsQuery.data?.totalElements ?? 0;
  const pageCount = postsQuery.data?.content.length ?? 0;
  const showingFrom = totalElements === 0 ? 0 : page * DEFAULT_PAGE_SIZE + 1;
  const showingTo = totalElements === 0 ? 0 : page * DEFAULT_PAGE_SIZE + pageCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Blog Posts</h1>
          <p className="text-sm text-slate-500">
            Manage rich blog content with SEO metadata and visual assets.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
          >
            New Post
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
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
          <div className="text-sm text-slate-500">Page {page + 1} of {Math.max(totalPages, 1)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Title</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Updated</th>
                {(canUpdate || canDelete) && <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {postsQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading posts…
                  </td>
                </tr>
              )}
              {!postsQuery.isLoading && postsQuery.data?.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No posts match your filters.
                  </td>
                </tr>
              )}
              {postsQuery.data?.content.map((post) => (
                <tr key={post.id} className="divide-x divide-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">{post.title}</span>
                      <span className="text-xs text-slate-400">/{post.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{post.categoryName}</td>
                  <td className="px-4 py-3">
                    {post.published ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {post.updatedAt ? new Date(post.updatedAt).toLocaleString() : '—'}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditModal(post)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(post)}
                            className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0 || postsQuery.isLoading}
            className="rounded-lg border border-slate-200 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary hover:text-primary"
          >
            Previous
          </button>
          <span>
            Showing {showingFrom}-{showingTo} of {totalElements}
          </span>
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
            className="rounded-lg border border-slate-200 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary hover:text-primary"
          >
            Next
          </button>
        </div>
      </div>

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
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBannerFile}
                          disabled={mediaUploading.bannerImage}
                        />
                        {mediaUploading.bannerImage ? 'Uploading…' : 'Upload banner'}
                      </label>
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
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleMetaFile}
                            disabled={mediaUploading.metaImage}
                          />
                          {mediaUploading.metaImage ? 'Uploading…' : 'Upload meta image'}
                        </label>
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
