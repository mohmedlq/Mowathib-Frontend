import { apiClient } from '../lib/apiClient';
import { isValidPeriodForDay } from '../types';
import type {
  AcademicYear,
  ClassItem,
  Student,
  ClassEnrollment,
  AttendanceWeek,
  AttendanceRecord,
  Representative,
  CardRequest,
  BackendAttendanceStatus,
  CardRequestStatus,
  WeeklyAttendanceSummary,
} from '../types';

export const schoolDataService = {
  // ==========================================
  // ACADEMIC YEARS (Connected to AcademicYearsController)
  // ==========================================
  async getAcademicYears(): Promise<AcademicYear[]> {
    return await apiClient.get<AcademicYear[]>('/AcademicYears');
  },

  async getActiveAcademicYear(): Promise<AcademicYear> {
    return await apiClient.get<AcademicYear>('/AcademicYears/active');
  },

  async createAcademicYear(data: {
    yearName: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }): Promise<AcademicYear> {
    return await apiClient.post<AcademicYear>('/AcademicYears', data);
  },

  async setActiveAcademicYear(id: number): Promise<void> {
    await apiClient.put(`/AcademicYears/${id}/set-active`);
  },

  // ==========================================
  // CLASSES (Connected to ClassesController)
  // ==========================================
  async getClasses(academicYearId?: number): Promise<ClassItem[]> {
    const raw = await apiClient.get<any[]>('/Classes', { academicYearId });
    return (raw || []).map((c) => {
      const num = c.classNumber ?? c.classId;
      return {
        classId: c.classId,
        classNumber: num,
        className: c.className ?? num,
        academicYearId: c.academicYearId,
        totalCards: c.totalCards ?? 3,
      };
    });
  },

  async getClassById(classId: number): Promise<ClassItem> {
    const c = await apiClient.get<any>(`/Classes/${classId}`);
    const num = c?.classNumber ?? c?.classId ?? classId;
    return {
      classId: c?.classId ?? classId,
      classNumber: num,
      className: c?.className ?? num,
      academicYearId: c?.academicYearId ?? 1,
      totalCards: c?.totalCards ?? 3,
    };
  },

  async createClass(data: { className: string | number; classNumber?: number; academicYearId: number; totalCards: number }): Promise<ClassItem> {
    const num = Number(data.classNumber ?? data.className);
    return await apiClient.post<ClassItem>('/Classes', {
      classNumber: num,
      academicYearId: data.academicYearId,
      totalCards: data.totalCards,
    });
  },

  async updateClass(classId: number, data: { className: string | number; classNumber?: number; academicYearId: number; totalCards: number }): Promise<void> {
    const num = Number(data.classNumber ?? data.className);
    await apiClient.put(`/Classes/${classId}`, {
      classNumber: num,
      academicYearId: data.academicYearId,
      totalCards: data.totalCards,
    });
  },

  // ==========================================
  // ATTENDANCE WEEKS (Connected to AttendanceWeeksController)
  // ==========================================
  async getAttendanceWeeks(academicYearId?: number): Promise<AttendanceWeek[]> {
    return await apiClient.get<AttendanceWeek[]>('/AttendanceWeeks', { academicYearId });
  },

  async createAttendanceWeek(data: {
    academicYearId: number;
    weekNumber: number;
    startDate: string;
    endDate: string;
  }): Promise<AttendanceWeek> {
    return await apiClient.post<AttendanceWeek>('/AttendanceWeeks', data);
  },

  // ==========================================
  // STUDENTS & ENROLLMENTS (Connected to StudentsController & ClassEnrollmentsController)
  // ==========================================
  async getEnrollmentsByClass(classId: number, academicYearId: number = 1): Promise<ClassEnrollment[]> {
    const enrollments = await apiClient.get<any[]>('/ClassEnrollments/active-by-class', {
      classId,
      academicYearId,
    });

    // Populate student field if not populated directly, and map className
    return (enrollments || []).map((e) => ({
      ...e,
      classNumber: e.classNumber,
      className: e.className ?? e.classNumber ?? '',
      student: e.student || {
        studentId: e.studentId,
        firstName: '',
        secondName: '',
        thirdName: '',
        lastName: '',
        fullName: e.studentName || '',
        nationalId: (e as unknown as { nationalId?: string }).nationalId || '',
      },
    }));
  },

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

  async createStudent(
    studentData: {
      firstName: string;
      secondName: string;
      thirdName: string;
      lastName: string;
      nationalId: string;
    },
    classId: number,
    academicYearId: number = 1
  ): Promise<ClassEnrollment> {
    // 1. Create Student record
    const student = await apiClient.post<Student>('/Students', studentData);

    // 2. Enroll Student in Target Class
    const enrollment = await apiClient.post<ClassEnrollment>('/ClassEnrollments', {
      studentId: student.studentId,
      classId,
      academicYearId,
      isRepresentative: false,
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
    });

    return {
      ...enrollment,
      student,
      studentName: student.fullName,
    };
  },

  async removeStudentFromClass(enrollmentId: number): Promise<void> {
    await apiClient.put(`/ClassEnrollments/${enrollmentId}/deactivate`, null, {
      params: { endDate: new Date().toISOString().split('T')[0] },
    });
  },

  // ==========================================
  // ATTENDANCE RECORDS (Connected to AttendanceRecordsController)
  // ==========================================
  async getAttendanceRecords(classId: number, attendanceWeekId: number): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-class-and-week', {
      classId,
      attendanceWeekId,
    });
  },

  async getWeeklyClassSummary(classId: number, attendanceWeekId: number): Promise<WeeklyAttendanceSummary> {
    return await apiClient.get<WeeklyAttendanceSummary>('/AttendanceRecords/summary/by-class-and-week', {
      classId,
      attendanceWeekId,
    });
  },

  async saveSingleAttendanceRecord(record: {
    enrollmentId: number;
    attendanceWeekId: number;
    dayNumber: number;
    periodNumber: number;
    status: BackendAttendanceStatus;
  }): Promise<AttendanceRecord> {
    return await apiClient.post<AttendanceRecord>('/AttendanceRecords', record);
  },

  async saveBulkAttendance(data: {
    attendanceWeekId: number;
    dayNumber: number;
    periodNumber: number;
    records: Array<{ enrollmentId: number; status: BackendAttendanceStatus }>;
  }): Promise<number> {
    if (!isValidPeriodForDay(data.dayNumber, data.periodNumber)) {
      throw new Error(`الحصة ${data.periodNumber} غير متاحة في هذا اليوم.`);
    }
    return await apiClient.post<number>('/AttendanceRecords/bulk', data);
  },

  // ==========================================
  // REPRESENTATIVES (Connected to RepresentativesController)
  // ==========================================
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

  // ==========================================
  // CARD REQUESTS (Connected to CardRequestsController)
  // ==========================================
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
