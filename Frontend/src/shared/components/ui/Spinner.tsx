import React from 'react';
import { cn } from '../../utils/cn';
import faviconSvg from '../../../assets/Logos/Favicon.svg';

export interface MuwathibSpinnerProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Muwathib Brand Inline Spinner
 * Elegant rotating emerald loader with smooth CSS animation.
 */
export function Spinner({ className, size = 'md' }: MuwathibSpinnerProps) {
  const sizes = {
    xs: 'w-3.5 h-3.5 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-[2.5px]',
    lg: 'w-8 h-8 border-3',
    xl: 'w-10 h-10 border-3',
  };

  return (
    <div
      className={cn(
        'inline-block rounded-full animate-spin shrink-0',
        'border-[#0B5D43]/20 border-t-[#0B5D43] dark:border-[#3E9B78]/25 dark:border-t-[#3E9B78]',
        sizes[size],
        className
      )}
      role="status"
      aria-label="جاري التحميل"
    />
  );
}

export const MuwathibSpinner = Spinner;

export interface MuwathibLoadingProps {
  message?: string;
  submessage?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
}

/**
 * Official "Muwathib Loading" (شاشة وحالة تحميل مواظب الرسمية)
 * Features the Muwazib square emblem, glowing aura, emerald spinner orbit, and branded tagline.
 */
export function MuwathibLoading({
  message = 'جاري تحميل البيانات...',
  submessage = 'نظام مواظب — حضور منظم.. لبيئة تعليمية أفضل',
  className,
  size = 'md',
}: MuwathibLoadingProps) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    fullscreen: 'w-20 h-20',
  };

  const containerPadding = {
    sm: 'p-6',
    md: 'p-10',
    lg: 'p-16',
    fullscreen: 'min-h-[60vh] p-8',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center select-none animate-in fade-in zoom-in-95 duration-300',
        containerPadding[size],
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Branded Emblem with Pulsing Aura & Spinning Orbit */}
      <div className="relative flex items-center justify-center mb-5">
        {/* Soft Glowing Aura */}
        <div className="absolute -inset-3 rounded-2xl bg-[#0B5D43]/15 dark:bg-[#3E9B78]/20 blur-md animate-pulse" />

        {/* Orbit Ring */}
        <div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-[#0B5D43]/30 dark:border-[#3E9B78]/40 animate-[spin_8s_linear_infinite]" />

        {/* Muwazib Favicon App Icon */}
        <img
          src={faviconSvg}
          alt="أيقونة مواظب"
          className={cn(
            'relative z-10 rounded-xl shadow-md object-contain transition-transform duration-300 hover:scale-105',
            iconSizes[size]
          )}
        />
      </div>

      {/* Primary Message */}
      <p className="text-sm sm:text-base font-bold text-[#122B23] dark:text-[#F4F8F6] tracking-tight">
        {message}
      </p>

      {/* Dynamic Indeterminate Progress Indicator */}
      <div className="w-36 sm:w-44 h-1.5 bg-[#D8E5DF] dark:bg-[#1E4638] rounded-full overflow-hidden mt-3 mb-2">
        <div className="h-full bg-gradient-to-r from-[#0B5D43] via-[#3E9B78] to-[#0B5D43] rounded-full animate-indeterminate" />
      </div>

      {/* Submessage / Tagline */}
      {submessage && (
        <span className="text-[11px] font-medium text-[#718A80] dark:text-[#A3C7B9]">
          {submessage}
        </span>
      )}
    </div>
  );
}

/**
 * Universal alias for backward compatibility across all existing pages.
 */
export const LoadingState = MuwathibLoading;

/**
 * Branded Table Loading row for clean presentation inside tables.
 */
export function MuwathibTableLoading({
  colSpan = 6,
  message = 'جاري جلب وتحديث سجلات الجدول...',
  className,
}: {
  colSpan?: number;
  message?: string;
  className?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('p-8 text-center', className)}>
        <MuwathibLoading message={message} size="sm" />
      </td>
    </tr>
  );
}

export function EmptyState({
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على أي عناصر مطابقة في الوقت الحالي.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-[#122B23] rounded-xl border border-[#D8E5DF] dark:border-[#1E4638] my-4 shadow-xs transition-colors">
      <div className="w-12 h-12 rounded-2xl bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center mb-3">
        <img src={faviconSvg} alt="" className="w-6 h-6 opacity-80" />
      </div>
      <h4 className="text-base font-bold text-[#122B23] dark:text-[#F4F8F6] mb-1">{title}</h4>
      <p className="text-xs text-[#718A80] dark:text-[#A3C7B9] max-w-sm mb-4 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

export default MuwathibLoading;
