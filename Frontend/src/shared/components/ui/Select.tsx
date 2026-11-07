import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, id, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.replace(/\s+/g, '_') : undefined);

    return (
      <div className="w-full text-right">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] mb-1.5 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-10 pr-3 pl-8 py-2 bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6] text-sm rounded-lg border border-[#DCE3E6] dark:border-[#28373D] appearance-none transition-all outline-none cursor-pointer',
              'focus:border-[#245B63] dark:focus:border-[#388B96] focus:ring-2 focus:ring-[#245B63]/15 dark:focus:ring-[#388B96]/20',
              'disabled:bg-[#EEF2F3] dark:disabled:bg-[#212E33] disabled:text-[#89949A] dark:disabled:text-[#6E7F87] disabled:cursor-not-allowed',
              error && 'border-[#A61B1B] dark:border-[#F87171] focus:border-[#A61B1B] focus:ring-[#A61B1B]/15',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute left-2.5 text-[#89949A] dark:text-[#6E7F87] pointer-events-none flex items-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-[#A61B1B] dark:text-[#F87171] font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
