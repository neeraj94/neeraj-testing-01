import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { BlogCategory, BlogCategoryPage } from '../types/blog';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
}

type FormMode = 'create' | 'edit';

const DEFAULT_PAGE_SIZE = 10;

const BlogCategoriesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [form, setForm] = useState<CategoryFormState>({ name: '', slug: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BLOG_CATEGORY_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BLOG_CATEGORY_UPDATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['BLOG_CATEGORY_DELETE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const categoriesQuery = useQuery<BlogCategoryPage>({
    queryKey: ['blog', 'categories', { page, search }],
    queryFn: async () => {
      const { data } = await api.get<BlogCategoryPage>('/blog/categories', {
        params: { page, size: DEFAULT_PAGE_SIZE, search }
      });
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CategoryFormState) => {
      const { data } = await api.post<BlogCategory>('/blog/categories', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Category created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['blog', 'categories'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to create category.') });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CategoryFormState }) => {
      const { data } = await api.put<BlogCategory>(`/blog/categories/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Category updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['blog', 'categories'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to update category.') });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/blog/categories/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Category deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['blog', 'categories'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete category.') });
    }
  });

  const openCreateModal = () => {
    setForm({ name: '', slug: '', description: '' });
    setFormError(null);
    setEditingId(null);
    setFormMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (category: BlogCategory) => {
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? ''
    });
    setFormError(null);
    setEditingId(category.id);
    setFormMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    const payload: CategoryFormState = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim()
    };
    try {
      if (formMode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (editingId != null) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      }
      closeModal();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Failed to save category.'));
    }
  };

  const handleDelete = async (category: BlogCategory) => {
    if (!canDelete) {
      return;
    }
    const confirmed = window.confirm(`Delete category "${category.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(category.id);
  };

  const totalPages = categoriesQuery.data?.totalPages ?? 0;
  const totalElements = categoriesQuery.data?.totalElements ?? 0;
  const pageCount = categoriesQuery.data?.content.length ?? 0;
  const showingFrom = totalElements === 0 ? 0 : page * DEFAULT_PAGE_SIZE + 1;
  const showingTo = totalElements === 0 ? 0 : page * DEFAULT_PAGE_SIZE + pageCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Blog Categories</h1>
          <p className="text-sm text-slate-500">Organize posts into meaningful categories to keep content discoverable.</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
          >
            New Category
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search categories"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
          />
          <div className="text-sm text-slate-500">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Description</th>
                {(canUpdate || canDelete) && <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categoriesQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Loading categories…
                  </td>
                </tr>
              )}
              {!categoriesQuery.isLoading && categoriesQuery.data?.content.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No categories found.
                  </td>
                </tr>
              )}
              {categoriesQuery.data?.content.map((category) => (
                <tr key={category.id} className="divide-x divide-slate-100">
                  <td className="px-4 py-3 text-slate-700">{category.name}</td>
                  <td className="px-4 py-3 text-slate-500">{category.slug}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {category.description ? category.description : <span className="italic text-slate-400">No description</span>}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditModal(category)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
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
            disabled={page === 0 || categoriesQuery.isLoading}
            className="rounded-lg border border-slate-200 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary hover:text-primary"
          >
            Previous
          </button>
          <span>
            Showing {showingFrom}-{showingTo} of {totalElements}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => (categoriesQuery.data && prev < categoriesQuery.data.totalPages - 1 ? prev + 1 : prev))}
            disabled={categoriesQuery.isLoading || (categoriesQuery.data ? page >= categoriesQuery.data.totalPages - 1 : true)}
            className="rounded-lg border border-slate-200 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary hover:text-primary"
          >
            Next
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {formMode === 'create' ? 'Create Category' : 'Edit Category'}
                </h2>
                <p className="text-sm text-slate-500">
                  Define how blog posts are grouped for easier browsing.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-name">
                  Name
                </label>
                <input
                  id="category-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Marketing"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-slug">
                  Slug <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="category-slug"
                  type="text"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="marketing"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category-description">
                  Description <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="category-description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Short summary to help teammates understand where to add their posts."
                />
              </div>
              {formError && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{formError}</div>}
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
                {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogCategoriesPage;
