import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { schoolDataService } from '../../../shared/services/schoolDataService';
import { reportCalculationService } from '../services/reportCalculationService';
import { excelExportService } from '../services/excelExportService';
import type { MonthlyAttendanceWeekData } from '../services/excelExportService';

import { ReportFilters } from '../components/ReportFilters';
import { DailyReportView } from '../components/DailyReportView';
import { WeeklyReportView } from '../components/WeeklyReportView';
import { MonthlyReportView } from '../components/MonthlyReportView';
import { ReportExportMenu } from '../components/ReportExportMenu';
import { StageBatchExportCard } from '../components/StageBatchExportCard';
import { LoadingState } from '../../../shared/components/ui/Spinner';

import { useNotifications } from '../../notifications';
import { useAuth } from '../../auth';
import { useSchoolSettings } from '../../../shared/services/schoolSettingsService';

import type { ReportFilterOptions } from '../types/report.types';
import type { StudentWeeklyAttendance } from '../../attendance';
import {
  SCHOOL_DAYS,
  getPeriodsForDay,
  type AttendanceStatus,
  type AttendanceRecord,
  type ClassEnrollment,
} from '../../../shared/types';

import {
  calculateDateForDay,
  getArabicDayName,
  formatArabicDateShort,
} from '../../../shared/utils/date';

import { FileText } from 'lucide-react';
import { BrandLogo } from '../../../components/common/BrandLogo';

/**
 * Builds the exact StudentWeeklyAttendance structure used by WeeklyReportView
 * and exportWeeklyAttendance, but for an arbitrary week's records.
 */
