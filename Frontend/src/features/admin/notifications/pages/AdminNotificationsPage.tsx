import { useNotifications } from '../../../notifications';
import { Bell, CheckCheck, Clock, Check } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';

export function AdminNotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">مركز التنبيهات والإشعارات</h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            سجل التنبيهات الإدارية، طلبات بطاقات الاستئذان، وتحديثات حضور الفصول
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="w-4 h-4 text-[#245B63]" />}
            onClick={markAllAsRead}
          >
            تحديد الكل كمقروء ({unreadCount})
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden divide-y divide-[#EEF2F3]">
        {notifications.length === 0 ? (
          <div className="p-16 text-center">
            <Bell className="w-8 h-8 text-[#89949A]/50 mx-auto mb-2" />
            <p className="text-xs text-[#89949A] font-medium">لا توجد إشعارات مسجلة حالياً</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                n.read ? 'bg-white hover:bg-[#F9FBFC]' : 'bg-[#E8F1F1]/30 hover:bg-[#E8F1F1]/50 border-r-3 border-r-[#245B63]'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs ${n.read ? 'font-semibold text-[#17252B]' : 'font-bold text-[#245B63]'}`}>
                    {n.title}
                  </h4>
                  {!n.read && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#245B63] text-white font-bold leading-none shrink-0">
                      جديد
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5F6B73] leading-relaxed max-w-2xl">{n.message}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#89949A] font-mono pt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{n.timestamp}</span>
                </div>
              </div>

              {!n.read && (
                <button
                  type="button"
                  onClick={() => markAsRead(n.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#245B63] bg-white border border-[#245B63]/20 hover:bg-[#245B63] hover:text-white transition-all cursor-pointer shrink-0 shadow-2xs"
                  title="تعليم كمقروء"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>قراءة</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

