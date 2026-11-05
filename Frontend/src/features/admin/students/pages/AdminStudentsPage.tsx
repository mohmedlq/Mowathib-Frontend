import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { GraduationCap, Search, UserPlus, UserX } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { useNotifications } from '../../../notifications';

export function AdminStudentsPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const classIdParam = searchParams.get('classId');
  const [selectedClassId, setSelectedClassId] = useState<number>(classIdParam ? Number(classIdParam) : 0);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [thirdName, setThirdName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [targetClassId, setTargetClassId] = useState<number>(105);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { isLoading } = useQuery({
    queryKey: ['all_students', search],
    queryFn: () => schoolDataService.getAllStudents(search),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['class_enrollments_all', selectedClassId],
    queryFn: async () => {
      if (selectedClassId > 0) {
        return await schoolDataService.getEnrollmentsByClass(selectedClassId);
      } else {
        const list = [];
        for (const c of classes.slice(0, 10)) {
          const res = await schoolDataService.getEnrollmentsByClass(c.classId);
          list.push(...res);
        }
        return list;
      }
    },
    enabled: classes.length > 0,
  });

  // Create student mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await schoolDataService.createStudent(
        { firstName, secondName, thirdName, lastName, nationalId },
        targetClassId,
        1
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_students'] });
      queryClient.invalidateQueries({ queryKey: ['class_enrollments_all'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.show('تم إضافة الطالب وقيده في الشعبة بنجاح', 'success');
      setIsAddModalOpen(false);
      // Reset form
      setFirstName('');
      setSecondName('');
      setThirdName('');
      setLastName('');
      setNationalId('');
    },
    onError: () => {
      toast.show('فشل إضافة الطالب، يرجى التأكد من صحة البيانات', 'danger');
    },
  });

  // Deactivate enrollment mutation
  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      await schoolDataService.removeStudentFromClass(enrollmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_enrollments_all'] });
      toast.show('تم إنهاء قيد الطالب من الشعبة وفق النظام', 'info');
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B]">إدارة قيد وسجلات الطلاب</h1>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                إضافة الطلاب، ربطهم بالشعب الدراسية، والبحث برقم الهوية الوطنية
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
          className="self-start sm:self-auto font-bold"
        >
          إضافة طالب جديد
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-[#5F6B73] shrink-0">الشعبة:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(Number(e.target.value))}
            className="h-9.5 px-3 bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg text-xs font-medium text-[#17252B] outline-none cursor-pointer hover:border-[#245B63] transition-colors"
          >
            <option value={0}>جميع الفصول والشعب</option>
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهوية الوطنية..."
            className="w-full h-9.5 pr-9 pl-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg focus:bg-white focus:border-[#245B63] focus:ring-2 focus:ring-[#245B63]/15 outline-none transition-all placeholder:text-[#89949A]"
          />
          <Search className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#F5F7F8] text-[#17252B] border-b border-[#DCE3E6]">
                <th className="px-4 py-3.5 font-bold w-12 text-center">#</th>
                <th className="px-4 py-3.5 font-bold w-36">رقم الهوية الوطنية</th>
                <th className="px-4 py-3.5 font-bold">الاسم الكامل للطالب</th>
                <th className="px-4 py-3.5 font-bold w-32">الشعبة المقيد بها</th>
                <th className="px-4 py-3.5 font-bold text-center w-28">صفة التمثيل</th>
                <th className="px-4 py-3.5 font-bold text-center w-24">حالة القيد</th>
                <th className="px-4 py-3.5 font-bold text-center w-20">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F3]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#5F6B73]">
                    جاري تحميل الطلاب...
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#89949A]">
                    لا يوجد طلاب مطابقون لخيارات البحث
                  </td>
                </tr>
              ) : (
                enrollments.map((en, idx) => (
                  <tr key={en.enrollmentId} className="hover:bg-[#F5F9F9] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#89949A] text-center">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#5F6B73]">
                      <span className="px-2 py-0.5 rounded bg-[#F5F7F8] border border-[#EEF2F3]">
                        {en.student?.nationalId}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#17252B]">{en.studentName}</td>
                    <td className="px-4 py-3 text-[#5F6B73] font-medium font-mono">{en.className}</td>
                    <td className="px-4 py-3 text-center">
                      {en.isRepresentative ? (
                        <span className="text-[#245B63] bg-[#E8F1F1] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#245B63]/25">
                          عريف
                        </span>
                      ) : (
                        <span className="text-[#89949A] text-[11px]">طالب</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#E8F5EC] text-[#176B3A] border border-[#B7DEC5] text-[10px] font-bold">
                        نشط
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeMutation.mutate(en.enrollmentId)}
                        className="p-1.5 rounded-lg text-[#89949A] hover:text-[#A61B1B] hover:bg-[#FDECEC] transition-colors cursor-pointer"
                        title="إنهاء القيد من الشعبة"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
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
        title="إضافة طالب جديد وقيده في الشعبة"
        description="أدخل البيانات الرسمية الرباعية للطالب ورقم الهوية الوطنية والشعبة المستهدفة."
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الاسم الأول"
              placeholder="مثال: محمد"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="اسم الأب"
              placeholder="مثال: أحمد"
              value={secondName}
              onChange={(e) => setSecondName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم الجد"
              placeholder="مثال: سالم"
              value={thirdName}
              onChange={(e) => setThirdName(e.target.value)}
            />
            <Input
              label="اسم العائلة (اللقب)"
              placeholder="مثال: العتيبي"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            label="رقم الهوية الوطنية (10 أرقام)"
            placeholder="مثال: 1023456789"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              الشعبة المقيد بها:
            </label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(Number(e.target.value))}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => createMutation.mutate()}
            isLoading={createMutation.isPending}
            disabled={!firstName || !lastName || nationalId.length < 10}
          >
            تأكيد الإضافة والقيد
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default AdminStudentsPage;
