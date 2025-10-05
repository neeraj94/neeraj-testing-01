import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Pagination, Permission, Role } from '../types/models';
import type { PermissionKey } from '../types/auth';

type PanelView = 'overview' | 'create';

type CapabilitySlot =
  | 'viewOwn'
  | 'viewGlobal'
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'manage'
  | 'assign';

type PermissionOption = {
  id: number;
  key: string;
  label: string;
};

type PermissionGroup = {
  feature: string;
  slots: Partial<Record<CapabilitySlot, PermissionOption>>;
  extras: PermissionOption[];
};

type ToggleOptions = {
  deselect?: number[];
  select?: number[];
};

const CAPABILITY_COLUMNS: Array<{ slot: CapabilitySlot; label: string }> = [
  { slot: 'viewOwn', label: 'View (Own)' },
  { slot: 'viewGlobal', label: 'View (Global)' },
  { slot: 'view', label: 'View' },
  { slot: 'create', label: 'Create' },
  { slot: 'edit', label: 'Edit' },
  { slot: 'delete', label: 'Delete' },
  { slot: 'export', label: 'Export' },
  { slot: 'manage', label: 'Manage' },
  { slot: 'assign', label: 'Assign' }
];

const CAPABILITY_PATTERNS: Array<{ slot: CapabilitySlot; regex: RegExp }> = [
  { slot: 'viewGlobal', regex: /_VIEW_GLOBAL$/i },
  { slot: 'viewOwn', regex: /_VIEW_OWN$/i },
  { slot: 'view', regex: /_VIEW$/i },
  { slot: 'create', regex: /_CREATE$/i },
  { slot: 'edit', regex: /_EDIT$/i },
  { slot: 'edit', regex: /_UPDATE$/i },
  { slot: 'delete', regex: /_DELETE$/i },
  { slot: 'export', regex: /_EXPORT$/i },
  { slot: 'manage', regex: /_MANAGE$/i },
  { slot: 'assign', regex: /_ASSIGN$/i }
];

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

const formatFeatureName = (value: string) =>
  value
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((segment) => (segment.length <= 3 ? segment.toUpperCase() : segment.charAt(0).toUpperCase() + segment.substring(1).toLowerCase()))
    .join(' ');

const stripCapabilitySuffix = (key: string) => {
  for (const pattern of CAPABILITY_PATTERNS) {
    if (pattern.regex.test(key)) {
      return key.replace(pattern.regex, '');
    }
  }
  return key;
};

const parsePermissionLabel = (permission: Permission) => {
  const name = permission.name?.trim() ?? '';
  const separators = [':', ' - ', ' – ', ' — ', '|'];

  for (const separator of separators) {
    if (name.includes(separator)) {
      const [featureRaw, ...rest] = name.split(separator);
      const feature = formatFeatureName(featureRaw);
      const label = rest.join(separator).trim();
      if (feature && label) {
        return { feature, label: label || permission.key };
      }
    }
  }

  if (name) {
    const words = name.split(/\s+/g).filter(Boolean);
    if (words.length > 1) {
      const verbs = new Set(['view', 'create', 'update', 'edit', 'delete', 'manage', 'assign', 'export']);
      const [first, ...rest] = words;
      if (verbs.has(first.toLowerCase())) {
        return { feature: formatFeatureName(rest.join(' ')), label: name };
      }
    }
    return { feature: formatFeatureName(name), label: name };
  }

  const baseKey = stripCapabilitySuffix(permission.key);
  const feature = formatFeatureName(baseKey || permission.key);
  const label = permission.name?.trim() ?? toTitleCase(permission.key.replace(/_/g, ' '));
  return { feature, label };
};

