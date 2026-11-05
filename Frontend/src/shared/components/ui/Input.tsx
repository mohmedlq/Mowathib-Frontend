import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '_') : undefined);

    return (
      <div className="w-full text-right">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#17252B] mb-1.5 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {rightIcon && (
            <div className="absolute right-3 text-[#89949A] pointer-events-none flex items-center">{rightIcon}</div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3 py-2 bg-white text-[#17252B] placeholder-[#89949A] text-sm rounded-lg border border-[#DCE3E6] transition-all outline-none',
              'focus:border-[#245B63] focus:ring-2 focus:ring-[#245B63]/15',
              'disabled:bg-[#EEF2F3] disabled:text-[#89949A] disabled:cursor-not-allowed',
              error && 'border-[#A61B1B] focus:border-[#A61B1B] focus:ring-[#A61B1B]/15',
              rightIcon && 'pr-9',
              leftIcon && 'pl-9',
              className
            )}
            {...props}
          />
          {leftIcon && (
            <div className="absolute left-3 text-[#89949A] pointer-events-none flex items-center">{leftIcon}</div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-[#A61B1B] font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[#5F6B73]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

