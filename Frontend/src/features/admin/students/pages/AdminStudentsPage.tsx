import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { GraduationCap, Search, UserPlus, UserX, Pencil } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibTableLoading } from '../../../../shared/components/ui/Spinner';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';
import { useNotifications } from '../../../notifications';

export function AdminStudentsPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const classIdParam = searchParams.get('classId');
  const [selectedClassId, setSelectedClassId] = useState<number>(classIdParam ? Number(classIdParam) : 0);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [thirdName, setThirdName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');
  const [targetClassId, setTargetClassId] = useState<number>(101);

  const resetForm = () => {
    setFirstName('');
    setSecondName('');
    setThirdName('');
    setLastName('');
    setNationalId('');
    setParentName('');
    setParentPhoneNumber('');
    setEditingStudentId(null);
  };

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { data: pagedData, isLoading } = useQuery({
    queryKey: ['paged_enrollments', selectedClassId, search, pageNumber, pageSize],
    queryFn: () =>
      schoolDataService.getPagedEnrollments({
        classId: selectedClassId > 0 ? selectedClassId : undefined,
        search: search.trim() || undefined,
        pageNumber,
        pageSize,
        isActive: true,
      }),
  });

  const enrollments = pagedData?.items ?? [];
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPageNumber(1);
  };

  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
    setPageNumber(1);
  };

  const openEditModal = (en: any) => {
    setEditingStudentId(en.student?.studentId || en.studentId);
    setFirstName(en.student?.firstName || '');
    setSecondName(en.student?.secondName || '');
    setThirdName(en.student?.thirdName || '');
    setLastName(en.student?.lastName || '');
    setNationalId(en.student?.nationalId || en.nationalId || '');
    setParentName(en.student?.parent?.fullName || en.student?.parentName || '');
    setParentPhoneNumber(en.student?.parent?.phoneNumber || en.student?.parentPhoneNumber || '');
    setIsEditModalOpen(true);
  };

  // Create student mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await schoolDataService.createStudent(
        {
          firstName: firstName.trim(),
          secondName: secondName.trim(),
          thirdName: thirdName.trim(),
          lastName: lastName.trim(),
          nationalId: nationalId.trim(),
          parentName: parentName.trim() || undefined,
          parentPhoneNumber: parentPhoneNumber.trim() || undefined,
        },
        targetClassId,
        1
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paged_enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['class_enrollments_all'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.show('تم إضافة الطالب وقيده في الشعبة بنجاح', 'success');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.show('فشل إضافة الطالب، يرجى التأكد من صحة البيانات', 'danger');
    },
  });

  // Edit student mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingStudentId) return;
      return await schoolDataService.updateStudentDetails(editingStudentId, {
        firstName: firstName.trim(),
        secondName: secondName.trim(),
        thirdName: thirdName.trim(),
        lastName: lastName.trim(),
        nationalId: nationalId.trim(),
        parentName: parentName.trim() || undefined,
        parentPhoneNumber: parentPhoneNumber.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paged_enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['class_enrollments_all'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.show('تم تحديث بيانات الطالب وولي الأمر بنجاح', 'success');
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err?.message || 'فشل تحديث بيانات الطالب';
      toast.show(typeof msg === 'string' ? msg : 'فشل التحديث', 'danger');
    },
  });

  // Deactivate enrollment mutation
  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      await schoolDataService.removeStudentFromClass(enrollmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paged_enrollments'] });
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
                إضافة الطلاب، ربطهم بالشعب الدراسية، إدارة بيانات أولياء الأمور والبحث بالهوية الوطنية
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
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
            onChange={(e) => handleClassChange(Number(e.target.value))}
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
            onChange={(e) => handleSearchChange(e.target.value)}
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
                <th className="px-4 py-3.5 font-bold">ولي الأمر والجوال</th>
                <th className="px-4 py-3.5 font-bold text-center w-28">صفة التمثيل</th>
                <th className="px-4 py-3.5 font-bold text-center w-24">حالة القيد</th>
                <th className="px-4 py-3.5 font-bold text-center w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F3]">
              {isLoading ? (
                <MuwathibTableLoading colSpan={8} message="جاري استرجاع سجلات الطلاب المقيدين..." />
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#89949A]">
                    لا يوجد طلاب مطابقون لخيارات البحث
                  </td>
                </tr>
              ) : (
                enrollments.map((en, idx) => {
                  const pName = en.student?.parent?.fullName || en.student?.parentName;
                  const pPhone = en.student?.parent?.phoneNumber || en.student?.parentPhoneNumber;
                  return (
                    <tr key={en.enrollmentId} className="hover:bg-[#F5F9F9] transition-colors">
                      <td className="px-4 py-3 font-mono text-[#89949A] text-center">{(pageNumber - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-medium text-[#5F6B73]">
                        <span className="px-2 py-0.5 rounded bg-[#F5F7F8] border border-[#EEF2F3]">
                          {en.student?.nationalId}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#17252B]">{en.studentName}</td>
                      <td className="px-4 py-3 text-[#5F6B73] font-medium font-mono">{en.className}</td>
                      <td className="px-4 py-3">
                        {pName || pPhone ? (
                          <div>
                            <span className="font-semibold block text-[#17252B]">{pName || 'ولي أمر'}</span>
                            {pPhone && <span className="font-mono text-[#5F6B73] text-[11px]">{pPhone}</span>}
                          </div>
                        ) : (
                          <span className="text-[#89949A] text-[11px]">غير مسجل</span>
                        )}
                      </td>
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(en)}
                            className="p-1.5 rounded-lg text-[#245B63] hover:bg-[#E8F1F1] transition-colors cursor-pointer"
                            title="تعديل بيانات الطالب وولي الأمر"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMutation.mutate(en.enrollmentId)}
                            className="p-1.5 rounded-lg text-[#89949A] hover:text-[#A61B1B] hover:bg-[#FDECEC] transition-colors cursor-pointer"
                            title="إنهاء القيد من الشعبة"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Add Student Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة طالب جديد وقيده في الشعبة"
        description="أدخل البيانات الرسمية الرباعية للطالب، بيانات ولي الأمر، ورقم الهوية الوطنية."
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الاسم الأول *"
              placeholder="مثال: محمد"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="اسم الأب *"
              placeholder="مثال: أحمد"
              value={secondName}
              onChange={(e) => setSecondName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم الجد *"
              placeholder="مثال: سالم"
              value={thirdName}
              onChange={(e) => setThirdName(e.target.value)}
              required
            />
            <Input
              label="اسم العائلة (اللقب) *"
              placeholder="مثال: العتيبي"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            label="رقم الهوية الوطنية (10 أرقام) *"
            placeholder="مثال: 1023456789"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            dir="ltr"
            className="text-left font-mono"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم ولي الأمر"
              placeholder="مثال: أحمد سالم العتيبي"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
            />
            <Input
              label="رقم جوال ولي الأمر"
              placeholder="05XXXXXXXX"
              value={parentPhoneNumber}
              onChange={(e) => setParentPhoneNumber(e.target.value)}
              dir="ltr"
              className="text-left font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              الشعبة المقيد بها *:
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

      {/* Edit Student Modal */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل بيانات الطالب وولي الأمر"
        description="تعديل البيانات الأساسية للطالب وبيانات ولي الأمر المسجلة في النظام."
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الاسم الأول *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="اسم الأب *"
              value={secondName}
              onChange={(e) => setSecondName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم الجد *"
              value={thirdName}
              onChange={(e) => setThirdName(e.target.value)}
              required
            />
            <Input
              label="اسم العائلة (اللقب) *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            label="رقم الهوية الوطنية *"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            dir="ltr"
            className="text-left font-mono"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم ولي الأمر"
              placeholder="اسم ولي الأمر"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
            />
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
          <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => editMutation.mutate()}
            isLoading={editMutation.isPending}
            disabled={!firstName || !lastName || nationalId.length < 10}
          >
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default AdminStudentsPage;
