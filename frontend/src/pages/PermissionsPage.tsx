import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { Pagination, Permission } from '../types/models';
import SortableColumnHeader from '../components/SortableColumnHeader';

const PermissionsPage = () => {
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<{ field: 'key' | 'name'; direction: 'asc' | 'desc' }>({
    field: 'key',
    direction: 'asc'
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchDraft.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const {
    data: permissions = [],
    isLoading
  } = useQuery<Permission[]>({
    queryKey: ['permissions', 'all'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Permission>>('/permissions?size=500');
      return data.content;
    }
  });

  const filteredPermissions = useMemo(() => {
    if (!searchTerm) {
      return permissions;
    }
    const term = searchTerm.toLowerCase();
    return permissions.filter((permission) =>
      permission.key.toLowerCase().includes(term) || permission.name.toLowerCase().includes(term)
    );
  }, [permissions, searchTerm]);

  const sortedPermissions = useMemo(() => {
    const list = [...filteredPermissions];
    const factor = sort.direction === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sort.field === 'key') {
        return a.key.localeCompare(b.key, undefined, { sensitivity: 'base' }) * factor;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * factor;
    });
    return list;
  }, [filteredPermissions, sort]);

  const handleSortChange = (field: 'key' | 'name') => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  return (
    <div className="flex min-h-full flex-col gap-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Permissions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review every permission provisioned by the platform so you can assign the right capabilities to roles and users.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total permissions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-800">{permissions.length}</p>
          <p className="mt-1 text-xs text-slate-500">Automatically managed from your service catalogue.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by permission key or name"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <SortableColumnHeader
                  label="Key"
                  field="key"
                  currentField={sort.field}
                  direction={sort.direction}
                  onSort={handleSortChange}
                />
                <SortableColumnHeader
                  label="Name"
                  field="name"
                  currentField={sort.field}
                  direction={sort.direction}
                  onSort={handleSortChange}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading permissions…
                  </td>
                </tr>
              ) : sortedPermissions.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-500">
                    No permissions match your search.
                  </td>
                </tr>
              ) : (
                sortedPermissions.map((permission) => (
                  <tr key={permission.id} className="transition hover:bg-blue-50/40">
                    <td className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{permission.key}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{permission.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PermissionsPage;
