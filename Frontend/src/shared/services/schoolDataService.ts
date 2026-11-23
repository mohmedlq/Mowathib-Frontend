import { apiClient } from '../lib/apiClient';
import type {
  AcademicYear,
  ClassItem,
  Student,
  ClassEnrollment,
  AttendanceWeek,
  AttendanceRecord,
  Representative,
  CardRequest,
  Parent,
  BackendAttendanceStatus,
  CardRequestStatus,
  WeeklyAttendanceSummary,
  DailyAttendanceSummary,
  PagedResult,
  AbsenteeNotification,
  ParentNotification,
  GenerateNotificationsResponse,
  School,
  AttendanceClerk,
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

  async deleteClass(classId: number): Promise<void> {
    await apiClient.delete(`/Classes/${classId}`);
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

  async updateAttendanceWeek(
    id: number,
    data: {
      academicYearId: number;
      weekNumber: number;
      startDate: string;
      endDate: string;
    }
  ): Promise<void> {
    await apiClient.put(`/AttendanceWeeks/${id}`, data);
  },

  async deleteAttendanceWeek(id: number): Promise<void> {
    await apiClient.delete(`/AttendanceWeeks/${id}`);
  },

  // ==========================================
  // STUDENTS & ENROLLMENTS (Connected to StudentsController & ClassEnrollmentsController)
  // ==========================================
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

    // Populate student field if not populated directly, and map className
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

  async removeStudentFromClass(enrollmentId: number): Promise<void> {
    await apiClient.put(`/ClassEnrollments/${enrollmentId}/deactivate`, null, {
      params: { endDate: new Date().toISOString().split('T')[0] },
    });
  },

  // ==========================================
  // ATTENDANCE RECORDS (Connected to AttendanceRecordsController)
  // ==========================================
  async getPagedAttendanceRecords(params: {
    pageNumber?: number;
    pageSize?: number;
    classId?: number;
    attendanceWeekId?: number;
    date?: string;
    status?: BackendAttendanceStatus;
    search?: string;
  }): Promise<PagedResult<AttendanceRecord>> {
    return await apiClient.get<PagedResult<AttendanceRecord>>('/AttendanceRecords/paged', params);
  },

  async getPagedAbsentees(params: {
    date: string;
    classId?: number;
    search?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PagedResult<AbsenteeNotification>> {
    return await apiClient.get<PagedResult<AbsenteeNotification>>('/AttendanceRecords/absentees/paged', params);
  },

  async getAttendanceRecords(classId: number, attendanceWeekId: number): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-class-and-week', {
      classId,
      attendanceWeekId,
    });
  },

  async getAttendanceRecordsByWeek(attendanceWeekId: number): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-week', {
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
    attendanceWeekId?: number;
    dayNumber?: number;
    attendanceDate?: string;
    status: BackendAttendanceStatus;
  }): Promise<AttendanceRecord> {
    return await apiClient.post<AttendanceRecord>('/AttendanceRecords', record);
  },

  async saveBulkAttendance(data: {
    attendanceWeekId?: number;
    dayNumber?: number;
    attendanceDate?: string;
    records: Array<{ enrollmentId: number; status: BackendAttendanceStatus }>;
  }): Promise<number> {
    return await apiClient.post<number>('/AttendanceRecords/bulk', data);
  },

  async getAttendanceRecordsByDay(
    classId: number,
    attendanceWeekId: number,
    dayNumber: number
  ): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-day', {
      classId,
      attendanceWeekId,
      dayNumber,
    });
  },

  async getAttendanceRecordsByDate(date: string, classId?: number): Promise<AttendanceRecord[]> {
    return await apiClient.get<AttendanceRecord[]>('/AttendanceRecords/by-date', {
      date,
      classId,
    });
  },

  async getAbsenteesByDate(date: string, classId?: number): Promise<any[]> {
    return await apiClient.get<any[]>('/AttendanceRecords/absentees', {
      date,
      classId,
    });
  },

  async getDailyAttendanceSummary(date: string, classId?: number): Promise<DailyAttendanceSummary> {
    return await apiClient.get<DailyAttendanceSummary>('/AttendanceRecords/summary/daily', {
      date,
      classId,
    });
  },

  // ==========================================
  // REPRESENTATIVES (Connected to RepresentativesController)
  // ==========================================
  async getPagedRepresentatives(params: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    classId?: number;
    activeOnly?: boolean;
    role?: string;
    schoolCode?: string;
  }): Promise<PagedResult<Representative>> {
    return await apiClient.get<PagedResult<Representative>>('/Representatives/paged', params);
  },

  async toggleRepresentativeStatus(representativeId: number, isActive: boolean): Promise<{ success: boolean; isActive: boolean }> {
    return await apiClient.put<{ success: boolean; isActive: boolean }>(`/Representatives/${representativeId}/status`, { isActive });
  },

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

  // ==========================================
  // PARENTS (Connected to ParentsController)
  // ==========================================
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

  // ==========================================
  // PARENT NOTIFICATIONS (Connected to ParentNotificationsController)
  // ==========================================
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

  // ==========================================
  // SCHOOLS (Connected to SchoolsController)
  // ==========================================
  async getSchoolByCode(schoolCode: string): Promise<School> {
    return await apiClient.get<School>(`/Schools/by-code/${schoolCode}`);
  },

  async getSchoolForAdmin(adminId: number): Promise<School> {
    return await apiClient.get<School>(`/Schools/for-admin/${adminId}`);
  },

  async getDefaultSchoolCode(): Promise<string> {
    return await apiClient.get<string>('/Schools/default-code');
  },

  async updateSchool(schoolCode: string, data: { name: string; isActive: boolean }): Promise<School> {
    return await apiClient.put<School>(`/Schools/${schoolCode}`, data);
  },

  // ==========================================
  // ADMIN PROFILE (Connected to AdminsController)
  // ==========================================
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

  // ==========================================
  // ATTENDANCE CLERKS (Connected to AttendanceClerksController)
  // ==========================================
  async getAttendanceClerksPaged(params: {
    schoolCode?: string;
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    activeOnly?: boolean;
  }): Promise<PagedResult<AttendanceClerk>> {
    return await apiClient.get<PagedResult<AttendanceClerk>>('/AttendanceClerks/paged', params);
  },

  async createAttendanceClerk(
    data: { studentId: number; username: string; password: string; access?: string },
    schoolCode?: string
  ): Promise<AttendanceClerk> {
    const headers = schoolCode ? { 'X-School-Code': schoolCode } : undefined;
    return await apiClient.post<AttendanceClerk>('/AttendanceClerks', data, {
      headers,
      params: schoolCode ? { schoolCode } : undefined,
    });
  },

  async toggleClerkStatus(
    clerkId: number,
    isActive: boolean,
    schoolCode?: string
  ): Promise<{ success: boolean; isActive: boolean }> {
    const headers = schoolCode ? { 'X-School-Code': schoolCode } : undefined;
    return await apiClient.put<{ success: boolean; isActive: boolean }>(
      `/AttendanceClerks/${clerkId}/status`,
      { isActive },
      {
        headers,
        params: schoolCode ? { schoolCode } : undefined,
      }
    );
  },

  async updateAttendanceClerk(
    clerkId: number,
    data: { username?: string; password?: string; isActive?: boolean; access?: string },
    schoolCode?: string
  ): Promise<AttendanceClerk> {
    const headers = schoolCode ? { 'X-School-Code': schoolCode } : undefined;
    return await apiClient.put<AttendanceClerk>(
      `/AttendanceClerks/${clerkId}`,
      data,
      {
        headers,
        params: schoolCode ? { schoolCode } : undefined,
      }
    );
  },

  // ==========================================
  // SCHOOL-SCOPED STUDENTS & CLASSES
  // ==========================================
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
    const code = schoolCode || (await this.getDefaultSchoolCode());
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

  async getClassesBySchool(schoolCode: string): Promise<ClassItem[]> {
    const raw = await apiClient.get<any[]>(`/Classes/by-school/${schoolCode}`);
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
};
