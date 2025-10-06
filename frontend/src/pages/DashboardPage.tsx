import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { Customer, Invoice, Pagination, User } from '../types/models';
import DataTable from '../components/DataTable';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency, formatCurrencyCompact } from '../utils/currency';

const SparkleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3.75 13.2 8.7l4.95 1.2-4.95 1.2-1.2 4.95-1.2-4.95L5.85 9.9l4.95-1.2L12 3.75Z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0v.75h-15v-.75Z"
    />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5 4.5 9.75m6 9.75V5.25m6 14.25v-6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 20.25h18" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 4.5h6M9.75 3h4.5a1.5 1.5 0 0 1 1.5 1.5V6h2.25A1.5 1.5 0 0 1 19.5 7.5V19.5A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5V7.5A1.5 1.5 0 0 1 6.75 6H9V4.5A1.5 1.5 0 0 1 10.5 3h3"
    />
  </svg>
);

const DashboardPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const { data: usersPage } = useQuery<Pagination<User>>({
    queryKey: ['users', 'recent'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<User>>('/users?size=5');
      return data;
    }
  });

  const { data: customersPage } = useQuery<Pagination<Customer>>({
    queryKey: ['customers', 'recent'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Customer>>('/customers?size=5');
      return data;
    }
  });

  const { data: invoicesPage } = useQuery<Pagination<Invoice>>({
    queryKey: ['invoices', 'recent'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Invoice>>('/invoices?size=8');
      return data;
    }
  });

  const users = usersPage?.content ?? [];
  const customers = customersPage?.content ?? [];
  const invoices = invoicesPage?.content ?? [];

  const paidTotal = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + invoice.total, 0),
    [invoices]
  );

  const outstandingTotal = useMemo(
    () => invoices.filter((invoice) => invoice.status !== 'PAID').reduce((sum, invoice) => sum + invoice.total, 0),
    [invoices]
  );

  const draftCount = useMemo(() => invoices.filter((invoice) => invoice.status === 'DRAFT').length, [invoices]);
  const sentCount = useMemo(() => invoices.filter((invoice) => invoice.status === 'SENT').length, [invoices]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary/90 to-primary shadow-lg">
        <div className="flex flex-col gap-4 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-white/80">Dashboard overview</p>
            <h1 className="mt-2 text-3xl font-semibold">Good to see you back, Admin</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Monitor engagement, track revenue, and stay ahead of upcoming work from a single, actionable workspace.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm sm:text-right">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-white">
              <SparkleIcon />
              Daily summary refreshed moments ago
            </span>
            <button className="rounded-md bg-white px-4 py-2 font-semibold text-primary shadow-sm transition hover:bg-slate-100">
              Customize dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active users</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{usersPage?.totalElements ?? 0}</p>
              <p className="mt-1 text-xs text-emerald-600">+4 this week</p>
            </div>
            <UsersIcon />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{customersPage?.totalElements ?? 0}</p>
              <p className="mt-1 text-xs text-slate-500">Top clients listed below</p>
            </div>
            <ChartIcon />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoices paid</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {formatCurrencyCompact(paidTotal, baseCurrency)}
              </p>
              <p className="mt-1 text-xs text-emerald-600">Up to date</p>
            </div>
            <ClipboardIcon />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {formatCurrencyCompact(outstandingTotal, baseCurrency)}
              </p>
              <p className="mt-1 text-xs text-amber-600">{sentCount} sent • {draftCount} drafts</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-500">!</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DataTable title="Recent invoices">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">Number</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-700">{invoice.number}</td>
                  <td className="px-3 py-2 text-sm text-slate-600">{invoice.customerName}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                        invoice.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : invoice.status === 'SENT'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-700">
                    {formatCurrency(invoice.total, baseCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Top customers</h2>
              <span className="text-xs uppercase tracking-wide text-slate-500">Relationship health</span>
            </div>
            <ul className="mt-4 space-y-3">
              {customers.map((customer) => (
                <li key={customer.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{customer.name}</p>
                    {customer.email && <p className="text-xs text-slate-500">{customer.email}</p>}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Active</span>
                </li>
              ))}
              {!customers.length && <li className="text-sm text-slate-500">No customers yet.</li>}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Today&apos;s focus</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary"></span>
                Follow up with clients awaiting proposals.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                Review outstanding invoices and send reminders.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                Approve new user access requests submitted overnight.
              </li>
            </ul>
            <button className="mt-6 inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white">
              View full agenda
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Need help?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Our support team is online and ready to help configure automations, share best practices, and onboard your team.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="font-semibold text-slate-800">Live chat:</span> Monday–Friday 8am–6pm
              </p>
              <p>
                <span className="font-semibold text-slate-800">Email:</span> support@example.com
              </p>
            </div>
            <button className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">
              Chat with us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
