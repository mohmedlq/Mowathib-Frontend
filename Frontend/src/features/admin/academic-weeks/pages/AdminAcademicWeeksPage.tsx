import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { CalendarRange, Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { useNotifications } from '../../../notifications';
import { formatArabicDateShort } from '../../../../shared/utils/date';
import type { AttendanceWeek } from '../../../../shared/types';

export function AdminAcademicWeeksPage() {
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  // Dialog States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<AttendanceWeek | null>(null);
  const [weekToDelete, setWeekToDelete] = useState<AttendanceWeek | null>(null);

  // Form Fields
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 1. Fetch Academic Years
  const { data: years = [] } = useQuery({
    queryKey: ['academic_years'],
    queryFn: () => schoolDataService.getAcademicYears(),
  });

  const activeYear = years.find((y) => y.isActive) || years[0];
  const academicYearId = activeYear?.academicYearId || 1;

  // 2. Fetch Weeks
  const { data: weeks = [], isLoading } = useQuery({
    queryKey: ['weeks', academicYearId],
    queryFn: () => schoolDataService.getAttendanceWeeks(academicYearId),
  });

  const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  // Open Add Modal
  const openAddModal = () => {
    const nextWeekNum = sortedWeeks.length > 0 ? Math.max(...sortedWeeks.map((w) => w.weekNumber)) + 1 : 1;
    setWeekNumber(nextWeekNum);
    setStartDate('');
    setEndDate('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (week: AttendanceWeek) => {
    setEditingWeek(week);
    setWeekNumber(week.weekNumber);
    setStartDate(week.startDate ? week.startDate.substring(0, 10) : '');
    setEndDate(week.endDate ? week.endDate.substring(0, 10) : '');
  };

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        throw new Error('يرجى تحديد تاريخي البداية والنهاية');
      }
      return await schoolDataService.createAttendanceWeek({
        weekNumber: Number(weekNumber),
        startDate,
        endDate,
        academicYearId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
      toast.show('تمت إضافة الأسبوع الدراسي بنجاح', 'success');
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'فشلت إضافة الأسبوع الدراسي';
      toast.show(msg, 'danger');
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingWeek || !startDate || !endDate) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة');
      }
      return await schoolDataService.updateAttendanceWeek(editingWeek.attendanceWeekId, {
        weekNumber: Number(weekNumber),
        startDate,
        endDate,
        academicYearId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
      toast.show('تم تعديل بيانات الأسبوع الدراسي بنجاح', 'success');
      setEditingWeek(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'فشل تعديل الأسبوع الدراسي';
      toast.show(msg, 'danger');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await schoolDataService.deleteAttendanceWeek(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
      toast.show('تم حذف الأسبوع الدراسي بنجاح', 'success');
      setWeekToDelete(null);
    },
    onError: (err: any) => {
      console.error(err);
      toast.show(
        'لا يمكن حذف هذا الأسبوع الدراسي لوجود سجلات حضور وغياب مسجلة به. يرجى مسح السجلات أولاً لحماية بيانات النظام.',
        'danger'
      );
      setWeekToDelete(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B]">إدارة الأسابيع الدراسية</h1>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                تعريف وتعديل الأسابيع المعتمدة لرصد الحضور وجدولة فترات الدراسة للعام الحالي
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#E8F1F1] text-[#245B63] border border-[#CDE0E2]">
            العام: {activeYear?.yearName || '1446-1447هـ'}
          </span>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
            className="text-xs font-bold shadow-xs"
          >
            إضافة أسبوع جديد
          </Button>
        </div>
      </div>

      {/* Weeks Table */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#DCE3E6] bg-[#FAFCFD] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#245B63]" />
            <h2 className="text-sm font-bold text-[#17252B]">
              جدول الأسابيع الدراسية المعتمدة ({sortedWeeks.length} أسبوعاً)
            </h2>
          </div>
          <span className="text-xs text-[#5F6B73]">33 حصة موزعة من الأحد إلى الخميس</span>
        </div>

        {isLoading ? (
          <div className="p-12">
            <MuwathibLoading message="جاري استرجاع الأسابيع الدراسية المعتمدة..." />
          </div>
        ) : sortedWeeks.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#89949A]">
            لا توجد أسابيع دراسية مسجلة حالياً. اضغط "إضافة أسبوع جديد" لإضافة أسبوع.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F7F8] text-[#17252B] border-b border-[#DCE3E6] select-none">
                  <th className="px-4 py-3 font-bold w-24">الأسبوع</th>
                  <th className="px-4 py-3 font-bold">بداية الأسبوع (الأحد)</th>
                  <th className="px-4 py-3 font-bold">نهاية الأسبوع (الخميس)</th>
                  <th className="px-4 py-3 font-bold text-center">أيام الدراسة</th>
                  <th className="px-4 py-3 font-bold text-center">إجمالي الحصص</th>
                  <th className="px-4 py-3 font-bold text-center">الحالة</th>
                  <th className="px-4 py-3 font-bold text-center w-28">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F3]">
                {sortedWeeks.map((week, idx) => (
                  <tr
                    key={week.attendanceWeekId}
                    className={`transition-colors hover:bg-[#F5F9F9] ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFD]'
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-[#245B63] font-mono">
                      الأسبوع {week.weekNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#17252B]">
                      {formatArabicDateShort(week.startDate)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#17252B]">
                      {formatArabicDateShort(week.endDate)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[#5F6B73]">5 أيام</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-[#17252B]">33 حصة</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#176B3A] font-semibold bg-[#E8F5EC] px-2.5 py-0.5 rounded-full border border-[#B7DEC5]">
                        <CheckCircle2 className="w-3 h-3" />
                        معتمد
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(week)}
                          className="p-1.5 text-[#5F6B73] hover:text-[#245B63] hover:bg-[#E8F1F1] rounded-md transition-colors cursor-pointer"
                          title="تعديل الأسبوع"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeekToDelete(week)}
                          className="p-1.5 text-[#5F6B73] hover:text-[#A61B1B] hover:bg-[#FDECEC] rounded-md transition-colors cursor-pointer"
                          title="حذف الأسبوع"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Week Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة أسبوع دراسي جديد"
        description="حدد رقم وتواريخ الأسبوع الدراسي المعتمد للرصد."
      >
        <div className="space-y-4">
          <Input
            type="number"
            label="رقم الأسبوع الدراسي"
            value={weekNumber}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            min={1}
            max={50}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="بداية الأسبوع (الأحد)"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="نهاية الأسبوع (الخميس)"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => addMutation.mutate()}
            isLoading={addMutation.isPending}
          >
            إضافة الأسبوع
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Week Modal */}
      <Dialog
        isOpen={!!editingWeek}
        onClose={() => setEditingWeek(null)}
        title={`تعديل الأسبوع الدراسي ${editingWeek?.weekNumber}`}
        description="تعديل تواريخ ورقم الأسبوع الدراسي."
      >
        <div className="space-y-4">
          <Input
            type="number"
            label="رقم الأسبوع"
            value={weekNumber}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            min={1}
            max={50}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="بداية الأسبوع (الأحد)"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="نهاية الأسبوع (الخميس)"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setEditingWeek(null)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => editMutation.mutate()}
            isLoading={editMutation.isPending}
          >
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        isOpen={!!weekToDelete}
        onClose={() => setWeekToDelete(null)}
        title="تأكيد حذف الأسبوع الدراسي"
        description={`هل أنت متأكد من حذف الأسبوع الدراسي ${weekToDelete?.weekNumber}؟`}
      >
        <div className="p-3 bg-[#FFF4DA] border border-[#EDD38C] rounded-lg text-xs text-[#855500] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            تنبيه: إذا كان هذا الأسبوع يحتوي على سجلات حضور وغياب مسجلة للطلاب، فسيتم منع الحذف تلقائياً لحماية سلامة السجلات.
          </span>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setWeekToDelete(null)}>
            تراجع
          </Button>
          <Button
            variant="danger"
            onClick={() => weekToDelete && deleteMutation.mutate(weekToDelete.attendanceWeekId)}
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
