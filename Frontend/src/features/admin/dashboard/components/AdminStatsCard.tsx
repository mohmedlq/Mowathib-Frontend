import React from 'react';
import { cn } from '../../../../shared/utils/cn';

export interface AdminStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'danger' | 'teal' | 'neutral';
  };
  onClick?: () => void;
  className?: string;
}

export function AdminStatsCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  onClick,
  className,
}: AdminStatsCardProps) {
  const badgeStyles = {
    success: 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5]',
    warning: 'bg-[#FFF4DA] text-[#855500] border-[#EDD38C]',
    danger: 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]',
    teal: 'bg-[#E8F1F1] text-[#245B63] border-[#CDE0E2]',
    neutral: 'bg-[#F5F7F8] text-[#5F6B73] border-[#DCE3E6]',
  };

  const currentBadgeVariant = badge?.variant || 'neutral';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs transition-all flex flex-col justify-between select-none',
        onClick && 'cursor-pointer hover:border-[#245B63] hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-medium text-[#5F6B73] block">{title}</span>
          <div className="text-2xl font-bold font-mono text-[#17252B] tracking-tight">
            {value}
          </div>
        </div>
        <div className="w-11 h-11 rounded-lg bg-[#E8F1F1] text-[#245B63] flex items-center justify-center shrink-0 border border-[#D2E4E6]/50">
          {icon}
        </div>
      </div>

      {(subtitle || badge) && (
        <div className="mt-3 pt-3 border-t border-[#EEF2F3] flex items-center justify-between text-[11px] gap-2">
          {subtitle && <span className="text-[#5F6B73] truncate">{subtitle}</span>}
          {badge && (
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold border shrink-0',
                badgeStyles[currentBadgeVariant]
              )}
            >
              {badge.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminStatsCard;

