import { useState } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  CalendarDays,
  CalendarRange,
  Loader2,
  FileCheck2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import type { ClassItem, AttendanceWeek } from '../../../shared/types';
import { schoolDataService } from '../../../shared/services/schoolDataService';
import { excelExportService } from '../services/excelExportService';
import { reportCalculationService } from '../services/reportCalculationService';
import { useNotifications } from '../../notifications';
import { useSchoolSettings } from '../../../shared/services/schoolSettingsService';
import {
  formatArabicDateShort,
  getArabicDayName,
} from '../../../shared/utils/date';

interface StageAbsenceReportsSectionProps {
  classes: ClassItem[];
  weeks: AttendanceWeek[];
}

interface StageConfig {
  stageNumber: 1 | 2 | 3;
  stageName: string;
  stageSubtitle: string;
  accentBadge: string;
}

const STAGES: StageConfig[] = [
  {
    stageNumber: 1,
    stageName: 'الصف الأول الثانوي',
    stageSubtitle: 'الشعب 101 وما يوازيها',
    accentBadge: 'bg-[#E8F1F1] text-[#245B63] border-[#245B63]/25',
  },
  {
    stageNumber: 2,
    stageName: 'الصف الثاني الثانوي',
    stageSubtitle: 'الشعب من 201 إلى 210',
    accentBadge: 'bg-[#EEF2F6] text-[#2C4A6F] border-[#2C4A6F]/25',
  },
  {
    stageNumber: 3,
    stageName: 'الصف الثالث الثانوي',
    stageSubtitle: 'الشعب 301 وما يوازيها',
    accentBadge: 'bg-[#F2EFF7] text-[#553C7B] border-[#553C7B]/25',
  },
];

