import { useEffect, useRef, useState } from 'react';
import type { ExportFormat } from '../utils/exporters';

const OPTIONS: Array<{ label: string; value: ExportFormat; description: string }> = [
  { label: 'Excel (.xlsx)', value: 'xlsx', description: 'Download a spreadsheet of the current view.' },
  { label: 'CSV (.csv)', value: 'csv', description: 'Export the visible rows as comma-separated values.' },
  { label: 'PDF (.pdf)', value: 'pdf', description: 'Generate a printable PDF summary of the table.' },
  { label: 'Print view', value: 'print', description: 'Open a print-friendly preview in a new tab.' }
];

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="h-4 w-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0 4-4m-4 4-4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20h12" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="h-4 w-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
  </svg>
);

interface ExportMenuProps {
  onSelect: (format: ExportFormat) => void;
  disabled?: boolean;
  isBusy?: boolean;
}

const ExportMenu = ({ onSelect, disabled = false, isBusy = false }: ExportMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled || isBusy) {
      setOpen(false);
    }
  }, [disabled, isBusy]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled || isBusy}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <DownloadIcon />
        <span>{isBusy ? 'Preparing…' : 'Export'}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl">
          <ul className="py-2 text-sm text-slate-600">
            {OPTIONS.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelect(option.value);
                  }}
                  className="flex w-full flex-col items-start gap-1 px-4 py-2 text-left transition hover:bg-blue-50/70"
                >
                  <span className="font-semibold text-slate-700">{option.label}</span>
                  <span className="text-xs text-slate-500">{option.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;

