import { apiClient } from '../../../shared/lib/apiClient';
import type { Representative, PagedResult } from '../../../shared/types';

export const representativesApi = {
  async getPagedRepresentatives(params: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    classId?: number;
    activeOnly?: boolean;
    role?: string;
    schoolCode?: string;
  }): Promise<PagedResult<Representative>> {
    return await apiClient.get<PagedResult<Representative>>('/Representatives/paged', params);
  },

  async toggleRepresentativeStatus(representativeId: number, isActive: boolean): Promise<{ success: boolean; isActive: boolean }> {
    return await apiClient.put<{ success: boolean; isActive: boolean }>(`/Representatives/${representativeId}/status`, { isActive });
  },

  async getRepresentatives(activeOnly?: boolean): Promise<Representative[]> {
    return await apiClient.get<Representative[]>('/Representatives', { activeOnly });
  },

  async getRepresentativeByUsername(username: string): Promise<Representative> {
    return await apiClient.get<Representative>(`/Representatives/by-username/${username}`);
  },

  async getRepresentativeRoleById(id: number): Promise<string> {
    try {
      const res = await apiClient.get<string | { role?: string }>(`/Representatives/${id}/GetRole`);
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && res.role) return res.role;
      return 'Representative';
    } catch {
      try {
        const res = await apiClient.get<string | { role?: string }>(`/Representatives/${id}/GetRole)`);
        if (typeof res === 'string') return res;
        if (res && typeof res === 'object' && res.role) return res.role;
        return 'Representative';
      } catch {
        return 'Representative';
      }
    }
  },

  async deactivateRepresentative(id: number): Promise<void> {
    await apiClient.put(`/Representatives/deActive/${id}`);
  },

  async createRepresentative(rep: {
    enrollmentId: number;
    username: string;
    password?: string;
    phoneNumber: string;
    role: string;
    isActive: boolean;
    mustChangePassword?: boolean;
    className?: string;
  }): Promise<Representative> {
    return await apiClient.post<Representative>('/Representatives', {
      enrollmentId: rep.enrollmentId,
      username: rep.username,
      password: rep.password || 'temp123',
      phoneNumber: rep.phoneNumber,
      role: rep.role,
      isActive: rep.isActive,
      mustChangePassword: rep.mustChangePassword ?? true,
    });
  },
};
