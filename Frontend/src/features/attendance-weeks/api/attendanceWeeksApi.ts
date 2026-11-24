import { apiClient } from '../../../shared/lib/apiClient';
import type { AttendanceWeek } from '../../../shared/types';

export const attendanceWeeksApi = {
  async getAttendanceWeeks(academicYearId?: number): Promise<AttendanceWeek[]> {
    return await apiClient.get<AttendanceWeek[]>('/AttendanceWeeks', { academicYearId });
  },

  async createAttendanceWeek(data: {
    academicYearId: number;
    weekNumber: number;
    startDate: string;
    endDate: string;
  }): Promise<AttendanceWeek> {
    return await apiClient.post<AttendanceWeek>('/AttendanceWeeks', data);
  },

  async updateAttendanceWeek(
    id: number,
    data: {
      academicYearId: number;
      weekNumber: number;
      startDate: string;
      endDate: string;
    }
  ): Promise<void> {
    await apiClient.put(`/AttendanceWeeks/${id}`, data);
  },

  async deleteAttendanceWeek(id: number): Promise<void> {
    await apiClient.delete(`/AttendanceWeeks/${id}`);
  },
};
