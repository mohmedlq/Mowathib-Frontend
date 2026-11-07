import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ToastType, ToastState, ToastContextType } from '../types/notification.types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // Toast trigger
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toast: { show: showToast },
      }}
    >
      {children}

      {/* Floating Toast Notification Container with Dark Mode support */}
      <div
        className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
        role="region"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg shadow-lg border text-sm transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-[#E8F5EC] border-[#B7DEC5] text-[#176B3A] dark:bg-[#122B1E] dark:border-[#1B4D32] dark:text-[#4ADE80]'
                : t.type === 'danger'
                ? 'bg-[#FDECEC] border-[#F1C3C3] text-[#A61B1B] dark:bg-[#331518] dark:border-[#592226] dark:text-[#F87171]'
                : t.type === 'warning'
                ? 'bg-[#FFF4DA] border-[#EDD38C] text-[#855500] dark:bg-[#332712] dark:border-[#594218] dark:text-[#FACC15]'
                : 'bg-white border-[#DCE3E6] text-[#17252B] dark:bg-[#182226] dark:border-[#28373D] dark:text-[#F0F4F6]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#176B3A] dark:text-[#4ADE80]" />}
              {t.type === 'danger' && <AlertCircle className="w-4 h-4 shrink-0 text-[#A61B1B] dark:text-[#F87171]" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-[#855500] dark:text-[#FACC15]" />}
              {t.type === 'info' && <Info className="w-4 h-4 shrink-0 text-[#245B63] dark:text-[#388B96]" />}
              <span className="font-medium text-xs sm:text-sm">{t.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="p-1 hover:opacity-75 transition-opacity cursor-pointer mr-2 rounded"
              title="إغلاق التنبيه"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Named hooks and backward-compatible aliases
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export const useNotifications = useToast;
export const NotificationsProvider = ToastProvider;
