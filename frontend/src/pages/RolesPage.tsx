import { Dispatch, FormEvent, Fragment, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import api from '../services/http';
import type { Pagination, Permission, Role } from '../types/models';
import type { PermissionKey } from '../types/auth';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import {
  CAPABILITY_COLUMNS,
  PERMISSION_AUDIENCE_HEADERS,
  PERMISSION_AUDIENCE_ORDER,
  type PermissionGroup,
  type PermissionOption,
  buildPermissionGroups
} from '../utils/permissionGroups';
import SortableColumnHeader from '../components/SortableColumnHeader';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import ExportMenu from '../components/ExportMenu';
import { exportDataset, type ExportFormat } from '../utils/exporters';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';

const CUSTOMER_ROLE_KEY = 'CUSTOMER';

type DirectoryView = 'list' | 'create' | 'edit';

type ToggleOptions = {
  deselect?: number[];
  select?: number[];
};

type RoleSortField = 'name' | 'key' | 'audience' | 'permissionCount';

const formatRoleKey = (value: string) =>
  value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase());

const getErrorMessage = (error: unknown) => {
  if (!error) {
    return 'Something went wrong while processing the request.';
  }

  const axiosError = error as AxiosError<{ message?: string; error?: string }>;
  const responseMessage = axiosError?.response?.data?.message ?? axiosError?.response?.data?.error;
  if (responseMessage) {
    return responseMessage;
  }

  if (axiosError?.message) {
    return axiosError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while processing the request.';
};

const isCustomerRole = (role: Role) => role.key.toUpperCase() === CUSTOMER_ROLE_KEY;

const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

const PermissionMatrix = ({
  groups,
  selected,
  onToggle
}: {
  groups: PermissionGroup[];
  selected: number[];
  onToggle: (permissionId: number, checked: boolean, options?: ToggleOptions) => void;
}) => {
  if (!groups.length) {
    return (
      <div className="px-6 py-8 text-center text-sm text-slate-500">
        No permissions have been published yet.
      </div>
    );
  }

  const visibleColumns = CAPABILITY_COLUMNS;
  const showExtras = groups.some((group) => group.extras.length > 0);
  const selectedSet = new Set(selected);
  const colSpan = 1 + visibleColumns.length + (showExtras ? 1 : 0);

  const grouped = PERMISSION_AUDIENCE_ORDER.map((audience) => ({
    audience,
    title: PERMISSION_AUDIENCE_HEADERS[audience],
    rows: groups.filter((group) => group.category === audience)
  })).filter((entry) => entry.rows.length > 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Feature
            </th>
            {visibleColumns.map((column) => (
              <th
                key={column.slot}
                className="whitespace-nowrap px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column.label}
              </th>
            ))}
            {showExtras && (
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Additional
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {grouped.map((section) => (
            <Fragment key={section.audience}>
              <tr className="bg-slate-100">
                <td colSpan={colSpan} className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.title}
                </td>
              </tr>
              {section.rows.map((group) => {
                const viewGlobalId = group.slots.viewGlobal?.id;
                const viewOwnId = group.slots.viewOwn?.id;
                const viewGlobalSelected = viewGlobalId ? selectedSet.has(viewGlobalId) : false;
                const isPublicSection = section.audience === 'public';

                return (
                  <tr key={`${section.audience}-${group.feature}`}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">
                      {group.feature}
                      {isPublicSection && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Default
                        </span>
                      )}
                    </td>
                    {visibleColumns.map((column) => {
                      const option = group.slots[column.slot];
                      if (!option) {
                        return (
                          <td key={column.slot} className="px-6 py-4 text-center text-xs text-slate-300">
                            —
                          </td>
                        );
                      }

                      const checked = isPublicSection ? true : selectedSet.has(option.id);
                      const disableOwn = column.slot === 'viewOwn' && viewGlobalSelected;
                      const disabled = isPublicSection || disableOwn;

                      return (
                        <td key={column.slot} className="px-6 py-4 text-center">
                          <label className="inline-flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
                              checked={checked}
                              disabled={disabled}
                              onChange={(event) => {
                                if (isPublicSection) {
                                  return;
                                }
                                onToggle(option.id, event.target.checked, {
                                  deselect:
                                    event.target.checked && column.slot === 'viewGlobal' && viewOwnId
                                      ? [viewOwnId]
                                      : undefined
                                });
                              }}
                            />
                            <span className="sr-only">{`${group.feature} – ${column.label}`}</span>
                          </label>
                        </td>
                      );
                    })}
                    {showExtras && (
                      <td className="px-6 py-4">
                        {group.extras.length ? (
                          <div className="space-y-2">
                            {group.extras.map((option) => {
                              const checked = isPublicSection ? true : selectedSet.has(option.id);
                              return (
                                <label
                                  key={option.id}
                                  className="flex items-start gap-3 rounded-md border border-slate-200 p-3 transition hover:border-slate-300"
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
                                    checked={checked}
                                    disabled={isPublicSection}
                                    onChange={(event) => {
                                      if (isPublicSection) {
                                        return;
                                      }
                                      onToggle(option.id, event.target.checked);
                                    }}
                                  />
                                  <span className="text-sm text-slate-600">
                                    <span className="block font-medium text-slate-700">{option.label}</span>
                                    <span className="text-xs uppercase tracking-wide text-slate-400">{option.key}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="block text-center text-xs text-slate-300">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DefaultPermissionSection = ({ groups }: { groups: PermissionGroup[] }) => {
  if (!groups.length) {
    return (
      <div className="px-6 py-6 text-sm text-slate-500">All default user permissions are currently hidden.</div>
    );
  }

  return (
    <div className="space-y-4 px-6 py-6">
      {groups.map((group) => {
        const slotOptions = Object.values(group.slots).filter(Boolean) as PermissionOption[];
        const extras = group.extras ?? [];
        const allOptions = [...slotOptions, ...extras];

        return (
          <div key={group.feature} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">{group.feature}</h4>
                <p className="text-xs text-slate-500">
                  These capabilities are always granted to authenticated customers and cannot be disabled.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Default
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {allOptions.map((option) => (
                <div
                  key={option.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                >
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    ✓
                  </span>
                  <div className="text-sm text-slate-600">
                    <span className="block font-medium text-slate-800">{option.label}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-400">{option.key}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
  </svg>
);

const TrashIcon = () => (
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
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 7V4h6v3m2 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7h12Z"
    />
  </svg>
);

const RolesPage = () => {
  const { notify } = useToast();
  const confirm = useConfirm();
  const { permissions: authPermissions } = useAppSelector((state) => state.auth);
  const grantedPermissions = (authPermissions ?? []) as PermissionKey[];
  const canExportRoles = useMemo(
    () => hasAnyPermission(grantedPermissions, ['ROLES_EXPORT']),
    [grantedPermissions]
  );

  const [view, setView] = useState<DirectoryView>('list');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'internal' | 'customer'>('all');
  const [permissionFilter, setPermissionFilter] = useState<'all' | 'with' | 'without'>('all');
  const [roleName, setRoleName] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [sort, setSort] = useState<{ field: RoleSortField; direction: 'asc' | 'desc' }>({
    field: 'name',
    direction: 'asc'
  });
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editForm, setEditForm] = useState({ name: '', key: '' });
  const [editingPermissions, setEditingPermissions] = useState<number[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const openRoleForEditing = useCallback(
    (role: Role) => {
      setEditingRole(role);
      setView('edit');
      setEditError(null);
    },
    [setEditError, setEditingRole, setView]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchDraft.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setPage(0);
  }, [pageSize, typeFilter, permissionFilter, searchTerm, sort.field, sort.direction]);

  useEffect(() => {
    if (!keyTouched) {
      setRoleKey(formatRoleKey(roleName));
    }
  }, [roleName, keyTouched]);

  const rolesResponse = useQuery<Pagination<Role>>({
    queryKey: ['roles', page, pageSize, sort.field, sort.direction],
    queryFn: async () => {
      const serverSortField = sort.field === 'key' ? 'key' : 'name';
      const direction = serverSortField === sort.field ? sort.direction : 'asc';
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
        sort: serverSortField,
        direction
      });
      const { data } = await api.get<Pagination<Role>>(`/roles?${params.toString()}`);
      return data;
    }
  });

  const {
    data: permissions = []
  } = useQuery<Permission[]>({
    queryKey: ['permissions', 'options'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Permission>>('/permissions?size=500');
      return data.content;
    }
  });

  const permissionGroups = useMemo(() => buildPermissionGroups(permissions), [permissions]);
  const adminPermissionGroups = useMemo(
    () => permissionGroups.filter((group) => group.category === 'admin'),
    [permissionGroups]
  );
  const defaultPermissionGroups = useMemo(
    () => permissionGroups.filter((group) => group.category === 'public'),
    [permissionGroups]
  );
  const permissionLookup = useMemo(() => {
    const lookup = new Map<string, Permission>();
    permissions.forEach((permission) => lookup.set(permission.key, permission));
    return lookup;
  }, [permissions]);

  const roles = rolesResponse.data?.content ?? [];
  const totalElements = rolesResponse.data?.totalElements ?? roles.length;
  const totalPages = rolesResponse.data?.totalPages ?? 1;

  useEffect(() => {
    if (!rolesResponse.data) {
      return;
    }
    const pages = rolesResponse.data.totalPages;
    if (pages === 0 && page !== 0) {
      setPage(0);
      return;
    }
    if (pages > 0 && page >= pages) {
      setPage(pages - 1);
    }
  }, [rolesResponse.data, page]);

  useEffect(() => {
    if (view === 'create') {
      setRoleName('');
      setRoleKey('');
      setKeyTouched(false);
      setRolePermissions([]);
      setCreateError(null);
    }
  }, [view]);

  useEffect(() => {
    if (!editingRole) {
      setEditForm({ name: '', key: '' });
      setEditingPermissions([]);
      return;
    }
    setEditForm({ name: editingRole.name, key: editingRole.key });
    if (permissions.length) {
      const ids = permissions
        .filter((permission) => editingRole.permissions.includes(permission.key as PermissionKey))
        .map((permission) => permission.id);
      setEditingPermissions(ids);
    } else {
      setEditingPermissions([]);
    }
  }, [editingRole, permissions]);

  const handleSortChange = (field: RoleSortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const applyRoleFilters = (list: Role[]) => {
    const term = searchTerm.toLowerCase();
    return list.filter((role) => {
      if (typeFilter === 'customer' && !isCustomerRole(role)) {
        return false;
      }
      if (typeFilter === 'internal' && isCustomerRole(role)) {
        return false;
      }
      if (permissionFilter === 'with' && role.permissions.length === 0) {
        return false;
      }
      if (permissionFilter === 'without' && role.permissions.length > 0) {
        return false;
      }
      if (!term) {
        return true;
      }
      const permissionMatches = role.permissions.some((permissionKey) =>
        (permissionLookup.get(permissionKey)?.name ?? permissionKey).toLowerCase().includes(term)
      );
      return (
        role.name.toLowerCase().includes(term) ||
        role.key.toLowerCase().includes(term) ||
        permissionMatches
      );
    });
  };

  const sortRolesList = (list: Role[]) => {
    const copy = [...list];
    const factor = sort.direction === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      switch (sort.field) {
        case 'key':
          return compareText(a.key, b.key) * factor;
        case 'audience': {
          const diff = (isCustomerRole(a) ? 1 : 0) - (isCustomerRole(b) ? 1 : 0);
          if (diff === 0) {
            return compareText(a.name, b.name) * factor;
          }
          return diff * factor;
        }
        case 'permissionCount': {
          const diff = a.permissions.length - b.permissions.length;
          if (diff === 0) {
            return compareText(a.name, b.name) * factor;
          }
          return diff * factor;
        }
        case 'name':
        default:
          return compareText(a.name, b.name) * factor;
      }
    });
    return copy;
  };

  const filteredRoles = useMemo(
    () => applyRoleFilters(roles),
    [roles, searchTerm, permissionLookup, typeFilter, permissionFilter]
  );

  const sortedRoles = useMemo(() => sortRolesList(filteredRoles), [filteredRoles, sort]);

  const fetchAllRoles = async (): Promise<Role[]> => {
    const serverSortField = sort.field === 'key' ? 'key' : 'name';
    const direction = serverSortField === sort.field ? sort.direction : 'asc';
    const size = 200;
    const baseParams: Record<string, unknown> = {
      size,
      sort: serverSortField,
      direction
    };
    const aggregated: Role[] = [];
    let pageIndex = 0;
    let totalPagesCount = 1;

    do {
      const params = { ...baseParams, page: pageIndex };
      const { data } = await api.get<Pagination<Role>>('/roles', { params });
      aggregated.push(...(data.content ?? []));
      totalPagesCount = data.totalPages ?? 1;
      pageIndex += 1;
      if (pageIndex >= totalPagesCount) {
        break;
      }
    } while (pageIndex < totalPagesCount && pageIndex < 50);

    return aggregated;
  };

  const handleExportRoles = async (format: ExportFormat) => {
    if (!canExportRoles || isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      const allRoles = await fetchAllRoles();
      const filtered = applyRoleFilters(allRoles);
      const sorted = sortRolesList(filtered);
      if (!sorted.length) {
        notify({ type: 'error', message: 'There are no roles to export for the current filters.' });
        return;
      }
      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'key', header: 'Key' },
        { key: 'audience', header: 'Audience' },
        { key: 'permissionCount', header: 'Permission Count' },
        { key: 'permissionList', header: 'Permission Keys' }
      ];
      const rows = sorted.map((role) => ({
        name: role.name,
        key: role.key,
        audience: isCustomerRole(role) ? 'Customer' : 'Internal',
        permissionCount: role.permissions.length,
        permissionList: role.permissions.length ? role.permissions.join(', ') : '—'
      }));
      exportDataset({
        format,
        columns,
        rows,
        fileName: 'roles',
        title: 'Roles'
      });
    } catch (error) {
      notify({ type: 'error', message: 'Unable to export roles. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const metrics = useMemo(() => {
    const customerCount = roles.filter(isCustomerRole).length;
    const withPermissions = roles.filter((role) => role.permissions.length > 0).length;
    const total = totalElements;
    const internalCount = Math.max(total - customerCount, 0);
    return { total, withPermissions, customerCount, internalCount };
  }, [roles, totalElements]);

  const togglePermission = (
    id: number,
    checked: boolean,
    setter: Dispatch<SetStateAction<number[]>>,
    options: ToggleOptions = {}
  ) => {
    setter((prev) => {
      let next = [...prev];

      if (checked) {
        if (!next.includes(id)) {
          next.push(id);
        }
      } else {
        next = next.filter((permissionId) => permissionId !== id);
      }

      if (options.deselect?.length) {
        const deselectSet = new Set(options.deselect);
        next = next.filter((permissionId) => !deselectSet.has(permissionId));
      }

      if (options.select?.length) {
        const set = new Set(next);
        options.select.forEach((permissionId) => set.add(permissionId));
        next = Array.from(set);
      }

      return next;
    });
  };

  const { refetch: refetchRoles } = rolesResponse;

  const createRole = useMutation({
    mutationFn: async (payload: { key: string; name: string; permissionIds: number[] }) => {
      const { data } = await api.post<Role>('/roles', { key: payload.key, name: payload.name });
      if (payload.permissionIds.length) {
        await api.post(`/roles/${data.id}/permissions`, { permissionIds: payload.permissionIds });
      }
      return data;
    },
    onSuccess: () => {
      setView('list');
      setCreateError(null);
      refetchRoles();
      notify({ type: 'success', message: 'Role created successfully.' });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setCreateError(message);
      notify({ type: 'error', message });
    }
  });

  const updateRole = useMutation({
    mutationFn: async (payload: { id: number; key: string; name: string; permissionIds: number[] }) => {
      await api.put(`/roles/${payload.id}`, { key: payload.key, name: payload.name });
      await api.post(`/roles/${payload.id}/permissions`, { permissionIds: payload.permissionIds });
    },
    onSuccess: () => {
      setEditingRole(null);
      setView('list');
      setEditError(null);
      refetchRoles();
      notify({ type: 'success', message: 'Role updated successfully.' });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setEditError(message);
      notify({ type: 'error', message });
    }
  });

  const deleteRole = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      if (editingRole) {
        setEditingRole(null);
        setView('list');
      }
      refetchRoles();
      notify({ type: 'success', message: 'Role deleted.' });
    },
    onError: (error) => {
      notify({ type: 'error', message: getErrorMessage(error) });
    }
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    const formattedKey = roleKey || formatRoleKey(roleName);
    const trimmedName = roleName.trim();
    if (!formattedKey || !trimmedName) {
      setCreateError('Role name and key are required.');
      notify({ type: 'error', message: 'Role name and key are required.' });
      return;
    }

    setCreateError(null);
    createRole.mutate({ key: formattedKey, name: trimmedName, permissionIds: rolePermissions });
  };

  const handleUpdate = (event: FormEvent) => {
    event.preventDefault();
    if (!editingRole) {
      return;
    }
    const formattedKey = editForm.key || editingRole.key;
    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditError('Role name is required.');
      notify({ type: 'error', message: 'Role name is required.' });
      return;
    }
    setEditError(null);
    updateRole.mutate({
      id: editingRole.id,
      key: formatRoleKey(formattedKey),
      name: trimmedName,
      permissionIds: editingPermissions
    });
  };

  const handleDelete = async (role: Role) => {
    const confirmed = await confirm({
      title: 'Delete role?',
      description: `Delete the role “${role.name}”?`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteRole.mutateAsync(role.id);
  };

  const renderPermissionSummary = (role: Role) => {
    if (!role.permissions.length) {
      return 'No permissions yet';
    }
    const labels = role.permissions.map((permissionKey) => {
      const permission = permissionLookup.get(permissionKey);
      if (permission?.name) {
        return permission.name;
      }
      return toTitleCase(permissionKey.toLowerCase());
    });

    if (labels.length <= 3) {
      return labels.join(', ');
    }

    return `${labels.slice(0, 3).join(', ')} +${labels.length - 3} more`;
  };

  const renderSummaryCards = () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total roles</p>
        <p className="mt-2 text-3xl font-semibold text-slate-800">{metrics.total}</p>
        <p className="mt-1 text-xs text-slate-500">Across internal teams and customer accounts.</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Assignable</p>
        <p className="mt-2 text-3xl font-semibold text-emerald-700">{metrics.withPermissions}</p>
        <p className="mt-1 text-xs text-emerald-600">Roles that currently grant at least one permission.</p>
      </div>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Internal</p>
        <p className="mt-2 text-3xl font-semibold text-indigo-700">{metrics.internalCount}</p>
        <p className="mt-1 text-xs text-indigo-600">Designed for internal staff and operations.</p>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Customer</p>
        <p className="mt-2 text-3xl font-semibold text-blue-700">{metrics.customerCount}</p>
        <p className="mt-1 text-xs text-blue-600">Shared with customer-facing collaborators.</p>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-end">
      <div className="flex-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search by role name, key, or permission"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:flex lg:items-end lg:gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</label>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All</option>
            <option value="internal">Internal</option>
            <option value="customer">Customer</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permissions</label>
          <select
            value={permissionFilter}
            onChange={(event) => setPermissionFilter(event.target.value as typeof permissionFilter)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All</option>
            <option value="with">Has permissions</option>
            <option value="without">No permissions</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderTable = () => {
    const total = rolesResponse.data?.totalElements ?? sortedRoles.length;
    return (
      <PageSection padded={false} bodyClassName="flex flex-col">
        {renderFilters()}
        <div className="flex-1 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
              <SortableColumnHeader
                label="Role"
                field="name"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <SortableColumnHeader
                label="Key"
                field="key"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <SortableColumnHeader
                label="Audience"
                field="audience"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <SortableColumnHeader
                label="Permissions"
                field="permissionCount"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rolesResponse.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading roles…
                </td>
              </tr>
            ) : sortedRoles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No roles match the current filters.
                </td>
              </tr>
            ) : (
              sortedRoles.map((role) => {
                const isActive = view === 'edit' && editingRole?.id === role.id;
                return (
                  <tr
                    key={role.id}
                    onClick={() => openRoleForEditing(role)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openRoleForEditing(role);
                      }
                    }}
                    tabIndex={0}
                    className={`cursor-pointer transition hover:bg-blue-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                      isActive ? 'bg-blue-50/60' : ''
                    }`}
                  >
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-800">{role.name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{role.key}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{isCustomerRole(role) ? 'Customer' : 'Internal'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{renderPermissionSummary(role)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRoleForEditing(role);
                        }}
                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                        aria-label={`Edit ${role.name}`}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(role);
                        }}
                        className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                        aria-label={`Delete ${role.name}`}
                        disabled={deleteRole.isPending}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalElements={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          isLoading={rolesResponse.isLoading}
        />
      </PageSection>
    );
  };

  const isListView = view === 'list';
  const isCreateView = view === 'create';
  const isEditView = view === 'edit';

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Roles"
        description="Design and manage reusable permission bundles to keep access aligned with your operating model."
        actions={
          isListView ? (
            <>
              {canExportRoles && (
                <ExportMenu
                  onSelect={handleExportRoles}
                  disabled={rolesResponse.isLoading}
                  isBusy={isExporting}
                />
              )}
              <button
                type="button"
                onClick={() => setView('create')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  className="h-4 w-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
                New role
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setView('list');
                setEditingRole(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Back to roles
            </button>
          )
        }
      />

      {isListView ? (
        <>
          {renderSummaryCards()}
          {renderTable()}
        </>
      ) : isCreateView ? (
        <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Create role</h2>
              <p className="text-sm text-slate-500">Give the role a friendly name and choose the permissions it should grant.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={createRole.isPending}
              >
                {createRole.isPending ? 'Saving…' : 'Save role'}
              </button>
            </div>
          </div>

          {(createError || createRole.isError) && (
            <div className="mx-6 mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
              {createError ?? getErrorMessage(createRole.error)}
            </div>
          )}

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Role name</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  placeholder="e.g. Sales Manager"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Role key</label>
                <input
                  type="text"
                  value={roleKey}
                  onChange={(event) => {
                    setRoleKey(formatRoleKey(event.target.value));
                    setKeyTouched(true);
                  }}
                  placeholder="SALES_MANAGER"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-slate-500">This identifier must be unique and is used by the API.</p>
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h3 className="text-base font-semibold text-slate-800">Admin &amp; system permissions</h3>
                  <p className="text-sm text-slate-500">
                    Select the administrative features and management capabilities that this role should unlock.
                  </p>
                </div>
                <PermissionMatrix
                  groups={adminPermissionGroups}
                  selected={rolePermissions}
                  onToggle={(id, checked, options) => togglePermission(id, checked, setRolePermissions, options)}
                />
              </section>
              <section className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h3 className="text-base font-semibold text-slate-800">Default user permissions</h3>
                  <p className="text-sm text-slate-500">
                    These capabilities are automatically assigned to every authenticated user and cannot be revoked.
                  </p>
                </div>
                <DefaultPermissionSection groups={defaultPermissionGroups} />
              </section>
            </div>
          </div>
        </form>
      ) : isEditView && editingRole ? (
        <form onSubmit={handleUpdate} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Edit {editingRole.name}</h2>
              <p className="text-sm text-slate-500">Update the role details and adjust the permissions it grants.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingRole(null);
                  setView('list');
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={updateRole.isPending}
              >
                {updateRole.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>

          {(editError || updateRole.isError) && (
            <div className="mx-6 mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
              {editError ?? getErrorMessage(updateRole.error)}
            </div>
          )}

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Role name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Role key</label>
                <input
                  type="text"
                  value={editForm.key}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, key: formatRoleKey(event.target.value) }))}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h4 className="text-base font-semibold text-slate-800">Admin &amp; system permissions</h4>
                  <p className="text-sm text-slate-500">Update the administrative capabilities granted to this role.</p>
                </div>
                <PermissionMatrix
                  groups={adminPermissionGroups}
                  selected={editingPermissions}
                  onToggle={(id, checked, options) => togglePermission(id, checked, setEditingPermissions, options)}
                />
              </section>
              <section className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h4 className="text-base font-semibold text-slate-800">Default user permissions</h4>
                  <p className="text-sm text-slate-500">
                    These default capabilities remain active for every customer and cannot be modified per role.
                  </p>
                </div>
                <DefaultPermissionSection groups={defaultPermissionGroups} />
              </section>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
};

export default RolesPage;
