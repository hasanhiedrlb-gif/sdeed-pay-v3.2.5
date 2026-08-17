import { HTMLAttributes } from 'react';
import clsx from 'clsx';

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'outline' | 'info';
}) {
  const styles = {
    default: 'bg-white/10 text-[#F8FAFC] border border-white/15 backdrop-blur-md',
    info: 'bg-[#4F8AFF]/20 text-[#38BDF8] border border-[#4F8AFF]/40 backdrop-blur-md',
    success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md',
    danger: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md',
    warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md',
    outline: 'border border-white/20 text-[#94A3B8] bg-white/[0.04] backdrop-blur-md',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        styles[variant] || styles.default,
        className,
      )}
      {...props}
    />
  );
}
