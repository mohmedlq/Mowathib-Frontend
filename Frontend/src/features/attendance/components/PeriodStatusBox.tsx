import { cn } from '../../../shared/utils/cn';
import type { AttendanceStatus } from '../../../shared/types';
import { ATTENDANCE_STATUS_ARABIC } from '../../../shared/types';

export interface PeriodStatusBoxProps {
  periodNumber: number;
  status: AttendanceStatus;
  onClick?: () => void;
  interactive?: boolean;
  size?: 'sm' | 'md';
}

export function PeriodStatusBox({
  periodNumber,
  status,
  onClick,
  interactive = false,
  size = 'md',
}: PeriodStatusBoxProps) {
  const statusStyles: Record<AttendanceStatus, string> = {
    Present:
      'bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] border-[#B7DEC5] dark:border-[#1B4D32] hover:bg-[#D7EEDB] dark:hover:bg-[#1A3D2A] hover:border-[#176B3A]/40',
    Absent:
      'bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] border-[#F1C3C3] dark:border-[#592226] hover:bg-[#F8D2D2] dark:hover:bg-[#451C20] hover:border-[#A61B1B]/40',
    Discontinued:
      'bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] border-[#EDD38C] dark:border-[#594218] hover:bg-[#FDE6B3] dark:hover:bg-[#453418] hover:border-[#855500]/40',
    Unmarked:
      'bg-[#F1F3F5] dark:bg-[#1E292D] text-[#59636E] dark:text-[#9BAAB1] border-[#D9DEE3] dark:border-[#2C3C43] hover:bg-[#E4E7EA] dark:hover:bg-[#2A393E] hover:border-[#89949A]',
  };

  const sizes = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-7 h-7 text-xs',
  };

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      title={`الحصة ${periodNumber}: ${ATTENDANCE_STATUS_ARABIC[status]}`}
      className={cn(
        'inline-flex items-center justify-center font-bold rounded-[6px] border select-none transition-all duration-100',
        statusStyles[status],
        sizes[size],
        interactive && 'cursor-pointer active:scale-92 hover:shadow-2xs focus:ring-2 focus:ring-[#245B63]/25 outline-none',
        !interactive && 'cursor-default'
      )}
    >
      <span className="font-mono font-bold leading-none">{periodNumber}</span>
    </button>
  );
}

export default PeriodStatusBox;
