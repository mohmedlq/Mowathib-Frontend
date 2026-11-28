import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { academicYearsApi } from '../../academic-years/api/academicYearsApi';
import type {
  ClassEnrollment,
  AttendanceRecord,
  AttendanceStatus,
} from '../../../shared/types';
import { SCHOOL_DAYS } from '../../../shared/types';
import { Button } from '../../../shared/components/ui/Button';
import { AttendanceProgressSummary } from './AttendanceProgressSummary';
import { Dialog, DialogFooter } from '../../../shared/components/ui/Dialog';
import { PaginationControls } from '../../../shared/components/ui/PaginationControls';
import { Search, CheckCircle2, Save, AlertTriangle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface StatusVisual {
  label: string;
  rowBg: string;
  rowHover: string;
  borderAccent: string;
  badgeStyle: string;
  pillStyle: string;
  selectedBtn: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, StatusVisual> = {
  Present: {
    label: 'حاضر',
    rowBg: 'bg-[#EAF6EE] dark:bg-[#143224]',
    rowHover: 'hover:bg-[#DFEFE5] dark:hover:bg-[#183B2B]',
    borderAccent: 'border-r-4 border-r-[#176B3A] dark:border-r-[#3E9B78]',
    badgeStyle: 'bg-[#D2EBD9] text-[#135A31] dark:bg-[#1B4D35] dark:text-[#86E0A9]',
    pillStyle:
      'bg-[#D2EBD9]/80 text-[#135A31] border-[#9FD3B0] dark:bg-[#1B4D35]/80 dark:text-[#86E0A9] dark:border-[#28704D]',
    selectedBtn:
      'bg-[#D7EEDB] dark:bg-[#1B4D35] text-[#135A31] dark:text-[#86E0A9] border-[#9FD3B0] dark:border-[#28704D] shadow-2xs ring-2 ring-[#176B3A]/30 dark:ring-[#3E9B78]/40 font-black',
  },
  Absent: {
    label: 'غائب',
    rowBg: 'bg-[#FDECEC] dark:bg-[#2D1619]',
    rowHover: 'hover:bg-[#F9DADA] dark:hover:bg-[#381B1F]',
    borderAccent: 'border-r-4 border-r-[#A61B1B] dark:border-r-[#F87171]',
    badgeStyle: 'bg-[#FCD8D8] text-[#991B1B] dark:bg-[#481D22] dark:text-[#FCA5A5]',
    pillStyle:
      'bg-[#FCD8D8]/80 text-[#991B1B] border-[#F8AAAA] dark:bg-[#481D22]/80 dark:text-[#FCA5A5] dark:border-[#6B2A30]',
    selectedBtn:
      'bg-[#FCE2E2] dark:bg-[#481D22] text-[#991B1B] dark:text-[#FCA5A5] border-[#F8AAAA] dark:border-[#6B2A30] shadow-2xs ring-2 ring-[#991B1B]/30 dark:ring-[#F87171]/40 font-black',
  },
  Discontinued: {
    label: 'منقطع',
    rowBg: 'bg-[#FFF6E5] dark:bg-[#2E2211]',
    rowHover: 'hover:bg-[#FDE8BE] dark:hover:bg-[#3B2B16]',
    borderAccent: 'border-r-4 border-r-[#B45309] dark:border-r-[#FBBF24]',
    badgeStyle: 'bg-[#FDEBB6] text-[#92400E] dark:bg-[#4A3515] dark:text-[#FDE047]',
    pillStyle:
      'bg-[#FDEBB6]/80 text-[#92400E] border-[#FCD34D] dark:bg-[#4A3515]/80 dark:text-[#FDE047] dark:border-[#714F1C]',
    selectedBtn:
      'bg-[#FDE68A]/70 dark:bg-[#4A3515] text-[#92400E] dark:text-[#FDE047] border-[#FCD34D] dark:border-[#714F1C] shadow-2xs ring-2 ring-[#B45309]/30 dark:ring-[#FBBF24]/40 font-black',
  },
  Unmarked: {
    label: 'غير محدد',
    rowBg: 'bg-[#F4F6F8] dark:bg-[#1A2429]',
    rowHover: 'hover:bg-[#EAEFF2] dark:hover:bg-[#202D33]',
    borderAccent: 'border-r-4 border-r-[#8C9BA5] dark:border-r-[#566874]',
    badgeStyle: 'bg-[#DFE5E9] text-[#37454D] dark:bg-[#2C3A41] dark:text-[#D1DCE2]',
    pillStyle:
      'bg-[#DFE5E9]/80 text-[#37454D] border-[#B8C4CC] dark:bg-[#2C3A41]/80 dark:text-[#D1DCE2] dark:border-[#52646E]',
    selectedBtn:
      'bg-[#DFE4E8] dark:bg-[#324047] text-[#2D3B43] dark:text-[#E6EDF2] border-[#B8C4CC] dark:border-[#52646E] shadow-2xs ring-2 ring-[#8C9BA5]/30 dark:ring-[#6E818D]/40 font-black',
  },
};

const UNSELECTED_BTN_CLASS =
  'bg-white/90 dark:bg-[#162227]/90 text-[#4F5D65] dark:text-[#A4B5BD] border-[#D0D9DE] dark:border-[#2C3E46] hover:bg-white dark:hover:bg-[#1F2E35] hover:text-[#17252B] dark:hover:text-[#F0F4F6] hover:border-[#9BAAB1] dark:hover:border-[#425862] font-semibold';

export interface QuickAttendancePanelProps {
  classNameTitle: number | string;
  attendanceWeekId?: number;
  weekNumber: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  enrollments: ClassEnrollment[];
  records: AttendanceRecord[];
  onSaveSlot: (
    dayNumber: number,
    changes: Array<{ enrollmentId: number; status: AttendanceStatus }>
  ) => Promise<void>;
  isSaving?: boolean;
}

export function QuickAttendancePanel({
  classNameTitle,
  attendanceWeekId,
  weekNumber,
  selectedDay,
  onSelectDay,
  enrollments,
  records,
  onSaveSlot,
  isSaving = false,
}: QuickAttendancePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmBulkOpen, setIsConfirmBulkOpen] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => academicYearsApi.getActiveAcademicYear(),
  });
  const academicYearName = activeYear?.yearName || '1448-1449هـ';

  // Local draft status for the currently selected day (enrollmentId -> AttendanceStatus)
  const [localStatuses, setLocalStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset unsaved drafts when switching weeks
  useEffect(() => {
    setLocalStatuses({});
    setHasUnsavedChanges(false);
  }, [attendanceWeekId, weekNumber]);

  // Map of saved backend records for the selected week and day
  const serverSlotStatuses = useMemo(() => {
    const map: Record<number, AttendanceStatus> = {};
    records.forEach((r) => {
      if (
        (attendanceWeekId === undefined || r.attendanceWeekId === attendanceWeekId) &&
        r.dayNumber === selectedDay
      ) {
        map[r.enrollmentId] = r.status as AttendanceStatus;
      }
    });
    return map;
  }, [records, attendanceWeekId, selectedDay]);

  // Effective statuses: saved records merged with local uncommitted edits
  const effectiveStatuses = useMemo(() => {
    const result: Record<number, AttendanceStatus> = {};
    enrollments.forEach((e) => {
      result[e.enrollmentId] =
        localStatuses[e.enrollmentId] !== undefined
          ? localStatuses[e.enrollmentId]
          : serverSlotStatuses[e.enrollmentId] || 'Unmarked';
    });
    return result;
  }, [enrollments, localStatuses, serverSlotStatuses]);

  // Aggregate stats
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let discontinued = 0;
    let unmarked = 0;

    enrollments.forEach((e) => {
      const st = effectiveStatuses[e.enrollmentId] || 'Unmarked';
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Discontinued') discontinued++;
      else unmarked++;
    });

    return {
      total: enrollments.length,
      present,
      absent,
      discontinued,
      unmarked,
    };
  }, [enrollments, effectiveStatuses]);

  // Update one student's status
  const handleStatusChange = (enrollmentId: number, newStatus: AttendanceStatus) => {
    setLocalStatuses((prev) => ({
      ...prev,
      [enrollmentId]: newStatus,
    }));
    setHasUnsavedChanges(true);
  };

  // One-click: Mark All Students Present
  const handleMarkAllPresent = () => {
    const nonPresentCount = enrollments.filter((e) => {
      const curr = effectiveStatuses[e.enrollmentId];
      return curr === 'Absent' || curr === 'Discontinued';
    }).length;

    if (nonPresentCount > 0) {
      setIsConfirmBulkOpen(true);
    } else {
      applyBulkPresent();
    }
  };

  const applyBulkPresent = () => {
    const next: Record<number, AttendanceStatus> = {};
    enrollments.forEach((e) => {
      next[e.enrollmentId] = 'Present';
    });
    setLocalStatuses(next);
    setHasUnsavedChanges(true);
    setIsConfirmBulkOpen(false);
  };

  // Save changes to backend
  const handleSave = async () => {
    const changes: Array<{ enrollmentId: number; status: AttendanceStatus }> = [];

    enrollments.forEach((e) => {
      const st = effectiveStatuses[e.enrollmentId];
      const hadServerRecord = serverSlotStatuses[e.enrollmentId] !== undefined;
      if (st && (st !== 'Unmarked' || hadServerRecord)) {
        changes.push({
          enrollmentId: e.enrollmentId,
          status: st,
        });
      }
    });

    if (changes.length === 0) {
      setHasUnsavedChanges(false);
      setLocalStatuses({});
      return;
    }

    try {
      await onSaveSlot(selectedDay, changes);
      setHasUnsavedChanges(false);
      setLocalStatuses({});
    } catch {
      // Preserve unsaved changes on failure; error notification is handled by the mutation
    }
  };

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return enrollments;
    const q = searchQuery.toLowerCase();
    return enrollments.filter(
      (e) =>
        e.studentName?.toLowerCase().includes(q) ||
    (e.student?.nationalId??"").includes(q)
    );
  }, [enrollments, searchQuery]);

  const totalCount = filteredStudents.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, pageNumber, pageSize]);

  const currentDayName = SCHOOL_DAYS.find((d) => d.dayNumber === selectedDay)?.nameAr || '';

  return (
    <div className="space-y-4">
      {/* Header Context Bar */}
      <div className="bg-white dark:bg-[#152126] p-4 sm:p-5 rounded-2xl border border-[#DCE3E6] dark:border-[#27383F] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-xl text-[#17252B] dark:text-[#F0F4F6] tracking-tight">{classNameTitle}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E8F1F1] dark:bg-[#18353B] text-[#0B5D43] dark:text-[#4DB4C2] font-bold border border-[#CDE0E2] dark:border-[#234D56]">
              {academicYearName}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEF2F3] dark:bg-[#1E2C32] text-[#4A555C] dark:text-[#A7B8C0] font-bold border border-[#DCE3E6] dark:border-[#2C3E46]">
              الأسبوع {weekNumber}
            </span>
          </div>
          <p className="text-xs text-[#5F6B73] dark:text-[#95A7AF] mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span>التحضير السريع لليوم الدراسي:</span>
            <span className="font-bold text-[#0B5D43] dark:text-[#3E9B78]">{currentDayName}</span>
          </p>
        </div>

        {/* Primary Action: Mark All Present & Save */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <Button
            type="button"
            variant="success"
            size="md"
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={handleMarkAllPresent}
            className="shadow-xs font-bold flex-1 md:flex-initial justify-center"
          >
            تحضير الكل حاضر
          </Button>

          <Button
            type="button"
            variant={hasUnsavedChanges ? 'primary' : 'secondary'}
            size="md"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!hasUnsavedChanges && !isSaving}
            className={cn(
              'shadow-xs font-bold flex-1 md:flex-initial justify-center transition-all',
              hasUnsavedChanges
                ? 'ring-2 ring-[#0B5D43]/30 dark:ring-[#3E9B78]/40 shadow-sm'
                : 'text-[#5F6B73] dark:text-[#95A7AF]'
            )}
          >
            {hasUnsavedChanges ? 'حفظ التغييرات' : 'تم الحفظ'}
          </Button>
        </div>
      </div>

      {/* Navigation Controls: School Days Selector */}
      <div className="bg-white dark:bg-[#152126] p-4 sm:p-5 rounded-2xl border border-[#DCE3E6] dark:border-[#27383F] space-y-3.5 shadow-xs transition-colors">
        <div>
          <span className="text-xs font-bold text-[#5F6B73] dark:text-[#95A7AF] block mb-2">اختر اليوم الدراسي:</span>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {SCHOOL_DAYS.map((day) => {
              const isSelected = day.dayNumber === selectedDay;
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => {
                    onSelectDay(day.dayNumber);
                    setHasUnsavedChanges(false);
                    setLocalStatuses({});
                    setPageNumber(1);
                  }}
                  className={cn(
                    'min-h-[40px] py-1.5 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border truncate flex items-center justify-center active:scale-95 select-none',
                    isSelected
                      ? 'bg-[#0B5D43] dark:bg-[#107052] text-white border-[#0B5D43] dark:border-[#107052] shadow-xs ring-2 ring-[#0B5D43]/20 dark:ring-[#107052]/30'
                      : 'bg-[#F5F8F9] dark:bg-[#1A262C] text-[#4F5B62] dark:text-[#A4B5BD] border-[#DCE3E6] dark:border-[#2B3B42] hover:bg-[#EDF2F4] dark:hover:bg-[#22323A] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
                  )}
                >
                  {day.nameAr}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress & Live Counting Bar */}
      <AttendanceProgressSummary
        totalStudents={counts.total}
        presentCount={counts.present}
        absentCount={counts.absent}
        discontinuedCount={counts.discontinued}
        unmarkedCount={counts.unmarked}
        label={`إحصائيات تحضير ${currentDayName}`}
      />

      {/* Student List & Status Modification Grid */}
      <div className="bg-white dark:bg-[#152126] rounded-2xl border border-[#DCE3E6] dark:border-[#27383F] overflow-hidden shadow-xs transition-colors">
        {/* Search header inside table container */}
        <div className="p-3 sm:p-4 border-b border-[#EEF2F3] dark:border-[#24343B] bg-[#F8FAFB] dark:bg-[#18252B] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageNumber(1);
              }}
              placeholder="بحث باسم الطالب أو رقم الهوية الوطنية..."
              className="w-full h-9 pr-9 pl-3 text-xs bg-white dark:bg-[#111A1E] border border-[#DCE3E6] dark:border-[#28373D] text-[#17252B] dark:text-[#F0F4F6] rounded-lg focus:border-[#0B5D43] dark:focus:border-[#3E9B78] outline-none transition-all placeholder:text-[#89949A] dark:placeholder:text-[#6E7F87]"
            />
            <Search className="w-4 h-4 text-[#89949A] dark:text-[#6E7F87] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs text-[#5F6B73] dark:text-[#95A7AF] font-mono">
              عرض {filteredStudents.length} من أصل {enrollments.length} طالب
            </span>
          </div>
        </div>

        {/* Student Rows List */}
        <div className="divide-y divide-[#EEF2F3] dark:divide-[#24343B] max-h-[600px] overflow-y-auto">
          {paginatedStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#89949A] dark:text-[#6E7F87]">
              لا يوجد طلاب مطابقون لبحثك
            </div>
          ) : (
            paginatedStudents.map((enrollment, index) => {
              const currentStatus = effectiveStatuses[enrollment.enrollmentId] || 'Unmarked';
              const config = STATUS_CONFIG[currentStatus];

              return (
                <div
                  key={enrollment.enrollmentId}
                  className={cn(
                    'p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                    config.rowBg,
                    config.rowHover,
                    config.borderAccent
                  )}
                >
                  {/* Student Basic Info */}
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 text-[#5F6B73] dark:text-[#95A7AF] text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                      {(pageNumber - 1) * pageSize + index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-[#17252B] dark:text-[#F0F4F6]">
                          {enrollment.studentName}
                        </span>
                        {(enrollment.className || enrollment.classNumber) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#E8F1F1] dark:bg-[#18353B] text-[#0B5D43] dark:text-[#4DB4C2] border border-[#CDE0E2] dark:border-[#234D56]">
                            {enrollment.className || `شعبة ${enrollment.classNumber}`}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors',
                            config.pillStyle
                          )}
                        >
                          {config.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#5F6B73] dark:text-[#95A7AF] block mt-0.5">
                        الهوية: {enrollment.student?.nationalId || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="grid grid-cols-4 sm:flex items-center gap-1.5 w-full sm:w-auto">
                    {(['Present', 'Absent', 'Discontinued', 'Unmarked'] as AttendanceStatus[]).map((statusKey) => {
                      const isSelected = currentStatus === statusKey;
                      const btnConf = STATUS_CONFIG[statusKey];

                      return (
                        <button
                          key={statusKey}
                          type="button"
                          onClick={() => handleStatusChange(enrollment.enrollmentId, statusKey)}
                          className={cn(
                            'h-8 px-2 sm:px-3 text-xs rounded-lg border transition-all cursor-pointer select-none active:scale-95 truncate flex items-center justify-center',
                            isSelected ? btnConf.selectedBtn : UNSELECTED_BTN_CLASS
                          )}
                        >
                          {btnConf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalCount > pageSize && (
          <div className="border-t border-[#EEF2F3] dark:border-[#24343B]">
            <PaginationControls
              pageNumber={pageNumber}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={(page) => setPageNumber(page)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPageNumber(1);
              }}
              itemLabel="طالب"
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Overwriting Absent/Discontinued on Bulk Mark Present */}
      <Dialog
        isOpen={isConfirmBulkOpen}
        onClose={() => setIsConfirmBulkOpen(false)}
        title="تأكيد التحضير الجماعي"
        maxWidth="md"
      >
        <div className="space-y-3 py-2 text-right">
          <div className="flex items-center gap-2.5 text-[#B45309] dark:text-[#FBBF24]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-bold">تنبيه بشأن الطلاب المسجلين كغائبين أو منقطعين</span>
          </div>
          <p className="text-xs text-[#5F6B73] dark:text-[#95A7AF] leading-relaxed">
            يوجد طلاب مسجلين كـ <strong>غائب</strong> أو <strong>منقطع</strong> في هذا اليوم. اختيارك
            لـ "تحضير الكل كحاضر" سيقوم بتغيير حالة جميع طلاب الشعبة إلى <strong>حاضر</strong> وإلغاء حالات
            الغياب السابقة لهذا اليوم. هل تود الاستمرار وتطبيق التحضير على الجميع؟
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setIsConfirmBulkOpen(false)}
          >
            إلغاء التراجع
          </Button>
          <Button
            type="button"
            variant="success"
            size="md"
            onClick={applyBulkPresent}
          >
            نعم، تحضير الجميع كحاضر
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default QuickAttendancePanel;
