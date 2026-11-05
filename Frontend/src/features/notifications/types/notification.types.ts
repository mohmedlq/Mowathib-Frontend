import type { NotificationItem } from '../../../shared/types';

export interface NotificationsContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  toast: {
    show: (message: string, type?: 'success' | 'danger' | 'info' | 'warning') => void;
  };
}

