import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Bell, Check, CheckCheck, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-[#5F6B73] hover:text-[#17252B] hover:bg-[#EEF2F3] transition-colors cursor-pointer select-none"
        title="التنبيهات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#A61B1B] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-[#DCE3E6] overflow-hidden z-50 text-right animate-in fade-in duration-100">
          <div className="p-3.5 border-b border-[#EEF2F3] flex items-center justify-between bg-[#F5F7F8]">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#17252B]">الإشعارات والتنبيهات</h4>
              {unreadCount > 0 && (
                <span className="bg-[#245B63] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} جديد
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-[#245B63] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#EEF2F3]">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#89949A]">لا توجد إشعارات حالياً</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition-colors ${n.read ? 'bg-white' : 'bg-[#E8F1F1]/30 hover:bg-[#E8F1F1]/50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className={`text-xs ${n.read ? 'font-medium text-[#17252B]' : 'font-bold text-[#245B63]'}`}>
                      {n.title}
                    </h5>
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-[#89949A] hover:text-[#245B63] p-0.5 cursor-pointer"
                        title="تعليم كمقروء"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#5F6B73] mt-1 leading-relaxed">{n.message}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#89949A]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {n.timestamp}
                    </span>
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={() => {
                          markAsRead(n.id);
                          setIsOpen(false);
                        }}
                        className="text-[#245B63] font-semibold hover:underline"
                      >
                        عرض التفاصيل
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

