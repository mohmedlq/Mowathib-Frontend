import type {
  DailyAttendanceRow,
  DailyAbsenceRecord,
  MonthlyStudentSummaryRow,
  MonthlyDetailedAbsenceRow,
} from '../types/report.types';
import type { ClassEnrollment, AttendanceRecord, AttendanceWeek } from '../../../shared/types';
import { SCHOOL_DAYS, SCHOOL_PERIODS, type AttendanceStatus, type SchoolPeriod } from '../../../shared/types';
import { calculateDateForDay, getArabicDayName } from '../../../shared/utils/date';

export const reportCalculationService = {
  // DAILY ATTENDANCE CALCULATION
  calculateDailyAttendance(
    enrollments: ClassEnrollment[],
    records: AttendanceRecord[],
    dayNumber: number
  ): DailyAttendanceRow[] {
    return enrollments.map((en) => {
      const periods: Record<number, AttendanceStatus> = {};
      let presentCount = 0;
      let absentCount = 0;
      let discontinuedCount = 0;
      let unmarkedCount = 0;

      SCHOOL_PERIODS.forEach((p) => {
        const match = records.find(
          (r) =>
            r.enrollmentId === en.enrollmentId &&
            r.dayNumber === dayNumber &&
            r.periodNumber === p
        );

        if (match) {
          periods[p] = match.status;
          if (match.status === 'Present') presentCount++;
          else if (match.status === 'Absent') absentCount++;
          else if (match.status === 'Discontinued') discontinuedCount++;
        } else {
          periods[p] = 'Unmarked';
          unmarkedCount++;
        }
      });

      return {
        enrollmentId: en.enrollmentId,
        nationalId: en.student?.nationalId || '',
        studentName: en.studentName || '',
        className: en.className || '',
        periods,
        presentCount,
        absentCount,
        discontinuedCount,
        unmarkedCount,
      };
    });
  },

  // DAILY ABSENCE CALCULATION
  calculateDailyAbsences(
    enrollments: ClassEnrollment[],
    records: AttendanceRecord[],
    dayNumber: number,
    weekStartDate: string
  ): DailyAbsenceRecord[] {
    const list: DailyAbsenceRecord[] = [];
    const dateStr = calculateDateForDay(weekStartDate, dayNumber);
    const dayName = getArabicDayName(dayNumber);

    enrollments.forEach((en) => {
      SCHOOL_PERIODS.forEach((p) => {
        const match = records.find(
          (r) =>
            r.enrollmentId === en.enrollmentId &&
            r.dayNumber === dayNumber &&
            r.periodNumber === p
        );

        // Actual absence only! Unmarked is NOT an absence, and Discontinued is NOT an absence
        if (match && match.status === 'Absent') {
          list.push({
            enrollmentId: en.enrollmentId,
            nationalId: en.student?.nationalId || '',
            studentName: en.studentName || '',
            className: en.className || '',
            date: dateStr,
            dayName,
            periodNumber: p as SchoolPeriod,
          });
        }
      });
    });

    return list;
  },

  // MONTHLY CALCULATION (Respects actual calendar dates across attendance weeks)
  calculateMonthlyReport(
    enrollments: ClassEnrollment[],
    allRecords: AttendanceRecord[],
    allWeeks: AttendanceWeek[],
    monthStr: string // YYYY-MM
  ): {
    summary: MonthlyStudentSummaryRow[];
    detailedAbsences: MonthlyDetailedAbsenceRow[];
  } {
    // 1. Find all attendance week days that fall within this calendar month
    const validSlotsInMonth: Array<{
      weekId: number;
      dayNumber: number;
      date: string;
      dayName: string;
    }> = [];

    allWeeks.forEach((w) => {
      SCHOOL_DAYS.forEach((d) => {
        const date = calculateDateForDay(w.startDate, d.dayNumber);
        if (date.startsWith(monthStr)) {
          validSlotsInMonth.push({
            weekId: w.attendanceWeekId,
            dayNumber: d.dayNumber,
            date,
            dayName: d.nameAr,
          });
        }
      });
    });

    const expectedPeriodsPerDay = 7;
    const totalExpectedSlots = validSlotsInMonth.length * expectedPeriodsPerDay;

    const summary: MonthlyStudentSummaryRow[] = [];
    const detailedAbsences: MonthlyDetailedAbsenceRow[] = [];

    enrollments.forEach((en) => {
      let presentCount = 0;
      let absentCount = 0;
      let discontinuedCount = 0;
      let unmarkedCount = 0;

      validSlotsInMonth.forEach((slot) => {
        SCHOOL_PERIODS.forEach((p) => {
          const match = allRecords.find(
            (r) =>
              r.enrollmentId === en.enrollmentId &&
              r.attendanceWeekId === slot.weekId &&
              r.dayNumber === slot.dayNumber &&
              r.periodNumber === p
          );

          if (match) {
            if (match.status === 'Present') presentCount++;
            else if (match.status === 'Absent') {
              absentCount++;
              detailedAbsences.push({
                enrollmentId: en.enrollmentId,
                nationalId: en.student?.nationalId || '',
                studentName: en.studentName || '',
                className: en.className || '',
                date: slot.date,
                dayName: slot.dayName,
                periodNumber: p,
              });
            } else if (match.status === 'Discontinued') {
              discontinuedCount++;
            }
          } else {
            unmarkedCount++;
          }
        });
      });

      // Valid denominator: expected - discontinued
      const denominator = totalExpectedSlots - discontinuedCount;
      const attendanceRate = denominator > 0 ? (presentCount / denominator) * 100 : 0;

      summary.push({
        enrollmentId: en.enrollmentId,
        nationalId: en.student?.nationalId || '',
        studentName: en.studentName || '',
        className: en.className || '',
        totalExpected: totalExpectedSlots,
        presentCount,
        absentCount,
        discontinuedCount,
        unmarkedCount,
        attendanceRate: Math.min(100, Math.max(0, attendanceRate)),
      });
    });

    return { summary, detailedAbsences };
  },
};

