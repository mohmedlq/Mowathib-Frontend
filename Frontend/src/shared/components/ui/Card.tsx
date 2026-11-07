import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'outline';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white dark:bg-[#182226] border border-[#DCE3E6] dark:border-[#28373D] rounded-[10px] shadow-2xs transition-colors',
    muted: 'bg-[#F5F7F8] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] rounded-[10px] transition-colors',
    outline: 'bg-transparent border border-[#DCE3E6] dark:border-[#28373D] rounded-[10px] transition-colors',
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4 border-b border-[#DCE3E6] dark:border-[#28373D] flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-[#17252B] dark:text-[#F0F4F6]', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}
