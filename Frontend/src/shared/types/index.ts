// Core Domain Types & Enums for Mowathib

export type AttendanceStatus = 'Present' | 'Absent' | 'Discontinued' | 'Unmarked';

export type BackendAttendanceStatus = 'Present' | 'Absent' | 'Discontinued';

export const ATTENDANCE_STATUS_ARABIC: Record<AttendanceStatus, string> = {
  Present: 'حاضر',
  Absent: 'غائب',
  Discontinued: 'منقطع',
  Unmarked: 'غير محدد',
};

export type CardRequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected';
export const CARD_REQUEST_STATUS_ARABIC: Record<CardRequestStatus, string> = {
  Pending: 'قيد الانتظار',
  Approved: 'تمت الموافقة',
  Rejected: 'مرفوض',
};

export type UserRole = 'Admin' | 'Representative' | 'Deputy';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  fullName?: string;
  classId?: number;
  classNumber?: number;
  className?: string;
  enrollmentId?: number;
  mustChangePassword?: boolean;
}

export interface AcademicYear {
  academicYearId: number;
  yearName: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string;
  isActive: boolean;
}

export interface ClassItem {
  classId: number;
  classNumber: number;
  className: number | string;
  academicYearId: number;
  totalCards: number;
}

export interface Student {
  studentId: number;
  firstName: string;
  secondName: string;
  thirdName: string;
  lastName: string;
  fullName: string;
  nationalId: string;
}

export interface ClassEnrollment {
  enrollmentId: number;
  studentId: number;
  classId: number;
  academicYearId: number;
  isRepresentative: boolean;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  studentName?: string;
  classNumber?: number;
  className?: number | string;
  academicYearName?: string;
  student?: Student;
}

export interface AttendanceWeek {
  attendanceWeekId: number;
  academicYearId: number;
  weekNumber: number;
  startDate: string; // Sunday
  endDate: string; // Thursday
}

export interface AttendanceRecord {
  attendanceRecordId: number;
  enrollmentId: number;
  attendanceWeekId: number;
  dayNumber: number; // 1 = Sunday, 2 = Monday, 3 = Tuesday, 4 = Wednesday, 5 = Thursday
  periodNumber: number; // 1 to 7
  status: BackendAttendanceStatus;
  studentName?: string;
}

export interface Representative {
  representativeId: number;
  enrollmentId: number;
  username: string;
  phoneNumber: string;
  role: string; // "Representative" or "Deputy"
  isActive: boolean;
  mustChangePassword: boolean;
  studentName?: string;
  classId?: number;
  classNumber?: number;
  className?: number | string;
}

export interface CardRequest {
  requestId: number;
  enrollmentId: number;
  representativeId: number;
  reason: string;
  cardType: string;
  status: CardRequestStatus;
  statusName?: string;
  studentName?: string;
  representativeUsername?: string;
  classNumber?: number;
  className?: number | string;
  createdAt?: string;
}

export interface SchoolDay {
  dayNumber: number; // 1 to 5
  nameAr: string;
  nameEn: string;
}

export const SCHOOL_DAYS: SchoolDay[] = [
  { dayNumber: 1, nameAr: 'الأحد', nameEn: 'Sunday' },
  { dayNumber: 2, nameAr: 'الاثنين', nameEn: 'Monday' },
  { dayNumber: 3, nameAr: 'الثلاثاء', nameEn: 'Tuesday' },
  { dayNumber: 4, nameAr: 'الأربعاء', nameEn: 'Wednesday' },
  { dayNumber: 5, nameAr: 'الخميس', nameEn: 'Thursday' },
];

export const SCHOOL_PERIODS = [1, 2, 3, 4, 5, 6, 7] as const;
export type SchoolPeriod = (typeof SCHOOL_PERIODS)[number];

export const PERIODS_PER_DAY: Record<number, number> = {
  1: 7, // Sunday (الأحد)
  2: 7, // Monday (الاثنين)
  3: 7, // Tuesday (الثلاثاء)
  4: 6, // Wednesday (الأربعاء)
  5: 6, // Thursday (الخميس)
};

export const TOTAL_WEEKLY_PERIODS = 33; // 7 + 7 + 7 + 6 + 6

export function getPeriodsCountForDay(dayNumber: number): number {
  return PERIODS_PER_DAY[dayNumber] ?? 7;
}

export function getPeriodsForDay(dayNumber: number): number[] {
  const count = getPeriodsCountForDay(dayNumber);
  return Array.from({ length: count }, (_, i) => i + 1);
}

export function isValidPeriodForDay(dayNumber: number, periodNumber: number): boolean {
  const max = getPeriodsCountForDay(dayNumber);
  return periodNumber >= 1 && periodNumber <= max;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: string;
  read: boolean;
  targetRole?: UserRole;
  link?: string;
}

export interface WeeklyAttendanceSummary {
  classId: number;
  attendanceWeekId: number;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  discontinuedCount: number;
  attendanceRatePercentage: number;
}