const buildPermissionGroups = (permissions: Permission[]): PermissionGroup[] => {
  const map = new Map<string, PermissionGroup>();

  permissions.forEach((permission) => {
    const { feature, label } = parsePermissionLabel(permission);
    const key = feature || 'General';
    const existing = map.get(key);
    const entry: PermissionGroup = existing ?? { feature: key, slots: {}, extras: [] };

    let matchedSlot: CapabilitySlot | null = null;
    for (const pattern of CAPABILITY_PATTERNS) {
      if (pattern.regex.test(permission.key)) {
        matchedSlot = pattern.slot;
        break;
      }
    }

    const option: PermissionOption = {
      id: permission.id,
      key: permission.key,
      label: label || permission.name || permission.key
    };

    if (matchedSlot) {
      if (!entry.slots[matchedSlot]) {
        entry.slots[matchedSlot] = option;
      } else {
        entry.extras.push(option);
      }
    } else {
      entry.extras.push(option);
    }

    map.set(key, entry);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      extras: group.extras.sort((a, b) => a.label.localeCompare(b.label))
    }))
    .sort((a, b) => a.feature.localeCompare(b.feature));
};

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

  const visibleColumns = CAPABILITY_COLUMNS.filter((column) =>
    groups.some((group) => Boolean(group.slots[column.slot]))
  );
  const showExtras = groups.some((group) => group.extras.length > 0);
  const selectedSet = new Set(selected);

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
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Other</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {groups.map((group) => {
            const viewGlobalId = group.slots.viewGlobal?.id;
            const viewOwnId = group.slots.viewOwn?.id;
            const viewGlobalSelected = viewGlobalId ? selectedSet.has(viewGlobalId) : false;

            return (
              <tr key={group.feature}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">{group.feature}</td>
                {visibleColumns.map((column) => {
                  const option = group.slots[column.slot];
                  if (!option) {
                    return (
                      <td key={column.slot} className="px-6 py-4 text-center text-xs text-slate-300">
                        —
                      </td>
                    );
                  }

                  const checked = selectedSet.has(option.id);
                  const disableOwn = column.slot === 'viewOwn' && viewGlobalSelected;

                  return (
                    <td key={column.slot} className="px-6 py-4 text-center">
                      <label className="inline-flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
                          checked={checked}
                          disabled={disableOwn}
                          onChange={(event) =>
                            onToggle(option.id, event.target.checked, {
                              deselect:
                                event.target.checked && column.slot === 'viewGlobal' && viewOwnId
                                  ? [viewOwnId]
                                  : undefined
                            })
                          }
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
                          const checked = selectedSet.has(option.id);
                          return (
                            <label
                              key={option.id}
                              className="flex items-start gap-3 rounded-md border border-slate-200 p-3 transition hover:border-slate-300"
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                checked={checked}
                                onChange={(event) => onToggle(option.id, event.target.checked)}
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
        </tbody>
      </table>
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

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
      clipRule="evenodd"
    />
  </svg>
);

const RolesPage = () => {
  const [activePanel, setActivePanel] = useState<PanelView>('overview');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editForm, setEditForm] = useState({ name: '', key: '' });
  const [editingPermissions, setEditingPermissions] = useState<number[]>([]);

  const {
    data: rolesResponse,
    isLoading: isLoadingRoles,
    refetch: refetchRoles
  } = useQuery<Pagination<Role>>({
    queryKey: ['roles', page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Role>>(`/roles?page=${page}&size=${pageSize}`);
      return data;
    }
  });

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['permissions', 'options'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Permission>>('/permissions?size=200');
      return data.content;
    }
  });

  const permissionGroups = useMemo(() => buildPermissionGroups(permissions), [permissions]);
  const permissionLookup = useMemo(() => {
    const lookup = new Map<string, Permission>();
    permissions.forEach((permission) => lookup.set(permission.key, permission));
    return lookup;
  }, [permissions]);

  useEffect(() => {
    if (editingRole) {
      setEditForm({ name: editingRole.name, key: editingRole.key });
      if (permissions.length) {
        const ids = permissions
          .filter((permission) =>
            editingRole.permissions.includes(permission.key as PermissionKey)
          )
          .map((permission) => permission.id);
        setEditingPermissions(ids);
      } else {
        setEditingPermissions([]);
      }
    }
  }, [editingRole, permissions]);

  useEffect(() => {
    if (!keyTouched) {
      setRoleKey(formatRoleKey(roleName));
    }
  }, [roleName, keyTouched]);

  const roles = rolesResponse?.content ?? [];
  const totalElements = rolesResponse?.totalElements ?? roles.length;
  const totalPages = rolesResponse?.totalPages ?? 1;

  useEffect(() => {
    if (!rolesResponse) {
      return;
    }

    const pages = rolesResponse.totalPages;
    if (pages === 0 && page !== 0) {
      setPage(0);
      return;
    }

    if (pages > 0 && page >= pages) {
      setPage(pages - 1);
    }
  }, [rolesResponse, page]);

  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) {
      return roles;
    }

    const term = searchTerm.trim().toLowerCase();
    return roles.filter((role) => {
      const permissionMatches = role.permissions.some((permissionKey) =>
        (permissionLookup.get(permissionKey)?.name ?? permissionKey).toLowerCase().includes(term)
      );
      return (
        role.name.toLowerCase().includes(term) ||
        role.key.toLowerCase().includes(term) ||
        permissionMatches
      );
    });
  }, [roles, searchTerm, permissionLookup]);

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

  const handleExport = () => {
    if (typeof window === 'undefined' || !roles.length) {
      return;
    }

    const exportData = roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      permissions: role.permissions
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'roles.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const createRole = useMutation({
    mutationFn: async (payload: { key: string; name: string; permissionIds: number[] }) => {
      const { data } = await api.post<Role>('/roles', { key: payload.key, name: payload.name });
      if (payload.permissionIds.length) {
        await api.post(`/roles/${data.id}/permissions`, { permissionIds: payload.permissionIds });
      }
      return data;
    },
    onSuccess: () => {
      setRoleName('');
      setRoleKey('');
      setKeyTouched(false);
      setRolePermissions([]);
      setActivePanel('overview');
      refetchRoles();
    }
  });

  const updateRole = useMutation({
    mutationFn: async (payload: { id: number; key: string; name: string; permissionIds: number[] }) => {
      await api.put(`/roles/${payload.id}`, { key: payload.key, name: payload.name });
      await api.post(`/roles/${payload.id}/permissions`, { permissionIds: payload.permissionIds });
    },
    onSuccess: () => {
      setEditingRole(null);
      refetchRoles();
    }
  });

  const deleteRole = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => refetchRoles()
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    const formattedKey = roleKey || formatRoleKey(roleName);
    const trimmedName = roleName.trim();
    if (!formattedKey || !trimmedName) {
      return;
    }

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
      return;
    }

    updateRole.mutate({
      id: editingRole.id,
      key: formatRoleKey(formattedKey),
      name: trimmedName,
      permissionIds: editingPermissions
    });
  };

  const handleDelete = (role: Role) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete the role “${role.name}”?`);
      if (!confirmed) {
        return;
      }
    }
    deleteRole.mutate(role.id);
  };

  const overviewActions = (
    <div className="flex items-center gap-2">
      <select
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600"
        value={pageSize}
        onChange={(event) => {
          setPageSize(Number(event.target.value));
          setPage(0);
        }}
      >
        {[10, 25, 50, 100].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleExport}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
      >
        Export
      </button>
      <button
        type="button"
        onClick={() => setActivePanel('create')}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
      >
        + New Role
      </button>
    </div>
  );

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

  return (
    <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
      <aside className="h-fit rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Access library</h2>
          <p className="text-sm text-slate-500">Manage reusable roles and permission bundles.</p>
        </div>
        <nav className="px-2 py-3">
          {[
            { id: 'overview' as PanelView, label: 'Roles', description: 'View and organize existing roles.' },
            { id: 'create' as PanelView, label: 'Create role', description: 'Design a new role and assign permissions.' }
          ].map((item) => {
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePanel(item.id)}
                className={`w-full rounded-lg px-4 py-3 text-left transition ${
                  isActive ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-xs text-slate-500">{item.description}</div>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="space-y-6">
        {activePanel === 'overview' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">Role directory</h1>
              <p className="mt-1 text-sm text-slate-500">
                Browse configured roles, review the permissions they grant, and keep your access model organised.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by role name, key, or permission"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <DataTable title="Roles" actions={overviewActions}>
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Options</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRoles ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                      Loading roles...
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                      No roles match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={role.id} className="border-t border-slate-200">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800">{role.name}</div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">{role.key}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">{renderPermissionSummary(role)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingRole(role)}
                            className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                          >
                            <PencilIcon /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(role)}
                            className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:border-red-300 hover:text-red-700"
                            disabled={deleteRole.isPending}
                          >
                            <TrashIcon /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-3 py-3">
                    <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Showing {filteredRoles.length} of {totalElements} role{totalElements === 1 ? '' : 's'}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                          className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          disabled={page === 0}
                        >
                          Previous
                        </button>
                        <span>
                          Page {page + 1} of {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
                          className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          disabled={page + 1 >= totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </DataTable>
          </div>
        )}

        {activePanel === 'create' && (
          <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Add new role</h2>
                <p className="text-sm text-slate-500">Name the role and select the exact permissions it should grant.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActivePanel('overview');
                    setRoleName('');
                    setRoleKey('');
                    setRolePermissions([]);
                    setKeyTouched(false);
                  }}
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

            {createRole.isError && (
              <div className="mx-6 mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                {getErrorMessage(createRole.error)}
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

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h3 className="text-base font-semibold text-slate-800">Permission catalogue</h3>
                  <p className="text-sm text-slate-500">Select the features and capabilities that this role should unlock.</p>
                </div>
                <PermissionMatrix
                  groups={permissionGroups}
                  selected={rolePermissions}
                  onToggle={(id, checked, options) => togglePermission(id, checked, setRolePermissions, options)}
                />
              </div>
            </div>
          </form>
        )}
      </section>

      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10">
          <form onSubmit={handleUpdate} className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Edit role</h3>
                <p className="text-sm text-slate-500">Update the details and permissions assigned to this role.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <CloseIcon />
              </button>
            </div>

            {updateRole.isError && (
              <div className="mx-6 mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                {getErrorMessage(updateRole.error)}
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

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h4 className="text-base font-semibold text-slate-800">Permissions</h4>
                  <p className="text-sm text-slate-500">Adjust the capabilities granted to this role.</p>
                </div>
                <PermissionMatrix
                  groups={permissionGroups}
                  selected={editingPermissions}
                  onToggle={(id, checked, options) => togglePermission(id, checked, setEditingPermissions, options)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingRole(null)}
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
          </form>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
