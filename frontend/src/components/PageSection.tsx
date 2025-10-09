import type { PropsWithChildren, ReactNode } from 'react';

interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  bodyClassName?: string;
}

const PageSection = ({
  title,
  description,
  actions,
  footer,
  padded = true,
  bodyClassName,
  children
}: PropsWithChildren<PageSectionProps>) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {(title || description || actions) && (
        <header className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
            {description && <p className="text-sm text-slate-500">{description}</p>}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </header>
      )}
      <div className={`${padded ? 'px-6 py-5' : ''} ${bodyClassName ?? ''}`.trim()}>{children}</div>
      {footer && (
        <footer className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">{footer}</div>
        </footer>
      )}
    </section>
  );
};

export default PageSection;
