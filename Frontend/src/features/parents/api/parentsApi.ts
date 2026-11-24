import { apiClient } from '../../../shared/lib/apiClient';
import type { Parent } from '../../../shared/types';

export const parentsApi = {
  async getParents(): Promise<Parent[]> {
    try {
      return await apiClient.get<Parent[]>('/Parents');
    } catch {
      return [];
    }
  },

  async getParentById(id: string): Promise<Parent | null> {
    try {
      return await apiClient.get<Parent>(`/Parents/${id}`);
    } catch {
      return null;
    }
  },

  async getParentByPhone(phoneNumber: string): Promise<Parent | null> {
    try {
      return await apiClient.get<Parent>(`/Parents/by-phone/${phoneNumber}`);
    } catch {
      return null;
    }
  },
};
