import { useState } from 'react';
import { useAuth } from '../../../auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { GraduationCap, Search, UserPlus, UserX } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { useNotifications } from '../../../notifications';
import { RepresentativeBadge } from '../../../../shared/components/ui/RepresentativeBadge';

export function RepresentativeStudentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();
  const classId = user?.classId || 105;

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [thirdName, setThirdName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(classId),
  });

  // Add student mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      return await schoolDataService.createStudent(
        { firstName, secondName, thirdName, lastName, nationalId },
        classId,
        1
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', classId] });
      toast.show('تم إضافة الطالب إلى قائمة الشعبة بنجاح', 'success');
      setIsAddModalOpen(false);
      setFirstName('');
      setSecondName('');
      setThirdName('');
      setLastName('');
      setNationalId('');
    },
    onError: () => {
      toast.show('فشل إضافة الطالب، يرجى التحقق من البيانات', 'danger');
    },
  });

  // Remove student from class mutation
  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      await schoolDataService.removeStudentFromClass(enrollmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', classId] });
      toast.show('تم إنهاء قيد الطالب من الشعبة', 'info');
    },
  });

  const filteredEnrollments = enrollments.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.studentName?.toLowerCase().includes(q) || e.student?.nationalId.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">
              قائمة طلاب {user?.className || `شعبة ${classId}`}
            </h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            إدارة ومتابعة قيد الطلاب المسجلين رسمياً في شعبتك الدراسية
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
          className="self-start sm:self-auto font-bold"
        >
          إضافة طالب للشعبة
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#DCE3E6] shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهوية..."
            className="w-full h-9 pr-9 pl-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-md focus:bg-white focus:border-[#245B63] outline-none"
          />
          <Search className="w-4 h-4 text-[#89949A] absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        <span className="text-xs text-[#5F6B73] font-mono">
          {filteredEnrollments.length} طالب مسجل
        </span>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#F0F4F5] text-[#17252B] border-b border-[#DCE3E6]">
                <th className="px-4 py-3 font-bold w-12 text-center">#</th>
                <th className="px-4 py-3 font-bold">رقم الهوية الوطنية</th>
                <th className="px-4 py-3 font-bold">اسم الطالب الرباعي</th>
                <th className="px-4 py-3 font-bold">تاريخ القيد</th>
                <th className="px-4 py-3 font-bold text-center">الصفة</th>
                <th className="px-4 py-3 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E6]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#5F6B73]">
                    جاري تحميل بيانات طلاب الشعبة...
                  </td>
                </tr>
              ) : filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#89949A]">
                    لا يوجد طلاب مطابقون لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((en, idx) => (
                  <tr key={en.enrollmentId} className="transition-colors hover:bg-[#F0F7F7]">
                    <td className="px-4 py-3 text-center font-mono text-[#89949A]">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium">
                      <span className="bg-[#F5F7F8] px-2 py-0.5 rounded border border-[#DCE3E6] text-[#17252B]">
                        {en.student?.nationalId}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#17252B]">{en.studentName}</td>
                    <td className="px-4 py-3 font-mono text-[#5F6B73]">{en.startDate}</td>
                    <td className="px-4 py-3 text-center">
                      {en.isRepresentative ? (
                        <RepresentativeBadge representativeId={en.enrollmentId} className="px-2 text-[10px]" />
                      ) : (
                        <span className="text-[#89949A] text-[11px] bg-[#F5F7F8] px-2 py-0.5 rounded">طالب</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!en.isRepresentative && (
                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(en.enrollmentId)}
                          className="p-1.5 rounded-lg text-[#89949A] hover:text-[#A61B1B] hover:bg-[#FDECEC] transition-all cursor-pointer"
                          title="حذف من الشعبة"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`إضافة طالب إلى ${user?.className || `شعبة ${classId}`}`}
        description="أدخل بيانات الطالب الرباعية ورقم الهوية الوطنية."
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الاسم الأول"
              placeholder="مثال: يوسف"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="اسم الأب"
              placeholder="مثال: إبراهيم"
              value={secondName}
              onChange={(e) => setSecondName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم الجد"
              placeholder="مثال: علي"
              value={thirdName}
              onChange={(e) => setThirdName(e.target.value)}
            />
            <Input
              label="اسم العائلة"
              placeholder="مثال: الغامدي"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            label="رقم الهوية الوطنية"
            placeholder="10 أرقام"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => addMutation.mutate()}
            isLoading={addMutation.isPending}
            disabled={!firstName || !lastName || nationalId.length < 10}
          >
            إضافة الطالب
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

