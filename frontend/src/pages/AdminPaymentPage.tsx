import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { PaymentMethod } from '../types/checkout';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import Button from '../components/Button';

const AdminPaymentPage = () => {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const methodsQuery = useQuery<PaymentMethod[]>({
    queryKey: ['payments', 'methods'],
    queryFn: async () => {
      const { data } = await api.get<PaymentMethod[]>('/admin/payments/methods');
      return data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, payload }: { key: string; payload: { enabled?: boolean; notes?: string } }) => {
      const { data } = await api.put<PaymentMethod>(`/admin/payments/methods/${key}`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Payment method updated.' });
      queryClient.invalidateQueries({ queryKey: ['payments', 'methods'] });
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to update payment method.') });
    }
  });

  const methods = methodsQuery.data ?? [];
  const activeMethod = useMemo(
    () => methods.find((method) => method.key === selectedMethod) ?? methods[0],
    [methods, selectedMethod]
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payment methods</h1>
          <p className="text-sm text-slate-500">
            Enable or disable payment options that appear during customer checkout.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="space-y-2">
          {methods.map((method) => (
            <button
              key={method.key}
              type="button"
              onClick={() => setSelectedMethod(method.key)}
              className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                (activeMethod?.key ?? methods[0]?.key) === method.key
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{method.displayName}</span>
                <span className={`text-xs ${method.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {method.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </button>
          ))}
        </aside>

        {activeMethod ? (
          <section className="space-y-4 rounded border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{activeMethod.displayName}</h2>
                <p className="text-sm text-slate-500">
                  Configure availability and add contextual instructions for the checkout screen.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={activeMethod.enabled}
                  onChange={(event) =>
                    updateMutation.mutate({
                      key: activeMethod.key,
                      payload: { enabled: event.target.checked }
                    })
                  }
                />
                Enabled
              </label>
            </div>
            <label className="block text-xs font-medium uppercase text-slate-500">
              Additional information
              <textarea
                rows={4}
                value={activeMethod.notes ?? ''}
                onChange={(event) =>
                  updateMutation.mutate({
                    key: activeMethod.key,
                    payload: { notes: event.target.value }
                  })
                }
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Add payment instructions that will be shown to admins and shoppers."
              />
            </label>
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Changes are saved instantly for the selected payment method.
            </div>
            <div className="flex justify-end">
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['checkout', 'summary'] })} variant="ghost">
                Refresh checkout preview
              </Button>
            </div>
          </section>
        ) : (
          <p className="text-sm text-slate-500">No payment method selected.</p>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentPage;
