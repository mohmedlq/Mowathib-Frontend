import { apiClient } from '../../../shared/lib/apiClient';

export const adminApi = {
  async getAdminProfile(adminId: number): Promise<{
    adminId: number;
    username: string;
    adminName: string;
    schoolCode?: string;
    schoolName?: string;
  }> {
    return await apiClient.get(`/Admins/${adminId}/profile`);
  },

  async updateAdminProfile(
    adminId: number,
    data: { adminName: string; username?: string; currentPassword?: string; newPassword?: string }
  ): Promise<any> {
    return await apiClient.put(`/Admins/${adminId}/profile`, data);
  },
};
