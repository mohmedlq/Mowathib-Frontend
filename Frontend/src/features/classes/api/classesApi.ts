import { apiClient } from '../../../shared/lib/apiClient';
import type { ClassItem } from '../../../shared/types';

export const classesApi = {
  async getClasses(academicYearId?: number): Promise<ClassItem[]> {
    const raw = await apiClient.get<any[]>('/Classes', { academicYearId });
    return (raw || []).map((c) => {
      const num = c.classNumber ?? c.classId;
      return {
        classId: c.classId,
        classNumber: num,
        className: c.className ?? num,
        academicYearId: c.academicYearId,
        totalCards: c.totalCards ?? 3,
      };
    });
  },

  async getClassById(classId: number): Promise<ClassItem> {
    const c = await apiClient.get<any>(`/Classes/${classId}`);
    const num = c?.classNumber ?? c?.classId ?? classId;
    return {
      classId: c?.classId ?? classId,
      classNumber: num,
      className: c?.className ?? num,
      academicYearId: c?.academicYearId ?? 1,
      totalCards: c?.totalCards ?? 3,
    };
  },

  async createClass(data: { className: string | number; classNumber?: number; academicYearId: number; totalCards: number }): Promise<ClassItem> {
    const num = Number(data.classNumber ?? data.className);
    return await apiClient.post<ClassItem>('/Classes', {
      classNumber: num,
      academicYearId: data.academicYearId,
      totalCards: data.totalCards,
    });
  },

  async updateClass(classId: number, data: { className: string | number; classNumber?: number; academicYearId: number; totalCards: number }): Promise<void> {
    const num = Number(data.classNumber ?? data.className);
    await apiClient.put(`/Classes/${classId}`, {
      classNumber: num,
      academicYearId: data.academicYearId,
      totalCards: data.totalCards,
    });
  },

  async deleteClass(classId: number): Promise<void> {
    await apiClient.delete(`/Classes/${classId}`);
  },

  async getClassesBySchool(schoolCode: string): Promise<ClassItem[]> {
    const raw = await apiClient.get<any[]>(`/Classes/by-school/${schoolCode}`);
    return (raw || []).map((c) => {
      const num = c.classNumber ?? c.classId;
      return {
        classId: c.classId,
        classNumber: num,
        className: c.className ?? num,
        academicYearId: c.academicYearId,
        totalCards: c.totalCards ?? 3,
      };
    });
  },
};
