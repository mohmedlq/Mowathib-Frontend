import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BellRing,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  Sparkles,
  User,
  Users2,
  X,
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '../../features/auth';
import { useNotifications } from '../../features/notifications';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';
import { BrandLogo } from '../../components/common/BrandLogo';
import { MuwathibLoading, Spinner } from '../../shared/components/ui/Spinner';
import { Dialog, DialogFooter } from '../../shared/components/ui/Dialog';
import { useSchoolSettings } from '../../shared/services/schoolSettingsService';
import { classesApi } from '../../features/classes';
import { representativesApi } from '../../features/representatives';
import { attendanceApi } from '../../features/attendance';
import { attendanceWeeksApi } from '../../features/attendance-weeks';
import { academicYearsApi } from '../../features/academic-years';
import { resolveDefaultAttendanceWeek } from '../../shared/utils/date';
import {
  buildRepresentativeReminderMessage,
  createWhatsAppRepresentativeUrl,
  isValidSaudiPhone,
  normalizeSaudiPhone,
} from '../../shared/utils/whatsapp';
import type { AttendanceWeek } from '../../shared/types';

// -----------------------------------------------------------------------------
// Navigation configuration
// -----------------------------------------------------------------------------

type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const NAV_SECTIONS: NavigationSection[] = [
  {
    title: 'العمليات وسجلات الحضور',
    items: [
      { to: '/admin/dashboard', label: 'لوحة المتابعة', icon: LayoutDashboard, description: 'ملخص أداء المدرسة' },
      { to: '/admin/attendance', label: 'الحضور والغياب', icon: CalendarCheck, description: 'تسجيل ومراجعة الحضور' },
      { to: '/admin/weekly-preparation', label: 'التحضير الأسبوعي', icon: FileSpreadsheet, description: 'متابعة تحضير الشعب' },
      { to: '/admin/reports', label: 'مركز التقارير', icon: CalendarDays, description: 'التقارير اليومية والأسبوعية والشهرية' },
      { to: '/admin/send-notifications', label: 'إشعارات أولياء الأمور', icon: BellRing, description: 'متابعة رسائل الغياب' },
    ],
  },
  {
    title: 'إدارة المدرسة',
    items: [
      { to: '/admin/classes', label: 'الفصول والشعب', icon: Building2, description: 'إدارة التقسيمات الدراسية' },
      { to: '/admin/academic-weeks', label: 'الأسابيع الدراسية', icon: CalendarClock, description: 'إعداد التقويم الدراسي' },
      { to: '/admin/students', label: 'الطلاب والقيد', icon: GraduationCap, description: 'سجلات الطلاب وأولياء الأمور' },
      { to: '/admin/representatives', label: 'العرفاء ومسجلو الحضور', icon: Users2, description: 'الحسابات والصلاحيات' },
      { to: '/admin/academic-years', label: 'الأعوام الدراسية', icon: CalendarRange, description: 'إدارة الأعوام الدراسية' },
    ],
  },
  {
    title: 'الحساب والإعدادات',
    items: [
      { to: '/admin/school-settings', label: 'إعدادات المدرسة', icon: ShieldCheck, description: 'بيانات وهوية المدرسة' },
      { to: '/admin/profile', label: 'الملف الشخصي', icon: User, description: 'بيانات المسؤول' },
    ],
  },
];

function getPageInfo(pathname: string) {
  if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard') {
    return {
      to: '/admin/dashboard',
      label: 'لوحة المتابعة',
      description: 'ملخص أداء المدرسة ومتابعة التحضير اليومي',
      icon: LayoutDashboard,
    };
  }

  if (pathname.startsWith('/admin/cards')) {
    return {
      to: '/admin/cards',
      label: 'بطاقات الاستئذان',
      description: 'إدارة بطاقات الاستئذان الرقمية',
      icon: ShieldCheck,
    };
  }

  if (pathname.startsWith('/admin/card-requests')) {
    return {
      to: '/admin/card-requests',
      label: 'طلبات البطاقات',
      description: 'متابعة وتدقيق طلبات بطاقات الاستئذان',
      icon: ShieldCheck,
    };
  }

  const item = NAV_SECTIONS.flatMap((section) => section.items).find(
    (candidate) => pathname === candidate.to || pathname.startsWith(`${candidate.to}/`)
  );

  return item ?? {
    label: 'مساحة الإدارة',
    description: 'إدارة عمليات المدرسة ومتابعة الأداء اليومي',
    icon: LayoutDashboard,
  };
}

