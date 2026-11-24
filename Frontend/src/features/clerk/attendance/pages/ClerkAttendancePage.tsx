import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../auth';
import { classesApi } from '../../../classes/api/classesApi';
import { attendanceWeeksApi } from '../../../attendance-weeks/api/attendanceWeeksApi';
import {
  QuickAttendancePanel,
  AttendanceClassSelector,
  useAttendanceMatrix,
} from '../../../attendance';
import { WeekSelector } from '../../../../shared/components/ui/weekselector';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { resolveDefaultAttendanceWeek } from '../../../../shared/utils/date';
import { filterClassesForClerk } from '../../../../shared/utils/clerkAccess';
import { CalendarCheck, Building2 } from 'lucide-react';

export function ClerkAttendancePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const schoolCode = user?.schoolCode;

  // Calculate current school day in Saudi Arabia (Sunday = 1 ... Thursday = 5)
  const getInitialDay = () => {
    const jsDay = new Date().getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (jsDay >= 0 && jsDay <= 4) {
      return jsDay + 1;
    }
    return 1; // Default to Sunday on weekends
  };

  const paramDay = searchParams.get('day') ? Number(searchParams.get('day')) : null;
  const paramClassId = searchParams.get('classId') ? Number(searchParams.get('classId')) : null;

  const [selectedDay, setSelectedDay] = useState<number>(() =>
    paramDay && paramDay >= 1 && paramDay <= 5 ? paramDay : getInitialDay()
  );
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  // Fetch school classes
  const { data: rawClasses = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['clerk_attendance_classes', schoolCode],
    queryFn: async () => {
      if (!schoolCode) return await classesApi.getClasses();
      return await classesApi.getClassesBySchool(schoolCode);
    },
    staleTime: 1000 * 60 * 10,
  });

  // Filter classes according to clerk's access scope
  const classes = useMemo(() => filterClassesForClerk(rawClasses, user?.access), [rawClasses, user?.access]);

  // Effective selected class
  const selectedClassId = useMemo(() => {
    if (paramClassId && classes.some((c) => c.classId === paramClassId)) {
      return paramClassId;
    }
    return classes.length > 0 ? classes[0].classId : 0;
  }, [paramClassId, classes]);

  const handleSelectClass = (newClassId: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('classId', String(newClassId));
      return next;
    });
  };

  // Fetch attendance weeks
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
  });

  const activeWeek = useMemo(() => resolveDefaultAttendanceWeek(weeks), [weeks]);
  const effectiveWeekId = selectedWeekId ?? activeWeek?.attendanceWeekId;

  // Use the attendance matrix hook
  const {
    enrollments,
    records,
    isLoading: isLoadingMatrix,
    isSaving,
    saveSlot,
  } = useAttendanceMatrix(selectedClassId, effectiveWeekId);

  const selectedClassObj = classes.find((c) => c.classId === selectedClassId);
  const currentClassName = selectedClassObj
    ? `شعبة ${selectedClassObj.classNumber}`
    : `الشعبة الدراسية`;

  if (isLoadingClasses) {
    return <MuwathibLoading message="جاري تحميل الفصول والشعب الدراسية..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Context Bar */}
      <div className="bg-white dark:bg-[#122B23] p-5 sm:p-6 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0B5D43] text-white flex items-center justify-center shrink-0 shadow-xs">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#122B23] dark:text-[#F4F8F6] tracking-tight">
                رصد الحضور والغياب (مسجّل الحضور)
              </h1>
              <span className="text-xs px-3 py-1 rounded-full bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] font-bold border border-[#D8E5DF] dark:border-[#1E4638]">
                {currentClassName}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#E1EFEA] dark:bg-[#164736] text-[#0B5D43] dark:text-[#A3E2B8] font-bold">
                نطاق الصلاحية: {user?.access || 'جميع الشعب'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#718A80] dark:text-[#A3C7B9] mt-1">
              اختر الشعبة واليوم لرصد الحضور فورياً وحفظ السجلات في قاعدة البيانات
            </p>
          </div>
        </div>

        {/* Filters: Class Selector & Week Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-60">
            <AttendanceClassSelector
              classes={classes}
              selectedClassId={selectedClassId}
              onSelectClass={handleSelectClass}
            />
          </div>

          <div className="w-full sm:w-60">
            <label className="block text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] mb-1.5 select-none">
              الأسبوع الدراسي:
            </label>
            <WeekSelector
              selectedWeekId={effectiveWeekId}
              onSelectWeek={setSelectedWeekId}
            />
          </div>
        </div>
      </div>

      {/* Main Attendance Panel */}
      {selectedClassId <= 0 ? (
        <div className="bg-white dark:bg-[#182226] p-8 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] text-center">
          <Building2 className="w-8 h-8 text-[#5F6B73] dark:text-[#9BAAB1] mx-auto mb-2" />
          <p className="text-xs font-medium text-[#5F6B73] dark:text-[#9BAAB1]">
            يرجى اختيار شعبة دراسية لبدء رصد الحضور.
          </p>
        </div>
      ) : isLoadingMatrix ? (
        <MuwathibLoading message="جاري تجهيز كشف حضور الشعبة..." />
      ) : (
        <QuickAttendancePanel
          classNameTitle={currentClassName}
          weekNumber={activeWeek?.weekNumber || 1}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          enrollments={enrollments}
          records={records}
          isSaving={isSaving}
          onSaveSlot={async (d, c, m) => {
            await saveSlot(d, c, m);
          }}
        />
      )}
    </div>
  );
}

export default ClerkAttendancePage;