export function StageAbsenceReportsSection({ classes, weeks }: StageAbsenceReportsSectionProps) {
  const { toast } = useNotifications();
  const { schoolName } = useSchoolSettings();

  // Unified Absence Filter State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return '2026-11-05';
  });

  const [selectedWeekId, setSelectedWeekId] = useState<number>(() => {
    return weeks[0]?.attendanceWeekId || 11;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');

  // Loading state track: `stageNumber-reportType` (e.g. "1-daily")
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  // Helper to dynamically filter classes by stage
  const getClassesForStage = (stageNumber: 1 | 2 | 3): ClassItem[] => {
    return classes.filter((c) => {
      const cnum = Number(c.classNumber ?? c.className ?? c.classId);
      const cstr = String(c.className ?? c.classNumber ?? c.classId);

      if (stageNumber === 1) {
        return (cnum >= 100 && cnum < 200) || cstr.includes('الأول') || /^1\d{2}/.test(cstr);
      }
      if (stageNumber === 2) {
        return (cnum >= 200 && cnum < 300) || cstr.includes('الثاني') || /^2\d{2}/.test(cstr);
      }
      if (stageNumber === 3) {
        return (cnum >= 300 && cnum < 400) || cstr.includes('الثالث') || /^3\d{2}/.test(cstr);
      }
      return false;
    });
  };

  // 1. Export Daily Absence Report
  const handleExportDaily = async (stage: StageConfig) => {
    const stageClasses = getClassesForStage(stage.stageNumber);
    if (stageClasses.length === 0) {
      toast.show(`لا توجد فصول متوفرة لـ ${stage.stageName}`, 'danger');
      return;
    }

    const key = `${stage.stageNumber}-daily`;
    setExportingKey(key);

    try {
      let matchingWeek = weeks.find((w) => selectedDate >= w.startDate && selectedDate <= w.endDate);
      let dayNumber = 1;

      if (matchingWeek) {
        const dObj = new Date(selectedDate);
        const dayOfWeek = dObj.getDay();
        dayNumber = Math.min(5, Math.max(1, dayOfWeek + 1));
      } else {
        matchingWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId) || weeks[0];
        const dObj = new Date(selectedDate);
        const dayOfWeek = dObj.getDay();
        dayNumber = Math.min(5, Math.max(1, dayOfWeek + 1));
      }

      const dayName = getArabicDayName(dayNumber);
      const reps = await schoolDataService.getRepresentatives(true).catch(() => []);

      const classesData = await Promise.all(
        stageClasses.map(async (classItem) => {
          const [enrollments, records] = await Promise.all([
            schoolDataService.getEnrollmentsByClass(classItem.classId).catch(() => []),
            matchingWeek
              ? schoolDataService
                  .getAttendanceRecords(classItem.classId, matchingWeek.attendanceWeekId)
                  .catch(() => [])
              : Promise.resolve([]),
          ]);

          const classRep = reps.find((r) => r.username === `${classItem.classId}_1` && r.isActive);
          const dayRecords = records.filter((r) => r.dayNumber === dayNumber);

          return {
            classItem,
            representativeName: classRep?.studentName,
            enrollments,
            records: dayRecords,
          };
        })
      );

      await excelExportService.exportStageDailyAbsenceReport({
        stageNumber: stage.stageNumber,
        stageName: stage.stageName,
        academicYear: '2026-2027',
        date: selectedDate,
        dayName,
        schoolName,
        classesData,
      });

      toast.show(`تم تنزيل كشف الغياب اليومي لـ ${stage.stageName} بنجاح`, 'success');
    } catch {
      toast.show('حدث خطأ أثناء تنزيل كشف الغياب اليومي', 'danger');
    } finally {
      setExportingKey(null);
    }
  };

  // 2. Export Weekly Absence Report
  const handleExportWeekly = async (stage: StageConfig) => {
    const stageClasses = getClassesForStage(stage.stageNumber);
    if (stageClasses.length === 0) {
      toast.show(`لا توجد فصول متوفرة لـ ${stage.stageName}`, 'danger');
      return;
    }

    const key = `${stage.stageNumber}-weekly`;
    setExportingKey(key);

    try {
      const selectedWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId) || weeks[0];
      const weekRange = selectedWeek
        ? `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(selectedWeek.endDate)}`
        : '';

      const reps = await schoolDataService.getRepresentatives(true).catch(() => []);

      const classesData = await Promise.all(
        stageClasses.map(async (classItem) => {
          const [enrollments, records] = await Promise.all([
            schoolDataService.getEnrollmentsByClass(classItem.classId).catch(() => []),
            selectedWeek
              ? schoolDataService
                  .getAttendanceRecords(classItem.classId, selectedWeek.attendanceWeekId)
                  .catch(() => [])
              : Promise.resolve([]),
          ]);

          const classRep = reps.find((r) => r.username === `${classItem.classId}_1` && r.isActive);

          return {
            classItem,
            representativeName: classRep?.studentName,
            enrollments,
            records,
          };
        })
      );

      await excelExportService.exportStageWeeklyAbsenceReport({
        stageNumber: stage.stageNumber,
        stageName: stage.stageName,
        academicYear: '2026-2027',
        weekNumber: selectedWeek?.weekNumber || 1,
        weekRange,
        schoolName,
        classesData,
      });

      toast.show(`تم تنزيل كشف الغياب الأسبوعي لـ ${stage.stageName} بنجاح`, 'success');
    } catch {
      toast.show('حدث خطأ أثناء تنزيل كشف الغياب الأسبوعي', 'danger');
    } finally {
      setExportingKey(null);
    }
  };

  // 3. Export Monthly Absence Report
  const handleExportMonthly = async (stage: StageConfig) => {
    const stageClasses = getClassesForStage(stage.stageNumber);
    if (stageClasses.length === 0) {
      toast.show(`لا توجد فصول متوفرة لـ ${stage.stageName}`, 'danger');
      return;
    }

    const key = `${stage.stageNumber}-monthly`;
    setExportingKey(key);

    try {
      const reps = await schoolDataService.getRepresentatives(true).catch(() => []);

      const overlappingWeeks = weeks.filter((w) => {
        return (
          w.startDate.startsWith(selectedMonth) ||
          w.endDate.startsWith(selectedMonth) ||
          (selectedMonth >= w.startDate.substring(0, 7) && selectedMonth <= w.endDate.substring(0, 7))
        );
      });

      const weeksToQuery = overlappingWeeks.length > 0 ? overlappingWeeks : weeks.slice(0, 4);

      const classesData = await Promise.all(
        stageClasses.map(async (classItem) => {
          const enrollments = await schoolDataService.getEnrollmentsByClass(classItem.classId).catch(() => []);

          const weekRecordsArrays = await Promise.all(
            weeksToQuery.map((w) =>
              schoolDataService.getAttendanceRecords(classItem.classId, w.attendanceWeekId).catch(() => [])
            )
          );
          const allMonthRecords = weekRecordsArrays.flat();

          const classRep = reps.find((r) => r.username === `${classItem.classId}_1` && r.isActive);

          const { summary, detailedAbsences } = reportCalculationService.calculateMonthlyReport(
            enrollments,
            allMonthRecords,
            weeksToQuery,
            selectedMonth
          );

          return {
            classItem,
            representativeName: classRep?.studentName,
            enrollments,
            monthlySummary: summary,
            detailedAbsences,
          };
        })
      );

      await excelExportService.exportStageMonthlyAbsenceReport({
        stageNumber: stage.stageNumber,
        stageName: stage.stageName,
        academicYear: '2026-2027',
        monthStr: selectedMonth,
        schoolName,
        classesData,
      });

      toast.show(`تم تنزيل كشف الغياب الشهري لـ ${stage.stageName} بنجاح`, 'success');
    } catch {
      toast.show('حدث خطأ أثناء تنزيل كشف الغياب الشهري', 'danger');
    } finally {
      setExportingKey(null);
    }
  };

  const isBusy = exportingKey !== null;

  return (
    <div className="space-y-6">
      {/* Top Banner and Filter Bar */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF2F3] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FDECEC] text-[#A61B1B] flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#17252B]">
                نظام تقارير الغياب الرسمية للمراحل (Excel)
              </h2>
            </div>
            <p className="text-xs text-[#5F6B73] mt-1">
              تنزيل كشوفات الغياب اليومية والأسبوعية والشهرية لجميع فصول المرحلة بملف مصنف واحد مجمع (.xlsx)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#245B63] bg-[#E8F1F1] px-3 py-1.5 rounded-lg border border-[#245B63]/20 self-start sm:self-auto">
            <Building2 className="w-4 h-4" />
            <span>3 مراحل دراسية • 9 تقارير مجمعة</span>
          </div>
        </div>

        {/* Global Controls / Date & Week Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F8FAFA] p-4 rounded-xl border border-[#DCE3E6]">
          {/* Daily Date Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#17252B] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#245B63]" />
              <span>تاريخ كشف الغياب اليومي:</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={isBusy}
              className="w-full h-10 px-3 bg-white text-xs font-medium text-[#17252B] rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            />
          </div>

          {/* Weekly Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#17252B] flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#245B63]" />
              <span>أسبوع كشف الغياب الأسبوعي:</span>
            </label>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(Number(e.target.value))}
              disabled={isBusy}
              className="w-full h-10 px-3 bg-white text-xs font-medium text-[#17252B] rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              {weeks.map((w) => (
                <option key={w.attendanceWeekId} value={w.attendanceWeekId}>
                  الأسبوع {w.weekNumber} ({formatArabicDateShort(w.startDate)} - {formatArabicDateShort(w.endDate)})
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#17252B] flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-[#245B63]" />
              <span>شهر كشف الغياب الشهري:</span>
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={isBusy}
              className="w-full h-10 px-3 bg-white text-xs font-medium text-[#17252B] rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3 Main Academic Stage Sections */}
      <div className="space-y-5">
        {STAGES.map((stg) => {
          const stageClasses = getClassesForStage(stg.stageNumber);
          const dailyKey = `${stg.stageNumber}-daily`;
          const weeklyKey = `${stg.stageNumber}-weekly`;
          const monthlyKey = `${stg.stageNumber}-monthly`;

          const isDailyExporting = exportingKey === dailyKey;
          const isWeeklyExporting = exportingKey === weeklyKey;
          const isMonthlyExporting = exportingKey === monthlyKey;

          return (
            <div
              key={stg.stageNumber}
              className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs p-5 sm:p-6 space-y-4"
            >
              {/* Stage Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2F3] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${stg.accentBadge}`}>
                    القسم {stg.stageNumber === 1 ? 'الأول' : stg.stageNumber === 2 ? 'الثاني' : 'الثالث'}
                  </span>
                  <h3 className="text-base font-bold text-[#17252B]">{stg.stageName}</h3>
                  <span className="text-xs text-[#5F6B73]">({stg.stageSubtitle})</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#5F6B73] bg-[#F5F7F8] px-3 py-1 rounded-lg border border-[#DCE3E6] self-start sm:self-auto">
                  <span>الشعب الفعلية المعتمدة:</span>
                  <span className="font-bold text-[#245B63]">{stageClasses.length} شعبة</span>
                </div>
              </div>

              {/* 3 Actions Buttons Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Action 1: Daily Absence */}
                <div className="p-4 rounded-xl border border-[#DCE3E6] bg-[#FAFCFD] hover:bg-white hover:border-[#245B63]/40 transition-all flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#17252B] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#A61B1B]" />
                        <span>كشف الغياب اليومي</span>
                      </span>
                      <span className="text-[10px] text-[#A61B1B] bg-[#FDECEC] px-2 py-0.5 rounded-full font-bold">
                        يومي
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5F6B73]">
                      حصر الطلاب الغائبين في تاريخ <strong className="font-mono text-[#17252B]">{selectedDate}</strong> لجميع شعب المرحلة.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportDaily(stg)}
                    disabled={isBusy || stageClasses.length === 0}
                    className={`w-full h-10 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                      isDailyExporting
                        ? 'bg-[#245B63]/20 text-[#245B63] cursor-wait'
                        : stageClasses.length === 0
                        ? 'bg-[#F5F7F8] text-[#89949A] cursor-not-allowed border border-[#DCE3E6]'
                        : 'bg-[#245B63] hover:bg-[#1d494f] text-white active:scale-[0.99]'
                    }`}
                  >
                    {isDailyExporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري التصدير...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>تنزيل كشف الغياب اليومي</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Action 2: Weekly Absence */}
                <div className="p-4 rounded-xl border border-[#DCE3E6] bg-[#FAFCFD] hover:bg-white hover:border-[#245B63]/40 transition-all flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#17252B] flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-[#855500]" />
                        <span>كشف الغياب الأسبوعي</span>
                      </span>
                      <span className="text-[10px] text-[#855500] bg-[#FFF4DA] px-2 py-0.5 rounded-full font-bold">
                        أسبوعي
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5F6B73]">
                      مصفوفة غياب أيام الأسبوع الـ 5 للأسبوع المختار لجميع شعب المرحلة.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportWeekly(stg)}
                    disabled={isBusy || stageClasses.length === 0}
                    className={`w-full h-10 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                      isWeeklyExporting
                        ? 'bg-[#245B63]/20 text-[#245B63] cursor-wait'
                        : stageClasses.length === 0
                        ? 'bg-[#F5F7F8] text-[#89949A] cursor-not-allowed border border-[#DCE3E6]'
                        : 'bg-[#245B63] hover:bg-[#1d494f] text-white active:scale-[0.99]'
                    }`}
                  >
                    {isWeeklyExporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري التصدير...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>تنزيل كشف الغياب الأسبوعي</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Action 3: Monthly Absence */}
                <div className="p-4 rounded-xl border border-[#DCE3E6] bg-[#FAFCFD] hover:bg-white hover:border-[#245B63]/40 transition-all flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#17252B] flex items-center gap-1.5">
                        <CalendarRange className="w-3.5 h-3.5 text-[#2C4A6F]" />
                        <span>كشف الغياب الشهري</span>
                      </span>
                      <span className="text-[10px] text-[#2C4A6F] bg-[#EEF2F6] px-2 py-0.5 rounded-full font-bold">
                        شهري
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5F6B73]">
                      إجمالي الغياب التراكمي ونسب الانضباط لشهر <strong className="font-mono text-[#17252B]">{selectedMonth}</strong> لجميع الشعب.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportMonthly(stg)}
                    disabled={isBusy || stageClasses.length === 0}
                    className={`w-full h-10 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                      isMonthlyExporting
                        ? 'bg-[#245B63]/20 text-[#245B63] cursor-wait'
                        : stageClasses.length === 0
                        ? 'bg-[#F5F7F8] text-[#89949A] cursor-not-allowed border border-[#DCE3E6]'
                        : 'bg-[#245B63] hover:bg-[#1d494f] text-white active:scale-[0.99]'
                    }`}
                  >
                    {isMonthlyExporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري التصدير...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>تنزيل كشف الغياب الشهري</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructional Guidelines Callout */}
      <div className="p-4 bg-[#F8FAFA] rounded-xl border border-[#DCE3E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5F6B73]">
        <div className="flex items-center gap-2 text-[#245B63]">
          <FileCheck2 className="w-4 h-4 shrink-0" />
          <span className="font-bold text-[#17252B]">هيكل المصنف الموحد:</span>
          <span>كل تنزيل يولد ملف Excel واحد (.xlsx) يحتوي على ورقة ملخص للمرحلة + ورقة عمل مستقلة لكل شعبة.</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#89949A]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>الشعب التي لا يوجد بها غياب يتم إدراجها مع بيان حضور كامل 100%.</span>
        </div>
      </div>
    </div>
  );
}
