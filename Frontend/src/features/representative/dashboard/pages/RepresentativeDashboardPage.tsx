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
import { schoolDataService } from '../../../../shared/services/schoolDataService';
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
      return new Intl.DateTimeFormat('ar-SA', {
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
    queryFn: () => schoolDataService.getAttendanceWeeks(),
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
    <main dir="rtl" className="min-w-0 space-y-5 pb-6 text-[#20362B] dark:text-[#EAF3ED]">
      {/* 1. Compact Header */}
      <header className="flex flex-col justify-between gap-2 border-b border-[#DCE7E2] pb-4 dark:border-[#263B31] sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3] sm:text-2xl">
            أهلاً بك، {user?.fullName || user?.username}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#647C70] dark:text-[#9DB5A8]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Calendar className="h-3.5 w-3.5 text-[#176B4B] dark:text-[#6DD39A]" />
              {formattedTodayDate}
            </span>
            {activeWeek?.weekNumber && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-[#20362B] dark:text-[#EAF3ED]">
                  الأسبوع {activeWeek.weekNumber}
                </span>
              </>
            )}
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#D9E7DE] bg-[#F1F7F3] px-3 py-1.5 text-xs font-bold text-[#176B4B] dark:border-[#315540] dark:bg-[#1B3324] dark:text-[#A4D7B9]">
          {className} · {isMainRep ? 'العريف الأساسي' : 'نائب العريف'}
        </span>
      </header>

      {/* 2. Primary Focus Card: Today's Attendance Status & CTA */}
      <section
        aria-label="رصد حضور اليوم"
        className="rounded-2xl border border-[#1E4B39] bg-[#0F2C21] p-5 text-white shadow-xs sm:p-6"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#9BE3B8]">
              {isTodayRecorded ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>تم رصد حضور يوم {todaySchoolDay.nameAr}</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-[#F6CA7A]" />
                  <span className="text-[#F6CA7A]">
                    بانتظار رصد حضور يوم {todaySchoolDay.nameAr}
                  </span>
                </>
              )}
            </div>

            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
              رصد الحضور اليومي — {className}
            </h2>

            <p className="max-w-xl text-xs leading-6 text-[#C7E2D3] sm:text-sm">
              {isTodayRecorded
                ? todayAbsents > 0
                  ? `تم تسجيل ${todayAbsents} طالب غائب اليوم من أصل ${enrollments.length} طالب. يمكنك مراجعة أو تعديل السجل في أي وقت.`
                  : `جميع طلاب الشعبة (${enrollments.length} طالب) حاضرون حتى الآن. يمكنك مراجعة الحصص أو التعديل عند الحاجة.`
                : `ابدأ بتحضير طلاب الشعبة (${enrollments.length} طالب) لتصل حالات الحضور والغياب مباشرة إلى إدارة المدرسة.`}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <Link
              to={`/representative/daily-attendance?day=${todayDayNumber}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#0B4A34] transition-colors hover:bg-[#EAF5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CalendarCheck className="h-4 w-4" />
              <span>{isTodayRecorded ? 'مراجعة وتعديل اليوم' : 'بدء رصد حضور اليوم'}</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {isTodayRecorded && todayAbsents > 0 && (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-[#F9B4B4] tabular-nums">
                <UserX className="h-3.5 w-3.5" />
                <span>{todayAbsents} غياب مسجل اليوم</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Weekly Progress Strip (Sun - Thu) */}
      <section
        aria-label="أيام الأسبوع الدراسي"
        className="rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-5"
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
              أيام الأسبوع {activeWeek?.weekNumber ? `(الأسبوع ${activeWeek.weekNumber})` : ''}
            </h2>
            <p className="mt-0.5 text-[11px] text-[#647C70] dark:text-[#9DB5A8]">
              اضغط على أي يوم للانتقال مباشرة إلى شاشة رصد الحضور
            </p>
          </div>
          <span className="rounded-lg bg-[#F2F6F4] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#31463A] dark:bg-[#1B2C23] dark:text-[#D8E8DE]">
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
                className={`group flex flex-col justify-between gap-2.5 rounded-xl border p-3 transition-colors ${
                  isToday
                    ? 'border-[#176B4B] bg-[#F1F8F4] dark:border-[#4BA87A] dark:bg-[#1A3327]'
                    : 'border-[#E6EFEA] bg-[#FAFCFA] hover:border-[#BFD8CA] hover:bg-[#F3F8F5] dark:border-[#263B31] dark:bg-[#14201B] dark:hover:border-[#3A5E4B]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                    {day.nameAr}
                  </span>
                  {isToday && (
                    <span className="rounded bg-[#176B4B] px-1.5 py-0.5 text-[9px] font-bold text-white dark:bg-[#23845B]">
                      اليوم
                    </span>
                  )}
                </div>

                <div>
                  {isRecorded ? (
                    absentCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FDECEC] px-2 py-0.5 text-[10px] font-bold text-[#A61B1B] dark:bg-[#3A1A1D] dark:text-[#F87171]">
                        {absentCount} غياب
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#E8F6EE] px-2 py-0.5 text-[10px] font-bold text-[#176B4B] dark:bg-[#193B2A] dark:text-[#6DD39A]">
                        <CheckCircle2 className="h-3 w-3" />
                        مكتمل
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#F1F4F2] px-2 py-0.5 text-[10px] font-semibold text-[#647C70] dark:bg-[#1E2E26] dark:text-[#9DB5A8]">
                      لم يُرصد
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. Secondary Class Tools (No Duplicate Daily Attendance Links) */}
      <section aria-label="أدوات الشعبة" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/representative/students"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors hover:border-[#176B4B] dark:border-[#293E35] dark:bg-[#17251F] dark:hover:border-[#4BA87A]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1D3529] dark:text-[#7AD4A2]">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                طلاب الشعبة
              </p>
              <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-[#647C70] dark:text-[#9DB5A8]">
                {enrollments.length} طالب مقيد
              </p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 shrink-0 text-[#87978F] transition-transform group-hover:-translate-x-0.5 group-hover:text-[#176B4B] dark:group-hover:text-[#7AD4A2]" />
        </Link>

        <Link
          to="/representative/weekly-attendance"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors hover:border-[#176B4B] dark:border-[#293E35] dark:bg-[#17251F] dark:hover:border-[#4BA87A]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1D3529] dark:text-[#7AD4A2]">
              <CalendarCheck2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                السجل الأسبوعي
              </p>
              <p className="mt-0.5 text-[11px] text-[#647C70] dark:text-[#9DB5A8]">
                مراجعة سجل الحضور الكامل
              </p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 shrink-0 text-[#87978F] transition-transform group-hover:-translate-x-0.5 group-hover:text-[#176B4B] dark:group-hover:text-[#7AD4A2]" />
        </Link>

        {isMainRep ? (
          <Link
            to="/representative/deputy"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors hover:border-[#176B4B] dark:border-[#293E35] dark:bg-[#17251F] dark:hover:border-[#4BA87A]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1D3529] dark:text-[#7AD4A2]">
                <UserCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                  إدارة نائب العريف
                </p>
                <p className="mt-0.5 text-[11px] text-[#647C70] dark:text-[#9DB5A8]">
                  تعيين وإدارة صلاحية النائب
                </p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-[#87978F] transition-transform group-hover:-translate-x-0.5 group-hover:text-[#176B4B] dark:group-hover:text-[#7AD4A2]" />
          </Link>
        ) : (
          <Link
            to="/representative/profile"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors hover:border-[#176B4B] dark:border-[#293E35] dark:bg-[#17251F] dark:hover:border-[#4BA87A]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1D3529] dark:text-[#7AD4A2]">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                  الملف الشخصي
                </p>
                <p className="mt-0.5 text-[11px] text-[#647C70] dark:text-[#9DB5A8]">
                  بيانات الحساب وكلمة المرور
                </p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-[#87978F] transition-transform group-hover:-translate-x-0.5 group-hover:text-[#176B4B] dark:group-hover:text-[#7AD4A2]" />
          </Link>
        )}
      </section>

      {/* 5. Quiet Schedule Reference Footnote */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#E2ECE6] bg-[#F7FAF8] px-4 py-3 text-xs leading-6 text-[#5E7469] dark:border-[#263B31] dark:bg-[#14201B] dark:text-[#9DB5A8]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#176B4B] dark:text-[#6DD39A]" />
        <p>
          نظام الحصص الأسبوعي:{' '}
          <strong className="text-[#1E3429] dark:text-[#F0F7F3]">7 حصص</strong> أيام الأحد إلى
          الثلاثاء، و<strong className="text-[#1E3429] dark:text-[#F0F7F3]">6 حصص</strong> يومي
          الأربعاء والخميس (33 حصة أسبوعياً). تُعتمد السجلات المحفوظة مباشرة لدى إدارة المدرسة.
        </p>
      </div>
    </main>
  );
}

export default RepresentativeDashboardPage;