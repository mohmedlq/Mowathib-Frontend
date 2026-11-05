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
    Present: 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5] hover:bg-[#D7EEDB] hover:border-[#176B3A]/40',
    Absent: 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3] hover:bg-[#F8D2D2] hover:border-[#A61B1B]/40',
    Discontinued: 'bg-[#FFF4DA] text-[#855500] border-[#EDD38C] hover:bg-[#FDE6B3] hover:border-[#855500]/40',
    Unmarked: 'bg-[#F1F3F5] text-[#59636E] border-[#D9DEE3] hover:bg-[#E4E7EA] hover:border-[#89949A]',
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