function buildWeeklyAttendanceRows(
  enrollments: ClassEnrollment[],
  records: AttendanceRecord[]
): StudentWeeklyAttendance[] {
  // Index records once instead of searching the complete array for every slot.
  // Keep the first record for a slot, matching the previous Array.find behavior.
  const recordBySlot = new Map<string, AttendanceRecord>();

  records.forEach((record) => {
    const key = `${record.enrollmentId}:${record.dayNumber}:${record.periodNumber}`;
    if (!recordBySlot.has(key)) {
      recordBySlot.set(key, record);
    }
  });

  return enrollments.map((enrollment) => {
    const slots: Record<
      number,
      Record<number, { status: AttendanceStatus; recordId?: number }>
    > = {};

    let present = 0;
    let absent = 0;
    let discontinued = 0;
    let unmarked = 0;

    SCHOOL_DAYS.forEach((day) => {
      slots[day.dayNumber] = {};

      getPeriodsForDay(day.dayNumber).forEach((period) => {
        const key = `${enrollment.enrollmentId}:${day.dayNumber}:${period}`;
        const match = recordBySlot.get(key);

        if (match) {
          slots[day.dayNumber][period] = {
            status: match.status,
            recordId: match.attendanceRecordId,
          };

          if (match.status === 'Present') {
            present++;
          } else if (match.status === 'Absent') {
            absent++;
          } else if (match.status === 'Discontinued') {
            discontinued++;
          } else {
            unmarked++;
          }
        } else {
          slots[day.dayNumber][period] = { status: 'Unmarked' };
          unmarked++;
        }
      });
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

function getMonthDateRange(month: string): {
  monthStart: string;
  monthEnd: string;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(month);

  if (!match) {
    throw new Error('صيغة الشهر غير صحيحة. اختر شهراً صالحاً.');
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);

  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error('الشهر المحدد غير صحيح.');
  }

  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    monthStart: `${month}-01`,
    monthEnd: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

function toDateKey(value: string | Date): string {
  const dateKey = String(value).trim().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`تاريخ أسبوع دراسي غير صالح: ${String(value)}`);
  }

  const parsed = new Date(`${dateKey}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateKey
  ) {
    throw new Error(`تاريخ أسبوع دراسي غير صالح: ${String(value)}`);
  }

  return dateKey;
}

export function ReportCenterPage() {
  const { user } = useAuth();
  const { schoolName } = useSchoolSettings();
  const { toast } = useNotifications();
  const isAdmin = user?.role === 'Admin';

  const [filters, setFilters] = useState<ReportFilterOptions>({
    academicYearId: 1,
    periodType: 'daily',
    reportKind: 'attendance',
    classId: isAdmin ? 105 : user?.classId || 105,
    weekId: 1,
    dayNumber: 1,
    month: '2026-11',
    searchQuery: '',
  });

  const handleFilterChange = (updated: Partial<ReportFilterOptions>) => {
    setFilters((previous) => ({ ...previous, ...updated }));
  };

  // ---------------------------------------------------------------------------
  // Reference data
  // ---------------------------------------------------------------------------

  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { data: weeks = [], isLoading: isLoadingWeeks } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const targetClassId = filters.classId;
  const targetWeekId = filters.weekId;

  // ---------------------------------------------------------------------------
  // Existing selected-class / selected-week queries (daily and weekly views)
  // ---------------------------------------------------------------------------

  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments,
  } = useQuery({
    queryKey: ['report_enrollments', targetClassId],
    queryFn: async () => {
      if (targetClassId > 0) {
        return schoolDataService.getEnrollmentsByClass(targetClassId);
      }

      // Keep the existing all-classes preview behavior.
      const list: ClassEnrollment[] = [];
      for (const classItem of classes.slice(0, 10)) {
        const classEnrollments = await schoolDataService.getEnrollmentsByClass(
          classItem.classId
        );
        list.push(...classEnrollments);
      }
      return list;
    },
    enabled: classes.length > 0,
  });

  const {
    data: records = [],
    isLoading: isLoadingRecords,
  } = useQuery({
    queryKey: ['report_records', targetClassId, targetWeekId],
    queryFn: async () => {
      if (targetClassId > 0) {
        return schoolDataService.getAttendanceRecords(targetClassId, targetWeekId);
      }

      // Keep the existing all-classes preview behavior for the selected week.
      const list: AttendanceRecord[] = [];
      for (const classItem of classes.slice(0, 5)) {
        const classRecords = await schoolDataService.getAttendanceRecords(
          classItem.classId,
          targetWeekId
        );
        list.push(...classRecords);
      }
      return list;
    },
    enabled: targetWeekId > 0 && classes.length > 0,
  });

  const selectedWeek = useMemo(() => {
    return weeks.find((week) => week.attendanceWeekId === filters.weekId) || weeks[0];
  }, [weeks, filters.weekId]);

  const selectedClass = useMemo(() => {
    return classes.find((classItem) => classItem.classId === filters.classId);
  }, [classes, filters.classId]);

  const classNameTitle =
    filters.classId === 0
      ? 'جميع الشعب'
      : selectedClass?.className
        ? String(selectedClass.className)
        : selectedClass
          ? `شعبة ${selectedClass.classId}`
          : 'شعبة 105';

  const currentDayName = getArabicDayName(filters.dayNumber);
  const currentDayDate = selectedWeek
    ? calculateDateForDay(selectedWeek.startDate, filters.dayNumber)
    : '';

  // ---------------------------------------------------------------------------
  // Daily report calculations
  // ---------------------------------------------------------------------------

  const dailyAttendanceRows = useMemo(() => {
    return reportCalculationService.calculateDailyAttendance(
      enrollments,
      records,
      filters.dayNumber
    );
  }, [enrollments, records, filters.dayNumber]);

  const dailyAbsenceRecords = useMemo(() => {
    return reportCalculationService.calculateDailyAbsences(
      enrollments,
      records,
      filters.dayNumber,
      selectedWeek?.startDate || '2026-09-06'
    );
  }, [enrollments, records, filters.dayNumber, selectedWeek]);

  // ---------------------------------------------------------------------------
  // Weekly report calculations (same shape used for every monthly sheet)
  // ---------------------------------------------------------------------------

  const weeklyAttendances: StudentWeeklyAttendance[] = useMemo(() => {
    return buildWeeklyAttendanceRows(enrollments, records);
  }, [enrollments, records]);

  // ---------------------------------------------------------------------------
  // Monthly on-screen report calculations
  // ---------------------------------------------------------------------------

  const monthlyData = useMemo(() => {
    return reportCalculationService.calculateMonthlyReport(
      enrollments,
      records,
      weeks,
      filters.month
    );
  }, [enrollments, records, weeks, filters.month]);

  // ---------------------------------------------------------------------------
  // Monthly Excel export data builder
  // Fetch all real attendance weeks overlapping the selected calendar month.
  // For each week, fetch records for every selected class and build the same
  // StudentWeeklyAttendance structure used by the regular weekly export.
  // ---------------------------------------------------------------------------

  const buildMonthlyExportWeeks = async (): Promise<MonthlyAttendanceWeekData[]> => {
    const { monthStart, monthEnd } = getMonthDateRange(filters.month);

    const selectedMonthWeeks = weeks
      .map((week) => ({
        week,
        startDate: toDateKey(week.startDate),
        endDate: toDateKey(week.endDate),
      }))
      .filter(({ startDate, endDate }) => {
        if (startDate > endDate) {
          throw new Error(
            `نطاق الأسبوع غير صحيح: ${startDate} - ${endDate}`
          );
        }

        // Include any actual attendance week that overlaps the selected month.
        return startDate <= monthEnd && endDate >= monthStart;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    if (selectedMonthWeeks.length === 0) {
      throw new Error('لا توجد أسابيع دراسية مسجلة ضمن الشهر المحدد.');
    }

    // When a specific class is selected, export only that class.
    // When "all classes" is selected, use every class returned by the API.
    // Do not use the limited slices from the regular preview queries here.
    const classesToExport =
      filters.classId > 0
        ? classes.filter((classItem) => classItem.classId === filters.classId)
        : classes;

    if (classesToExport.length === 0) {
      throw new Error('لم يتم العثور على الشعب المطلوبة للتصدير.');
    }

    // Fetch all enrollments once in bulk for optimal network performance
    const allEnrolls = await schoolDataService.getAllEnrollments().catch(() => []);
    const enrollsMap = new Map<number, typeof allEnrolls>();
    allEnrolls.forEach((item) => {
      const list = enrollsMap.get(item.classId) || [];
      list.push(item);
      enrollsMap.set(item.classId, list);
    });

    const enrollmentGroups = await Promise.all(
      classesToExport.map(async (classItem) => {
        let enrollments = enrollsMap.get(classItem.classId);
        if (!enrollments || enrollments.length === 0) {
          enrollments = await schoolDataService.getEnrollmentsByClass(classItem.classId).catch(() => []);
        }
        return {
          classItem,
          enrollments: enrollments || [],
        };
      })
    );

    const allMonthlyEnrollments = enrollmentGroups.flatMap(
      (group) => group.enrollments
    );

    if (allMonthlyEnrollments.length === 0) {
      throw new Error('لا يوجد طلاب مسجلون في الشعب المحددة لهذا التقرير.');
    }

    const monthlyWeeks: MonthlyAttendanceWeekData[] = [];

    // Process weeks in calendar order. Within each week, retrieve each class's
    // actual records safely using batch requests with error fallbacks.
    for (let index = 0; index < selectedMonthWeeks.length; index++) {
      const selected = selectedMonthWeeks[index];

      const recordsByClass = await Promise.all(
        enrollmentGroups.map((group) =>
          schoolDataService
            .getAttendanceRecords(
              group.classItem.classId,
              selected.week.attendanceWeekId
            )
            .catch(() => [])
        )
      );

      const weekRecords = recordsByClass.flat();

      monthlyWeeks.push({
        weekNumber: selected.week.weekNumber ?? index + 1,
        startDate: selected.startDate,
        endDate: selected.endDate,
        attendances: buildWeeklyAttendanceRows(
          allMonthlyEnrollments,
          weekRecords
        ),
      });
    }

    return monthlyWeeks;
  };

  // ---------------------------------------------------------------------------
  // Excel export handlers
  // ---------------------------------------------------------------------------

  const handleExportExcel = async () => {
    const meta = {
      academicYear: '1448-1449هـ',
      className: classNameTitle,
      schoolName,
    };

    try {
      if (filters.periodType === 'daily') {
        if (filters.reportKind === 'absence') {
          await excelExportService.exportDailyAbsence(dailyAbsenceRecords, {
            ...meta,
            date: currentDayDate,
            dayName: currentDayName,
          });
        } else {
          await excelExportService.exportDailyAttendance(dailyAttendanceRows, {
            ...meta,
            dayName: currentDayName,
            date: currentDayDate,
            isAbsenceOnly: false,
          });
        }
      } else if (filters.periodType === 'weekly') {
        const weekRange = selectedWeek
          ? `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(selectedWeek.endDate)}`
          : '';

        await excelExportService.exportWeeklyAttendance(weeklyAttendances, {
          ...meta,
          weekNumber: selectedWeek?.weekNumber || 1,
          weekRange,
        });
      } else {
        // Monthly export: same weekly attendance layout repeated in one workbook.
        const monthlyWeeks = await buildMonthlyExportWeeks();

        await excelExportService.exportMonthlyReport(
          monthlyData.summary,
          monthlyData.detailedAbsences,
          {
            ...meta,
            month: filters.month,
            weeks: monthlyWeeks,
          }
        );
      }

      toast.show('تم تصدير ملف Excel بنجاح', 'success');
    } catch (error) {
      console.error('Failed to export attendance report:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير متوقع أثناء إنشاء التقرير.';

      toast.show(`تعذر تصدير التقرير: ${message}`, 'danger');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading =
    isLoadingClasses ||
    isLoadingWeeks ||
    isLoadingEnrollments ||
    isLoadingRecords;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">
              مركز تقارير الحضور والغياب
            </h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            استخراج وتصدير تقارير الحضور والغياب اليومية والأسبوعية والشهرية الرسمية
          </p>
        </div>

        {/* Export and Print Menu */}
        <ReportExportMenu
          onExportExcel={handleExportExcel}
          onPrint={handlePrint}
          isLoading={isLoading}
        />
      </div>

      {/* Filter Card */}
      <div className="no-print">
        <ReportFilters
          filters={filters}
          onChange={handleFilterChange}
          classes={classes}
          weeks={weeks}
          isAdmin={isAdmin}
        />
      </div>

      {/* Batch Stage Attendance Report Export Section (Admin Only) */}
      {isAdmin && (
        <div className="no-print">
          <StageBatchExportCard classes={classes} weeks={weeks} />
        </div>
      )}

      {/* Active Report Header for Print */}
      <div className="hidden print-only mb-6 border-b pb-4">
        <div className="flex items-center justify-between pb-3 border-b mb-3">
          <div className="text-right">
            <h2 className="text-lg font-bold">{schoolName}</h2>
            <p className="text-xs text-gray-500">إدارة شؤون الطلاب — نظام مواظب المدرسي</p>
          </div>
          <BrandLogo variant="wordmark" className="h-10 w-auto object-contain" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold mt-1">
            {filters.periodType === 'daily'
              ? `تقرير الحضور والغياب اليومي (${currentDayName} - ${currentDayDate})`
              : filters.periodType === 'weekly'
                ? `تقرير الحضور الأسبوعي — الأسبوع ${selectedWeek?.weekNumber}`
                : `تقرير الحضور الشهري — شهر ${filters.month}`}
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            العام الدراسي: 1448-1449هـ | {classNameTitle} | تاريخ الطباعة:{' '}
            {new Date().toLocaleDateString('ar-SA')}
          </p>
        </div>
      </div>

      {/* Dynamic Report Content */}
      {isLoading ? (
        <LoadingState message="جاري استخراج بيانات التقرير الرسمية..." />
      ) : filters.periodType === 'daily' ? (
        <DailyReportView
          rows={dailyAttendanceRows}
          absenceRecords={dailyAbsenceRecords}
          isAbsenceOnly={filters.reportKind === 'absence'}
          dayName={currentDayName}
          dateStr={currentDayDate}
          dayNumber={filters.dayNumber}
        />
      ) : filters.periodType === 'weekly' ? (
        <WeeklyReportView
          attendances={weeklyAttendances}
          weekStartDate={selectedWeek?.startDate}
          weekNumber={selectedWeek?.weekNumber || 1}
          classNameTitle={classNameTitle || ' '}
          isAllClasses={filters.classId === 0}
        />
      ) : (
        <MonthlyReportView
          summaryRows={monthlyData.summary}
          detailedAbsences={monthlyData.detailedAbsences}
          monthStr={filters.month}
          classNameTitle={classNameTitle || ' '}
        />
      )}
    </div>
  );
}
