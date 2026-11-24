import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  Clock,
  GraduationCap,
  Info,
  User,
  UserCheck,
  UserX,
} from 'lucide-react';

import { useAuth } from '../../../auth';
import { attendanceWeeksApi } from '../../../attendance-weeks/api/attendanceWeeksApi';
import { useAttendanceMatrix } from '../../../attendance';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { resolveDefaultAttendanceWeek } from '../../../../shared/utils/date';
import { SCHOOL_DAYS } from '../../../../shared/types';

export function RepresentativeDashboardPage() {
  const { user } = useAuth();
  const classId = user?.classId ?? 0;
  const isMainRep = user?.role === 'Representative';
  const className =
    user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'الشعبة الدراسية');

  // Saudi School Day (Sunday = 1 ... Thursday = 5; weekends default to Sunday)
  const todayDayNumber = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay >= 0 && jsDay <= 4 ? jsDay + 1 : 1;
  }, []);

  const todaySchoolDay = useMemo(
    () => SCHOOL_DAYS.find((d) => d.dayNumber === todayDayNumber) || SCHOOL_DAYS[0],
    [todayDayNumber]
  );

  const formattedTodayDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());
    } catch {
      return todaySchoolDay.nameAr;
    }
  }, [todaySchoolDay]);

  const { data: weeks = [], isLoading: isLoadingWeeks } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
  });

  const activeWeek = useMemo(() => resolveDefaultAttendanceWeek(weeks) || weeks[0], [weeks]);
  const effectiveWeekId = activeWeek?.attendanceWeekId;

  const {
    enrollments,
    records,
    isLoading: isLoadingAttendance,
  } = useAttendanceMatrix(classId, effectiveWeekId);

  // Per-day and today's attendance statistics (unique students)
  const stats = useMemo(() => {
    const daysStatus: Record<
      number,
      { isRecorded: boolean; absentCount: number; recordedCount: number }
    > = {};

    for (const day of SCHOOL_DAYS) {
      const dayRecords = records.filter((r) => r.dayNumber === day.dayNumber);
      const uniqueAbsents = new Set(
        dayRecords
          .filter((r) => r.status === 'Absent' || r.status === 'Discontinued')
          .map((r) => r.enrollmentId)
      );

      daysStatus[day.dayNumber] = {
        isRecorded: dayRecords.length > 0,
        absentCount: uniqueAbsents.size,
        recordedCount: dayRecords.length,
      };
    }

    const todayStatus = daysStatus[todayDayNumber] ?? {
      isRecorded: false,
      absentCount: 0,
      recordedCount: 0,
    };

    const completedDaysCount = SCHOOL_DAYS.filter(
      (d) => daysStatus[d.dayNumber]?.isRecorded
    ).length;

    return {
      todayStatus,
      daysStatus,
      completedDaysCount,
    };
  }, [records, todayDayNumber]);

  const isInitialLoading = isLoadingWeeks || (Boolean(effectiveWeekId) && isLoadingAttendance);

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-[#DCE7E2] bg-white p-8 dark:border-[#293E35] dark:bg-[#17251F]">
        <MuwathibLoading message="جاري تحميل بيانات الشعبة..." />
      </div>
    );
  }

  const isTodayRecorded = stats.todayStatus.isRecorded;
  const todayAbsents = stats.todayStatus.absentCount;

  return (
    <main
      dir="rtl"
      className="min-w-0 space-y-5 pb-6 text-[#1E3429] transition-colors dark:text-[#EAF3ED]"
    >
      {/* 1. Compact Header */}
      <header className="flex flex-col justify-between gap-2.5 border-b border-[#DCE7E2] pb-4 dark:border-[#263B31] sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3] sm:text-2xl">
            أهلاً بك، {user?.fullName || user?.username}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#587268] dark:text-[#9DB5A8]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Calendar className="h-3.5 w-3.5 text-[#176B4B] dark:text-[#6DD39A]" />
              {formattedTodayDate}
            </span>
            {activeWeek?.weekNumber && (
              <>
                <span aria-hidden="true" className="text-[#B8CBC1] dark:text-[#3A5447]">
                  ·
                </span>
                <span className="font-bold tabular-nums text-[#1E3429] dark:text-[#EAF3ED]">
                  الأسبوع {activeWeek.weekNumber}
                </span>
              </>
            )}
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#CFE2D8] bg-[#EDF6F1] px-3 py-1.5 text-xs font-bold text-[#176B4B] dark:border-[#2C4E3C] dark:bg-[#193226] dark:text-[#8CD9AE]">
          {className} · {isMainRep ? 'العريف الأساسي' : 'نائب العريف'}
        </span>
      </header>

      {/* 2. Primary Focus Card: Theme-Adaptive (Light & Dark Native) */}
      <section
        aria-label="رصد حضور اليوم"
        className="rounded-2xl border border-[#CFE2D8] border-r-4 border-r-[#176B4B] bg-white p-5 shadow-xs transition-colors dark:border-[#294437] dark:border-r-[#4ADE80] dark:bg-[#17251F] sm:p-6"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {isTodayRecorded ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C5E5D1] bg-[#E8F6EE] px-2.5 py-1 text-xs font-bold text-[#176B4B] dark:border-[#27573E] dark:bg-[#193B2A] dark:text-[#6DD39A]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>تم رصد حضور يوم {todaySchoolDay.nameAr}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F3D8A8] bg-[#FFF4E2] px-2.5 py-1 text-xs font-bold text-[#8A5612] dark:border-[#594423] dark:bg-[#332714] dark:text-[#F4C97A]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>بانتظار رصد حضور يوم {todaySchoolDay.nameAr}</span>
                </span>
              )}

              {isTodayRecorded && todayAbsents > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F5C7CA] bg-[#FDECEC] px-2.5 py-1 text-xs font-bold tabular-nums text-[#A61B1B] dark:border-[#5D2A31] dark:bg-[#36181B] dark:text-[#FCA5A5]">
                  <UserX className="h-3.5 w-3.5" />
                  <span>{todayAbsents} غياب اليوم</span>
                </span>
              )}
            </div>

            <h2 className="text-lg font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3] sm:text-xl">
              رصد الحضور اليومي — {className}
            </h2>

            <p className="max-w-xl text-xs leading-6 text-[#526B5F] dark:text-[#A4BDB0] sm:text-sm">
              {isTodayRecorded
                ? todayAbsents > 0
                  ? `تم تسجيل ${todayAbsents} طالب غائب اليوم من أصل ${enrollments.length} طالب. يمكنك مراجعة أو تعديل السجل في أي وقت.`
                  : `جميع طلاب الشعبة (${enrollments.length} طالب) حاضرون حتى الآن. يمكنك مراجعة السجل أو التعديل عند الحاجة.`
                : `ابدأ بتحضير طلاب الشعبة (${enrollments.length} طالب) لتصل حالات الحضور والغياب مباشرة إلى إدارة المدرسة.`}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <Link
              to={`/representative/daily-attendance?day=${todayDayNumber}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#176B4B] px-5 text-sm font-bold text-white transition-colors hover:bg-[#10583C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-[#1E7A53] dark:hover:bg-[#248F62] dark:focus-visible:ring-[#6DD39A] dark:focus-visible:ring-offset-[#17251F]"
            >
              <CalendarCheck className="h-4 w-4" />
              <span>{isTodayRecorded ? 'مراجعة وتعديل اليوم' : 'بدء رصد حضور اليوم'}</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Weekly Progress Strip (Sun - Thu) */}
      <section
        aria-label="أيام الأسبوع الدراسي"
        className="rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors dark:border-[#293E35] dark:bg-[#17251F] sm:p-5"
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
              أيام الأسبوع{' '}
              {activeWeek?.weekNumber ? (
                <span className="tabular-nums">(الأسبوع {activeWeek.weekNumber})</span>
              ) : null}
            </h2>
            <p className="mt-0.5 text-[11px] text-[#587268] dark:text-[#9DB5A8]">
              اضغط على أي يوم للانتقال مباشرة إلى شاشة رصد الحضور
            </p>
          </div>
          <span className="rounded-lg border border-[#E4EDE8] bg-[#F4F7F5] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#294337] dark:border-[#283E34] dark:bg-[#13201A] dark:text-[#D8E8DE]">
            أُنجز {stats.completedDaysCount} من {SCHOOL_DAYS.length} أيام
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {SCHOOL_DAYS.map((day) => {
            const status = stats.daysStatus[day.dayNumber];
            const isRecorded = Boolean(status?.isRecorded);
            const absentCount = status?.absentCount ?? 0;
            const isToday = day.dayNumber === todayDayNumber;

            return (
              <Link
                key={day.dayNumber}
                to={`/representative/daily-attendance?day=${day.dayNumber}`}
                className={`group flex flex-col justify-between gap-2.5 rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:focus-visible:ring-[#6DD39A] ${
                  isToday
                    ? 'border-[#176B4B] bg-[#EEF7F2] dark:border-[#3E9B72] dark:bg-[#1A3327]'
                    : 'border-[#E4EDE8] bg-[#FAFCFA] hover:border-[#B5D2C2] hover:bg-[#F3F8F5] dark:border-[#263B31] dark:bg-[#13201A] dark:hover:border-[#3A5E4B] dark:hover:bg-[#192B22]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
                    {day.nameAr}
                  </span>
                  {isToday && (
                    <span className="rounded bg-[#176B4B] px-1.5 py-0.5 text-[9px] font-bold text-white dark:bg-[#1E7A53]">
                      اليوم
                    </span>
                  )}
                </div>

                <div>
                  {isRecorded ? (
                    absentCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FDECEC] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#A61B1B] dark:bg-[#36181B] dark:text-[#FCA5A5]">
                        {absentCount} غياب
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#E8F6EE] px-2 py-0.5 text-[10px] font-bold text-[#176B4B] dark:bg-[#193B2A] dark:text-[#6DD39A]">
                        <CheckCircle2 className="h-3 w-3" />
                        مكتمل
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EDF1EF] px-2 py-0.5 text-[10px] font-semibold text-[#587268] dark:bg-[#1D2D25] dark:text-[#9DB5A8]">
                      لم يُرصد
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. Secondary Class Tools */}
      <section aria-label="أدوات الشعبة" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/representative/students"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors hover:border-[#176B4B] hover:bg-[#FAFCFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:border-[#293E35] dark:bg-[#17251F] dark:hover:border-[#3E9B72] dark:hover:bg-[#1B2C24] dark:focus-visible:ring-[#6DD39A]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1B3428] dark:text-[#7AD4A2]">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
                طلاب الشعبة
              </p>
              <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-[#587268] dark:text-[#9DB5A8]">
                {enrollments.length} طالب مقيد
              </p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 shrink-0 text-[#7A8F84] transition-colors group-hover:text-[#176B4B] dark:text-[#7B9789] dark:group-hover:text-[#7AD4A2]" />
        </Link>

        <Link
          to="/representative/weekly-attendance"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors hover:border-[#176B4B] hover:bg-[#FAFCFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:border-[#293E35] dark:bg-[#17251F] dark:hover:border-[#3E9B72] dark:hover:bg-[#1B2C24] dark:focus-visible:ring-[#6DD39A]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1B3428] dark:text-[#7AD4A2]">
              <CalendarCheck2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
                السجل الأسبوعي
              </p>
              <p className="mt-0.5 text-[11px] text-[#587268] dark:text-[#9DB5A8]">
                مراجعة سجل الحضور الكامل
              </p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 shrink-0 text-[#7A8F84] transition-colors group-hover:text-[#176B4B] dark:text-[#7B9789] dark:group-hover:text-[#7AD4A2]" />
        </Link>

        {isMainRep ? (
          <Link
            to="/representative/deputy"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors hover:border-[#176B4B] hover:bg-[#FAFCFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:border-[#293E35] dark:bg-[#17251F] dark:hover:border-[#3E9B72] dark:hover:bg-[#1B2C24] dark:focus-visible:ring-[#6DD39A]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1B3428] dark:text-[#7AD4A2]">
                <UserCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
                  إدارة نائب العريف
                </p>
                <p className="mt-0.5 text-[11px] text-[#587268] dark:text-[#9DB5A8]">
                  تعيين وإدارة صلاحية النائب
                </p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-[#7A8F84] transition-colors group-hover:text-[#176B4B] dark:text-[#7B9789] dark:group-hover:text-[#7AD4A2]" />
          </Link>
        ) : (
          <Link
            to="/representative/profile"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors hover:border-[#176B4B] hover:bg-[#FAFCFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:border-[#293E35] dark:bg-[#17251F] dark:hover:border-[#3E9B72] dark:hover:bg-[#1B2C24] dark:focus-visible:ring-[#6DD39A]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1B3428] dark:text-[#7AD4A2]">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
                  الملف الشخصي
                </p>
                <p className="mt-0.5 text-[11px] text-[#587268] dark:text-[#9DB5A8]">
                  بيانات الحساب وكلمة المرور
                </p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-[#7A8F84] transition-colors group-hover:text-[#176B4B] dark:text-[#7B9789] dark:group-hover:text-[#7AD4A2]" />
          </Link>
        )}
      </section>

      {/* 5. Quiet Schedule Reference Footnote */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#DCE7E2] bg-[#F6FAF7] px-4 py-3 text-xs leading-6 text-[#526B5F] transition-colors dark:border-[#263B31] dark:bg-[#14201B] dark:text-[#9DB5A8]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#176B4B] dark:text-[#6DD39A]" />
        <p>
          نظام الحصص الأسبوعي:{' '}
          <strong className="text-[#142B22] dark:text-[#F0F7F3]">7 حصص</strong> أيام الأحد إلى
          الثلاثاء، و<strong className="text-[#142B22] dark:text-[#F0F7F3]">6 حصص</strong> يومي
          الأربعاء والخميس (33 حصة أسبوعياً). تُعتمد السجلات المحفوظة مباشرة لدى إدارة المدرسة.
        </p>
      </div>
    </main>
  );
}

export default RepresentativeDashboardPage;