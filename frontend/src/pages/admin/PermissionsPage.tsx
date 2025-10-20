import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/http';
import type { Pagination, Permission } from '../../types/models';
import SortableColumnHeader from '../../components/SortableColumnHeader';
import { useAppSelector } from '../../app/hooks';
import type { PermissionKey } from '../../types/auth';
import { hasAnyPermission } from '../../utils/permissions';
import ExportMenu from '../../components/ExportMenu';
import { exportDataset, type ExportFormat } from '../../utils/exporters';
import { useToast } from '../../components/ToastProvider';
import PageHeader from '../../components/PageHeader';
import PageSection from '../../components/PageSection';
import PaginationControls from '../../components/PaginationControls';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const PermissionsPage = () => {
  const { notify } = useToast();
  const { permissions: authPermissions } = useAppSelector((state) => state.auth);
  const grantedPermissions = (authPermissions ?? []) as PermissionKey[];
  const canExportPermissions = useMemo(
    () => hasAnyPermission(grantedPermissions, ['PERMISSIONS_EXPORT']),
    [grantedPermissions]
  );
  const [isExporting, setIsExporting] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState<{ field: 'key' | 'name'; direction: 'asc' | 'desc' }>({
    field: 'key',
    direction: 'asc'
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const {
    data: permissions = [],
    isLoading
  } = useQuery<Permission[]>({
    queryKey: ['permissions', 'all'],
    queryFn: async () => {
      const { data } = await adminApi.get<Pagination<Permission>>('/permissions?size=500');
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

  useEffect(() => {
    const totalPages = Math.max(Math.ceil(sortedPermissions.length / pageSize), 1);
    if (page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [sortedPermissions.length, pageSize, page]);

  const totalElements = sortedPermissions.length;

  const paginatedPermissions = useMemo(() => {
    const start = page * pageSize;
    return sortedPermissions.slice(start, start + pageSize);
  }, [sortedPermissions, page, pageSize]);

  const handleSortChange = (field: 'key' | 'name') => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
    setPage(0);
  };

  const handleExportPermissions = (format: ExportFormat) => {
    if (!canExportPermissions || isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      const columns = [
        { key: 'key', header: 'Key' },
        { key: 'name', header: 'Name' }
      ];
      const rows = sortedPermissions.map((permission) => ({
        key: permission.key,
        name: permission.name
      }));
      if (!rows.length) {
        notify({ type: 'error', message: 'There are no permissions to export for the current search.' });
        return;
      }
      exportDataset({
        format,
        columns,
        rows,
        fileName: 'permissions',
        title: 'Permissions'
      });
    } catch (error) {
      notify({ type: 'error', message: 'Unable to export permissions. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Permissions"
        description="Review every permission provisioned by the platform so you can assign the right capabilities to roles and users."
        actions={
          canExportPermissions ? (
            <ExportMenu onSelect={handleExportPermissions} disabled={isLoading} isBusy={isExporting} />
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total permissions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-800">{permissions.length}</p>
          <p className="mt-1 text-xs text-slate-500">Automatically managed from your service catalogue.</p>
        </div>
      </div>

      <PageSection padded={false} bodyClassName="flex flex-col">
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
              ) : totalElements === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-500">
                    No permissions match your search.
                  </td>
                </tr>
              ) : (
                paginatedPermissions.map((permission) => (
                  <tr key={permission.id} className="transition hover:bg-blue-50/40">
                    <td className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{permission.key}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{permission.name}</td>
                  </tr>
                ))
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
          isLoading={isLoading}
        />
      </PageSection>
    </div>
  );
};

export default PermissionsPage;
