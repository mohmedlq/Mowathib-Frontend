import { apiClient } from '../../../shared/lib/apiClient';
import type { AcademicYear } from '../../../shared/types';

export const academicYearsApi = {
  async getAcademicYears(): Promise<AcademicYear[]> {
    return await apiClient.get<AcademicYear[]>('/AcademicYears');
  },

  async getActiveAcademicYear(): Promise<AcademicYear> {
    return await apiClient.get<AcademicYear>('/AcademicYears/active');
  },

  async createAcademicYear(data: {
    yearName: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }): Promise<AcademicYear> {
    return await apiClient.post<AcademicYear>('/AcademicYears', data);
  },

  async setActiveAcademicYear(id: number): Promise<void> {
    await apiClient.put(`/AcademicYears/${id}/set-active`);
  },
};
