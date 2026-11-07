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
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, dir, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '_') : undefined);
    const effectiveDir = dir || (props.type === 'password' || props.type === 'email' ? 'ltr' : undefined);

    return (
      <div className="w-full text-right">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] mb-1.5 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {rightIcon && (
            <div className="absolute right-3 text-[#89949A] dark:text-[#6E7F87] pointer-events-none flex items-center">{rightIcon}</div>
          )}
          <input
            id={inputId}
            ref={ref}
            dir={effectiveDir}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3 py-2 bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6] placeholder-[#89949A] dark:placeholder-[#6E7F87] text-sm rounded-lg border border-[#DCE3E6] dark:border-[#28373D] transition-all outline-none',
              'focus:border-[#245B63] dark:focus:border-[#388B96] focus:ring-2 focus:ring-[#245B63]/15 dark:focus:ring-[#388B96]/20',
              'disabled:bg-[#EEF2F3] dark:disabled:bg-[#212E33] disabled:text-[#89949A] dark:disabled:text-[#6E7F87] disabled:cursor-not-allowed',
              effectiveDir === 'ltr' && 'text-left font-mono',
              error && 'border-[#A61B1B] dark:border-[#F87171] focus:border-[#A61B1B] focus:ring-[#A61B1B]/15',
              rightIcon && 'pr-9',
              leftIcon && 'pl-9',
              className
            )}
            {...props}
          />
          {leftIcon && (
            <div className="absolute left-3 text-[#89949A] dark:text-[#6E7F87] pointer-events-none flex items-center">{leftIcon}</div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-[#A61B1B] dark:text-[#F87171] font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[#5F6B73] dark:text-[#9BAAB1]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
