import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  AttendanceTable,
  QuickAttendancePanel,
  AttendanceWeekSelector,
  AttendanceClassSelector,
  useAttendanceMatrix,
} from '../../../attendance';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { CalendarCheck, Eye, Edit3 } from 'lucide-react';

export function AdminAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialClassId = Number(searchParams.get('classId')) || 105;

  const [selectedClassId, setSelectedClassId] =
    useState<number>(initialClassId);

  const [selectedWeekId, setSelectedWeekId] =
    useState<number>(11);

  const [viewMode, setViewMode] =
    useState<'matrix' | 'quick'>('matrix');

  // Quick attendance slots
  const [quickDay, setQuickDay] = useState<number>(1);
  const [quickPeriod, setQuickPeriod] = useState<number>(1);

  // Classes query
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  // Attendance weeks query
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  // Attendance Matrix
  const {
    matrix,
    enrollments,
    records,
    isLoading,
    isSaving,
    saveSlot,
  } = useAttendanceMatrix(selectedClassId, selectedWeekId);

  const selectedClass = classes.find(
    (c) => c.classId === selectedClassId
  );

  const selectedWeek = weeks.find(
    (w) => w.attendanceWeekId === selectedWeekId
  );

  // Handlers
  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
    setSearchParams({ classId: String(classId) });
  };

  const handleSlotSelect = (
    _enrollmentId: number,
    dayNumber: number,
    periodNumber: number
  ) => {
    setQuickDay(dayNumber);
    setQuickPeriod(periodNumber);
    setViewMode('quick');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#245B63]" />

            <h1 className="text-xl font-bold text-[#17252B]">
              رصد ومتابعة الحضور الدراسي
            </h1>
          </div>

          <p className="text-xs text-[#5F6B73] mt-1">
            متابعة جدول الحضور الأسبوعي لجميع الفصول أو التحضير السريع للحصص الدراسية
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-[#F5F7F8] p-1 rounded-lg border border-[#DCE3E6] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>جدول الحضور الأسبوعي</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('quick')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'quick'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>نمط التحضير السريع للحصة</span>
          </button>
        </div>
      </div>

      {/* Class and Week Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs">
        <AttendanceClassSelector
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectClass={handleClassChange}
        />

        <AttendanceWeekSelector
          weeks={weeks}
          selectedWeekId={selectedWeekId}
          onSelectWeek={setSelectedWeekId}
        />
      </div>

      {/* Main View Area */}
      {isLoading ? (
        <LoadingState message="جاري تحميل سجلات حضور الفصل المختار..." />
      ) : viewMode === 'matrix' ? (
        <div className="space-y-4">
          <div className="p-3 bg-[#F0F7F7] border border-[#245B63]/20 rounded-xl text-xs text-[#245B63] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#245B63]" />

              <strong>نصيحة للمشرف:</strong>

              يمكنك النقر على أي حصة داخل الجدول للانتقال المباشر وتعديل حالتها في نمط التحضير السريع.
            </span>

            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white border border-[#245B63]/20 self-start sm:self-auto">
              {matrix.length} طالب مقيد
            </span>
          </div>

          <AttendanceTable
            attendances={matrix}
            weekStartDate={selectedWeek?.startDate}
            onSlotSelect={handleSlotSelect}
            interactive={true}
          />
        </div>
      ) : (
        <QuickAttendancePanel
          classNameTitle={selectedClass?.className || 'شعبة 105'}
          weekNumber={selectedWeek?.weekNumber || 11}
          selectedDay={quickDay}
          onSelectDay={setQuickDay}
          selectedPeriod={quickPeriod}
          onSelectPeriod={setQuickPeriod}
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

export default AdminAttendancePage;