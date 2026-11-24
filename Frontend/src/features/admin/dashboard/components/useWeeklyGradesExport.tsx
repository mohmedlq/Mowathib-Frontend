import { useState } from 'react';
import { enrollmentsApi } from '../../../../features/enrollments/api/enrollmentsApi';
import { attendanceApi } from '../../../../features/attendance/api/attendanceApi';
import { excelExportService } from '../../../reports/services/excelExportService';
import { buildWeeklyAttendanceRows } from '../../../attendance/utils/matrixBuilder';
import { useNotifications } from '../../../notifications';
import { formatArabicDateShort } from '../../../../shared/utils/date';
import type { ClassItem, AttendanceRecord } from '../../../../shared/types';

type GradeClassExportData = {
  classItem: ClassItem;
  className: string;
  classNumber: number;
  attendances: ReturnType<typeof buildWeeklyAttendanceRows>;
};

interface ExportParams {
  classes: ClassItem[];
  activeYear?: { academicYearId: number; yearName: string } | null;
  activeWeek?: {
    attendanceWeekId: number;
    weekNumber: number;
    startDate: string;
    endDate: string;
  } | null;
  isLoadingMetadata: boolean;
}

const getClassNum = (c: ClassItem): number => {
  if (c.classNumber && !isNaN(Number(c.classNumber))) return Number(c.classNumber);
  const match = String(c.className || '').match(/\d+/);
  return match ? Number(match[0]) : Number(c.classId);
};

const filterByGrade = (classes: ClassItem[], grade: 1 | 2 | 3): ClassItem[] => {
  const gradeNames = { 1: 'الأول', 2: 'الثاني', 3: 'الثالث' };
  const min = grade * 100;
  const max = (grade + 1) * 100;
  const prefixRegex = new RegExp(`^${grade}\\d{2}`);

  return classes.filter((c) => {
    const num = getClassNum(c);
    const str = String(c.className ?? c.classNumber ?? c.classId);
    return (num >= min && num < max) || str.includes(gradeNames[grade]) || prefixRegex.test(str);
  });
};

export function useWeeklyGradesExport() {
  const { toast } = useNotifications();
  const [isExporting, setIsExporting] = useState(false);

  const exportWeeklyGrades = async ({
    classes,
    activeYear,
    activeWeek,
    isLoadingMetadata,
  }: ExportParams) => {
    if (isExporting) return;

    if (isLoadingMetadata) {
      toast.show('جاري تحميل بيانات المدرسة، حاول بعد اكتمال التحميل.', 'info');
      return;
    }
    if (!activeYear?.academicYearId) {
      toast.show('تعذر تحديد العام الدراسي النشط.', 'danger');
      return;
    }
    if (!activeWeek?.attendanceWeekId) {
      toast.show('لا يوجد أسبوع دراسي حالي محدد للتصدير.', 'danger');
      return;
    }
    if (classes.length === 0) {
      toast.show('لا توجد شعب دراسية لتصدير بياناتها.', 'danger');
      return;
    }

    try {
      setIsExporting(true);
      toast.show('جاري تجهيز مصنف Excel للمراحل...', 'info');

      const allEnrolls = await enrollmentsApi.getAllEnrollments();
      const enrollsMap = new Map<number, typeof allEnrolls>();
      for (const e of allEnrolls) {
        const list = enrollsMap.get(e.classId) ?? [];
        list.push(e);
        enrollsMap.set(e.classId, list);
      }

      const g1 = filterByGrade(classes, 1);
      const g2 = filterByGrade(classes, 2);
      const g3 = filterByGrade(classes, 3);
      const allClasses = [...g1, ...g2, ...g3];

      let weekRecordsByClass: Map<number, AttendanceRecord[]> | null = null;
      try {
        const allWeekRecs = await attendanceApi.getAttendanceRecordsByWeek(
          activeWeek.attendanceWeekId
        );
        if (allWeekRecs?.length) {
          weekRecordsByClass = new Map();
          for (const r of allWeekRecs) {
            if (!r.classId) continue;
            const list = weekRecordsByClass.get(r.classId) ?? [];
            list.push(r);
            weekRecordsByClass.set(r.classId, list);
          }
        }
      } catch {
        weekRecordsByClass = null;
      }

      const resultsByClassId = new Map<number, GradeClassExportData>();
      const concurrencyLimit = 8;

      for (let i = 0; i < allClasses.length; i += concurrencyLimit) {
        const batch = allClasses.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(
          batch.map(async (cls): Promise<GradeClassExportData> => {
            const cachedEnrolls = enrollsMap.get(cls.classId);
            const [enrollments, records] = await Promise.all([
              cachedEnrolls?.length
                ? Promise.resolve(cachedEnrolls)
                : enrollmentsApi.getEnrollmentsByClass(cls.classId, activeYear.academicYearId),
              weekRecordsByClass?.has(cls.classId)
                ? Promise.resolve(weekRecordsByClass.get(cls.classId)!)
                : attendanceApi.getAttendanceRecords(cls.classId, activeWeek.attendanceWeekId),
            ]);

            return {
              classItem: cls,
              className: String(cls.className || cls.classNumber || `شعبة ${cls.classId}`),
              classNumber: Number(cls.classNumber || cls.classId),
              attendances: buildWeeklyAttendanceRows(enrollments, records),
            };
          })
        );

        for (const res of batchResults) {
          resultsByClassId.set(res.classItem.classId, res);
        }
      }

      const mapOrdered = (list: ClassItem[]) =>
        list.map((cls) => {
          const item = resultsByClassId.get(cls.classId);
          if (!item) throw new Error(`تعذر جلب بيانات الشعبة ${cls.className ?? cls.classId}`);
          return item;
        });

      const weekRange = `${formatArabicDateShort(activeWeek.startDate)} - ${formatArabicDateShort(
        activeWeek.endDate
      )}`;

      await excelExportService.exportAllGradesWeeklyPreparation({
        weekNumber: activeWeek.weekNumber,
        weekRange,
        academicYear: activeYear.yearName,
        gradesData: [
          { gradeName: 'الأول الثانوي', classesData: mapOrdered(g1) },
          { gradeName: 'الثاني الثانوي', classesData: mapOrdered(g2) },
          { gradeName: 'الثالث الثانوي', classesData: mapOrdered(g3) },
        ],
      });

      toast.show('تم تحميل كشف التحضير الأسبوعي بنجاح.', 'success');
    } catch (err: unknown) {
      console.error('Failed to export grades weekly attendance:', err);
      toast.show(
        err instanceof Error ? err.message : 'تعذر تصدير كشوف المراحل، يرجى المحاولة لاحقاً.',
        'danger'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, exportWeeklyGrades };
}