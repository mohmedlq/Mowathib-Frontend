
import { useState } from 'react';
import { useAuth } from '../../../auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentsApi } from '../../../enrollments/api/enrollmentsApi';
import { studentsApi } from '../../../students/api/studentsApi';
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
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';
import { useNotifications } from '../../../notifications';

interface StudentFormData {
  firstName: string;
  secondName: string;
  thirdName: string;
  lastName: string;
  nationalId: string;
  parentName?: string;
  parentPhoneNumber?: string;
}

export function RepresentativeStudentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const classId = user?.classId || 105;

  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [studentToRemove, setStudentToRemove] = useState<{
    enrollmentId: number;
    name: string;
  } | null>(null);

  // بيانات الطالب وولي الأمر
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [thirdName, setThirdName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');
  const [isParentNameCustomized, setIsParentNameCustomized] = useState(false);

  // تحديث أسماء الطالب وتحديث اسم ولي الأمر تلقائياً
  const updateSecondName = (val: string) => {
    setSecondName(val);
    if (!isParentNameCustomized) {
      setParentName(`${val.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim());
    }
  };

  const updateThirdName = (val: string) => {
    setThirdName(val);
    if (!isParentNameCustomized) {
      setParentName(`${secondName.trim()} ${val.trim()} ${lastName.trim()}`.trim());
    }
  };

  const updateLastName = (val: string) => {
    setLastName(val);
    if (!isParentNameCustomized) {
      setParentName(`${secondName.trim()} ${thirdName.trim()} ${val.trim()}`.trim());
    }
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFirstName('');
    setSecondName('');
    setThirdName('');
    setLastName('');
    setNationalId('');
    setParentName('');
    setParentPhoneNumber('');
    setIsParentNameCustomized(false);
    setEditingStudentId(null);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    resetForm();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPageNumber(1);
  };

  // تحميل طلاب الشعبة
  const { data: pagedData, isLoading } = useQuery({
    queryKey: ['enrollments_paged', classId, search, pageNumber, pageSize],
    queryFn: () =>
      enrollmentsApi.getPagedEnrollments({
        classId,
        search: search.trim() || undefined,
        pageNumber,
        pageSize,
        isActive: true,
      }),
  });

  const enrollments = pagedData?.items ?? [];
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;

  // إضافة طالب
  const addMutation = useMutation({
    mutationFn: async () => {
      const concluded = `${secondName.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim();
      const finalParentName = parentName.trim() || (concluded || undefined);

      return await studentsApi.createStudent(
        {
          firstName: firstName.trim(),
          secondName: secondName.trim(),
          thirdName: thirdName.trim(),
          lastName: lastName.trim(),
          nationalId: nationalId.trim(),
          parentName: finalParentName,
          parentPhoneNumber: parentPhoneNumber.trim() || undefined,
        },
        classId,
        1
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['enrollments_paged', classId],
      });
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
      return await studentsApi.updateStudentDetails(data.studentId, data.student);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['enrollments_paged', classId],
      });
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
      await enrollmentsApi.removeStudentFromClass(enrollmentId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['enrollments_paged', classId],
      });
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
    (enrollment as any)?.firstName ||
    student?.firstName ||
    nameParts[0] ||
    '';

  const resolvedSecondName =
    (enrollment as any)?.secondName ||
    student?.secondName ||
    nameParts[1] ||
    '';

  const resolvedThirdName =
    (enrollment as any)?.thirdName ||
    student?.thirdName ||
    (nameParts.length >= 4
      ? nameParts.slice(2, -1).join(' ')
      : nameParts[2] || '');

  const resolvedLastName =
    (enrollment as any)?.lastName ||
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
    String((enrollment as any)?.nationalId ?? student?.nationalId ?? '')
  );

  const concluded = `${resolvedSecondName} ${resolvedThirdName} ${resolvedLastName}`.trim() ||
    (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const rawExistingPName =
    (enrollment as any)?.parentName ||
    student?.parent?.fullName ||
    (student as any)?.parentName ||
    '';
  const existingPName = (rawExistingPName && rawExistingPName.trim() !== 'ولي أمر')
    ? rawExistingPName.trim()
    : '';
  const existingPhone =
    (enrollment as any)?.parentPhoneNumber ||
    student?.parent?.phoneNumber ||
    (student as any)?.parentPhoneNumber ||
    '';

  setParentName(existingPName || concluded);
  setIsParentNameCustomized(Boolean(existingPName && existingPName !== concluded));
  setParentPhoneNumber(existingPhone);

  setIsFormModalOpen(true);
};


  // حفظ النموذج
  const handleSubmit = () => {
    const concludedParentName = `${secondName.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim();
    const finalParentName = parentName.trim() || (concludedParentName || undefined);

    const studentData: StudentFormData = {
      firstName: firstName.trim(),
      secondName: secondName.trim(),
      thirdName: thirdName.trim(),
      lastName: lastName.trim(),
      nationalId: nationalId.trim(),
      parentName: finalParentName,
      parentPhoneNumber: parentPhoneNumber.trim() || undefined,
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
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهوية..."
            className="w-full h-9 pr-9 pl-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-md focus:bg-white focus:border-[#245B63] outline-none"
          />

          <Search className="w-4 h-4 text-[#89949A] absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        <span className="text-xs text-[#5F6B73] font-mono shrink-0">
          {totalCount} طالب مسجل
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
                <th className="px-4 py-3 font-bold">ولي الأمر والجوال</th>
                <th className="px-4 py-3 font-bold">تاريخ القيد</th>
                <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE3E6]">
              {isLoading ? (
                <MuwathibTableLoading colSpan={6} message="جاري استرجاع بيانات طلاب الشعبة..." />
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#89949A]">
                    لا يوجد طلاب مطابقون لمعايير البحث
                  </td>
                </tr>
              ) : (
                enrollments.map((en, idx) => {
                  const nameParts = (en.studentName || en.student?.fullName || '').trim().split(/\s+/).filter(Boolean);
                  const fallbackFromFullName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
                  const concludedFromParts = `${(en as any).secondName || en.student?.secondName || ''} ${(en as any).thirdName || en.student?.thirdName || ''} ${(en as any).lastName || en.student?.lastName || ''}`.trim();
                  const concludedParent = concludedFromParts || fallbackFromFullName;
                  const rawPName = (en as any).parentName || en.student?.parent?.fullName || (en.student as any)?.parentName;
                  const pName = (rawPName && rawPName.trim() !== 'ولي أمر')
                    ? rawPName.trim()
                    : (concludedParent || 'ولي أمر');
                  const pPhone = (en as any).parentPhoneNumber || en.student?.parent?.phoneNumber || (en.student as any)?.parentPhoneNumber;
                  return (
                  <tr
                    key={en.enrollmentId}
                    className="transition-colors hover:bg-[#F0F7F7]"
                  >
                    <td className="px-4 py-3 text-center font-mono text-[#89949A]">
                      {(pageNumber - 1) * pageSize + idx + 1}
                    </td>

                    <td className="px-4 py-3 font-mono font-medium">
                      <span className="bg-[#F5F7F8] px-2 py-0.5 rounded border border-[#DCE3E6] text-[#17252B]">
                        {en.student?.nationalId ?? (en as any).nationalId ?? '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-bold text-[#17252B]">
                      {en.studentName}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="font-semibold block text-[#17252B]">{pName}</span>
                        {pPhone ? (
                          <span className="font-mono text-[#5F6B73] text-[11px]">{pPhone}</span>
                        ) : (
                          <span className="text-[#89949A] text-[10px] block">لا يوجد رقم جوال</span>
                        )}
                      </div>
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
                );})
              )}
            </tbody>
          </table>
        </div>

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
          isLoading={isLoading}
          itemLabel="طالب"
        />
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
              onChange={(e) => updateSecondName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم الجد"
              placeholder="مثال: علي"
              value={thirdName}
              onChange={(e) => updateThirdName(e.target.value)}
            />

            <Input
              label="اسم العائلة"
              placeholder="مثال: الغامدي"
              value={lastName}
              onChange={(e) => updateLastName(e.target.value)}
            />
          </div>

          <Input
            label="رقم الهوية الوطنية"
            placeholder="10 أرقام"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="اسم ولي الأمر"
                placeholder="مثال: إبراهيم علي الغامدي"
                value={parentName}
                onChange={(e) => {
                  setParentName(e.target.value);
                  setIsParentNameCustomized(true);
                }}
              />
              {!isParentNameCustomized && (secondName || thirdName || lastName) && (
                <span className="text-[10px] text-[#245B63] mt-1 block">
                  * يُستنتج تلقائياً من اسم الأب والجد والعائلة
                </span>
              )}
            </div>

            <Input
              label="رقم جوال ولي الأمر"
              placeholder="05XXXXXXXX"
              value={parentPhoneNumber}
              onChange={(e) => setParentPhoneNumber(e.target.value)}
              dir="ltr"
              className="text-left font-mono"
            />
          </div>
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
