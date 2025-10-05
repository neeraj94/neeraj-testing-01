import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { Pagination, Permission, Role, User, UserSummaryMetrics } from '../types/models';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import { buildPermissionGroups, CAPABILITY_COLUMNS, type PermissionGroup } from '../utils/permissionGroups';
import { useAppSelector } from '../app/hooks';
import type { PermissionKey } from '../types/auth';
import { hasAnyPermission } from '../utils/permissions';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const CUSTOMER_ROLE_KEY = 'CUSTOMER';

const SLOT_LABELS = CAPABILITY_COLUMNS.reduce<Record<string, string>>((map, column) => {
  map[column.slot] = column.label;
  return map;
}, {});

type PanelMode = 'empty' | 'create' | 'detail';
type DetailTab = 'profile' | 'access';

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  active: boolean;
  roleIds: number[];
  directPermissions: string[];
};

const emptyForm: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  active: true,
  roleIds: [],
  directPermissions: []
};

const normalizePermissionKey = (value: string) => value.toUpperCase();

const isCustomerAccount = (user: User) =>
  user.roles.some((role) => role.toUpperCase() === CUSTOMER_ROLE_KEY);

const UsersPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { permissions: grantedPermissions } = useAppSelector((state) => state.auth);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'internal' | 'customer'>('all');
  const [panelMode, setPanelMode] = useState<PanelMode>('empty');
  const [activeTab, setActiveTab] = useState<DetailTab>('profile');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreateUser = useMemo(
    () => hasAnyPermission(grantedPermissions as PermissionKey[], ['USER_CREATE', 'CUSTOMER_CREATE']),
    [grantedPermissions]
  );
  const canManageUsers = useMemo(
    () => hasAnyPermission(grantedPermissions as PermissionKey[], ['USER_UPDATE', 'CUSTOMER_UPDATE']),
    [grantedPermissions]
  );
  const canDeleteUsers = useMemo(
    () => hasAnyPermission(grantedPermissions as PermissionKey[], ['USER_DELETE', 'CUSTOMER_DELETE']),
    [grantedPermissions]
  );

  useEffect(() => {
    setPage(0);
  }, [pageSize, statusFilter, audienceFilter]);

  useEffect(() => {
    if (panelMode === 'create') {
      setForm(emptyForm);
      setFormError(null);
      setActiveTab('profile');
      setSelectedUserId(null);
    }
  }, [panelMode]);

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles', 'options'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Role>>('/roles', { params: { size: 200 } });
      return data.content;
    }
  });

  const { data: permissionsCatalog = [] } = useQuery<Permission[]>({
    queryKey: ['permissions', 'catalogue'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Permission>>('/permissions', { params: { size: 500 } });
      return data.content;
    }
  });

  const permissionGroups = useMemo<PermissionGroup[]>(
    () => buildPermissionGroups(permissionsCatalog),
    [permissionsCatalog]
  );

  const permissionLookup = useMemo(() => {
    const map = new Map<string, Permission>();
    permissionsCatalog.forEach((permission) => map.set(permission.key.toUpperCase(), permission));
    return map;
  }, [permissionsCatalog]);

  const roleIdByKey = useMemo(() => {
    const map = new Map<string, number>();
    roles.forEach((role) => map.set(role.key.toUpperCase(), role.id));
    return map;
  }, [roles]);

  const summaryQuery = useQuery<UserSummaryMetrics>({
    queryKey: ['users', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<UserSummaryMetrics>('/users/summary');
      return data;
    }
  });

  const usersQuery = useQuery<Pagination<User>>({
    queryKey: ['users', 'list', { page, pageSize, searchTerm }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      const { data } = await api.get<Pagination<User>>('/users', { params });
      return data;
    },
    placeholderData: (previousData) => previousData
  });

  const selectedUserQuery = useQuery<User>({
    queryKey: ['users', 'detail', selectedUserId],
    queryFn: async () => {
      const { data } = await api.get<User>(`/users/${selectedUserId}`);
      return data;
    },
    enabled: panelMode === 'detail' && selectedUserId !== null
  });

  useEffect(() => {
    if (panelMode === 'detail' && selectedUserQuery.data) {
      const detail = selectedUserQuery.data;
      setForm({
        fullName: detail.fullName,
        email: detail.email,
        password: '',
        active: detail.active,
        roleIds: detail.roles
          .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
          .filter((value): value is number => typeof value === 'number'),
        directPermissions: (detail.directPermissions ?? []).map(normalizePermissionKey)
      });
      setFormError(null);
      setActiveTab('profile');
    }
  }, [panelMode, selectedUserQuery.data, roleIdByKey]);

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['users', 'summary'] });
  };

  const createUser = useMutation({
    mutationFn: async () => {
      const trimmedPassword = form.password.trim();
      if (trimmedPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      const { data } = await api.post<User>('/users', {
        email: form.email,
        fullName: form.fullName,
        password: trimmedPassword,
        active: form.active,
        roleIds: form.roleIds,
        permissionKeys: form.directPermissions
      });
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: 'User created successfully.' });
      invalidateUsers();
      setSelectedUserId(data.id);
      setPanelMode('detail');
      setActiveTab('profile');
      setForm({
        fullName: data.fullName,
        email: data.email,
        password: '',
        active: data.active,
        roleIds: data.roles
          .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
          .filter((value): value is number => typeof value === 'number'),
        directPermissions: (data.directPermissions ?? []).map(normalizePermissionKey)
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', data.id] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : extractErrorMessage(error, 'Unable to create user.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) {
        return null;
      }
      const trimmedPassword = form.password.trim();
      if (trimmedPassword && trimmedPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      const { data } = await api.put<User>(`/users/${selectedUserId}`, {
        email: form.email,
        fullName: form.fullName,
        active: form.active,
        password: trimmedPassword || undefined,
        roleIds: form.roleIds,
        permissionKeys: form.directPermissions
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data) {
        return;
      }
      notify({ type: 'success', message: 'User updated successfully.' });
      invalidateUsers();
      setForm({
        fullName: data.fullName,
        email: data.email,
        password: '',
        active: data.active,
        roleIds: data.roles
          .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
          .filter((value): value is number => typeof value === 'number'),
        directPermissions: (data.directPermissions ?? []).map(normalizePermissionKey)
      });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['users', 'detail', selectedUserId] });
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : extractErrorMessage(error, 'Unable to update user.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'User removed.' });
      invalidateUsers();
      setPanelMode('empty');
      setSelectedUserId(null);
      setForm(emptyForm);
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to delete user.') });
    }
  });

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSearchTerm(searchDraft.trim());
    setPage(0);
  };

  const handleFieldChange = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleRoleSelection = (roleId: number) => {
    setForm((prev) => {
      const exists = prev.roleIds.includes(roleId);
      return {
        ...prev,
        roleIds: exists ? prev.roleIds.filter((id) => id !== roleId) : [...prev.roleIds, roleId]
      };
    });
  };

  const toggleDirectPermission = (permissionKey: string, checked: boolean) => {
    const normalized = normalizePermissionKey(permissionKey);
    setForm((prev) => {
      const next = new Set(prev.directPermissions.map(normalizePermissionKey));
      if (checked) {
        next.add(normalized);
        if (/_VIEW_GLOBAL$/i.test(normalized)) {
          next.delete(normalized.replace(/_GLOBAL$/i, '_OWN'));
        }
      } else {
        next.delete(normalized);
      }
      return { ...prev, directPermissions: Array.from(next) };
    });
  };

  const clearPanel = () => {
    setPanelMode('empty');
    setSelectedUserId(null);
    setForm(emptyForm);
    setFormError(null);
    setActiveTab('profile');
  };

  const users: User[] = usersQuery.data?.content ?? [];
  const totalPages = usersQuery.data?.totalPages ?? 0;
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter === 'active' && !user.active) {
        return false;
      }
      if (statusFilter === 'inactive' && user.active) {
        return false;
      }
      if (audienceFilter === 'customer' && !isCustomerAccount(user)) {
        return false;
      }
      if (audienceFilter === 'internal' && isCustomerAccount(user)) {
        return false;
      }
      return true;
    });
  }, [users, statusFilter, audienceFilter]);

  const metrics = summaryQuery.data;
  const directPermissionSet = useMemo(
    () => new Set(form.directPermissions.map(normalizePermissionKey)),
    [form.directPermissions]
  );

  const effectivePermissions = useMemo(() => {
    if (panelMode === 'create') {
      return Array.from(new Set(form.directPermissions.map(normalizePermissionKey))).sort();
    }
    const inherited = selectedUserQuery.data?.permissions ?? [];
    const combined = new Set<string>();
    inherited.forEach((key) => combined.add(normalizePermissionKey(key)));
    form.directPermissions.forEach((key) => combined.add(normalizePermissionKey(key)));
    return Array.from(combined).sort();
  }, [panelMode, selectedUserQuery.data?.permissions, form.directPermissions]);

  const renderSummaryCards = () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total users</p>
        <p className="mt-2 text-3xl font-semibold text-slate-800">{metrics?.totalUsers ?? 0}</p>
        <p className="mt-1 text-xs text-slate-500">Across internal teams and customer accounts.</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Active</p>
        <p className="mt-2 text-3xl font-semibold text-emerald-700">{metrics?.activeUsers ?? 0}</p>
        <p className="mt-1 text-xs text-emerald-600">Users currently able to sign in.</p>
      </div>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Internal team</p>
        <p className="mt-2 text-3xl font-semibold text-indigo-700">{metrics?.internalUsers ?? 0}</p>
        <p className="mt-1 text-xs text-indigo-600">Members without the customer role.</p>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Customer accounts</p>
        <p className="mt-2 text-3xl font-semibold text-blue-700">{metrics?.customerUsers ?? 0}</p>
        <p className="mt-1 text-xs text-blue-600">Users holding the customer role.</p>
      </div>
    </div>
  );

  const renderFilters = () => (
    <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-end">
      <div className="flex-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search by name or email"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:flex lg:items-end lg:gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</label>
          <select
            value={audienceFilter}
            onChange={(event) => setAudienceFilter(event.target.value as typeof audienceFilter)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All users</option>
            <option value="internal">Internal</option>
            <option value="customer">Customers</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rows</label>
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
        >
          Apply
        </button>
      </div>
    </form>
  );

  const renderTable = () => (
    <div className="flex flex-col">
      {renderFilters()}
      <div className="flex-1 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Groups</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {usersQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading users…
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No users match the current filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = panelMode === 'detail' && selectedUserId === user.id;
                return (
                  <tr
                    key={user.id}
                    className={`cursor-pointer transition hover:bg-blue-50/40 ${
                      isSelected ? 'bg-blue-50/60' : ''
                    }`}
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setPanelMode('detail');
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      <div>{user.fullName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        {user.roles.map((role) => (
                          <span key={role} className="rounded-full bg-slate-100 px-2 py-1 font-semibold uppercase tracking-wide">
                            {role}
                          </span>
                        ))}
                        {user.roles.length === 0 && <span className="text-slate-400">No roles</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {isCustomerAccount(user) ? 'Customer' : 'Internal'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-500">
        <span>
          Page {totalPages === 0 ? 0 : page + 1} of {Math.max(totalPages, 1)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0 || usersQuery.isLoading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, Math.max(totalPages - 1, 0)))}
            disabled={page >= totalPages - 1 || usersQuery.isLoading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  const renderProfileTab = (isEditable: boolean, isCreate: boolean) => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-600">Full name</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => handleFieldChange('fullName', event.target.value)}
            required
            minLength={2}
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => handleFieldChange('email', event.target.value)}
            required
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(event) => handleFieldChange('password', event.target.value)}
            required={isCreate}
            minLength={isCreate ? 8 : 0}
            placeholder={isCreate ? 'At least 8 characters' : 'Leave blank to keep the current password'}
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
          <p className="mt-1 text-xs text-slate-500">Passwords must contain at least 8 characters.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Status</label>
          <select
            value={form.active ? 'true' : 'false'}
            onChange={(event) => handleFieldChange('active', event.target.value === 'true')}
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Customer accounts are represented as users holding the <span className="font-semibold">CUSTOMER</span> role. Assign or
        revoke that role here to control access.
      </div>
    </div>
  );

  const renderAccessTab = (isEditable: boolean) => (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Roles</h3>
        <p className="mt-1 text-xs text-slate-500">
          Roles supply the baseline permissions for each user. Grant the customer role to expose customer-only experiences.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {roles.map((role) => {
            const checked = form.roleIds.includes(role.id);
            return (
              <label
                key={role.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                  checked ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600'
                } ${isEditable ? 'hover:border-primary/60' : 'opacity-70'}`}
              >
                <span>
                  <span className="font-semibold text-slate-800">{role.name}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-slate-400">{role.key}</span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => toggleRoleSelection(role.id)}
                  disabled={!isEditable}
                />
              </label>
            );
          })}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Direct permission overrides</h3>
        <p className="mt-1 text-xs text-slate-500">
          Apply additional permissions to this user without altering the underlying role. Selecting “View (Global)” will
          automatically disable “View (Own)” for the same feature.
        </p>
        <div className="mt-4 space-y-4">
          {permissionGroups.map((group) => {
            const slotEntries = Object.entries(group.slots);
            const extras = group.extras;
            return (
              <div key={group.feature} className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="text-sm font-semibold text-slate-800">{group.feature}</h4>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {slotEntries.map(([slot, option]) => {
                    if (!option) {
                      return null;
                    }
                    const normalized = normalizePermissionKey(option.key);
                    const checked = directPermissionSet.has(normalized);
                    const disableOwn = /_VIEW_OWN$/i.test(normalized) &&
                      directPermissionSet.has(normalized.replace(/_OWN$/i, '_GLOBAL'));
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          checked ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600'
                        } ${!isEditable ? 'opacity-70' : 'hover:border-primary/60'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={checked}
                          disabled={!isEditable || disableOwn}
                          onChange={(event) => toggleDirectPermission(option.key, event.target.checked)}
                        />
                        <span>
                          <span className="block font-semibold text-slate-800">{SLOT_LABELS[slot] ?? option.label}</span>
                          <span className="text-xs uppercase tracking-wide text-slate-400">{option.key}</span>
                        </span>
                      </label>
                    );
                  })}
                  {extras.map((option) => {
                    const normalized = normalizePermissionKey(option.key);
                    const checked = directPermissionSet.has(normalized);
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          checked ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600'
                        } ${!isEditable ? 'opacity-70' : 'hover:border-primary/60'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={checked}
                          disabled={!isEditable}
                          onChange={(event) => toggleDirectPermission(option.key, event.target.checked)}
                        />
                        <span>
                          <span className="block font-semibold text-slate-800">{option.label}</span>
                          <span className="text-xs uppercase tracking-wide text-slate-400">{option.key}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-semibold text-slate-700">Effective permissions</h4>
        <p className="mt-1 text-xs text-slate-500">
          Includes role-derived permissions plus any direct overrides applied above.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {effectivePermissions.length === 0 ? (
            <span className="text-xs text-slate-400">No permissions selected yet.</span>
          ) : (
            effectivePermissions.map((permissionKey) => {
              const permission = permissionLookup.get(permissionKey);
              return (
                <span
                  key={permissionKey}
                  className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  {permission?.name ?? permissionKey}
                </span>
              );
            })
          )}
        </div>
      </section>
    </div>
  );

  const renderPanel = () => {
    const isCreate = panelMode === 'create';
    const isEditable = isCreate ? canCreateUser : canManageUsers;
    const isSaving = isCreate ? createUser.isPending : updateUser.isPending;
    const isLoadingDetail = panelMode === 'detail' && selectedUserQuery.isLoading;

    const headerTitle = isCreate
      ? 'Create user or customer'
      : selectedUserQuery.data?.fullName ?? 'Loading user…';
    const headerSubtitle = isCreate
      ? 'Provision access for an internal teammate or customer contact.'
      : selectedUserQuery.data?.email ?? '';

    return (
      <form
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isEditable) {
            return;
          }
          setFormError(null);
          if (isCreate) {
            createUser.mutate();
          } else {
            updateUser.mutate();
          }
        }}
      >
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={clearPanel}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary/40 hover:text-primary"
              aria-label="Back to user directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{isCreate ? 'New profile' : `#${selectedUserId ?? ''} Profile`}</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{headerTitle}</h2>
              {headerSubtitle && <p className="text-sm text-slate-500">{headerSubtitle}</p>}
            </div>
          </div>
          {!isCreate && selectedUserQuery.data && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold uppercase tracking-wide text-slate-600">
                <span className={`h-2 w-2 rounded-full ${selectedUserQuery.data.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {selectedUserQuery.data.active ? 'Active' : 'Inactive'}
              </span>
              {selectedUserQuery.data.roles.map((role) => (
                <span key={role} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold uppercase tracking-wide text-slate-600">
                  {role}
                </span>
              ))}
            </div>
          )}
        </header>
        <div className="grid gap-0 border-b border-slate-200 lg:grid-cols-[240px,1fr]">
          <nav className="flex shrink-0 flex-row gap-2 border-b border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 lg:flex-col lg:border-b-0 lg:border-r">
            {(
              [
                { key: 'profile', label: 'Profile details' },
                { key: 'access', label: 'Roles & permissions' }
              ] as Array<{ key: DetailTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-3 py-2 text-left transition ${
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 px-6 py-6">
            {isLoadingDetail ? (
              <p className="text-sm text-slate-500">Loading user details…</p>
            ) : activeTab === 'profile' ? (
              renderProfileTab(isEditable, isCreate)
            ) : (
              renderAccessTab(isEditable)
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          {formError ? (
            <p className="text-sm text-rose-600">{formError}</p>
          ) : (
            <span className="text-xs text-slate-500">
              Changes apply immediately after saving and will not modify the underlying role definitions.
            </span>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {panelMode === 'detail' && canDeleteUsers && selectedUserId && (
              <button
                type="button"
                onClick={() => deleteUser.mutate(selectedUserId)}
                disabled={deleteUser.isPending}
                className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteUser.isPending ? 'Removing…' : 'Remove user'}
              </button>
            )}
            {panelMode === 'detail' && selectedUserQuery.data && isEditable && (
              <button
                type="button"
                onClick={() => {
                  const detail = selectedUserQuery.data;
                  setForm({
                    fullName: detail.fullName,
                    email: detail.email,
                    password: '',
                    active: detail.active,
                    roleIds: detail.roles
                      .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
                      .filter((value): value is number => typeof value === 'number'),
                    directPermissions: (detail.directPermissions ?? []).map(normalizePermissionKey)
                  });
                  setFormError(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Reset changes
              </button>
            )}
            <button
              type="submit"
              disabled={!isEditable || isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreate ? (isSaving ? 'Creating…' : 'Create user') : isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </footer>
      </form>
    );
  };

  const isDirectoryView = panelMode === 'empty';

  return (
    <div className="flex min-h-full flex-col gap-6 px-6 py-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users &amp; customers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage internal teammates and customer contacts from a single, permission-aware workspace.
          </p>
        </div>
        {isDirectoryView && canCreateUser && (
          <button
            type="button"
            onClick={() => setPanelMode('create')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
            </svg>
            New user
          </button>
        )}
      </div>
      {isDirectoryView ? (
        <>
          {renderSummaryCards()}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">{renderTable()}</div>
        </>
      ) : (
        renderPanel()
      )}
    </div>
  );
};

export default UsersPage;
