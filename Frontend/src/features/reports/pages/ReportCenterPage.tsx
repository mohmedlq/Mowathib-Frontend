
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  FileSpreadsheet,
  CalendarDays,
  CalendarRange,
  Calendar,
  Printer,
  Eye,
  EyeOff,
  GraduationCap,
  Users,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import { schoolDataService } from '../../../shared/services/schoolDataService';
import { reportCalculationService } from '../services/reportCalculationService';
import { excelExportService } from '../services/excelExportService';

import type { MonthlyAttendanceWeekData } from '../services/excelExportService';

import { DailyReportView } from '../components/DailyReportView';
import { WeeklyReportView } from '../components/WeeklyReportView';
import { MonthlyReportView } from '../components/MonthlyReportView';

import {
  LoadingState,
  Spinner,
} from '../../../shared/components/ui/Spinner';

import { useNotifications } from '../../notifications';
import { useSchoolSettings } from '../../../shared/services/schoolSettingsService';

import type { StudentWeeklyAttendance } from '../../attendance';

import {
  SCHOOL_DAYS,
  type AttendanceStatus,
  type AttendanceRecord,
  type ClassEnrollment,
  type ClassItem,
} from '../../../shared/types';

import {
  formatArabicDateShort,
  getRiyadhDateOnly,
  resolveDefaultAttendanceWeek,
} from '../../../shared/utils/date';

import { BrandLogo } from '../../../components/common/BrandLogo';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ReportType = 'daily' | 'weekly' | 'monthly';

export type ExportScope = 'all' | 'grade' | 'class';

export type DailyKind = 'attendance' | 'absence';

export interface AcademicGrade {
  gradeId: number;
  gradeName: string;
  classes: ClassItem[];
}

interface PreviewConfig {
  reportType: ReportType;
  scope: ExportScope;
  gradeId?: number;
  classId?: number;
  date?: string;
  weekId?: number;
  month?: string;
  kind?: DailyKind;
  title: string;
  subtitle: string;
}

// -----------------------------------------------------------------------------
// Shared styles
// -----------------------------------------------------------------------------

