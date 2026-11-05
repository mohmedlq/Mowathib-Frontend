import { PeriodStatusBox } from './PeriodStatusBox';
import type { AttendanceStatus } from '../../../shared/types';
import { SCHOOL_PERIODS } from '../../../shared/types';

export interface AttendanceDayCellProps {
  dayNumber: number;
  periodStatuses: Record<number, { status: AttendanceStatus; recordId?: number }>;
  onPeriodClick?: (periodNumber: number) => void;
  interactive?: boolean;
}

export function AttendanceDayCell({
  dayNumber: _dayNumber,
  periodStatuses,
  onPeriodClick,
  interactive = false,
}: AttendanceDayCellProps) {
  return (
    <div className="flex items-center justify-center gap-1 py-1">
      {SCHOOL_PERIODS.map((period) => {
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

