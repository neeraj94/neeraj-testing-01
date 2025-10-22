import type { FC } from 'react';

const statusFlow = [
  { code: 'PROCESSING', label: 'Processing' },
  { code: 'CONFIRMED', label: 'Confirmed' },
  { code: 'PACKED', label: 'Packed' },
  { code: 'SHIPPED', label: 'Shipped' },
  { code: 'DELIVERED', label: 'Delivered' }
];

const normalizeStatus = (value: string | null | undefined) => {
  if (!value) {
    return 'PROCESSING';
  }
  const upper = value.toUpperCase();
  if (upper === 'CANCELLED' || upper === 'CANCELED') {
    return 'CANCELLED';
  }
  if (upper === 'RETURNED') {
    return 'RETURNED';
  }
  return upper;
};

const resolveActiveIndex = (status: string) => {
  const normalized = normalizeStatus(status);
  const index = statusFlow.findIndex((step) => step.code === normalized);
  if (index >= 0) {
    return index;
  }
  if (normalized === 'CANCELLED' || normalized === 'RETURNED') {
    return statusFlow.length - 1;
  }
  return 0;
};

interface OrderStatusTrackerProps {
  status: string | null | undefined;
  placedAt?: string | null;
}

const OrderStatusTracker: FC<OrderStatusTrackerProps> = ({ status, placedAt }) => {
  const normalized = normalizeStatus(status ?? 'PROCESSING');
  const activeIndex = resolveActiveIndex(normalized);
  const isTerminalCancel = normalized === 'CANCELLED' || normalized === 'RETURNED';

  const formattedDate = placedAt
    ? (() => {
        const parsed = new Date(placedAt);
        if (Number.isNaN(parsed.getTime())) {
          return null;
        }
        return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      })()
    : null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Order status</p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {normalized === 'CANCELLED'
              ? 'Order cancelled'
              : normalized === 'RETURNED'
                ? 'Order returned'
                : statusFlow[activeIndex]?.label ?? 'Processing'}
          </h2>
          {formattedDate && <p className="text-sm text-slate-500">Placed on {formattedDate}</p>}
        </div>
        <div
          className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${
            isTerminalCancel
              ? 'bg-rose-50 text-rose-600'
              : normalized === 'DELIVERED'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
          }`}
        >
          {normalized}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex flex-1 items-center justify-between gap-2">
          {statusFlow.map((step, index) => {
            const reached = index <= activeIndex && !isTerminalCancel;
            const isLast = index === statusFlow.length - 1;
            return (
              <div key={step.code} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition ${
                    reached
                      ? 'border-primary bg-primary text-white shadow-sm shadow-primary/30'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {index + 1}
                </div>
                {!isLast && (
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      index < activeIndex && !isTerminalCancel ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {isTerminalCancel && (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          This order is no longer active. If you believe this is a mistake, please contact our support team and share your
          order number.
        </p>
      )}
    </section>
  );
};

export default OrderStatusTracker;
