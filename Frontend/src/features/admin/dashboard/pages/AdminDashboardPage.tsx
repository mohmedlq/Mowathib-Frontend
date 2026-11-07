import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { excelExportService } from '../../../reports/services/excelExportService';
import { buildWeeklyAttendanceRows } from '../../../attendance/utils/matrixBuilder';
import { useNotifications } from '../../../notifications';
import { formatArabicDateShort } from '../../../../shared/utils/date';
import {
  GraduationCap,
  Building2,
  CalendarCheck,
  FileSpreadsheet,
  CalendarRange,
  Download,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Spinner } from '../../../../shared/components/ui/Spinner';
import type { ClassItem } from '../../../../shared/types';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useNotifications();
  const [isExportingGrades, setIsExportingGrades] = useState(false);

  // 1. Fetch Students Count (Fast aggregation)
  const { data: studentsCount = 0, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students_count'],
    queryFn: () => schoolDataService.getStudentsCount(),
  });

  // 2. Fetch Classes
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  // 3. Fetch Active Academic Year
  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => schoolDataService.getActiveAcademicYear(),
  });

  // 4. Fetch Attendance Weeks
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const activeWeek = weeks[0] || { weekNumber: 11, attendanceWeekId: 11, startDate: '2026-11-01', endDate: '2026-11-05' };

  // Helper to extract numeric class identifier
  const getClassNum = (c: ClassItem) => {
    if (c.classNumber && !isNaN(Number(c.classNumber))) return Number(c.classNumber);
    const match = String(c.className || '').match(/\d+/);
    if (match) return Number(match[0]);
    return Number(c.classId);
  };

  // Fast direct download for all grades weekly attendance
  const handleDownloadGradesWeekly = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setIsExportingGrades(true);
      toast.show('جاري تجميع بيانات المراحل الدراسية وتجهيز مصنف Excel...', 'info');

      // 1. Fetch all enrollments once in bulk
      const allEnrolls = await schoolDataService.getAllEnrollments().catch(() => []);
      const enrollsMap = new Map<number, typeof allEnrolls>();
      allEnrolls.forEach((item) => {
        const list = enrollsMap.get(item.classId) || [];
        list.push(item);
        enrollsMap.set(item.classId, list);
      });

      // 2. Split classes into 3 grades
      const grade1Classes = classes.filter((c) => getClassNum(c) >= 101 && getClassNum(c) <= 110);
      const grade2Classes = classes.filter((c) => getClassNum(c) >= 201 && getClassNum(c) <= 210);
      const grade3Classes = classes.filter((c) => getClassNum(c) >= 301 && getClassNum(c) <= 310);

      const targetWeek = activeWeek;

      const fetchGradeData = async (classList: ClassItem[]) => {
        return await Promise.all(
          classList.map(async (cls) => {
            let enrolls = enrollsMap.get(cls.classId);
            if (!enrolls || enrolls.length === 0) {
              enrolls = await schoolDataService.getEnrollmentsByClass(cls.classId).catch(() => []);
            }
            const recs = await schoolDataService
              .getAttendanceRecords(cls.classId, targetWeek.attendanceWeekId)
              .catch(() => []);
            const attendances = buildWeeklyAttendanceRows(enrolls, recs);
            return {
              classItem: cls,
              className: String(cls.className || `شعبة ${cls.classId}`),
              classNumber: Number(cls.classNumber || cls.classId),
              attendances,
            };
          })
        );
      };

      const [g1Data, g2Data, g3Data] = await Promise.all([
        fetchGradeData(grade1Classes),
        fetchGradeData(grade2Classes),
        fetchGradeData(grade3Classes),
      ]);

      const academicYearLabel = activeYear?.yearName || '1446-1447هـ';
      const weekRange = `${formatArabicDateShort(targetWeek.startDate)} - ${formatArabicDateShort(targetWeek.endDate)}`;

      // 3. Generate 3-grade unified workbook
      await excelExportService.exportAllGradesWeeklyPreparation({
        weekNumber: targetWeek.weekNumber,
        weekRange,
        academicYear: academicYearLabel,
        gradesData: [
          { gradeName: 'الأول الثانوي', classesData: g1Data },
          { gradeName: 'الثاني الثانوي', classesData: g2Data },
          { gradeName: 'الثالث الثانوي', classesData: g3Data },
        ],
      });

      toast.show('تم تحميل كشف التحضير الأسبوعي للمراحل بنجاح!', 'success');
    } catch (err: any) {
      console.error('Failed to export grades weekly attendance:', err);
      toast.show(err.message || 'تعذر تصدير كشوف المراحل، يرجى المحاولة لاحقاً', 'danger');
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

      {/* 2. Primary 5 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Total Students */}
        <div
          onClick={() => navigate('/admin/students')}
          className="group bg-white dark:bg-[#182226] p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#245B63] to-[#40838D] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-[#176B3A] dark:text-[#4ADE80] bg-[#E8F5EC] dark:bg-[#122B1E] px-2.5 py-0.5 rounded-full border border-[#B7DEC5] dark:border-[#1B4D32]">
                قيد نشط
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">إجمالي الطلاب</span>
            <div className="text-3xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] font-mono mt-1 mb-2">
              {isStudentsLoading ? (
                <span className="text-sm font-normal text-[#89949A] dark:text-[#6E7F87] inline-flex items-center gap-1.5">
                  <Spinner size="xs" /> جاري الحساب...
                </span>
              ) : (
                <span>{studentsCount} <span className="text-sm font-bold text-[#5F6B73] dark:text-[#9BAAB1]">طالباً</span></span>
              )}
            </div>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed">
              إدارة بيانات الطلاب المقيدين في المدرسة، البحث برقم الهوية، وتعديل وتسكين الشعب.
            </p>
          </div>

          <div className="pt-4 mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#245B63] dark:text-[#388B96] group-hover:text-[#174349] dark:group-hover:text-[#52B4C2]">
            <span>الانتقال لإدارة الطلاب</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Total Classes */}
        <div
          onClick={() => navigate('/admin/classes')}
          className="group bg-white dark:bg-[#182226] p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#245B63] to-[#40838D] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-[#245B63] dark:text-[#388B96] bg-[#E8F1F1] dark:bg-[#19383E] px-2.5 py-0.5 rounded-full border border-[#CDE0E2] dark:border-[#28373D]">
                3 مراحل ثانوية
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">إجمالي الشعب والفصول</span>
            <div className="text-3xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] font-mono mt-1 mb-2">
              {isClassesLoading ? (
                <span className="text-sm font-normal text-[#89949A] dark:text-[#6E7F87] inline-flex items-center gap-1.5">
                  <Spinner size="xs" /> جاري التحميل...
                </span>
              ) : (
                <span>{classes.length} <span className="text-sm font-bold text-[#5F6B73] dark:text-[#9BAAB1]">شعبة</span></span>
              )}
            </div>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed">
              استعراض الشعب الدراسية الـ 30، توزيع بطاقات الاستئذان، وتعيين عرفاء ونواب الفصول.
            </p>
          </div>

          <div className="pt-4 mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#245B63] dark:text-[#388B96] group-hover:text-[#174349] dark:group-hover:text-[#52B4C2]">
            <span>الانتقال لإدارة الشعب</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Manage Attendance */}
        <div
          onClick={() => navigate('/admin/attendance')}
          className="group bg-white dark:bg-[#182226] p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#245B63] to-[#40838D] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-[#28559A] dark:text-[#60A5FA] bg-[#EAF2FF] dark:bg-[#13273D] px-2.5 py-0.5 rounded-full border border-[#C3D9FF] dark:border-[#1E3A5F]">
                رصد فوري
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">إدارة ورصد الحضور</span>
            <div className="text-xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] mt-2 mb-2">
              تسجيل ومتابعة الغياب
            </div>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed">
              شاشة الرصد التفاعلي لجميع الحصص (7 حصص الأحد-الثلاثاء، 6 الأربعاء والخميس) وكشف الغائبين.
            </p>
          </div>

          <div className="pt-4 mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#245B63] dark:text-[#388B96] group-hover:text-[#174349] dark:group-hover:text-[#52B4C2]">
            <span>فتح شاشة إدارة الحضور</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Download Weekly Attendance by Grades */}
        <div
          onClick={() => navigate('/admin/weekly-preparation')}
          className="group bg-white dark:bg-[#182226] p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#176B3A] dark:hover:border-[#4ADE80] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#176B3A] to-[#259754] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-[#176B3A] dark:text-[#4ADE80] bg-[#E8F5EC] dark:bg-[#122B1E] px-2.5 py-0.5 rounded-full border border-[#B7DEC5] dark:border-[#1B4D32]">
                مصنف Excel (3 مراحل)
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">التحضير الأسبوعي للمراحل</span>
            <div className="text-xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] mt-2 mb-2">
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
              icon={isExportingGrades ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
              onClick={handleDownloadGradesWeekly}
              disabled={isExportingGrades}
              className="w-full bg-[#176B3A] hover:bg-[#135830] dark:bg-[#1E7D45] dark:hover:bg-[#176B3A] border-[#135830] dark:border-[#1E7D45] text-xs font-bold shadow-xs justify-center"
            >
              <span>{isExportingGrades ? 'جاري التحميل والتصدير...' : 'اضغط لتنزيل ملف Excel للمراحل'}</span>
            </Button>
          </div>

          <div className="pt-4 mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#176B3A] dark:text-[#4ADE80] group-hover:text-[#135830] dark:group-hover:text-[#6EE7B7]">
            <span>عرض صفحة تحضير المراحل</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 5: Weekly Attendance by Per Class */}
        <div
          onClick={() => navigate('/admin/monthly-preparation')}
          className="group bg-white dark:bg-[#182226] p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] hover:border-[#245B63] dark:hover:border-[#388B96] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#245B63] to-[#40838D] opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <CalendarRange className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-[#855500] dark:text-[#FACC15] bg-[#FFF4DA] dark:bg-[#332712] px-2.5 py-0.5 rounded-full border border-[#EDD38C] dark:border-[#594218]">
                كشف الشعبة (5 أسابيع)
              </span>
            </div>

            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block">التحضير الأسبوعي للشعبة</span>
            <div className="text-xl font-extrabold text-[#17252B] dark:text-[#F0F4F6] mt-2 mb-2">
              التحضير الأسبوعي حسب الشعب
            </div>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed">
              استعراض وطباعة وتصدير سجل التحضير الأسبوعي والتراكمي لـ 5 أسابيع متتالية لكل شعبة مستقلة بنمط الكشف المعتمد.
            </p>
          </div>

          <div className="pt-4 mt-5 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between text-xs font-bold text-[#245B63] dark:text-[#388B96] group-hover:text-[#174349] dark:group-hover:text-[#52B4C2]">
            <span>الانتقال لتحضير الشعبة</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
