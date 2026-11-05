import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../shared/services/schoolDataService';
import type {
  ClassEnrollment,
  AttendanceRecord,
  AttendanceStatus,
  BackendAttendanceStatus,
} from '../../../shared/types';
import { SCHOOL_DAYS, SCHOOL_PERIODS } from '../../../shared/types';
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

  // Synchronize slot statuses when day or period changes
  const slotMap = useMemo(() => {
    const map: Record<number, AttendanceStatus> = {};
    enrollments.forEach((e) => {
      const rec = records.find(
        (r) =>
          r.enrollmentId === e.enrollmentId &&
          r.dayNumber === selectedDay &&
          r.periodNumber === selectedPeriod
      );
      map[e.enrollmentId] = rec ? rec.status : 'Unmarked';
    });
    return map;
  }, [enrollments, records, selectedDay, selectedPeriod]);

  // Current effective status is local draft or slotMap
  const effectiveStatuses = useMemo(() => {
    const res: Record<number, AttendanceStatus> = { ...slotMap };
    if (hasUnsavedChanges) {
      Object.entries(localStatuses).forEach(([idStr, st]) => {
        res[Number(idStr)] = st;
      });
    }
    return res;
  }, [slotMap, localStatuses, hasUnsavedChanges]);

  // Summary counts for current period
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
    if (selectedPeriod < 7) {
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
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-[#17252B]">{classNameTitle}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E8F1F1] text-[#245B63] font-semibold">
              {academicYearName}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEF2F3] text-[#5F6B73] font-semibold">
              الأسبوع {weekNumber}
            </span>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            التحضير السريع للحصة الدراسية: <span className="font-bold text-[#17252B]">{currentDayName}</span> —{' '}
            <span className="font-bold text-[#245B63]">الحصة {selectedPeriod}</span>
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
      <div className="bg-white p-4 rounded-xl border border-[#DCE3E6] space-y-3 shadow-xs">
        {/* Days Tabs */}
        <div>
          <span className="text-[11px] font-bold text-[#5F6B73] block mb-1.5">اختر اليوم الدراسي:</span>
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
                  }}
                  className={cn(
                    'py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer border',
                    isSelected
                      ? 'bg-[#245B63] text-white border-[#245B63] shadow-xs'
                      : 'bg-[#F5F7F8] text-[#5F6B73] border-[#DCE3E6] hover:bg-[#EEF2F3] hover:text-[#17252B]'
                  )}
                >
                  {day.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Periods Navigation */}
        <div className="pt-2 border-t border-[#EEF2F3] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-[#5F6B73] ml-2 shrink-0">الحصص:</span>
            {SCHOOL_PERIODS.map((period) => {
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
                      ? 'bg-[#245B63] text-white border-[#245B63] shadow-xs ring-2 ring-[#245B63]/20'
                      : 'bg-white text-[#17252B] border-[#DCE3E6] hover:bg-[#EEF2F3]'
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
              disabled={selectedPeriod >= 7}
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
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        {/* Search Header */}
        <div className="p-3.5 border-b border-[#DCE3E6] flex items-center justify-between gap-3 bg-[#FAFCFD]">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="تصفية الطلاب بالاسم أو الهوية..."
              className="w-full h-9 pr-9 pl-3 text-xs bg-white border border-[#DCE3E6] rounded-md focus:border-[#245B63] focus:ring-1 focus:ring-[#245B63] outline-none"
            />
            <Search className="w-4 h-4 text-[#89949A] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-xs text-[#5F6B73] shrink-0 font-mono">
            {filteredStudents.length} طالب
          </span>
        </div>

        {/* Student Rows */}
        <div className="divide-y divide-[#EEF2F3]">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#89949A]">لا يوجد طلاب مطابقون للبحث</div>
          ) : (
            filteredStudents.map((en, idx) => {
              const currentStatus = effectiveStatuses[en.enrollmentId] || 'Unmarked';

              return (
                <div
                  key={en.enrollmentId}
                  className={cn(
                    'p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFD]',
                    currentStatus === 'Absent' && 'bg-[#FDECEC]/30',
                    currentStatus === 'Discontinued' && 'bg-[#FFF4DA]/30'
                  )}
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-[11px] font-mono text-[#89949A]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#17252B]">{en.studentName}</span>
                      </div>
                      <span className="text-[11px] text-[#5F6B73] font-mono">
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
                          ? 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5] shadow-2xs ring-1 ring-[#176B3A]/20'
                          : 'bg-white text-[#5F6B73] border-[#DCE3E6] hover:bg-[#F5F7F8] hover:text-[#17252B]'
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
                          ? 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3] shadow-2xs ring-1 ring-[#A61B1B]/20'
                          : 'bg-white text-[#5F6B73] border-[#DCE3E6] hover:bg-[#F5F7F8] hover:text-[#17252B]'
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
                          ? 'bg-[#FFF4DA] text-[#855500] border-[#EDD38C] shadow-2xs ring-1 ring-[#855500]/20'
                          : 'bg-white text-[#5F6B73] border-[#DCE3E6] hover:bg-[#F5F7F8] hover:text-[#17252B]'
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
                          ? 'bg-[#F1F3F5] text-[#59636E] border-[#D9DEE3]'
                          : 'bg-white text-[#89949A] border-[#DCE3E6] hover:bg-[#F5F7F8]'
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
        <div className="space-y-3 text-xs text-[#17252B] leading-relaxed">
          <div className="p-3 bg-[#FFF4DA] border border-[#EDD38C] text-[#855500] rounded-lg flex items-start gap-2.5">
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
