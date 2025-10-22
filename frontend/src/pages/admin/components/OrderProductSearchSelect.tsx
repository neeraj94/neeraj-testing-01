import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../services/http';
import Spinner from '../../../components/Spinner';
import { formatCurrency } from '../../../utils/currency';
import type { AdminOrderProductOption } from '../../../types/orders';

interface OrderProductSearchSelectProps {
  selected?: AdminOrderProductOption | null;
  disabled?: boolean;
  currencyCode?: string | null;
  placeholder?: string;
  initialLabel?: string;
  onSelect: (option: AdminOrderProductOption) => void;
}

const MIN_SEARCH_LENGTH = 2;

const formatOptionLabel = (option: AdminOrderProductOption) => {
  const variant = option.variantLabel ?? option.variantSku ?? option.variantKey;
  const sku = option.variantSku ?? option.productSku;
  let label = option.productName;
  if (variant) {
    label += ` · ${variant}`;
  }
  if (sku) {
    label += ` (${sku})`;
  }
  return label;
};

const OrderProductSearchSelect = ({
  selected,
  disabled,
  currencyCode,
  placeholder = 'Search products…',
  initialLabel,
  onSelect
}: OrderProductSearchSelectProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [term, setTerm] = useState(() => selected ? formatOptionLabel(selected) : initialLabel ?? '');
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selected) {
      setTerm(formatOptionLabel(selected));
    } else if (initialLabel != null) {
      setTerm(initialLabel);
    }
  }, [selected, initialLabel]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchTerm(term.trim());
    }, 200);
    return () => window.clearTimeout(handle);
  }, [term]);

  const { data: options = [], isFetching } = useQuery<AdminOrderProductOption[]>({
    queryKey: ['orders', 'admin', 'productSearch', searchTerm],
    enabled: open && searchTerm.length >= MIN_SEARCH_LENGTH,
    queryFn: async () => {
      const { data } = await adminApi.get<AdminOrderProductOption[]>('/orders/products', {
        params: { search: searchTerm, limit: 15 }
      });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000
  });

  const handleInputFocus = () => {
    if (disabled) {
      return;
    }
    setOpen(true);
  };

  const handleSelect = (option: AdminOrderProductOption) => {
    onSelect(option);
    setTerm(formatOptionLabel(option));
    setOpen(false);
  };

  const currencyFormatter = useMemo(() => {
    const code = currencyCode ?? 'USD';
    return (value: number) => formatCurrency(value, code);
  }, [currencyCode]);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={term}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={handleInputFocus}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {searchTerm.length < MIN_SEARCH_LENGTH ? (
            <div className="px-4 py-3 text-xs text-slate-500">Type at least {MIN_SEARCH_LENGTH} characters to search.</div>
          ) : isFetching ? (
            <div className="flex items-center justify-center px-4 py-6">
              <Spinner />
            </div>
          ) : options.length ? (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
              {options.map((option) => (
                <li key={`${option.productId}-${option.variantId ?? 'base'}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {option.thumbnailUrl ? (
                        <img src={option.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{option.productName}</p>
                      <p className="truncate text-xs text-slate-600">
                        {option.variantLabel ?? option.variantSku ?? option.variantKey ?? 'Default configuration'}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        SKU: {option.variantSku ?? option.productSku ?? '—'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-sm font-semibold text-slate-900">{currencyFormatter(option.unitPrice)}</span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">
                        Tax {((option.taxRate ?? 0) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-xs text-slate-500">No products match your search.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderProductSearchSelect;
export { formatOptionLabel };
