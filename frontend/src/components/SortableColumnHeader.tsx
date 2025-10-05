import React from 'react';

type SortDirection = 'asc' | 'desc';

interface SortableColumnHeaderProps<T extends string = string> {
  label: string;
  field: T;
  currentField: string;
  direction: SortDirection;
  onSort: (field: T) => void;
  align?: 'left' | 'center' | 'right';
}

const SortIndicator = ({ active, direction }: { active: boolean; direction: SortDirection }) => {
  return (
    <span className="ml-1 inline-flex flex-col leading-[0.6]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        className={`h-2.5 w-2.5 ${active && direction === 'asc' ? 'text-primary' : 'text-slate-400'}`}
        aria-hidden="true"
      >
        <path d="M8 4 4.5 8h7L8 4Z" fill="currentColor" />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        className={`h-2.5 w-2.5 ${active && direction === 'desc' ? 'text-primary' : 'text-slate-400'}`}
        aria-hidden="true"
      >
        <path d="M8 12 11.5 8h-7L8 12Z" fill="currentColor" />
      </svg>
    </span>
  );
};

const alignmentClass: Record<'left' | 'center' | 'right', string> = {
  left: 'justify-start text-left',
  center: 'justify-center text-center',
  right: 'justify-end text-right'
};

const SortableColumnHeader = <T extends string = string>({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = 'left'
}: SortableColumnHeaderProps<T>) => {
  const isActive = currentField === field;
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th scope="col" className="px-4 py-3" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-primary ${alignmentClass[align]}`}
      >
        <span>{label}</span>
        <SortIndicator active={isActive} direction={direction} />
      </button>
    </th>
  );
};

export default SortableColumnHeader;
