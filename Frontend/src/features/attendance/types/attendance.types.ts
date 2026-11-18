import type {
  AttendanceStatus,
  ClassEnrollment,
} from '../../../shared/types';

export interface StudentWeeklyAttendance {
  enrollment: ClassEnrollment;
  // Matrix map: dayNumber (1..5) -> status & recordId & attendanceDate
  slots: Record<number, { status: AttendanceStatus; recordId?: number; attendanceDate?: string }>;
  summary: {
    present: number;
    absent: number;
    discontinued: number;
    unmarked: number;
  };
}

export interface AttendanceFilterState {
  academicYearId: number;
  classId: number;
  attendanceWeekId: number;
  selectedDay: number; // 1 to 5
  searchQuery: string;
}
