
import { apiClient } from '../../../shared/lib/apiClient';
import type {
  Student,
  ClassEnrollment,
  PagedResult,
} from '../../../shared/types';
import { schoolsApi } from '../../schools/api/schoolsApi';

// Convert empty or whitespace-only values into null.
const normalizeNullableText = (
  value?: string | null
): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

// Resolve parent name from explicit input or student's name.
const resolveParentName = (
  secondName: string,
  thirdName: string,
  lastName: string,
  parentName?: string | null
): string | undefined => {
  const explicitName = parentName?.trim();

  if (explicitName) {
    return explicitName;
  }

  const fallbackName =
    `${secondName.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim();

  return fallbackName || undefined;
};

export const studentsApi = {
  async getAllStudents(search?: string): Promise<Student[]> {
    return await apiClient.get<Student[]>('/Students', { search });
  },

  async getStudentsCount(): Promise<number> {
    try {
      const res = await apiClient.get<number>('/Students/count');
      return typeof res === 'number' ? res : 0;
    } catch {
      return 0;
    }
  },

  async appendStudent(studentData: {
    firstName: string;
    secondName: string;
    thirdName: string;
    lastName: string;
    nationalId: string | null;
    parentName?: string | null;
    parentPhoneNumber?: string | null;
  }): Promise<Student> {
    const finalParentName = resolveParentName(
      studentData.secondName,
      studentData.thirdName,
      studentData.lastName,
      studentData.parentName
    );

    return await apiClient.post<Student>('/Students', {
      ...studentData,
      nationalId: normalizeNullableText(studentData.nationalId),
      parentName: finalParentName,
      parentPhoneNumber: normalizeNullableText(
        studentData.parentPhoneNumber
      ),
    });
  },

  async createStudent(
    studentData: {
      firstName: string;
      secondName: string;
      thirdName: string;
      lastName: string;
      nationalId: string | null;
      parentName?: string | null;
      parentPhoneNumber?: string | null;
    },
    classId: number,
    academicYearId: number = 1
  ): Promise<ClassEnrollment> {
    const finalParentName = resolveParentName(
      studentData.secondName,
      studentData.thirdName,
      studentData.lastName,
      studentData.parentName
    );

    const normalizedPhone = normalizeNullableText(
      studentData.parentPhoneNumber
    );

    // Create Student and Enrollment through one backend operation.
    const student = await apiClient.post<Student>(
      '/Students/create-with-enrollment',
      {
        ...studentData,
        nationalId: normalizeNullableText(studentData.nationalId),
        parentName: finalParentName,
        parentPhoneNumber: normalizedPhone,
        classId,
        academicYearId,
      }
    );

    const finalParentPhone =
      student.parentPhoneNumber ?? normalizedPhone;

    const finalResolvedParentName =
      student.parentName ?? finalParentName ?? null;

    return {
      enrollmentId: student.enrollmentId || student.studentId,
      studentId: student.studentId,
      classId: student.classId ?? classId,
      academicYearId: academicYearId,
      isRepresentative: false,
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
      studentName: student.fullName,
      nationalId: student.nationalId,
      classNumber: student.classNumber,
      className: student.className ?? `شعبة ${classId}`,
      parentName: finalResolvedParentName,
      parentPhoneNumber: finalParentPhone,
      student: {
        ...student,
        parentName: finalResolvedParentName,
        parentPhoneNumber: finalParentPhone,
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
      nationalId: string | null;
    }
  ): Promise<void> {
    await apiClient.put(`/Students/${studentId}`, {
      ...studentData,
      nationalId: normalizeNullableText(studentData.nationalId),
    });
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
    const code = schoolCode || (
      await schoolsApi.getDefaultSchoolCode()
    );

    return await apiClient.get<PagedResult<Student>>(
      `/Students/by-school/${code}`,
      params
    );
  },

  async createStudentWithEnrollment(
    data: {
      firstName: string;
      secondName: string;
      thirdName: string;
      lastName: string;
      nationalId: string | null;
      classId: number;
      parentId?: string | null;
      parentName?: string | null;
      parentPhoneNumber?: string | null;
      academicYearId?: number;
    }
  ): Promise<Student> {
    const finalParentName = resolveParentName(
      data.secondName,
      data.thirdName,
      data.lastName,
      data.parentName
    );

    return await apiClient.post<Student>(
      '/Students/create-with-enrollment',
      {
        ...data,
        nationalId: normalizeNullableText(data.nationalId),
        parentName: finalParentName,
        parentPhoneNumber: normalizeNullableText(
          data.parentPhoneNumber
        ),
      }
    );
  },

  async updateStudentDetails(
    studentId: number,
    data: {
      firstName: string;
      secondName: string;
      thirdName: string;
      lastName: string;
      nationalId: string | null;
      parentName?: string | null;
      parentPhoneNumber?: string | null;
    }
  ): Promise<Student> {
    const finalParentName = resolveParentName(
      data.secondName,
      data.thirdName,
      data.lastName,
      data.parentName
    );

    return await apiClient.put<Student>(
      `/Students/${studentId}/details`,
      {
        ...data,
        nationalId: normalizeNullableText(data.nationalId),
        parentName: finalParentName,
        parentPhoneNumber: normalizeNullableText(
          data.parentPhoneNumber
        ),
      }
    );
  },
};
