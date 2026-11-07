
import { useState } from 'react';
import { useAuth } from '../../../auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  GraduationCap,
  Search,
  UserPlus,
  UserX,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibTableLoading } from '../../../../shared/components/ui/Spinner';
import { useNotifications } from '../../../notifications';

interface StudentFormData {
  firstName: string;
  secondName: string;
  thirdName: string;
  lastName: string;
  nationalId: string;
}

export function RepresentativeStudentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const classId = user?.classId || 105;

  const [search, setSearch] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [studentToRemove, setStudentToRemove] = useState<{
    enrollmentId: number;
    name: string;
  } | null>(null);

  // بيانات الطالب
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [thirdName, setThirdName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFirstName('');
    setSecondName('');
    setThirdName('');
    setLastName('');
    setNationalId('');
    setEditingStudentId(null);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    resetForm();
  };

  // تحميل طلاب الشعبة
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(classId),
  });

  // إضافة طالب
  const addMutation = useMutation({
    mutationFn: async () => {
      return await schoolDataService.createStudent(
        {
          firstName,
          secondName,
          thirdName,
          lastName,
          nationalId,
        },
        classId,
        1
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['enrollments', classId],
      });

      toast.show('تمت إضافة الطالب إلى الشعبة بنجاح', 'success');
      closeFormModal();
    },

    onError: () => {
      toast.show('فشلت إضافة الطالب، يرجى التحقق من البيانات', 'danger');
    },
  });

  // تعديل بيانات الطالب

  const updateMutation = useMutation({
    mutationFn: async (data: {
      studentId: number;
      student: StudentFormData;
    }) => {
      return await schoolDataService.updateStudent(data.studentId,data.student)
      
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['enrollments', classId],
      });

      toast.show('تم تعديل بيانات الطالب بنجاح', 'success');
      closeFormModal();
    },

    onError: () => {
      toast.show('فشل تعديل بيانات الطالب', 'danger');
    },
  });

  // إنهاء قيد الطالب من الشعبة
  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      await schoolDataService.removeStudentFromClass(enrollmentId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['enrollments', classId],
      });

      toast.show('تم إنهاء قيد الطالب من الشعبة', 'info');
      setStudentToRemove(null);
    },

    onError: () => {
      toast.show('فشل حذف الطالب من الشعبة', 'danger');
    },
  });

  // فتح نافذة إضافة طالب
  const handleOpenAddModal = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  
