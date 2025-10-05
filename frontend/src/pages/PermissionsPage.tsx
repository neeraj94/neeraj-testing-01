import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Pagination, Permission } from '../types/models';

const PermissionsPage = () => {
  const {
    data: permissions = [],
  } = useQuery<Permission[]>({
    queryKey: ['permissions', 'all'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Permission>>('/permissions?size=200');
      return data.content;
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Permissions</h1>
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Permissions are provisioned by the platform and listed below for reference. Contact your administrator if you need new
          capabilities enabled.
        </p>
      </div>
      <DataTable title="Available permissions">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Key</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {permissions.map((permission) => (
            <tr key={permission.id} className="transition hover:bg-blue-50/40">
              <td className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{permission.key}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{permission.name}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
};

export default PermissionsPage;
