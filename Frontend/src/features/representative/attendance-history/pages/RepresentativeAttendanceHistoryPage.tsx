import { useState } from 'react';
import { useAuth } from '../../../auth';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  AttendanceTable,
  AttendanceWeekSelector,
  AttendanceProgressSummary,
  useAttendanceMatrix,
} from '../../../attendance';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { History } from 'lucide-react';
import { currentWeek } from '@/shared/services/schoolSettingsService';

export function RepresentativeAttendanceHistoryPage() {
  const { user } = useAuth();
  const classId = user?.classId ||0;

  const [selectedWeekId, setSelectedWeekId] = useState<number>(currentWeek);

  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const {
    matrix,
    overallSummary,
    isLoading,
  } = useAttendanceMatrix(classId, selectedWeekId);

  const selectedWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">سجل الحضور الأسبوعي للشعبة</h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            مراجعة جدول الحضور الكامل لـ <strong className="text-[#17252B]">{user?.className || `شعبة ${classId}`}</strong> خلال الأسابيع الدراسية
          </p>
        </div>

        <div className="w-full sm:w-80">
          <AttendanceWeekSelector
            weeks={weeks}
            selectedWeekId={selectedWeekId}
            onSelectWeek={setSelectedWeekId}
          />
        </div>
      </div>

      {/* Summary */}
      <AttendanceProgressSummary
        totalStudents={overallSummary.totalStudents}
        presentCount={overallSummary.present}
        absentCount={overallSummary.absent}
        discontinuedCount={overallSummary.discontinued}
        unmarkedCount={overallSummary.unmarked}
        label={`إجمالي رصد الأسبوع ${selectedWeek?.weekNumber || 0}`}
      />

      {/* Main Table */}
      {isLoading ? (
        <LoadingState message="جاري استعراض سجل الأسبوع..." />
      ) : (
        <AttendanceTable
          attendances={matrix}
          weekStartDate={selectedWeek?.startDate}
          interactive={false}
        />
      )}
    </div>
  );
}

