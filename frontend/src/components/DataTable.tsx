import { PropsWithChildren, ReactNode } from 'react';

interface DataTableProps {
  title: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  bodyWrapperClassName?: string;
  footer?: ReactNode;
}

const DataTable = ({
  title,
  children,
  actions,
  toolbar,
  bodyWrapperClassName,
  footer
}: PropsWithChildren<DataTableProps>) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {actions}
      </div>
      {toolbar ? <div className="border-b border-slate-200 px-6 py-3">{toolbar}</div> : null}
      <div className="overflow-x-auto">
        <div className={bodyWrapperClassName ? bodyWrapperClassName : undefined}>
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            {children}
          </table>
        </div>
      </div>
      {footer ?? null}
    </div>
  );
};

export default DataTable;
