import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Pagination, Role, User } from '../types/models';
import { useAppSelector } from '../app/hooks';
import type { PermissionKey } from '../types/auth';

const UsersPage = () => {
  const { permissions } = useAppSelector((state) => state.auth);
  const canCreate = (permissions as PermissionKey[]).includes('USER_CREATE');
  const canDelete = (permissions as PermissionKey[]).includes('USER_DELETE');

  const [form, setForm] = useState({ email: '', fullName: '', password: '', roleIds: [] as number[] });
  const [accessForm, setAccessForm] = useState({ userId: 0, roleIds: [] as number[] });

  const {
    data: usersPage,
    refetch
  } = useQuery<Pagination<User>>({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const { data: response } = await api.get<Pagination<User>>('/users');
      return response;
    }
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles', 'options'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Role>>('/roles?size=100');
      return data.content;
    }
  });

  const createUser = useMutation({
    mutationFn: async () => {
      await api.post('/users', { ...form, roleIds: form.roleIds });
    },
    onSuccess: () => {
      setForm({ email: '', fullName: '', password: '', roleIds: [] });
      refetch();
    }
  });

  const deleteUser = useMutation<void, unknown, number>({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => refetch()
  });

  const assignRoles = useMutation({
    mutationFn: async () => {
      if (!accessForm.userId) return;
      await api.post(`/users/${accessForm.userId}/roles`, {
        roleIds: accessForm.roleIds
      });
    },
    onSuccess: () => {
      setAccessForm({ userId: 0, roleIds: [] });
      refetch();
    }
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createUser.mutate();
  };

  const users = usersPage?.content ?? [];
  const roleOptions = useMemo(() => roles, [roles]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">User Management</h1>
      {canCreate && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-600">Full name</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-slate-600">Assign roles</label>
              <select
                multiple
                value={form.roleIds.map(String)}
                onChange={(e) => {
                  const selections = Array.from(e.target.selectedOptions).map((option) => Number(option.value));
                  setForm((prev) => ({ ...prev, roleIds: selections }));
                }}
                className="mt-1 h-40 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Hold Ctrl (Windows) or Command (macOS) to select multiple roles for the new teammate.
              </p>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            disabled={createUser.isPending}
          >
            {createUser.isPending ? 'Creating...' : 'Create user'}
          </button>
        </form>
      )}

      <form onSubmit={(event) => {
        event.preventDefault();
        assignRoles.mutate();
      }} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">Manage access</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update an existing teammate&apos;s role membership to instantly adjust their permissions.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600">Team member</label>
            <select
              required
              value={accessForm.userId ? String(accessForm.userId) : ''}
              onChange={(e) =>
                setAccessForm((prev) => ({
                  ...prev,
                  userId: Number(e.target.value) || 0
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="" disabled>
                Select user
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Roles</label>
            <select
              multiple
              required
              value={accessForm.roleIds.map(String)}
              onChange={(e) => {
                const selections = Array.from(e.target.selectedOptions).map((option) => Number(option.value));
                setAccessForm((prev) => ({ ...prev, roleIds: selections }));
              }}
              className="mt-1 h-40 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            disabled={assignRoles.isPending}
          >
            {assignRoles.isPending ? 'Updating...' : 'Save access'}
          </button>
          <button
            type="button"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
            onClick={() => setAccessForm({ userId: 0, roleIds: [] })}
          >
            Clear
          </button>
        </div>
      </form>

      <DataTable title="Team members">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Roles</th>
            <th className="px-3 py-2 text-left">Permissions</th>
            {canDelete && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{user.fullName}</td>
              <td className="px-3 py-2">{user.email}</td>
              <td className="px-3 py-2 text-sm text-slate-600">
                {user.roles.length ? (
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span key={role} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2 text-sm text-slate-600">
                {user.permissions.length ? user.permissions.join(', ') : '—'}
              </td>
              {canDelete && (
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => deleteUser.mutate(user.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
};

export default UsersPage;
