import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Pagination, User } from '../types/models';
import { useAppSelector } from '../app/hooks';
import type { PermissionKey } from '../types/auth';

const UsersPage = () => {
  const { permissions } = useAppSelector((state) => state.auth);
  const canCreate = (permissions as PermissionKey[]).includes('USER_CREATE');
  const canDelete = (permissions as PermissionKey[]).includes('USER_DELETE');

  const [form, setForm] = useState({ email: '', fullName: '', password: '' });

  const { data, refetch } = useQuery(['users', 'list'], async () => {
    const { data: response } = await api.get<Pagination<User>>('/users');
    return response.content;
  });

  const createUser = useMutation(
    async () => {
      await api.post('/users', { ...form, roleIds: [] });
    },
    {
      onSuccess: () => {
        setForm({ email: '', fullName: '', password: '' });
        refetch();
      }
    }
  );

  const deleteUser = useMutation<void, unknown, number>(
    async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    {
      onSuccess: () => refetch()
    }
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createUser.mutate();
  };

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
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            disabled={createUser.isLoading}
          >
            {createUser.isLoading ? 'Creating...' : 'Create user'}
          </button>
        </form>
      )}

      <DataTable title="Team members">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Roles</th>
            {canDelete && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data?.map((user) => (
            <tr key={user.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{user.fullName}</td>
              <td className="px-3 py-2">{user.email}</td>
              <td className="px-3 py-2">{user.roles.join(', ') || '—'}</td>
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
