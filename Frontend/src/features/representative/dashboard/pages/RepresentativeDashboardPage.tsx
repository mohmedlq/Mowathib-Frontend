import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { useAttendanceMatrix } from '../../../attendance';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
// import { Button } from '../../../../shared/components/ui/Button';
import { PrintClassNumberModal } from '../../components/PrintClassNumberModal';
import { resolveDefaultAttendanceWeek } from '../../../../shared/utils/date';
// import type { CardRequest } from '../../../../shared/types';
import {
  getPeriodsForDay,
  getPeriodsCountForDay,
  SCHOOL_DAYS,
} from '../../../../shared/types';
import {
  CalendarCheck,
  CalendarCheck2,
  Users,
  // CreditCard,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  UserCheck,
  Sparkles,
  User,
  AlertCircle,
  // Clock,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

export function RepresentativeDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const classId = user?.classId || 105;
  const isMainRep = user?.role === 'Representative';
  const className =
    user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : `شعبة ${classId}`);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Saudi School Day (Sunday = 1 ... Thursday = 5)
  const todayDayNumber = useMemo(() => {
    const jsDay = new Date().getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (jsDay >= 0 && jsDay <= 4) {
      return jsDay + 1;
    }
    return 1; // Default to Sunday on weekends
  }, []);

  const todaySchoolDay = useMemo(() => {
    return SCHOOL_DAYS.find((d) => d.dayNumber === todayDayNumber) || SCHOOL_DAYS[0];
  }, [todayDayNumber]);

  const todayTotalPeriods = useMemo(() => {
    return getPeriodsCountForDay(todayDayNumber);
  }, [todayDayNumber]);

  const todayPeriodsList = useMemo(() => {
    return getPeriodsForDay(todayDayNumber);
  }, [todayDayNumber]);

  // Formatted date in Arabic
  const formattedTodayDate = useMemo(() => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);
    } catch {
      return todaySchoolDay.nameAr;
    }
  }, [todaySchoolDay]);

  // Fetch attendance weeks with stable cache
  const { data: weeks = [], isLoading: isLoadingWeeks } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const activeWeek = useMemo(() => {
    return resolveDefaultAttendanceWeek(weeks);
  }, [weeks]);

  const effectiveWeekId = activeWeek?.attendanceWeekId;

  // Use the attendance matrix hook to fetch data
  const {
    enrollments,
    records,
    isLoading: isLoadingAttendance,
  } = useAttendanceMatrix(classId, effectiveWeekId);

  /* =========================================================================
   * مؤجل حتى إشعار آخر: جلب تفاصيل البطاقات وطلبات بطاقات الاستئذان
   * =========================================================================
  // Fetch Class details (for total bathroom cards count)
  const { data: classItem, isLoading: isLoadingClass } = useQuery({
    queryKey: ['class_details', classId],
    queryFn: async () => {
      const classes = await schoolDataService.getClasses();
      return classes.find((c) => c.classId === classId);
    },
    enabled: !!classId,
  });

  // Fetch card requests for badge counters
  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<CardRequest[]>({
    queryKey: ['card_requests'],
    queryFn: () => schoolDataService.getCardRequests(),
  });

  const myRequests = useMemo(() => {
    return requests.filter(
      (r) =>
        r.representativeUsername === user?.username ||
        r.className?.toString()?.includes(String(classId))
    );
  }, [requests, user?.username, classId]);

  const pendingRequestsCount = useMemo(() => {
    return myRequests.filter((r) => r.status === 'Pending').length;
  }, [myRequests]);
  ========================================================================= */

  // Calculate attendance statistics for today
  const todayStats = useMemo(() => {
    const todayRecords = records.filter((r) => r.dayNumber === todayDayNumber);
    const absentRecords = todayRecords.filter(
      (r) => r.status === 'Absent' || r.status === 'Discontinued'
    );
    const uniqueAbsentEnrollmentIds = new Set(absentRecords.map((r) => r.enrollmentId));

    // Per period status
    const periodStatus: Record<number, { recordedCount: number; absentCount: number }> = {};
    todayPeriodsList.forEach((period) => {
      const pRecords = todayRecords.filter((r) => r.periodNumber === period);
      const pAbsents = pRecords.filter(
        (r) => r.status === 'Absent' || r.status === 'Discontinued'
      );
      periodStatus[period] = {
        recordedCount: pRecords.length,
        absentCount: pAbsents.length,
      };
    });

    return {
      totalRecordedToday: todayRecords.length,
      absentStudentsToday: uniqueAbsentEnrollmentIds.size,
      periodStatus,
    };
  }, [records, todayDayNumber, todayPeriodsList]);

  const isInitialLoading = isLoadingWeeks && isLoadingAttendance;
  // && isLoadingClass && isLoadingRequests;

  if (isInitialLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-white dark:bg-[#122B23] rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] p-8 shadow-xs">
        <MuwathibLoading message="جاري تجهيز لوحة متابعة الشعبة والبيانات المدرسية..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print Class Number Modal */}
      <PrintClassNumberModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Hero Welcome Header */}
      <div className="bg-white dark:bg-[#122B23] p-5 sm:p-6 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-[#122B23] dark:text-[#F4F8F6] tracking-tight">
              أهلاً بك، {user?.fullName || user?.username}
            </h1>
            <span className="text-xs px-3 py-1 rounded-full bg-[#0B5D43] text-white font-bold shadow-2xs">
              {isMainRep ? 'عريف الصف الأساسي' : 'نائب عريف الصف'}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] font-bold border border-[#D8E5DF] dark:border-[#1E4638]">
              {className}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#718A80] dark:text-[#A3C7B9] flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#0B5D43] dark:text-[#3E9B78]" />
              <span>{formattedTodayDate}</span>
            </span>
            <span className="text-[#D8E5DF] dark:text-[#1E4638]">•</span>
            <span className="font-bold text-[#122B23] dark:text-[#F4F8F6]">
              {activeWeek?.weekNumber ? `الأسبوع ${activeWeek.weekNumber}` : 'الأسبوع الأول'}
            </span>
            <span className="text-[#D8E5DF] dark:text-[#1E4638]">•</span>
            <span className="text-xs font-semibold text-[#0B5D43] dark:text-[#3E9B78]">
              {todaySchoolDay.nameAr} ({todayTotalPeriods} حصص دراسية)
            </span>
          </div>
        </div>

        {/* Quick Header Buttons 
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => setIsPrintModalOpen(true)}
            className="font-bold text-xs"
          >
            طباعة لافتة الشعبة
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<CalendarCheck2 className="w-4 h-4 ml-1" />}
            onClick={() => navigate('/representative/weekly-attendance')}
            className="font-bold text-xs"
          >
            التحضير الأسبوعي
          </Button>
        </div>
        */}
      </div>

      {/* Primary Action Card: Daily Attendance Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B5D43] via-[#0E6C4E] to-[#147D5C] text-white p-6 sm:p-7 shadow-sm border border-[#0B5D43]/20">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 left-0 -translate-x-12 -translate-y-12 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 translate-x-10 translate-y-10 w-40 h-40 bg-[#3E9B78]/20 rounded-full blur-lg pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold text-[#E8F5F0]">
              <Sparkles className="w-3.5 h-3.5 text-[#A3C7B9]" />
              <span>المهمة الرئيسية لعريف الشعبة</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              رصد الحضور والغياب اليومي للحصص
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              قم بتحضير طلاب <span className="font-bold text-white underline decoration-[#3E9B78]">{className}</span> لكل حصة دراسية وتوثيق حالات الحضور والغياب والانقطاع مباشرة لتصل لسجلات الإدارة المدرسية.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/representative/daily-attendance')}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-[#0B5D43] hover:bg-[#F4F8F6] text-sm font-black transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
            >
              <CalendarCheck className="w-5 h-5 text-[#0B5D43]" />
              <span>بدء رصد الحضور الآن</span>
              <ArrowLeft className="w-4 h-4 rtl:rotate-0" />
            </button>
          </div>
        </div>

        {/* Today's Periods Quick Bar Strip */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold text-emerald-100 flex items-center gap-1.5">
              <span>حصص اليوم ({todaySchoolDay.nameAr}):</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-mono">
                {todayTotalPeriods} حصص
              </span>
            </span>
            <span className="text-[11px] text-emerald-200">
              اضغط على أي حصة للانتقال الفوري لرصدها
            </span>
          </div>

          <div className="flex items-stretch gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 lg:grid-cols-7 scroll-smooth">
            {todayPeriodsList.map((period) => {
              const status = todayStats.periodStatus[period];
              const isRecorded = status && status.recordedCount > 0;
              const hasAbsents = status && status.absentCount > 0;

              return (
                <button
                  key={period}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/representative/daily-attendance?day=${todayDayNumber}&period=${period}`
                    )
                  }
                  className="min-w-[105px] sm:min-w-0 shrink-0 sm:shrink p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer active:scale-95"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black text-white group-hover:text-emerald-100">
                      الحصة {period}
                    </span>
                    {isRecorded ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-300 ring-2 ring-emerald-400/40" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white/40" />
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isRecorded
                        ? hasAbsents
                          ? 'bg-amber-400/30 text-amber-200'
                          : 'bg-emerald-400/30 text-emerald-200'
                        : 'bg-white/10 text-emerald-100'
                    }`}
                  >
                    {isRecorded
                      ? hasAbsents
                        ? `${status.absentCount} غياب`
                        : 'اكتمل الرصد'
                      : 'جاهزة للرصد'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Total Class Students */}
        <div
          onClick={() => navigate('/representative/students')}
          className="bg-white dark:bg-[#122B23] p-3.5 sm:p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#718A80] dark:text-[#A3C7B9] font-medium">
              طلاب الشعبة
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center border border-[#D8E5DF] dark:border-[#1E4638]">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#122B23] dark:text-[#F4F8F6] font-mono block">
              {enrollments.length}
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#0B5D43] dark:text-[#3E9B78] font-bold flex items-center gap-1 mt-1 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>القيد نشط ومكتمل</span>
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-xs font-semibold text-[#0B5D43] dark:text-[#3E9B78]">
            <span>عرض الطلاب</span>
            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>

        {/* Today's Attendance Overview */}
        <div
          onClick={() => navigate('/representative/daily-attendance')}
          className="bg-white dark:bg-[#122B23] p-3.5 sm:p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#718A80] dark:text-[#A3C7B9] font-medium">
              حضور اليوم
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center border border-[#D8E5DF] dark:border-[#1E4638]">
              <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#122B23] dark:text-[#F4F8F6] font-mono block">
              {todayStats.absentStudentsToday}{' '}
              <span className="text-xs font-normal text-[#718A80] dark:text-[#A3C7B9]">
                غياب
              </span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#718A80] dark:text-[#A3C7B9] font-medium mt-1 block truncate">
              {todayStats.totalRecordedToday > 0
                ? `${todayStats.totalRecordedToday} سجل حضور`
                : 'لم يتم الرصد بعد'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-xs font-semibold text-[#0B5D43] dark:text-[#3E9B78]">
            <span>الانتقال للرصد</span>
            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>

        {/* مؤجل حتى إشعار آخر: بطاقات الاستئذان وطلبات البطاقات
        <div
          onClick={() => navigate('/representative/card-requests')}
          className="bg-white dark:bg-[#122B23] p-3.5 sm:p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#718A80] dark:text-[#A3C7B9] font-medium">
              بطاقات الاستئذان
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FFF8EB] dark:bg-[#332514] text-[#B45309] dark:text-[#FBBF24] flex items-center justify-center border border-[#FDE68A]/60 dark:border-[#78350F]">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#B45309] dark:text-[#FBBF24] font-mono block">
              {classItem?.totalCards || 3}{' '}
              <span className="text-xs font-normal text-[#718A80] dark:text-[#A3C7B9]">
                بطاقات
              </span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#B45309] dark:text-[#FBBF24] font-medium mt-1 block truncate">
              العهدة المعتمدة لدى العريف
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-xs font-semibold text-[#0B5D43] dark:text-[#3E9B78]">
            <span>طلب بطاقة بديلة</span>
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>

        <div
          onClick={() => navigate('/representative/card-requests')}
          className="bg-white dark:bg-[#122B23] p-3.5 sm:p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#718A80] dark:text-[#A3C7B9] font-medium">
              طلبات البطاقات
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center border border-[#BFDBFE]/60 dark:border-[#1E40AF]">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-[#1D4ED8] dark:text-[#60A5FA] font-mono block">
              {myRequests.length}
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#718A80] dark:text-[#A3C7B9] font-medium mt-1 block truncate">
              {pendingRequestsCount > 0
                ? `${pendingRequestsCount} قيد المراجعة`
                : 'لا توجد طلبات معلقة'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-xs font-semibold text-[#0B5D43] dark:text-[#3E9B78]">
            <span>سجل الطلبات</span>
            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>
        */}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#122B23] dark:text-[#F4F8F6] tracking-tight">
            بوابة الخدمات والمهام السريعة
          </h2>
          <span className="text-xs text-[#718A80] dark:text-[#A3C7B9]">
            كل ما تحتاجه لإدارة حضور الشعبة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Daily Attendance Action Card */}
          <div
            onClick={() => navigate('/representative/daily-attendance')}
            className="bg-white dark:bg-[#122B23] p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center font-bold">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#122B23] dark:text-[#F4F8F6] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-colors">
                    رصد الحضور اليومي
                  </h3>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#718A80] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-transform group-hover:-translate-x-1" />
              </div>
              <p className="text-xs text-[#718A80] dark:text-[#A3C7B9] leading-relaxed">
                تسجيل حضور وغياب الطلاب للحصة الحالية والتبديل السريع بين حصص اليوم مع حفظ التغييرات فوراً.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-[11px] text-[#0B5D43] dark:text-[#3E9B78] font-bold">
              <span>بدء التحضير اليومي</span>
              <span>←</span>
            </div>
          </div>

          {/* Weekly Attendance History */}
          <div
            onClick={() => navigate('/representative/weekly-attendance')}
            className="bg-white dark:bg-[#122B23] p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4F8F6] dark:bg-[#153B2E] text-[#122B23] dark:text-[#F4F8F6] flex items-center justify-center font-bold">
                    <CalendarCheck2 className="w-5 h-5 text-[#0B5D43] dark:text-[#3E9B78]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#122B23] dark:text-[#F4F8F6] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-colors">
                    كشف التحضير الأسبوعي
                  </h3>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#718A80] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-transform group-hover:-translate-x-1" />
              </div>
              <p className="text-xs text-[#718A80] dark:text-[#A3C7B9] leading-relaxed">
                استعراض جدول الحضور الكامل لجميع أيام الأسبوع (33 حصة أسبوعية) ومراجعة السجلات التاريخية.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-[11px] text-[#718A80] dark:text-[#A3C7B9]">
              <span>مصفوفة 33 حصة أسبوعية</span>
              <span className="font-bold text-[#0B5D43] dark:text-[#3E9B78]">عرض السجل</span>
            </div>
          </div>

          {/* Students List */}
          <div
            onClick={() => navigate('/representative/students')}
            className="bg-white dark:bg-[#122B23] p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4F8F6] dark:bg-[#153B2E] text-[#122B23] dark:text-[#F4F8F6] flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5 text-[#0B5D43] dark:text-[#3E9B78]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#122B23] dark:text-[#F4F8F6] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-colors">
                    قائمة طلاب الشعبة
                  </h3>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#718A80] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-transform group-hover:-translate-x-1" />
              </div>
              <p className="text-xs text-[#718A80] dark:text-[#A3C7B9] leading-relaxed">
                عرض قائمة الطلاب المقيدين في شعبتك وتعديل بياناتهم وأرقام الهويات الوطنية وأولياء الأمور.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-[11px] text-[#718A80] dark:text-[#A3C7B9]">
              <span>إجمالي {enrollments.length} طالباً</span>
              <span className="font-bold text-[#0B5D43] dark:text-[#3E9B78]">إدارة الطلاب</span>
            </div>
          </div>

          {/* مؤجل حتى إشعار آخر: بطاقة طلب بطاقة استئذان
          <div
            onClick={() => navigate('/representative/card-requests')}
            className="bg-white dark:bg-[#122B23] p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4F8F6] dark:bg-[#153B2E] text-[#122B23] dark:text-[#F4F8F6] flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5 text-[#0B5D43] dark:text-[#3E9B78]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#122B23] dark:text-[#F4F8F6] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-colors">
                    طلب بطاقة استئذان
                  </h3>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#718A80] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-transform group-hover:-translate-x-1" />
              </div>
              <p className="text-xs text-[#718A80] dark:text-[#A3C7B9] leading-relaxed">
                رفع طلب بطاقة استئذان إضافية أو بدل تالف/فاقد لإدارة المدرسة ومتابعة حالة الموافقة.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-[11px] text-[#718A80] dark:text-[#A3C7B9]">
              <span>{pendingRequestsCount} طلبات قيد المراجعة</span>
              <span className="font-bold text-[#0B5D43] dark:text-[#3E9B78]">تقديم طلب</span>
            </div>
          </div>
          */}

          {/* Print Class Number Sign 
          <div
            onClick={() => setIsPrintModalOpen(true)}
            className="bg-white dark:bg-[#122B23] p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4F8F6] dark:bg-[#153B2E] text-[#122B23] dark:text-[#F4F8F6] flex items-center justify-center font-bold">
                    <Printer className="w-5 h-5 text-[#0B5D43] dark:text-[#3E9B78]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#122B23] dark:text-[#F4F8F6] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-colors">
                    طباعة لافتة الشعبة
                  </h3>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#718A80] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-transform group-hover:-translate-x-1" />
              </div>
              <p className="text-xs text-[#718A80] dark:text-[#A3C7B9] leading-relaxed">
                طباعة اللافتة الرسمية للشعبة متضمنة رقم الفصل والباركود المدرسي لتعليقها على باب الفصل.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-[11px] text-[#718A80] dark:text-[#A3C7B9]">
              <span>تنسيق A4 مخصص للطباعة</span>
              <span className="font-bold text-[#0B5D43] dark:text-[#3E9B78]">طباعة الآن</span>
            </div>
          </div>*/}

          {/* Deputy Representative or Profile */}
          {isMainRep ? (
            <div
              onClick={() => navigate('/representative/deputy')}
              className="bg-white dark:bg-[#122B23] p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F8F6] dark:bg-[#153B2E] text-[#122B23] dark:text-[#F4F8F6] flex items-center justify-center font-bold">
                      <UserCheck className="w-5 h-5 text-[#0B5D43] dark:text-[#3E9B78]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#122B23] dark:text-[#F4F8F6] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-colors">
                      إدارة نائب العريف
                    </h3>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#718A80] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-transform group-hover:-translate-x-1" />
                </div>
                <p className="text-xs text-[#718A80] dark:text-[#A3C7B9] leading-relaxed">
                  تعيين نائب عريف الشعبة ومنحه صلاحيات الدخول لمساعدتك في رصد الحضور عند غيابك.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-[11px] text-[#718A80] dark:text-[#A3C7B9]">
                <span>صلاحية العريف الأساسي</span>
                <span className="font-bold text-[#0B5D43] dark:text-[#3E9B78]">إدارة النائب</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => navigate('/representative/profile')}
              className="bg-white dark:bg-[#122B23] p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] hover:border-[#0B5D43] dark:hover:border-[#3E9B78] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F4F8F6] dark:bg-[#153B2E] text-[#122B23] dark:text-[#F4F8F6] flex items-center justify-center font-bold">
                      <User className="w-5 h-5 text-[#0B5D43] dark:text-[#3E9B78]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#122B23] dark:text-[#F4F8F6] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-colors">
                      الملف الشخصي وكلمة المرور
                    </h3>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#718A80] group-hover:text-[#0B5D43] dark:group-hover:text-[#3E9B78] transition-transform group-hover:-translate-x-1" />
                </div>
                <p className="text-xs text-[#718A80] dark:text-[#A3C7B9] leading-relaxed">
                  مراجعة بياناتك المسجلة وتحديث كلمة المرور الخاصة بحسابك لحماية سجلات الحضور.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EEF2F3] dark:border-[#1E4638] flex items-center justify-between text-[11px] text-[#718A80] dark:text-[#A3C7B9]">
                <span>أمان الحساب</span>
                <span className="font-bold text-[#0B5D43] dark:text-[#3E9B78]">تعديل الحساب</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Information & School Policy Card */}
      <div className="bg-[#E8F5F0] dark:bg-[#1A3B31]/50 p-5 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#0B5D43] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-[#122B23] dark:text-[#F4F8F6] text-sm">
            إرشادات تنظيمية لرصد الحضور المدرسي
          </h4>
          <p className="text-[#718A80] dark:text-[#A3C7B9] leading-relaxed">
            وفق لائحة وزارة التعليم وجدول الحصص المدرسي، يتكون اليوم الدراسي من{' '}
            <strong className="text-[#0B5D43] dark:text-[#3E9B78]">7 حصص</strong> لأيام (الأحد، الاثنين، الثلاثاء)، و{' '}
            <strong className="text-[#0B5D43] dark:text-[#3E9B78]">6 حصص</strong> ليومي (الأربعاء، الخميس) بإجمالي{' '}
            <strong className="text-[#0B5D43] dark:text-[#3E9B78]">33 حصة أسبوعية</strong>. يُرجى تحري الدقة عند حفظ الغياب؛ حيث تُعتمد السجلات فورياً لدى الإدارة المدرسية.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RepresentativeDashboardPage;