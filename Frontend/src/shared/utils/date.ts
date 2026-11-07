import { SCHOOL_DAYS, DEFAULT_ATTENDANCE_WEEK, type AttendanceWeek } from '../types';

export { DEFAULT_ATTENDANCE_WEEK };

/**
 * Formats a given Date to a pure DateOnly YYYY-MM-DD string in Asia/Riyadh timezone.
 * Eliminates UTC conversion errors and locale shifts.
 */
export function getRiyadhDateOnly(dateInput: Date | string = new Date()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    const today = new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(today);
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Normalizes an API Date string (e.g. '2026-11-01T00:00:00' or '2026-11-01') into 'YYYY-MM-DD'
 */
export function normalizeDateOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0].trim();
}

/**
 * Resolves the active attendance week based on current date in Asia/Riyadh timezone.
 * Centralized, deterministic policy:
 * 1. Checks if current date falls within [startDate, endDate] (inclusive).
 * 2. If today is between school weeks (weekend Friday/Saturday),
 *    selects the upcoming week (Saturday) or the week that just ended (Friday).
 * 3. Never hardcodes arbitrary IDs or falls back to week 1 when weeks exist.
 */
export function resolveDefaultAttendanceWeek(
  weeks: AttendanceWeek[],
  currentDateInput: Date | string = new Date()
): AttendanceWeek | undefined {
  if (!weeks || weeks.length === 0) {
    return undefined;
  }

  const todayStr = getRiyadhDateOnly(currentDateInput);

  // Sort weeks by startDate ascending to ensure correct temporal ordering
  const sorted = [...weeks].sort((a, b) => {
    const aStart = normalizeDateOnly(a.startDate);
    const bStart = normalizeDateOnly(b.startDate);
    return aStart.localeCompare(bStart);
  });

  // 1. Exact match within school week range
  const exact = sorted.find((w) => {
    const start = normalizeDateOnly(w.startDate);
    const end = normalizeDateOnly(w.endDate);
    return todayStr >= start && todayStr <= end;
  });

  if (exact) {
    return exact;
  }

  // 2. Check for upcoming week (e.g. weekend preparing for next week)
  const upcoming = sorted.find((w) => {
    const start = normalizeDateOnly(w.startDate);
    return start >= todayStr;
  });

  if (upcoming) {
    return upcoming;
  }

  // 3. Fall back to the last available academic week if today is past all weeks
  return sorted[sorted.length - 1];
}

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

