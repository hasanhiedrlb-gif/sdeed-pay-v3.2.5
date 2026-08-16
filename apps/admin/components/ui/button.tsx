import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Variant = 'default' | 'outline' | 'destructive' | 'ghost';
type Size = 'sm' | 'default' | 'lg';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const styles: Record<Variant, string> = {
    default: 'bg-slate-900 text-white hover:bg-slate-700',
    outline: 'border border-slate-300 text-slate-900 hover:bg-slate-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-700 hover:bg-slate-100',
  };

  const sizes: Record<Size, string> = {
    sm: 'px-2.5 py-1 text-xs',
    default: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        styles[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';
