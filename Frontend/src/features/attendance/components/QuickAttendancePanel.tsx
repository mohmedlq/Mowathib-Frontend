import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../shared/services/schoolDataService';
import type {
  ClassEnrollment,
  AttendanceRecord,
  AttendanceStatus,
  BackendAttendanceStatus,
} from '../../../shared/types';
import {
  SCHOOL_DAYS,
  getPeriodsForDay,
  getPeriodsCountForDay,
  isValidPeriodForDay,
} from '../../../shared/types';
import { Button } from '../../../shared/components/ui/Button';
import { AttendanceProgressSummary } from './AttendanceProgressSummary';
import { Dialog, DialogFooter } from '../../../shared/components/ui/Dialog';
import { Search, CheckCircle2, ChevronRight, ChevronLeft, Save, AlertTriangle } from 'lucide-react';
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
  classNameTitle: number|string;
  weekNumber: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  selectedPeriod: number;
  onSelectPeriod: (period: number) => void;
  enrollments: ClassEnrollment[];
  records: AttendanceRecord[];
  onSaveSlot: (
    dayNumber: number,
    periodNumber: number,
    changes: Array<{ enrollmentId: number; status: BackendAttendanceStatus }>
  ) => Promise<void>;
  isSaving?: boolean;
}

export function QuickAttendancePanel({
  classNameTitle,
  weekNumber,
  selectedDay,
  onSelectDay,
  selectedPeriod,
  onSelectPeriod,
  enrollments,
  records,
  onSaveSlot,
  isSaving = false,
}: QuickAttendancePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmBulkOpen, setIsConfirmBulkOpen] = useState(false);

  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => schoolDataService.getActiveAcademicYear(),
  });
  const academicYearName = activeYear?.yearName || '1448-1449هـ';

  // Local draft status for the currently selected slot (enrollmentId -> AttendanceStatus)
  const [localStatuses, setLocalStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Maximum allowed periods for the selected day
  const maxPeriods = getPeriodsCountForDay(selectedDay);
  const availablePeriods = getPeriodsForDay(selectedDay);

  // If selected period exceeds the max allowed for this day, adjust it
  useEffect(() => {
    if (selectedPeriod > maxPeriods) {
      onSelectPeriod(maxPeriods);
    }
  }, [selectedDay, selectedPeriod, maxPeriods, onSelectPeriod]);

  // Map of saved backend records for the selected slot (day + period)
  const serverSlotStatuses = useMemo(() => {
    const map: Record<number, AttendanceStatus> = {};
    records.forEach((r) => {
      if (r.dayNumber === selectedDay && r.periodNumber === selectedPeriod) {
        map[r.enrollmentId] = r.status as AttendanceStatus;
      }
    });
    return map;
  }, [records, selectedDay, selectedPeriod]);

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
    if (!isValidPeriodForDay(selectedDay, selectedPeriod)) {
      return;
    }

    const changes: Array<{ enrollmentId: number; status: BackendAttendanceStatus }> = [];

    enrollments.forEach((e) => {
      const st = effectiveStatuses[e.enrollmentId];
      if (st && st !== 'Unmarked') {
        changes.push({
          enrollmentId: e.enrollmentId,
          status: st as BackendAttendanceStatus,
        });
      }
    });

    await onSaveSlot(selectedDay, selectedPeriod, changes);
    setHasUnsavedChanges(false);
    setLocalStatuses({});
  };

  // Quick next period navigation
  const goToNextPeriod = () => {
    if (selectedPeriod < maxPeriods) {
      onSelectPeriod(selectedPeriod + 1);
      setHasUnsavedChanges(false);
      setLocalStatuses({});
    }
  };

  const goToPrevPeriod = () => {
    if (selectedPeriod > 1) {
      onSelectPeriod(selectedPeriod - 1);
      setHasUnsavedChanges(false);
      setLocalStatuses({});
    }
  };

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return enrollments;
    const q = searchQuery.toLowerCase();
    return enrollments.filter(
      (e) =>
        e.studentName?.toLowerCase().includes(q) ||
        e.student?.nationalId.includes(q)
    );
  }, [enrollments, searchQuery]);

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
            <span>التحضير السريع للحصة الدراسية:</span>
            <span className="font-bold text-[#17252B] dark:text-[#F0F4F6]">{currentDayName}</span>
            <span className="text-[#8C9AA2] dark:text-[#566874]">—</span>
            <span className="font-bold text-[#0B5D43] dark:text-[#3E9B78]">الحصة {selectedPeriod}</span>
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

      {/* Navigation Controls: Days & Periods */}
      <div className="bg-white dark:bg-[#152126] p-4 sm:p-5 rounded-2xl border border-[#DCE3E6] dark:border-[#27383F] space-y-3.5 shadow-xs transition-colors">
        {/* Days Tabs */}
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
                    const newMax = getPeriodsCountForDay(day.dayNumber);
                    if (selectedPeriod > newMax) {
                      onSelectPeriod(newMax);
                    }
                    onSelectDay(day.dayNumber);
                    setHasUnsavedChanges(false);
                    setLocalStatuses({});
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

        {/* Periods Navigation */}
        <div className="pt-3 border-t border-[#EEF2F3] dark:border-[#27383F] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
            <span className="text-xs font-bold text-[#5F6B73] dark:text-[#95A7AF] ml-2 shrink-0">الحصص:</span>
            {availablePeriods.map((period) => {
              const isSelected = period === selectedPeriod;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => {
                    onSelectPeriod(period);
                    setHasUnsavedChanges(false);
                    setLocalStatuses({});
                  }}
                  className={cn(
                    'w-10 h-10 sm:w-9.5 sm:h-9.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border flex items-center justify-center shrink-0 active:scale-95 select-none',
                    isSelected
                      ? 'bg-[#0B5D43] dark:bg-[#107052] text-white border-[#0B5D43] dark:border-[#107052] shadow-xs ring-2 ring-[#0B5D43]/25 dark:ring-[#107052]/35'
                      : 'bg-[#F5F8F9] dark:bg-[#1A262C] text-[#263339] dark:text-[#D5E1E6] border-[#DCE3E6] dark:border-[#2B3B42] hover:bg-[#EDF2F4] dark:hover:bg-[#22323A]'
                  )}
                >
                  {period}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedPeriod <= 1}
              onClick={goToPrevPeriod}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
              className="flex-1 sm:flex-initial justify-center text-xs font-semibold"
            >
              الحصة السابقة
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedPeriod >= maxPeriods}
              onClick={goToNextPeriod}
              className="flex-1 sm:flex-initial justify-center text-xs font-semibold"
            >
              <span>الحصة التالية</span>
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <AttendanceProgressSummary
        totalStudents={counts.total}
        presentCount={counts.present}
        absentCount={counts.absent}
        discontinuedCount={counts.discontinued}
        unmarkedCount={counts.unmarked}
        label={`إحصائيات الحصة ${selectedPeriod} — ${currentDayName}`}
      />

      {/* Students List for selected period */}
      <div className="bg-white dark:bg-[#152126] rounded-2xl border border-[#DCE3E6] dark:border-[#27383F] shadow-xs overflow-hidden transition-colors">
        {/* Search Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#DCE3E6] dark:border-[#27383F] flex items-center justify-between gap-3 bg-[#F8FAFB] dark:bg-[#18242A]">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="تصفية الطلاب بالاسم أو الهوية..."
              className="w-full h-10 pr-9.5 pl-3 text-xs bg-white dark:bg-[#141E22] border border-[#CBD5DA] dark:border-[#2F424B] text-[#17252B] dark:text-[#F0F4F6] rounded-xl focus:border-[#0B5D43] dark:focus:border-[#3E9B78] focus:ring-2 focus:ring-[#0B5D43]/15 outline-none placeholder:text-[#8C9AA2] dark:placeholder:text-[#7A8D96] transition-all"
            />
            <Search className="w-4 h-4 text-[#8C9AA2] dark:text-[#7A8D96] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-xs text-[#4F5E66] dark:text-[#B5C5CC] bg-[#EDF2F4] dark:bg-[#1E2C32] px-3 py-1.5 rounded-lg border border-[#D5DFE3] dark:border-[#2C3F47] shrink-0 font-mono font-bold">
            {filteredStudents.length} طالب
          </span>
        </div>

        {/* Student Rows */}
        <div className="divide-y divide-[#DCE3E6]/60 dark:divide-[#27383F]/70">
          {filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#89949A] dark:text-[#7A8D96]">
              لا يوجد طلاب مطابقون لبحثك في هذه الحصة
            </div>
          ) : (
            filteredStudents.map((en, idx) => {
              const currentStatus = effectiveStatuses[en.enrollmentId] || 'Unmarked';
              const config = STATUS_CONFIG[currentStatus];

              return (
                <div
                  key={en.enrollmentId}
                  className={cn(
                    'p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                    config.rowBg,
                    config.rowHover,
                    config.borderAccent
                  )}
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 shadow-2xs transition-colors',
                        config.badgeStyle
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#17252B] dark:text-[#F0F4F6] truncate">
                          {en.studentName}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors',
                            config.pillStyle
                          )}
                        >
                          {config.label}
                        </span>
                      </div>
                      <span className="text-xs text-[#56646C] dark:text-[#95A7AF] font-mono mt-0.5 block">
                        رقم الهوية: {en.student?.nationalId ?? '—'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Segmented Status Controls */}
                  <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                    {/* Present */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(en.enrollmentId, 'Present')}
                      className={cn(
                        'h-11 sm:h-9 px-2 sm:px-3 text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 select-none',
                        currentStatus === 'Present'
                          ? STATUS_CONFIG.Present.selectedBtn
                          : UNSELECTED_BTN_CLASS
                      )}
                    >
                      حاضر
                    </button>

                    {/* Absent */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(en.enrollmentId, 'Absent')}
                      className={cn(
                        'h-11 sm:h-9 px-2 sm:px-3 text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 select-none',
                        currentStatus === 'Absent'
                          ? STATUS_CONFIG.Absent.selectedBtn
                          : UNSELECTED_BTN_CLASS
                      )}
                    >
                      غائب
                    </button>

                    {/* Discontinued */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(en.enrollmentId, 'Discontinued')}
                      className={cn(
                        'h-11 sm:h-9 px-2 sm:px-3 text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 select-none',
                        currentStatus === 'Discontinued'
                          ? STATUS_CONFIG.Discontinued.selectedBtn
                          : UNSELECTED_BTN_CLASS
                      )}
                    >
                      منقطع
                    </button>

                    {/* Unmarked */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(en.enrollmentId, 'Unmarked')}
                      className={cn(
                        'h-11 sm:h-9 px-2 sm:px-3 text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 select-none',
                        currentStatus === 'Unmarked'
                          ? STATUS_CONFIG.Unmarked.selectedBtn
                          : UNSELECTED_BTN_CLASS
                      )}
                      title="تحديد كغير محدد"
                    >
                      <span className="truncate">غير محدد</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Overwriting Existing Non-Present Statuses */}
      <Dialog
        isOpen={isConfirmBulkOpen}
        onClose={() => setIsConfirmBulkOpen(false)}
        title="تأكيد التحضير الجماعي"
        description="تنبيه: هناك طلاب مسجلون حالياً بحالة (غائب) أو (منقطع) في هذه الحصة."
      >
        <div className="space-y-3 text-xs text-[#17252B] dark:text-[#F0F4F6] leading-relaxed">
          <div className="p-3.5 bg-[#FFF6E5] dark:bg-[#2E2211] border border-[#FDE096] dark:border-[#5E4218] text-[#92400E] dark:text-[#FDE047] rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#B45309] dark:text-[#FBBF24]" />
            <span>
              الضغط على تأكيد سيقوم بتغيير جميع الطلاب في هذه الحصة إلى <strong>حاضر</strong>، متضمناً الحالات المسجلة سابقاً كغياب أو انقطاع.
            </span>
          </div>
          <p className="text-[#5F6B73] dark:text-[#A4B5BD]">هل ترغب بالاستمرار وتطبيق التحضير الجماعي لجميع الطلاب في هذه الحصة؟</p>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsConfirmBulkOpen(false)}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={applyBulkPresent}>
            نعم، تحضير الكل حاضر
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Mobile Sticky Floating Save Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 inset-x-4 z-40 md:hidden bg-[#122B23]/95 dark:bg-[#15252A]/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-[#3E9B78]/40 dark:border-[#388B96]/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-xs" />
            <span className="text-xs font-bold text-white">لديك تغييرات غير محفوظة</span>
          </div>
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            className="text-xs font-black shadow-md px-5 h-9"
          >
            حفظ الآن
          </Button>
        </div>
      )}
    </div>
  );
}
