import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Invoice, Pagination } from '../types/models';
import { useAppSelector } from '../app/hooks';
import type { PermissionKey } from '../types/auth';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';

const initialItem = { description: '', qty: 1, unitPrice: 0 };

const InvoicesPage = () => {
  const { permissions } = useAppSelector((state) => state.auth);
  const canCreate = (permissions as PermissionKey[]).includes('INVOICE_CREATE');
  const canDelete = (permissions as PermissionKey[]).includes('INVOICE_DELETE');
  const { notify } = useToast();

  const {
    data: invoices = [],
    refetch
  } = useQuery<Invoice[]>({
    queryKey: ['invoices', 'all'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Invoice>>('/invoices');
      return data.content;
    }
  });

  const [form, setForm] = useState({
    customerId: '',
    number: '',
    issueDate: '',
    dueDate: '',
    taxRate: 10,
    item: initialItem
  });
  const [formError, setFormError] = useState<string | null>(null);

  const createInvoice = useMutation({
    mutationFn: async () => {
      await api.post('/invoices', {
        customerId: Number(form.customerId),
        number: form.number,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        status: 'DRAFT',
        taxRate: form.taxRate,
        items: [form.item]
      });
    },
    onSuccess: () => {
      setForm({ customerId: '', number: '', issueDate: '', dueDate: '', taxRate: 10, item: { ...initialItem } });
      setFormError(null);
      notify({ type: 'success', message: 'Invoice created successfully.' });
      refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to create invoice.') });
    }
  });

  const deleteInvoice = useMutation<void, unknown, number>({
    mutationFn: async (id: number) => {
      await api.delete(`/invoices/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Invoice removed.' });
      refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to remove invoice.') });
    }
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.customerId || !form.number.trim()) {
      setFormError('Customer ID and invoice number are required.');
      notify({ type: 'error', message: 'Customer ID and invoice number are required.' });
      return;
    }
    setFormError(null);
    createInvoice.mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Invoices</h1>

      {canCreate && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-600">Customer ID</label>
              <input
                type="number"
                value={form.customerId}
                onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Invoice number</label>
              <input
                type="text"
                value={form.number}
                onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Tax %</label>
              <input
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm((prev) => ({ ...prev, taxRate: Number(e.target.value) }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Issue date</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Item description</label>
              <input
                type="text"
                value={form.item.description}
                onChange={(e) => setForm((prev) => ({ ...prev, item: { ...prev.item, description: e.target.value } }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Quantity</label>
              <input
                type="number"
                min={1}
                value={form.item.qty}
                onChange={(e) => setForm((prev) => ({ ...prev, item: { ...prev.item, qty: Number(e.target.value) } }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Unit price</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.item.unitPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, item: { ...prev.item, unitPrice: Number(e.target.value) } }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            disabled={createInvoice.isPending}
          >
            {createInvoice.isPending ? 'Saving...' : 'Create invoice'}
          </button>
        </form>
      )}

      <DataTable title="Invoices">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Number</th>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Total</th>
            {canDelete && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{invoice.number}</td>
              <td className="px-3 py-2">{invoice.customerName}</td>
              <td className="px-3 py-2">{invoice.status}</td>
              <td className="px-3 py-2 text-right">${invoice.total.toFixed(2)}</td>
              {canDelete && (
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => deleteInvoice.mutate(invoice.id)}
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

export default InvoicesPage;
