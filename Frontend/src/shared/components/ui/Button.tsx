import React from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, icon, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const variants = {
      primary: 'bg-[#0B5D43] hover:bg-[#084733] text-white focus:ring-[#0B5D43]/40 shadow-xs',
      secondary: 'bg-white hover:bg-[#F4F8F6] text-[#122B23] border border-[#D8E5DF] dark:bg-[#122B23] dark:hover:bg-[#1A3B31] dark:text-[#F4F8F6] dark:border-[#1E4638] focus:ring-[#0B5D43]/30',
      outline: 'bg-transparent border border-[#0B5D43] text-[#0B5D43] hover:bg-[#E8F5F0] dark:border-[#3E9B78] dark:text-[#3E9B78] dark:hover:bg-[#1A3B31] focus:ring-[#0B5D43]/30',
      danger: 'bg-[#FDECEC] hover:bg-[#F9D6D6] text-[#A61B1B] border border-[#F1C3C3] dark:bg-[#331518] dark:hover:bg-[#451C20] dark:text-[#F87171] dark:border-[#592226] focus:ring-[#A61B1B]/30',
      success: 'bg-[#E8F5EC] hover:bg-[#D7EEDB] text-[#0B5D43] border border-[#B7DEC5] dark:bg-[#122B1E] dark:hover:bg-[#183B28] dark:text-[#4ADE80] dark:border-[#1B4D32] focus:ring-[#0B5D43]/30',
      ghost: 'bg-transparent hover:bg-[#F4F8F6] text-[#5F6B73] hover:text-[#122B23] dark:hover:bg-[#1A3B31] dark:text-[#A3C7B9] dark:hover:text-[#F4F8F6] focus:ring-[#D8E5DF]',
    };

    const sizes = {
      sm: 'h-8 px-2.5 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-11 px-5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Spinner
            size="sm"
            className={variant === 'primary' ? 'border-white/30 border-t-white dark:border-white/30 dark:border-t-white' : undefined}
          />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
