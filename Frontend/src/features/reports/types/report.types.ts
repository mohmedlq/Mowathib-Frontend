import type { AttendanceStatus } from '../../../shared/types';

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
  date: string;
  dayName: string;
  status: AttendanceStatus;
  presentCount: number; // 1 if Present, else 0
  absentCount: number; // 1 if Absent, else 0
  discontinuedCount: number; // 1 if Discontinued, else 0
  unmarkedCount: number; // 1 if Unmarked, else 0
}

export interface DailyAbsenceRecord {
  enrollmentId: number;
  nationalId: string;
  studentName: string;
  className: number;
  date: string;
  dayName: string;
  status: AttendanceStatus;
}

export interface MonthlyStudentSummaryRow {
  enrollmentId: number;
  nationalId: string;
  studentName: string;
  className: number;
  totalExpected: number; // Total school days in month
  presentCount: number; // Days present
  absentCount: number; // Days absent
  discontinuedCount: number; // Days discontinued
  unmarkedCount: number; // Days unmarked
  attendanceRate: number; // Percentage (0 - 100)
}

export interface MonthlyDetailedAbsenceRow {
  enrollmentId: number;
  nationalId: string;
  studentName: string;
  className: number;
  date: string;
  dayName: string;
  status?: AttendanceStatus;
}
