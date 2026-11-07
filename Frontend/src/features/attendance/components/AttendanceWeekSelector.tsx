import type { AttendanceWeek } from '../../../shared/types';
import { formatArabicDateShort } from '../../../shared/utils/date';

export interface AttendanceWeekSelectorProps {
  weeks: AttendanceWeek[];
  selectedWeekId?: number | null;
  onSelectWeek: (weekId: number) => void;
  className?: string;
}

export function AttendanceWeekSelector({
  weeks,
  selectedWeekId,
  onSelectWeek,
  className,
}: AttendanceWeekSelectorProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] mb-1.5 select-none">
        الأسبوع الدراسي:
      </label>
      <select
        value={selectedWeekId ?? ''}
        onChange={(e) => onSelectWeek(Number(e.target.value))}
        className="w-full h-10 px-3 bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6] text-xs font-medium rounded-lg border border-[#DCE3E6] dark:border-[#28373D] focus:border-[#245B63] dark:focus:border-[#388B96] focus:ring-1 focus:ring-[#245B63] outline-none cursor-pointer transition-colors"
      >
        {weeks.map((w) => (
          <option key={w.attendanceWeekId} value={w.attendanceWeekId} className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
            الأسبوع {w.weekNumber} ({formatArabicDateShort(w.startDate)} - {formatArabicDateShort(w.endDate)})
          </option>
        ))}
      </select>
    </div>
  );
}
