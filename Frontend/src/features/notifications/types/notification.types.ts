export type ToastType = 'success' | 'danger' | 'info' | 'warning';

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  toast: {
    show: (message: string, type?: ToastType) => void;
  };
}

// Backwards compatibility alias
export type NotificationsContextType = ToastContextType;
