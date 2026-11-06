import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  QuickAttendancePanel,
  AttendanceWeekSelector,
  useAttendanceMatrix,
} from '../../../attendance';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import { PrintClassNumberModal } from '../../components/PrintClassNumberModal';
import {
  Users,
  CreditCard,
  CalendarCheck,
  History,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  UserCheck,
  ArrowDown,
  Printer,
} from 'lucide-react';

export function RepresentativeDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const classId = user?.classId || 105;
  const isMainRep = user?.role === 'Representative';
  const className = user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'شعبة الفصل');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  // Calculate current school day in Saudi Arabia (Sunday = 1 ... Thursday = 5)
  const getInitialDay = () => {
    const jsDay = new Date().getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (jsDay >= 0 && jsDay <= 4) {
      return jsDay + 1;
    }
    return 1; // Default to Sunday on weekends
  };

  const [selectedDay, setSelectedDay] = useState<number>(getInitialDay);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  // Fetch attendance weeks
  const { data: weeks = [], isLoading: isWeeksLoading } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const activeWeek = useMemo(() => {
    if (!weeks.length) return undefined;
    const now = new Date();
    const current = weeks.find((w) => {
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    });
    return current || weeks[0];
  }, [weeks]);

  const effectiveWeekId = selectedWeekId ?? (activeWeek?.attendanceWeekId || 1);
  const currentWeek = weeks.find((w) => w.attendanceWeekId === effectiveWeekId) || activeWeek;

  // Use real attendance matrix hook for representative's class
  const {
    enrollments,
    records,
    isLoading: isMatrixLoading,
    isSaving,
    saveSlot,
  } = useAttendanceMatrix(classId, effectiveWeekId);

  // Class details & card requests queries
  const { data: classItem } = useQuery({
    queryKey: ['class_details', classId],
    queryFn: () => schoolDataService.getClassById(classId),
    enabled: classId > 0,
  });

  const { data: cardRequests = [] } = useQuery({
    queryKey: ['card_requests'],
    queryFn: () => schoolDataService.getCardRequests(),
  });

  const myRequests = cardRequests.filter((r) => r.representativeUsername === user?.username);
  const isLoading = isWeeksLoading || isMatrixLoading;

  const scrollToAttendance = () => {
    document.getElementById('attendance-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Print Class Number Modal */}
      <PrintClassNumberModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Top Welcome Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#DCE3E6] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-xl font-bold text-[#17252B]">
              مرحباً بك، {user?.fullName || user?.username}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#E8F1F1] text-[#245B63] font-bold border border-[#CDE0E2]">
              {isMainRep ? 'عريف الصف الأساسي' : 'نائب عريف الصف'}
            </span>
          </div>
          <p className="text-xs text-[#5F6B73]">
            لوحة إدارة ومتابعة حضور طلاب <strong className="text-[#17252B] font-bold">{className}</strong> للعام الدراسي 1446-1447هـ
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => setIsPrintModalOpen(true)}
            className="font-bold text-xs"
          >
            طباعة لافتة الشعبة
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<ArrowDown className="w-4 h-4" />}
            onClick={scrollToAttendance}
            className="font-bold shadow-xs"
          >
            <span>رصد حضور الحصة</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Class Students */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs flex items-center justify-between select-none">
          <div>
            <span className="text-xs text-[#5F6B73] font-medium block">طلاب الشعبة المقيدون</span>
            <span className="text-2xl font-bold text-[#17252B] font-mono mt-1 block">
              {enrollments.length} <span className="text-xs font-normal text-[#5F6B73]">طالباً</span>
            </span>
            <span className="text-[11px] text-[#176B3A] font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>القيد نشط ومكتمل</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center border border-[#D2E4E6]/50">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Bathroom Permission Cards Remaining */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs flex items-center justify-between select-none">
          <div>
            <span className="text-xs text-[#5F6B73] font-medium block">بطاقات استئذان الشعبة</span>
            <span className="text-2xl font-bold text-[#855500] font-mono mt-1 block">
              {classItem?.totalCards || 3}{' '}
              <span className="text-xs font-normal text-[#5F6B73]">بطاقات</span>
            </span>
            <span className="text-[11px] text-[#855500] font-medium mt-0.5 block">
              العهدة المعتمدة في الفصل
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FFF4DA] text-[#855500] flex items-center justify-center border border-[#EDD38C]/50">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* My Requests */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs flex items-center justify-between select-none">
          <div>
            <span className="text-xs text-[#5F6B73] font-medium block">طلبات البطاقات المقدمة</span>
            <span className="text-2xl font-bold text-[#28559A] font-mono mt-1 block">
              {myRequests.length}
            </span>
            <span className="text-[11px] text-[#5F6B73] font-medium mt-0.5 block font-mono">
              {myRequests.filter((r) => r.status === 'Pending').length} قيد مراجعة الإدارة
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#EAF2FF] text-[#28559A] flex items-center justify-center border border-[#C3D9FF]/50">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Attendance Registration Workspace */}
      <div id="attendance-workspace" className="space-y-4 pt-2">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#245B63] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#17252B]">
                  رصد الحضور اليومي للشعبة
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#E8F1F1] text-[#245B63] font-bold border border-[#CDE0E2]">
                  {user?.classNumber || `شعبة ${classId}`}
                </span>
              </div>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                التحضير السريع للحصص الدراسية وحفظ الغياب مباشرة بدون الحاجة للتنقل
              </p>
            </div>
          </div>

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
              onClick={() => navigate('/representative/attendance-history')}
              className="text-xs font-semibold whitespace-nowrap self-stretch sm:self-end sm:mb-0.5"
            >
              <span>السجل الأسبوعي الكامل</span>
            </Button>
          </div>
        </div>

        {/* Focused Quick Attendance Workflow */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-[#DCE3E6] p-8 shadow-xs">
            <LoadingState message="جاري تجهيز قائمة طلاب الشعبة وسجل الحضور..." />
          </div>
        ) : (
          <QuickAttendancePanel
            classNameTitle={user?.classNumber || `شعبة ${classId}`}
            weekNumber={currentWeek?.weekNumber || 1}
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

      {/* Quick Navigation Shortcuts */}
      <div className="pt-2">
        <h3 className="text-xs font-bold text-[#5F6B73] mb-3 uppercase tracking-wider">
          روابط ومهام سريعة
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/representative/attendance-history')}
            className="bg-white p-5 rounded-xl border border-[#DCE3E6] hover:border-[#245B63] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F7F8] text-[#17252B] flex items-center justify-center font-bold">
                    <History className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-[#17252B] group-hover:text-[#245B63] transition-colors">
                    سجل الحضور الأسبوعي
                  </h4>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#89949A] group-hover:text-[#245B63] transition-transform group-hover:-translate-x-0.5" />
              </div>
              <p className="text-xs text-[#5F6B73] leading-relaxed">
                استعراض جدول الحضور الكامل لجميع الأيام والحصص السبع ومراجعة سجلات الغياب السابقة.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEF2F3] flex items-center gap-1.5 text-[11px] text-[#5F6B73]">
              <span>مصفوفة 33 حصة أسبوعية</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/representative/students')}
            className="bg-white p-5 rounded-xl border border-[#DCE3E6] hover:border-[#245B63] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F7F8] text-[#17252B] flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-[#17252B] group-hover:text-[#245B63] transition-colors">
                    قائمة طلاب الشعبة
                  </h4>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#89949A] group-hover:text-[#245B63] transition-transform group-hover:-translate-x-0.5" />
              </div>
              <p className="text-xs text-[#5F6B73] leading-relaxed">
                عرض الطلاب المقيدين في الشعبة وتعديل بياناتهم والتحقق من الهويات الوطنية.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEF2F3] flex items-center gap-1.5 text-[11px] text-[#5F6B73]">
              <span>إجمالي {enrollments.length} طالباً</span>
            </div>
          </div>

          <div
            onClick={() => navigate(isMainRep ? '/representative/deputy' : '/representative/card-requests')}
            className="bg-white p-5 rounded-xl border border-[#DCE3E6] hover:border-[#245B63] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F7F8] text-[#17252B] flex items-center justify-center font-bold">
                    {isMainRep ? <UserCheck className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                  <h4 className="text-sm font-bold text-[#17252B] group-hover:text-[#245B63] transition-colors">
                    {isMainRep ? 'إدارة نائب العريف' : 'طلب بطاقة استئذان'}
                  </h4>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#89949A] group-hover:text-[#245B63] transition-transform group-hover:-translate-x-0.5" />
              </div>
              <p className="text-xs text-[#5F6B73] leading-relaxed">
                {isMainRep
                  ? 'تعيين نائب العريف ومنحه بيانات الدخول لمساندة رصد الحضور عند غياب العريف.'
                  : 'رفع طلب رسمي لإدارة المدرسة لتوفير بطاقات استئذان إضافية للفصل.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EEF2F3] flex items-center gap-1.5 text-[11px] text-[#5F6B73]">
              <span>{isMainRep ? 'صلاحية العريف الأساسي' : 'متابعة حالة الطلبات'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RepresentativeDashboardPage;
