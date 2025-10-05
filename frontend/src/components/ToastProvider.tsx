import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastOptions {
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  notify: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 3600;

const typeStyles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700'
};

const iconPaths: Record<ToastType, string> = {
  success: 'M4.5 12.75l6 6 9-13.5',
  error: 'm6 18 12-12M6 6l12 12'
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (options: ToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const duration = options.duration ?? DEFAULT_DURATION;
      const toast: ToastRecord = { id, ...options, duration };
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-[1200] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition ${
              typeStyles[toast.type]
            }`}
          >
            <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/70">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[toast.type]} />
              </svg>
            </span>
            <div className="flex-1">
              {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
              <p className="text-sm leading-5">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="ml-2 rounded-full p-1 text-sm text-slate-500 transition hover:bg-white/60 hover:text-slate-700"
            >
              <span className="sr-only">Dismiss notification</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
