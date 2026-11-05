import { ATTENDANCE_STATUS_ARABIC, type AttendanceStatus } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';
export function AttendanceLegend({ className }: { className?: string }) {
  const statuses: AttendanceStatus[] = ['Present', 'Absent', 'Discontinued', 'Unmarked'];

  const styles: Record<AttendanceStatus, string> = {
    Present: 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5]',
    Absent: 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]',
    Discontinued: 'bg-[#FFF4DA] text-[#855500] border-[#EDD38C]',
    Unmarked: 'bg-[#F1F3F5] text-[#59636E] border-[#D9DEE3]',
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span className="text-[#5F6B73] font-semibold text-[11px] select-none">دليل الحالات:</span>
      {statuses.map((s) => (
        <div
          key={s}
          className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold select-none',
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
