import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarRange, UserPlus, Users, CreditCard, ChevronLeft } from 'lucide-react';

export function QuickActionsWidget() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'رصد الحضور السريع',
      description: 'تسجيل ومتابعة حضور الحصص للشعب المدرسية',
      icon: CalendarCheck,
      path: '/admin/attendance',
      highlight: true,
    },
    {
      title: 'التقارير الرسمية والتصدير',
      description: 'استخراج تقارير الحضور والغياب بصيغة Excel',
      icon: CalendarRange,
      path: '/admin/reports',
      highlight: false,
    },
    {
      title: 'إدارة الطلاب والقيد',
      description: 'إضافة طالب وتعديل الشعب الدراسية',
      icon: UserPlus,
      path: '/admin/students',
      highlight: false,
    },
    {
      title: 'عرفاء ونواب الفصول',
      description: 'توزيع الحسابات وإعادة تعيين كلمات المرور',
      icon: Users,
      path: '/admin/representatives',
      highlight: false,
    },
    {
      title: 'طلبات بطاقات الاستئذان',
      description: 'فحص واعتماد بطاقات الاستئذان المرفوعة',
      icon: CreditCard,
      path: '/admin/card-requests',
      highlight: false,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs p-5 flex flex-col justify-between">
      <div>
        <div className="pb-3.5 border-b border-[#EEF2F3] mb-4">
          <h3 className="text-sm font-bold text-[#17252B]">إجراءات الإدارة السريعة</h3>
          <p className="text-[11px] text-[#5F6B73]">الوصول المباشر للمهام اليومية الأكثر تكراراً</p>
        </div>

        <div className="space-y-2">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.path}
                type="button"
                onClick={() => navigate(act.path)}
                className={`w-full p-2.5 rounded-lg border text-right transition-all cursor-pointer flex items-center justify-between group ${
                  act.highlight
                    ? 'bg-[#E8F1F1] border-[#CDE0E2] hover:bg-[#D8E8E9]'
                    : 'bg-[#FAFCFD] border-[#EEF2F3] hover:border-[#245B63] hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                      act.highlight
                        ? 'bg-[#245B63] text-white'
                        : 'bg-[#EEF2F3] text-[#5F6B73] group-hover:text-[#245B63] group-hover:bg-[#E8F1F1]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#17252B] block group-hover:text-[#245B63] transition-colors">
                      {act.title}
                    </span>
                    <span className="text-[10px] text-[#5F6B73] line-clamp-1">
                      {act.description}
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#89949A] group-hover:text-[#245B63] transition-transform group-hover:-translate-x-0.5 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#EEF2F3] text-[11px] text-[#5F6B73] flex items-center justify-between">
        <span>النظام متصل بالخادم</span>
        <span className="flex items-center gap-1 text-[#176B3A] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#176B3A] animate-pulse"></span>
          <span>حالة متزامنة</span>
        </span>
      </div>
    </div>
  );
}

export default QuickActionsWidget;

