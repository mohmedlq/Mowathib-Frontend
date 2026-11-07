import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { excelExportService } from '../../../reports/services/excelExportService';
import { buildWeeklyAttendanceRows } from '../../../attendance/utils/matrixBuilder';
import { AttendanceTable } from '../../../attendance';
import { AttendanceClassSelector } from '../../../attendance';
import { AttendanceWeekSelector } from '../../../attendance';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import { CalendarRange, Download, Printer, Layers } from 'lucide-react';
import { formatArabicDateShort } from '../../../../shared/utils/date';
import { useNotifications } from '../../../notifications';

export function AdminMonthlyPreparationPage() {
  const { toast } = useNotifications();
  const [selectedClassId, setSelectedClassId] = useState<number>(105);
  const [selectedWeekId, setSelectedWeekId] = useState<number>(11);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Fetch Classes
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  // 2. Fetch Weeks
  const { data: weeks = [], isLoading: isWeeksLoading } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  // Ensure default selections once data loads
  const currentClass = classes.find((c) => c.classId === selectedClassId) || classes[0];
  const effectiveClassId = currentClass?.classId ?? selectedClassId;
  const selectedWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId);

  // 3. Compute 5 Consecutive Weeks (Reference week + 4 preceding weeks)
  const sortedWeeks = useMemo(() => {
    return [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  }, [weeks]);

  const consecutiveWeeks = useMemo(() => {
    if (!sortedWeeks.length) return [];
    const refIndex = sortedWeeks.findIndex((w) => w.attendanceWeekId === selectedWeekId);
    if (refIndex === -1) {
      // If not found, take the last 5 weeks
      return sortedWeeks.slice(Math.max(0, sortedWeeks.length - 5));
    }
    const startIndex = Math.max(0, refIndex - 4);
    return sortedWeeks.slice(startIndex, refIndex + 1);
  }, [sortedWeeks, selectedWeekId]);

  // 4. Fetch Enrollments for Selected Class
  const { data: enrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['enrollments', effectiveClassId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(effectiveClassId),
    enabled: effectiveClassId > 0,
  });

  // 5. Fetch Attendance Records for all 5 weeks
  const week1Id = consecutiveWeeks[0]?.attendanceWeekId;
  const week2Id = consecutiveWeeks[1]?.attendanceWeekId;
  const week3Id = consecutiveWeeks[2]?.attendanceWeekId;
  const week4Id = consecutiveWeeks[3]?.attendanceWeekId;
  const week5Id = consecutiveWeeks[4]?.attendanceWeekId;

  const { data: recordsW1 = [], isLoading: isRec1Loading } = useQuery({
    queryKey: ['attendance_records', effectiveClassId, week1Id],
    queryFn: () => schoolDataService.getAttendanceRecords(effectiveClassId, week1Id!),
    enabled: !!week1Id && effectiveClassId > 0,
  });

  const { data: recordsW2 = [], isLoading: isRec2Loading } = useQuery({
    queryKey: ['attendance_records', effectiveClassId, week2Id],
    queryFn: () => schoolDataService.getAttendanceRecords(effectiveClassId, week2Id!),
    enabled: !!week2Id && effectiveClassId > 0,
  });

  const { data: recordsW3 = [], isLoading: isRec3Loading } = useQuery({
    queryKey: ['attendance_records', effectiveClassId, week3Id],
    queryFn: () => schoolDataService.getAttendanceRecords(effectiveClassId, week3Id!),
    enabled: !!week3Id && effectiveClassId > 0,
  });

  const { data: recordsW4 = [], isLoading: isRec4Loading } = useQuery({
    queryKey: ['attendance_records', effectiveClassId, week4Id],
    queryFn: () => schoolDataService.getAttendanceRecords(effectiveClassId, week4Id!),
    enabled: !!week4Id && effectiveClassId > 0,
  });

  const { data: recordsW5 = [], isLoading: isRec5Loading } = useQuery({
    queryKey: ['attendance_records', effectiveClassId, week5Id],
    queryFn: () => schoolDataService.getAttendanceRecords(effectiveClassId, week5Id!),
    enabled: !!week5Id && effectiveClassId > 0,
  });

  const isDataLoading =
    isClassesLoading ||
    isWeeksLoading ||
    isEnrollmentsLoading ||
    isRec1Loading ||
    isRec2Loading ||
    isRec3Loading ||
    isRec4Loading ||
    isRec5Loading;

  // 6. Build Weekly Attendance Rows for each of the 5 consecutive weeks
  const preparedWeeksData = useMemo(() => {
    if (!enrollments.length || !consecutiveWeeks.length) return [];

    const recsMap: Record<number, typeof recordsW1> = {};
    if (week1Id) recsMap[week1Id] = recordsW1;
    if (week2Id) recsMap[week2Id] = recordsW2;
    if (week3Id) recsMap[week3Id] = recordsW3;
    if (week4Id) recsMap[week4Id] = recordsW4;
    if (week5Id) recsMap[week5Id] = recordsW5;

    return consecutiveWeeks.map((week) => {
      const recs = recsMap[week.attendanceWeekId] || [];
      const attendances = buildWeeklyAttendanceRows(enrollments, recs);
      return {
        week,
        attendances,
      };
    });
  }, [
    enrollments,
    consecutiveWeeks,
    week1Id,
    week2Id,
    week3Id,
    week4Id,
    week5Id,
    recordsW1,
    recordsW2,
    recordsW3,
    recordsW4,
    recordsW5,
  ]);

  // Export to Excel handler
  const handleExportExcel = async () => {
    if (!currentClass || preparedWeeksData.length === 0) {
      toast.show('لا توجد بيانات حضور كافية للتصدير', 'warning');
      return;
    }

    try {
      setIsExporting(true);
      toast.show('جاري إنشاء مصنف التحضير الشهري لـ 5 أسابيع...', 'info');

      const weeksPayload = preparedWeeksData.map(({ week, attendances }) => ({
        weekNumber: week.weekNumber,
        weekRange: `${formatArabicDateShort(week.startDate)} - ${formatArabicDateShort(week.endDate)}`,
        attendances,
      }));

      await excelExportService.exportFiveWeeksMonthlyPreparation({
        className: String(currentClass.className || `شعبة ${effectiveClassId}`),
        classNumber: currentClass.classNumber || effectiveClassId,
        academicYear: '1446-1447هـ',
        referenceWeekNumber: selectedWeek?.weekNumber || 11,
        weeksData: weeksPayload,
      });

      toast.show('تم تصدير كشف التحضير الشهري (5 أسابيع) بنجاح!', 'success');
    } catch (err: any) {
      console.error('Export Five Weeks Monthly Prep Error:', err);
      toast.show(err?.message || 'حدث خطأ أثناء تصدير كشف التحضير الشهري', 'danger');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs no-print transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B] dark:text-[#F0F4F6]">كشف التحضير الشهري (5 أسابيع متتالية)</h1>
              <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5">
                استعراض وطباعة وتصدير سجل الحضور التراكمي للشعبة لـ 5 أسابيع متتالية بنمط التحضير الأسبوعي المعتمد
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
            className="text-xs font-bold"
          >
            طباعة الكشف
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportExcel}
            isLoading={isExporting}
            className="text-xs font-bold shadow-xs"
          >
            تصدير ملف Excel (5 أسابيع)
          </Button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs no-print transition-colors">
        <AttendanceClassSelector
          classes={classes}
          selectedClassId={effectiveClassId}
          onSelectClass={setSelectedClassId}
        />

        <AttendanceWeekSelector
          weeks={sortedWeeks}
          selectedWeekId={selectedWeekId}
          onSelectWeek={setSelectedWeekId}
        />
      </div>

      {/* Info Notice Banner */}
      <div className="p-3.5 bg-[#F0F7F7] dark:bg-[#19383E]/50 border border-[#245B63]/20 dark:border-[#388B96]/30 rounded-xl text-xs text-[#245B63] dark:text-[#52B4C2] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs no-print transition-colors">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 shrink-0 text-[#245B63] dark:text-[#388B96]" />
          <span>
            يتم عرض <strong>{consecutiveWeeks.length} أسابيع متتالية</strong> (الأسبوع المختار و {consecutiveWeeks.length - 1} أسابيع سابقة له) لشعبة <strong>{currentClass?.className || effectiveClassId}</strong>.
          </span>
        </div>
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-[#182226] border border-[#245B63]/20 dark:border-[#388B96]/30 text-[#17252B] dark:text-[#F0F4F6] self-start sm:self-auto">
          {enrollments.length} طالب مقيد
        </span>
      </div>

      {/* Stacked 5 Weekly Preparation Tables */}
      {isDataLoading ? (
        <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] p-12 shadow-xs">
          <LoadingState message="جاري استرجاع سجلات الحضور لـ 5 أسابيع متتالية..." />
        </div>
      ) : consecutiveWeeks.length === 0 ? (
        <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] p-12 text-center text-xs text-[#89949A] dark:text-[#6E7F87]">
          لا توجد أسابيع دراسية متاحة للعرض
        </div>
      ) : (
        <div className="space-y-8">
          {preparedWeeksData.map(({ week, attendances }, idx) => (
            <div
              key={week.attendanceWeekId}
              className="bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs print-section space-y-4 transition-colors"
            >
              {/* Stack Header for each week */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEF2F3] dark:border-[#28373D] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#245B63] text-white flex items-center justify-center font-bold text-xs font-mono">
                    {idx + 1}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">
                      الأسبوع الدراسي {week.weekNumber}
                    </h2>
                    <span className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] font-mono">
                      الفترة: {formatArabicDateShort(week.startDate)} — {formatArabicDateShort(week.endDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded bg-[#F5F7F8] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] font-bold text-[#17252B] dark:text-[#F0F4F6]">
                    {currentClass?.className || `شعبة ${effectiveClassId}`}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#E8F1F1] dark:bg-[#19383E] border border-[#CDE0E2] dark:border-[#28373D] font-bold text-[#245B63] dark:text-[#388B96] font-mono">
                    {attendances.length} طالب
                  </span>
                </div>
              </div>

              {/* Exact Weekly Attendance Table (Read Only) */}
              <AttendanceTable
                attendances={attendances}
                weekStartDate={week.startDate}
                interactive={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminMonthlyPreparationPage;
