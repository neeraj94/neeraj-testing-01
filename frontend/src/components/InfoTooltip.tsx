import { ReactNode, useId, useState } from 'react';

interface InfoTooltipProps {
  label: string;
  children: ReactNode;
}

const InfoTooltip = ({ label, children }: InfoTooltipProps) => {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-500 transition hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        i
      </button>
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 z-30 mt-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl"
        >
          <p className="mb-2 font-semibold text-slate-700">{label}</p>
          <div className="text-slate-600">{children}</div>
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
