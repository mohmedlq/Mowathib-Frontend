import { useState } from 'react';
import { useAuth } from '../../../auth';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  QuickAttendancePanel,
  AttendanceWeekSelector,
  useAttendanceMatrix,
} from '../../../attendance';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { RepresentativeBadge } from '../../../../shared/components/ui/RepresentativeBadge';

export function RepresentativeAttendancePage() {
  const { user } = useAuth();
  const classId = user?.classId || 105;

  const [selectedWeekId, setSelectedWeekId] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const {
    enrollments,
    records,
    isLoading,
    isSaving,
    saveSlot,
  } = useAttendanceMatrix(classId, selectedWeekId);

  const currentWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId);

  return (
    <div className="space-y-6">
      {/* Week Selector Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#17252B]">تسجيل الحضور اليومي للشعبة</h1>
          <p className="text-xs text-[#5F6B73] mt-0.5">
            رصد حضور وغياب الطلاب للحصص الدراسية المعتمدة
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:w-72">
            <AttendanceWeekSelector
              weeks={weeks}
              selectedWeekId={selectedWeekId}
              onSelectWeek={setSelectedWeekId}
            />
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#E8F1F1] border border-[#245B63]/20 text-xs flex items-center gap-2 self-start sm:self-auto sm:mt-5">
            <span className="text-[#5F6B73]">الشعبة:</span>
            <span className="font-bold text-[#245B63]">{user?.className || `شعبة ${classId}`}</span>
            <RepresentativeBadge role={user?.role} />
          </div>
        </div>
      </div>

      {/* Focused Quick Attendance Workflow */}
      {isLoading ? (
        <LoadingState message="جاري تجهيز قائمة طلاب الشعبة..." />
      ) : (
        <QuickAttendancePanel
          classNameTitle={user?.className || `شعبة ${classId}`}
          academicYearName="2026-2027"
          weekNumber={currentWeek?.weekNumber || 1}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
          enrollments={enrollments}
          records={records}
          onSaveSlot={async (day, period, changes) => {
            await saveSlot(day, period, changes);
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

