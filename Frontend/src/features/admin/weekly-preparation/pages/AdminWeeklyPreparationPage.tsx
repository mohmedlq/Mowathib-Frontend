import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  Layers,
  Printer,
} from 'lucide-react';

import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { excelExportService } from '../../../reports/services/excelExportService';
import { buildWeeklyAttendanceRows } from '../../../attendance/utils/matrixBuilder';
import { AttendanceTable, AttendanceWeekSelector } from '../../../attendance';
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

function getClassNum(c: ClassItem): number {
  if (c.classNumber && !isNaN(Number(c.classNumber))) return Number(c.classNumber);
  const match = String(c.className || '').match(/\d+/);
  return match ? Number(match[0]) : Number(c.classId);
}

function getClassesForGrade(classes: ClassItem[], gradeIndex: 1 | 2 | 3): ClassItem[] {
  return classes.filter((c) => {
    const cnum = getClassNum(c);
    const cstr = String(c.className ?? c.classNumber ?? c.classId);
    if (gradeIndex === 1) {
      return (cnum >= 100 && cnum < 200) || cstr.includes('الأول') || /^1\d{2}/.test(cstr);
    }
    if (gradeIndex === 2) {
      return (cnum >= 200 && cnum < 300) || cstr.includes('الثاني') || /^2\d{2}/.test(cstr);
    }
    return (cnum >= 300 && cnum < 400) || cstr.includes('الثالث') || /^3\d{2}/.test(cstr);
  });
}

// =============================================================================
// Main Page
// =============================================================================

