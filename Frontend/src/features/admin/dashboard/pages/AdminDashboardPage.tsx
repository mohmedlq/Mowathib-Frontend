import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  formatArabicDateShort,
  resolveDefaultAttendanceWeek,
  getRiyadhDateOnly,
  calculateDateForDay,
  normalizeDateOnly,
} from '../../../../shared/utils/date';
import {
  GraduationCap,
  Building2,
  CalendarCheck,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  BellRing,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Spinner } from '../../../../shared/components/ui/Spinner';
import { useWeeklyGradesExport } from '../components/useWeeklyGradesExport';

export function AdminDashboardPage() {
  const { isExporting, exportWeeklyGrades } = useWeeklyGradesExport();

  const { data: studentsCount = 0, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students_count'],
    queryFn: () => schoolDataService.getStudentsCount(),
  });

  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { data: activeYear, isLoading: isActiveYearLoading } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => schoolDataService.getActiveAcademicYear(),
  });

  const { data: weeks = [], isLoading: isWeeksLoading } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
  });

  const activeWeek = useMemo(
    () => resolveDefaultAttendanceWeek(weeks) ?? weeks[0] ?? null,
    [weeks]
  );

  const todayStr = useMemo(() => {
    const riyadhToday = getRiyadhDateOnly(new Date());
    if (activeWeek?.startDate && activeWeek?.endDate) {
      const start = normalizeDateOnly(activeWeek.startDate);
      const end = normalizeDateOnly(activeWeek.endDate);
      if (riyadhToday >= start && riyadhToday <= end) return riyadhToday;
    }
    const jsDay = new Date().getDay();
    const schoolDayNum = jsDay >= 0 && jsDay <= 4 ? jsDay + 1 : 1;
    return activeWeek?.startDate
      ? calculateDateForDay(activeWeek.startDate, schoolDayNum)
      : riyadhToday;
  }, [activeWeek]);

  const { data: todayAbsenteesData, isLoading: isTodayAbsentsLoading } = useQuery({
    queryKey: ['dashboard_today_absentees', todayStr],
    queryFn: () =>
      schoolDataService.getPagedAbsentees({
        date: todayStr,
        pageNumber: 1,
        pageSize: 1,
      }),
    enabled: Boolean(todayStr),
    staleTime: 1000 * 60 * 2,
  });

  const todayAbsentsCount = todayAbsenteesData?.totalCount ?? 0;
  const hasAbsentsToday = todayAbsentsCount > 0;
  const isMetadataLoading = isClassesLoading || isWeeksLoading || isActiveYearLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Header with real operational context */}
   

      {/* 2. Urgent Daily Strip: Today's Absences */}
      <section
        aria-label="غياب اليوم"
        className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
          hasAbsentsToday
            ? 'bg-[#FDECEC]/70 dark:bg-[#331518]/60 border-[#FAD9D9] dark:border-[#5C2328]'
            : 'bg-white dark:bg-[#182226] border-[#DCE3E6] dark:border-[#28373D]'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
              hasAbsentsToday
                ? 'bg-[#A61B1B] text-white dark:bg-[#991B1B]'
                : 'bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80]'
            }`}
          >
            <BellRing className="w-5 h-5" />
          </div>

          <div>
            <span className="text-xs font-semibold text-[#5F6B73] dark:text-[#9BAAB1] block">
              غياب اليوم المسجل
            </span>
            <div className="text-xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] mt-0.5 tabular-nums">
              {isTodayAbsentsLoading ? (
                <Spinner size="xs" />
              ) : hasAbsentsToday ? (
                <span className="text-[#A61B1B] dark:text-[#F87171]">
                  {todayAbsentsCount} طالباً غائباً
                </span>
              ) : (
                <span>لا يوجد غياب مسجل اليوم</span>
              )}
            </div>
          </div>
        </div>

        <Link
          to="/admin/send-notifications"
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
            hasAbsentsToday
              ? 'bg-[#A61B1B] hover:bg-[#841212] text-white'
              : 'bg-[#F4F7F8] hover:bg-[#E8EEF0] dark:bg-[#223036] dark:hover:bg-[#2C3E46] text-[#17252B] dark:text-[#F0F4F6]'
          }`}
        >
          <span>إشعارات أولياء الأمور</span>
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </section>

      {/* 3. Primary Daily Workflows */}
      <section aria-label="المهام اليومية" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Record Attendance */}
        <Link
          to="/admin/attendance"
          className="group bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] transition-colors flex flex-col justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">
                رصد ومتابعة الحضور
              </h2>
              <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-1">
                تسجيل حضور الحصص اليومية ومراجعة كشف الغائبين لكل شعبة.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#EEF2F3] dark:border-[#28373D] text-xs font-bold text-[#245B63] dark:text-[#388B96]">
            <span>فتح شاشة الحضور</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Weekly Excel Export (No nested clickables) */}
        <div className="bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">
                التحضير الأسبوعي للمراحل
              </h2>
              <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-1">
                تصدير كشف Excel المعتمد للأول والثاني والثالث الثانوي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-[#EEF2F3] dark:border-[#28373D]">
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={isExporting ? <Spinner size="xs" /> : <Download className="w-4 h-4" />}
              onClick={() =>
                exportWeeklyGrades({
                  classes,
                  activeYear,
                  activeWeek,
                  isLoadingMetadata: isMetadataLoading,
                })
              }
              disabled={isExporting || isMetadataLoading}
              className="bg-[#176B3A] hover:bg-[#135830] dark:bg-[#1E7D45] dark:hover:bg-[#176B3A] border-transparent text-xs font-bold"
            >
              {isExporting ? 'جاري التصدير...' : 'تنزيل Excel'}
            </Button>

            <Link
              to="/admin/weekly-preparation"
              className="mr-auto inline-flex items-center gap-1 text-xs font-bold text-[#5F6B73] hover:text-[#17252B] dark:text-[#9BAAB1] dark:hover:text-[#F0F4F6] transition-colors"
            >
              <span>التفاصيل</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. School Directory (Compact Reference Row) */}
      <section aria-label="بيانات المدرسة" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/admin/students"
          className="group bg-white dark:bg-[#182226] px-5 py-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#F4F7F8] dark:bg-[#223036] text-[#245B63] dark:text-[#388B96] flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#5F6B73] dark:text-[#9BAAB1] block">
                إجمالي الطلاب
              </span>
              <div className="text-xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] tabular-nums">
                {isStudentsLoading ? <Spinner size="xs" /> : `${studentsCount} طالباً`}
              </div>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-[#89949A] group-hover:text-[#245B63] group-hover:-translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/admin/classes"
          className="group bg-white dark:bg-[#182226] px-5 py-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#F4F7F8] dark:bg-[#223036] text-[#245B63] dark:text-[#388B96] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#5F6B73] dark:text-[#9BAAB1] block">
                الشعب الدراسية
              </span>
              <div className="text-xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] tabular-nums">
                {isClassesLoading ? <Spinner size="xs" /> : `${classes.length} شعبة`}
              </div>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-[#89949A] group-hover:text-[#245B63] group-hover:-translate-x-0.5 transition-all" />
        </Link>
      </section>
    </div>
  );
}

export default AdminDashboardPage;