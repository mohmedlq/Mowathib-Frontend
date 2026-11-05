import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  CalendarCheck,
  History,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';

export function RepresentativeDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const classId = user?.classId || 105;

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(classId),
  });

  const { data: classItem } = useQuery({
    queryKey: ['class_details', classId],
    queryFn: () => schoolDataService.getClassById(classId),
  });

  const { data: cardRequests = [] } = useQuery({
    queryKey: ['card_requests'],
    queryFn: () => schoolDataService.getCardRequests(),
  });

  const myRequests = cardRequests.filter((r) => r.representativeUsername === user?.username);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#DCE3E6] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl font-bold text-[#17252B]">
              مرحباً بك، {user?.fullName || user?.username}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#E8F1F1] text-[#245B63] font-bold border border-[#CDE0E2]">
              {user?.role.toLowerCase() === 'Representative'.toLowerCase() ? 'عريف الصف الأساسي' : 'نائب عريف الصف'}
            </span>
          </div>
          <p className="text-xs text-[#5F6B73]">
            لوحة إدارة ومتابعة حضور طلاب <strong className="text-[#17252B] font-bold">{user?.className || `شعبة ${classId}`}</strong> للعام الدراسي 1446-1447هـ
          </p>
        </div>

        {/* Primary Shortcut */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          icon={<CalendarCheck className="w-5 h-5" />}
          onClick={() => navigate('/representative/attendance')}
          className="font-bold shadow-xs self-start md:self-auto"
        >
          <span>بدء رصد حضور الحصة</span>
          <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
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

      {/* Quick Actions Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => navigate('/representative/attendance')}
          className="bg-white p-5 rounded-xl border border-[#DCE3E6] hover:border-[#245B63] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#17252B] group-hover:text-[#245B63] transition-colors">
                  تسجيل الحضور السريع
                </h3>
              </div>
              <ChevronLeft className="w-4 h-4 text-[#89949A] group-hover:text-[#245B63] transition-transform group-hover:-translate-x-0.5" />
            </div>
            <p className="text-xs text-[#5F6B73] leading-relaxed">
              رصد حضور الحصة بضغطة زر واحدة (تحضير الكل حاضر)، مع إمكانية تعديل الغياب الفردي وحفظه فورياً.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EEF2F3] flex items-center gap-1.5 text-[11px] text-[#245B63] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>سير عمل فائق السرعة معتمد</span>
          </div>
        </div>

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
                <h3 className="text-sm font-bold text-[#17252B] group-hover:text-[#245B63] transition-colors">
                  سجل الحضور الأسبوعي
                </h3>
              </div>
              <ChevronLeft className="w-4 h-4 text-[#89949A] group-hover:text-[#245B63] transition-transform group-hover:-translate-x-0.5" />
            </div>
            <p className="text-xs text-[#5F6B73] leading-relaxed">
              استعراض جدول الحضور الأسبوعي الكامل لجميع الأيام والحصص السبع ومراجعة حالات الغياب السابقة.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#EEF2F3] flex items-center gap-1.5 text-[11px] text-[#5F6B73]">
            <span>عرض المصفوفة الكاملة لـ 35 حصة أسبوعية</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RepresentativeDashboardPage;
