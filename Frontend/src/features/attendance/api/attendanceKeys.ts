export const attendanceKeys = {
  all: ['attendance_records'] as const,
  byClassAndWeek: (classId: number, attendanceWeekId?: number | null) =>
    ['attendance_records', classId, attendanceWeekId] as const,
  byWeek: (attendanceWeekId?: number | null) =>
    ['attendance_records', attendanceWeekId] as const,
  byDay: (classId: number, attendanceWeekId: number, dayNumber: number) =>
    ['attendance_records', 'by-day', classId, attendanceWeekId, dayNumber] as const,
  byDate: (date: string, classId?: number) =>
    ['attendance_records', 'by-date', date, classId] as const,
  paged: (params?: Record<string, any>) =>
    ['attendance_records', 'paged', params] as const,
  pagedAbsentees: (params?: Record<string, any>) =>
    ['attendance_records', 'absentees', 'paged', params] as const,
  weeklySummary: (classId: number, attendanceWeekId: number) =>
    ['attendance_records', 'summary', 'weekly', classId, attendanceWeekId] as const,
  dailySummary: (date: string, classId?: number) =>
    ['attendance_records', 'summary', 'daily', date, classId] as const,
};
