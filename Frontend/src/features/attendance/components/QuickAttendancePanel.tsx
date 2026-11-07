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
  const academicYearName = activeYear?.yearName || '2026-2027';

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
      <div className="bg-white dark:bg-[#182226] p-4 sm:p-5 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-[#17252B] dark:text-[#F0F4F6]">{classNameTitle}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] font-semibold border border-[#CDE0E2] dark:border-[#28373D]">
              {academicYearName}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEF2F3] dark:bg-[#212E33] text-[#5F6B73] dark:text-[#9BAAB1] font-semibold border border-[#DCE3E6] dark:border-[#28373D]">
              الأسبوع {weekNumber}
            </span>
          </div>
          <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-1">
            التحضير السريع للحصة الدراسية: <span className="font-bold text-[#17252B] dark:text-[#F0F4F6]">{currentDayName}</span> —{' '}
            <span className="font-bold text-[#245B63] dark:text-[#388B96]">الحصة {selectedPeriod}</span>
          </p>
        </div>

        {/* Primary Action: Mark All Present */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="success"
            size="md"
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={handleMarkAllPresent}
            className="shadow-xs font-bold"
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
          >
            {hasUnsavedChanges ? 'حفظ التغييرات' : 'تم الحفظ'}
          </Button>
        </div>
      </div>

      {/* Navigation Controls: Days & Periods */}
      <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] space-y-3 shadow-xs transition-colors">
        {/* Days Tabs */}
        <div>
          <span className="text-[11px] font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-1.5">اختر اليوم الدراسي:</span>
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
                    'py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer border',
                    isSelected
                      ? 'bg-[#245B63] dark:bg-[#2D727B] text-white border-[#245B63] dark:border-[#2D727B] shadow-xs'
                      : 'bg-[#F5F7F8] dark:bg-[#151E22] text-[#5F6B73] dark:text-[#9BAAB1] border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#EEF2F3] dark:hover:bg-[#212E33] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
                  )}
                >
                  {day.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Periods Navigation */}
        <div className="pt-2 border-t border-[#EEF2F3] dark:border-[#28373D] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-[#5F6B73] dark:text-[#9BAAB1] ml-2 shrink-0">الحصص:</span>
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
                    'w-9 h-9 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer border flex items-center justify-center shrink-0',
                    isSelected
                      ? 'bg-[#245B63] dark:bg-[#2D727B] text-white border-[#245B63] dark:border-[#2D727B] shadow-xs ring-2 ring-[#245B63]/20 dark:ring-[#388B96]/30'
                      : 'bg-white dark:bg-[#151E22] text-[#17252B] dark:text-[#F0F4F6] border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#EEF2F3] dark:hover:bg-[#212E33]'
                  )}
                >
                  {period}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedPeriod <= 1}
              onClick={goToPrevPeriod}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              الحصة السابقة
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedPeriod >= maxPeriods}
              onClick={goToNextPeriod}
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
      <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs overflow-hidden transition-colors">
        {/* Search Header */}
        <div className="p-3.5 border-b border-[#DCE3E6] dark:border-[#28373D] flex items-center justify-between gap-3 bg-[#FAFCFD] dark:bg-[#151E22]">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="تصفية الطلاب بالاسم أو الهوية..."
              className="w-full h-9 pr-9 pl-3 text-xs bg-white dark:bg-[#182226] border border-[#DCE3E6] dark:border-[#28373D] text-[#17252B] dark:text-[#F0F4F6] rounded-md focus:border-[#245B63] dark:focus:border-[#388B96] focus:ring-1 focus:ring-[#245B63] outline-none placeholder:text-[#89949A] dark:placeholder:text-[#6E7F87]"
            />
            <Search className="w-4 h-4 text-[#89949A] dark:text-[#6E7F87] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] shrink-0 font-mono">
            {filteredStudents.length} طالب
          </span>
        </div>

        {/* Student Rows */}
        <div className="divide-y divide-[#EEF2F3] dark:divide-[#28373D]">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#89949A] dark:text-[#6E7F87]">لا يوجد طلاب مطابقون للبحث</div>
          ) : (
            filteredStudents.map((en, idx) => {
              const currentStatus = effectiveStatuses[en.enrollmentId] || 'Unmarked';

              return (
                <div
                  key={en.enrollmentId}
                  className={cn(
                    'p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                    idx % 2 === 0 ? 'bg-white dark:bg-[#182226]' : 'bg-[#FAFCFD] dark:bg-[#151E22]',
                    currentStatus === 'Absent' && 'bg-[#FDECEC]/30 dark:bg-[#331518]/30',
                    currentStatus === 'Discontinued' && 'bg-[#FFF4DA]/30 dark:bg-[#332712]/30'
                  )}
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-[11px] font-mono text-[#89949A] dark:text-[#6E7F87]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#17252B] dark:text-[#F0F4F6]">{en.studentName}</span>
                      </div>
                      <span className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] font-mono">
                        رقم الهوية: {en.student?.nationalId}
                      </span>
                    </div>
                  </div>

                  {/* Quick Segmented Status Controls */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Present */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(en.enrollmentId, 'Present')}
                      className={cn(
                        'px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        currentStatus === 'Present'
                          ? 'bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] border-[#B7DEC5] dark:border-[#1B4D32] shadow-2xs ring-1 ring-[#176B3A]/20'
                          : 'bg-white dark:bg-[#182226] text-[#5F6B73] dark:text-[#9BAAB1] border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#F5F7F8] dark:hover:bg-[#212E33] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
                      )}
                    >
                      حاضر
                    </button>

                    {/* Absent */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(en.enrollmentId, 'Absent')}
                      className={cn(
                        'px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        currentStatus === 'Absent'
                          ? 'bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] border-[#F1C3C3] dark:border-[#592226] shadow-2xs ring-1 ring-[#A61B1B]/20'
                          : 'bg-white dark:bg-[#182226] text-[#5F6B73] dark:text-[#9BAAB1] border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#F5F7F8] dark:hover:bg-[#212E33] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
                      )}
                    >
                      غائب
                    </button>

                    {/* Discontinued */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(en.enrollmentId, 'Discontinued')}
                      className={cn(
                        'px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        currentStatus === 'Discontinued'
                          ? 'bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] border-[#EDD38C] dark:border-[#594218] shadow-2xs ring-1 ring-[#855500]/20'
                          : 'bg-white dark:bg-[#182226] text-[#5F6B73] dark:text-[#9BAAB1] border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#F5F7F8] dark:hover:bg-[#212E33] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
                      )}
                    >
                      منقطع
                    </button>

                    {/* Unmarked */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(en.enrollmentId, 'Unmarked')}
                      className={cn(
                        'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer',
                        currentStatus === 'Unmarked'
                          ? 'bg-[#F1F3F5] dark:bg-[#1E292D] text-[#59636E] dark:text-[#9BAAB1] border-[#D9DEE3] dark:border-[#2C3C43]'
                          : 'bg-white dark:bg-[#182226] text-[#89949A] dark:text-[#6E7F87] border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#F5F7F8] dark:hover:bg-[#212E33]'
                      )}
                      title="مسح التحديد"
                    >
                      غير محدد
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
          <div className="p-3 bg-[#FFF4DA] dark:bg-[#332712] border border-[#EDD38C] dark:border-[#594218] text-[#855500] dark:text-[#FACC15] rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              الضغط على تأكيد سيقوم بتغيير جميع الطلاب في هذه الحصة إلى <strong>حاضر</strong>، متضمناً الحالات المسجلة سابقاً كغياب أو انقطاع.
            </span>
          </div>
          <p>هل ترغب بالاستمرار وتطبيق التحضير الجماعي لجميع الطلاب؟</p>
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
    </div>
  );
}
