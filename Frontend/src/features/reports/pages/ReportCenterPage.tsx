import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../shared/services/schoolDataService';
import { reportCalculationService } from '../services/reportCalculationService';
import { excelExportService } from '../services/excelExportService';
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
import { SCHOOL_DAYS, SCHOOL_PERIODS, type AttendanceStatus } from '../../../shared/types';
import { calculateDateForDay, getArabicDayName, formatArabicDateShort } from '../../../shared/utils/date';
import { FileText } from 'lucide-react';

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
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  // Queries
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const targetClassId = filters.classId;
  const targetWeekId = filters.weekId;

  // Fetch enrollments for selected class or all classes
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['report_enrollments', targetClassId],
    queryFn: async () => {
      if (targetClassId > 0) {
        return await schoolDataService.getEnrollmentsByClass(targetClassId);
      } else {
        // All classes (for admin)
        const list = [];
        for (const c of classes.slice(0, 10)) {
          const res = await schoolDataService.getEnrollmentsByClass(c.classId);
          list.push(...res);
        }
        return list;
      }
    },
    enabled: classes.length > 0,
  });

  // Fetch attendance records for selected class and week
  const { data: records = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['report_records', targetClassId, targetWeekId],
    queryFn: async () => {
      if (targetClassId > 0) {
        return await schoolDataService.getAttendanceRecords(targetClassId, targetWeekId);
      } else {
        const list = [];
        for (const c of classes.slice(0, 5)) {
          const res = await schoolDataService.getAttendanceRecords(c.classId, targetWeekId);
          list.push(...res);
        }
        return list;
      }
    },
    enabled: targetWeekId > 0 && classes.length > 0,
  });

  // Selected week entity
  const selectedWeek = useMemo(() => {
    return weeks.find((w) => w.attendanceWeekId === filters.weekId) || weeks[0];
  }, [weeks, filters.weekId]);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.classId === filters.classId);
  }, [classes, filters.classId]);

  const classNameTitle = filters.classId === 0 ? 'جميع فصول المدرسة (30 شعبة)' : selectedClass?.className || 'الشعبة 105';
  const currentDayName = getArabicDayName(filters.dayNumber);
  const currentDayDate = selectedWeek ? calculateDateForDay(selectedWeek.startDate, filters.dayNumber) : '';

  // 1. Calculate Daily Report Data
  const dailyAttendanceRows = useMemo(() => {
    return reportCalculationService.calculateDailyAttendance(enrollments, records, filters.dayNumber);
  }, [enrollments, records, filters.dayNumber]);

  const dailyAbsenceRecords = useMemo(() => {
    return reportCalculationService.calculateDailyAbsences(
      enrollments,
      records,
      filters.dayNumber,
      selectedWeek?.startDate || '2026-09-06'
    );
  }, [enrollments, records, filters.dayNumber, selectedWeek]);

  // 2. Calculate Weekly Report Data
  const weeklyAttendances: StudentWeeklyAttendance[] = useMemo(() => {
    return enrollments.map((en) => {
      const slots: Record<number, Record<number, { status: AttendanceStatus; recordId?: number }>> = {};
      let present = 0;
      let absent = 0;
      let discontinued = 0;
      let unmarked = 0;

      SCHOOL_DAYS.forEach((day) => {
        slots[day.dayNumber] = {};
        SCHOOL_PERIODS.forEach((p) => {
          const match = records.find(
            (r) =>
              r.enrollmentId === en.enrollmentId &&
              r.dayNumber === day.dayNumber &&
              r.periodNumber === p
          );

          if (match) {
            slots[day.dayNumber][p] = { status: match.status, recordId: match.attendanceRecordId };
            if (match.status === 'Present') present++;
            else if (match.status === 'Absent') absent++;
            else if (match.status === 'Discontinued') discontinued++;
          } else {
            slots[day.dayNumber][p] = { status: 'Unmarked' };
            unmarked++;
          }
        });
      });

      return {
        enrollment: en,
        slots,
        summary: { present, absent, discontinued, unmarked },
      };
    });
  }, [enrollments, records]);

  // 3. Calculate Monthly Report Data
  const monthlyData = useMemo(() => {
    return reportCalculationService.calculateMonthlyReport(enrollments, records, weeks, filters.month);
  }, [enrollments, records, weeks, filters.month]);

  // Export handlers
  const handleExportExcel = async () => {
    const meta = {
      academicYear: '2026-2027',
      className: classNameTitle,
      schoolName: schoolName,
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
        // Monthly
        await excelExportService.exportMonthlyReport(monthlyData.summary, monthlyData.detailedAbsences, {
          ...meta,
          month: filters.month,
        });
      }
      toast.show('تم تصدير ملف Excel بنجاح', 'success');
    } catch {
      toast.show('حدث خطأ أثناء تصدير ملف Excel', 'danger');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = isLoadingEnrollments || isLoadingRecords;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">مركز تقارير الحضور والغياب</h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            استخراج وتصدير تقارير الحضور والغياب اليومية والأسبوعية والشهرية الرسمية
          </p>
        </div>

        {/* Export and Print Menu */}
        <ReportExportMenu onExportExcel={handleExportExcel} onPrint={handlePrint} isLoading={isLoading} />
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
      <div className="hidden print-only mb-6 border-b pb-4 text-center">
        <h2 className="text-lg font-bold">{schoolName}</h2>
        <h3 className="text-base font-semibold mt-1">
          {filters.periodType === 'daily'
            ? `تقرير الحضور والغياب اليومي (${currentDayName} - ${currentDayDate})`
            : filters.periodType === 'weekly'
            ? `تقرير الحضور الأسبوعي — الأسبوع ${selectedWeek?.weekNumber}`
            : `تقرير الحضور الشهري — شهر ${filters.month}`}
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          العام الدراسي: 2026-2027 | {classNameTitle} | تاريخ الطباعة:{' '}
          {new Date().toLocaleDateString('ar-SA')}
        </p>
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
        />
      ) : filters.periodType === 'weekly' ? (
        <WeeklyReportView
          attendances={weeklyAttendances}
          weekStartDate={selectedWeek?.startDate}
          weekNumber={selectedWeek?.weekNumber || 1}
          classNameTitle={classNameTitle}
          isAllClasses={filters.classId === 0}
        />
      ) : (
        <MonthlyReportView
          summaryRows={monthlyData.summary}
          detailedAbsences={monthlyData.detailedAbsences}
          monthStr={filters.month}
          classNameTitle={classNameTitle}
        />
      )}
    </div>
  );
}

