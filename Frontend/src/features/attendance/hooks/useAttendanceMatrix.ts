import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../shared/services/schoolDataService';
import type { StudentWeeklyAttendance } from '../types/attendance.types';
import type { AttendanceStatus, BackendAttendanceStatus } from '../../../shared/types';
import { SCHOOL_DAYS, SCHOOL_PERIODS } from '../../../shared/types';
import { useNotifications } from '../../notifications';

export function useAttendanceMatrix(classId: number, attendanceWeekId: number) {
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  // Fetch enrollments
  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(classId),
    enabled: classId > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch records
  const recordsQuery = useQuery({
    queryKey: ['attendance_records', classId, attendanceWeekId],
    queryFn: () => schoolDataService.getAttendanceRecords(classId, attendanceWeekId),
    enabled: classId > 0 && attendanceWeekId > 0,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Build matrix
  const matrix: StudentWeeklyAttendance[] = (enrollmentsQuery.data || []).map((en) => {
    const slots: Record<number, Record<number, { status: AttendanceStatus; recordId?: number }>> = {};
    let present = 0;
    let absent = 0;
    let discontinued = 0;
    let unmarked = 0;

    SCHOOL_DAYS.forEach((day) => {
      slots[day.dayNumber] = {};
      SCHOOL_PERIODS.forEach((p) => {
        const match = (recordsQuery.data || []).find(
          (r) =>
            r.enrollmentId === en.enrollmentId &&
            r.dayNumber === day.dayNumber &&
            r.periodNumber === p
        );

        if (match) {
          slots[day.dayNumber][p] = { status: match.status, recordId: match.attendanceRecordId };
          if (match.status === 'Present') present++;
          else if (match.status === 'Absent') absent++;
          else if (match.status === 'Discontinued') discontinued++;
        } else {
          slots[day.dayNumber][p] = { status: 'Unmarked' };
          unmarked++;
        }
      });
    });

    return {
      enrollment: en,
      slots,
      summary: { present, absent, discontinued, unmarked },
    };
  });

  // Calculate class overall weekly summary
  const overallSummary = matrix.reduce(
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

  // Mutation for saving a slot (either bulk or individual)
  const saveSlotMutation = useMutation({
    mutationFn: async ({
      dayNumber,
      periodNumber,
      changes,
    }: {
      dayNumber: number;
      periodNumber: number;
      changes: Array<{ enrollmentId: number; status: BackendAttendanceStatus }>;
    }) => {
      return await schoolDataService.saveBulkAttendance({
        attendanceWeekId,
        dayNumber,
        periodNumber,
        records: changes,
      });
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_records', classId, attendanceWeekId] });
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
    saveSlot: (dayNumber: number, periodNumber: number, changes: Array<{ enrollmentId: number; status: BackendAttendanceStatus }>) =>
      saveSlotMutation.mutateAsync({ dayNumber, periodNumber, changes }),
  };
}

