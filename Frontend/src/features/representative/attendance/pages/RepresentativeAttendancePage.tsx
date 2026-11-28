import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

import { useAuth } from '../../../auth';
import { attendanceWeeksApi } from '../../../attendance-weeks/api/attendanceWeeksApi';
import { QuickAttendancePanel, useAttendanceMatrix } from '../../../attendance';
import { WeekSelector } from '../../../../shared/components/ui/weekselector';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import {
  formatArabicDateShort,
  resolveDefaultAttendanceWeek,
} from '../../../../shared/utils/date';
import { SCHOOL_DAYS } from '../../../../shared/types';

function getInitialSaudiDay(): number {
  const jsDay = new Date().getDay(); // 0: Sun ... 4: Thu
  return jsDay >= 0 && jsDay <= 4 ? jsDay + 1 : 1;
}

export function RepresentativeAttendancePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const classId = user?.classId ?? 0;
  const className =
    user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'الشعبة الدراسية');

  const todayDayNumber = useMemo(() => getInitialSaudiDay(), []);
  const paramDay = Number(searchParams.get('day'));

  const [selectedDay, setSelectedDay] = useState<number>(() =>
    Number.isInteger(paramDay) && paramDay >= 1 && paramDay <= 5 ? paramDay : todayDayNumber
  );
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  const {
    data: weeks = [],
    isLoading: isLoadingWeeks,
    isError: isWeeksError,
    refetch: refetchWeeks,
  } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
  });

  const sortedWeeks = useMemo(
    () => [...weeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [weeks]
  );

  const activeWeek = useMemo(
    () => resolveDefaultAttendanceWeek(sortedWeeks) || sortedWeeks[0],
    [sortedWeeks]
  );

  const selectedWeek = useMemo(() => {
    if (selectedWeekId !== null) {
      return sortedWeeks.find((w) => w.attendanceWeekId === selectedWeekId) ?? activeWeek;
    }
    return activeWeek;
  }, [sortedWeeks, selectedWeekId, activeWeek]);

  const effectiveWeekId = selectedWeek?.attendanceWeekId;

  const {
    enrollments,
    records,
    isLoading: isLoadingMatrix,
    isSaving,
    saveSlot,
  } = useAttendanceMatrix(classId, effectiveWeekId);

  const selectedDayInfo = useMemo(
    () => SCHOOL_DAYS.find((d) => d.dayNumber === selectedDay) || SCHOOL_DAYS[0],
    [selectedDay]
  );

  const selectedDayStatus = useMemo(() => {
    const dayRecords = records.filter((r) => r.dayNumber === selectedDay);
    const absentCount = new Set(
      dayRecords
        .filter((r) => r.status === 'Absent' || r.status === 'Discontinued')
        .map((r) => r.enrollmentId)
    ).size;

    return {
      isRecorded: dayRecords.length > 0,
      absentCount,
    };
  }, [records, selectedDay]);

  const isViewingDefaultToday =
    selectedDay === todayDayNumber &&
    (!activeWeek || effectiveWeekId === activeWeek.attendanceWeekId);

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    setSearchParams({ day: String(day) }, { replace: true });
  };

  const handleResetToToday = () => {
    if (activeWeek) {
      setSelectedWeekId(activeWeek.attendanceWeekId);
    }
    handleSelectDay(todayDayNumber);
  };

  const isPageLoading = isLoadingWeeks || (Boolean(effectiveWeekId) && isLoadingMatrix);

  return (
    <main
      dir="rtl"
      className="min-w-0 space-y-4 pb-8 text-[#1E3429] transition-colors dark:text-[#EAF3ED]"
    >
      {/* Unified Top Toolbar — Pixel-Aligned Controls */}
      <section
        aria-label="شريط التحكم بالحضور اليومي"
        className="rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-xs transition-colors dark:border-[#293E35] dark:bg-[#17251F] sm:px-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Right Side: Context & Live Day Status */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3] sm:text-xl">
                رصد الحضور اليومي
              </h1>

              <span className="inline-flex items-center rounded-lg border border-[#CFE2D8] bg-[#EDF6F1] px-2.5 py-0.5 text-xs font-bold text-[#176B4B] dark:border-[#2C4E3C] dark:bg-[#193226] dark:text-[#8CD9AE]">
                {className}
              </span>

              {!isPageLoading && effectiveWeekId && (
                selectedDayStatus.isRecorded ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[#C5E5D1] bg-[#E8F6EE] px-2.5 py-0.5 text-[11px] font-bold text-[#176B4B] dark:border-[#27573E] dark:bg-[#193B2A] dark:text-[#6DD39A]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      تم رصد {selectedDayInfo.nameAr}
                      {selectedDayStatus.absentCount > 0
                        ? ` (${selectedDayStatus.absentCount} غياب)`
                        : ''}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[#F3D8A8] bg-[#FFF4E2] px-2.5 py-0.5 text-[11px] font-bold text-[#8A5612] dark:border-[#594423] dark:bg-[#332714] dark:text-[#F4C97A]">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{selectedDayInfo.nameAr} لم يُرصد بعد</span>
                  </span>
                )
              )}
            </div>

            {selectedWeek && (
              <p className="text-xs text-[#587268] dark:text-[#9DB5A8] tabular-nums">
                الأسبوع {selectedWeek.weekNumber}
                {selectedWeek.startDate && selectedWeek.endDate && (
                  <>
                    {' · '}
                    <span dir="ltr" className="inline-block">
                      {formatArabicDateShort(selectedWeek.startDate)} -{' '}
                      {formatArabicDateShort(selectedWeek.endDate)}
                    </span>
                  </>
                )}
                {!isPageLoading && ` · ${enrollments.length} طالب`}
              </p>
            )}
          </div>

          {/* Left Side: Perfectly Aligned h-10 Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Week Stepper + Native Select (Exact h-10) */}
            <WeekSelector
              selectedWeekId={effectiveWeekId}
              onSelectWeek={setSelectedWeekId}
              className="flex-1 sm:flex-initial"
            />

            {/* Jump Back to Today (Only shown when browsing another day/week) */}
            {!isViewingDefaultToday && (
              <button
                type="button"
                onClick={handleResetToToday}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#CFE2D8] bg-[#EDF6F1] px-3 text-xs font-bold text-[#176B4B] transition-colors hover:bg-[#E0F0E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:border-[#2C4E3C] dark:bg-[#193226] dark:text-[#8CD9AE] dark:hover:bg-[#214232]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>اليوم</span>
              </button>
            )}

            {/* Weekly Record Link (Exact h-10 — Aligned Baseline) */}
            <Link
              to="/representative/weekly-attendance"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DCE7E2] bg-white px-3.5 text-xs font-bold text-[#1E3429] transition-colors hover:border-[#176B4B] hover:bg-[#F3F8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#E2F0E7] dark:hover:border-[#3E9B72] dark:hover:bg-[#1B2E26] dark:focus-visible:ring-[#6DD39A]"
            >
              <CalendarCheck2 className="h-4 w-4 text-[#176B4B] dark:text-[#6DD39A]" />
              <span>السجل الأسبوعي</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      {isWeeksError ? (
        <section className="rounded-2xl border border-[#F5C7CA] bg-white p-8 text-center shadow-xs dark:border-[#5D2A31] dark:bg-[#17251F]">
          <AlertCircle className="mx-auto h-8 w-8 text-[#A61B1B] dark:text-[#FCA5A5]" />
          <h2 className="mt-3 text-sm font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
            تعذر تحميل الأسابيع الدراسية
          </h2>
          <p className="mt-1 text-xs text-[#587268] dark:text-[#9DB5A8]">
            تحقق من اتصال الخادم ثم أعد المحاولة.
          </p>
          <button
            type="button"
            onClick={() => void refetchWeeks()}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#176B4B] px-4 text-xs font-bold text-white transition-colors hover:bg-[#10583C] dark:bg-[#1E7A53] dark:hover:bg-[#248F62]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </section>
      ) : isPageLoading ? (
        <div className="rounded-2xl border border-[#DCE7E2] bg-white p-12 shadow-xs dark:border-[#293E35] dark:bg-[#17251F]">
          <MuwathibLoading message="جاري تحميل قائمة طلاب الشعبة وسجل الحضور..." />
        </div>
      ) : !effectiveWeekId ? (
        <section className="rounded-2xl border border-[#DCE7E2] bg-white p-10 text-center shadow-xs dark:border-[#293E35] dark:bg-[#17251F]">
          <p className="text-sm font-bold text-[#142B22] dark:text-[#F0F7F3]">
            لا يوجد أسبوع دراسي نشط حالياً
          </p>
          <p className="mt-1 text-xs text-[#587268] dark:text-[#9DB5A8]">
            تواصل مع إدارة المدرسة لتفعيل الأسابيع الدراسية قبل بدء الرصد.
          </p>
        </section>
      ) : (
        <QuickAttendancePanel
          classNameTitle={className}
          attendanceWeekId={effectiveWeekId}
          weekNumber={selectedWeek?.weekNumber ?? 1}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
          enrollments={enrollments}
          records={records}
          onSaveSlot={async (day, changes) => {
            await saveSlot(day, changes);
          }}
          isSaving={isSaving}
        />
      )}
    </main>
  );
}

export default RepresentativeAttendancePage;