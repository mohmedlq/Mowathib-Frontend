import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Layers } from 'lucide-react';
import { Spinner } from '../../../shared/components/ui/Spinner';
import type { ClassItem, AttendanceWeek } from '../../../shared/types';
import { schoolDataService } from '../../../shared/services/schoolDataService';
import { excelExportService } from '../services/excelExportService';
import { useNotifications } from '../../notifications';
import { useSchoolSettings } from '../../../shared/services/schoolSettingsService';
import { formatArabicDateShort, resolveDefaultAttendanceWeek } from '../../../shared/utils/date';

interface StageBatchExportCardProps {
  classes: ClassItem[];
  weeks: AttendanceWeek[];
}

interface StageInfo {
  stageNumber: 1 | 2 | 3;
  stageName: string;
  stageSubtext: string;
  badgeColor: string;
}

const STAGES: StageInfo[] = [
  {
    stageNumber: 1,
    stageName: 'الصف الأول الثانوي',
    stageSubtext: 'الشعب من 101 وما يعادلها',
    badgeColor: 'bg-[#E8F1F1] text-[#245B63] border-[#245B63]/20',
  },
  {
    stageNumber: 2,
    stageName: 'الصف الثاني الثانوي',
    stageSubtext: 'الشعب من 201 وما يعادلها',
    badgeColor: 'bg-[#EEF2F6] text-[#2C4A6F] border-[#2C4A6F]/20',
  },
  {
    stageNumber: 3,
    stageName: 'الصف الثالث الثانوي',
    stageSubtext: 'الشعب من 301 وما يعادلها',
    badgeColor: 'bg-[#F2EFF7] text-[#553C7B] border-[#553C7B]/20',
  },
];

