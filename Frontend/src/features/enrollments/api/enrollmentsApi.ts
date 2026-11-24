import { apiClient } from '../../../shared/lib/apiClient';
import type { ClassEnrollment, PagedResult } from '../../../shared/types';

export const enrollmentsApi = {
  async getPagedEnrollments(params: {
    pageNumber?: number;
    pageSize?: number;
    classId?: number;
    academicYearId?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PagedResult<ClassEnrollment>> {
    const raw = await apiClient.get<PagedResult<any>>('/ClassEnrollments/paged', params);
    return {
      ...raw,
      items: (raw.items || []).map((e) => {
        const studentObj = e.student || {};
        const fName = studentObj.firstName || e.firstName || '';
        const sName = studentObj.secondName || e.secondName || '';
        const tName = studentObj.thirdName || e.thirdName || '';
        const lName = studentObj.lastName || e.lastName || '';
        const concludedParent = `${sName} ${tName} ${lName}`.trim();
        const pName = studentObj.parentName || studentObj.parent?.fullName || e.parentName || (concludedParent || undefined);
        const pPhone = studentObj.parentPhoneNumber || studentObj.parent?.phoneNumber || e.parentPhoneNumber || undefined;

        return {
          ...e,
          classNumber: e.classNumber,
          className: e.className ?? (e.classNumber ? `شعبة ${e.classNumber}` : ''),
          parentName: pName,
          parentPhoneNumber: pPhone,
          student: {
            studentId: e.studentId,
            firstName: fName,
            secondName: sName,
            thirdName: tName,
            lastName: lName,
            fullName: e.studentName || studentObj.fullName || `${fName} ${sName} ${tName} ${lName}`.trim(),
            nationalId: e.nationalId || studentObj.nationalId || '',
            parentId: e.parentId || studentObj.parentId,
            parentName: pName,
            parentPhoneNumber: pPhone,
            parent: pName || pPhone ? {
              id: e.parentId || studentObj.parentId,
              fullName: pName || '',
              phoneNumber: pPhone || '',
            } : undefined,
          },
        };
      }),
    };
  },

  async getEnrollmentsByClass(classId: number, academicYearId: number = 1): Promise<ClassEnrollment[]> {
    const enrollments = await apiClient.get<any[]>('/ClassEnrollments/active-by-class', {
      classId,
      academicYearId,
    });

    return (enrollments || []).map((e) => ({
      ...e,
      classNumber: e.classNumber,
      className: e.className ?? e.classNumber ?? '',
      student: e.student
        ? {
            ...e.student,
            parentId: e.student.parentId || (e as any).parentId,
            parentName: e.student.parentName || (e as any).parentName,
          }
        : {
            studentId: e.studentId,
            firstName: '',
            secondName: '',
            thirdName: '',
            lastName: '',
            fullName: e.studentName || '',
            nationalId: (e as unknown as { nationalId?: string }).nationalId || '',
            parentId: (e as any).parentId,
            parentName: (e as any).parentName,
          },
    }));
  },

  async getAllEnrollments(): Promise<ClassEnrollment[]> {
    const enrollments = await apiClient.get<any[]>('/ClassEnrollments');
    return (enrollments || []).map((e) => ({
      ...e,
      classNumber: e.classNumber,
      className: e.className ?? e.classNumber ?? '',
      student: e.student
        ? {
            ...e.student,
            parentId: e.student.parentId || (e as any).parentId,
            parentName: e.student.parentName || (e as any).parentName,
          }
        : {
            studentId: e.studentId,
            firstName: '',
            secondName: '',
            thirdName: '',
            lastName: '',
            fullName: e.studentName || '',
            nationalId: (e as unknown as { nationalId?: string }).nationalId || '',
            parentId: (e as any).parentId,
            parentName: (e as any).parentName,
          },
    }));
  },

  async removeStudentFromClass(enrollmentId: number): Promise<void> {
    await apiClient.put(`/ClassEnrollments/${enrollmentId}/deactivate`, null, {
      params: { endDate: new Date().toISOString().split('T')[0] },
    });
  },
};