function getArabicToday() {
  return new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

type UnpreparedClassItem = {
  classId: number;
  className: string;
  representativeName: string;
  representativeRole?: string;
  representativePhone: string;
  hasRepresentative: boolean;
};

// -----------------------------------------------------------------------------
// Dashboard landing overview (Live real-time data & class attendance follow-up)
// -----------------------------------------------------------------------------

function DashboardOverview({
  userName,
  schoolName,
  today,
  activeWeek,
  sideSlot,
}: {
  userName: string;
  schoolName: string;
  today: string;
  activeWeek?: AttendanceWeek;
  sideSlot?: ReactNode;
}) {
  const { toast } = useNotifications();

  // WhatsApp reminder modal state
  const [selectedRepForWhatsApp, setSelectedRepForWhatsApp] = useState<UnpreparedClassItem | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  // 1. Fetch Classes
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.getClasses(),
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch Representatives (to map reps to unprepared classes)
  const { data: representatives = [], isLoading: isRepsLoading } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => representativesApi.getRepresentatives(),
    staleTime: 1000 * 60 * 5,
  });

  // 3. Fetch Attendance Records for the current active week
  const { data: weekRecords = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ['dashboard_week_records', activeWeek?.attendanceWeekId],
    queryFn: () =>
      activeWeek?.attendanceWeekId
        ? attendanceApi.getAttendanceRecordsByWeek(activeWeek.attendanceWeekId)
        : Promise.resolve([]),
    enabled: Boolean(activeWeek?.attendanceWeekId),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60,
  });

  // 4. Determine Today's School Day Number (1 = Sunday, ..., 5 = Thursday)
  const { todayDayNumber, todayDayName } = useMemo(() => {
    const jsDay = new Date().getDay();
    const dayNum = jsDay >= 0 && jsDay <= 4 ? jsDay + 1 : 1;
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    return {
      todayDayNumber: dayNum,
      todayDayName: dayNames[dayNum - 1] || 'اليوم',
    };
  }, []);

  // 5. Calculate Real Attendance Metrics & Unprepared Classes
  const {
    totalClassesCount,
    preparedCount,
    unpreparedCount,
    progressPercent,
    unpreparedClasses,
  } = useMemo(() => {
    const total = classes.length;
    if (!total) {
      return {
        totalClassesCount: 0,
        preparedCount: 0,
        unpreparedCount: 0,
        progressPercent: 0,
        unpreparedClasses: [],
      };
    }

    const preparedClassIdSet = new Set<number>();
    for (const rec of weekRecords) {
      if (rec.dayNumber === todayDayNumber && rec.classId) {
        preparedClassIdSet.add(rec.classId);
      }
    }

    const unpreparedList: UnpreparedClassItem[] = [];
    let prepared = 0;

    for (const cls of classes) {
      if (preparedClassIdSet.has(cls.classId)) {
        prepared += 1;
      } else {
        const rep =
          representatives.find((r) => r.classId === cls.classId && r.role === 'Representative') ||
          representatives.find((r) => r.classId === cls.classId && r.role === 'Deputy');

        const repName = rep?.studentName || rep?.username || 'لم يُعيّن عريف';
        const repRole = rep?.role === 'Deputy' ? 'نائب عريف' : rep ? 'عريف الفصل' : undefined;
        const repPhone = rep?.phoneNumber || '';

        unpreparedList.push({
          classId: cls.classId,
          className: String(cls.className || cls.classNumber || `شعبة ${cls.classId}`),
          representativeName: repName,
          representativeRole: repRole,
          representativePhone: repPhone,
          hasRepresentative: Boolean(rep),
        });
      }
    }

    const progress = total > 0 ? Math.round((prepared / total) * 100) : 0;

    return {
      totalClassesCount: total,
      preparedCount: prepared,
      unpreparedCount: unpreparedList.length,
      progressPercent: progress,
      unpreparedClasses: unpreparedList,
    };
  }, [classes, representatives, weekRecords, todayDayNumber]);

  const isLoading = isClassesLoading || isRecordsLoading || isRepsLoading;

  const handleOpenWhatsApp = (item: UnpreparedClassItem) => {
    setSelectedRepForWhatsApp(item);
    const rawPhone =
      item.representativePhone && item.representativePhone !== '0000000000'
        ? item.representativePhone
        : '';
    setWhatsAppPhone(rawPhone);
    setWhatsAppMessage(
      buildRepresentativeReminderMessage(
        item.representativeName,
        item.className,
        todayDayName,
        schoolName
      )
    );
  };

  const handleResetDefaultMessage = () => {
    if (!selectedRepForWhatsApp) return;
    setWhatsAppMessage(
      buildRepresentativeReminderMessage(
        selectedRepForWhatsApp.representativeName,
        selectedRepForWhatsApp.className,
        todayDayName,
        schoolName
      )
    );
  };

  const handleSendWhatsApp = () => {
    if (!selectedRepForWhatsApp || !whatsAppMessage.trim()) return;

    const result = createWhatsAppRepresentativeUrl(whatsAppPhone, whatsAppMessage);
    if (!result.isValid || !result.url) {
      toast.show('يرجى إدخال رقم هاتف سعودي صحيح (مثال: 05XXXXXXXX)', 'danger');
      return;
    }

    const tab = window.open(result.url, '_blank', 'noopener,noreferrer');
    if (tab) {
      tab.opener = null;
      toast.show(
        `تم فتح محادثة واتساب لمراسلة العريف (${selectedRepForWhatsApp.representativeName}) بنجاح`,
        'success'
      );
    } else {
      toast.show('تعذر فتح واتساب تلقائياً، يرجى السماح بالنوافذ المنبثقة في المتصفح', 'warning');
    }

    setSelectedRepForWhatsApp(null);
  };

  return (
    <section className="mb-6 space-y-5" aria-label="ملخص لوحة المتابعة">
      {/* Welcome hero */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-[#D9E7E2] bg-gradient-to-br from-white via-[#F4FAF7] to-[#E7F3EE] p-5 shadow-sm dark:border-[#24463A] dark:from-[#14221D] dark:via-[#152A22] dark:to-[#19382B] sm:p-7">
        <div className="pointer-events-none absolute -left-16 -top-20 -z-10 h-64 w-64 rounded-full bg-[#B7D9C9]/30 blur-3xl dark:bg-[#2B7657]/15" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 -z-10 h-56 w-56 rounded-full bg-[#B9D9DF]/25 blur-3xl dark:bg-[#245B63]/15" />

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#CFE2D8] bg-white/75 px-3 py-1.5 text-[11px] font-bold text-[#27664D] dark:border-[#315B49] dark:bg-[#183329]/80 dark:text-[#9BD5B7]">
              <span className="h-2 w-2 rounded-full bg-[#2B9A67] shadow-[0_0_0_3px_rgba(43,154,103,0.12)]" />
              مركز إدارة المدرسة · متابعة حية
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3] sm:text-3xl">
              أهلاً بك، {userName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[#587268] dark:text-[#B0C9BD]">
              من هنا تتابع سير الحضور والتحضير، وتدير بيانات الطلاب والشعب، وتصل إلى التقارير والإشعارات من مكان واحد.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#D9E7E2] bg-white/80 px-3 py-2 font-semibold text-[#355B4A] dark:border-[#315344] dark:bg-[#14271F] dark:text-[#C2D9CC]">
                <Building2 className="h-4 w-4 text-[#2B9A67]" />
                {schoolName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#D9E7E2] bg-white/80 px-3 py-2 font-semibold text-[#355B4A] dark:border-[#315344] dark:bg-[#14271F] dark:text-[#C2D9CC]">
                <Calendar className="h-4 w-4 text-[#245B63]" />
                {today}
              </span>
              {activeWeek?.weekNumber && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-[#DCE7E8] bg-[#F1F6F6] px-3 py-2 font-semibold text-[#28646B] dark:border-[#315156] dark:bg-[#1B3033] dark:text-[#9ED2D2]">
                  <CalendarCheck className="h-4 w-4 text-[#245B63]" />
                  الأسبوع {activeWeek.weekNumber} · يوم {todayDayName}
                </span>
              )}
            </div>
          </div>

          <NavLink
            to="/admin/attendance"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#176B4B] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#10583C] focus:outline-none focus:ring-4 focus:ring-[#176B4B]/20 dark:bg-[#23845B] dark:hover:bg-[#2A9669]"
          >
            <ClipboardCheck className="h-4 w-4" />
            الانتقال إلى سجل الحضور
            <ArrowLeft className="h-4 w-4" />
          </NavLink>
        </div>
      </div>

      {/* KPI cards: Real-time Live Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Classes */}
        <div className="rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-sm transition hover:shadow-md dark:border-[#293E35] dark:bg-[#17251F]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#71837A] dark:text-[#9DB5A8]">إجمالي الشعب</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                {isLoading ? (
                  <div className="flex h-9 items-center"><Spinner size="sm" /></div>
                ) : (
                  <p className="text-3xl font-black tabular-nums text-[#1E3429] dark:text-[#F0F7F3]">
                    {totalClassesCount}
                  </p>
                )}
                <span className="text-xs font-bold text-[#71837A] dark:text-[#9DB5A8]">شعبة</span>
              </div>
            </div>
            <span className="rounded-xl bg-[#EAF3EE] p-2.5 text-[#347456] dark:bg-[#203B2E] dark:text-[#8AC7A7]">
              <Building2 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-[11px] text-[#87978F] dark:text-[#81988B]">إجمالي الشعب المسجلة في المدرسة</p>
        </div>

        {/* Prepared Classes */}
        <div className="rounded-2xl border border-[#DCE7E2] bg-white p-4 shadow-sm transition hover:shadow-md dark:border-[#293E35] dark:bg-[#17251F]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#71837A] dark:text-[#9DB5A8]">شعب أتمّت التحضير</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                {isLoading ? (
                  <div className="flex h-9 items-center"><Spinner size="sm" /></div>
                ) : (
                  <p className="text-3xl font-black tabular-nums text-[#19734C] dark:text-[#6DD39A]">
                    {preparedCount}
                  </p>
                )}
                <span className="text-xs font-bold text-[#19734C] dark:text-[#6DD39A]">شعبة</span>
              </div>
            </div>
            <span className="rounded-xl bg-[#E8F6EE] p-2.5 text-[#19734C] dark:bg-[#193B2A] dark:text-[#6DD39A]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-[11px] text-[#87978F] dark:text-[#81988B]">سجلت حضور يوم {todayDayName}</p>
        </div>

        {/* Unprepared Classes */}
        <div className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
          unpreparedCount > 0
            ? 'border-[#EEDFCB] bg-white dark:border-[#57452E] dark:bg-[#292319]'
            : 'border-[#DCE7E2] bg-white dark:border-[#293E35] dark:bg-[#17251F]'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-xs font-semibold ${unpreparedCount > 0 ? 'text-[#89765B] dark:text-[#C7B18A]' : 'text-[#71837A] dark:text-[#9DB5A8]'}`}>
                شعب لم تحضّر بعد
              </p>
              <div className="mt-2 flex items-baseline gap-1.5">
                {isLoading ? (
                  <div className="flex h-9 items-center"><Spinner size="sm" /></div>
                ) : (
                  <p className={`text-3xl font-black tabular-nums ${unpreparedCount > 0 ? 'text-[#A56B20] dark:text-[#F1C16F]' : 'text-[#19734C] dark:text-[#6DD39A]'}`}>
                    {unpreparedCount}
                  </p>
                )}
                <span className="text-xs font-bold text-[#89765B] dark:text-[#C7B18A]">شعبة</span>
              </div>
            </div>
            <span className={`rounded-xl p-2.5 ${unpreparedCount > 0 ? 'bg-[#FFF4E2] text-[#A56B20] dark:bg-[#45351F] dark:text-[#F1C16F]' : 'bg-[#E8F6EE] text-[#19734C] dark:bg-[#193B2A] dark:text-[#6DD39A]'}`}>
              {unpreparedCount > 0 ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-[#9A886F] dark:text-[#B7A27B]">
            {unpreparedCount === 0 ? 'اكتمل تحضير جميع الشعب بنجاح' : `تحتاج متابعة ورصد ليوم ${todayDayName}`}
          </p>
        </div>

        {/* Completion Progress */}
        <div className="rounded-2xl border border-[#DCE4EC] bg-white p-4 shadow-sm transition hover:shadow-md dark:border-[#30404A] dark:bg-[#19252B]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#6C7F8C] dark:text-[#A3B6C0]">نسبة إنجاز التحضير</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                {isLoading ? (
                  <div className="flex h-9 items-center"><Spinner size="sm" /></div>
                ) : (
                  <p className="text-3xl font-black tabular-nums text-[#245B63] dark:text-[#72C4C8]">
                    {progressPercent}%
                  </p>
                )}
              </div>
            </div>
            <span className="rounded-xl bg-[#EAF2F4] p-2.5 text-[#245B63] dark:bg-[#213A40] dark:text-[#72C4C8]">
              <Activity className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EBF1F3] dark:bg-[#27363C]">
              <div
                className="h-full rounded-full bg-[#245B63] transition-all duration-500 dark:bg-[#72C4C8]"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-[#84949C] dark:text-[#8FA4AE]">
              {preparedCount} من {totalClassesCount} شعبة أنجزت التحضير
            </p>
          </div>
        </div>
      </div>

      {/* Daily follow-up + Admin Dashboard Cards (replaces الوصول السريع) */}
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)] items-start">
        {/* Unprepared Classes Section */}
        <section className="overflow-hidden rounded-2xl border border-[#DCE7E2] bg-white shadow-sm dark:border-[#293E35] dark:bg-[#17251F]">
          <div className="flex flex-col gap-3 border-b border-[#E9EFEC] p-4 dark:border-[#2A4036] sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-lg p-2 ${
                  unpreparedCount > 0
                    ? 'bg-[#FFF3DF] text-[#A56B20] dark:bg-[#45351F] dark:text-[#F1C16F]'
                    : 'bg-[#E8F6EE] text-[#19734C] dark:bg-[#193B2A] dark:text-[#6DD39A]'
                }`}>
                  {unpreparedCount > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </span>
                <h2 className="text-sm font-extrabold text-[#20362B] dark:text-[#EDF5F0]">
                  متابعة الشعب التي لم تسجل التحضير اليوم ({todayDayName})
                </h2>
              </div>
              <p className="mt-2 text-xs text-[#71837A] dark:text-[#9DB5A8]">
                قائمة حية توضح الشعب التي لم ترصد الحضور بعد، مع العريف المسؤول وإمكانية الرصد المباشر
              </p>
            </div>
            <div>
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE7E2] bg-[#F7FAF8] px-3 py-1.5 text-[10px] font-bold text-[#647C70] dark:border-[#2B4136] dark:bg-[#1D3027] dark:text-[#9DB5A8]">
                  <Spinner size="xs" />
                  جاري المزامنة...
                </span>
              ) : unpreparedCount === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BDE7CE] bg-[#EDF8F2] px-3 py-1.5 text-[10px] font-bold text-[#19734C] dark:border-[#28573D] dark:bg-[#1B3628] dark:text-[#6DD39A]">
                  <Sparkles className="h-3 w-3" />
                  اكتمل التحضير 100%
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EEDFCB] bg-[#FFF8EC] px-3 py-1.5 text-[10px] font-bold text-[#94631F] dark:border-[#59482F] dark:bg-[#332A1C] dark:text-[#E9BC72]">
                  <AlertCircle className="h-3 w-3" />
                  متبقي {unpreparedCount} شعبة
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Spinner size="md" />
              <p className="mt-3 text-xs font-semibold text-[#6C7F75] dark:text-[#9BB1A5]">
                جاري فحص سجلات التحضير لليوم...
              </p>
            </div>
          ) : unpreparedCount === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center sm:p-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F6EE] text-[#19734C] shadow-sm dark:bg-[#1D3B2B] dark:text-[#6DD39A]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-[#194D36] dark:text-[#A4E0BE]">
                اكتمل رصد الحضور لجميع الشعب لهذا اليوم!
              </h3>
              <p className="mt-1.5 max-w-md text-xs leading-6 text-[#587268] dark:text-[#A0B9AC]">
                تم تسجيل وتحضير كافة شعب المدرسة ({totalClassesCount} شعبة) بنجاح ليوم {todayDayName}.
                يمكنك الاطلاع على كشف التحضير الأسبوعي أو مراجعة تقارير الحضور.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <NavLink
                  to="/admin/weekly-preparation"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#176B4B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#10583C] dark:bg-[#23845B] dark:hover:bg-[#2A9669]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  كشف التحضير الأسبوعي
                </NavLink>
                <NavLink
                  to="/admin/reports"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7E1] bg-white px-4 py-2.5 text-xs font-bold text-[#294337] shadow-sm transition hover:bg-[#F3F7F4] dark:border-[#2C4937] dark:bg-[#17251F] dark:text-[#E2F0E7] dark:hover:bg-[#1F332A]"
                >
                  <CalendarDays className="h-4 w-4" />
                  مركز التقارير
                </NavLink>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-right text-xs">
                <thead className="bg-[#F7FAF8] text-[#75867D] dark:bg-[#1D3027] dark:text-[#A3B7AA]">
                  <tr>
                    <th className="px-4 py-3 font-bold">الشعبة</th>
                    <th className="px-4 py-3 font-bold">العريف المسؤول</th>
                    <th className="px-4 py-3 font-bold">حالة التحضير</th>
                    <th className="px-4 py-3 text-center font-bold">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1EE] dark:divide-[#2A4036]">
                  {unpreparedClasses.map((item) => (
                    <tr key={item.classId} className="transition-colors hover:bg-[#FAFCFA] dark:hover:bg-[#1D3027]">
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-lg border border-[#DCE8E1] bg-[#F2F7F4] px-2.5 py-1 font-bold text-[#315F47] dark:border-[#345440] dark:bg-[#20372B] dark:text-[#B5D7C1]">
                          {item.className}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#31463A] dark:text-[#D8E8DE]">
                            {item.representativeName}
                          </span>
                          {item.representativeRole && (
                            <span className="rounded bg-[#EBF3EE] px-1.5 py-0.5 text-[9px] font-bold text-[#31694D] dark:bg-[#213A2C] dark:text-[#99D2B1]">
                              {item.representativeRole}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4E2] px-2.5 py-1 text-[10px] font-bold text-[#98651E] dark:bg-[#45351F] dark:text-[#F1C16F]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#D69A3B] animate-pulse" />
                          لم يسجل التحضير اليوم
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#BDE7CE] bg-[#EDF8F2] px-2.5 py-1.5 font-bold text-[#19734C] transition hover:bg-[#D4EEDF] hover:text-[#115537] focus:outline-none focus:ring-2 focus:ring-[#2B9A67]/30 dark:border-[#27533B] dark:bg-[#183526] dark:text-[#6DD39A] dark:hover:bg-[#1E4331]"
                            title="مراسلة العريف عبر واتساب لتذكيره برصد الحضور"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>تذكير واتساب</span>
                          </button>
                          <NavLink
                            to={`/admin/attendance?classId=${item.classId}&day=${todayDayNumber}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#EAF4EE] px-3 py-1.5 font-bold text-[#276B4B] transition hover:bg-[#D5EADB] dark:bg-[#203D2E] dark:text-[#91CBAA] dark:hover:bg-[#274B39]"
                          >
                            رصد الحضور
                            <ArrowLeft className="h-3 w-3" />
                          </NavLink>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-[#E9EFEC] bg-[#FBFCFB] px-4 py-3 dark:border-[#2A4036] dark:bg-[#192A22] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-5 text-[#87978F] dark:text-[#91A89A]">
              يتم تحديث البيانات تلقائياً كل دقيقة لتعكس رصد العرفاء والإدارة بشكل فوري ليوم {todayDayName}.
            </p>
            <NavLink
              to="/admin/weekly-preparation"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#276B4B] hover:underline dark:text-[#91CBAA]"
            >
              عرض صفحة التحضير الأسبوعي
              <ArrowLeft className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </section>

        {/* Admin Dashboard Cards (replaces الوصول السريع) */}
        <div className="min-w-0">
          {sideSlot}
        </div>
      </div>

      {/* Operational guidance hint */}
      <div className="flex items-start gap-3 rounded-xl border border-[#DCE7E2] bg-[#F7FAF8] p-4 dark:border-[#293E35] dark:bg-[#17251F]">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[#5A8B70] dark:text-[#91CBAA]" />
        <p className="text-xs leading-6 text-[#63796D] dark:text-[#A8BFB0]">
          إرشاد إداري: يمكنك متابعة تحضير الشعب لحظياً ومراسلة العرفاء المتأخرين عبر واتساب لتذكيرهم، أو إتمام الرصد نيابة عنهم مباشرة بالضغط على زر "رصد الحضور" المقابل لكل شعبة.
        </p>
      </div>

      {/* WhatsApp Message Modal */}
      <Dialog
        isOpen={Boolean(selectedRepForWhatsApp)}
        onClose={() => setSelectedRepForWhatsApp(null)}
        title="تذكير العريف بالتحضير عبر واتساب"
        description="يمكنك مراجعة وتعديل نص الرسالة الموجهة للعريف قبل الإرسال المباشر عبر واتساب"
        maxWidth="lg"
      >
        {selectedRepForWhatsApp && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DCE7E1] bg-[#F7FAF8] p-3 text-xs dark:border-[#263D30] dark:bg-[#17251F]">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#294337] dark:text-[#E2F0E7]">
                  {selectedRepForWhatsApp.className}
                </span>
                <span className="text-[#84958B] dark:text-[#829B8C]">·</span>
                <span className="font-semibold text-[#176B4B] dark:text-[#A4D7B9]">
                  {selectedRepForWhatsApp.representativeName}
                </span>
                {selectedRepForWhatsApp.representativeRole && (
                  <span className="rounded bg-[#DCEDE2] px-1.5 py-0.5 text-[10px] font-bold text-[#236345] dark:bg-[#294936] dark:text-[#B5E0C5]">
                    {selectedRepForWhatsApp.representativeRole}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-[#6D7F74] dark:text-[#91A89A]">
                يوم {todayDayName}
              </span>
            </div>

            <div>
              <label htmlFor="rep-whatsapp-phone" className="block text-xs font-bold text-[#294337] dark:text-[#E2F0E7]">
                رقم جوال العريف (المخصص لواتساب)
              </label>
              <div className="mt-1.5">
                <input
                  id="rep-whatsapp-phone"
                  type="text"
                  dir="ltr"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full rounded-xl border border-[#D0DED6] bg-white px-3.5 py-2.5 text-xs text-left font-mono font-semibold text-[#1E3429] shadow-2xs transition focus:border-[#176B4B] focus:outline-none focus:ring-2 focus:ring-[#176B4B]/20 dark:border-[#304B3D] dark:bg-[#15251D] dark:text-[#EAF3ED]"
                />
              </div>
              <div className="mt-1 text-[11px]">
                {isValidSaudiPhone(whatsAppPhone) ? (
                  <span className="font-semibold text-[#19734C] dark:text-[#6DD39A] inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    رقم الهاتف صالح ومطابق للصيغة المعتمدة ({normalizeSaudiPhone(whatsAppPhone)})
                  </span>
                ) : (
                  <span className="text-[#98651E] dark:text-[#E9BC72]">
                    صيغة الرقم المتوقعة: 05XXXXXXXX أو 9665XXXXXXXX
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="rep-whatsapp-message" className="block text-xs font-bold text-[#294337] dark:text-[#E2F0E7]">
                  نص رسالة التذكير (يمكنك تعديلها بحرية قبل الإرسال)
                </label>
                <button
                  type="button"
                  onClick={handleResetDefaultMessage}
                  className="text-[11px] font-bold text-[#276B4B] hover:underline dark:text-[#91CBAA]"
                >
                  استعادة النص الافتراضي
                </button>
              </div>
              <div className="mt-1.5">
                <textarea
                  id="rep-whatsapp-message"
                  rows={5}
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  placeholder="اكتب رسالة التذكير هنا..."
                  className="w-full resize-none rounded-xl border border-[#D0DED6] bg-white p-3 text-xs leading-6 text-[#1E3429] shadow-2xs transition focus:border-[#176B4B] focus:outline-none focus:ring-2 focus:ring-[#176B4B]/20 dark:border-[#304B3D] dark:bg-[#15251D] dark:text-[#EAF3ED]"
                />
              </div>
              <p className="mt-1 text-[10px] text-[#84958B] dark:text-[#829B8C]">
                تتضمن الرسالة تلقائياً اسم العريف والشعبة واسم المدرسة للتأكيد. يمكنك تعديل أي جزء منها بحرية قبل الإرسال.
              </p>
            </div>

            <DialogFooter className="mt-5">
              <button
                type="button"
                onClick={() => setSelectedRepForWhatsApp(null)}
                className="rounded-xl border border-[#DCE7E1] bg-white px-4 py-2.5 text-xs font-bold text-[#5F7367] transition hover:bg-[#F3F7F4] dark:border-[#2D4537] dark:bg-[#192A20] dark:text-[#A0B7A9] dark:hover:bg-[#20362A]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={!whatsAppMessage.trim() || !isValidSaudiPhone(whatsAppPhone)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#20BA5A] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[#25D366]/25"
              >
                <MessageCircle className="h-4 w-4" />
                إرسال عبر واتساب
              </button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Reusable sidebar navigation
// -----------------------------------------------------------------------------

function NavigationLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-1.5">
          {!collapsed && (
            <h2 className="px-3 pb-1 text-[10px] font-extrabold tracking-wide text-[#84958B] dark:text-[#829B8C]">
              {section.title}
            </h2>
          )}
          {section.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : item.description}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group relative flex min-h-10 items-center gap-3 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#438A69] ${
                    collapsed ? 'justify-center px-2' : 'px-3'
                  } ${
                    isActive
                      ? 'bg-[#E8F3EC] text-[#176B4B] shadow-sm dark:bg-[#1E3A2C] dark:text-[#A4D7B9]'
                      : 'text-[#63746A] hover:bg-[#F3F7F4] hover:text-[#20392C] dark:text-[#AEC2B5] dark:hover:bg-[#1B3025] dark:hover:text-[#F0F7F3]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute bottom-2 right-0 top-2 w-[3px] rounded-l-full bg-[#238052] dark:bg-[#79C79A]" />}
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-[#176B4B] dark:text-[#A4D7B9]' : 'text-[#83938A] group-hover:text-[#347456] dark:text-[#91A99A] dark:group-hover:text-[#A4D7B9]'}`} />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {!collapsed && isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#238052] dark:bg-[#79C79A]" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { schoolName } = useSchoolSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => academicYearsApi.getActiveAcademicYear(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const activeWeek = useMemo(() => resolveDefaultAttendanceWeek(weeks) || weeks[0], [weeks]);
  const currentWeekNumber = activeWeek?.weekNumber;
  const pageInfo = useMemo(() => getPageInfo(location.pathname), [location.pathname]);
  const PageIcon = pageInfo.icon;
  const isDashboard = location.pathname === '/admin/dashboard' || location.pathname === '/admin' || location.pathname === '/admin/';
  const today = useMemo(() => getArabicToday(), []);
  const displaySchoolName = schoolName || user?.schoolName || 'مدرستي';
  const displayUserName = user?.fullName || 'مدير المدرسة';

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
  };

  const outletContent = (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-[#DCE7E1] bg-white p-10 dark:border-[#263D30] dark:bg-[#14221A]">
          <MuwathibLoading size="fullscreen" />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );

  return (
    <div dir="rtl" className="flex min-h-screen bg-[#F4F7F5] text-[#20362B] selection:bg-[#23764F] selection:text-white transition-colors duration-200 dark:bg-[#0E1712] dark:text-[#EAF3ED]">
      {/* Desktop sidebar */}
      <aside className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-l border-[#DCE7E1] bg-white shadow-[0_0_24px_rgba(25,55,39,0.035)] transition-[width] duration-200 dark:border-[#263D30] dark:bg-[#14221A] md:flex ${isSidebarCollapsed ? 'w-[82px]' : 'w-[270px]'}`}>
        <div className={`flex h-[76px] shrink-0 items-center border-b border-[#E8EFEB] px-4 dark:border-[#263D30] ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {isSidebarCollapsed ? (
            <button type="button" onClick={() => setIsSidebarCollapsed(false)} className="rounded-xl p-1 transition hover:bg-[#F1F6F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#438A69] dark:hover:bg-[#20372A]" title="توسيع القائمة" aria-label="توسيع القائمة الجانبية">
              <BrandLogo collapsed className="h-10 w-10 object-contain" alt="مواظب" />
            </button>
          ) : (
            <>
              <BrandLogo autoTheme className="h-10 max-w-[170px] object-contain" alt="شعار منصة مواظب" />
              <button type="button" onClick={() => setIsSidebarCollapsed(true)} className="rounded-lg p-2 text-[#71857A] transition hover:bg-[#F1F6F2] hover:text-[#285D42] dark:text-[#91A99A] dark:hover:bg-[#20372A] dark:hover:text-[#B7E0C5]" title="طي القائمة الجانبية" aria-label="طي القائمة الجانبية">
                <PanelRightClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {!isSidebarCollapsed && (
          <div className="mx-3 mt-4 rounded-xl border border-[#DCE9E1] bg-gradient-to-l from-[#F4F9F5] to-[#EDF5EF] p-3 dark:border-[#2C4937] dark:from-[#1A3022] dark:to-[#192A20]">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#347456] shadow-sm dark:bg-[#294333] dark:text-[#A4D7B9]"><Building2 className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-[#294337] dark:text-[#E2F0E7]">{displaySchoolName}</p>
                <p className="mt-0.5 text-[10px] text-[#829188] dark:text-[#9AB0A1]">بوابة إدارة المدرسة</p>
              </div>
            </div>
          </div>
        )}

        <NavigationLinks collapsed={isSidebarCollapsed} />

        <div className="shrink-0 border-t border-[#E8EFEB] p-3 dark:border-[#263D30]">
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={() => setIsSidebarCollapsed(false)} className="rounded-lg p-2 text-[#71857A] transition hover:bg-[#F1F6F2] dark:text-[#91A99A] dark:hover:bg-[#20372A]" title="توسيع القائمة"><PanelRightOpen className="h-4 w-4" /></button>
              <button type="button" onClick={handleLogout} className="rounded-lg p-2 text-[#8A9690] transition hover:bg-[#FCEDEC] hover:text-[#A83E3E] dark:text-[#91A99A] dark:hover:bg-[#3A2423] dark:hover:text-[#F49A93]" title="تسجيل الخروج"><LogOut className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-[#E5ECE8] bg-[#FAFCFA] p-2 dark:border-[#2A4032] dark:bg-[#19291F]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCEDE2] text-sm font-black text-[#236345] dark:bg-[#294936] dark:text-[#B5E0C5]">{displayUserName.trim().charAt(0) || 'م'}</div>
              <button type="button" onClick={() => navigate('/admin/profile')} className="min-w-0 flex-1 text-right">
                <span className="block truncate text-xs font-extrabold text-[#294337] dark:text-[#E2F0E7]">{displayUserName}</span>
                <span className="mt-0.5 block text-[10px] text-[#829188] dark:text-[#9AB0A1]">مسؤول النظام</span>
              </button>
              <button type="button" onClick={handleLogout} className="rounded-lg p-2 text-[#8A9690] transition hover:bg-[#FCEDEC] hover:text-[#A83E3E] dark:text-[#91A99A] dark:hover:bg-[#3A2423] dark:hover:text-[#F49A93]" title="تسجيل الخروج" aria-label="تسجيل الخروج"><LogOut className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="القائمة الرئيسية">
          <button type="button" className="absolute inset-0 bg-[#08130D]/55 backdrop-blur-[2px]" onClick={() => setIsMobileMenuOpen(false)} aria-label="إغلاق القائمة" />
          <aside className="absolute bottom-0 right-0 top-0 flex w-[min(86vw,320px)] flex-col border-l border-[#DCE7E1] bg-white shadow-2xl dark:border-[#263D30] dark:bg-[#14221A]">
            <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#E8EFEB] px-4 dark:border-[#263D30]">
              <BrandLogo autoTheme className="h-9 max-w-[165px] object-contain" alt="شعار مواظب" />
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg p-2 text-[#71857A] hover:bg-[#F1F6F2] dark:text-[#91A99A] dark:hover:bg-[#20372A]" aria-label="إغلاق القائمة"><X className="h-5 w-5" /></button>
            </div>
            <NavigationLinks onNavigate={() => setIsMobileMenuOpen(false)} />
            <div className="border-t border-[#E8EFEB] p-3 dark:border-[#263D30]">
              <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FCEDEC] px-4 py-3 text-xs font-extrabold text-[#A83E3E] transition hover:bg-[#F8DDDA] dark:bg-[#3A2423] dark:text-[#F49A93] dark:hover:bg-[#4A2B29]"><LogOut className="h-4 w-4" />تسجيل الخروج</button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[#DCE7E1] bg-white/95 shadow-[0_2px_12px_rgba(25,55,39,0.025)] backdrop-blur-md dark:border-[#263D30] dark:bg-[#14221A]/95">
          <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="rounded-xl border border-[#E0E9E3] p-2 text-[#476A56] transition hover:bg-[#F1F6F2] dark:border-[#304A38] dark:text-[#A4D7B9] dark:hover:bg-[#20372A] md:hidden" aria-label="فتح القائمة الرئيسية"><Menu className="h-5 w-5" /></button>
              <div className="hidden items-center md:flex">
                <BrandLogo variant="favicon" className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E7DE] bg-[#F1F7F3] px-2.5 py-1 text-[10px] font-bold text-[#286B49] dark:border-[#315540] dark:bg-[#1B3324] dark:text-[#A4D7B9]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2B9A67]" />
                    {activeYear?.yearName ? `العام الدراسي ${activeYear.yearName}` : 'العام الدراسي'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE7E8] bg-[#F1F6F6] px-2.5 py-1 text-[10px] font-bold text-[#28646B] dark:border-[#315156] dark:bg-[#1B3033] dark:text-[#9ED2D2]">
                    <Calendar className="h-3 w-3" />
                    {currentWeekNumber ? `الأسبوع ${currentWeekNumber}` : 'الأسبوع الدراسي'}
                  </span>
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <PageIcon className="hidden h-4 w-4 shrink-0 text-[#71917E] dark:text-[#91B9A0] sm:block" />
                  <h1 className="truncate text-sm font-extrabold text-[#294337] dark:text-[#E2F0E7]">{pageInfo.label}</h1>
                  <span className="hidden text-[10px] text-[#A0ADA5] dark:text-[#758E7D] lg:inline">· {pageInfo.description}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden max-w-[170px] truncate text-xs font-semibold text-[#71837A] dark:text-[#9DB5A8] xl:block">{displaySchoolName}</span>
              <div className="h-5 w-px bg-[#E1EAE4] dark:bg-[#304638]" />
              <ThemeToggle />
              <button type="button" onClick={() => navigate('/admin/profile')} className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-[#F1F6F2] dark:hover:bg-[#20372A]" title="الملف الشخصي">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCEDE2] text-sm font-black text-[#236345] ring-2 ring-white dark:bg-[#294936] dark:text-[#B5E0C5] dark:ring-[#14221A]">{displayUserName.trim().charAt(0) || 'م'}</span>
                <span className="hidden max-w-[130px] text-right sm:block"><span className="block truncate text-xs font-extrabold text-[#294337] dark:text-[#E2F0E7]">{displayUserName}</span><span className="mt-0.5 block text-[10px] text-[#829188] dark:text-[#9AB0A1]">مدير المدرسة</span></span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {isDashboard ? (
            <DashboardOverview
              userName={displayUserName}
              schoolName={displaySchoolName}
              today={today}
              activeWeek={activeWeek}
              sideSlot={outletContent}
            />
          ) : (
            outletContent
          )}
        </main>


      </div>
    </div>
  );
}

export default AdminLayout;