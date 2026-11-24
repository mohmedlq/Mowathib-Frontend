import { apiClient } from '../../../shared/lib/apiClient';
import type {
  ParentNotification,
  GenerateNotificationsResponse,
} from '../../../shared/types';

export const parentNotificationsApi = {
  async getParentNotifications(params?: { date?: string; isSent?: boolean }): Promise<ParentNotification[]> {
    return await apiClient.get<ParentNotification[]>('/ParentNotifications', params);
  },

  async generateParentNotifications(absentDate?: string): Promise<GenerateNotificationsResponse> {
    return await apiClient.post<GenerateNotificationsResponse>('/ParentNotifications/generate', { absentDate });
  },

  async updateNotificationStatus(id: number, isSent: boolean): Promise<{ success: boolean; id: number; isSent: boolean }> {
    return await apiClient.put<{ success: boolean; id: number; isSent: boolean }>(`/ParentNotifications/${id}/status`, { isSent });
  },

  async markNotificationAsSent(id: number): Promise<{ success: boolean; id: number; isSent: boolean }> {
    return await apiClient.patch<{ success: boolean; id: number; isSent: boolean }>(`/ParentNotifications/${id}/sent`);
  },
};
