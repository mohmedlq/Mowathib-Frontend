import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  FileSpreadsheet,
  Layers,
  Printer,
} from 'lucide-react';

import { classesApi } from '../../../classes/api/classesApi';
import { attendanceWeeksApi } from '../../../attendance-weeks/api/attendanceWeeksApi';
import { academicYearsApi } from '../../../academic-years/api/academicYearsApi';
import { enrollmentsApi } from '../../../enrollments/api/enrollmentsApi';
import { attendanceApi } from '../../../attendance/api/attendanceApi';
import { excelExportService } from '../../../reports/services/excelExportService';
import { buildWeeklyAttendanceRows } from '../../../attendance/utils/matrixBuilder';
import { AttendanceTable } from '../../../attendance';
import { WeekSelector } from '../../../../shared/components/ui/weekselector';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import {
  formatArabicDateShort,
  resolveDefaultAttendanceWeek,
} from '../../../../shared/utils/date';
import { useNotifications } from '../../../notifications';
import type { ClassItem, ClassEnrollment } from '../../../../shared/types';
import type { StudentWeeklyAttendance } from '../../../attendance';

// =============================================================================
// Helpers
// =============================================================================

type GradeTab = 0 | 1 | 2 | 3;

type ClassWeeklyData = {
  classItem: ClassItem;
  className: string;
  classNumber?: number;
  attendances: StudentWeeklyAttendance[];
};

function getClassNum(classItem: ClassItem): number {
  if (classItem.classNumber && !Number.isNaN(Number(classItem.classNumber))) {
    return Number(classItem.classNumber);
  }

  const match = String(classItem.className || '').match(/\d+/);
  return match ? Number(match[0]) : Number(classItem.classId);
}

