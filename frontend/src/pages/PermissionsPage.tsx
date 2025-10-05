import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Pagination, Permission } from '../types/models';

const PermissionsPage = () => {
  const {
    data: permissions = [],
    refetch
  } = useQuery<Permission[]>({
    queryKey: ['permissions', 'all'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Permission>>('/permissions?size=200');
      return data.content;
    }
  });

  const [form, setForm] = useState({ key: '', name: '' });

  const createPermission = useMutation({
    mutationFn: async () => {
      await api.post('/permissions', form);
    },
    onSuccess: () => {
      setForm({ key: '', name: '' });
      refetch();
    }
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createPermission.mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Permissions</h1>
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-600">Key</label>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          disabled={createPermission.isPending}
        >
          {createPermission.isPending ? 'Saving...' : 'Create permission'}
        </button>
      </form>

      <DataTable title="Available permissions">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Key</th>
            <th className="px-3 py-2 text-left">Name</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.id} className="border-t border-slate-200">
              <td className="px-3 py-2 uppercase tracking-wide text-slate-500">{permission.key}</td>
              <td className="px-3 py-2">{permission.name}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
};

export default PermissionsPage;
