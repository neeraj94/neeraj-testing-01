import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { BlogCategory, BlogCategoryPage } from '../types/blog';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
}

type FormMode = 'create' | 'edit';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const BlogCategoriesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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
    queryKey: ['blog', 'categories', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<BlogCategoryPage>('/blog/categories', {
        params: { page, size: pageSize, search }
      });
      return data;
    }
  });

  const categories = categoriesQuery.data?.content ?? [];
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

  const totalElements = categoriesQuery.data?.totalElements ?? 0;

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Blog Categories"
        description="Organize posts into meaningful categories to keep content discoverable."
        actions={
          canCreate
            ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
                >
                  New category
                </button>
              )
            : undefined
        }
      />

      <PageSection padded={false} bodyClassName="flex flex-col">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search categories"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
                {(canUpdate || canDelete) && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {categoriesQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading categories…
                  </td>
                </tr>
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <tr key={category.id} className="transition hover:bg-blue-50/40">
                    <td className="px-4 py-3 font-medium text-slate-800">{category.name}</td>
                    <td className="px-4 py-3 text-slate-600">{category.slug}</td>
                    <td className="px-4 py-3 text-slate-600">{category.description ?? '—'}</td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditModal(category)}
                              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                              aria-label={`Edit ${category.name}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(category)}
                              className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                              aria-label={`Delete ${category.name}`}
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
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    No categories found.
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
          isLoading={categoriesQuery.isLoading}
        />
      </PageSection>

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
