import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ConfirmTone = 'default' | 'danger';

type ConfirmDialogOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmDialogState = Required<ConfirmDialogOptions> & {
  resolve: (value: boolean) => void;
};

type ConfirmDialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

const defaultOptions: Required<ConfirmDialogOptions> = {
  title: 'Are you sure?',
  description: 'This action cannot be undone.',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'default'
};

export const ConfirmDialogProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ConfirmDialogState | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((result: boolean) => {
    setState((current) => {
      if (current) {
        current.resolve(result);
      }
      return null;
    });
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...defaultOptions, ...options, resolve });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  useEffect(() => {
    if (!state) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [state, close]);

  const dialog =
    state &&
    createPortal(
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4 py-8"
        onClick={() => close(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{state.title}</h2>
              <p className="text-sm text-slate-600">{state.description}</p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => close(false)}
              >
                {state.cancelLabel}
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  state.tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                    : 'bg-primary hover:bg-blue-600 focus:ring-primary'
                }`}
                onClick={() => close(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialog}
    </ConfirmDialogContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context.confirm;
};

