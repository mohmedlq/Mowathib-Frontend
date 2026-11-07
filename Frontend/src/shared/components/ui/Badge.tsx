import React from 'react';
import { cn } from '../../utils/cn';
import {
  type AttendanceStatus,
  type CardRequestStatus,
  ATTENDANCE_STATUS_ARABIC,
  CARD_REQUEST_STATUS_ARABIC,
} from '../../types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'present' | 'absent' | 'unmarked' | 'discontinued' | 'info' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'sm', children, ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md border select-none transition-colors';

  const variants = {
    default: 'bg-[#EEF2F3] dark:bg-[#212E33] text-[#5F6B73] dark:text-[#9BAAB1] border-[#DCE3E6] dark:border-[#28373D]',
    present: 'bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] border-[#B7DEC5] dark:border-[#1B4D32]',
    absent: 'bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] border-[#F1C3C3] dark:border-[#592226]',
    unmarked: 'bg-[#F1F3F5] dark:bg-[#1E292D] text-[#59636E] dark:text-[#9BAAB1] border-[#D9DEE3] dark:border-[#2C3C43]',
    discontinued: 'bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] border-[#EDD38C] dark:border-[#594218]',
    info: 'bg-[#EAF2FF] dark:bg-[#13273D] text-[#28559A] dark:text-[#60A5FA] border-[#C3D9FF] dark:border-[#1E3A5F]',
    warning: 'bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] border-[#EDD38C] dark:border-[#594218]',
    danger: 'bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] border-[#F1C3C3] dark:border-[#592226]',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}

export function AttendanceBadge({ status, size = 'sm' }: { status: AttendanceStatus; size?: 'sm' | 'md' }) {
  const variantMap: Record<AttendanceStatus, BadgeProps['variant']> = {
    Present: 'present',
    Absent: 'absent',
    Unmarked: 'unmarked',
    Discontinued: 'discontinued',
  };

  return (
    <Badge variant={variantMap[status]} size={size}>
      {ATTENDANCE_STATUS_ARABIC[status]}
    </Badge>
  );
}

export function CardRequestBadge({ status, size = 'sm' }: { status: CardRequestStatus; size?: 'sm' | 'md' }) {
  const variantMap: Record<CardRequestStatus, BadgeProps['variant']> = {
    Pending: 'warning',
    Approved: 'present',
    Rejected: 'unmarked',
  };

  return (
    <Badge variant={variantMap[status]} size={size}>
      {CARD_REQUEST_STATUS_ARABIC[status]}
    </Badge>
  );
}
