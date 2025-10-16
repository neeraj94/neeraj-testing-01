export type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  srText?: string;
};

const SIZE_MAP: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4'
};

const Spinner = ({ size = 'md', className = '', srText = 'Loading…' }: SpinnerProps) => {
  const spinnerClassName = [
    'inline-block animate-spin rounded-full border-current border-b-transparent text-blue-600',
    SIZE_MAP[size],
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="inline-flex items-center">
      <span
        className={spinnerClassName}
        role="status"
        aria-live="polite"
        aria-busy="true"
      />
      {srText && <span className="sr-only">{srText}</span>}
    </div>
  );
};

export default Spinner;
