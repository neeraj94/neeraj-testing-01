import { useEffect, useMemo, useRef, useState } from 'react';

export interface FilterDropdownProps {
  label: string;
  placeholder?: string;
  options: string[] | undefined;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

const FilterDropdown = ({
  label,
  placeholder = 'Select',
  options,
  values,
  onChange,
  disabled = false
}: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || containerRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const title = useMemo(() => {
    if (!values.length) {
      return placeholder;
    }
    if (values.length === 1) {
      return values[0];
    }
    return `${values.length} selected`;
  }, [placeholder, values]);

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((current) => current !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <div className="relative space-y-1" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-600">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={values.length ? 'truncate' : 'text-slate-400'}>{title}</span>
        <svg
          className={`ml-2 h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.854a.75.75 0 011.08 1.04l-4.25 4.417a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-30 mt-2 min-w-[16rem] max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-60 overflow-y-auto p-3">
            {!options?.length && (
              <div className="py-6 text-center text-sm text-slate-400">No options available</div>
            )}
            {options?.map((option) => {
              const checked = values.includes(option);
              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(option)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="truncate text-slate-700">{option}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <span>{values.length ? `${values.length} selected` : 'No selections'}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-medium text-primary transition hover:text-primary/80"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