const handleEditStudent = (
  enrollment: (typeof enrollments)[number]
) => {
  const student = enrollment.student;

  // الحصول على رقم الطالب
  const studentId = student?.studentId ?? enrollment.studentId;

  if (!studentId) {
    toast.show('تعذر تحديد رقم الطالب', 'danger');
    return;
  }

  // الحصول على الاسم الكامل
  const fullName = (
    student?.fullName ||
    enrollment.studentName ||
    ''
  ).trim();

  // تقسيم الاسم الكامل إلى أجزائه
  const nameParts = fullName
    .split(/\s+/)
    .filter(Boolean);

  // تعبئة البيانات من الحقول المفصلة أو الاسم الكامل
  const resolvedFirstName =
    student?.firstName || nameParts[0] || '';

  const resolvedSecondName =
    student?.secondName || nameParts[1] || '';

  const resolvedThirdName =
    student?.thirdName ||
    (nameParts.length >= 4
      ? nameParts.slice(2, -1).join(' ')
      : nameParts[2] || '');

  const resolvedLastName =
    student?.lastName ||
    (nameParts.length >= 4
      ? nameParts[nameParts.length - 1]
      : '');

  setEditingStudentId(studentId);

  setFirstName(resolvedFirstName);
  setSecondName(resolvedSecondName);
  setThirdName(resolvedThirdName);
  setLastName(resolvedLastName);

  setNationalId(
    String(student?.nationalId ?? '')
  );

  setIsFormModalOpen(true);
};


  // حفظ النموذج
  const handleSubmit = () => {
    const studentData: StudentFormData = {
      firstName: firstName.trim(),
      secondName: secondName.trim(),
      thirdName: thirdName.trim(),
      lastName: lastName.trim(),
      nationalId: nationalId.trim(),
    };

    if (editingStudentId !== null) {
      updateMutation.mutate({
        studentId: editingStudentId,
        student: studentData,
      });
    } else {
      addMutation.mutate();
    }
  };

  // البحث
  const filteredEnrollments = enrollments.filter((en) => {
    if (!search.trim()) return true;

    const query = search.trim().toLowerCase();

    const studentName = (en.studentName ?? '').toLowerCase();
    const studentNationalId = String(
      en.student?.nationalId ?? ''
    ).toLowerCase();

    return (
      studentName.includes(query) ||
      studentNationalId.includes(query)
    );
  });

  const isSaving = addMutation.isPending || updateMutation.isPending;

  const isFormValid =
  firstName.trim().length > 0 &&
  lastName.trim().length > 0 &&
  nationalId.trim().length > 0 &&
  (
    editingStudentId !== null ||
    /^\d{10}$/.test(nationalId.trim())
  );
  return (
    <div className="space-y-6">

      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#245B63]" />

            <h1 className="text-xl font-bold text-[#17252B]">
              قائمة طلاب {user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : `شعبة ${classId}`)}
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
          onClick={handleOpenAddModal}
          className="self-start sm:self-auto font-bold"
        >
          إضافة طالب للشعبة
        </Button>
      </div>

      {/* شريط البحث */}
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

        <span className="text-xs text-[#5F6B73] font-mono shrink-0">
          {filteredEnrollments.length} طالب مسجل
        </span>
      </div>

      {/* جدول الطلاب */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#F0F4F5] text-[#17252B] border-b border-[#DCE3E6]">
                <th className="px-4 py-3 font-bold w-12 text-center">#</th>
                <th className="px-4 py-3 font-bold">رقم الهوية الوطنية</th>
                <th className="px-4 py-3 font-bold">اسم الطالب الرباعي</th>
                <th className="px-4 py-3 font-bold">تاريخ القيد</th>
                <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE3E6]">
              {isLoading ? (
                <MuwathibTableLoading colSpan={5} message="جاري استرجاع بيانات طلاب الشعبة..." />
              ) : filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#89949A]">
                    لا يوجد طلاب مطابقون لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((en, idx) => (
                  <tr
                    key={en.enrollmentId}
                    className="transition-colors hover:bg-[#F0F7F7]"
                  >
                    <td className="px-4 py-3 text-center font-mono text-[#89949A]">
                      {idx + 1}
                    </td>

                    <td className="px-4 py-3 font-mono font-medium">
                      <span className="bg-[#F5F7F8] px-2 py-0.5 rounded border border-[#DCE3E6] text-[#17252B]">
                        {en.student?.nationalId ?? '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-bold text-[#17252B]">
                      {en.studentName}
                    </td>

                    <td className="px-4 py-3 font-mono text-[#5F6B73]">
                      {en.startDate}
                    </td>

                    {/* الإجراءات */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">

                        {/* تعديل */}
                        <button
                          type="button"
                          onClick={() => handleEditStudent(en)}
                          className="p-2 rounded-lg text-[#245B63] hover:bg-[#E8F1F1] transition-all cursor-pointer"
                          title="تعديل بيانات الطالب"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* حذف */}
                          <button
                            type="button"
                            onClick={() =>
                              setStudentToRemove({
                                enrollmentId: en.enrollmentId,
                                name: en.studentName ?? 'الطالب',
                              })
                            }
                            className="p-2 rounded-lg text-[#A61B1B] hover:bg-[#FDECEC] transition-all cursor-pointer"
                            title="حذف الطالب من الشعبة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة إضافة / تعديل الطالب */}
      <Dialog
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        title={
          editingStudentId !== null
            ? 'تعديل بيانات الطالب'
            : `إضافة طالب إلى ${user?.classNumber || `شعبة ${classId}`}`
        }
        description={
          editingStudentId !== null
            ? 'يمكنك تعديل بيانات الطالب المسجل في الشعبة.'
            : 'أدخل بيانات الطالب الرباعية ورقم الهوية الوطنية.'
        }
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
          <Button
            variant="secondary"
            onClick={closeFormModal}
            disabled={isSaving}
          >
            إلغاء
          </Button>

          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSaving}
            disabled={!isFormValid || isSaving}
          >
            {editingStudentId !== null ? 'حفظ التعديلات' : 'إضافة الطالب'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <Dialog
        isOpen={!!studentToRemove}
        onClose={() => setStudentToRemove(null)}
        title="تأكيد حذف الطالب"
        description="هل أنت متأكد من إنهاء قيد هذا الطالب من الشعبة؟"
      >
        <div className="py-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FDECEC] border border-[#A61B1B]/15">
            <UserX className="w-5 h-5 text-[#A61B1B] shrink-0" />

            <p className="text-sm font-bold text-[#17252B]">
              {studentToRemove?.name}
            </p>
          </div>

          <p className="text-xs text-[#89949A] mt-3">
            سيتم إنهاء قيد الطالب من هذه الشعبة.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setStudentToRemove(null)}
            disabled={removeMutation.isPending}
          >
            إلغاء
          </Button>

          <Button
            variant="danger"
            onClick={() => {
              if (studentToRemove) {
                removeMutation.mutate(studentToRemove.enrollmentId);
              }
            }}
            isLoading={removeMutation.isPending}
            disabled={removeMutation.isPending}
          >
            حذف الطالب
          </Button>
        </DialogFooter>
      </Dialog>

    </div>
  );
}

export default RepresentativeStudentsPage;
