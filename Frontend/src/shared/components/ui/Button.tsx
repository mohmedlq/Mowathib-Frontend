import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, icon, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const variants = {
      primary: 'bg-[#245B63] hover:bg-[#1D4B52] text-white focus:ring-[#245B63]/40 shadow-xs',
      secondary: 'bg-white hover:bg-[#EEF2F3] text-[#17252B] border border-[#DCE3E6] focus:ring-[#245B63]/30',
      outline: 'bg-transparent border border-[#245B63] text-[#245B63] hover:bg-[#E8F1F1] focus:ring-[#245B63]/30',
      danger: 'bg-[#FDECEC] hover:bg-[#F9D6D6] text-[#A61B1B] border border-[#F1C3C3] focus:ring-[#A61B1B]/30',
      success: 'bg-[#E8F5EC] hover:bg-[#D7EEDB] text-[#176B3A] border border-[#B7DEC5] focus:ring-[#176B3A]/30',
      ghost: 'bg-transparent hover:bg-[#EEF2F3] text-[#5F6B73] hover:text-[#17252B] focus:ring-gray-300',
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
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ? <span className="shrink-0">{icon}</span> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

