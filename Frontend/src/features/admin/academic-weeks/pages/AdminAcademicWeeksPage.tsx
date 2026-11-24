import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarRange,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Clock3,
} from 'lucide-react';

import { academicYearsApi } from '../../../academic-years/api/academicYearsApi';
import { attendanceWeeksApi } from '../../../attendance-weeks/api/attendanceWeeksApi';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { useNotifications } from '../../../notifications';
import { formatArabicDateShort } from '../../../../shared/utils/date';
import type { AttendanceWeek } from '../../../../shared/types';

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function getWeekStatus(startDate: string, endDate: string) {
  const today = new Date();

  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  const startKey = startDate?.substring(0, 10);
  const endKey = endDate?.substring(0, 10);

  if (!startKey || !endKey) {
    return {
      label: 'غير محدد',
      className:
        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      icon: Clock3,
    };
  }

  if (todayKey < startKey) {
    return {
      label: 'قادم',
      className:
        'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
      icon: Clock3,
    };
  }

  if (todayKey > endKey) {
    return {
      label: 'منتهٍ',
      className:
        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      icon: CheckCircle2,
    };
  }

  return {
    label: 'جارٍ الآن',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    icon: CheckCircle2,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Main Component                               */
/* -------------------------------------------------------------------------- */

export function AdminAcademicWeeksPage() {
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  // Dialog states
  const [isWeekDialogOpen, setIsWeekDialogOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<AttendanceWeek | null>(null);
  const [weekToDelete, setWeekToDelete] = useState<AttendanceWeek | null>(null);

  // Form fields
  const [weekNumber, setWeekNumber] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  /* ------------------------------------------------------------------------ */
  /*                                  Queries                                 */
  /* ------------------------------------------------------------------------ */

  const {
    data: years = [],
    isLoading: isYearsLoading,
    isError: isYearsError,
  } = useQuery({
    queryKey: ['academic_years'],
    queryFn: () => academicYearsApi.getAcademicYears(),
  });

  const activeYear = years.find((year) => year.isActive) || years[0];
  const academicYearId = activeYear?.academicYearId ?? 0;

  const {
    data: weeks = [],
    isLoading: isWeeksLoading,
    isError: isWeeksError,
    refetch,
  } = useQuery({
    queryKey: ['weeks', academicYearId],
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(academicYearId),
    enabled: academicYearId > 0,
  });

  const sortedWeeks = useMemo(
    () => [...weeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [weeks]
  );

  const isLoadingPage = isYearsLoading || (academicYearId > 0 && isWeeksLoading);

  const activeWeeksCount = useMemo(
    () =>
      sortedWeeks.filter(
        (week) => getWeekStatus(week.startDate, week.endDate).label === 'جارٍ الآن'
      ).length,
    [sortedWeeks]
  );

  const totalSessions = sortedWeeks.length * 33;

  /* ------------------------------------------------------------------------ */
  /*                              Dialog Handlers                             */
  /* ------------------------------------------------------------------------ */

  const closeWeekDialog = () => {
    setIsWeekDialogOpen(false);
    setEditingWeek(null);
  };

  const openAddModal = () => {
    const nextWeekNumber =
      sortedWeeks.length > 0
        ? Math.max(...sortedWeeks.map((week) => week.weekNumber)) + 1
        : 1;

    setEditingWeek(null);
    setWeekNumber(nextWeekNumber);
    setStartDate('');
    setEndDate('');
    setIsWeekDialogOpen(true);
  };

  const openEditModal = (week: AttendanceWeek) => {
    setEditingWeek(week);
    setWeekNumber(week.weekNumber);
    setStartDate(week.startDate ? week.startDate.substring(0, 10) : '');
    setEndDate(week.endDate ? week.endDate.substring(0, 10) : '');
    setIsWeekDialogOpen(true);
  };

  /* ------------------------------------------------------------------------ */
  /*                              Form Validation                             */
  /* ------------------------------------------------------------------------ */

  const validateWeekForm = () => {
    if (!academicYearId) {
      throw new Error('لا يوجد عام دراسي محدد');
    }

    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 50) {
      throw new Error('يرجى إدخال رقم أسبوع صحيح');
    }

    if (!startDate || !endDate) {
      throw new Error('يرجى تحديد تاريخي البداية والنهاية');
    }

    if (endDate < startDate) {
      throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                                Mutations                                 */
  /* ------------------------------------------------------------------------ */

  const invalidateWeeks = () => {
    queryClient.invalidateQueries({
      queryKey: ['weeks', academicYearId],
    });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      validateWeekForm();

      return attendanceWeeksApi.createAttendanceWeek({
        weekNumber,
        startDate,
        endDate,
        academicYearId,
      });
    },

    onSuccess: () => {
      invalidateWeeks();
      toast.show('تمت إضافة الأسبوع الدراسي بنجاح', 'success');
      closeWeekDialog();
    },

    onError: (err: any) => {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'فشلت إضافة الأسبوع الدراسي';

      toast.show(message, 'danger');
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingWeek) {
        throw new Error('لم يتم تحديد الأسبوع المراد تعديله');
      }

      validateWeekForm();

      return attendanceWeeksApi.updateAttendanceWeek(
        editingWeek.attendanceWeekId,
        {
          weekNumber,
          startDate,
          endDate,
          academicYearId,
        }
      );
    },

    onSuccess: () => {
      invalidateWeeks();
      toast.show('تم تعديل بيانات الأسبوع الدراسي بنجاح', 'success');
      closeWeekDialog();
    },

    onError: (err: any) => {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'فشل تعديل الأسبوع الدراسي';

      toast.show(message, 'danger');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return attendanceWeeksApi.deleteAttendanceWeek(id);
    },

    onSuccess: () => {
      invalidateWeeks();
      toast.show('تم حذف الأسبوع الدراسي بنجاح', 'success');
      setWeekToDelete(null);
    },

    onError: (err: any) => {
      const message =
        err?.response?.data?.message ||
        'تعذر حذف الأسبوع الدراسي. قد يكون مرتبطاً بسجلات أخرى في النظام.';

      toast.show(message, 'danger');
      setWeekToDelete(null);
    },
  });

  const handleWeekSubmit = () => {
    if (editingWeek) {
      editMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const isSaving = addMutation.isPending || editMutation.isPending;

  /* ------------------------------------------------------------------------ */
  /*                              Shared Form Fields                         */
  /* ------------------------------------------------------------------------ */

  const renderWeekFields = () => (
    <div className="space-y-5">
      <Input
        type="number"
        label="رقم الأسبوع الدراسي"
        value={weekNumber}
        onChange={(e) => setWeekNumber(Number(e.target.value))}
        min={1}
        max={50}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          type="date"
          label="بداية الأسبوع"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <Input
          type="date"
          label="نهاية الأسبوع"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-[#E8F1F1] dark:bg-slate-800/70 p-3.5">
        <CalendarDays className="w-4 h-4 text-[#245B63] dark:text-teal-400 shrink-0 mt-0.5" />

        <p className="text-xs leading-6 text-[#45646A] dark:text-slate-300">
          حدد الفترة الزمنية التي ينتمي إليها الأسبوع الدراسي. ستُستخدم هذه
          التواريخ لتنظيم سجلات الحضور والتقارير.
        </p>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------------ */
  /*                                  Render                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page Header */}
      <section className="bg-white dark:bg-slate-900 border border-[#DCE3E6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#E8F1F1] dark:bg-teal-950/50 text-[#245B63] dark:text-teal-400 flex items-center justify-center">
              <CalendarRange className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#17252B] dark:text-slate-100">
                إدارة الأسابيع الدراسية
              </h1>

              <p className="text-sm text-[#78858B] dark:text-slate-400 leading-relaxed">
                إدارة الفترات الدراسية وتنظيم الأسابيع المعتمدة لرصد الحضور والغياب.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-medium text-[#64747A] dark:text-slate-400">
                  العام الدراسي:
                </span>

                <span className="text-xs font-bold text-[#245B63] dark:text-teal-300 bg-[#E8F1F1] dark:bg-teal-950/50 px-2.5 py-1 rounded-lg">
                  {activeYear?.yearName || 'لم يتم تحديد عام دراسي'}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
            disabled={!academicYearId || isYearsLoading}
            className="font-bold shadow-sm w-full xl:w-auto"
          >
            إضافة أسبوع جديد
          </Button>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3.5 bg-white dark:bg-slate-900 border border-[#DCE3E6] dark:border-slate-800 rounded-xl p-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F1F1] dark:bg-teal-950/50 text-[#245B63] dark:text-teal-400 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>

          <div>
            <p className="text-xs text-[#78858B] dark:text-slate-400">
              إجمالي الأسابيع
            </p>
            <p className="text-xl font-bold text-[#17252B] dark:text-slate-100 mt-0.5 tabular-nums">
              {sortedWeeks.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 bg-white dark:bg-slate-900 border border-[#DCE3E6] dark:border-slate-800 rounded-xl p-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div>
            <p className="text-xs text-[#78858B] dark:text-slate-400">
              الأسابيع الجارية
            </p>
            <p className="text-xl font-bold text-[#17252B] dark:text-slate-100 mt-0.5 tabular-nums">
              {activeWeeksCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 bg-white dark:bg-slate-900 border border-[#DCE3E6] dark:border-slate-800 rounded-xl p-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>

          <div>
            <p className="text-xs text-[#78858B] dark:text-slate-400">
              إجمالي الحصص
            </p>
            <p className="text-xl font-bold text-[#17252B] dark:text-slate-100 mt-0.5 tabular-nums">
              {totalSessions}
            </p>
          </div>
        </div>
      </section>

      {/* Weeks Section */}
      <section className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#17252B] dark:text-slate-100">
              الأسابيع الدراسية
            </h2>

            <p className="text-xs text-[#89949A] dark:text-slate-400 mt-1">
              اختر الأسبوع الذي تريد تعديله أو إدارته.
            </p>
          </div>

          <span className="text-xs font-semibold text-[#64747A] dark:text-slate-400 bg-white dark:bg-slate-900 border border-[#DCE3E6] dark:border-slate-800 px-3 py-1.5 rounded-lg w-fit">
            {sortedWeeks.length} أسبوع مسجل
          </span>
        </div>

        {/* Loading */}
        {isLoadingPage ? (
          <div className="bg-white dark:bg-slate-900 border border-[#DCE3E6] dark:border-slate-800 rounded-2xl p-12">
            <MuwathibLoading message="جاري استرجاع الأسابيع الدراسية..." />
          </div>
        ) : !activeYear ? (
          /* No Academic Year */
          <div className="bg-white dark:bg-slate-900 border border-[#DCE3E6] dark:border-slate-800 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-[#17252B] dark:text-slate-100">
              لا يوجد عام دراسي متاح
            </h3>

            <p className="text-sm text-[#89949A] dark:text-slate-400 mt-2">
              يجب إنشاء عام دراسي أولاً حتى تتمكن من إضافة الأسابيع الدراسية.
            </p>
          </div>
        ) : isYearsError || isWeeksError ? (
          /* Error */
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-2xl p-10 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />

            <h3 className="font-bold text-[#17252B] dark:text-slate-100">
              تعذر تحميل الأسابيع الدراسية
            </h3>

            <p className="text-sm text-[#89949A] dark:text-slate-400 mt-2 mb-4">
              حدثت مشكلة أثناء استرجاع البيانات. حاول مرة أخرى.
            </p>

            <Button variant="secondary" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : sortedWeeks.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 border border-dashed border-[#C9D5D9] dark:border-slate-700 rounded-2xl p-10 sm:p-14 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#E8F1F1] dark:bg-teal-950/50 text-[#245B63] dark:text-teal-400 flex items-center justify-center">
              <CalendarRange className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-[#17252B] dark:text-slate-100">
              لا توجد أسابيع دراسية بعد
            </h3>

            <p className="text-sm text-[#89949A] dark:text-slate-400 mt-2 mb-5 max-w-sm mx-auto leading-6">
              ابدأ بإضافة الأسابيع الدراسية لهذا العام حتى تتمكن من تنظيم
              عمليات رصد الحضور والغياب.
            </p>

            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={openAddModal}
            >
              إضافة أول أسبوع
            </Button>
          </div>
        ) : (
          /* Weeks Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {sortedWeeks.map((week) => {
              const status = getWeekStatus(week.startDate, week.endDate);
              const StatusIcon = status.icon;

              return (
                <article
                  key={week.attendanceWeekId}
                  className="group bg-white dark:bg-slate-900 border border-[#DCE3E6] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-[#B7CBCE] dark:hover:border-slate-600 transition-all duration-200"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#E8F1F1] dark:bg-teal-950/50 text-[#245B63] dark:text-teal-400 flex items-center justify-center font-bold text-lg tabular-nums">
                        {week.weekNumber}
                      </div>

                      <div>
                        <p className="text-[11px] text-[#89949A] dark:text-slate-400">
                          رقم الأسبوع
                        </p>

                        <h3 className="font-bold text-[#17252B] dark:text-slate-100 mt-0.5">
                          الأسبوع {week.weekNumber}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${status.className}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#F7F9FA] dark:bg-slate-800/70 border border-[#E9EEF0] dark:border-slate-700 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-[#89949A] dark:text-slate-400 mb-2">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span className="text-[11px]">بداية الأسبوع</span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-[#17252B] dark:text-slate-100 leading-6">
                        {formatArabicDateShort(week.startDate)}
                      </p>

                      <p className="text-[10px] text-[#89949A] dark:text-slate-500 mt-1">
                        الأحد
                      </p>
                    </div>

                    <div className="bg-[#F7F9FA] dark:bg-slate-800/70 border border-[#E9EEF0] dark:border-slate-700 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-[#89949A] dark:text-slate-400 mb-2">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span className="text-[11px]">نهاية الأسبوع</span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-[#17252B] dark:text-slate-100 leading-6">
                        {formatArabicDateShort(week.endDate)}
                      </p>

                      <p className="text-[10px] text-[#89949A] dark:text-slate-500 mt-1">
                        الخميس
                      </p>
                    </div>
                  </div>

                  {/* Week Information */}
                  <div className="flex items-center gap-4 mt-4 pb-4 border-b border-[#EEF2F3] dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[#64747A] dark:text-slate-400">
                      <CalendarDays className="w-4 h-4" />
                      <span className="text-xs">5 أيام دراسية</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#64747A] dark:text-slate-400">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-xs">33 حصة</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => openEditModal(week)}
                      aria-label={`تعديل الأسبوع ${week.weekNumber}`}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#245B63] dark:text-teal-300 bg-[#E8F1F1] dark:bg-teal-950/40 hover:bg-[#DCEBEC] dark:hover:bg-teal-950/70 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      تعديل الأسبوع
                    </button>

                    <button
                      type="button"
                      onClick={() => setWeekToDelete(week)}
                      aria-label={`حذف الأسبوع ${week.weekNumber}`}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف الأسبوع
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Week Dialog */}
      <Dialog
        isOpen={isWeekDialogOpen}
        onClose={closeWeekDialog}
        title={editingWeek ? 'تعديل الأسبوع الدراسي' : 'إضافة أسبوع دراسي جديد'}
        description={
          editingWeek
            ? `تعديل بيانات الأسبوع رقم ${editingWeek.weekNumber}.`
            : 'أدخل رقم الأسبوع والفترة الزمنية الخاصة به.'
        }
      >
        {renderWeekFields()}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={closeWeekDialog}
            disabled={isSaving}
          >
            إلغاء
          </Button>

          <Button
            variant="primary"
            onClick={handleWeekSubmit}
            isLoading={isSaving}
          >
            {editingWeek ? 'حفظ التعديلات' : 'إضافة الأسبوع'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!weekToDelete}
        onClose={() => setWeekToDelete(null)}
        title="تأكيد حذف الأسبوع الدراسي"
        description={`هل أنت متأكد من حذف الأسبوع الدراسي رقم ${weekToDelete?.weekNumber}؟`}
      >
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
              تنبيه قبل الحذف
            </p>

            <p className="text-xs text-amber-800 dark:text-amber-400 leading-6 mt-1">
              إذا كان هذا الأسبوع يحتوي على سجلات حضور وغياب مرتبطة به، فقد
              يمنع النظام حذفه حفاظاً على سلامة البيانات.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setWeekToDelete(null)}
            disabled={deleteMutation.isPending}
          >
            تراجع
          </Button>

          <Button
            variant="danger"
            onClick={() =>
              weekToDelete &&
              deleteMutation.mutate(weekToDelete.attendanceWeekId)
            }
            isLoading={deleteMutation.isPending}
          >
            حذف الأسبوع
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default AdminAcademicWeeksPage;