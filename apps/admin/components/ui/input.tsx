import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-xl border border-white/15 bg-slate-950/70 backdrop-blur-[16px] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8] outline-none transition-all duration-200 focus:border-[#4F8AFF] focus:ring-2 focus:ring-[#4F8AFF]/30 focus:shadow-[0_0_15px_rgba(79,138,255,0.3)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
