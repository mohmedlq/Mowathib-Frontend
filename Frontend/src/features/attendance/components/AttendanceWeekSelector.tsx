import type { AttendanceWeek } from '../../../shared/types';
import { formatArabicDateShort } from '../../../shared/utils/date';

export interface AttendanceWeekSelectorProps {
  weeks: AttendanceWeek[];
  selectedWeekId: number;
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
      <label className="block text-xs font-semibold text-[#17252B] mb-1.5 select-none">
        الأسبوع الدراسي:
      </label>
      <select
        value={selectedWeekId}
        onChange={(e) => onSelectWeek(Number(e.target.value))}
        className="w-full h-10 px-3 bg-white text-[#17252B] text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] focus:ring-1 focus:ring-[#245B63] outline-none cursor-pointer"
      >
        {weeks.map((w) => (
          <option key={w.attendanceWeekId} value={w.attendanceWeekId}>
            الأسبوع {w.weekNumber} ({formatArabicDateShort(w.startDate)} - {formatArabicDateShort(w.endDate)})
          </option>
        ))}
      </select>
    </div>
  );
}

