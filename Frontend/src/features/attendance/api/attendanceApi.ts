import { apiClient } from '../../../shared/lib/apiClient';
import type {
  AttendanceRecord,
  WeeklyAttendanceSummary,
  DailyAttendanceSummary,
  BackendAttendanceStatus,
  PagedResult,
  AbsenteeNotification,
} from '../../../shared/types';

export const attendanceApi = {
  async getPagedAttendanceRecords(params: {
    pageNumber?: number;
    pageSize?: number;
    classId?: number;
    attendanceWeekId?: number;
    date?: string;
    status?: BackendAttendanceStatus;
    search?: string;
  }): Promise<PagedResult<AttendanceRecord>> {
    return await apiClient.get<PagedResult<AttendanceRecord>>('/AttendanceRecords/paged', params);
  },

  async getPagedAbsentees(params: {
    date: string;
    classId?: number;
    search?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PagedResult<AbsenteeNotification>> {
    return await apiClient.get<PagedResult<AbsenteeNotification>>('/AttendanceRecords/absentees/paged', params);
  },

  async getAttendanceRecords(classId: number, attendanceWeekId: number): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-class-and-week', {
      classId,
      attendanceWeekId,
    });
  },

  async getAttendanceRecordsByWeek(attendanceWeekId: number): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-week', {
      attendanceWeekId,
    });
  },

  async getWeeklyClassSummary(classId: number, attendanceWeekId: number): Promise<WeeklyAttendanceSummary> {
    return await apiClient.get<WeeklyAttendanceSummary>('/AttendanceRecords/summary/by-class-and-week', {
      classId,
      attendanceWeekId,
    });
  },

  async saveSingleAttendanceRecord(record: {
    enrollmentId: number;
    attendanceWeekId?: number;
    dayNumber?: number;
    attendanceDate?: string;
    status: BackendAttendanceStatus;
  }): Promise<AttendanceRecord> {
    return await apiClient.post<AttendanceRecord>('/AttendanceRecords', record);
  },

  async saveBulkAttendance(data: {
    attendanceWeekId?: number;
    dayNumber?: number;
    attendanceDate?: string;
    records: Array<{ enrollmentId: number; status: BackendAttendanceStatus }>;
  }): Promise<number> {
    return await apiClient.post<number>('/AttendanceRecords/bulk', data);
  },

  async getAttendanceRecordsByDay(
    classId: number,
    attendanceWeekId: number,
    dayNumber: number
  ): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-day', {
      classId,
      attendanceWeekId,
      dayNumber,
    });
  },

  async getAttendanceRecordsByDate(date: string, classId?: number): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-date', {
      date,
      classId,
    });
  },

  async getAbsenteesByDate(date: string, classId?: number): Promise<any[]> {
    return await apiClient.get<any[]>('/AttendanceRecords/absentees', {
      date,
      classId,
    });
  },

  async getDailyAttendanceSummary(date: string, classId?: number): Promise<DailyAttendanceSummary> {
    return await apiClient.get<DailyAttendanceSummary>('/AttendanceRecords/summary/daily', {
      date,
      classId,
    });
  },
};
