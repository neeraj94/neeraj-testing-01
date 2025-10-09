import type { ReactNode } from 'react';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalElements: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  prefix?: ReactNode;
}

const PaginationControls = ({
  page,
  pageSize,
  totalElements,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  prefix
}: PaginationControlsProps) => {
  const totalPages = Math.max(Math.ceil(totalElements / pageSize), 1);
  const currentPage = Math.min(page + 1, totalPages);
  const showingFrom = totalElements === 0 ? 0 : page * pageSize + 1;
  const showingTo = totalElements === 0 ? 0 : Math.min(page * pageSize + pageSize, totalElements);

  const goToPrevious = () => {
    if (page <= 0 || isLoading) {
      return;
    }
    onPageChange(page - 1);
  };

  const goToNext = () => {
    if (page >= totalPages - 1 || isLoading) {
      return;
    }
    onPageChange(page + 1);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-500 sm:flex-row sm:items-center sm:gap-3">
        <span>
          Showing {showingFrom.toLocaleString()} – {showingTo.toLocaleString()} of {totalElements.toLocaleString()}
        </span>
        <span>
          Page {totalElements === 0 ? 0 : currentPage} of {totalPages.toLocaleString()}
        </span>
        {prefix}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Per page
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevious}
            disabled={page === 0 || isLoading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={page >= totalPages - 1 || isLoading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;
