import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../features/auth';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { filterClassesForClerk } from '../../../../shared/utils/clerkAccess';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import {
  Building2,
  GraduationCap,
  CalendarCheck,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export function ClerkDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const schoolCode = user?.schoolCode;

  // Fetch school classes
  const { data: rawClasses = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['clerk_school_classes', schoolCode],
    queryFn: async () => {
      if (!schoolCode) return await schoolDataService.getClasses();
      return await schoolDataService.getClassesBySchool(schoolCode);
    },
    staleTime: 1000 * 60 * 5,
  });

  const classes = useMemo(() => filterClassesForClerk(rawClasses, user?.access), [rawClasses, user?.access]);

  // Fetch total students count
  const { data: totalStudents = 0, isLoading: isLoadingCount } = useQuery({
    queryKey: ['clerk_school_students_count', schoolCode, user?.access],
    queryFn: async () => {
      if (!schoolCode) return await schoolDataService.getStudentsCount();
      const paged = await schoolDataService.getStudentsBySchoolPaged(schoolCode, {
        pageNumber: 1,
        pageSize: 1,
        access: user?.access,
      });
      return paged.totalCount ?? (paged as any).TotalCount ?? 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = isLoadingClasses || isLoadingCount;

  if (isLoading) {
    return <MuwathibLoading message="جاري تجهيز لوحة تحكم مسجّل الحضور..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-[#122B23] to-[#1E4638] text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/15 text-[#A3E2B8] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>مسجّل حضور مدرسي معتمد • {user?.access || 'جميع الشعب'}</span>
              </span>
              <span className="text-xs text-white/80">
                {user?.schoolName || 'مدرسة مواظب'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              أهلاً بك، {user?.fullName || user?.username}
            </h1>
            <p className="text-sm text-white/80 mt-1 max-w-xl">
              يمكنك من هذه اللوحة رصد الحضور والغياب لجميع الفصول والشعب وإدارة بيانات الطلاب والقيد في المدرسة.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              className="w-full sm:w-auto bg-[#25855A] hover:bg-[#1D6A48] text-white border-none shadow-sm"
              onClick={() => navigate('/clerk/attendance')}
            >
              <CalendarCheck className="w-4 h-4 ml-1.5" />
              <span>بدء رصد الحضور</span>
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => navigate('/clerk/students?add=true')}
            >
              <UserPlus className="w-4 h-4 ml-1.5" />
              <span>إضافة طالب</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Classes */}
        <div className="bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs hover:border-[#1F7A8C] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1]">
              إجمالي الشعب الدراسية
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#E8F1F3] dark:bg-[#1C353D] text-[#1F7A8C] dark:text-[#68D8D6] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-[#17252B] dark:text-[#F0F4F6]">
              {classes.length}
            </span>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mr-1.5">شعبة دراسية</span>
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs hover:border-[#25855A] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1]">
              إجمالي طلاب المدرسة
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#EAF5EF] dark:bg-[#163828] text-[#25855A] dark:text-[#75D39B] flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-[#17252B] dark:text-[#F0F4F6]">
              {totalStudents}
            </span>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mr-1.5">طالب مسجل</span>
          </div>
        </div>

        {/* Permissions Scope */}
        <div className="bg-white dark:bg-[#182226] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1]">
              صلاحية الوصول الممنوحة
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#F4F8F6] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#A3E2B8] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-bold text-[#0B5D43] dark:text-[#A3E2B8]">
              كامل شعب المدرسة
            </span>
            <p className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5">
              رصد الحضور وتحديث بيانات الطلاب
            </p>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#17252B] dark:text-[#F0F4F6]">
              فصول وشعب المدرسة
            </h2>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5">
              حدد الشعبة لرصد حضورها أو تعديل سجلاتها
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/clerk/attendance')}
            className="text-xs"
          >
            <span>شاشة الرصد الشاملة</span>
            <ArrowRight className="w-3.5 h-3.5 mr-1" />
          </Button>
        </div>

        {classes.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
            لا توجد شعب دراسية مسجلة حالياً لهذه المدرسة.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {classes.map((c) => (
              <div
                key={c.classId}
                className="p-3.5 rounded-lg border border-[#EEF2F3] dark:border-[#28373D] hover:border-[#25855A] hover:bg-[#F9FCFA] dark:hover:bg-[#1A3326] transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#EAF5EF] dark:bg-[#163828] text-[#25855A] dark:text-[#75D39B] flex items-center justify-center font-bold text-sm">
                    {c.classNumber}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#17252B] dark:text-[#F0F4F6]">
                      شعبة {c.classNumber}
                    </div>
                    <div className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1]">
                      متاحة للرصد
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs py-1 px-2.5 bg-[#0B5D43] hover:bg-[#084733] text-white"
                  onClick={() => navigate(`/clerk/attendance?classId=${c.classId}`)}
                >
                  <span>رصد</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClerkDashboardPage;
