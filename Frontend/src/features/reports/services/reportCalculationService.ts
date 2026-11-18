import type {
  DailyAttendanceRow,
  DailyAbsenceRecord,
  MonthlyStudentSummaryRow,
  MonthlyDetailedAbsenceRow,
} from '../types/report.types';

import type {
  ClassEnrollment,
  AttendanceRecord,
  AttendanceWeek,
  AttendanceStatus,
} from '../../../shared/types';

import { SCHOOL_DAYS } from '../../../shared/types';

import {
  calculateDateForDay,
  getArabicDayName,
} from '../../../shared/utils/date';

// Normalize class name to a numeric class identifier
function normalizeClassName(
  value: ClassEnrollment['className']
): number {
  const parsed = typeof value === 'number'
    ? value
    : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export const reportCalculationService = {

  // ==========================================
  // DAILY ATTENDANCE CALCULATION
  // ==========================================

  calculateDailyAttendance(
    enrollments: ClassEnrollment[],
    records: AttendanceRecord[],
    dayNumber: number,
    weekStartDate?: string
  ): DailyAttendanceRow[] {
    const recordByEnrollment = new Map<number, AttendanceRecord>();
    records.forEach((r) => {
      if (r.dayNumber === dayNumber) {
        recordByEnrollment.set(r.enrollmentId, r);
      }
    });

    const dateStr = weekStartDate ? calculateDateForDay(weekStartDate, dayNumber) : '';
    const dayName = getArabicDayName(dayNumber);

    return enrollments.map((en) => {
      const match = recordByEnrollment.get(en.enrollmentId);
      const status: AttendanceStatus = match ? (match.status as AttendanceStatus) : 'Unmarked';

      return {
        enrollmentId: en.enrollmentId,
        nationalId: en.student?.nationalId || '',
        studentName: en.studentName || '',
        className: normalizeClassName(en.className),
        date: match?.attendanceDate || dateStr,
        dayName,
        status,
        presentCount: status === 'Present' ? 1 : 0,
        absentCount: status === 'Absent' ? 1 : 0,
        discontinuedCount: status === 'Discontinued' ? 1 : 0,
        unmarkedCount: status === 'Unmarked' ? 1 : 0,
      };
    });
  },

  // ==========================================
  // DAILY ABSENCE CALCULATION
  // ==========================================

  calculateDailyAbsences(
    enrollments: ClassEnrollment[],
    records: AttendanceRecord[],
    dayNumber: number,
    weekStartDate: string
  ): DailyAbsenceRecord[] {
    const list: DailyAbsenceRecord[] = [];
    const dateStr = calculateDateForDay(weekStartDate, dayNumber);
    const dayName = getArabicDayName(dayNumber);

    const recordByEnrollment = new Map<number, AttendanceRecord>();
    records.forEach((r) => {
      if (r.dayNumber === dayNumber) {
        recordByEnrollment.set(r.enrollmentId, r);
      }
    });

    enrollments.forEach((en) => {
      const match = recordByEnrollment.get(en.enrollmentId);
      // Only actual absence is counted
      if (match && match.status === 'Absent') {
        list.push({
          enrollmentId: en.enrollmentId,
          nationalId: en.student?.nationalId || '',
          studentName: en.studentName || '',
          className: normalizeClassName(en.className),
          date: match.attendanceDate || dateStr,
          dayName,
          status: 'Absent',
        });
      }
    });

    return list;
  },

  // ==========================================
  // MONTHLY REPORT CALCULATION
  // ==========================================

  calculateMonthlyReport(
    enrollments: ClassEnrollment[],
    allRecords: AttendanceRecord[],
    allWeeks: AttendanceWeek[],
    monthStr: string
  ): {
    summary: MonthlyStudentSummaryRow[];
    detailedAbsences: MonthlyDetailedAbsenceRow[];
  } {
    // 1. Find all school days that fall within the selected calendar month.
    const validDaysInMonth: Array<{
      weekId: number;
      dayNumber: number;
      date: string;
      dayName: string;
    }> = [];

    allWeeks.forEach((w) => {
      SCHOOL_DAYS.forEach((d) => {
        const date = calculateDateForDay(w.startDate, d.dayNumber);
        if (date.startsWith(monthStr)) {
          validDaysInMonth.push({
            weekId: w.attendanceWeekId,
            dayNumber: d.dayNumber,
            date,
            dayName: d.nameAr,
          });
        }
      });
    });

    const totalExpectedDays = validDaysInMonth.length;
    const summary: MonthlyStudentSummaryRow[] = [];
    const detailedAbsences: MonthlyDetailedAbsenceRow[] = [];

    // Pre-index records by enrollmentId and date (or weekId:dayNumber)
    const recordsMap = new Map<string, AttendanceRecord>();
    allRecords.forEach((r) => {
      if (r.attendanceDate) {
        recordsMap.set(`${r.enrollmentId}:${r.attendanceDate}`, r);
      }
      recordsMap.set(`${r.enrollmentId}:${r.attendanceWeekId}:${r.dayNumber}`, r);
    });

    // 2. Calculate daily attendance statistics for each student
    enrollments.forEach((en) => {
      let presentCount = 0;
      let absentCount = 0;
      let discontinuedCount = 0;
      let unmarkedCount = 0;

      validDaysInMonth.forEach((slot) => {
        const match =
          recordsMap.get(`${en.enrollmentId}:${slot.date}`) ||
          recordsMap.get(`${en.enrollmentId}:${slot.weekId}:${slot.dayNumber}`);

        if (match) {
          if (match.status === 'Present') {
            presentCount++;
          } else if (match.status === 'Absent') {
            absentCount++;
            detailedAbsences.push({
              enrollmentId: en.enrollmentId,
              nationalId: en.student?.nationalId || '',
              studentName: en.studentName || '',
              className: normalizeClassName(en.className),
              date: slot.date,
              dayName: slot.dayName,
              status: 'Absent',
            });
          } else if (match.status === 'Discontinued') {
            discontinuedCount++;
          } else {
            unmarkedCount++;
          }
        } else {
          unmarkedCount++;
        }
      });

      // 3. Calculate attendance rate excluding discontinued days
      const denominator = totalExpectedDays - discontinuedCount;
      const attendanceRate =
        denominator > 0 ? (presentCount / denominator) * 100 : 0;

      summary.push({
        enrollmentId: en.enrollmentId,
        nationalId: en.student?.nationalId || '',
        studentName: en.studentName || '',
        className: normalizeClassName(en.className),
        totalExpected: totalExpectedDays,
        presentCount,
        absentCount,
        discontinuedCount,
        unmarkedCount,
        attendanceRate: Math.min(100, Math.max(0, attendanceRate)),
      });
    });

    return {
      summary,
      detailedAbsences,
    };
  },
};
