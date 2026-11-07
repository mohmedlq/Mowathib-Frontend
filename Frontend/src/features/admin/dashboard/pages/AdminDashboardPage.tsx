import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { excelExportService } from '../../../reports/services/excelExportService';
import { buildWeeklyAttendanceRows } from '../../../attendance/utils/matrixBuilder';
import { useNotifications } from '../../../notifications';
import {
  formatArabicDateShort,
  resolveDefaultAttendanceWeek,
} from '../../../../shared/utils/date';
import {
  GraduationCap,
  Building2,
  CalendarCheck,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Spinner } from '../../../../shared/components/ui/Spinner';
import type { ClassItem } from '../../../../shared/types';

type GradeClassExportData = {
  classItem: ClassItem;
  className: string;
  classNumber: number;
  attendances: ReturnType<typeof buildWeeklyAttendanceRows>;
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useNotifications();

  const [isExportingGrades, setIsExportingGrades] = useState(false);

  // 1. Fetch Students Count
  const {
    data: studentsCount = 0,
    isLoading: isStudentsLoading,
  } = useQuery({
    queryKey: ['students_count'],
    queryFn: () => schoolDataService.getStudentsCount(),
  });

  // 2. Fetch Classes
  const {
    data: classes = [],
    isLoading: isClassesLoading,
  } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  // 3. Fetch Active Academic Year
  const {
    data: activeYear,
    isLoading: isActiveYearLoading,
  } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => schoolDataService.getActiveAcademicYear(),
  });

  // 4. Fetch Attendance Weeks
  const {
    data: weeks = [],
    isLoading: isWeeksLoading,
  } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
  });

  // 5. Resolve Active Attendance Week
  const activeWeek = useMemo(() => {
    return (
      resolveDefaultAttendanceWeek(weeks) ||
      weeks[0] || {
        weekNumber: 1,
        attendanceWeekId: 1,
        startDate: '2026-11-01',
        endDate: '2026-11-05',
      }
    );
  }, [weeks]);

  // 6. Extract Numeric Class Identifier
  const getClassNum = (c: ClassItem): number => {
    if (
      c.classNumber &&
      !isNaN(Number(c.classNumber))
    ) {
      return Number(c.classNumber);
    }

    const match = String(c.className || '').match(/\d+/);

    if (match) {
      return Number(match[0]);
    }

    return Number(c.classId);
  };

  // 7. Export Weekly Attendance for All Grades
  const handleDownloadGradesWeekly = async (
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();

    if (isExportingGrades) return;

    if (
      isClassesLoading ||
      isWeeksLoading ||
      isActiveYearLoading
    ) {
      toast.show(
        'جاري تحميل بيانات المدرسة، حاول بعد اكتمال التحميل.',
        'info'
      );
      return;
    }

    if (!activeYear?.academicYearId) {
      toast.show(
        'تعذر تحديد العام الدراسي النشط.',
        'danger'
      );
      return;
    }

    if (!activeWeek?.attendanceWeekId) {
      toast.show(
        'لا يوجد أسبوع دراسي حالي محدد للتصدير.',
        'danger'
      );
      return;
    }

    if (classes.length === 0) {
      toast.show(
        'لا توجد شعب دراسية لتصدير بياناتها.',
        'danger'
      );
      return;
    }

    try {
      setIsExportingGrades(true);

      toast.show(
        'جاري تجميع بيانات الشعب وتجهيز مصنف Excel...',
        'info'
      );

      const dataFetchStarted = performance.now();

      // 1. Fetch all enrollments once.
      const allEnrolls =
        await schoolDataService.getAllEnrollments();

      // 2. Group enrollments by class.
      const enrollsMap = new Map<
        number,
        typeof allEnrolls
      >();

      for (const enrollment of allEnrolls) {
        const list =
          enrollsMap.get(enrollment.classId) ?? [];

        list.push(enrollment);

        enrollsMap.set(enrollment.classId, list);
      }

      // 3. Identify classes by grade.
      const getClassesForGrade = (
        gradeIndex: 1 | 2 | 3
      ): ClassItem[] => {
        return classes.filter((c) => {
          const cnum = getClassNum(c);

          const cstr = String(
            c.className ??
            c.classNumber ??
            c.classId
          );

          if (gradeIndex === 1) {
            return (
              (cnum >= 100 && cnum < 200) ||
              cstr.includes('الأول') ||
              /^1\d{2}/.test(cstr)
            );
          }

          if (gradeIndex === 2) {
            return (
              (cnum >= 200 && cnum < 300) ||
              cstr.includes('الثاني') ||
              /^2\d{2}/.test(cstr)
            );
          }

          return (
            (cnum >= 300 && cnum < 400) ||
            cstr.includes('الثالث') ||
            /^3\d{2}/.test(cstr)
          );
        });
      };

      const grade1Classes = getClassesForGrade(1);
      const grade2Classes = getClassesForGrade(2);
      const grade3Classes = getClassesForGrade(3);

      const allClasses = [
        ...grade1Classes,
        ...grade2Classes,
        ...grade3Classes,
      ];

      const targetWeek = activeWeek;
      const academicYearId = activeYear.academicYearId;

      const resultsByClassId = new Map<
        number,
        GradeClassExportData
      >();

      // 4. Fetch data for one class.
      const fetchClassData = async (
        cls: ClassItem
      ): Promise<GradeClassExportData> => {
        const cachedEnrollments =
          enrollsMap.get(cls.classId);

        const enrollmentsPromise =
          cachedEnrollments &&
          cachedEnrollments.length > 0
            ? Promise.resolve(cachedEnrollments)
            : schoolDataService.getEnrollmentsByClass(
                cls.classId,
                academicYearId
              );

        const recordsPromise =
          schoolDataService.getAttendanceRecords(
            cls.classId,
            targetWeek.attendanceWeekId
          );

        const [enrollments, records] =
          await Promise.all([
            enrollmentsPromise,
            recordsPromise,
          ]);

        const attendances = buildWeeklyAttendanceRows(
          enrollments,
          records
        );

        return {
          classItem: cls,
          className: String(
            cls.className ||
            cls.classNumber ||
            `شعبة ${cls.classId}`
          ),
          classNumber: Number(
            cls.classNumber || cls.classId
          ),
          attendances,
        };
      };

      // 5. Process classes with limited concurrency.
      const concurrencyLimit = 8;

      for (
        let i = 0;
        i < allClasses.length;
        i += concurrencyLimit
      ) {
        const batch = allClasses.slice(
          i,
          i + concurrencyLimit
        );

        const batchResults = await Promise.all(
          batch.map(fetchClassData)
        );

        for (const result of batchResults) {
          resultsByClassId.set(
            result.classItem.classId,
            result
          );
        }
      }

      // 6. Restore original class order.
      const getOrderedGradeData = (
        classList: ClassItem[]
      ): GradeClassExportData[] => {
        return classList.map((cls) => {
          const result = resultsByClassId.get(
            cls.classId
          );

          if (!result) {
            throw new Error(
              `لم يتم العثور على بيانات الشعبة ${
                cls.className ?? cls.classId
              }.`
            );
          }

          return result;
        });
      };

      const g1Data =
        getOrderedGradeData(grade1Classes);

      const g2Data =
        getOrderedGradeData(grade2Classes);

      const g3Data =
        getOrderedGradeData(grade3Classes);

      const dataFetchMs =
        performance.now() - dataFetchStarted;

      // 7. Generate Excel workbook.
      const workbookStarted = performance.now();

      const academicYearLabel = activeYear.yearName;

      const weekRange =
        `${formatArabicDateShort(targetWeek.startDate)} - ` +
        `${formatArabicDateShort(targetWeek.endDate)}`;

      await excelExportService.exportAllGradesWeeklyPreparation({
        weekNumber: targetWeek.weekNumber,
        weekRange,
        academicYear: academicYearLabel,

        gradesData: [
          {
            gradeName: 'الأول الثانوي',
            classesData: g1Data,
          },
          {
            gradeName: 'الثاني الثانوي',
            classesData: g2Data,
          },
          {
            gradeName: 'الثالث الثانوي',
            classesData: g3Data,
          },
        ],
      });

      const workbookMs =
        performance.now() - workbookStarted;

      // 8. Performance diagnostics.
      console.info('[Mowathib Weekly Export]', {
        numberOfClasses: allClasses.length,
        enrollmentRecords: allEnrolls.length,
        weekNumber: targetWeek.weekNumber,
        dataFetchMs: Math.round(dataFetchMs),
        workbookGenerationAndDownloadMs:
          Math.round(workbookMs),
        totalMs: Math.round(
          dataFetchMs + workbookMs
        ),
      });

      toast.show(
        'تم تحميل كشف التحضير الأسبوعي للمراحل بنجاح!',
        'success'
      );
    } catch (err: unknown) {
      console.error(
        'Failed to export grades weekly attendance:',
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : 'تعذر تصدير كشوف المراحل، يرجى المحاولة لاحقاً';

      toast.show(message, 'danger');
    } finally {
      setIsExportingGrades(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#DCE3E6] dark:border-[#28373D]">
        <div>
          <h1 className="text-2xl font-bold text-[#17252B] dark:text-[#F0F4F6] tracking-tight">
            لوحة الإدارة والتحكم الرئيسية
          </h1>

          <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-1 max-w-xl">
            متابعة إحصائيات المدرسة، إدارة الطلاب والشعب، والوصول المباشر إلى سجلات وكشوف الحضور الأسبوعية
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-medium text-[#176B3A] dark:text-[#4ADE80] bg-[#E8F5EC] dark:bg-[#122B1E] px-3 py-1.5 rounded-lg border border-[#B7DEC5] dark:border-[#1B4D32] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#176B3A] dark:text-[#4ADE80]" />
            <span>النظام متصل وجاهز للعمل</span>
          </span>
        </div>
      </div>

      {/* 2. Primary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

        {/* Card 1: Total Students */}
        <div
          onClick={() => navigate('/admin/students')}
          className="group bg-white dark:bg-[#182226] p-4 sm:p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#245B63] to-[#40838D] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <span className="text-[11px] font-bold text-[#176B3A] dark:text-[#4ADE80] bg-[#E8F5EC] dark:bg-[#122B1E] px-2.5 py-0.5 rounded-full border border-[#B7DEC5] dark:border-[#1B4D32]">
                قيد نشط
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">
              إجمالي الطلاب
            </span>

            <div className="text-2xl sm:text-3xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] font-mono mt-1 mb-2">
              {isStudentsLoading ? (
                <span className="text-sm font-normal text-[#89949A] dark:text-[#6E7F87] inline-flex items-center gap-1.5">
                  <Spinner size="xs" />
                  جاري الحساب...
                </span>
              ) : (
                <span>
                  {studentsCount}{' '}
                  <span className="text-sm font-bold text-[#5F6B73] dark:text-[#9BAAB1]">
                    طالباً
                  </span>
                </span>
              )}
            </div>

            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed">
              إدارة بيانات الطلاب المقيدين في المدرسة، البحث برقم الهوية، وتعديل وتسكين الشعب.
            </p>
          </div>

          <div className="pt-3 sm:pt-4 mt-4 sm:mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#245B63] dark:text-[#388B96] group-hover:text-[#174349] dark:group-hover:text-[#52B4C2]">
            <span>الانتقال لإدارة الطلاب</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Total Classes */}
        <div
          onClick={() => navigate('/admin/classes')}
          className="group bg-white dark:bg-[#182226] p-4 sm:p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#245B63] to-[#40838D] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <span className="text-[11px] font-bold text-[#245B63] dark:text-[#388B96] bg-[#E8F1F1] dark:bg-[#19383E] px-2.5 py-0.5 rounded-full border border-[#CDE0E2] dark:border-[#28373D]">
                3 مراحل ثانوية
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">
              إجمالي الشعب والفصول
            </span>

            <div className="text-2xl sm:text-3xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] font-mono mt-1 mb-2">
              {isClassesLoading ? (
                <span className="text-sm font-normal text-[#89949A] dark:text-[#6E7F87] inline-flex items-center gap-1.5">
                  <Spinner size="xs" />
                  جاري التحميل...
                </span>
              ) : (
                <span>
                  {classes.length}{' '}
                  <span className="text-sm font-bold text-[#5F6B73] dark:text-[#9BAAB1]">
                    شعبة
                  </span>
                </span>
              )}
            </div>

            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed">
              استعراض الشعب الدراسية الـ 30، توزيع بطاقات الاستئذان، وتعيين عرفاء ونواب الفصول.
            </p>
          </div>

          <div className="pt-3 sm:pt-4 mt-4 sm:mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#245B63] dark:text-[#388B96] group-hover:text-[#174349] dark:group-hover:text-[#52B4C2]">
            <span>الانتقال لإدارة الشعب</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Manage Attendance */}
        <div
          onClick={() => navigate('/admin/attendance')}
          className="group bg-white dark:bg-[#182226] p-4 sm:p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#245B63] to-[#40838D] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <span className="text-[11px] font-bold text-[#28559A] dark:text-[#60A5FA] bg-[#EAF2FF] dark:bg-[#13273D] px-2.5 py-0.5 rounded-full border border-[#C3D9FF] dark:border-[#1E3A5F]">
                رصد فوري
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">
              إدارة ورصد الحضور
            </span>

            <div className="text-xl sm:text-2xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] mt-2 mb-2">
              تسجيل ومتابعة الغياب
            </div>

            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed">
              شاشة الرصد التفاعلي لجميع الحصص (7 حصص الأحد-الثلاثاء، 6 الأربعاء والخميس) وكشف الغائبين.
            </p>
          </div>

          <div className="pt-3 sm:pt-4 mt-4 sm:mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#245B63] dark:text-[#388B96] group-hover:text-[#174349] dark:group-hover:text-[#52B4C2]">
            <span>فتح شاشة إدارة الحضور</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Download Weekly Attendance by Grades */}
        <div
          onClick={() => navigate('/admin/weekly-preparation')}
          className="group bg-white dark:bg-[#182226] p-4 sm:p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#176B3A] dark:hover:border-[#4ADE80] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#176B3A] to-[#259754] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <span className="text-[11px] font-bold text-[#176B3A] dark:text-[#4ADE80] bg-[#E8F5EC] dark:bg-[#122B1E] px-2.5 py-0.5 rounded-full border border-[#B7DEC5] dark:border-[#1B4D32]">
                مصنف Excel (3 مراحل)
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">
              التحضير الأسبوعي للمراحل
            </span>

            <div className="text-xl sm:text-2xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] mt-2 mb-2">
              تنزيل التحضير حسب المراحل
            </div>

            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed mb-3">
              تصدير كشوف التحضير الأسبوعية المعتمدة للمراحل الثلاث (أول، ثاني، ثالث ثانوي) في مصنف واحد أو بشكل منفصل.
            </p>

            {/* Direct Instant Download Button */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={
                isExportingGrades
                  ? <Spinner size="sm" />
                  : <Download className="w-4 h-4" />
              }
              onClick={handleDownloadGradesWeekly}
              disabled={isExportingGrades}
              className="w-full bg-[#176B3A] hover:bg-[#135830] dark:bg-[#1E7D45] dark:hover:bg-[#176B3A] border-[#135830] dark:border-[#1E7D45] text-xs font-bold shadow-xs justify-center"
            >
              <span>
                {isExportingGrades
                  ? 'جاري التحميل والتصدير...'
                  : 'اضغط لتنزيل ملف Excel للمراحل'}
              </span>
            </Button>
          </div>

          <div className="pt-3 sm:pt-4 mt-4 sm:mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#176B3A] dark:text-[#4ADE80] group-hover:text-[#135830] dark:group-hover:text-[#6EE7B7]">
            <span>عرض صفحة تحضير المراحل</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/*
          مؤجل مؤقتاً بناءً على طلب الإدارة:
          التحضير الشهري (5 أسابيع) حسب الشعب.
        */}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
