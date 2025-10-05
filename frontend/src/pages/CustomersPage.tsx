import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Customer, Pagination } from '../types/models';
import { useAppSelector } from '../app/hooks';
import type { PermissionKey } from '../types/auth';

const CustomersPage = () => {
  const { permissions } = useAppSelector((state) => state.auth);
  const canCreate = (permissions as PermissionKey[]).includes('CUSTOMER_CREATE');
  const canDelete = (permissions as PermissionKey[]).includes('CUSTOMER_DELETE');

  const {
    data: customers = [],
    refetch
  } = useQuery<Customer[]>({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Customer>>('/customers');
      return data.content;
    }
  });

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });

  const createCustomer = useMutation({
    mutationFn: async () => {
      await api.post('/customers', form);
    },
    onSuccess: () => {
      setForm({ name: '', email: '', phone: '', address: '' });
      refetch();
    }
  });

  const deleteCustomer = useMutation<void, unknown, number>({
    mutationFn: async (id: number) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => refetch()
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createCustomer.mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Customers</h1>

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

export default CustomersPage;
