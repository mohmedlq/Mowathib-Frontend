import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { excelExportService } from '../../../reports/services/excelExportService';
import { buildWeeklyAttendanceRows } from '../../../attendance/utils/matrixBuilder';
import { AttendanceTable } from '../../../attendance';
import { AttendanceWeekSelector } from '../../../attendance';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import {
  CalendarCheck,
  Download,
  Printer,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { formatArabicDateShort } from '../../../../shared/utils/date';
import { useNotifications } from '../../../notifications';
import type { ClassItem } from '../../../../shared/types';

export function AdminWeeklyPreparationPage() {
  const { toast } = useNotifications();
  const [selectedGradeTab, setSelectedGradeTab] = useState<1 | 2 | 3>(1);
  const [selectedWeekId, setSelectedWeekId] = useState<number>(11);
  const [previewClassId, setPreviewClassId] = useState<number | null>(null);
  const [isExportingGrade, setIsExportingGrade] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);

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

  const selectedWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId) || weeks[0];

  // Helper to extract numeric class identifier
  const getClassNum = (c: ClassItem) => {
    if (c.classNumber && !isNaN(Number(c.classNumber))) return Number(c.classNumber);
    const match = String(c.className || '').match(/\d+/);
    if (match) return Number(match[0]);
    return Number(c.classId);
  };

  // Group classes into 3 grades
  const grade1Classes = useMemo(
    () => classes.filter((c) => getClassNum(c) >= 101 && getClassNum(c) <= 110),
    [classes]
  );
  const grade2Classes = useMemo(
    () => classes.filter((c) => getClassNum(c) >= 201 && getClassNum(c) <= 210),
    [classes]
  );
  const grade3Classes = useMemo(
    () => classes.filter((c) => getClassNum(c) >= 301 && getClassNum(c) <= 310),
    [classes]
  );

  const activeGradeClasses = useMemo(() => {
    if (selectedGradeTab === 1) return grade1Classes;
    if (selectedGradeTab === 2) return grade2Classes;
    return grade3Classes;
  }, [selectedGradeTab, grade1Classes, grade2Classes, grade3Classes]);

  const activeGradeName = useMemo(() => {
    if (selectedGradeTab === 1) return 'الصف الأول الثانوي';
    if (selectedGradeTab === 2) return 'الصف الثاني الثانوي';
    return 'الصف الثالث الثانوي';
  }, [selectedGradeTab]);

  // Set default preview class
  const activePreviewClass = useMemo(() => {
    if (previewClassId) {
      const found = activeGradeClasses.find((c) => c.classId === previewClassId);
      if (found) return found;
    }
    return activeGradeClasses[0];
  }, [previewClassId, activeGradeClasses]);

  const effectivePreviewClassId = activePreviewClass?.classId ?? 0;

  // 3. Fetch preview class enrollments & records
  const { data: previewEnrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['enrollments', effectivePreviewClassId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(effectivePreviewClassId),
    enabled: effectivePreviewClassId > 0,
  });

  const { data: previewRecords = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ['attendance_records', effectivePreviewClassId, selectedWeek?.attendanceWeekId],
    queryFn: () =>
      schoolDataService.getAttendanceRecords(effectivePreviewClassId, selectedWeek!.attendanceWeekId),
    enabled: effectivePreviewClassId > 0 && !!selectedWeek?.attendanceWeekId,
  });

  const previewAttendances = useMemo(() => {
    if (!previewEnrollments.length) return [];
    return buildWeeklyAttendanceRows(previewEnrollments, previewRecords);
  }, [previewEnrollments, previewRecords]);

  // Helper to fetch attendance data for multiple classes in batch
  const fetchClassesWeeklyData = async (classList: ClassItem[], weekId: number) => {
    const results = await Promise.all(
      classList.map(async (cls) => {
        const [enrolls, recs] = await Promise.all([
          schoolDataService.getEnrollmentsByClass(cls.classId),
          schoolDataService.getAttendanceRecords(cls.classId, weekId),
        ]);
        const attendances = buildWeeklyAttendanceRows(enrolls, recs);
        return {
          classItem: cls,
          className: String(cls.className || `شعبة ${cls.classId}`),
          classNumber: getClassNum(cls),
          attendances,
        };
      })
    );
    return results;
  };

  // Export 1: Single Grade Workbook (Stacked classes)
  const handleExportCurrentGrade = async () => {
    if (!selectedWeek || activeGradeClasses.length === 0) {
      toast.show('لا توجد بيانات متاحة للتصدير', 'warning');
      return;
    }

    try {
      setIsExportingGrade(true);
      toast.show(`جاري تصدير كشوف ${activeGradeName}...`, 'info');

      const targetWeek = selectedWeek;
      const classesData = await fetchClassesWeeklyData(activeGradeClasses, targetWeek.attendanceWeekId);
      const weekRange = `${formatArabicDateShort(targetWeek.startDate)} - ${formatArabicDateShort(targetWeek.endDate)}`;

      await excelExportService.exportGradeWeeklyPreparation({
        gradeName: activeGradeName,
        weekNumber: targetWeek.weekNumber,
        weekRange,
        academicYear: '1446-1447هـ',
        classesData,
      });

      toast.show(`تم تصدير كشف ${activeGradeName} بنجاح!`, 'success');
    } catch (err: any) {
      console.error('Grade Export Error:', err);
      toast.show(err?.message || 'حدث خطأ أثناء تصدير كشف المرحلة', 'danger');
    } finally {
      setIsExportingGrade(false);
    }
  };

  // Export 2: All 3 Grades Unified Workbook (3 Worksheets)
  const handleExportAllGrades = async () => {
    if (!selectedWeek) {
      toast.show('يرجى تحديد أسبوع دراسي أولاً', 'warning');
      return;
    }

    try {
      setIsExportingAll(true);
      toast.show('جاري تجهيز المصنف المجمع لجميع المراحل الثلاث (قد يستغرق بضع ثوانٍ)...', 'info');

      const targetWeek = selectedWeek;

      const [g1Data, g2Data, g3Data] = await Promise.all([
        fetchClassesWeeklyData(grade1Classes, targetWeek.attendanceWeekId),
        fetchClassesWeeklyData(grade2Classes, targetWeek.attendanceWeekId),
        fetchClassesWeeklyData(grade3Classes, targetWeek.attendanceWeekId),
      ]);

      const weekRange = `${formatArabicDateShort(targetWeek.startDate)} - ${formatArabicDateShort(targetWeek.endDate)}`;

      await excelExportService.exportAllGradesWeeklyPreparation({
        weekNumber: targetWeek.weekNumber,
        weekRange,
        academicYear: '1446-1447هـ',
        gradesData: [
          { gradeName: 'الأول الثانوي', classesData: g1Data },
          { gradeName: 'الثاني الثانوي', classesData: g2Data },
          { gradeName: 'الثالث الثانوي', classesData: g3Data },
        ],
      });

      toast.show('تم تصدير المصنف المتكامل بنجاح (يشمل 3 أوراق عمل للمراحل الثلاث)', 'success');
    } catch (err: any) {
      console.error('All Grades Export Error:', err);
      toast.show(err?.message || 'حدث خطأ أثناء تصدير المصنف المجمع، يرجى المحاولة مرة أخرى', 'danger');
    } finally {
      setIsExportingAll(false);
    }
  };

  const isInitialLoading = isClassesLoading || isWeeksLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B] dark:text-[#F0F4F6]">التحضير الأسبوعي للمراحل الدراسية</h1>
              <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5">
                تصدير وطباعة كشوف التحضير الأسبوعية المعتمدة للمراحل الدراسية الثلاث ومصنف الحضور المتكامل
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
            className="text-xs font-bold"
          >
            طباعة الكشف
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCurrentGrade}
            isLoading={isExportingGrade}
            className="text-xs font-bold"
          >
            تصدير {activeGradeName} (Excel)
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={handleExportAllGrades}
            isLoading={isExportingAll}
            className="text-xs font-bold shadow-xs bg-[#176B3A] hover:bg-[#135830] dark:bg-[#1E7D45] dark:hover:bg-[#176B3A] border-[#135830] dark:border-[#1E7D45]"
          >
            تصدير جميع المراحل (مصنف 3 أوراق عمل)
          </Button>
        </div>
      </div>

      {/* Grade Selector Tabs & Week Selector */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs transition-colors">
        {/* Grade Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => {
              setSelectedGradeTab(1);
              setPreviewClassId(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedGradeTab === 1
                ? 'bg-[#245B63] dark:bg-[#2D727B] text-white shadow-xs'
                : 'bg-[#F5F7F8] dark:bg-[#151E22] text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
            }`}
          >
            <span>الأول الثانوي</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${selectedGradeTab === 1 ? 'bg-white/20 text-white' : 'bg-[#DCE3E6] dark:bg-[#28373D] text-[#5F6B73] dark:text-[#9BAAB1]'}`}>
              {grade1Classes.length} شعب
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedGradeTab(2);
              setPreviewClassId(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedGradeTab === 2
                ? 'bg-[#245B63] dark:bg-[#2D727B] text-white shadow-xs'
                : 'bg-[#F5F7F8] dark:bg-[#151E22] text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
            }`}
          >
            <span>الثاني الثانوي</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${selectedGradeTab === 2 ? 'bg-white/20 text-white' : 'bg-[#DCE3E6] dark:bg-[#28373D] text-[#5F6B73] dark:text-[#9BAAB1]'}`}>
              {grade2Classes.length} شعب
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedGradeTab(3);
              setPreviewClassId(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedGradeTab === 3
                ? 'bg-[#245B63] dark:bg-[#2D727B] text-white shadow-xs'
                : 'bg-[#F5F7F8] dark:bg-[#151E22] text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
            }`}
          >
            <span>الثالث الثانوي</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${selectedGradeTab === 3 ? 'bg-white/20 text-white' : 'bg-[#DCE3E6] dark:bg-[#28373D] text-[#5F6B73] dark:text-[#9BAAB1]'}`}>
              {grade3Classes.length} شعب
            </span>
          </button>
        </div>

        {/* Week Selector */}
        <div className="w-full md:w-72">
          <AttendanceWeekSelector
            weeks={weeks}
            selectedWeekId={selectedWeekId}
            onSelectWeek={setSelectedWeekId}
          />
        </div>
      </div>

      {/* Class Selector Pills within Grade */}
      <div className="bg-white dark:bg-[#182226] p-3 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-[#245B63] dark:text-[#388B96]" />
          <span className="text-xs font-bold text-[#17252B] dark:text-[#F0F4F6]">اختر الشعبة للمعاينة المباشرة:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeGradeClasses.map((c) => (
            <button
              key={c.classId}
              type="button"
              onClick={() => setPreviewClassId(c.classId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                effectivePreviewClassId === c.classId
                  ? 'bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] border-2 border-[#245B63] dark:border-[#388B96]'
                  : 'bg-[#F5F7F8] dark:bg-[#151E22] text-[#5F6B73] dark:text-[#9BAAB1] border border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#EEF2F3] dark:hover:bg-[#212E33]'
              }`}
            >
              {c.className || `شعبة ${c.classId}`}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Section */}
      {isInitialLoading || isEnrollmentsLoading || isRecordsLoading ? (
        <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] p-12 shadow-xs">
          <LoadingState message="جاري تجهيز جدول التحضير الأسبوعي للمعاينة..." />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2F3] dark:border-[#28373D] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">
                  معاينة التحضير: {activePreviewClass?.className || `شعبة ${effectivePreviewClassId}`}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] font-bold">
                  {activeGradeName}
                </span>
              </div>
              <span className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] font-mono mt-0.5 block">
                الأسبوع {selectedWeek?.weekNumber} ({formatArabicDateShort(selectedWeek?.startDate)} - {formatArabicDateShort(selectedWeek?.endDate)})
              </span>
            </div>

            <div className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] font-mono bg-[#F5F7F8] dark:bg-[#151E22] px-3 py-1.5 rounded-lg border border-[#DCE3E6] dark:border-[#28373D]">
              {previewEnrollments.length} طالب مقيد
            </div>
          </div>

          <AttendanceTable
            attendances={previewAttendances}
            weekStartDate={selectedWeek?.startDate}
            interactive={false}
          />
        </div>
      )}
    </div>
  );
}

export default AdminWeeklyPreparationPage;
