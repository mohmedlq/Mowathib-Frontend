import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../shared/services/schoolDataService';
import type { StudentWeeklyAttendance } from '../types/attendance.types';
import type { AttendanceStatus, AttendanceRecord, BackendAttendanceStatus } from '../../../shared/types';
import { SCHOOL_DAYS } from '../../../shared/types';
import { useNotifications } from '../../notifications';

export function useAttendanceMatrix(classId: number, attendanceWeekId?: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const isWeekReady = typeof attendanceWeekId === 'number' && attendanceWeekId > 0;

  // Fetch enrollments (parallel query)
  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(classId),
    enabled: classId > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  // Fetch records (parallel query, only when week is identified)
  const recordsQuery = useQuery({
    queryKey: ['attendance_records', classId, attendanceWeekId],
    queryFn: () => schoolDataService.getAttendanceRecords(classId, attendanceWeekId!),
    enabled: classId > 0 && isWeekReady,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  // Build matrix with O(1) indexed lookup & memoization
  const matrix: StudentWeeklyAttendance[] = useMemo(() => {
    const enrollments = enrollmentsQuery.data || [];
    const records = recordsQuery.data || [];

    const recordMap = new Map<string, AttendanceRecord>();
    for (const r of records) {
      recordMap.set(`${r.enrollmentId}:${r.dayNumber}`, r);
    }

    return enrollments.map((en) => {
      const slots: Record<number, { status: AttendanceStatus; recordId?: number; attendanceDate?: string }> = {};
      let present = 0;
      let absent = 0;
      let discontinued = 0;
      let unmarked = 0;

      SCHOOL_DAYS.forEach((day) => {
        const match = recordMap.get(`${en.enrollmentId}:${day.dayNumber}`);

        if (match) {
          slots[day.dayNumber] = {
            status: match.status,
            recordId: match.attendanceRecordId,
            attendanceDate: match.attendanceDate,
          };
          if (match.status === 'Present') present++;
          else if (match.status === 'Absent') absent++;
          else if (match.status === 'Discontinued') discontinued++;
        } else {
          slots[day.dayNumber] = { status: 'Unmarked' };
          unmarked++;
        }
      });

      return {
        enrollment: en,
        slots,
        summary: { present, absent, discontinued, unmarked },
      };
    });
  }, [enrollmentsQuery.data, recordsQuery.data]);

  // Calculate class overall weekly summary with memoization
  const overallSummary = useMemo(() => {
    return matrix.reduce(
      (acc, cur) => {
        acc.totalStudents++;
        acc.present += cur.summary.present;
        acc.absent += cur.summary.absent;
        acc.discontinued += cur.summary.discontinued;
        acc.unmarked += cur.summary.unmarked;
        return acc;
      },
      { totalStudents: 0, present: 0, absent: 0, discontinued: 0, unmarked: 0 }
    );
  }, [matrix]);

  // Mutation for saving daily attendance for a day
  const saveSlotMutation = useMutation({
    mutationFn: async ({
      dayNumber,
      changes,
    }: {
      dayNumber: number;
      changes: Array<{ enrollmentId: number; status: BackendAttendanceStatus }>;
      periodNumber?: number;
    }) => {
      if (!isWeekReady) {
        throw new Error('لم يتم تحديد الأسبوع الدراسي.');
      }
      if (dayNumber < 1 || dayNumber > 5) {
        throw new Error(`رقم اليوم ${dayNumber} غير صالح (يجب أن يكون بين 1 و 5).`);
      }
      return await schoolDataService.saveBulkAttendance({
        attendanceWeekId: attendanceWeekId!,
        dayNumber,
        records: changes,
      });
    },
    onSuccess: (count, variables) => {
      // Immediate optimistic update of the cache for zero UI lag
      queryClient.setQueryData<AttendanceRecord[]>(
        ['attendance_records', classId, attendanceWeekId],
        (prev = []) => {
          const map = new Map<string, AttendanceRecord>();
          for (const r of prev) {
            map.set(`${r.enrollmentId}:${r.dayNumber}`, r);
          }
          for (const ch of variables.changes) {
            const key = `${ch.enrollmentId}:${variables.dayNumber}`;
            const existing = map.get(key);
            if (existing) {
              map.set(key, { ...existing, status: ch.status });
            } else {
              map.set(key, {
                attendanceRecordId: -Date.now() - Math.floor(Math.random() * 1000),
                enrollmentId: ch.enrollmentId,
                attendanceWeekId: attendanceWeekId!,
                dayNumber: variables.dayNumber,
                status: ch.status,
              });
            }
          }
          return Array.from(map.values());
        }
      );

      queryClient.invalidateQueries({
        queryKey: ['attendance_records', classId, attendanceWeekId],
        exact: true,
      });
      toast.show(`تم حفظ تحضير ${count} طالب بنجاح`, 'success');
    },
    onError: () => {
      toast.show('حدث خطأ أثناء حفظ التحضير، يرجى المحاولة مرة أخرى', 'danger');
    },
  });

  return {
    matrix,
    overallSummary,
    enrollments: enrollmentsQuery.data || [],
    records: recordsQuery.data || [],
    isLoading: enrollmentsQuery.isLoading || recordsQuery.isLoading,
    isSaving: saveSlotMutation.isPending,
    saveSlot: (
      arg1: number,
      arg2: any,
      arg3?: any
    ) => {
      // Support both signatures:
      // 1. (dayNumber: number, changes: Array<{ enrollmentId, status }>)
      // 2. (dayNumber: number, periodNumber: number, changes: Array<{ enrollmentId, status }>)
      if (Array.isArray(arg2)) {
        return saveSlotMutation.mutateAsync({ dayNumber: arg1, changes: arg2 });
      } else {
        return saveSlotMutation.mutateAsync({ dayNumber: arg1, changes: arg3 || [] });
      }
    },
  };
}
