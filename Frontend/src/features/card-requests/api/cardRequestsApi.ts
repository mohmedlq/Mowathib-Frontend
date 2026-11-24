import { apiClient } from '../../../shared/lib/apiClient';
import type { CardRequest, CardRequestStatus } from '../../../shared/types';

export const cardRequestsApi = {
  async getCardRequests(status?: CardRequestStatus): Promise<CardRequest[]> {
    return await apiClient.get<CardRequest[]>('/CardRequests', { status });
  },

  async createCardRequest(data: {
    enrollmentId: number;
    representativeId: number;
    reason: string;
    cardType: string;
  }): Promise<CardRequest> {
    return await apiClient.post<CardRequest>('/CardRequests', data);
  },

  async updateCardRequestStatus(requestId: number, status: CardRequestStatus): Promise<void> {
    await apiClient.put(`/CardRequests/${requestId}/status`, { status });
  },
};
