import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { CalendarRange, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { useNotifications } from '../../../notifications';
import { formatArabicDateShort } from '../../../../shared/utils/date';

export function AdminAcademicYearsPage() {
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const [isNewYearModalOpen, setIsNewYearModalOpen] = useState(false);
  const [yearName, setYearName] = useState('2027-2028');
  const [startDate, setStartDate] = useState('2027-09-01');
  const [endDate, setEndDate] = useState('2028-06-30');

  const { data: years = [], isLoading } = useQuery({
    queryKey: ['academic_years'],
    queryFn: () => schoolDataService.getAcademicYears(),
  });

  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  // Create year mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await schoolDataService.createAcademicYear({
        yearName,
        startDate,
        endDate,
        isActive: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_years'] });
      toast.show('تم إنشاء العام الدراسي الجديد وحفظه بنجاح', 'success');
      setIsNewYearModalOpen(false);
    },
  });

  // Set active mutation
  const setActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      await schoolDataService.setActiveAcademicYear(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_years'] });
      toast.show('تم تفعيل العام الدراسي بنجاح', 'success');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">إدارة الأعوام والأسابيع الدراسية</h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            العام الدراسي يضم 18 أسبوعاً دراسياً و 30 شعبة (10 شعب لكل مرحلة ثانوية)
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewYearModalOpen(true)}
          className="self-start sm:self-auto font-bold"
        >
          إنشاء عام دراسي جديد
        </Button>
      </div>

      {/* Academic Years List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[#17252B]">سجل الأعوام الدراسية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <div className="col-span-full p-8 bg-white dark:bg-[#122B23] rounded-xl border border-[#D8E5DF] dark:border-[#1E4638]">
              <MuwathibLoading message="جاري استرجاع سجل الأعوام الدراسية..." />
            </div>
          ) : (
            years.map((y) => (
              <div
                key={y.academicYearId}
                className={`p-5 rounded-xl border transition-all ${
                  y.isActive
                    ? 'bg-white border-[#245B63] border-r-4 border-r-[#245B63] shadow-xs'
                    : 'bg-white border-[#DCE3E6] hover:border-[#B8C4C9]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#17252B] font-mono tracking-wide">{y.yearName}</span>
                    {y.isActive && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5EC] text-[#176B3A] border border-[#B7DEC5] text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#176B3A] animate-pulse" />
                        العام النشط حالياً
                      </span>
                    )}
                  </div>
                  {!y.isActive && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveMutation.mutate(y.academicYearId)}
                      className="text-xs"
                    >
                      تحديد كعام نشط
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[#5F6B73] mb-4">
                  <div className="p-2 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
                    <div className="text-[10px] text-[#5F6B73] mb-0.5">تاريخ البداية</div>
                    <div className="font-mono text-[#17252B] font-semibold">{y.startDate}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
                    <div className="text-[10px] text-[#5F6B73] mb-0.5">تاريخ النهاية</div>
                    <div className="font-mono text-[#17252B] font-semibold">{y.endDate}</div>
                  </div>
                </div>

                <div className="p-3 bg-[#F5F7F8] rounded-lg border border-[#DCE3E6] flex items-center justify-between text-xs">
                  <span className="text-[#5F6B73] font-medium">الأسابيع الدراسية المعتمدة:</span>
                  <span className="font-mono font-bold text-[#245B63] bg-white px-2 py-0.5 rounded border border-[#DCE3E6]">18 أسبوعاً</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 18 Weeks Schedule Table */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#DCE3E6] flex items-center justify-between bg-[#F8FAFA]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#245B63]" />
            <h3 className="text-sm font-bold text-[#17252B]">جدول أسابيع الحضور الدراسي المعتمدة (18 أسبوعاً)</h3>
          </div>
          <span className="text-xs text-[#5F6B73] bg-white px-2.5 py-1 rounded-md border border-[#DCE3E6]">من الأحد إلى الخميس</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#F0F4F5] text-[#17252B] border-b border-[#DCE3E6]">
                <th className="px-4 py-3 font-bold w-28">الأسبوع</th>
                <th className="px-4 py-3 font-bold">بداية الأسبوع (الأحد)</th>
                <th className="px-4 py-3 font-bold">نهاية الأسبوع (الخميس)</th>
                <th className="px-4 py-3 font-bold text-center">أيام الحضور</th>
                <th className="px-4 py-3 font-bold text-center">حصص الأسبوع</th>
                <th className="px-4 py-3 font-bold text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E6]">
              {weeks.map((w, idx) => (
                <tr key={w.attendanceWeekId} className={`transition-colors hover:bg-[#F0F7F7] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFC]'}`}>
                  <td className="px-4 py-3 font-bold text-[#245B63]">الأسبوع {w.weekNumber}</td>
                  <td className="px-4 py-3 font-mono text-[#5F6B73]">
                    {formatArabicDateShort(w.startDate)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#5F6B73]">
                    {formatArabicDateShort(w.endDate)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[#17252B]">5 أيام</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-[#17252B]">33 حصة</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#176B3A] font-semibold bg-[#E8F5EC] px-2 py-0.5 rounded-full border border-[#B7DEC5]">
                      <CheckCircle2 className="w-3 h-3" />
                      معتمد
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Year Modal */}
      <Dialog
        isOpen={isNewYearModalOpen}
        onClose={() => setIsNewYearModalOpen(false)}
        title="إنشاء عام دراسي جديد"
        description="سيتم إنشاء 30 شعبة دراسية و 18 أسبوع حضور تلقائياً وفق النظام المدرسي المعتمد."
      >
        <div className="space-y-3.5">
          <Input
            label="مسمى العام الدراسي"
            value={yearName}
            onChange={(e) => setYearName(e.target.value)}
            placeholder="2027-2028"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="تاريخ البداية"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="تاريخ النهاية"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsNewYearModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => createMutation.mutate()}
            isLoading={createMutation.isPending}
          >
            إنشاء العام الدراسي
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

