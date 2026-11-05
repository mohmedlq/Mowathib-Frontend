import { apiClient } from '../../../shared/lib/apiClient';
import type { LoginCredentials, AdminLoginResponse, RepresentativeLoginResponse } from '../types/auth.types';
import type { Representative, ClassEnrollment } from '../../../shared/types';

export const authApi = {
  // Real Admin Login endpoint: POST /api/Admins/login
  async loginAdmin(credentials: LoginCredentials): Promise<AdminLoginResponse> {
    const res = await apiClient.post<AdminLoginResponse>('/Admins/login', {
      username: credentials.username,
      password: credentials.password,
    });
    return res;
  },

  // Real Representative Login endpoint: POST /api/Representatives/login
  async loginRepresentative(credentials: LoginCredentials): Promise<{
    representative: Representative;
    enrollment?: ClassEnrollment;
  }> {
    const loginResult = await apiClient.post<RepresentativeLoginResponse>('/Representatives/login', {
      username: credentials.username,
      password: credentials.password,
    });

    if (!loginResult.isAuthenticated) {
      throw new Error(loginResult.message || 'بيانات الدخول غير صحيحة');
    }

    // Fetch full representative profile from backend
    const repProfile = await apiClient.get<Representative>(
      `/Representatives/${loginResult.representativeId}`
    );

    let enrollment: ClassEnrollment | undefined;
    if (repProfile.enrollmentId) {
      try {
        enrollment = await apiClient.get<ClassEnrollment>(`/ClassEnrollments/${repProfile.enrollmentId}`);
      } catch {
        // Enrollment details optional if not assigned yet
      }
    }

    return {
      representative: {
        ...repProfile,
        mustChangePassword: loginResult.mustChangePassword ?? repProfile.mustChangePassword,
      },
      enrollment,
    };
  },

  // Real Change Password endpoint: PUT /api/Representatives/{id}/change-password
  async changeRepresentativePassword(
    repId: number,
    newPassword: string
  ): Promise<void> {
    await apiClient.put(`/Representatives/${repId}/change-password`, {
      newPassword,
    });
  },
};
