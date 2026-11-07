import React from 'react';
import { cn } from '../../utils/cn';

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#DCE3E6] dark:border-[#28373D] bg-white dark:bg-[#182226] transition-colors">
      <table className={cn('w-full text-right text-sm border-collapse', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('bg-[#EEF2F3] dark:bg-[#212E33] text-[#17252B] dark:text-[#F0F4F6] font-semibold border-b border-[#DCE3E6] dark:border-[#28373D]', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-[#DCE3E6] dark:divide-[#28373D] bg-white dark:bg-[#182226]', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-[#F5F7F8] dark:hover:bg-[#212E33]/60 transition-colors', className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-3 text-xs font-semibold text-[#5F6B73] dark:text-[#9BAAB1] select-none', className)} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-[#17252B] dark:text-[#F0F4F6]', className)} {...props} />;
}
