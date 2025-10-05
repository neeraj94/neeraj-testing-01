import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/http';
import DataTable from '../components/DataTable';
import type { Invoice, InvoiceItem, Pagination } from '../types/models';
import { useAppSelector } from '../app/hooks';
import type { PermissionKey } from '../types/auth';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import { hasAnyPermission } from '../utils/permissions';

const initialItem = { description: '', qty: 1, unitPrice: 0 };

const InvoicesPage = () => {
  const { permissions } = useAppSelector((state) => state.auth);
  const grantedPermissions = permissions as PermissionKey[];
  const canCreate = hasAnyPermission(grantedPermissions, ['INVOICE_CREATE']);
  const canDelete = hasAnyPermission(grantedPermissions, ['INVOICE_DELETE']);
  const canUpdate = hasAnyPermission(grantedPermissions, ['INVOICE_UPDATE']);
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
    status: 'DRAFT' as Invoice['status'],
    taxRate: 10,
    item: initialItem,
    existingItems: [] as InvoiceItem[]
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);

  const buildInvoiceItems = (): Array<Pick<InvoiceItem, 'description' | 'qty' | 'unitPrice'>> => {
    if (editingInvoiceId && form.existingItems.length > 0) {
      return form.existingItems.map((item, index) => {
        if (index === 0) {
          return {
            description: form.item.description,
            qty: form.item.qty,
            unitPrice: Number(form.item.unitPrice)
          };
        }
        return {
          description: item.description,
          qty: Number(item.qty),
          unitPrice: Number(item.unitPrice)
        };
      });
    }
    return [
      {
        description: form.item.description,
        qty: form.item.qty,
        unitPrice: Number(form.item.unitPrice)
      }
    ];
  };

  const resetForm = () => {
    setForm({
      customerId: '',
      number: '',
      issueDate: '',
      dueDate: '',
      status: 'DRAFT',
      taxRate: 10,
      item: { ...initialItem },
      existingItems: []
    });
    setFormError(null);
    setEditingInvoiceId(null);
  };

  const isEditing = editingInvoiceId !== null;

  const createInvoice = useMutation({
    mutationFn: async () => {
      await api.post('/invoices', {
        customerId: Number(form.customerId),
        number: form.number,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        status: form.status,
        taxRate: form.taxRate,
        items: buildInvoiceItems()
      });
    },
    onSuccess: () => {
      resetForm();
      notify({ type: 'success', message: 'Invoice created successfully.' });
      refetch();
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Unable to create invoice.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const deleteInvoice = useMutation<void, unknown, number>({
    mutationFn: async (id: number) => {
      await api.delete(`/invoices/${id}`);
    },
    onSuccess: (_, id) => {
      notify({ type: 'success', message: 'Invoice removed.' });
      refetch();
      if (editingInvoiceId === id) {
        resetForm();
      }
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to remove invoice.') });
    }
  });

  const updateInvoice = useMutation({
    mutationFn: async () => {
      if (!editingInvoiceId) {
        return null;
      }
      const { data } = await api.put<Invoice>(`/invoices/${editingInvoiceId}`, {
        customerId: Number(form.customerId),
        number: form.number,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        status: form.status,
        taxRate: form.taxRate,
        items: buildInvoiceItems()
      });
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        notify({ type: 'success', message: 'Invoice updated successfully.' });
        resetForm();
        refetch();
      }
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Unable to update invoice.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const isSaving = isEditing ? updateInvoice.isPending : createInvoice.isPending;
  const isDeleting = deleteInvoice.isPending;

  const showActions = canDelete || canUpdate;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.customerId || !form.number.trim()) {
      setFormError('Customer ID and invoice number are required.');
      notify({ type: 'error', message: 'Customer ID and invoice number are required.' });
      return;
    }
    setFormError(null);
    if (isEditing) {
      updateInvoice.mutate();
    } else {
      createInvoice.mutate();
    }
  };

  const beginEdit = (invoice: Invoice) => {
    const [firstItem] = invoice.items;
    const computedTaxRate = invoice.subtotal === 0 ? 0 : Number(((invoice.tax / invoice.subtotal) * 100).toFixed(2));
    setEditingInvoiceId(invoice.id);
    setForm({
      customerId: String(invoice.customerId),
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      taxRate: computedTaxRate,
      item: firstItem
        ? { description: firstItem.description, qty: firstItem.qty, unitPrice: Number(firstItem.unitPrice) }
        : { ...initialItem },
      existingItems: invoice.items?.map((item) => ({ ...item })) ?? []
    });
    setFormError(null);
  };

  const cancelEdit = () => {
    resetForm();
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
              <label className="block text-sm font-medium text-slate-600">Invoice status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value as Invoice['status'] }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
              </select>
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
          <div className="mt-4 flex items-center gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
              >
                Cancel edit
              </button>
            )}
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : isEditing ? 'Update invoice' : 'Create invoice'}
            </button>
          </div>
        </form>
      )}

      <DataTable title="Invoices">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Number</th>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Total</th>
            {showActions && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{invoice.number}</td>
              <td className="px-3 py-2">{invoice.customerName}</td>
              <td className="px-3 py-2">{invoice.status}</td>
              <td className="px-3 py-2 text-right">${invoice.total.toFixed(2)}</td>
              {showActions && (
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => beginEdit(invoice)}
                        className="text-sm text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving || isDeleting}
                      >
                        {editingInvoiceId === invoice.id ? 'Editing' : 'Edit'}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteInvoice.mutate(invoice.id)}
                        className="text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isDeleting}
                      >
                        Remove
                      </button>
                    )}
                  </div>
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
