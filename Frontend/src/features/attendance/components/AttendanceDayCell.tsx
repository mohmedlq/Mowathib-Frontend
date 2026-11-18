import { cn } from '../../../shared/utils/cn';
import type { AttendanceStatus } from '../../../shared/types';
import { ATTENDANCE_STATUS_ARABIC } from '../../../shared/types';
import { Check, X, Minus, AlertCircle } from 'lucide-react';

export interface AttendanceDayCellProps {
  dayNumber: number;
  status?: AttendanceStatus;
  recordId?: number;
  attendanceDate?: string;
  onClick?: () => void;
  interactive?: boolean;
  // Backward compatibility
  periodStatuses?: Record<number, { status: AttendanceStatus; recordId?: number }> | { status: AttendanceStatus; recordId?: number };
  onPeriodClick?: (periodNumber: number) => void;
}

export function AttendanceDayCell({
  dayNumber,
  status: propStatus,
  onClick,
  interactive = false,
  periodStatuses,
  onPeriodClick,
}: AttendanceDayCellProps) {
  // Resolve status: either from direct prop or from legacy periodStatuses
  let status: AttendanceStatus = propStatus || 'Unmarked';
  if (!propStatus && periodStatuses) {
    if ('status' in periodStatuses && typeof periodStatuses.status === 'string') {
      status = (periodStatuses as any).status;
    } else if (typeof periodStatuses === 'object') {
      const vals = Object.values(periodStatuses) as Array<{ status: AttendanceStatus }>;
      if (vals.length > 0 && vals[0]?.status) {
        status = vals[0].status;
      }
    }
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (onPeriodClick) {
      onPeriodClick(1);
    }
  };

  const statusStyles: Record<
    AttendanceStatus,
    { bg: string; text: string; border: string; icon: any; label: string }
  > = {
    Present: {
      bg: 'bg-[#E8F5EC] dark:bg-[#122B1E]',
      text: 'text-[#176B3A] dark:text-[#4ADE80]',
      border: 'border-[#B7DEC5] dark:border-[#1B4D32]',
      icon: Check,
      label: ATTENDANCE_STATUS_ARABIC.Present,
    },
    Absent: {
      bg: 'bg-[#FDECEC] dark:bg-[#331518]',
      text: 'text-[#A61B1B] dark:text-[#F87171]',
      border: 'border-[#F1C3C3] dark:border-[#592226]',
      icon: X,
      label: ATTENDANCE_STATUS_ARABIC.Absent,
    },
    Discontinued: {
      bg: 'bg-[#FFF4DA] dark:bg-[#332712]',
      text: 'text-[#855500] dark:text-[#FACC15]',
      border: 'border-[#EDD38C] dark:border-[#594218]',
      icon: AlertCircle,
      label: ATTENDANCE_STATUS_ARABIC.Discontinued,
    },
    Unmarked: {
      bg: 'bg-[#F1F3F5] dark:bg-[#1E292D]',
      text: 'text-[#59636E] dark:text-[#9BAAB1]',
      border: 'border-[#D9DEE3] dark:border-[#2C3C43]',
      icon: Minus,
      label: ATTENDANCE_STATUS_ARABIC.Unmarked,
    },
  };

  const config = statusStyles[status] || statusStyles.Unmarked;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center py-1">
      <button
        type="button"
        onClick={interactive ? handleClick : undefined}
        disabled={!interactive}
        title={`يوم ${dayNumber}: ${config.label}`}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all duration-150 min-w-[76px]',
          config.bg,
          config.text,
          config.border,
          interactive &&
            'cursor-pointer hover:shadow-2xs active:scale-95 hover:brightness-95 focus:ring-2 focus:ring-[#0B5D43]/30 outline-none',
          !interactive && 'cursor-default'
        )}
      >
        <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
        <span className="leading-none text-[11px]">{config.label}</span>
      </button>
    </div>
  );
}

export default AttendanceDayCell;
