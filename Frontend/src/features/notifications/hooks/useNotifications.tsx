import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { NotificationItem } from '../../../shared/types';
import type { NotificationsContextType } from '../types/notification.types';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../../auth';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'danger' | 'info' | 'warning';
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('mowathib_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('mowathib_notifications', JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  // Toast trigger
  const showToast = useCallback((message: string, type: 'success' | 'danger' | 'info' | 'warning' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // SignalR real-time client connection
  useEffect(() => {
    if (!user) return;

    let connection: signalR.HubConnection | null = null;
    const hubUrl = import.meta.env.VITE_HUB_URL || 'https://localhost:7273/hub/notifications';
    try {
      connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.None)
        .build();

      connection.on('ReceiveNotification', (notification: NotificationItem) => {
        setNotifications((prev) => [notification, ...prev]);
        showToast(notification.title, notification.type);
      });

      connection.start().catch(() => {
        // Fallback silently if SignalR backend is not yet mounted
      });
    } catch {
      // ignore
    }

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [user, showToast]);

  const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `n-${Date.now()}`,
      timestamp: 'الآن',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    showToast(item.title, item.type);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const roleFiltered = notifications.filter((n) => !n.targetRole || n.targetRole === user?.role);
  const unreadCount = roleFiltered.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications: roleFiltered,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        toast: { show: showToast },
      }}
    >
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg shadow-md border text-sm animate-in slide-in-from-bottom-2 duration-150 ${
              t.type === 'success'
                ? 'bg-[#E8F5EC] border-[#B7DEC5] text-[#176B3A]'
                : t.type === 'danger'
                ? 'bg-[#FDECEC] border-[#F1C3C3] text-[#A61B1B]'
                : t.type === 'warning'
                ? 'bg-[#FFF4DA] border-[#EDD38C] text-[#855500]'
                : 'bg-white border-[#DCE3E6] text-[#17252B]'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {t.type === 'danger' && <AlertCircle className="w-4 h-4 shrink-0" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
              <span className="font-medium text-xs sm:text-sm">{t.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="p-1 hover:opacity-75 transition-opacity cursor-pointer mr-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

