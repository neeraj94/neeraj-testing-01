import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../services/http';
import DataTable from '../../components/DataTable';
import type { Customer, Pagination } from '../../types/models';
import { useAppSelector } from '../../app/hooks';
import type { PermissionKey } from '../../types/auth';
import { hasAnyPermission } from '../../utils/permissions';
import { useToast } from '../../components/ToastProvider';
import { extractErrorMessage } from '../../utils/errors';
import ExportMenu from '../../components/ExportMenu';
import { exportDataset, type ExportFormat } from '../../utils/exporters';

const CustomersPage = () => {
  const { permissions } = useAppSelector((state) => state.auth);
  const grantedPermissions = permissions as PermissionKey[];
  const canCreate = hasAnyPermission(grantedPermissions, ['USER_CREATE']);
  const canDelete = hasAnyPermission(grantedPermissions, ['USER_DELETE']);
  const canExport = hasAnyPermission(grantedPermissions, ['USERS_EXPORT']);
  const { notify } = useToast();

  const {
    data: customers = [],
    refetch,
    isLoading: isLoadingCustomers
  } = useQuery<Customer[]>({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Customer>>('/customers');
      return data.content;
    }
  });

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const createCustomer = useMutation({
    mutationFn: async () => {
      await api.post('/customers', form);
    },
    onSuccess: () => {
      setForm({ name: '', email: '', phone: '', address: '' });
      setFormError(null);
      notify({ type: 'success', message: 'Customer created successfully.' });
      refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to create customer.') });
    }
  });

  const deleteCustomer = useMutation<void, unknown, number>({
    mutationFn: async (id: number) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Customer removed.' });
      refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to remove customer.') });
    }
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setFormError(null);
    createCustomer.mutate();
  };

  const handleExport = async (format: ExportFormat) => {
    if (!canExport || isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      if (!customers.length) {
        notify({ type: 'error', message: 'There are no customers to export right now.' });
        return;
      }

      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'address', header: 'Address' }
      ];

      const rows = customers.map((customer) => ({
        name: customer.name,
        email: customer.email ?? '—',
        phone: customer.phone ?? '—',
        address: customer.address ?? '—'
      }));

      exportDataset({
        format,
        columns,
        rows,
        fileName: 'customers',
        title: 'Customers directory'
      });
    } catch (error) {
      notify({ type: 'error', message: 'Unable to export customers. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500">Manage all customer accounts and their contact details.</p>
        </div>
        {canExport && (
          <ExportMenu onSelect={handleExport} isBusy={isExporting} disabled={isLoadingCustomers} />
        )}
      </div>

      {canCreate && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-600">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                minLength={2}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            disabled={createCustomer.isPending}
          >
            {createCustomer.isPending ? 'Saving...' : 'Create customer'}
          </button>
        </form>
      )}

      <DataTable title="Customer directory">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Phone</th>
            <th className="px-3 py-2 text-left">Address</th>
            {canDelete && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{customer.name}</td>
              <td className="px-3 py-2">{customer.email ?? '—'}</td>
              <td className="px-3 py-2">{customer.phone ?? '—'}</td>
              <td className="px-3 py-2">{customer.address ?? '—'}</td>
              {canDelete && (
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => deleteCustomer.mutate(customer.id)}
                    className="text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deleteCustomer.isPending}
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

export default CustomersPage;
