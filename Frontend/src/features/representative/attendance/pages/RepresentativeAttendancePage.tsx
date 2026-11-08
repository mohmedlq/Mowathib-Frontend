import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../auth';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  QuickAttendancePanel,
  AttendanceWeekSelector,
  useAttendanceMatrix,
} from '../../../attendance';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import { resolveDefaultAttendanceWeek } from '../../../../shared/utils/date';
import { CalendarCheck, History, ArrowRight } from 'lucide-react';

export function RepresentativeAttendancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = user?.classId||0;
  const className = user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : `شعبة ${classId}`);

  // Calculate current school day in Saudi Arabia (Sunday = 1 ... Thursday = 5)
  const getInitialDay = () => {
    const jsDay = new Date().getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (jsDay >= 0 && jsDay <= 4) {
      return jsDay + 1;
    }
    return 1; // Default to Sunday on weekends
  };

  const paramDay = searchParams.get('day') ? Number(searchParams.get('day')) : null;
  const paramPeriod = searchParams.get('period') ? Number(searchParams.get('period')) : null;

  const [selectedDay, setSelectedDay] = useState<number>(() =>
    paramDay && paramDay >= 1 && paramDay <= 5 ? paramDay : getInitialDay()
  );
  const [selectedPeriod, setSelectedPeriod] = useState<number>(() =>
    paramPeriod && paramPeriod >= 1 && paramPeriod <= 7 ? paramPeriod : 1
  );
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  // Fetch attendance weeks with long staleTime
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const activeWeek = useMemo(() => {
    return resolveDefaultAttendanceWeek(weeks);
  }, [weeks]);

  // Use selected week or automatically resolved active week - NEVER an arbitrary week fallback
  const effectiveWeekId = selectedWeekId ?? activeWeek?.attendanceWeekId;

  // Use the attendance matrix hook
  const {
    enrollments,
    records,
    isLoading,
    isSaving,
    saveSlot,
  } = useAttendanceMatrix(classId, effectiveWeekId);

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
                رصد الحضور اليومي للحصص
              </h1>
              <span className="text-xs px-3 py-1 rounded-full bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] font-bold border border-[#D8E5DF] dark:border-[#1E4638]">
                {className}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#718A80] dark:text-[#A3C7B9] mt-1">
              رصد الحضور والغياب والانقطاع لكل حصة دراسية بدقة وحفظ النتائج في قاعدة البيانات المدرسية فورياً
            </p>
          </div>
        </div>

        {/* Week Selector & Shortcuts */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-64">
            <AttendanceWeekSelector
              weeks={weeks}
              selectedWeekId={effectiveWeekId}
              onSelectWeek={setSelectedWeekId}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<History className="w-4 h-4" />}
            onClick={() => navigate('/representative/weekly-attendance')}
            className="text-xs font-bold whitespace-nowrap self-stretch sm:self-end"
          >
            <span>الكشف الأسبوعي</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<ArrowRight className="w-4 h-4 ml-1" />}
            onClick={() => navigate('/representative/dashboard')}
            className="text-xs font-bold whitespace-nowrap self-stretch sm:self-end"
          >
            <span>لوحة المتابعة</span>
          </Button>
        </div>
      </div>

      {/* Main Quick Attendance Panel */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#122B23] rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] p-12 shadow-xs">
          <MuwathibLoading message="جاري تجهيز قائمة طلاب الشعبة وسجل حضور الحصص..." />
        </div>
      ) : (
        <QuickAttendancePanel
          classNameTitle={className}
          weekNumber={activeWeek?.weekNumber || 1}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
          enrollments={enrollments}
          records={records}
          onSaveSlot={async (day, period, changes) => {
            await saveSlot(day, period, changes);
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

export default RepresentativeAttendancePage;