export function StageBatchExportCard({ classes, weeks }: StageBatchExportCardProps) {
  const { toast } = useNotifications();
  const { schoolName } = useSchoolSettings();

  const [selectedWeekId, setSelectedWeekId] = useState<number>(() => {
    return resolveDefaultAttendanceWeek(weeks)?.attendanceWeekId || 0;
  });

  useEffect(() => {
    if ((!selectedWeekId || selectedWeekId === 0) && weeks.length > 0) {
      const activeWeek = resolveDefaultAttendanceWeek(weeks);
      if (activeWeek) {
        setSelectedWeekId(activeWeek.attendanceWeekId);
      }
    }
  }, [weeks, selectedWeekId]);

  const [exportingStage, setExportingStage] = useState<number | null>(null);

  const selectedWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId) || weeks[0];

  // Helper to dynamically filter classes by stage
  const getClassesForStage = (stageNumber: 1 | 2 | 3): ClassItem[] => {
    return classes.filter((c) => {
      const match = String(c.classNumber ?? c.className ?? c.classId).match(/\d+/);
      const cnum = match ? Number(match[0]) : Number(c.classId);
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

  const handleExportStage = async (stage: StageInfo) => {
    const stageClasses = getClassesForStage(stage.stageNumber);

    if (stageClasses.length === 0) {
      toast.show(`لا توجد فصول مسجلة حالياً لـ ${stage.stageName}`, 'danger');
      return;
    }

    setExportingStage(stage.stageNumber);

    try {
      // 1. Fetch representatives and all enrollments in bulk
      const [reps, allEnrolls] = await Promise.all([
        schoolDataService.getRepresentatives(true).catch(() => []),
        schoolDataService.getAllEnrollments().catch(() => []),
      ]);

      const enrollsByClass = new Map<number, typeof allEnrolls>();
      allEnrolls.forEach((e) => {
        const list = enrollsByClass.get(e.classId) || [];
        list.push(e);
        enrollsByClass.set(e.classId, list);
      });

      // 2. Fetch attendance records for all classes in this stage in parallel
      const classesData = await Promise.all(
        stageClasses.map(async (classItem) => {
          let enrollments = enrollsByClass.get(classItem.classId);
          if (!enrollments || enrollments.length === 0) {
            enrollments = await schoolDataService.getEnrollmentsByClass(classItem.classId).catch(() => []);
          }

          const records = selectedWeek
            ? await schoolDataService
                .getAttendanceRecords(classItem.classId, selectedWeek.attendanceWeekId)
                .catch(() => [])
            : [];

          const classRep = reps.find((r) => r.username === `${classItem.classId}_1` && r.isActive);

          return {
            classItem,
            representativeName: classRep?.studentName,
            enrollments,
            records,
          };
        })
      );

      const weekRange = selectedWeek
        ? `${formatArabicDateShort(selectedWeek.startDate)} - ${formatArabicDateShort(selectedWeek.endDate)}`
        : '';

      // 3. Generate and trigger download of ONE multi-sheet workbook
      await excelExportService.exportStageBatchReport({
        stageNumber: stage.stageNumber,
        stageName: stage.stageName,
        academicYear: '1448-1449هـ',
        weekNumber: selectedWeek?.weekNumber || 1,
        weekRange,
        schoolName,
        classesData,
      });

      toast.show(
        `تم تصدير تقرير ${stage.stageName} بنجاح (${stageClasses.length} شعبة في ملف واحد)`,
        'success'
      );
    } catch (err: any) {
      console.error('Stage Batch Export Error:', err);
      toast.show(err?.message || 'حدث خطأ أثناء إعداد وتصدير تقرير المرحلة، يرجى المحاولة لاحقاً', 'danger');
    } finally {
      setExportingStage(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF2F3] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F1F1] text-[#245B63] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#17252B]">
              تصدير تقارير الحضور الشاملة للمراحل (دفعة واحدة)
            </h2>
          </div>
          <p className="text-xs text-[#5F6B73]">
            تصدير جميع شعب المرحلة الدراسية المحددة في مصنف Excel واحد (.xlsx) يحتوي على ورقة ملخص للمرحلة ومقارنة بين الشعب، بالإضافة إلى صفحة تفصيلية مستقلة لكل شعبة.
          </p>
        </div>

        {/* Week Selector for the stage export */}
        {weeks.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <label className="text-xs font-semibold text-[#17252B] whitespace-nowrap">
              الأسبوع المستهدف:
            </label>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(Number(e.target.value))}
              disabled={exportingStage !== null}
              className="h-9 px-3 bg-[#F5F7F8] hover:bg-white text-xs font-medium text-[#17252B] rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer transition-colors"
            >
              {weeks.map((w) => (
                <option key={w.attendanceWeekId} value={w.attendanceWeekId}>
                  الأسبوع {w.weekNumber} ({formatArabicDateShort(w.startDate)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stage Cards Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAGES.map((stg) => {
          const stageClasses = getClassesForStage(stg.stageNumber);
          const isThisExporting = exportingStage === stg.stageNumber;
          const isAnyExporting = exportingStage !== null;

          return (
            <div
              key={stg.stageNumber}
              className="p-4 sm:p-5 rounded-xl border border-[#DCE3E6] bg-[#FAFCFD] hover:bg-white hover:border-[#245B63]/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stg.badgeColor}`}
                  >
                    المرحلة {stg.stageNumber}
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#5F6B73] bg-white px-2 py-0.5 rounded border border-[#DCE3E6]">
                    {stageClasses.length} شعبة متوفرة
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#17252B] pt-1">{stg.stageName}</h3>
                <p className="text-xs text-[#5F6B73]">{stg.stageSubtext}</p>
              </div>

              <div className="pt-2 border-t border-[#EEF2F3]">
                <button
                  type="button"
                  onClick={() => handleExportStage(stg)}
                  disabled={isAnyExporting || stageClasses.length === 0}
                  className={`w-full h-10 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                    isThisExporting
                      ? 'bg-[#245B63]/20 text-[#245B63] cursor-wait'
                      : stageClasses.length === 0
                      ? 'bg-[#F5F7F8] text-[#89949A] cursor-not-allowed border border-[#DCE3E6]'
                      : 'bg-[#245B63] hover:bg-[#1d494f] text-white active:scale-[0.99]'
                  }`}
                >
                  {isThisExporting ? (
                    <>
                      <Spinner size="sm" />
                      <span>جاري تجميع البيانات والتصدير...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>تصدير تقارير {stg.stageName}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info notice */}
      <div className="p-3 bg-[#F0F7F7] border border-[#245B63]/20 rounded-xl text-xs text-[#245B63] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Download className="w-4 h-4 shrink-0" />
          <span>
            <strong>تصدير آلي شامل:</strong> المصنف يضم ورقة مقارنة تحليلية ومخطط حضور كامل لجميع حصص الأسبوع الـ 33 لكل شعبة بالمرحلة بصيغة متوافقة مع الطباعة والتقارير الوزارية.
          </span>
        </span>
      </div>
    </div>
  );
}

