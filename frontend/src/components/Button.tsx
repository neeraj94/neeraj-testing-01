import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const baseStyles = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:opacity-90 disabled:opacity-60',
  ghost:
    'border border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed'
};

const Button = ({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: PropsWithChildren<ButtonProps>) => {
  const isDisabled = disabled || loading;
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {loading && <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
      {children}
    </button>
  );
};

export default Button;
