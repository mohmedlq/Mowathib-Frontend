import { PeriodStatusBox } from './PeriodStatusBox';
import type { AttendanceStatus } from '../../../shared/types';
import { getPeriodsForDay } from '../../../shared/types';

export interface AttendanceDayCellProps {
  dayNumber: number;
  periodStatuses: Record<number, { status: AttendanceStatus; recordId?: number }>;
  onPeriodClick?: (periodNumber: number) => void;
  interactive?: boolean;
}

export function AttendanceDayCell({
  dayNumber,
  periodStatuses,
  onPeriodClick,
  interactive = false,
}: AttendanceDayCellProps) {
  const periods = getPeriodsForDay(dayNumber);

  return (
    <div className="flex items-center justify-center gap-1 py-1">
      {periods.map((period) => {
        const slot = periodStatuses[period];
        const status: AttendanceStatus = slot ? slot.status : 'Unmarked';

        return (
          <PeriodStatusBox
            key={period}
            periodNumber={period}
            status={status}
            interactive={interactive}
            onClick={() => onPeriodClick?.(period)}
          />
        );
      })}
    </div>
  );
}

