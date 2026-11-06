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
      username: credentials.username.trim(),
      password: credentials.password.trim(),
    });

    if (!loginResult || (loginResult.isAuthenticated === false && !loginResult.representativeId)) {
      throw new Error(loginResult?.message || 'بيانات الدخول غير صحيحة');
    }

    const classNumber = loginResult.classNumber ?? (loginResult.classId ? loginResult.classId : undefined);
    const className = loginResult.className || (classNumber ? `شعبة ${classNumber}` : undefined);

    const representative: Representative = {
      representativeId: loginResult.representativeId,
      enrollmentId: loginResult.enrollmentId || 0,
      username: loginResult.username,
      phoneNumber: '',
      role: loginResult.role || 'Representative',
      isActive: true,
      mustChangePassword: Boolean(loginResult.mustChangePassword),
      studentName: loginResult.fullName,
      classNumber,
      className,
    };

    const enrollment: ClassEnrollment | undefined = loginResult.enrollmentId
      ? {
          enrollmentId: loginResult.enrollmentId,
          studentId: 0,
          classId: loginResult.classId || (typeof classNumber === 'number' ? classNumber : 0),
          academicYearId: 1,
          isRepresentative: loginResult.role === 'Representative',
          startDate: '',
          isActive: true,
          studentName: loginResult.fullName,
          classNumber,
          className,
        }
      : undefined;

    return {
      representative,
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
