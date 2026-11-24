import { apiClient } from '../../../shared/lib/apiClient';
import type { Student, ClassEnrollment, PagedResult } from '../../../shared/types';
import { schoolsApi } from '../../schools/api/schoolsApi';

export const studentsApi = {
  async getAllStudents(search?: string): Promise<Student[]> {
    return await apiClient.get<Student[]>('/Students', { search });
  },

  async getStudentsCount(): Promise<number> {
    try {
      const res = await apiClient.get<number>('/Students/count');
      if (typeof res === 'number') return res;
      return 0;
    } catch {
      return 0;
    }
  },

  async appendStudent(studentData: {
    firstName: string;
    secondName: string;
    thirdName: string;
    lastName: string;
    nationalId: string;
    parentName?: string;
    parentPhoneNumber?: string;
    schoolCode?: string;
  }): Promise<Student> {
    const concludedParent = `${studentData.secondName.trim()} ${studentData.thirdName.trim()} ${studentData.lastName.trim()}`.trim();
    const finalParentName = studentData.parentName?.trim() || (concludedParent || undefined);
    return await apiClient.post<Student>('/Students', {
      ...studentData,
      parentName: finalParentName,
      parentPhoneNumber: studentData.parentPhoneNumber?.trim() || undefined,
    });
  },

  async createStudent(
    studentData: {
      firstName: string;
      secondName: string;
      thirdName: string;
      lastName: string;
      nationalId: string;
      parentName?: string;
      parentPhoneNumber?: string;
    },
    classId: number,
    academicYearId: number = 1
  ): Promise<ClassEnrollment> {
    const concludedParent = `${studentData.secondName.trim()} ${studentData.thirdName.trim()} ${studentData.lastName.trim()}`.trim();
    const finalParentName = studentData.parentName?.trim() || (concludedParent || undefined);

    // Create Student record and enrollment atomically in 1 backend transaction
    const student = await apiClient.post<any>('/Students/create-with-enrollment', {
      ...studentData,
      parentName: finalParentName,
      parentPhoneNumber: studentData.parentPhoneNumber?.trim() || undefined,
      classId,
      academicYearId,
    });

    return {
      enrollmentId: student.enrollmentId || student.studentId,
      studentId: student.studentId,
      classId: student.classId ?? classId,
      academicYearId: student.academicYearId ?? academicYearId,
      isRepresentative: false,
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
      studentName: student.fullName,
      nationalId: student.nationalId,
      classNumber: student.classNumber,
      className: student.className ?? `شعبة ${classId}`,
      parentName: student.parentName || finalParentName,
      parentPhoneNumber: student.parentPhoneNumber || studentData.parentPhoneNumber,
      student: {
        ...student,
        parentName: student.parentName || finalParentName,
        parentPhoneNumber: student.parentPhoneNumber || studentData.parentPhoneNumber,
      },
    } as ClassEnrollment;
  },

  async updateStudent(
    studentId: number,
    studentData: {
      firstName: string;
      secondName: string;
      thirdName: string;
      lastName: string;
      nationalId: string;
    }
  ): Promise<void> {
    await apiClient.put(`/Students/${studentId}`, studentData);
  },

  async getStudentsBySchoolPaged(
    schoolCode?: string,
    params?: {
      pageNumber?: number;
      pageSize?: number;
      search?: string;
      classId?: number;
      access?: string;
    }
  ): Promise<PagedResult<Student>> {
    const code = schoolCode || (await schoolsApi.getDefaultSchoolCode());
    return await apiClient.get<PagedResult<Student>>(`/Students/by-school/${code}`, params);
  },

  async createStudentWithEnrollment(
    data: {
      firstName: string;
      secondName: string;
      thirdName: string;
      lastName: string;
      nationalId: string;
      classId: number;
      parentId?: string;
      parentName?: string;
      parentPhoneNumber?: string;
      academicYearId?: number;
      schoolCode?: string;
    },
    schoolCode?: string
  ): Promise<Student> {
    const concludedParent = `${data.secondName.trim()} ${data.thirdName.trim()} ${data.lastName.trim()}`.trim();
    const finalParentName = data.parentName?.trim() || (concludedParent || undefined);
    const headers = schoolCode ? { 'X-School-Code': schoolCode } : undefined;
    return await apiClient.post<Student>('/Students/create-with-enrollment', {
      ...data,
      parentName: finalParentName,
      parentPhoneNumber: data.parentPhoneNumber?.trim() || undefined,
    }, {
      headers,
      params: schoolCode ? { schoolCode } : undefined,
    });
  },

  async updateStudentDetails(
    studentId: number,
    data: {
      firstName: string;
      secondName: string;
      thirdName: string;
      lastName: string;
      nationalId: string;
      parentName?: string;
      parentPhoneNumber?: string;
    }
  ): Promise<Student> {
    const concludedParent = `${data.secondName.trim()} ${data.thirdName.trim()} ${data.lastName.trim()}`.trim();
    const finalParentName = data.parentName?.trim() || (concludedParent || undefined);
    return await apiClient.put<Student>(`/Students/${studentId}/details`, {
      ...data,
      parentName: finalParentName,
      parentPhoneNumber: data.parentPhoneNumber?.trim() || undefined,
    });
  },
};
