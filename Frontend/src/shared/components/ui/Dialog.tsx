import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Dialog({ isOpen, onClose, title, description, children, maxWidth = 'md' }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Surface */}
      <div
        className={cn(
          'relative w-full bg-white dark:bg-[#182226] rounded-xl shadow-xl border border-[#DCE3E6] dark:border-[#28373D] overflow-hidden z-10 transition-all text-right animate-in fade-in zoom-in-95 duration-150',
          maxWidths[maxWidth]
        )}
      >
        {(title || description) && (
          <div className="px-6 py-4 border-b border-[#DCE3E6] dark:border-[#28373D] flex items-start justify-between">
            <div>
              {title && <h3 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">{title}</h3>}
              {description && <p className="mt-1 text-xs text-[#5F6B73] dark:text-[#9BAAB1]">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#89949A] dark:text-[#6E7F87] hover:text-[#17252B] dark:hover:text-[#F0F4F6] hover:bg-[#EEF2F3] dark:hover:bg-[#212E33] transition-colors cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function DialogFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-6 pt-4 border-t border-[#DCE3E6] dark:border-[#28373D] flex items-center justify-end gap-3', className)} {...props}>
      {children}
    </div>
  );
}
