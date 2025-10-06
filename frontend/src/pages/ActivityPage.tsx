import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DataTable from '../components/DataTable';
import SortableColumnHeader from '../components/SortableColumnHeader';
import ExportMenu from '../components/ExportMenu';
import api from '../services/http';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import type { ActivityFilterOptions, ActivityLogEntry, Pagination } from '../types/models';
import { extractErrorMessage } from '../utils/errors';
import { useToast } from '../components/ToastProvider';
import { exportDataset, type ExportFormat } from '../utils/exporters';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

type ActivitySortField = 'timestamp' | 'user' | 'activityType' | 'module' | 'status';

type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

const ActivityPage = () => {
  const navigate = useNavigate();
  const { permissions } = useAppSelector((state) => state.auth);
  const grantedPermissions = permissions as PermissionKey[];
  const { notify } = useToast();
  const canExport = hasAnyPermission(grantedPermissions, ['ACTIVITY_EXPORT']);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState<{ field: ActivitySortField; direction: 'asc' | 'desc' }>({
    field: 'timestamp',
    direction: 'desc'
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [ipFilter, setIpFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const filtersKey = useMemo(
    () => ({
      user: userFilter.trim(),
      roles: [...roleFilter].sort(),
      departments: [...departmentFilter].sort(),
      modules: [...moduleFilter].sort(),
      types: [...typeFilter].sort(),
      statuses: [...statusFilter].sort(),
      ip: ipFilter.trim(),
      devices: [...deviceFilter].sort(),
      startDate,
      endDate,
      search
    }),
    [
      userFilter,
      roleFilter,
      departmentFilter,
      moduleFilter,
      typeFilter,
      statusFilter,
      ipFilter,
      deviceFilter,
      startDate,
      endDate,
      search
    ]
  );

  const buildQueryParams = (overrides?: { page?: number; size?: number }) => {
    const params = new URLSearchParams();
    const nextPage = overrides?.page ?? page;
    const nextSize = overrides?.size ?? pageSize;
    params.set('page', String(nextPage));
    params.set('size', String(nextSize));
    params.set('sort', sort.field);
    params.set('direction', sort.direction);
    if (search) {
      params.set('search', search);
    }
    const trimmedUser = userFilter.trim();
    if (trimmedUser) {
      params.set('user', trimmedUser);
    }
    roleFilter.forEach((value) => params.append('role', value));
    departmentFilter.forEach((value) => params.append('department', value));
    moduleFilter.forEach((value) => params.append('module', value));
    typeFilter.forEach((value) => params.append('type', value));
    statusFilter.forEach((value) => params.append('status', value));
    const trimmedIp = ipFilter.trim();
    if (trimmedIp) {
      params.set('ipAddress', trimmedIp);
    }
    deviceFilter.forEach((value) => params.append('device', value));
    if (startDate) {
      const startIso = new Date(`${startDate}T00:00:00`).toISOString();
      params.set('startDate', startIso);
    }
    if (endDate) {
      const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();
      params.set('endDate', endIso);
    }
    return params;
  };

  const filtersQuery = useQuery<ActivityFilterOptions>({
    queryKey: ['activity', 'filters'],
    queryFn: async () => {
      const { data } = await api.get<ActivityFilterOptions>('/activity/filters');
      return data;
    }
  });

  const activityQuery = useQuery<Pagination<ActivityLogEntry>>({
    queryKey: ['activity', 'list', { page, pageSize, sort, filtersKey }],
    queryFn: async () => {
      const { data } = await api.get<Pagination<ActivityLogEntry>>('/activity', {
        params: buildQueryParams()
      });
      return data;
    }
  });

  const activityData = activityQuery.data as Pagination<ActivityLogEntry> | undefined;
  const activities: ActivityLogEntry[] = activityData?.content ?? [];
  const totalElements = activityData?.totalElements ?? 0;
  const totalPages = activityData?.totalPages ?? 0;
  const isLoading = activityQuery.isLoading;
  const hasError = activityQuery.isError;
  const errorMessage = hasError
    ? extractErrorMessage(activityQuery.error, 'Unable to load activity log records.')
    : null;

  useEffect(() => {
    if (!isLoading && !hasError && totalPages > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [isLoading, hasError, totalPages, page]);

  const handleSort = (field: ActivitySortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc';
        return { field, direction: nextDirection };
      }
      return { field, direction: field === 'timestamp' ? 'desc' : 'asc' };
    });
    setPage(0);
  };

  const handlePageSizeChange = (event: SelectChangeEvent) => {
    const nextSize = Number(event.target.value);
    setPageSize(nextSize);
    setPage(0);
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(prev - 1, 0));
  };

  const handleNextPage = () => {
    if (page + 1 < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  const handleMultiSelectChange = (event: SelectChangeEvent, setter: (values: string[]) => void) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setter(values);
    setPage(0);
  };

  const handleClearFilters = () => {
    setUserFilter('');
    setRoleFilter([]);
    setDepartmentFilter([]);
    setModuleFilter([]);
    setTypeFilter([]);
    setStatusFilter([]);
    setIpFilter('');
    setDeviceFilter([]);
    setStartDate('');
    setEndDate('');
    setSearch('');
    setSearchDraft('');
    setPage(0);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!canExport || isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      const params = buildQueryParams({ page: 0, size: Math.max(pageSize, 1000) });
      params.set('size', '1000');
      const { data } = await api.get<Pagination<ActivityLogEntry>>('/activity', { params });
      if (!data.content.length) {
        notify({ type: 'error', message: 'There are no activity records to export for the selected filters.' });
        return;
      }

      const rows = data.content.map((activity) => ({
        timestamp: formatDateTime(activity.occurredAt),
        user: activity.userName,
        role: activity.userRole ?? '—',
        department: activity.department ?? '—',
        module: activity.module ?? '—',
        type: activity.activityType,
        status: activity.status ?? '—',
        ipAddress: activity.ipAddress ?? '—',
        device: activity.device ?? '—',
        description: activity.description ?? '—'
      }));

      const columns = [
        { key: 'timestamp', header: 'Timestamp' },
        { key: 'user', header: 'User' },
        { key: 'role', header: 'Role' },
        { key: 'department', header: 'Department' },
        { key: 'module', header: 'Module' },
        { key: 'type', header: 'Activity Type' },
        { key: 'status', header: 'Status' },
        { key: 'ipAddress', header: 'IP Address' },
        { key: 'device', header: 'Device' },
        { key: 'description', header: 'Description' }
      ];

      exportDataset({
        format,
        columns,
        rows,
        fileName: 'activity-log',
        title: 'Activity Log Export'
      });
    } catch (error) {
      notify({ type: 'error', message: 'Unable to export activity records. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const renderStatusBadge = (status?: string | null) => {
    if (!status) {
      return <span className="text-slate-400">—</span>;
    }
    const normalized = status.toUpperCase();
    const isSuccess = normalized === 'SUCCESS';
    const isFailure = normalized === 'FAILURE' || normalized === 'ERROR';
    const badgeClass = isSuccess
      ? 'bg-emerald-100 text-emerald-700'
      : isFailure
      ? 'bg-rose-100 text-rose-700'
      : 'bg-slate-100 text-slate-700';
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{normalized}</span>;
  };

  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalElements);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Activity</h1>
          <p className="text-sm text-slate-500">
            Review a complete audit trail of user actions across the platform.
          </p>
        </div>
        {canExport && (
          <ExportMenu onSelect={handleExport} isBusy={isExporting} disabled={isLoading} />
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-600">Search</label>
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search descriptions, modules, users, or IP addresses"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">User</label>
            <input
              type="text"
              value={userFilter}
              onChange={(event) => {
                setUserFilter(event.target.value);
                setPage(0);
              }}
              placeholder="Name or ID"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">IP Address</label>
            <input
              type="text"
              value={ipFilter}
              onChange={(event) => {
                setIpFilter(event.target.value);
                setPage(0);
              }}
              placeholder="e.g. 192.168.1.10"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">Roles</label>
            <select
              multiple
              value={roleFilter}
              onChange={(event) => handleMultiSelectChange(event, setRoleFilter)}
              className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {filtersQuery.data?.roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Departments</label>
            <select
              multiple
              value={departmentFilter}
              onChange={(event) => handleMultiSelectChange(event, setDepartmentFilter)}
              className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {filtersQuery.data?.departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Modules</label>
            <select
              multiple
              value={moduleFilter}
              onChange={(event) => handleMultiSelectChange(event, setModuleFilter)}
              className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {filtersQuery.data?.modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Activity Types</label>
            <select
              multiple
              value={typeFilter}
              onChange={(event) => handleMultiSelectChange(event, setTypeFilter)}
              className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {filtersQuery.data?.activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">Statuses</label>
            <select
              multiple
              value={statusFilter}
              onChange={(event) => handleMultiSelectChange(event, setStatusFilter)}
              className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {filtersQuery.data?.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Devices</label>
            <select
              multiple
              value={deviceFilter}
              onChange={(event) => handleMultiSelectChange(event, setDeviceFilter)}
              className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {filtersQuery.data?.devices.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(0);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Filters update results in real time. Use the multi-select fields to focus on specific actors or modules.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <DataTable
        title="Activity log"
        actions={
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-500">
              Rows per page
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        <thead className="bg-slate-50">
          <tr>
            <SortableColumnHeader
              label="Timestamp"
              field="timestamp"
              currentField={sort.field}
              direction={sort.direction}
              onSort={handleSort}
            />
            <SortableColumnHeader
              label="User"
              field="user"
              currentField={sort.field}
              direction={sort.direction}
              onSort={handleSort}
            />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role / Department</th>
            <SortableColumnHeader
              label="Module"
              field="module"
              currentField={sort.field}
              direction={sort.direction}
              onSort={handleSort}
            />
            <SortableColumnHeader
              label="Activity Type"
              field="activityType"
              currentField={sort.field}
              direction={sort.direction}
              onSort={handleSort}
            />
            <SortableColumnHeader
              label="Status"
              field="status"
              currentField={sort.field}
              direction={sort.direction}
              onSort={handleSort}
              align="center"
            />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">IP Address</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Device</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading && (
            <tr>
              <td colSpan={9} className="px-6 py-6 text-center text-sm text-slate-500">
                Loading activity records…
              </td>
            </tr>
          )}
          {!isLoading && hasError && (
            <tr>
              <td colSpan={9} className="px-6 py-6 text-center text-sm text-rose-500">
                {errorMessage}
              </td>
            </tr>
          )}
          {!isLoading && !hasError && activities.length === 0 && (
            <tr>
              <td colSpan={9} className="px-6 py-6 text-center text-sm text-slate-500">
                No activity records found for the selected filters.
              </td>
            </tr>
          )}
          {!isLoading && !hasError &&
            activities.map((activity) => (
              <tr
                key={activity.id}
                onClick={() => navigate(`/activity/${activity.id}`)}
                className="cursor-pointer transition hover:bg-slate-50"
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                  {formatDateTime(activity.occurredAt)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{activity.userName}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  <div className="font-medium text-slate-700">{activity.userRole ?? '—'}</div>
                  <div>{activity.department ?? '—'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{activity.module ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{activity.activityType}</td>
                <td className="px-4 py-3 text-center">{renderStatusBadge(activity.status)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{activity.ipAddress ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{activity.device ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  <div className="max-w-xs truncate" title={activity.description ?? undefined}>
                    {activity.description ?? '—'}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </DataTable>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-slate-600">
          Showing <span className="font-semibold text-slate-800">{from}</span> to{' '}
          <span className="font-semibold text-slate-800">{to}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalElements}</span> activity records
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={page === 0}
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page <span className="font-semibold text-slate-700">{page + 1}</span> of{' '}
            <span className="font-semibold text-slate-700">{Math.max(totalPages, 1)}</span>
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={page + 1 >= totalPages}
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
