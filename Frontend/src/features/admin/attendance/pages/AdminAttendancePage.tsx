import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  FileSpreadsheet,
  UserX,
} from 'lucide-react';

import { classesApi } from '../../../classes/api/classesApi';
import { attendanceWeeksApi } from '../../../attendance-weeks/api/attendanceWeeksApi';
import { academicYearsApi } from '../../../academic-years/api/academicYearsApi';
import { excelExportService } from '../../../reports/services/excelExportService';
import { useNotifications } from '../../../notifications';
import {
  AttendanceTable,
  QuickAttendancePanel,
  useAttendanceMatrix,
} from '../../../attendance';
import { WeekSelector } from '../../../../shared/components/ui/weekselector';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';
import {
  resolveDefaultAttendanceWeek,
  formatArabicDateShort,
} from '../../../../shared/utils/date';
import { SCHOOL_DAYS } from '../../../../shared/types';
import type { ClassItem } from '../../../../shared/types';

// =============================================================================
// Helpers
// =============================================================================

type ViewMode = 'matrix' | 'quick' | 'absences';

const GRADE_OPTIONS = [
  { value: 0, label: 'جميع المراحل' },
  { value: 1, label: 'الأول الثانوي' },
  { value: 2, label: 'الثاني الثانوي' },
  { value: 3, label: 'الثالث الثانوي' },
] as const;

function getClassNum(c: ClassItem): number {
  if (typeof c.classNumber === 'number' && Number.isFinite(c.classNumber)) {
    return c.classNumber;
  }
  const match = String(c.className ?? c.classId ?? '').match(/\d+/);
  return match ? Number(match[0]) : Number(c.classId);
}

function matchesGrade(c: ClassItem, grade: number): boolean {
  if (grade === 0) return true;
  const cnum = getClassNum(c);
  const cstr = String(c.className ?? c.classNumber ?? c.classId);

  if (grade === 1) {
    return (cnum >= 100 && cnum < 200) || cstr.includes('الأول') || /^1\d{2}/.test(cstr);
  }
  if (grade === 2) {
    return (cnum >= 200 && cnum < 300) || cstr.includes('الثاني') || /^2\d{2}/.test(cstr);
  }
  if (grade === 3) {
    return (cnum >= 300 && cnum < 400) || cstr.includes('الثالث') || /^3\d{2}/.test(cstr);
  }
  return true;
}

// =============================================================================
// Main Page
// =============================================================================

