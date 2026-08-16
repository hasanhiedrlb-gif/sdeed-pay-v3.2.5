import { HTMLAttributes } from 'react';
import clsx from 'clsx';

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'outline';
}) {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    danger: 'bg-rose-100 text-rose-700 border border-rose-200',
    warning: 'bg-amber-100 text-amber-700 border border-amber-200',
    outline: 'border border-slate-200 text-slate-700 bg-white',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[variant] || styles.default,
        className,
      )}
      {...props}
    />
  );
}
