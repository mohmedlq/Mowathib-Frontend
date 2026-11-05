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
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#17252B] mb-1.5 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-10 pr-3 pl-8 py-2 bg-white text-[#17252B] text-sm rounded-lg border border-[#DCE3E6] appearance-none transition-all outline-none cursor-pointer',
              'focus:border-[#245B63] focus:ring-2 focus:ring-[#245B63]/15',
              'disabled:bg-[#EEF2F3] disabled:text-[#89949A] disabled:cursor-not-allowed',
              error && 'border-[#A61B1B] focus:border-[#A61B1B] focus:ring-[#A61B1B]/15',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute left-2.5 text-[#89949A] pointer-events-none flex items-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-[#A61B1B] font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

