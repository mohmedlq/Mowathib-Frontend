import type { StudentWeeklyAttendance } from '../../attendance';
import { AttendanceTable } from '../../attendance';
import { AttendanceProgressSummary } from '../../attendance';

export interface WeeklyReportViewProps {
  attendances: StudentWeeklyAttendance[];
  weekStartDate?: string;
  weekNumber: number;
  classNameTitle: string;
  isAllClasses?: boolean;
}

export function WeeklyReportView({
  attendances,
  weekStartDate,
  weekNumber,
  classNameTitle,
  isAllClasses = false,
}: WeeklyReportViewProps) {
  // Compute totals
  const totals = attendances.reduce(
    (acc, cur) => {
      acc.present += cur.summary.present;
      acc.absent += cur.summary.absent;
      acc.discontinued += cur.summary.discontinued;
      acc.unmarked += cur.summary.unmarked;
      return acc;
    },
    { present: 0, absent: 0, discontinued: 0, unmarked: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <AttendanceProgressSummary
        totalStudents={attendances.length}
        presentCount={totals.present}
        absentCount={totals.absent}
        discontinuedCount={totals.discontinued}
        unmarkedCount={totals.unmarked}
        label={`إحصائيات الأسبوع ${weekNumber} — ${isAllClasses ? 'جميع فصول المدرسة' : classNameTitle}`}
      />

      {/* Main Weekly Table */}
      <AttendanceTable
        attendances={attendances}
        weekStartDate={weekStartDate}
        interactive={false}
      />
    </div>
  );
}

