import { SCHOOL_DAYS } from '../types';

export function formatArabicDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return String(dateStr);

  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatArabicDateShort(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return String(dateStr);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function getArabicDayName(dayNumber: number): string {
  const found = SCHOOL_DAYS.find((d) => d.dayNumber === dayNumber);
  return found ? found.nameAr : `اليوم ${dayNumber}`;
}

export function calculateDateForDay(startDateStr: string, dayNumber: number): string {
  if (!startDateStr) return '';
  const base = new Date(startDateStr);
  if (isNaN(base.getTime())) return startDateStr;

  // dayNumber: 1 is Sunday (day 0 offset from startDate), 2 is Monday (offset 1)...
  const offset = Math.max(0, dayNumber - 1);
  const target = new Date(base);
  target.setDate(base.getDate() + offset);

  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