const inputClassName =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-[#245B63] focus:ring-4 focus:ring-[#245B63]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-500/10 [color-scheme:light] dark:[color-scheme:dark]';

const surfaceClassName =
  'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

const mutedTextClassName =
  'text-slate-500 dark:text-slate-400';

// -----------------------------------------------------------------------------
// General Helpers
// -----------------------------------------------------------------------------

function getClassNumber(classItem: ClassItem): number | undefined {
  const item = classItem as ClassItem & {
    classNumber?: number;
  };

  const raw = String(
    item.classNumber ?? item.className ?? '',
  );

  const match = raw.match(/\d+/);

  return match ? Number(match[0]) : undefined;
}

function getClassLabel(classItem?: ClassItem): string {
  if (!classItem) return 'الشعبة المحددة';

  const classNumber = getClassNumber(classItem);

  return classItem.className
    ? `شعبة ${classItem.className}`
    : classNumber
      ? `شعبة ${classNumber}`
      : `شعبة ${classItem.classId}`;
}

/** Dynamically groups classes into grades. */
export function extractGradesFromClasses(
  classes: ClassItem[],
): AcademicGrade[] {
  const gradeMap = new Map<number, AcademicGrade>();

  const knownNames: Record<number, string> = {
    1: 'الصف الأول الثانوي',
    2: 'الصف الثاني الثانوي',
    3: 'الصف الثالث الثانوي',
  };

  classes.forEach((classItem) => {
    const classNumber = getClassNumber(classItem);

    const raw = String(
      classItem.className ?? classNumber ?? '',
    );

    const numMatch = raw.match(/\d+/);

    let gradeNum = 1;

    if (
      raw.includes('الأول') ||
      (numMatch && numMatch[0].startsWith('1'))
    ) {
      gradeNum = 1;
    } else if (
      raw.includes('الثاني') ||
      (numMatch && numMatch[0].startsWith('2'))
    ) {
      gradeNum = 2;
    } else if (
      raw.includes('الثالث') ||
      (numMatch && numMatch[0].startsWith('3'))
    ) {
      gradeNum = 3;
    }

    if (!gradeMap.has(gradeNum)) {
      gradeMap.set(gradeNum, {
        gradeId: gradeNum,
        gradeName:
          knownNames[gradeNum] || `المرحلة ${gradeNum}`,
        classes: [],
      });
    }

    gradeMap.get(gradeNum)!.classes.push(classItem);
  });

  return Array.from(gradeMap.values())
    .map((grade) => ({
      ...grade,
      classes: [...grade.classes].sort(
        (a, b) =>
          (getClassNumber(a) ?? a.classId) -
          (getClassNumber(b) ?? b.classId),
      ),
    }))
    .sort((a, b) => a.gradeId - b.gradeId);
}

/** Sunday=1 through Thursday=5. */
function getDayInfoFromDate(dateStr: string) {
  if (!dateStr) {
    return {
      dayNumber: null as number | null,
      dayName: '—',
      formattedDate: '',
      isSchoolDay: false,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return {
      dayNumber: null as number | null,
      dayName: 'تاريخ غير صالح',
      formattedDate: '',
      isSchoolDay: false,
    };
  }

  const date = new Date(`${dateStr}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(dateStr.slice(0, 4)) ||
    date.getMonth() + 1 !== Number(dateStr.slice(5, 7)) ||
    date.getDate() !== Number(dateStr.slice(8, 10))
  ) {
    return {
      dayNumber: null as number | null,
      dayName: 'تاريخ غير صالح',
      formattedDate: '',
      isSchoolDay: false,
    };
  }

  const dayIndex = date.getDay();

  const dayNames = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ];

  const isSchoolDay = dayIndex >= 0 && dayIndex <= 4;

  return {
    dayNumber: isSchoolDay ? dayIndex + 1 : null,
    dayName: dayNames[dayIndex] || '—',
    formattedDate: formatArabicDateShort(dateStr),
    isSchoolDay,
  };
}

function getArabicMonthName(monthStr: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr);

  if (!match) return monthStr;

  const year = match[1];
  const monthNumber = Number.parseInt(match[2], 10);

  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  return `${months[monthNumber - 1] || monthStr} ${year}م`;
}

function getMonthDateRange(month: string): {
  monthStart: string;
  monthEnd: string;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(month);

  if (!match) {
    throw new Error('صيغة الشهر غير صحيحة.');
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error('الشهر المحدد غير صحيح.');
  }

  const lastDay = new Date(
    Date.UTC(year, monthNumber, 0),
  ).getUTCDate();

  return {
    monthStart: `${month}-01`,
    monthEnd: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

function toDateKey(value: string | Date): string {
  const dateKey = String(value).trim().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(
      `تاريخ أسبوع دراسي غير صالح: ${String(value)}`,
    );
  }

  return dateKey;
}

function buildEnrollmentClassMap(
  enrollments: ClassEnrollment[],
): Map<number, number> {
  const result = new Map<number, number>();

  enrollments.forEach((enrollment) => {
    result.set(
      enrollment.enrollmentId,
      enrollment.classId,
    );
  });

  return result;
}

function groupRecordsByClass(
  records: AttendanceRecord[],
  enrollmentClassMap: Map<number, number>,
): Map<number, AttendanceRecord[]> {
  const result = new Map<number, AttendanceRecord[]>();

  records.forEach((record) => {
    const recordWithClass = record as AttendanceRecord & {
      classId?: number;
    };

    const directClassId = Number(recordWithClass.classId);

    const classId =
      directClassId > 0
        ? directClassId
        : enrollmentClassMap.get(record.enrollmentId) ?? 0;

    if (classId <= 0) return;

    const current = result.get(classId) || [];

    current.push(record);

    result.set(classId, current);
  });

  return result;
}

// -----------------------------------------------------------------------------
// Attendance Helpers
// -----------------------------------------------------------------------------

async function fetchDailyRecords(
  date: string,
  classId: number | undefined,
  matchingWeek: {
    attendanceWeekId: number;
  } | undefined,
): Promise<AttendanceRecord[]> {
  let dateRecords: AttendanceRecord[] | null = null;

  try {
    dateRecords =
      await schoolDataService.getAttendanceRecordsByDate(
        date,
        classId,
      );
  } catch (error) {
    // Week records are a supported fallback for daily reports.
    if (!matchingWeek) throw error;
  }

  if (dateRecords && dateRecords.length > 0) {
    return dateRecords;
  }

  if (!matchingWeek) {
    return [];
  }

  if (classId) {
    return schoolDataService.getAttendanceRecords(
      classId,
      matchingWeek.attendanceWeekId,
    );
  }

  return schoolDataService.getAttendanceRecordsByWeek(
    matchingWeek.attendanceWeekId,
  );
}

function buildWeeklyAttendanceRows(
  enrollments: ClassEnrollment[],
  records: AttendanceRecord[],
): StudentWeeklyAttendance[] {
  const recordBySlot = new Map<string, AttendanceRecord>();

  records.forEach((record) => {
    const key =
      `${record.enrollmentId}:${record.dayNumber}`;

    if (!recordBySlot.has(key)) {
      recordBySlot.set(key, record);
    }
  });

  return enrollments.map((enrollment) => {
    const slots: Record<
      number,
      {
        status: AttendanceStatus;
        recordId?: number;
        attendanceDate?: string;
      }
    > = {};

    let present = 0;
    let absent = 0;
    let discontinued = 0;
    let unmarked = 0;

    SCHOOL_DAYS.forEach((day) => {
      const match = recordBySlot.get(
        `${enrollment.enrollmentId}:${day.dayNumber}`,
      );

      if (!match) {
        slots[day.dayNumber] = {
          status: 'Unmarked',
        };

        unmarked++;
        return;
      }

      slots[day.dayNumber] = {
        status: match.status,
        recordId: match.attendanceRecordId,
        attendanceDate: match.attendanceDate,
      };

      if (match.status === 'Present') present++;
      else if (match.status === 'Absent') absent++;
      else if (match.status === 'Discontinued') discontinued++;
      else unmarked++;
    });

    return {
      enrollment,
      slots,
      summary: {
        present,
        absent,
        discontinued,
        unmarked,
      },
    };
  });
}

// -----------------------------------------------------------------------------
// UI Components
// -----------------------------------------------------------------------------

function ReportTab({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof CalendarDays;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-w-0 items-center justify-center gap-2.5 rounded-xl px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#245B63]/15 sm:gap-3 sm:px-4 ${
        active
          ? 'bg-white text-[#194A50] shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-teal-200 dark:ring-slate-700'
          : 'text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${
          active
            ? 'bg-[#245B63] text-white dark:bg-teal-700'
            : 'bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        }`}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>

      <span className="min-w-0 text-right">
        <span className="block text-xs font-bold sm:text-sm">
          {title}
        </span>

        <span
          className={`mt-0.5 hidden text-[11px] sm:block ${mutedTextClassName}`}
        >
          {description}
        </span>
      </span>
    </button>
  );
}

/** Direct date selection without a large embedded calendar. */
function DailyDateField({
  value,
  onChange,
  isValid,
  weekLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  isValid: boolean;
  weekLabel?: string;
}) {
  const today = getRiyadhDateOnly();

  const info = getDayInfoFromDate(value);

  let message = 'حدد تاريخ التقرير';

  if (value) {
    if (!info.isSchoolDay) {
      message = 'الجمعة والسبت خارج أيام الدوام';
    } else if (value > today) {
      message = 'لا يمكن اختيار تاريخ مستقبلي';
    } else if (!isValid) {
      message = 'التاريخ خارج الأسابيع المسجلة';
    } else {
      message = 'التاريخ صالح للتقرير';
    }
  }

  return (
    <div className="min-w-0">
      <label
        htmlFor="daily-report-date"
        className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
      >
        تاريخ التقرير
      </label>

      <div className="flex gap-2">
        <input
          id="daily-report-date"
          type="date"
          value={value}
          max={today}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        />

        <button
          type="button"
          onClick={() => onChange(today)}
          className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-[#245B63] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-slate-800"
        >
          اليوم
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {info.dayName}
          {value ? `، ${info.formattedDate}` : ''}
        </p>

        <span
          className={`text-[11px] font-semibold ${
            isValid
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {message}
        </span>
      </div>

      {weekLabel && isValid && (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          {weekLabel}
        </p>
      )}
    </div>
  );
}

function ReportError({
  title,
  description,
  onRetry,
  retrying = false,
}: {
  title: string;
  description: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 text-center ${surfaceClassName}`}
      dir="rtl"
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <AlertCircle className="h-6 w-6" />
      </span>

      <h3 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-slate-100">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>

      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#245B63] px-5 text-xs font-bold text-white transition hover:bg-[#1B4A50] disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
      >
        {retrying ? (
          <Spinner size="sm" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}

        إعادة المحاولة
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Page
// -----------------------------------------------------------------------------

export function ReportCenterPage() {
  const { schoolName } = useSchoolSettings();
  const { toast } = useNotifications();

  // ---------------------------------------------------------------------------
  // Configuration State
  // ---------------------------------------------------------------------------

  const [activeReportType, setActiveReportType] =
    useState<ReportType>('daily');

  const [dailyScope, setDailyScope] =
    useState<ExportScope>('all');

  const [dailyGradeId, setDailyGradeId] =
    useState(1);

  const [dailyClassId, setDailyClassId] =
    useState(0);

  const [dailyDate, setDailyDate] =
    useState(() => getRiyadhDateOnly());

  const [dailyKind, setDailyKind] =
    useState<DailyKind>('attendance');


  const [weeklyScope, setWeeklyScope] =
    useState<ExportScope>('all');

  const [weeklyGradeId, setWeeklyGradeId] =
    useState(1);

  const [weeklyClassId, setWeeklyClassId] =
    useState(0);

  const [weeklyWeekId, setWeeklyWeekId] =
    useState(0);


  const [monthlyScope, setMonthlyScope] =
    useState<ExportScope>('all');

  const [monthlyGradeId, setMonthlyGradeId] =
    useState(1);

  const [monthlyClassId, setMonthlyClassId] =
    useState(0);

  const [monthlyMonth, setMonthlyMonth] =
    useState(() => getRiyadhDateOnly().slice(0, 7));


  const [isExporting, setIsExporting] =
    useState(false);

  const [exportingReport, setExportingReport] =
    useState<ReportType | null>(null);

  const [showPreview, setShowPreview] =
    useState(false);

  const [previewConfig, setPreviewConfig] =
    useState<PreviewConfig | null>(null);


  // ---------------------------------------------------------------------------
  // Base Queries
  // ---------------------------------------------------------------------------

  const {
    data: classes = [],
    isLoading: isLoadingClasses,
    isError: isClassesError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
    retry: 1,
    staleTime: 1000 * 60 * 30,
  });


  const {
    data: weeks = [],
    isLoading: isLoadingWeeks,
    isError: isWeeksError,
    refetch: refetchWeeks,
  } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    retry: 1,
    staleTime: 1000 * 60 * 30,
  });


  const {
    data: allEnrollments = [],
    isLoading: isLoadingEnrollments,
    isError: isEnrollmentsError,
    refetch: refetchEnrollments,
  } = useQuery({
    queryKey: ['all_enrollments'],
    queryFn: () => schoolDataService.getAllEnrollments(),
    retry: 1,
    staleTime: 1000 * 60 * 15,
  });


  const grades = useMemo(
    () => extractGradesFromClasses(classes),
    [classes],
  );


  const dailyDayInfo = useMemo(
    () => getDayInfoFromDate(dailyDate),
    [dailyDate],
  );


  const today = getRiyadhDateOnly();


  // ---------------------------------------------------------------------------
  // Default Selections
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (weeks.length === 0) return;

    if (
      !weeklyWeekId ||
      !weeks.some(
        (week) =>
          week.attendanceWeekId === weeklyWeekId,
      )
    ) {
      const defaultWeek =
        resolveDefaultAttendanceWeek(weeks) || weeks[0];

      if (defaultWeek) {
        setWeeklyWeekId(defaultWeek.attendanceWeekId);
      }
    }
  }, [weeks, weeklyWeekId]);


  useEffect(() => {
    if (grades.length === 0) return;

    if (!grades.some((grade) => grade.gradeId === dailyGradeId)) {
      setDailyGradeId(grades[0].gradeId);
    }

    if (!grades.some((grade) => grade.gradeId === weeklyGradeId)) {
      setWeeklyGradeId(grades[0].gradeId);
    }

    if (!grades.some((grade) => grade.gradeId === monthlyGradeId)) {
      setMonthlyGradeId(grades[0].gradeId);
    }
  }, [
    grades,
    dailyGradeId,
    weeklyGradeId,
    monthlyGradeId,
  ]);


  useEffect(() => {
    const grade = grades.find(
      (item) => item.gradeId === dailyGradeId,
    );

    if (
      grade?.classes.length &&
      !grade.classes.some(
        (item) => item.classId === dailyClassId,
      )
    ) {
      setDailyClassId(grade.classes[0].classId);
    }
  }, [dailyGradeId, dailyClassId, grades]);


  useEffect(() => {
    const grade = grades.find(
      (item) => item.gradeId === weeklyGradeId,
    );

    if (
      grade?.classes.length &&
      !grade.classes.some(
        (item) => item.classId === weeklyClassId,
      )
    ) {
      setWeeklyClassId(grade.classes[0].classId);
    }
  }, [weeklyGradeId, weeklyClassId, grades]);


  useEffect(() => {
    const grade = grades.find(
      (item) => item.gradeId === monthlyGradeId,
    );

    if (
      grade?.classes.length &&
      !grade.classes.some(
        (item) => item.classId === monthlyClassId,
      )
    ) {
      setMonthlyClassId(grade.classes[0].classId);
    }
  }, [monthlyGradeId, monthlyClassId, grades]);


  // ---------------------------------------------------------------------------
  // Active Configuration
  // ---------------------------------------------------------------------------

  const activeWeek = useMemo(
    () =>
      weeks.find(
        (week) =>
          week.attendanceWeekId === weeklyWeekId,
      ) || weeks[0],
    [weeks, weeklyWeekId],
  );


  const dailyMatchingWeek = useMemo(
    () =>
      weeks.find((week) => {
        const start = toDateKey(week.startDate);
        const end = toDateKey(week.endDate);

        return dailyDate >= start && dailyDate <= end;
      }),
    [weeks, dailyDate],
  );


  const isDailyDateValid =
    dailyDayInfo.isSchoolDay &&
    dailyDate <= today &&
    Boolean(dailyMatchingWeek);


  const isMonthValid =
    /^\d{4}-(0[1-9]|1[0-2])$/.test(monthlyMonth) &&
    monthlyMonth <= today.slice(0, 7);


  const activeScope: ExportScope =
    activeReportType === 'daily'
      ? dailyScope
      : activeReportType === 'weekly'
        ? weeklyScope
        : monthlyScope;


  const activeGradeId =
    activeReportType === 'daily'
      ? dailyGradeId
      : activeReportType === 'weekly'
        ? weeklyGradeId
        : monthlyGradeId;


  const activeClassId =
    activeReportType === 'daily'
      ? dailyClassId
      : activeReportType === 'weekly'
        ? weeklyClassId
        : monthlyClassId;


  const activeGrade = useMemo(
    () =>
      grades.find(
        (grade) => grade.gradeId === activeGradeId,
      ),
    [grades, activeGradeId],
  );


  const activeClass = useMemo(
    () =>
      activeGrade?.classes.find(
        (item) => item.classId === activeClassId,
      ),
    [activeGrade, activeClassId],
  );


  const hasValidScopeSelection =
    activeScope === 'all' ||
    (
      Boolean(activeGrade) &&
      (
        activeScope === 'grade' ||
        Boolean(activeClass)
      )
    );


  const canRunReport =
    hasValidScopeSelection &&
    (
      activeReportType === 'daily'
        ? isDailyDateValid
        : activeReportType === 'weekly'
          ? Boolean(activeWeek)
          : isMonthValid
    );


  // ---------------------------------------------------------------------------
  // State Update Helpers
  // ---------------------------------------------------------------------------

  const updateActiveScope = (value: ExportScope) => {
    if (activeReportType === 'daily') {
      setDailyScope(value);
    } else if (activeReportType === 'weekly') {
      setWeeklyScope(value);
    } else {
      setMonthlyScope(value);
    }
  };


  const updateActiveGrade = (value: number) => {
    if (activeReportType === 'daily') {
      setDailyGradeId(value);
    } else if (activeReportType === 'weekly') {
      setWeeklyGradeId(value);
    } else {
      setMonthlyGradeId(value);
    }
  };


  const updateActiveClass = (value: number) => {
    if (activeReportType === 'daily') {
      setDailyClassId(value);
    } else if (activeReportType === 'weekly') {
      setWeeklyClassId(value);
    } else {
      setMonthlyClassId(value);
    }
  };


  // ---------------------------------------------------------------------------
  // Enrollment Helpers
  // ---------------------------------------------------------------------------




  const previewEnrollments = useMemo(() => {
    if (!previewConfig) return [];

    if (
      previewConfig.scope === 'class' &&
      previewConfig.classId
    ) {
      return allEnrollments.filter(
        (enrollment) =>
          enrollment.classId === previewConfig.classId,
      );
    }

    if (
      previewConfig.scope === 'grade' &&
      previewConfig.gradeId
    ) {
      const grade = grades.find(
        (item) =>
          item.gradeId === previewConfig.gradeId,
      );

      const classIds = new Set(
        grade?.classes.map((item) => item.classId) || [],
      );

      return allEnrollments.filter(
        (enrollment) =>
          classIds.has(enrollment.classId),
      );
    }

    return allEnrollments;
  }, [previewConfig, allEnrollments, grades]);


  // ---------------------------------------------------------------------------
  // Preview Records Query
  // ---------------------------------------------------------------------------

  const {
    data: previewRecords = [],
    isLoading: isLoadingPreviewRecords,
    isError: isPreviewRecordsError,
    refetch: refetchPreviewRecords,
  } = useQuery({
    queryKey: [
      'preview_records',
      previewConfig?.reportType,
      previewConfig?.scope,
      previewConfig?.gradeId,
      previewConfig?.classId,
      previewConfig?.date,
      previewConfig?.weekId,
      previewConfig?.month,
    ],

    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!previewConfig) return [];

      // DAILY
      if (
        previewConfig.reportType === 'daily' &&
        previewConfig.date
      ) {
        const targetClass =
          previewConfig.scope === 'class'
            ? previewConfig.classId
            : undefined;

        const matchingWeek = weeks.find((week) => {
          const start = toDateKey(week.startDate);
          const end = toDateKey(week.endDate);

          return (
            previewConfig.date! >= start &&
            previewConfig.date! <= end
          );
        });

        return fetchDailyRecords(
          previewConfig.date,
          targetClass,
          matchingWeek,
        );
      }


      // WEEKLY
      if (
        previewConfig.reportType === 'weekly' &&
        previewConfig.weekId
      ) {
        if (
          previewConfig.scope === 'class' &&
          previewConfig.classId
        ) {
          return schoolDataService.getAttendanceRecords(
            previewConfig.classId,
            previewConfig.weekId,
          );
        }

        return schoolDataService.getAttendanceRecordsByWeek(
          previewConfig.weekId,
        );
      }


      // MONTHLY
      if (
        previewConfig.reportType === 'monthly' &&
        previewConfig.month
      ) {
        const { monthStart, monthEnd } =
          getMonthDateRange(previewConfig.month);

        const overlappingWeeks = weeks.filter((week) => {
          const start = toDateKey(week.startDate);
          const end = toDateKey(week.endDate);

          return (
            start <= monthEnd &&
            end >= monthStart
          );
        });

        const recordLists = await Promise.all(
          overlappingWeeks.map((week) => {
            if (
              previewConfig.scope === 'class' &&
              previewConfig.classId
            ) {
              return schoolDataService.getAttendanceRecords(
                previewConfig.classId,
                week.attendanceWeekId,
              );
            }

            return schoolDataService.getAttendanceRecordsByWeek(
              week.attendanceWeekId,
            );
          }),
        );

        return recordLists.flat();
      }

      return [];
    },

    enabled: showPreview && Boolean(previewConfig),

    retry: 1,

    staleTime: 30_000,
  });


  // ---------------------------------------------------------------------------
  // Preview Calculations
  // ---------------------------------------------------------------------------

  const dailyPreviewData = useMemo(() => {
    if (
      previewConfig?.reportType !== 'daily' ||
      !previewConfig.date
    ) {
      return {
        rows: [],
        absences: [],
        dayName: 'الأحد',
        formattedDate: '',
        dayNumber: undefined as number | undefined,
      };
    }

    const info = getDayInfoFromDate(
      previewConfig.date,
    );

    if (
      !info.isSchoolDay ||
      info.dayNumber === null
    ) {
      return {
        rows: [],
        absences: [],
        dayName: info.dayName,
        formattedDate: info.formattedDate,
        dayNumber: undefined as number | undefined,
      };
    }

    const matchingWeek = weeks.find((week) => {
      const start = toDateKey(week.startDate);
      const end = toDateKey(week.endDate);

      return (
        previewConfig.date! >= start &&
        previewConfig.date! <= end
      );
    });

    const startDate =
      matchingWeek?.startDate || previewConfig.date;

    const rows =
      reportCalculationService.calculateDailyAttendance(
        previewEnrollments,
        previewRecords,
        info.dayNumber,
        startDate,
      );

    const absences =
      reportCalculationService.calculateDailyAbsences(
        previewEnrollments,
        previewRecords,
        info.dayNumber,
        startDate,
      );

    return {
      rows,
      absences,
      dayName: info.dayName,
      formattedDate: info.formattedDate,
      dayNumber: info.dayNumber,
    };
  }, [
    previewConfig,
    previewEnrollments,
    previewRecords,
    weeks,
  ]);


  const weeklyPreviewAttendances = useMemo(
    () => {
      if (previewConfig?.reportType !== 'weekly') {
        return [];
      }

      return buildWeeklyAttendanceRows(
        previewEnrollments,
        previewRecords,
      );
    },
    [
      previewConfig,
      previewEnrollments,
      previewRecords,
    ],
  );


  const monthlyPreviewData = useMemo(() => {
    if (
      previewConfig?.reportType !== 'monthly' ||
      !previewConfig.month
    ) {
      return {
        summary: [],
        detailedAbsences: [],
      };
    }

    return reportCalculationService.calculateMonthlyReport(
      previewEnrollments,
      previewRecords,
      weeks,
      previewConfig.month,
    );
  }, [
    previewConfig,
    previewEnrollments,
    previewRecords,
    weeks,
  ]);


  const previewWeek = useMemo(
    () =>
      weeks.find(
        (week) =>
          week.attendanceWeekId === previewConfig?.weekId,
      ) || weeks[0],
    [weeks, previewConfig?.weekId],
  );


  // ---------------------------------------------------------------------------
  // Preview Configuration
  // ---------------------------------------------------------------------------

  const handleOpenPreview = (type: ReportType) => {
    if (!canRunReport) {
      toast.show(
        'يرجى مراجعة نطاق التقرير والفترة المحددة.',
        'danger',
      );

      return;
    }

    let title = '';
    let subtitle = '';

    // DAILY
    if (type === 'daily') {
      const dayInfo = getDayInfoFromDate(dailyDate);

      const selectedGrade = grades.find(
        (grade) =>
          grade.gradeId === dailyGradeId,
      );

      const selectedClass = classes.find(
        (item) => item.classId === dailyClassId,
      );

      if (dailyScope === 'all') {
        title =
          'تقرير الحضور والغياب اليومي — المدرسة كاملة';

        subtitle =
          `${dayInfo.dayName}، ${dayInfo.formattedDate}`;
      } else if (dailyScope === 'grade') {
        title =
          `تقرير الحضور والغياب اليومي — ${selectedGrade?.gradeName || 'المرحلة الدراسية'}`;

        subtitle =
          `${dayInfo.dayName}، ${dayInfo.formattedDate}`;
      } else {
        title =
          `تقرير الحضور والغياب اليومي — ${getClassLabel(selectedClass)}`;

        subtitle =
          `${dayInfo.dayName}، ${dayInfo.formattedDate}`;
      }

      setPreviewConfig({
        reportType: 'daily',
        scope: dailyScope,
        gradeId: dailyGradeId,
        classId: dailyClassId,
        date: dailyDate,
        kind:
          dailyScope === 'class'
            ? dailyKind
            : 'attendance',
        title,
        subtitle,
      });
    }

    // WEEKLY
    else if (type === 'weekly') {
      const selectedWeek = activeWeek;

      if (!selectedWeek) {
        toast.show(
          'لا توجد أسابيع دراسية متاحة.',
          'danger',
        );

        return;
      }

      const weekRange =
        `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(selectedWeek.endDate)}`;

      const selectedGrade = grades.find(
        (grade) =>
          grade.gradeId === weeklyGradeId,
      );

      const selectedClass = classes.find(
        (item) => item.classId === weeklyClassId,
      );

      if (weeklyScope === 'all') {
        title =
          `تقرير الحضور الأسبوعي — الأسبوع ${selectedWeek.weekNumber}`;

        subtitle = weekRange;
      } else if (weeklyScope === 'grade') {
        title =
          `تقرير الحضور الأسبوعي — ${selectedGrade?.gradeName || 'المرحلة'}`;

        subtitle =
          `الأسبوع ${selectedWeek.weekNumber} | ${weekRange}`;
      } else {
        title =
          `تقرير الحضور الأسبوعي — ${getClassLabel(selectedClass)}`;

        subtitle =
          `الأسبوع ${selectedWeek.weekNumber} | ${weekRange}`;
      }

      setPreviewConfig({
        reportType: 'weekly',
        scope: weeklyScope,
        gradeId: weeklyGradeId,
        classId: weeklyClassId,
        weekId: selectedWeek.attendanceWeekId,
        title,
        subtitle,
      });
    }

    // MONTHLY
    else {
      const monthName = getArabicMonthName(monthlyMonth);

      const selectedGrade = grades.find(
        (grade) =>
          grade.gradeId === monthlyGradeId,
      );

      const selectedClass = classes.find(
        (item) => item.classId === monthlyClassId,
      );

      if (monthlyScope === 'all') {
        title =
          `تقرير الحضور والغياب الشهري — ${monthName}`;

        subtitle =
          'ملخص الحضور وسجل الغياب التراكمي';
      } else if (monthlyScope === 'grade') {
        title =
          `التقرير الشهري — ${selectedGrade?.gradeName || 'المرحلة'}`;

        subtitle = monthName;
      } else {
        title =
          `التقرير الشهري — ${getClassLabel(selectedClass)}`;

        subtitle = monthName;
      }

      setPreviewConfig({
        reportType: 'monthly',
        scope: monthlyScope,
        gradeId: monthlyGradeId,
        classId: monthlyClassId,
        month: monthlyMonth,
        title,
        subtitle,
      });
    }

    setShowPreview(true);
  };


  // ---------------------------------------------------------------------------
  // Excel Export
  // ---------------------------------------------------------------------------

  const handleExportExcel = async (
    type: ReportType,
  ) => {
    if (!canRunReport) {
      toast.show(
        'يرجى مراجعة نطاق التقرير والفترة المحددة.',
        'danger',
      );

      return;
    }

    if (isExporting) return;

    setIsExporting(true);
    setExportingReport(type);

    try {
      // -----------------------------------------------------------------------
      // Load Required Data
      // -----------------------------------------------------------------------

      const freshEnrollments =
        allEnrollments.length > 0
          ? allEnrollments
          : await schoolDataService.getAllEnrollments();

      const reps =
        type === 'weekly'
          ? await schoolDataService.getRepresentatives(true)
          : [];

      const exportEnrollToClass =
        buildEnrollmentClassMap(freshEnrollments);


      const enrollsByClass = new Map<
        number,
        ClassEnrollment[]
      >();

      freshEnrollments.forEach((enrollment) => {
        const current =
          enrollsByClass.get(enrollment.classId) || [];

        current.push(enrollment);

        enrollsByClass.set(
          enrollment.classId,
          current,
        );
      });


      // -----------------------------------------------------------------------
      // Resolve Representative Class IDs
      // -----------------------------------------------------------------------

      const classIdByNumber = new Map<number, number>();

      classes.forEach((classItem) => {
        const classNumber = getClassNumber(classItem);

        if (classNumber !== undefined) {
          classIdByNumber.set(
            classNumber,
            classItem.classId,
          );
        }
      });


      const repByClass = new Map<number, string>();

      reps.forEach((representative) => {
        if (
          !representative.isActive ||
          !representative.studentName
        ) {
          return;
        }

        const username = String(
          representative.username || '',
        );

        const role = String(
          (representative as any).role || '',
        );

        // Only use the main representative, not the deputy.
        const isMainRepresentative =
          role === 'Representative' ||
          username.endsWith('_1');

        if (!isMainRepresentative) return;

        const match = username.match(/^(\d+)_/);

        const directClassId = Number(
          (representative as any).classId,
        );

        const hasValidDirectClass =
          Number.isInteger(directClassId) &&
          classes.some(
            (item) =>
              item.classId === directClassId,
          );

        const classId = hasValidDirectClass
          ? directClassId
          : match
            ? classIdByNumber.get(Number(match[1]))
            : undefined;

        if (classId) {
          repByClass.set(
            classId,
            representative.studentName,
          );
        }
      });


      const academicYear = '1448-1449هـ';


      // -----------------------------------------------------------------------
      // DAILY EXPORT
      // -----------------------------------------------------------------------

      if (type === 'daily') {
        const dayInfo = getDayInfoFromDate(dailyDate);

        if (dayInfo.dayNumber === null) {
          throw new Error(
            'التاريخ المحدد ليس من أيام الدوام المدرسي.',
          );
        }

        const matchingWeek = weeks.find((week) => {
          const start = toDateKey(week.startDate);
          const end = toDateKey(week.endDate);

          return dailyDate >= start && dailyDate <= end;
        });

        const allDateRecords = await fetchDailyRecords(
          dailyDate,
          undefined,
          matchingWeek,
        );

        const recordsByClass = groupRecordsByClass(
          allDateRecords,
          exportEnrollToClass,
        );


        // School Report
        if (dailyScope === 'all') {
          const gradesData = grades.map((grade) => ({
            gradeId: grade.gradeId,
            gradeName: grade.gradeName,

            classesData: grade.classes.map((classItem) => ({
              classItem,

              enrollments:
                enrollsByClass.get(classItem.classId) || [],

              records:
                recordsByClass.get(classItem.classId) || [],
            })),
          }));

          await excelExportService.exportAllGradesDailyReport({
            academicYear,
            date: dailyDate,
            dayName: dayInfo.dayName,
            schoolName,
            gradesData,
          });

          toast.show(
            'تم تصدير التقرير اليومي للمدرسة كاملة بنجاح.',
            'success',
          );
        }


        // Grade Report
        else if (dailyScope === 'grade') {
          const targetGrade = grades.find(
            (grade) =>
              grade.gradeId === dailyGradeId,
          );

          if (!targetGrade) {
            throw new Error(
              'يرجى تحديد المرحلة الدراسية المطلوبة.',
            );
          }

          const classesData = targetGrade.classes.map(
            (classItem) => ({
              classItem,

              enrollments:
                enrollsByClass.get(classItem.classId) || [],

              records:
                recordsByClass.get(classItem.classId) || [],
            }),
          );

          await excelExportService.exportGradeDailyReport({
            gradeName: targetGrade.gradeName,
            academicYear,
            date: dailyDate,
            dayName: dayInfo.dayName,
            schoolName,
            classesData,
          });

          toast.show(
            `تم تصدير التقرير اليومي لـ ${targetGrade.gradeName} بنجاح.`,
            'success',
          );
        }


        // Class Report
        else {
          const targetClass = classes.find(
            (item) =>
              item.classId === dailyClassId,
          );

          if (!targetClass) {
            throw new Error(
              'يرجى اختيار الشعبة المطلوبة.',
            );
          }

          const classEnrollments =
            enrollsByClass.get(dailyClassId) || [];

          const classRecords =
            recordsByClass.get(dailyClassId) || [];

          const reportDate =
            matchingWeek?.startDate || dailyDate;


          if (dailyKind === 'absence') {
            const absences =
              reportCalculationService.calculateDailyAbsences(
                classEnrollments,
                classRecords,
                dayInfo.dayNumber,
                reportDate,
              );

            await excelExportService.exportDailyAbsence(
              absences,
              {
                academicYear,
                className: targetClass.className,
                dayName: dayInfo.dayName,
                date: dailyDate,
                schoolName,
              },
            );
          } else {
            const rows =
              reportCalculationService.calculateDailyAttendance(
                classEnrollments,
                classRecords,
                dayInfo.dayNumber,
                reportDate,
              );

            await excelExportService.exportDailyAttendance(
              rows,
              {
                academicYear,
                className: targetClass.className,
                dayName: dayInfo.dayName,
                date: dailyDate,
                schoolName,
                isAbsenceOnly: false,
              },
            );
          }

          toast.show(
            `تم تصدير التقرير اليومي لشعبة ${targetClass.className} بنجاح.`,
            'success',
          );
        }
      }


      // -----------------------------------------------------------------------
      // WEEKLY EXPORT
      // -----------------------------------------------------------------------

      else if (type === 'weekly') {
        const targetWeek = activeWeek;

        if (!targetWeek) {
          throw new Error(
            'يرجى تحديد الأسبوع الدراسي المطلوب.',
          );
        }

        const weekRange =
          `${formatArabicDateShort(targetWeek.startDate)} - ${formatArabicDateShort(targetWeek.endDate)}`;

        const weekRecords =
          await schoolDataService.getAttendanceRecordsByWeek(
            targetWeek.attendanceWeekId,
          );

        const recordsByClass = groupRecordsByClass(
          weekRecords,
          exportEnrollToClass,
        );


        // School Report
        if (weeklyScope === 'all') {
          const gradesData = grades.map((grade) => ({
            gradeId: grade.gradeId,
            gradeName: grade.gradeName,

            classesData: grade.classes.map((classItem) => ({
              classItem,

              representativeName:
                repByClass.get(classItem.classId),

              enrollments:
                enrollsByClass.get(classItem.classId) || [],

              records:
                recordsByClass.get(classItem.classId) || [],
            })),
          }));

          await excelExportService.exportAllGradesWeeklyReport({
            academicYear,
            weekNumber: targetWeek.weekNumber,
            weekRange,
            schoolName,
            gradesData,
          });

          toast.show(
            'تم تصدير التقرير الأسبوعي للمدرسة كاملة بنجاح.',
            'success',
          );
        }


        // Grade Report
        else if (weeklyScope === 'grade') {
          const targetGrade = grades.find(
            (grade) =>
              grade.gradeId === weeklyGradeId,
          );

          if (!targetGrade) {
            throw new Error(
              'يرجى تحديد المرحلة الدراسية المطلوبة.',
            );
          }

          const classesData = targetGrade.classes.map(
            (classItem) => ({
              classItem,

              representativeName:
                repByClass.get(classItem.classId),

              enrollments:
                enrollsByClass.get(classItem.classId) || [],

              records:
                recordsByClass.get(classItem.classId) || [],
            }),
          );

          await excelExportService.exportStageBatchReport({
            stageNumber: (
              targetGrade.gradeId >= 1 &&
              targetGrade.gradeId <= 3
                ? targetGrade.gradeId
                : 1
            ) as 1 | 2 | 3,

            stageName: targetGrade.gradeName,
            academicYear,
            weekNumber: targetWeek.weekNumber,
            weekRange,
            schoolName,
            classesData,
          });

          toast.show(
            `تم تصدير التقرير الأسبوعي لـ ${targetGrade.gradeName} بنجاح.`,
            'success',
          );
        }


        // Class Report
        else {
          const targetClass = classes.find(
            (item) =>
              item.classId === weeklyClassId,
          );

          if (!targetClass) {
            throw new Error(
              'يرجى اختيار الشعبة الدراسية المطلوبة.',
            );
          }

          const attendanceRows =
            buildWeeklyAttendanceRows(
              enrollsByClass.get(weeklyClassId) || [],
              recordsByClass.get(weeklyClassId) || [],
            );

          await excelExportService.exportWeeklyAttendance(
            attendanceRows,
            {
              academicYear,
              className: targetClass.className,
              weekNumber: targetWeek.weekNumber,
              weekRange,
              schoolName,
            },
          );

          toast.show(
            `تم تصدير التقرير الأسبوعي لشعبة ${targetClass.className} بنجاح.`,
            'success',
          );
        }
      }


      // -----------------------------------------------------------------------
      // MONTHLY EXPORT
      // -----------------------------------------------------------------------

      else {
        const { monthStart, monthEnd } =
          getMonthDateRange(monthlyMonth);

        const overlappingWeeks = weeks
          .map((week) => ({
            week,
            start: toDateKey(week.startDate),
            end: toDateKey(week.endDate),
          }))
          .filter(({ start, end }) => (
            start <= monthEnd &&
            end >= monthStart
          ))
          .sort((a, b) =>
            a.start.localeCompare(b.start),
          );


        const weekRecordsList = await Promise.all(
          overlappingWeeks.map((item) =>
            schoolDataService.getAttendanceRecordsByWeek(
              item.week.attendanceWeekId,
            ),
          ),
        );

        const allMonthRecords =
          weekRecordsList.flat();

        const recordsByClass = groupRecordsByClass(
          allMonthRecords,
          exportEnrollToClass,
        );


        const activeWeeksData: MonthlyAttendanceWeekData[] =
          overlappingWeeks.map((item, index) => ({
            weekNumber:
              item.week.weekNumber ?? index + 1,

            startDate: item.start,
            endDate: item.end,

            attendances: buildWeeklyAttendanceRows(
              freshEnrollments,
              weekRecordsList[index],
            ),
          }));


        // School Report
        if (monthlyScope === 'all') {
          const overallMonthly =
            reportCalculationService.calculateMonthlyReport(
              freshEnrollments,
              allMonthRecords,
              weeks,
              monthlyMonth,
            );


          const gradesData = grades.map((grade) => {
            const gradeEnrollments =
              grade.classes.flatMap(
                (classItem) =>
                  enrollsByClass.get(classItem.classId) || [],
              );

            const gradeRecords =
              grade.classes.flatMap(
                (classItem) =>
                  recordsByClass.get(classItem.classId) || [],
              );

            const gradeMonthly =
              reportCalculationService.calculateMonthlyReport(
                gradeEnrollments,
                gradeRecords,
                weeks,
                monthlyMonth,
              );

            return {
              gradeId: grade.gradeId,
              gradeName: grade.gradeName,
              summaryRows: gradeMonthly.summary,
              detailedAbsences:
                gradeMonthly.detailedAbsences,
            };
          });


          await excelExportService.exportAllGradesMonthlyReport({
            academicYear,
            month: monthlyMonth,
            schoolName,
            gradesData,
            overallSummary: overallMonthly.summary,
            overallAbsences: overallMonthly.detailedAbsences,
            weeks: activeWeeksData,
          });

          toast.show(
            'تم تصدير التقرير الشهري للمدرسة كاملة بنجاح.',
            'success',
          );
        }


        // Grade Report
        else if (monthlyScope === 'grade') {
          const targetGrade = grades.find(
            (grade) =>
              grade.gradeId === monthlyGradeId,
          );

          if (!targetGrade) {
            throw new Error(
              'يرجى تحديد المرحلة الدراسية المطلوبة.',
            );
          }

          const gradeClassIds = new Set(
            targetGrade.classes.map(
              (item) => item.classId,
            ),
          );

          const gradeEnrollments =
            targetGrade.classes.flatMap(
              (classItem) =>
                enrollsByClass.get(classItem.classId) || [],
            );

          const gradeRecords =
            targetGrade.classes.flatMap(
              (classItem) =>
                recordsByClass.get(classItem.classId) || [],
            );


          const gradeMonthly =
            reportCalculationService.calculateMonthlyReport(
              gradeEnrollments,
              gradeRecords,
              weeks,
              monthlyMonth,
            );


          const gradeWeeksData: MonthlyAttendanceWeekData[] =
            overlappingWeeks.map((item, index) => ({
              weekNumber:
                item.week.weekNumber ?? index + 1,

              startDate: item.start,
              endDate: item.end,

              attendances: buildWeeklyAttendanceRows(
                gradeEnrollments,
                weekRecordsList[index].filter((record) => {
                  const recordClassId =
                    (
                      record as AttendanceRecord & {
                        classId?: number;
                      }
                    ).classId ??
                    exportEnrollToClass.get(
                      record.enrollmentId,
                    );

                  return (
                    recordClassId !== undefined &&
                    gradeClassIds.has(recordClassId)
                  );
                }),
              ),
            }));


          await excelExportService.exportGradeMonthlyReport({
            gradeName: targetGrade.gradeName,
            academicYear,
            month: monthlyMonth,
            schoolName,
            summaryRows: gradeMonthly.summary,
            detailedAbsences:
              gradeMonthly.detailedAbsences,
            weeks: gradeWeeksData,
          });

          toast.show(
            `تم تصدير التقرير الشهري لـ ${targetGrade.gradeName} بنجاح.`,
            'success',
          );
        }


        // Class Report
        else {
          const targetClass = classes.find(
            (item) =>
              item.classId === monthlyClassId,
          );

          if (!targetClass) {
            throw new Error(
              'يرجى اختيار الشعبة المطلوبة.',
            );
          }

          const classEnrollments =
            enrollsByClass.get(monthlyClassId) || [];

          const classRecords =
            recordsByClass.get(monthlyClassId) || [];


          const classMonthly =
            reportCalculationService.calculateMonthlyReport(
              classEnrollments,
              classRecords,
              weeks,
              monthlyMonth,
            );


          const classWeeksData: MonthlyAttendanceWeekData[] =
            overlappingWeeks.map((item, index) => ({
              weekNumber:
                item.week.weekNumber ?? index + 1,

              startDate: item.start,
              endDate: item.end,

              attendances: buildWeeklyAttendanceRows(
                classEnrollments,
                weekRecordsList[index].filter((record) => {
                  const recordClassId =
                    (
                      record as AttendanceRecord & {
                        classId?: number;
                      }
                    ).classId ??
                    exportEnrollToClass.get(
                      record.enrollmentId,
                    );

                  return recordClassId === monthlyClassId;
                }),
              ),
            }));


          await excelExportService.exportMonthlyReport(
            classMonthly.summary,
            classMonthly.detailedAbsences,
            {
              schoolName,
              academicYear,
              className: targetClass.className,
              month: monthlyMonth,
              weeks: classWeeksData,
            },
          );

          toast.show(
            `تم تصدير التقرير الشهري لشعبة ${targetClass.className} بنجاح.`,
            'success',
          );
        }
      }
    } catch (error) {
      console.error(
        'Report Excel Export Error:',
        error,
      );

      toast.show(
        error instanceof Error
          ? error.message
          : 'تعذر استخراج ملف التقرير. يرجى المحاولة لاحقاً.',
        'danger',
      );
    } finally {
      setIsExporting(false);
      setExportingReport(null);
    }
  };


  // ---------------------------------------------------------------------------
  // Page Actions
  // ---------------------------------------------------------------------------

  const handlePrint = () => {
    window.print();
  };


  const handleRetryBaseQueries = () => {
    void Promise.all([
      refetchClasses(),
      refetchWeeks(),
      refetchEnrollments(),
    ]);
  };


  // ---------------------------------------------------------------------------
  // Loading and Error States
  // ---------------------------------------------------------------------------

  const isLoadingBase =
    isLoadingClasses ||
    isLoadingWeeks ||
    isLoadingEnrollments;

  const isBaseError =
    isClassesError ||
    isWeeksError ||
    isEnrollmentsError;


  if (isLoadingBase) {
    return (
      <LoadingState message="جاري تحميل بيانات التقارير..." />
    );
  }


  if (isBaseError) {
    return (
      <main
        dir="rtl"
        className="space-y-5 pb-10 text-right"
      >
        <ReportError
          title="تعذر تحميل بيانات التقارير"
          description="حدث خطأ أثناء الاتصال بالخادم. تحقق من اتصالك وحاول تحميل البيانات مرة أخرى."
          onRetry={handleRetryBaseQueries}
        />
      </main>
    );
  }


  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main
      dir="rtl"
      className="space-y-5 pb-12 text-right text-slate-900 dark:text-slate-100"
    >

      {/* ------------------------------------------------------------------- */}
      {/* Header */}
      {/* ------------------------------------------------------------------- */}

      <section
        className={`rounded-2xl px-5 py-5 shadow-sm sm:px-6 ${surfaceClassName}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#245B63] dark:text-teal-400">
              <FileSpreadsheet className="h-4 w-4" />
              <span>مواظب</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span>التقارير</span>
            </div>

            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              مركز التقارير
            </h1>

            <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              إعداد ومعاينة وتصدير تقارير الحضور والغياب.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              {grades.length} مراحل
            </span>

            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />

            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {classes.length} شعبة
            </span>
          </div>
        </div>
      </section>


      {/* ------------------------------------------------------------------- */}
      {/* Report Type Tabs */}
      {/* ------------------------------------------------------------------- */}

      <nav
        aria-label="نوع التقرير"
        className="rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid grid-cols-3 gap-1.5">

          <ReportTab
            active={activeReportType === 'daily'}
            icon={CalendarDays}
            title="يومي"
            description="تقرير بتاريخ محدد"
            onClick={() => setActiveReportType('daily')}
          />

          <ReportTab
            active={activeReportType === 'weekly'}
            icon={CalendarRange}
            title="أسبوعي"
            description="كشف أسبوع دراسي"
            onClick={() => setActiveReportType('weekly')}
          />

          <ReportTab
            active={activeReportType === 'monthly'}
            icon={Calendar}
            title="شهري"
            description="ملخص الشهر والغياب"
            onClick={() => setActiveReportType('monthly')}
          />

        </div>
      </nav>


      {/* ------------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ------------------------------------------------------------------- */}

      <section
        className={`overflow-hidden rounded-2xl shadow-sm ${surfaceClassName}`}
      >

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <h2 className="text-sm font-extrabold">
              إعداد التقرير
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              حدد النطاق والفترة المطلوبة.
            </p>
          </div>

          <span className="rounded-lg bg-[#E8F1F1] px-3 py-1.5 text-xs font-bold text-[#245B63] dark:bg-teal-950/60 dark:text-teal-300">
            {activeReportType === 'daily'
              ? 'تقرير يومي'
              : activeReportType === 'weekly'
                ? 'تقرير أسبوعي'
                : 'تقرير شهري'}
          </span>
        </div>


        <div className="space-y-5 p-5 sm:p-6">

          {/* Filters */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* Scope */}

            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                نطاق التقرير
              </span>

              <select
                value={activeScope}
                onChange={(event) =>
                  updateActiveScope(
                    event.target.value as ExportScope,
                  )
                }
                className={inputClassName}
              >
                <option value="all">المدرسة كاملة</option>
                <option value="grade">مرحلة دراسية</option>
                <option value="class">شعبة محددة</option>
              </select>
            </label>


            {/* Grade */}

            {activeScope !== 'all' && (
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  المرحلة الدراسية
                </span>

                <select
                  value={activeGradeId}
                  onChange={(event) =>
                    updateActiveGrade(
                      Number(event.target.value),
                    )
                  }
                  className={inputClassName}
                >
                  {grades.map((grade) => (
                    <option
                      key={grade.gradeId}
                      value={grade.gradeId}
                    >
                      {grade.gradeName}
                    </option>
                  ))}
                </select>
              </label>
            )}


            {/* Class */}

            {activeScope === 'class' && (
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  الشعبة
                </span>

                <select
                  value={activeClassId}
                  onChange={(event) =>
                    updateActiveClass(
                      Number(event.target.value),
                    )
                  }
                  className={inputClassName}
                >
                  {(activeGrade?.classes || []).map((item) => (
                    <option
                      key={item.classId}
                      value={item.classId}
                    >
                      {getClassLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            )}


            {/* Period */}

            <div className="min-w-0">

              {activeReportType === 'daily' && (
                <DailyDateField
                  value={dailyDate}
                  onChange={setDailyDate}
                  isValid={isDailyDateValid}
                  weekLabel={
                    dailyMatchingWeek
                      ? `الأسبوع الدراسي ${dailyMatchingWeek.weekNumber}`
                      : undefined
                  }
                />
              )}


              {activeReportType === 'weekly' && (
                <>
                  <label
                    htmlFor="weekly-report-week"
                    className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    الأسبوع الدراسي
                  </label>

                  <select
                    id="weekly-report-week"
                    value={weeklyWeekId}
                    onChange={(event) =>
                      setWeeklyWeekId(
                        Number(event.target.value),
                      )
                    }
                    className={inputClassName}
                  >
                    {weeks.map((week) => (
                      <option
                        key={week.attendanceWeekId}
                        value={week.attendanceWeekId}
                      >
                        الأسبوع {week.weekNumber}
                      </option>
                    ))}
                  </select>

                  {activeWeek && (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {formatArabicDateShort(activeWeek.startDate)}
                      {' — '}
                      {formatArabicDateShort(activeWeek.endDate)}
                    </p>
                  )}
                </>
              )}


              {activeReportType === 'monthly' && (
                <>
                  <label
                    htmlFor="monthly-report-month"
                    className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    الشهر
                  </label>

                  <input
                    id="monthly-report-month"
                    type="month"
                    value={monthlyMonth}
                    max={today.slice(0, 7)}
                    onChange={(event) =>
                      setMonthlyMonth(event.target.value)
                    }
                    className={inputClassName}
                  />

                  {isMonthValid && (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {getArabicMonthName(monthlyMonth)}
                    </p>
                  )}
                </>
              )}

            </div>
          </div>


          {/* Daily Report Type */}

          {activeReportType === 'daily' &&
            activeScope === 'class' && (
              <div className="max-w-sm border-t border-slate-100 pt-4 dark:border-slate-800">

                <label
                  htmlFor="daily-report-kind"
                  className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  نوع التقرير اليومي
                </label>

                <select
                  id="daily-report-kind"
                  value={dailyKind}
                  onChange={(event) =>
                    setDailyKind(
                      event.target.value as DailyKind,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="attendance">
                    الحضور والغياب
                  </option>

                  <option value="absence">
                    الغياب فقط
                  </option>
                </select>
              </div>
            )}


          {/* Empty Data Warning */}

          {(classes.length === 0 || weeks.length === 0) && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/70 dark:bg-amber-950/30">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

              <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">
                {classes.length === 0
                  ? 'لا توجد شعب دراسية مسجلة.'
                  : 'لا توجد أسابيع دراسية مسجلة.'}
                {' '}تعذر إنشاء التقرير حتى تتوفر البيانات المطلوبة.
              </p>
            </div>
          )}


          {/* Actions */}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {canRunReport ? (
                <>
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                  <span>
                    الإعدادات جاهزة لإنشاء التقرير.
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

                  <span>
                    راجع النطاق والفترة المحددة.
                  </span>
                </>
              )}
            </div>


            <div className="flex flex-col-reverse gap-2 sm:flex-row">

              <button
                type="button"
                onClick={() =>
                  handleOpenPreview(activeReportType)
                }
                disabled={!canRunReport || isExporting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Eye className="h-4 w-4" />
                معاينة
              </button>


              <button
                type="button"
                onClick={() =>
                  handleExportExcel(activeReportType)
                }
                disabled={!canRunReport || isExporting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#245B63] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1B4A50] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {isExporting &&
                exportingReport === activeReportType ? (
                  <>
                    <Spinner size="sm" />
                    جاري تجهيز الملف...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    تصدير Excel
                  </>
                )}
              </button>

            </div>
          </div>

        </div>
      </section>


      {/* ------------------------------------------------------------------- */}
      {/* Preview */}
      {/* ------------------------------------------------------------------- */}

      {showPreview && previewConfig && (
        <section
          className={`overflow-hidden rounded-2xl shadow-sm ${surfaceClassName}`}
        >

          {/* Preview Header */}

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div className="min-w-0">

              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  معاينة التقرير
                </span>
              </div>

              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {previewConfig.title}
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {previewConfig.subtitle}
              </p>

            </div>


            <div className="flex shrink-0 items-center gap-2">

              <button
                type="button"
                onClick={handlePrint}
                disabled={isLoadingPreviewRecords || isPreviewRecordsError}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Printer className="h-4 w-4 text-[#245B63] dark:text-teal-400" />
                طباعة
              </button>


              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <EyeOff className="h-4 w-4" />
                إغلاق
              </button>

            </div>
          </div>


          {/* Print Header */}

          <div className="hidden print-only px-6 pb-5 pt-2">
            <div className="mb-4 flex items-center justify-between border-b pb-3">

              <div className="text-right">
                <h2 className="text-lg font-bold">
                  {schoolName}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  إدارة شؤون الطلاب — نظام مواظب المدرسي
                </p>
              </div>

              <BrandLogo
                variant="wordmark"
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="text-center">
              <h3 className="text-base font-semibold">
                {previewConfig.title}
              </h3>

              <p className="mt-1 text-xs text-gray-600">
                العام الدراسي: 1448-1449هـ
                {' | '}
                تاريخ الطباعة:{' '}
                {new Date().toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>


          {/* Preview Content */}

          <div className="p-4 sm:p-6">

            {isLoadingPreviewRecords ? (
              <LoadingState message="جاري تحميل التقرير..." />
            ) : isPreviewRecordsError ? (
              <ReportError
                title="تعذر تحميل سجلات التقرير"
                description="حدث خطأ أثناء قراءة بيانات الحضور من الخادم. يمكنك المحاولة مرة أخرى."
                onRetry={() => {
                  void refetchPreviewRecords();
                }}
              />
            ) : previewConfig.reportType === 'daily' ? (
              <DailyReportView
                rows={dailyPreviewData.rows}
                absenceRecords={dailyPreviewData.absences}
                isAbsenceOnly={
                  previewConfig.kind === 'absence'
                }
                dayName={dailyPreviewData.dayName}
                dateStr={previewConfig.date || ''}
                dayNumber={dailyPreviewData.dayNumber}
              />
            ) : previewConfig.reportType === 'weekly' ? (
              <WeeklyReportView
                attendances={weeklyPreviewAttendances}
                weekStartDate={previewWeek?.startDate}
                weekNumber={previewWeek?.weekNumber || 1}
                classNameTitle={previewConfig.title}
                isAllClasses={
                  previewConfig.scope !== 'class'
                }
              />
            ) : (
              <MonthlyReportView
                summaryRows={monthlyPreviewData.summary}
                detailedAbsences={
                  monthlyPreviewData.detailedAbsences
                }
                monthStr={previewConfig.month || ''}
                classNameTitle={previewConfig.title}
              />
            )}

          </div>
        </section>
      )}


      {/* ------------------------------------------------------------------- */}
      {/* Footer */}
      {/* ------------------------------------------------------------------- */}

      <div className="flex items-center justify-center gap-2 pb-2 text-[11px] text-slate-400 dark:text-slate-500">
        <FileSpreadsheet className="h-3.5 w-3.5" />

        <span>
          يتم إنشاء التقارير وفق البيانات والفترة المحددتين.
        </span>
      </div>

    </main>
  );
}
