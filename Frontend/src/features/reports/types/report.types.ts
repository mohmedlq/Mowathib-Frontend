import type { AttendanceStatus, SchoolPeriod } from '../../../shared/types';

export type ReportPeriodType = 'daily' | 'weekly' | 'monthly';
export type ReportKind = 'attendance' | 'absence';

export interface ReportFilterOptions {
  academicYearId: number;
  periodType: ReportPeriodType; // daily, weekly, monthly
  reportKind: ReportKind; // attendance, absence
  classId: number; // 0 = all classes
  weekId: number;
  dayNumber: number; // 1 to 5
  month: string; // YYYY-MM
  searchQuery: string;
}

export interface DailyAttendanceRow {
  enrollmentId: number;
  nationalId: string;
  studentName: string;
  className: number;
  periods: Record<number, AttendanceStatus>;
  presentCount: number;
  absentCount: number;
  discontinuedCount: number;
  unmarkedCount: number;
}

export interface DailyAbsenceRecord {
  enrollmentId: number;
  nationalId: string;
  studentName: string;
  className: number;
  date: string;
  dayName: string;
  periodNumber: SchoolPeriod;
}

export interface MonthlyStudentSummaryRow {
  enrollmentId: number;
  nationalId: string;
  studentName: string;
  className: number;
  totalExpected: number;
  presentCount: number;
  absentCount: number;
  discontinuedCount: number;
  unmarkedCount: number;
  attendanceRate: number; // percentage (0 - 100)
}

export interface MonthlyDetailedAbsenceRow {
  enrollmentId: number;
  nationalId: string;
  studentName: string;
  className: number;
  date: string;
  dayName: string;
  periodNumber: number;
}

