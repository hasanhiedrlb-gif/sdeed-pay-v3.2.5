import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Variant = 'default' | 'outline' | 'destructive' | 'ghost' | 'secondary';
type Size = 'sm' | 'default' | 'lg';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const styles: Record<Variant, string> = {
    default:
      'bg-[#4F8AFF] text-[#F8FAFC] font-bold shadow-[0_0_20px_rgba(79,138,255,0.4)] border border-white/20 hover:bg-[#3B7BF6] hover:shadow-[0_0_28px_rgba(79,138,255,0.65)] hover:-translate-y-0.5 active:translate-y-0',
    outline:
      'border border-white/20 bg-white/[0.06] backdrop-blur-[12px] text-[#F8FAFC] hover:bg-white/[0.12] hover:border-white/30',
    secondary:
      'border border-white/15 bg-white/[0.08] backdrop-blur-[12px] text-[#F8FAFC] hover:bg-white/[0.15] hover:border-white/25',
    destructive:
      'bg-rose-500/80 backdrop-blur-md text-white border border-rose-400/30 shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:bg-rose-600',
    ghost:
      'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.08]',
  };

  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    default: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
  };

  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        styles[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';
