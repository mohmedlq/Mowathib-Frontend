import { apiClient } from '../../../shared/lib/apiClient';
import type { School } from '../../../shared/types';

export const schoolsApi = {
  async getSchoolByCode(schoolCode: string): Promise<School> {
    return await apiClient.get<School>(`/Schools/by-code/${schoolCode}`);
  },

  async getSchoolForAdmin(adminId: number): Promise<School> {
    return await apiClient.get<School>(`/Schools/for-admin/${adminId}`);
  },

  async getDefaultSchoolCode(): Promise<string> {
    return await apiClient.get<string>('/Schools/default-code');
  },

  async updateSchool(schoolCode: string, data: { name: string; isActive: boolean }): Promise<School> {
    return await apiClient.put<School>(`/Schools/${schoolCode}`, data);
  },
};
