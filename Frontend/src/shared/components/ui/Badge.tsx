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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md border select-none';

  const variants = {
    default: 'bg-[#EEF2F3] text-[#5F6B73] border-[#DCE3E6]',
    present: 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5]',
    absent: 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]',
    unmarked: 'bg-[#F1F3F5] text-[#59636E] border-[#D9DEE3]',
    discontinued: 'bg-[#FFF4DA] text-[#855500] border-[#EDD38C]',
    info: 'bg-[#EAF2FF] text-[#28559A] border-[#C3D9FF]',
    warning: 'bg-[#FFF4DA] text-[#855500] border-[#EDD38C]',
    danger: 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]',
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
    <Badge variant={variantMap[status] || 'default'} size={size}>
      {CARD_REQUEST_STATUS_ARABIC[status] || status}
    </Badge>
  );
}

