import { PropsWithChildren } from 'react';

interface DataTableProps {
  title: string;
  actions?: React.ReactNode;
}

const DataTable = ({ title, children, actions }: PropsWithChildren<DataTableProps>) => {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {actions}
      </div>
      <div className="overflow-x-auto px-4 py-2">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
          {children}
        </table>
      </div>
    </div>
  );
};

export default DataTable;
