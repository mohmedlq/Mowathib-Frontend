import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { attendanceWeeksApi } from '../../../features/attendance-weeks';
import type { AttendanceWeek } from '../../types';
import { formatArabicDateShort, resolveDefaultAttendanceWeek } from '../../utils/date';
import { cn } from '../../utils/cn';

export interface WeekSelectorProps {
  selectedWeekId?: number | null;
  onSelectWeek: (weekId: number, week?: AttendanceWeek) => void;
  weeks?: AttendanceWeek[];
  showDateRange?: boolean;
  disabled?: boolean;
  className?: string;
  autoSelectDefault?: boolean;
}

export function WeekSelector({
  selectedWeekId,
  onSelectWeek,
  weeks: propWeeks,
  showDateRange = false,
  disabled = false,
  className,
  autoSelectDefault = false,
}: WeekSelectorProps) {
  const { data: fetchedWeeks = [], isLoading } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
    enabled: !propWeeks || propWeeks.length === 0,
  });

  const sortedWeeks = useMemo(() => {
    const list = propWeeks && propWeeks.length > 0 ? propWeeks : fetchedWeeks;
    return [...list].sort((a, b) => a.weekNumber - b.weekNumber);
  }, [propWeeks, fetchedWeeks]);

  const activeWeek = useMemo(
    () => resolveDefaultAttendanceWeek(sortedWeeks) || sortedWeeks[0],
    [sortedWeeks]
  );

  const effectiveWeekId =
    selectedWeekId && selectedWeekId > 0
      ? selectedWeekId
      : activeWeek?.attendanceWeekId;

  // Auto-select resolved default week if requested and not yet set
  useEffect(() => {
    if (
      autoSelectDefault &&
      (selectedWeekId === null || selectedWeekId === undefined || selectedWeekId === 0) &&
      activeWeek
    ) {
      onSelectWeek(activeWeek.attendanceWeekId, activeWeek);
    }
  }, [autoSelectDefault, selectedWeekId, activeWeek, onSelectWeek]);

  const currentIndex = useMemo(
    () => sortedWeeks.findIndex((w) => w.attendanceWeekId === effectiveWeekId),
    [sortedWeeks, effectiveWeekId]
  );

  const prevWeek = currentIndex > 0 ? sortedWeeks[currentIndex - 1] : null;
  const nextWeek =
    currentIndex >= 0 && currentIndex < sortedWeeks.length - 1
      ? sortedWeeks[currentIndex + 1]
      : null;

  return (
    <div
      dir="rtl"
      className={cn(
        'flex h-10 items-center overflow-hidden rounded-xl border border-[#B8CFC3] bg-white shadow-xs transition-colors hover:border-[#8AB39F] focus-within:border-[#176B4B] focus-within:ring-2 focus-within:ring-[#176B4B]/20 dark:border-[#304D3F] dark:bg-[#13201A] dark:hover:border-[#446B58] dark:focus-within:border-[#4ADE80] dark:focus-within:ring-[#4ADE80]/20',
        className
      )}
    >
      <button
        type="button"
        disabled={disabled || isLoading || !prevWeek}
        onClick={() => prevWeek && onSelectWeek(prevWeek.attendanceWeekId, prevWeek)}
        title="الأسبوع السابق"
        aria-label="الأسبوع السابق"
        className="flex h-full w-9 shrink-0 cursor-pointer items-center justify-center border-l border-[#C8DDD2] bg-[#EEF6F1] text-[#174E38] transition-colors hover:bg-[#DCEEE4] hover:text-[#0E3A28] disabled:cursor-not-allowed disabled:bg-[#F6F9F7] disabled:text-[#8CA397] disabled:opacity-60 dark:border-[#2C4539] dark:bg-[#182921] dark:text-[#A8C9B8] dark:hover:bg-[#21382D] dark:hover:text-[#7AD4A2] dark:disabled:bg-[#13201A] dark:disabled:opacity-35"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="relative flex h-full min-w-[170px] flex-1 items-center bg-white dark:bg-[#13201A]">
        <Calendar className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#176B4B] dark:text-[#6DD39A]" />
        <select
          aria-label="اختيار الأسبوع الدراسي"
          value={effectiveWeekId ?? ''}
          onChange={(e) => {
            const id = Number(e.target.value);
            const found = sortedWeeks.find((w) => w.attendanceWeekId === id);
            if (id) onSelectWeek(id, found);
          }}
          disabled={disabled || isLoading || sortedWeeks.length === 0}
          className="h-full w-full cursor-pointer appearance-none bg-transparent pl-7 pr-8 text-xs font-extrabold tabular-nums text-[#0F241C] outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#F0F7F3]"
        >
          {isLoading && sortedWeeks.length === 0 ? (
            <option value="">جاري تحميل الأسابيع...</option>
          ) : sortedWeeks.length === 0 ? (
            <option value="">لا توجد أسابيع</option>
          ) : (
            sortedWeeks.map((week) => (
              <option
                key={week.attendanceWeekId}
                value={week.attendanceWeekId}
                className="bg-white font-semibold text-[#0F241C] dark:bg-[#17251F] dark:text-[#F0F7F3]"
              >
                الأسبوع {week.weekNumber}
                {showDateRange
                  ? ` (${formatArabicDateShort(week.startDate)} - ${formatArabicDateShort(week.endDate)})`
                  : ''}
                {week.attendanceWeekId === activeWeek?.attendanceWeekId ? ' (الحالي)' : ''}
              </option>
            ))
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#4E6B5E] dark:text-[#8FB09F]" />
      </div>

      <button
        type="button"
        disabled={disabled || isLoading || !nextWeek}
        onClick={() => nextWeek && onSelectWeek(nextWeek.attendanceWeekId, nextWeek)}
        title="الأسبوع التالي"
        aria-label="الأسبوع التالي"
        className="flex h-full w-9 shrink-0 cursor-pointer items-center justify-center border-r border-[#C8DDD2] bg-[#EEF6F1] text-[#174E38] transition-colors hover:bg-[#DCEEE4] hover:text-[#0E3A28] disabled:cursor-not-allowed disabled:bg-[#F6F9F7] disabled:text-[#8CA397] disabled:opacity-60 dark:border-[#2C4539] dark:bg-[#182921] dark:text-[#A8C9B8] dark:hover:bg-[#21382D] dark:hover:text-[#7AD4A2] dark:disabled:bg-[#13201A] dark:disabled:opacity-35"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
}

export default WeekSelector;