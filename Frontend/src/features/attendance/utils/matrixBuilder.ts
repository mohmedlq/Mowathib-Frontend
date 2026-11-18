import type { StudentWeeklyAttendance } from '../types/attendance.types';
import {
  SCHOOL_DAYS,
  type AttendanceStatus,
  type AttendanceRecord,
  type ClassEnrollment,
} from '../../../shared/types';

/**
 * Builds StudentWeeklyAttendance[] from enrollments and daily attendance records
 * using high-performance O(1) Map lookups.
 */
export function buildWeeklyAttendanceRows(
  enrollments: ClassEnrollment[],
  records: AttendanceRecord[]
): StudentWeeklyAttendance[] {
  const recordBySlot = new Map<string, AttendanceRecord>();

  records.forEach((record) => {
    const key = `${record.enrollmentId}:${record.dayNumber}`;
    if (!recordBySlot.has(key)) {
      recordBySlot.set(key, record);
    }
  });

  return enrollments.map((enrollment) => {
    const slots: Record<
      number,
      { status: AttendanceStatus; recordId?: number; attendanceDate?: string }
    > = {};

    let present = 0;
    let absent = 0;
    let discontinued = 0;
    let unmarked = 0;

    SCHOOL_DAYS.forEach((day) => {
      const key = `${enrollment.enrollmentId}:${day.dayNumber}`;
      const match = recordBySlot.get(key);

      if (match) {
        slots[day.dayNumber] = {
          status: match.status,
          recordId: match.attendanceRecordId,
          attendanceDate: match.attendanceDate,
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
        slots[day.dayNumber] = { status: 'Unmarked' };
        unmarked++;
      }
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
