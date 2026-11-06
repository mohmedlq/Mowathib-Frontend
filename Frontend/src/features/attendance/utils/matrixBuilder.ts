import type { StudentWeeklyAttendance } from '../types/attendance.types';
import {
  SCHOOL_DAYS,
  getPeriodsForDay,
  type AttendanceStatus,
  type AttendanceRecord,
  type ClassEnrollment,
} from '../../../shared/types';

/**
 * Builds StudentWeeklyAttendance[] from enrollments and attendance records
 * using high-performance O(1) Map lookups.
 */
export function buildWeeklyAttendanceRows(
  enrollments: ClassEnrollment[],
  records: AttendanceRecord[]
): StudentWeeklyAttendance[] {
  const recordBySlot = new Map<string, AttendanceRecord>();

  records.forEach((record) => {
    const key = `${record.enrollmentId}:${record.dayNumber}:${record.periodNumber}`;
    if (!recordBySlot.has(key)) {
      recordBySlot.set(key, record);
    }
  });

  return enrollments.map((enrollment) => {
    const slots: Record<
      number,
      Record<number, { status: AttendanceStatus; recordId?: number }>
    > = {};

    let present = 0;
    let absent = 0;
    let discontinued = 0;
    let unmarked = 0;

    SCHOOL_DAYS.forEach((day) => {
      slots[day.dayNumber] = {};

      getPeriodsForDay(day.dayNumber).forEach((period) => {
        const key = `${enrollment.enrollmentId}:${day.dayNumber}:${period}`;
        const match = recordBySlot.get(key);

        if (match) {
          slots[day.dayNumber][period] = {
            status: match.status,
            recordId: match.attendanceRecordId,
          };

          if (match.status === 'Present') {
            present++;
          } else if (match.status === 'Absent') {
            absent++;
          } else if (match.status === 'Discontinued') {
            discontinued++;
          } else {
            unmarked++;
          }
        } else {
          slots[day.dayNumber][period] = { status: 'Unmarked' };
          unmarked++;
        }
      });
    });

    return {
      enrollment,
      slots,
      summary: {
        present,
        absent,
        discontinued,
        unmarked,
      },
    };
  });
}
