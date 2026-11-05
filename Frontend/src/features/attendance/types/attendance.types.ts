import type {
  AttendanceStatus,
  ClassEnrollment,
  SchoolPeriod,
} from '../../../shared/types';

export interface StudentWeeklyAttendance {
  enrollment: ClassEnrollment;
  // Matrix map: dayNumber (1..5) -> periodNumber (1..7) -> status & recordId
  slots: Record<number, Record<number, { status: AttendanceStatus; recordId?: number }>>;
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
  selectedPeriod: SchoolPeriod; // 1 to 7
  searchQuery: string;
}
