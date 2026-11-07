import { ATTENDANCE_STATUS_ARABIC, type AttendanceStatus } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';

export function AttendanceLegend({ className }: { className?: string }) {
  const statuses: AttendanceStatus[] = ['Present', 'Absent', 'Discontinued', 'Unmarked'];

  const styles: Record<AttendanceStatus, string> = {
    Present: 'bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] border-[#B7DEC5] dark:border-[#1B4D32]',
    Absent: 'bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] border-[#F1C3C3] dark:border-[#592226]',
    Discontinued: 'bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] border-[#EDD38C] dark:border-[#594218]',
    Unmarked: 'bg-[#F1F3F5] dark:bg-[#1E292D] text-[#59636E] dark:text-[#9BAAB1] border-[#D9DEE3] dark:border-[#2C3C43]',
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span className="text-[#5F6B73] dark:text-[#9BAAB1] font-semibold text-[11px] select-none">دليل الحالات:</span>
      {statuses.map((s) => (
        <div
          key={s}
          className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold select-none transition-colors',
            styles[s]
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
          <span>{ATTENDANCE_STATUS_ARABIC[s]}</span>
        </div>
      ))}
    </div>
  );
}

export default AttendanceLegend;
