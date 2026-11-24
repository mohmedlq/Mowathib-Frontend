import { apiClient } from '../../../shared/lib/apiClient';
import type { AttendanceClerk, PagedResult } from '../../../shared/types';

export const attendanceClerksApi = {
  async getAttendanceClerksPaged(params: {
    schoolCode?: string;
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    activeOnly?: boolean;
  }): Promise<PagedResult<AttendanceClerk>> {
    return await apiClient.get<PagedResult<AttendanceClerk>>('/AttendanceClerks/paged', params);
  },

  async createAttendanceClerk(
    data: { studentId: number; username: string; password: string; access?: string },
    schoolCode?: string
  ): Promise<AttendanceClerk> {
    const headers = schoolCode ? { 'X-School-Code': schoolCode } : undefined;
    return await apiClient.post<AttendanceClerk>('/AttendanceClerks', data, {
      headers,
      params: schoolCode ? { schoolCode } : undefined,
    });
  },

  async toggleClerkStatus(
    clerkId: number,
    isActive: boolean,
    schoolCode?: string
  ): Promise<{ success: boolean; isActive: boolean }> {
    const headers = schoolCode ? { 'X-School-Code': schoolCode } : undefined;
    return await apiClient.put<{ success: boolean; isActive: boolean }>(
      `/AttendanceClerks/${clerkId}/status`,
      { isActive },
      {
        headers,
        params: schoolCode ? { schoolCode } : undefined,
      }
    );
  },

  async updateAttendanceClerk(
    clerkId: number,
    data: { username?: string; password?: string; isActive?: boolean; access?: string },
    schoolCode?: string
  ): Promise<AttendanceClerk> {
    const headers = schoolCode ? { 'X-School-Code': schoolCode } : undefined;
    return await apiClient.put<AttendanceClerk>(
      `/AttendanceClerks/${clerkId}`,
      data,
      {
        headers,
        params: schoolCode ? { schoolCode } : undefined,
      }
    );
  },
};