function getClassesForGrade(
  classes: ClassItem[],
  gradeIndex: 1 | 2 | 3,
): ClassItem[] {
  return classes.filter((classItem) => {
    const classNumber = getClassNum(classItem);
    const classText = String(
      classItem.className ?? classItem.classNumber ?? classItem.classId,
    );

    if (gradeIndex === 1) {
      return (
        (classNumber >= 100 && classNumber < 200) ||
        classText.includes('الأول') ||
        /^1\d{2}/.test(classText)
      );
    }

    if (gradeIndex === 2) {
      return (
        (classNumber >= 200 && classNumber < 300) ||
        classText.includes('الثاني') ||
        /^2\d{2}/.test(classText)
      );
    }

    return (
      (classNumber >= 300 && classNumber < 400) ||
      classText.includes('الثالث') ||
      /^3\d{2}/.test(classText)
    );
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// =============================================================================
// Main Page
// =============================================================================

export function AdminWeeklyPreparationPage() {
  const { toast } = useNotifications();

  const [selectedGradeTab, setSelectedGradeTab] = useState<GradeTab>(0);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [previewClassId, setPreviewClassId] = useState(0);
  const [isExportingGrade, setIsExportingGrade] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);

  // Reference queries
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.getClasses(),
  });

  const { data: weeks = [], isLoading: isWeeksLoading } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(),
  });

  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => academicYearsApi.getActiveAcademicYear(),
  });

  const activeWeek = useMemo(() => resolveDefaultAttendanceWeek(weeks), [weeks]);
  const effectiveWeekId = selectedWeekId ?? activeWeek?.attendanceWeekId;
  const selectedWeek =
    weeks.find((week) => week.attendanceWeekId === effectiveWeekId) ??
    activeWeek ??
    weeks[0];

  // Grade buckets
  const grade1Classes = useMemo(() => getClassesForGrade(classes, 1), [classes]);
  const grade2Classes = useMemo(() => getClassesForGrade(classes, 2), [classes]);
  const grade3Classes = useMemo(() => getClassesForGrade(classes, 3), [classes]);

  const activeGradeClasses = useMemo(() => {
    switch (selectedGradeTab) {
      case 1:
        return grade1Classes;
      case 2:
        return grade2Classes;
      case 3:
        return grade3Classes;
      default:
        return classes;
    }
  }, [selectedGradeTab, classes, grade1Classes, grade2Classes, grade3Classes]);

  const activeGradeName = useMemo(() => {
    switch (selectedGradeTab) {
      case 1:
        return 'الصف الأول الثانوي';
      case 2:
        return 'الصف الثاني الثانوي';
      case 3:
        return 'الصف الثالث الثانوي';
      default:
        return 'جميع طلاب المدرسة';
    }
  }, [selectedGradeTab]);

  const activePreviewClass = useMemo(
    () =>
      previewClassId > 0
        ? classes.find((classItem) => classItem.classId === previewClassId) ?? null
        : null,
    [previewClassId, classes],
  );

  // Preview queries
  const { data: rawEnrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['enrollments', previewClassId],
    queryFn: () =>
      previewClassId > 0
        ? enrollmentsApi.getEnrollmentsByClass(previewClassId)
        : enrollmentsApi.getAllEnrollments(),
  });

  const { data: rawRecords = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ['attendance_records', previewClassId, selectedWeek?.attendanceWeekId],
    queryFn: () =>
      previewClassId > 0
        ? attendanceApi.getAttendanceRecords(
            previewClassId,
            selectedWeek!.attendanceWeekId,
          )
        : attendanceApi.getAttendanceRecordsByWeek(
            selectedWeek!.attendanceWeekId,
          ),
    enabled: Boolean(selectedWeek?.attendanceWeekId),
  });

  // Filter records to the active grade when all classes are selected.
  const { previewEnrollments, previewAttendances } = useMemo(() => {
    let enrollments = rawEnrollments;
    let records = rawRecords;

    if (previewClassId === 0 && selectedGradeTab > 0) {
      const allowedClassIds = new Set(
        activeGradeClasses.map((classItem) => classItem.classId),
      );

      enrollments = rawEnrollments.filter((enrollment) =>
        allowedClassIds.has(enrollment.classId),
      );
      records = rawRecords.filter(
        (record) => !record.classId || allowedClassIds.has(record.classId),
      );
    }

    return {
      previewEnrollments: enrollments,
      previewAttendances: enrollments.length
        ? buildWeeklyAttendanceRows(enrollments, records)
        : [],
    };
  }, [
    rawEnrollments,
    rawRecords,
    previewClassId,
    selectedGradeTab,
    activeGradeClasses,
  ]);

  // Bulk data fetcher for Excel exports
  const fetchClassesWeeklyData = async (
    classList: ClassItem[],
    weekId: number,
    cachedEnrollsMap?: Map<number, ClassEnrollment[]>,
  ): Promise<ClassWeeklyData[]> => {
    if (!classList.length) return [];

    let enrollsMap = cachedEnrollsMap;

    if (!enrollsMap) {
      const allEnrollments = await enrollmentsApi
        .getAllEnrollments()
        .catch(() => []);

      enrollsMap = new Map<number, ClassEnrollment[]>();
      allEnrollments.forEach((enrollment) => {
        const classEnrollments = enrollsMap!.get(enrollment.classId) || [];
        classEnrollments.push(enrollment);
        enrollsMap!.set(enrollment.classId, classEnrollments);
      });
    }

    let weekRecordsByClass: Map<number, typeof rawRecords> | null = null;

    try {
      const allWeekRecords = await attendanceApi.getAttendanceRecordsByWeek(weekId);

      if (allWeekRecords?.length) {
        weekRecordsByClass = new Map();
        allWeekRecords.forEach((record) => {
          if (!record.classId) return;

          const classRecords = weekRecordsByClass!.get(record.classId) || [];
          classRecords.push(record);
          weekRecordsByClass!.set(record.classId, classRecords);
        });
      }
    } catch {
      weekRecordsByClass = null;
    }

    const results: ClassWeeklyData[] = [];

    if (weekRecordsByClass && weekRecordsByClass.size > 0) {
      for (const classItem of classList) {
        let enrollments = enrollsMap.get(classItem.classId);

        if (!enrollments?.length) {
          enrollments = await enrollmentsApi
            .getEnrollmentsByClass(classItem.classId)
            .catch(() => []);
        }

        const classRecords = weekRecordsByClass.get(classItem.classId) || [];
        results.push({
          classItem,
          className: String(
            classItem.className || classItem.classNumber || `شعبة ${classItem.classId}`,
          ),
          classNumber: getClassNum(classItem),
          attendances: buildWeeklyAttendanceRows(enrollments, classRecords),
        });
      }

      return results;
    }

    const chunkSize = 5;

    for (let index = 0; index < classList.length; index += chunkSize) {
      const chunk = classList.slice(index, index + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (classItem) => {
          let enrollments = enrollsMap!.get(classItem.classId);

          if (!enrollments?.length) {
            enrollments = await enrollmentsApi
              .getEnrollmentsByClass(classItem.classId)
              .catch(() => []);
          }

          const records = await attendanceApi
            .getAttendanceRecords(classItem.classId, weekId)
            .catch(() => []);

          return {
            classItem,
            className: String(
              classItem.className || classItem.classNumber || `شعبة ${classItem.classId}`,
            ),
            classNumber: getClassNum(classItem),
            attendances: buildWeeklyAttendanceRows(enrollments, records),
          };
        }),
      );

      results.push(...chunkResults);
    }

    return results;
  };

  // Export selected grade
  const handleExportCurrentGrade = async () => {
    if (!selectedWeek) {
      toast.show('يرجى تحديد أسبوع دراسي أولاً.', 'warning');
      return;
    }

    if (activeGradeClasses.length === 0) {
      toast.show(`لا توجد شعب مسجلة حالياً لـ ${activeGradeName}.`, 'warning');
      return;
    }

    try {
      setIsExportingGrade(true);
      toast.show(`جاري تجهيز كشوف ${activeGradeName}...`, 'info');

      const classesData = await fetchClassesWeeklyData(
        activeGradeClasses,
        selectedWeek.attendanceWeekId,
      );
      const weekRange = `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(
        selectedWeek.endDate,
      )}`;

      await excelExportService.exportGradeWeeklyPreparation({
        gradeName: activeGradeName,
        weekNumber: selectedWeek.weekNumber,
        weekRange,
        academicYear: activeYear?.yearName || '1448-1449هـ',
        classesData,
      });

      toast.show(`تم تصدير كشف ${activeGradeName} بنجاح.`, 'success');
    } catch (error: unknown) {
      console.error('Grade Export Error:', error);
      toast.show(
        getErrorMessage(error, 'حدث خطأ أثناء تصدير كشف المرحلة.'),
        'danger',
      );
    } finally {
      setIsExportingGrade(false);
    }
  };

  // Export all grades
  const handleExportAllGrades = async () => {
    if (!selectedWeek) {
      toast.show('يرجى تحديد أسبوع دراسي أولاً.', 'warning');
      return;
    }

    try {
      setIsExportingAll(true);
      toast.show('جاري تجهيز المصنف المجمع للمراحل الثلاث...', 'info');

      const allEnrollments = await enrollmentsApi
        .getAllEnrollments()
        .catch(() => []);
      const enrollsMap = new Map<number, ClassEnrollment[]>();

      allEnrollments.forEach((enrollment) => {
        const classEnrollments = enrollsMap.get(enrollment.classId) || [];
        classEnrollments.push(enrollment);
        enrollsMap.set(enrollment.classId, classEnrollments);
      });

      const g1Data = await fetchClassesWeeklyData(
        grade1Classes,
        selectedWeek.attendanceWeekId,
        enrollsMap,
      );
      const g2Data = await fetchClassesWeeklyData(
        grade2Classes,
        selectedWeek.attendanceWeekId,
        enrollsMap,
      );
      const g3Data = await fetchClassesWeeklyData(
        grade3Classes,
        selectedWeek.attendanceWeekId,
        enrollsMap,
      );

      const weekRange = `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(
        selectedWeek.endDate,
      )}`;

      await excelExportService.exportAllGradesWeeklyPreparation({
        weekNumber: selectedWeek.weekNumber,
        weekRange,
        academicYear: activeYear?.yearName || '1448-1449هـ',
        gradesData: [
          { gradeName: 'الأول الثانوي', classesData: g1Data },
          { gradeName: 'الثاني الثانوي', classesData: g2Data },
          { gradeName: 'الثالث الثانوي', classesData: g3Data },
        ],
      });

      toast.show('تم تصدير المصنف المجمع (3 أوراق عمل) بنجاح.', 'success');
    } catch (error: unknown) {
      console.error('All Grades Export Error:', error);
      toast.show(
        getErrorMessage(error, 'حدث خطأ أثناء تصدير المصنف المجمع.'),
        'danger',
      );
    } finally {
      setIsExportingAll(false);
    }
  };

  const isLoading =
    isClassesLoading ||
    isWeeksLoading ||
    isEnrollmentsLoading ||
    isRecordsLoading;

  const gradeTabs: Array<{ value: GradeTab; label: string; count: number }> = [
    { value: 0, label: 'جميع المراحل', count: classes.length },
    { value: 1, label: 'الأول الثانوي', count: grade1Classes.length },
    { value: 2, label: 'الثاني الثانوي', count: grade2Classes.length },
    { value: 3, label: 'الثالث الثانوي', count: grade3Classes.length },
  ];

  const previewTitle = activePreviewClass
    ? activePreviewClass.className || `شعبة ${activePreviewClass.classId}`
    : activeGradeName;

  return (
    <main
      dir="rtl"
      className="w-full min-w-0 space-y-4 pb-8 text-[#20362B] dark:text-[#EAF3ED]"
    >
      {/* Page heading and actions */}
      <header className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3] sm:text-2xl">
            التحضير الأسبوعي
          </h1>
          <p className="mt-1 text-xs leading-5 text-[#647C70] dark:text-[#9DB5A8] sm:text-sm">
            {selectedWeek
              ? `الأسبوع ${selectedWeek.weekNumber} (${formatArabicDateShort(
                  selectedWeek.startDate,
                )} - ${formatArabicDateShort(selectedWeek.endDate)})`
              : 'معاينة وتصدير كشوف التحضير الأسبوعية'}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
        

          {selectedGradeTab > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Download className="h-4 w-4 text-[#176B4B] dark:text-[#6DD39A]" />}
              onClick={handleExportCurrentGrade}
              isLoading={isExportingGrade}
              className="h-10 w-full justify-center rounded-xl border-[#CFE2D8] bg-[#F4FAF7] text-xs font-bold text-[#176B4B] hover:bg-[#E7F3EE] dark:border-[#28573D] dark:bg-[#183329] dark:text-[#9BD5B7] sm:w-auto"
            >
              تصدير المرحلة
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={handleExportAllGrades}
            isLoading={isExportingAll}
            className="col-span-2 h-10 w-full justify-center rounded-xl border-transparent bg-[#176B4B] text-xs font-bold text-white hover:bg-[#10583C] dark:bg-[#23845B] dark:hover:bg-[#2A9669] sm:col-span-1 sm:w-auto"
          >
            تصدير جميع المراحل (Excel)
          </Button>
        </div>
      </header>

      {/* Filters */}
      <section className="min-w-0 space-y-4 rounded-2xl border border-[#DCE7E2] bg-white p-3 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-4 print:hidden">
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-end">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold text-[#647C70] dark:text-[#9DB5A8]">
              المرحلة الدراسية
            </p>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex w-max min-w-full items-center gap-1 rounded-xl bg-[#F2F6F4] p-1 dark:bg-[#111D18]">
                {gradeTabs.map((tab) => {
                  const isActive = selectedGradeTab === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setSelectedGradeTab(tab.value);
                        setPreviewClassId(0);
                      }}
                      className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438A69] ${
                        isActive
                          ? 'bg-white text-[#176B4B] shadow-2xs dark:bg-[#1F352B] dark:text-[#9BD5B7]'
                          : 'text-[#647C70] hover:bg-white/70 hover:text-[#1E3429] dark:text-[#9DB5A8] dark:hover:bg-white/5 dark:hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] tabular-nums dark:bg-white/10">
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold text-[#647C70] dark:text-[#9DB5A8]">
              الأسبوع الدراسي
            </p>
            <div className="w-full min-w-0">
              <WeekSelector
                selectedWeekId={effectiveWeekId || null}
                onSelectWeek={setSelectedWeekId}
              />
            </div>
          </div>
        </div>

        {/* Class selector: native select on small screens, chips on desktop */}
        <div className="space-y-2 border-t border-[#EDF2EF] pt-3 dark:border-[#263B31]">
          <label
            htmlFor="weekly-preparation-class"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#647C70] dark:text-[#9DB5A8]"
          >
            <Layers className="h-4 w-4" />
            الشعبة
          </label>

          <select
            id="weekly-preparation-class"
            value={previewClassId}
            onChange={(event) => setPreviewClassId(Number(event.target.value))}
            className="min-h-11 w-full rounded-xl border border-[#DCE7E2] bg-[#F8FAF8] px-3 text-sm font-semibold text-[#294337] outline-none transition focus:border-[#438A69] focus:ring-2 focus:ring-[#438A69]/15 dark:border-[#30483A] dark:bg-[#1B2C23] dark:text-[#E2F0E7] sm:hidden"
          >
            <option value={0}>جميع الشعب</option>
            {activeGradeClasses.map((classItem) => (
              <option key={classItem.classId} value={classItem.classId}>
                {classItem.className || `شعبة ${classItem.classId}`}
              </option>
            ))}
          </select>

          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <button
              type="button"
              aria-pressed={previewClassId === 0}
              onClick={() => setPreviewClassId(0)}
              className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438A69] ${
                previewClassId === 0
                  ? 'bg-[#176B4B] text-white dark:bg-[#23845B]'
                  : 'bg-[#F4F7F5] text-[#587268] hover:bg-[#E8F1EC] dark:bg-[#1B2C23] dark:text-[#9DB5A8] dark:hover:bg-[#233A2E]'
              }`}
            >
              الكل
            </button>

            {activeGradeClasses.map((classItem) => {
              const isActive = previewClassId === classItem.classId;

              return (
                <button
                  key={classItem.classId}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setPreviewClassId(classItem.classId)}
                  className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438A69] ${
                    isActive
                      ? 'bg-[#176B4B] text-white dark:bg-[#23845B]'
                      : 'bg-[#F4F7F5] text-[#587268] hover:bg-[#E8F1EC] dark:bg-[#1B2C23] dark:text-[#9DB5A8] dark:hover:bg-[#233A2E]'
                  }`}
                >
                  {classItem.className || `شعبة ${classItem.classId}`}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Weekly attendance preview */}
      {isLoading ? (
        <div className="rounded-2xl border border-[#DCE7E2] bg-white p-6 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-12">
          <LoadingState message="جاري تجهيز جدول التحضير الأسبوعي..." />
        </div>
      ) : (
        <section className="min-w-0 space-y-4 overflow-hidden rounded-2xl border border-[#DCE7E2] bg-white p-3 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-5 print:border-0 print:p-0 print:shadow-none">
          <div className="flex min-w-0 flex-col gap-2 border-b border-[#EDF2EF] pb-3 dark:border-[#263B31] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="break-words text-sm font-extrabold text-[#1E3429] dark:text-[#F0F7F3] sm:text-base">
                {previewTitle}
              </h2>
              {selectedWeek && (
                <p className="mt-1 text-xs text-[#647C70] dark:text-[#9DB5A8]">
                  الأسبوع {selectedWeek.weekNumber}
                </p>
              )}
            </div>

            <span className="inline-flex min-h-8 w-fit shrink-0 items-center rounded-lg bg-[#F2F6F4] px-3 py-1 font-mono text-xs font-bold text-[#31463A] dark:bg-[#1B2C23] dark:text-[#D8E8DE]">
              {previewEnrollments.length} طالب
            </span>
          </div>

          <p className="text-[11px] text-[#71867A] dark:text-[#9DB5A8] md:hidden">
            اسحب الجدول أفقياً لعرض جميع أيام وفترات الأسبوع.
          </p>

          <div className="-mx-3 max-w-full overflow-x-auto overscroll-x-contain px-3 sm:mx-0 sm:px-0">
            <div className="min-w-[760px] sm:min-w-0">
              <AttendanceTable
                attendances={previewAttendances}
                weekStartDate={selectedWeek?.startDate}
                interactive={false}
              />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default AdminWeeklyPreparationPage;
