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
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Permissions are provisioned by the platform and listed below for reference. Contact your administrator if you need new
          capabilities enabled.
        </p>
      </div>
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
