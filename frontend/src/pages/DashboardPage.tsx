import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { Customer, Invoice, User } from '../types/models';
import DataTable from '../components/DataTable';

const DashboardPage = () => {
  const { data: users } = useQuery(['users'], async () => {
    const { data } = await api.get<{ content: User[] }>('/users?size=5');
    return data.content;
  });

  const { data: customers } = useQuery(['customers'], async () => {
    const { data } = await api.get<{ content: Customer[] }>('/customers?size=5');
    return data.content;
  });

  const { data: invoices } = useQuery(['invoices'], async () => {
    const { data } = await api.get<{ content: Invoice[] }>('/invoices?size=5');
    return data.content;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{users?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Customers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{customers?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Invoices</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{invoices?.length ?? 0}</p>
        </div>
      </div>

      <DataTable title="Recent Invoices">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Number</th>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoices?.map((invoice) => (
            <tr key={invoice.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{invoice.number}</td>
              <td className="px-3 py-2">{invoice.customerName}</td>
              <td className="px-3 py-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase tracking-wide text-slate-600">
                  {invoice.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right">${invoice.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
};

export default DashboardPage;
