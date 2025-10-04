import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Pagination, Role, Permission } from '../types/models';

const RolesPage = () => {
  const { data: roles, refetch: refetchRoles } = useQuery(['roles'], async () => {
    const { data } = await api.get<Pagination<Role>>('/roles');
    return data.content;
  });

  const { data: permissions } = useQuery(['permissions'], async () => {
    const { data } = await api.get<Pagination<Permission>>('/permissions?size=100');
    return data.content;
  });

  const [roleForm, setRoleForm] = useState({ key: '', name: '' });
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const createRole = useMutation(
    async () => {
      await api.post('/roles', roleForm);
    },
    {
      onSuccess: () => {
        setRoleForm({ key: '', name: '' });
        refetchRoles();
      }
    }
  );

  const assignPermissions = useMutation(
    async () => {
      if (!selectedRole) return;
      await api.post(`/roles/${selectedRole}/permissions`, { permissionIds: selectedPermissions });
    },
    {
      onSuccess: () => {
        setSelectedPermissions([]);
        refetchRoles();
      }
    }
  );

  const roleOptions = useMemo(() => roles ?? [], [roles]);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createRole.mutate();
  };

  const handleAssign = (event: FormEvent) => {
    event.preventDefault();
    assignPermissions.mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Roles & Permissions</h1>

      <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">Create role</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600">Key</label>
            <input
              type="text"
              value={roleForm.key}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, key: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Name</label>
            <input
              type="text"
              value={roleForm.name}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          disabled={createRole.isLoading}
        >
          {createRole.isLoading ? 'Saving...' : 'Create role'}
        </button>
      </form>

      <form onSubmit={handleAssign} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">Assign permissions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600">Role</label>
            <select
              value={selectedRole ?? ''}
              onChange={(e) => setSelectedRole(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              required
            >
              <option value="" disabled>
                Select role
              </option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Permissions</label>
            <select
              multiple
              value={selectedPermissions.map(String)}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions).map((option) => Number(option.value));
                setSelectedPermissions(values);
              }}
              className="mt-1 h-40 w-full rounded-md border border-slate-300 px-3 py-2"
              required
            >
              {permissions?.map((permission) => (
                <option key={permission.id} value={permission.id}>
                  {permission.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          disabled={assignPermissions.isLoading}
        >
          {assignPermissions.isLoading ? 'Assigning...' : 'Assign permissions'}
        </button>
      </form>

      <DataTable title="Roles">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Key</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Permissions</th>
          </tr>
        </thead>
        <tbody>
          {roles?.map((role) => (
            <tr key={role.id} className="border-t border-slate-200">
              <td className="px-3 py-2 uppercase tracking-wide text-slate-500">{role.key}</td>
              <td className="px-3 py-2">{role.name}</td>
              <td className="px-3 py-2 text-sm text-slate-600">{role.permissions.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
};

export default RolesPage;