export function AdminAttendancePage() {
  const [searchParams] = useSearchParams();
  const { toast } = useNotifications();

  const urlClassParam = searchParams.get('classId');
  const urlDayParam = searchParams.get('day');

  const initialClassId =
    urlClassParam !== null && Number.isFinite(Number(urlClassParam))
      ? Number(urlClassParam)
      : 0;

  const initialDay =
    urlDayParam !== null && Number(urlDayParam) >= 1 && Number(urlDayParam) <= 5
      ? Number(urlDayParam)
      : 1;

  const [selectedClassId, setSelectedClassId] = useState<number>(initialClassId);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>(urlDayParam ? 'quick' : 'matrix');
  const [quickDay, setQuickDay] = useState<number>(initialDay);

  const [absentPage, setAbsentPage] = useState(1);
  const [absentPageSize, setAbsentPageSize] = useState(10);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Reference Queries
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

  // Derived Class & Week
  const gradeFilteredClasses = useMemo(
    () => classes.filter((c) => matchesGrade(c, selectedGrade)),
    [classes, selectedGrade]
  );

  const selectedClass = useMemo(() => {
    if (selectedClassId === 0) return null;
    const pool = gradeFilteredClasses.length > 0 ? gradeFilteredClasses : classes;
    if (pool.length === 0) return undefined;
    return (
      pool.find((c) => c.classId === selectedClassId || getClassNum(c) === selectedClassId) ?? null
    );
  }, [classes, gradeFilteredClasses, selectedClassId]);

  const effectiveClassId =
    selectedClassId === 0 ? 0 : (selectedClass?.classId ?? selectedClassId);

  const activeWeek = useMemo(() => resolveDefaultAttendanceWeek(weeks), [weeks]);
  const selectedWeek = useMemo(() => {
    if (weeks.length === 0) return undefined;
    if (selectedWeekId !== null) {
      const matched = weeks.find((w) => w.attendanceWeekId === selectedWeekId);
      if (matched) return matched;
    }
    return activeWeek || weeks[0];
  }, [weeks, selectedWeekId, activeWeek]);

  const effectiveWeekId = selectedWeek?.attendanceWeekId ?? selectedWeekId ?? undefined;

  // Attendance Matrix
  const {
    matrix,
    enrollments,
    records,
    isLoading: isMatrixLoading,
    isSaving,
    saveSlot,
  } = useAttendanceMatrix(effectiveClassId, effectiveWeekId);

  const isLoading = isClassesLoading || isWeeksLoading || isMatrixLoading;

  const currentScopeLabel =
    effectiveClassId === 0
      ? 'جميع طلاب المدرسة'
      : String(selectedClass?.className || selectedClass?.classNumber || `شعبة ${effectiveClassId}`);

  // Absences Calculation
  const absentStudents = useMemo(() => {
    if (!matrix || matrix.length === 0) return [];

    return matrix
      .map((student) => {
        const absentDetails: Array<{ dayName: string; date?: string }> = [];

        SCHOOL_DAYS.forEach((day) => {
          const slot = student.slots[day.dayNumber];
          if (slot && slot.status === 'Absent') {
            absentDetails.push({ dayName: day.nameAr, date: slot.attendanceDate });
          }
        });

        return {
          enrollment: student.enrollment,
          absentCount: absentDetails.length,
          absentDetails,
        };
      })
      .filter((s) => s.absentCount > 0)
      .sort((a, b) => b.absentCount - a.absentCount);
  }, [matrix]);

  const totalAbsentPages = Math.ceil(absentStudents.length / absentPageSize) || 1;
  const paginatedAbsentStudents = useMemo(() => {
    const start = (absentPage - 1) * absentPageSize;
    return absentStudents.slice(start, start + absentPageSize);
  }, [absentStudents, absentPage, absentPageSize]);

  // Handlers
  const handleClassChange = (newClassId: number) => {
    setSelectedClassId(newClassId);
    setAbsentPage(1);
    const params = new URLSearchParams(window.location.search);
    params.set('classId', String(newClassId));
    window.history.replaceState(null, '', `?${params.toString()}`);
  };

  const handleGradeChange = (grade: number) => {
    setSelectedGrade(grade);
    setAbsentPage(1);
    if (grade === 0) {
      handleClassChange(0);
      return;
    }
    const inGrade = classes.filter((c) => matchesGrade(c, grade));
    if (inGrade.length > 0 && !inGrade.some((c) => c.classId === effectiveClassId)) {
      handleClassChange(inGrade[0].classId);
    }
  };

  const handleSlotSelect = (_enrollmentId: number, dayNumber: number) => {
    setQuickDay(dayNumber);
    setViewMode('quick');
  };

  const handleExportCurrentClass = async () => {
    if (matrix.length === 0) {
      toast.show('لا توجد بيانات حضور متاحة للتصدير.', 'warning');
      return;
    }
    try {
      setIsExportingExcel(true);
      const weekRange = selectedWeek
        ? `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(selectedWeek.endDate)}`
        : '';

      await excelExportService.exportWeeklyAttendance(matrix, {
        className: currentScopeLabel,
        weekNumber: selectedWeek?.weekNumber || 1,
        weekRange,
        academicYear: activeYear?.yearName || '1448-1449هـ',
      });
      toast.show(`تم تصدير كشف حضور ${currentScopeLabel} بنجاح.`, 'success');
    } catch (err: any) {
      console.error('Attendance Export Error:', err);
      toast.show(err?.message || 'حدث خطأ أثناء تصدير كشف الحضور.', 'danger');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <main dir="rtl" className="min-w-0 space-y-4 pb-8 text-[#20362B] dark:text-[#EAF3ED]">
      {/* 1. Compact Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3]">
            الحضور والغياب
          </h1>
          <p className="mt-0.5 text-xs text-[#647C70] dark:text-[#9DB5A8]">
            {currentScopeLabel}
            {selectedWeek && ` · الأسبوع ${selectedWeek.weekNumber}`}
            {!isLoading && ` · ${matrix.length} طالب`}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<FileSpreadsheet className="h-4 w-4 text-[#176B4B] dark:text-[#6DD39A]" />}
          onClick={handleExportCurrentClass}
          isLoading={isExportingExcel}
          className="h-9 rounded-xl border-[#DCE7E2] bg-white text-xs font-bold text-[#294337] hover:bg-[#F0F7F2] dark:border-[#293E35] dark:bg-[#17251F] dark:text-[#E2F0E7] dark:hover:bg-[#1F332A]"
        >
          تصدير Excel
        </Button>
      </header>

      {/* 2. Unified Filter & View Mode Bar */}
      <section className="rounded-2xl border border-[#DCE7E2] bg-white p-3.5 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-4 space-y-3.5">
        {/* Row A: Grade + Class + Week */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Grade Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-[#F2F6F4] p-1 dark:bg-[#111D18]">
            {GRADE_OPTIONS.map((grade) => {
              const active = selectedGrade === grade.value;
              return (
                <button
                  key={grade.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleGradeChange(grade.value)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'bg-white text-[#176B4B] shadow-2xs dark:bg-[#1F352B] dark:text-[#9BD5B7]'
                      : 'text-[#647C70] hover:text-[#1E3429] dark:text-[#9DB5A8] dark:hover:text-white'
                  }`}
                >
                  {grade.label}
                </button>
              );
            })}
          </div>

          {/* Class & Week Selectors */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:w-[500px]">
            <div className="relative">
              <Building2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71837A]" />
              <select
                aria-label="الشعبة الدراسية"
                value={effectiveClassId}
                onChange={(e) => handleClassChange(Number(e.target.value))}
                className="h-10 w-full appearance-none rounded-xl border border-[#DCE7E2] bg-[#FAFCFA] py-2 pl-3 pr-9 text-xs font-bold text-[#1E3429] outline-none transition focus:border-[#176B4B] dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#EAF3ED]"
              >
                <option value={0}>جميع طلاب المدرسة</option>
                {gradeFilteredClasses.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    {c.className || `شعبة ${c.classId}`}
                  </option>
                ))}
              </select>
            </div>

            <WeekSelector
              selectedWeekId={effectiveWeekId || null}
              onSelectWeek={setSelectedWeekId}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        {/* Row B: View Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF2EF] pt-3 dark:border-[#263B31]">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#F2F6F4] p-1 dark:bg-[#111D18]">
            <button
              type="button"
              aria-pressed={viewMode === 'matrix'}
              onClick={() => setViewMode('matrix')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'matrix'
                  ? 'bg-[#176B4B] text-white shadow-2xs dark:bg-[#23845B]'
                  : 'text-[#647C70] hover:text-[#1E3429] dark:text-[#9DB5A8] dark:hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>جدول الأسبوع</span>
            </button>

            <button
              type="button"
              aria-pressed={viewMode === 'quick'}
              onClick={() => setViewMode('quick')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'quick'
                  ? 'bg-[#176B4B] text-white shadow-2xs dark:bg-[#23845B]'
                  : 'text-[#647C70] hover:text-[#1E3429] dark:text-[#9DB5A8] dark:hover:text-white'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>التحضير السريع</span>
            </button>

            <button
              type="button"
              aria-pressed={viewMode === 'absences'}
              onClick={() => setViewMode('absences')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'absences'
                  ? 'bg-[#A61B1B] text-white shadow-2xs dark:bg-[#991B1B]'
                  : 'text-[#647C70] hover:text-[#1E3429] dark:text-[#9DB5A8] dark:hover:text-white'
              }`}
            >
              <UserX className="h-3.5 w-3.5" />
              <span>الغائبون</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                  viewMode === 'absences'
                    ? 'bg-white/20 text-white'
                    : absentStudents.length > 0
                      ? 'bg-[#FDECEC] text-[#A61B1B] dark:bg-[#3A1A1D] dark:text-[#F87171]'
                      : 'bg-black/5 text-[#647C70] dark:bg-white/10 dark:text-[#9DB5A8]'
                }`}
              >
                {absentStudents.length}
              </span>
            </button>
          </div>

          {viewMode === 'matrix' && !isLoading && (
            <span className="text-[11px] text-[#71837A] dark:text-[#9DB5A8]">
              اضغط على أي يوم في الجدول للتعديل السريع
            </span>
          )}
        </div>
      </section>

      {/* 3. Active Workspace */}
      {isLoading ? (
        <div className="rounded-2xl border border-[#DCE7E2] bg-white p-12 shadow-xs dark:border-[#293E35] dark:bg-[#17251F]">
          <LoadingState message="جاري تحميل سجلات الحضور..." />
        </div>
      ) : viewMode === 'matrix' ? (
        <AttendanceTable
          attendances={matrix}
          weekStartDate={selectedWeek?.startDate}
          onSlotSelect={handleSlotSelect}
          interactive={true}
        />
      ) : viewMode === 'quick' ? (
        <QuickAttendancePanel
          classNameTitle={currentScopeLabel}
          attendanceWeekId={effectiveWeekId}
          weekNumber={selectedWeek?.weekNumber || 1}
          selectedDay={quickDay}
          onSelectDay={setQuickDay}
          enrollments={enrollments}
          records={records}
          onSaveSlot={async (day, changes) => {
            await saveSlot(day, changes);
          }}
          isSaving={isSaving}
        />
      ) : (
        /* Absences View */
        <section className="overflow-hidden rounded-2xl border border-[#DCE7E2] bg-white shadow-xs dark:border-[#293E35] dark:bg-[#17251F]">
          {absentStudents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F6EE] text-[#176B4B] dark:bg-[#193B2A] dark:text-[#6DD39A]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-sm font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                لا يوجد غياب مسجل هذا الأسبوع
              </h2>
              <p className="mt-1 text-xs text-[#647C70] dark:text-[#9DB5A8]">
                نسبة الحضور مكتملة 100% في {currentScopeLabel}.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile List */}
              <div className="divide-y divide-[#EDF2EF] dark:divide-[#263B31] md:hidden">
                {paginatedAbsentStudents.map((item) => (
                  <article key={item.enrollment.enrollmentId} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-[#1E3429] dark:text-[#F0F7F3]">
                          {item.enrollment.studentName}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-[#647C70] dark:text-[#9DB5A8]">
                          {effectiveClassId === 0 && (
                            <span className="font-bold text-[#176B4B] dark:text-[#6DD39A]">
                              {item.enrollment.className ||
                                (item.enrollment.classNumber
                                  ? `شعبة ${item.enrollment.classNumber}`
                                  : '—')}
                              {' · '}
                            </span>
                          )}
                          <span className="font-mono">
                            {item.enrollment.student?.nationalId || '—'}
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#FDECEC] px-2.5 py-0.5 text-[11px] font-bold text-[#A61B1B] dark:bg-[#3A1A1D] dark:text-[#F87171]">
                        {item.absentCount} يوم
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {item.absentDetails.map((det, dIdx) => (
                        <span
                          key={dIdx}
                          className="inline-flex items-center gap-1 rounded-md border border-[#E8EFEB] bg-[#FAFCFA] px-2 py-0.5 text-[11px] dark:border-[#2B4136] dark:bg-[#1B2C23]"
                        >
                          <span className="font-bold text-[#A61B1B] dark:text-[#F87171]">
                            {det.dayName}
                          </span>
                          {det.date && (
                            <span className="font-mono text-[10px] text-[#647C70] dark:text-[#9DB5A8]">
                              {det.date}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F7FAF8] text-[11px] font-bold text-[#647C70] dark:bg-[#14201B] dark:text-[#9DB5A8]">
                    <tr className="border-b border-[#E9EFEC] dark:border-[#263B31]">
                      <th className="w-12 px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3">اسم الطالب</th>
                      <th className="px-4 py-3">الهوية الوطنية</th>
                      {effectiveClassId === 0 && <th className="w-28 px-4 py-3">الشعبة</th>}
                      <th className="px-4 py-3 text-center">أيام الغياب</th>
                      <th className="px-4 py-3">تفاصيل الأيام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF2EF] dark:divide-[#263B31]">
                    {paginatedAbsentStudents.map((item, idx) => (
                      <tr
                        key={item.enrollment.enrollmentId}
                        className="transition-colors hover:bg-[#FAFCFA] dark:hover:bg-[#1B2C24]"
                      >
                        <td className="px-4 py-3 text-center font-mono text-[#71837A] dark:text-[#9DB5A8]">
                          {(absentPage - 1) * absentPageSize + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#1E3429] dark:text-[#F0F7F3]">
                          {item.enrollment.studentName}
                        </td>
                        <td className="px-4 py-3 font-mono text-[#647C70] dark:text-[#9DB5A8]">
                          {item.enrollment.student?.nationalId || '—'}
                        </td>
                        {effectiveClassId === 0 && (
                          <td className="px-4 py-3 font-bold text-[#176B4B] dark:text-[#6DD39A]">
                            {item.enrollment.className ||
                              (item.enrollment.classNumber
                                ? `شعبة ${item.enrollment.classNumber}`
                                : '—')}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block rounded-full bg-[#FDECEC] px-2.5 py-0.5 font-mono text-xs font-bold text-[#A61B1B] dark:bg-[#3A1A1D] dark:text-[#F87171]">
                            {item.absentCount} يوم
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.absentDetails.map((det, dIdx) => (
                              <span
                                key={dIdx}
                                className="inline-flex items-center gap-1 rounded-md border border-[#E8EFEB] bg-[#FAFCFA] px-2 py-0.5 text-[11px] dark:border-[#2B4136] dark:bg-[#1B2C23]"
                              >
                                <span className="font-bold text-[#A61B1B] dark:text-[#F87171]">
                                  {det.dayName}
                                </span>
                                {det.date && (
                                  <span className="font-mono text-[10px] text-[#647C70] dark:text-[#9DB5A8]">
                                    {det.date}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {absentStudents.length > absentPageSize && (
                <div className="border-t border-[#E9EFEC] px-3 py-3 dark:border-[#263B31] sm:px-4">
                  <PaginationControls
                    pageNumber={absentPage}
                    totalPages={totalAbsentPages}
                    totalCount={absentStudents.length}
                    pageSize={absentPageSize}
                    onPageChange={setAbsentPage}
                    onPageSizeChange={(newSize) => {
                      setAbsentPageSize(newSize);
                      setAbsentPage(1);
                    }}
                    itemLabel="طالب متغيب"
                  />
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default AdminAttendancePage;