export function AdminWeeklyPreparationPage() {
  const { toast } = useNotifications();
  const [selectedGradeTab, setSelectedGradeTab] = useState<GradeTab>(0);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [previewClassId, setPreviewClassId] = useState<number>(0); // 0 = all in current grade/school
  const [isExportingGrade, setIsExportingGrade] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);

  // Reference Queries
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { data: weeks = [], isLoading: isWeeksLoading } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => schoolDataService.getActiveAcademicYear(),
  });

  const activeWeek = useMemo(() => resolveDefaultAttendanceWeek(weeks), [weeks]);
  const effectiveWeekId = selectedWeekId ?? activeWeek?.attendanceWeekId;
  const selectedWeek =
    weeks.find((w) => w.attendanceWeekId === effectiveWeekId) || activeWeek || weeks[0];

  // Grade Buckets
  const grade1Classes = useMemo(() => getClassesForGrade(classes, 1), [classes]);
  const grade2Classes = useMemo(() => getClassesForGrade(classes, 2), [classes]);
  const grade3Classes = useMemo(() => getClassesForGrade(classes, 3), [classes]);

  const activeGradeClasses = useMemo(() => {
    if (selectedGradeTab === 0) return classes;
    if (selectedGradeTab === 1) return grade1Classes;
    if (selectedGradeTab === 2) return grade2Classes;
    return grade3Classes;
  }, [selectedGradeTab, classes, grade1Classes, grade2Classes, grade3Classes]);

  const activeGradeName = useMemo(() => {
    if (selectedGradeTab === 0) return 'جميع طلاب المدرسة';
    if (selectedGradeTab === 1) return 'الصف الأول الثانوي';
    if (selectedGradeTab === 2) return 'الصف الثاني الثانوي';
    return 'الصف الثالث الثانوي';
  }, [selectedGradeTab]);

  const activePreviewClass = useMemo(
    () => (previewClassId > 0 ? classes.find((c) => c.classId === previewClassId) ?? null : null),
    [previewClassId, classes]
  );

  // Preview Queries
  const { data: rawEnrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['enrollments', previewClassId],
    queryFn: () =>
      previewClassId > 0
        ? schoolDataService.getEnrollmentsByClass(previewClassId)
        : schoolDataService.getAllEnrollments(),
  });

  const { data: rawRecords = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ['attendance_records', previewClassId, selectedWeek?.attendanceWeekId],
    queryFn: () =>
      previewClassId > 0
        ? schoolDataService.getAttendanceRecords(previewClassId, selectedWeek!.attendanceWeekId)
        : schoolDataService.getAttendanceRecordsByWeek(selectedWeek!.attendanceWeekId),
    enabled: Boolean(selectedWeek?.attendanceWeekId),
  });

  // Filter enrollments & records to the active grade when previewing "all classes in grade"
  const { previewEnrollments, previewAttendances } = useMemo(() => {
    let enrollments = rawEnrollments;
    let records = rawRecords;

    if (previewClassId === 0 && selectedGradeTab > 0) {
      const allowedIds = new Set(activeGradeClasses.map((c) => c.classId));
      enrollments = rawEnrollments.filter((e) => allowedIds.has(e.classId));
      records = rawRecords.filter((r) => !r.classId || allowedIds.has(r.classId));
    }

    return {
      previewEnrollments: enrollments,
      previewAttendances: enrollments.length ? buildWeeklyAttendanceRows(enrollments, records) : [],
    };
  }, [rawEnrollments, rawRecords, previewClassId, selectedGradeTab, activeGradeClasses]);

  // Bulk Data Fetcher for Excel Exports
  const fetchClassesWeeklyData = async (
    classList: ClassItem[],
    weekId: number,
    cachedEnrollsMap?: Map<number, ClassEnrollment[]>
  ) => {
    if (!classList.length) return [];

    let enrollsMap = cachedEnrollsMap;
    if (!enrollsMap) {
      const allEnrolls = await schoolDataService.getAllEnrollments().catch(() => []);
      enrollsMap = new Map<number, ClassEnrollment[]>();
      allEnrolls.forEach((item) => {
        const list = enrollsMap!.get(item.classId) || [];
        list.push(item);
        enrollsMap!.set(item.classId, list);
      });
    }

    let weekRecordsByClass: Map<number, typeof rawRecords> | null = null;
    try {
      const allWeekRecs = await schoolDataService.getAttendanceRecordsByWeek(weekId);
      if (allWeekRecs?.length) {
        weekRecordsByClass = new Map();
        allWeekRecs.forEach((r) => {
          if (!r.classId) return;
          const list = weekRecordsByClass!.get(r.classId) || [];
          list.push(r);
          weekRecordsByClass!.set(r.classId, list);
        });
      }
    } catch {
      weekRecordsByClass = null;
    }

    const results: Array<{
      classItem: ClassItem;
      className: string;
      classNumber?: number;
      attendances: StudentWeeklyAttendance[];
    }> = [];

    if (weekRecordsByClass && weekRecordsByClass.size > 0) {
      for (const cls of classList) {
        let enrolls = enrollsMap.get(cls.classId);
        if (!enrolls?.length) {
          enrolls = await schoolDataService.getEnrollmentsByClass(cls.classId).catch(() => []);
        }
        const recs = weekRecordsByClass.get(cls.classId) || [];
        results.push({
          classItem: cls,
          className: String(cls.className || cls.classNumber || `شعبة ${cls.classId}`),
          classNumber: getClassNum(cls),
          attendances: buildWeeklyAttendanceRows(enrolls, recs),
        });
      }
      return results;
    }

    const chunkSize = 5;
    for (let i = 0; i < classList.length; i += chunkSize) {
      const chunk = classList.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (cls) => {
          let enrolls = enrollsMap!.get(cls.classId);
          if (!enrolls?.length) {
            enrolls = await schoolDataService.getEnrollmentsByClass(cls.classId).catch(() => []);
          }
          const recs = await schoolDataService
            .getAttendanceRecords(cls.classId, weekId)
            .catch(() => []);
          return {
            classItem: cls,
            className: String(cls.className || cls.classNumber || `شعبة ${cls.classId}`),
            classNumber: getClassNum(cls),
            attendances: buildWeeklyAttendanceRows(enrolls, recs),
          };
        })
      );
      results.push(...chunkResults);
    }

    return results;
  };

  // Export Single Grade
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
        selectedWeek.attendanceWeekId
      );
      const weekRange = `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(
        selectedWeek.endDate
      )}`;

      await excelExportService.exportGradeWeeklyPreparation({
        gradeName: activeGradeName,
        weekNumber: selectedWeek.weekNumber,
        weekRange,
        academicYear: activeYear?.yearName || '1448-1449هـ',
        classesData,
      });

      toast.show(`تم تصدير كشف ${activeGradeName} بنجاح.`, 'success');
    } catch (err: any) {
      console.error('Grade Export Error:', err);
      toast.show(err?.message || 'حدث خطأ أثناء تصدير كشف المرحلة.', 'danger');
    } finally {
      setIsExportingGrade(false);
    }
  };

  // Export All 3 Grades
  const handleExportAllGrades = async () => {
    if (!selectedWeek) {
      toast.show('يرجى تحديد أسبوع دراسي أولاً.', 'warning');
      return;
    }

    try {
      setIsExportingAll(true);
      toast.show('جاري تجهيز المصنف المجمع للمراحل الثلاث...', 'info');

      const allEnrolls = await schoolDataService.getAllEnrollments().catch(() => []);
      const enrollsMap = new Map<number, ClassEnrollment[]>();
      allEnrolls.forEach((item) => {
        const list = enrollsMap.get(item.classId) || [];
        list.push(item);
        enrollsMap.set(item.classId, list);
      });

      const g1Data = await fetchClassesWeeklyData(
        grade1Classes,
        selectedWeek.attendanceWeekId,
        enrollsMap
      );
      const g2Data = await fetchClassesWeeklyData(
        grade2Classes,
        selectedWeek.attendanceWeekId,
        enrollsMap
      );
      const g3Data = await fetchClassesWeeklyData(
        grade3Classes,
        selectedWeek.attendanceWeekId,
        enrollsMap
      );

      const weekRange = `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(
        selectedWeek.endDate
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
    } catch (err: any) {
      console.error('All Grades Export Error:', err);
      toast.show(err?.message || 'حدث خطأ أثناء تصدير المصنف المجمع.', 'danger');
    } finally {
      setIsExportingAll(false);
    }
  };

  const isLoading = isClassesLoading || isWeeksLoading || isEnrollmentsLoading || isRecordsLoading;

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
    <main dir="rtl" className="min-w-0 space-y-4 pb-8 text-[#20362B] dark:text-[#EAF3ED]">
      {/* 1. Compact Header & Actions */}
      <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3]">
            التحضير الأسبوعي
          </h1>
          <p className="mt-0.5 text-xs text-[#647C70] dark:text-[#9DB5A8]">
            {selectedWeek
              ? `الأسبوع ${selectedWeek.weekNumber} (${formatArabicDateShort(
                  selectedWeek.startDate
                )} - ${formatArabicDateShort(selectedWeek.endDate)})`
              : 'معاينة وتصدير كشوف التحضير الأسبوعية'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Printer className="h-3.5 w-3.5" />}
            onClick={() => window.print()}
            className="h-9 rounded-xl border-[#DCE7E2] bg-white text-xs font-bold text-[#294337] hover:bg-[#F3F7F4] dark:border-[#293E35] dark:bg-[#17251F] dark:text-[#E2F0E7]"
          >
            طباعة
          </Button>

          {selectedGradeTab > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Download className="h-3.5 w-3.5 text-[#176B4B] dark:text-[#6DD39A]" />}
              onClick={handleExportCurrentGrade}
              isLoading={isExportingGrade}
              className="h-9 rounded-xl border-[#CFE2D8] bg-[#F4FAF7] text-xs font-bold text-[#176B4B] hover:bg-[#E7F3EE] dark:border-[#28573D] dark:bg-[#183329] dark:text-[#9BD5B7]"
            >
              تصدير {activeGradeName}
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={handleExportAllGrades}
            isLoading={isExportingAll}
            className="h-9 rounded-xl bg-[#176B4B] text-xs font-bold text-white hover:bg-[#10583C] border-transparent dark:bg-[#23845B] dark:hover:bg-[#2A9669]"
          >
            تصدير جميع المراحل (Excel)
          </Button>
        </div>
      </header>

      {/* 2. Unified Control Bar (Grade + Week + Class Pills) */}
      <section className="rounded-2xl border border-[#DCE7E2] bg-white p-3.5 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-4 space-y-3 print:hidden">
        {/* Row 1: Grade Tabs & Week Selector */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-[#F2F6F4] p-1 dark:bg-[#111D18]">
            {gradeTabs.map((tab) => {
              const active = selectedGradeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedGradeTab(tab.value);
                    setPreviewClassId(0);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'bg-white text-[#176B4B] shadow-2xs dark:bg-[#1F352B] dark:text-[#9BD5B7]'
                      : 'text-[#647C70] hover:text-[#1E3429] dark:text-[#9DB5A8] dark:hover:text-white'
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

          <div className="flex items-center gap-2 lg:w-72">
            <Calendar className="h-4 w-4 shrink-0 text-[#71837A] hidden sm:block" />
            <div className="min-w-0 flex-1">
              <AttendanceWeekSelector
                weeks={weeks}
                selectedWeekId={effectiveWeekId || null}
                onSelectWeek={setSelectedWeekId}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Class Quick-Select Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[#EDF2EF] pt-3 dark:border-[#263B31]">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#647C70] dark:text-[#9DB5A8] ml-1">
            <Layers className="h-3.5 w-3.5" />
            الشعبة:
          </span>

          <button
            type="button"
            aria-pressed={previewClassId === 0}
            onClick={() => setPreviewClassId(0)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              previewClassId === 0
                ? 'bg-[#176B4B] text-white dark:bg-[#23845B]'
                : 'bg-[#F4F7F5] text-[#587268] hover:bg-[#E8F1EC] dark:bg-[#1B2C23] dark:text-[#9DB5A8] dark:hover:bg-[#233A2E]'
            }`}
          >
            الكل
          </button>

          {activeGradeClasses.map((c) => {
            const active = previewClassId === c.classId;
            return (
              <button
                key={c.classId}
                type="button"
                aria-pressed={active}
                onClick={() => setPreviewClassId(c.classId)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  active
                    ? 'bg-[#176B4B] text-white dark:bg-[#23845B]'
                    : 'bg-[#F4F7F5] text-[#587268] hover:bg-[#E8F1EC] dark:bg-[#1B2C23] dark:text-[#9DB5A8] dark:hover:bg-[#233A2E]'
                }`}
              >
                {c.className || `شعبة ${c.classId}`}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Preview Sheet */}
      {isLoading ? (
        <div className="rounded-2xl border border-[#DCE7E2] bg-white p-12 shadow-xs dark:border-[#293E35] dark:bg-[#17251F]">
          <LoadingState message="جاري تجهيز جدول التحضير الأسبوعي..." />
        </div>
      ) : (
        <section className="rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-5 space-y-4 print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF2EF] pb-3 dark:border-[#263B31]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                {previewTitle}
              </h2>
              {selectedWeek && (
                <span className="text-xs text-[#647C70] dark:text-[#9DB5A8]">
                  · الأسبوع {selectedWeek.weekNumber}
                </span>
              )}
            </div>

            <span className="rounded-lg bg-[#F2F6F4] px-2.5 py-1 font-mono text-xs font-bold text-[#31463A] dark:bg-[#1B2C23] dark:text-[#D8E8DE]">
              {previewEnrollments.length} طالب
            </span>
          </div>

          <AttendanceTable
            attendances={previewAttendances}
            weekStartDate={selectedWeek?.startDate}
            interactive={false}
          />
        </section>
      )}
    </main>
  );
}

export default AdminWeeklyPreparationPage;