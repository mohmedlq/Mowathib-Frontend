import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { filterClassesForClerk } from '../../../../shared/utils/clerkAccess';
import {
  GraduationCap,
  Search,
  UserPlus,
  Pencil,
  Building2,
  Filter,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibTableLoading } from '../../../../shared/components/ui/Spinner';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';
import { useNotifications } from '../../../notifications';
import type { Student } from '../../../../shared/types';

export function ClerkStudentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();
  const [searchParams] = useSearchParams();
  const schoolCode = user?.schoolCode;

  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | 0>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [thirdName, setThirdName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');
  const [isParentNameCustomized, setIsParentNameCustomized] = useState(false);
  const [formClassId, setFormClassId] = useState<number>(0);

  // Check if opened with add=true param
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsFormModalOpen(true);
    }
  }, [searchParams]);

  const resetForm = () => {
    setFirstName('');
    setSecondName('');
    setThirdName('');
    setLastName('');
    setNationalId('');
    setParentName('');
    setParentPhoneNumber('');
    setIsParentNameCustomized(false);
    setFormClassId(0);
    setEditingStudent(null);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    resetForm();
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    resetForm();
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFirstName(student.firstName);
    setSecondName(student.secondName);
    setThirdName(student.thirdName);
    setLastName(student.lastName);
    setNationalId(student.nationalId);

    const concluded = `${student.secondName || ''} ${student.thirdName || ''} ${student.lastName || ''}`.trim();
    const existingPName = student.parentName || (student as any).parent?.fullName;
    setParentName(existingPName || concluded);
    setIsParentNameCustomized(!!existingPName && existingPName !== concluded);
    setParentPhoneNumber(student.parentPhoneNumber || (student as any).parent?.phoneNumber || '');
    setIsEditModalOpen(true);
  };

  // Fetch school classes
  const { data: rawClasses = [] } = useQuery({
    queryKey: ['clerk_students_classes', schoolCode],
    queryFn: async () => {
      if (!schoolCode) return await schoolDataService.getClasses();
      return await schoolDataService.getClassesBySchool(schoolCode);
    },
    staleTime: 1000 * 60 * 10,
  });

  const classes = useMemo(() => filterClassesForClerk(rawClasses, user?.access), [rawClasses, user?.access]);

  // Fetch students (school-scoped with projection and pagination)
  const { data: pagedData, isLoading } = useQuery({
    queryKey: ['clerk_students_paged', schoolCode, search, selectedClassId, user?.access, pageNumber, pageSize],
    queryFn: async () => {
      if (!schoolCode) {
        return { items: [] as Student[], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
      }
      return await schoolDataService.getStudentsBySchoolPaged(schoolCode, {
        pageNumber,
        pageSize,
        search: search.trim() || undefined,
        classId: selectedClassId > 0 ? selectedClassId : undefined,
        access: user?.access,
      });
    },
    enabled: Boolean(schoolCode),
  });

  const students: Student[] = pagedData?.items ?? (pagedData as any)?.Items ?? [];
  const totalCount = pagedData?.totalCount ?? (pagedData as any)?.TotalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? (pagedData as any)?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));

  // Add Student Mutation (with transactional enrollment)
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!formClassId || formClassId <= 0) {
        throw new Error('يرجى تحديد الشعبة الدراسية للطالب');
      }

      const concluded = `${secondName.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim();
      const finalParentName = parentName.trim() || (concluded || undefined);

      return await schoolDataService.createStudentWithEnrollment(
        {
          firstName: firstName.trim(),
          secondName: secondName.trim(),
          thirdName: thirdName.trim(),
          lastName: lastName.trim(),
          nationalId: nationalId.trim(),
          parentName: finalParentName,
          parentPhoneNumber: parentPhoneNumber.trim() || undefined,
          classId: formClassId,
          schoolCode,
        },
        schoolCode
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clerk_students_paged'] });
      queryClient.invalidateQueries({ queryKey: ['clerk_school_students_count'] });
      toast.show('تمت إضافة الطالب وقيده في الشعبة بنجاح', 'success');
      closeFormModal();
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err?.message || 'فشلت إضافة الطالب، يرجى التحقق من صحة البيانات';
      toast.show(typeof msg === 'string' ? msg : 'فشلت إضافة الطالب', 'danger');
    },
  });

  // Edit Student Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingStudent) return;
      const concluded = `${secondName.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim();
      const finalParentName = parentName.trim() || (concluded || undefined);

      return await schoolDataService.updateStudentDetails(editingStudent.studentId, {
        firstName: firstName.trim(),
        secondName: secondName.trim(),
        thirdName: thirdName.trim(),
        lastName: lastName.trim(),
        nationalId: nationalId.trim(),
        parentName: finalParentName,
        parentPhoneNumber: parentPhoneNumber.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clerk_students_paged'] });
      toast.show('تم تحديث بيانات الطالب بنجاح', 'success');
      closeEditModal();
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err?.message || 'فشل تحديث البيانات، تأكد من عدم تكرار رقم الهوية';
      toast.show(typeof msg === 'string' ? msg : 'فشل تحديث البيانات', 'danger');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Context Bar */}
      <div className="bg-white dark:bg-[#122B23] p-5 sm:p-6 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0B5D43] text-white flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-[#122B23] dark:text-[#F4F8F6] tracking-tight">
                إدارة طلاب المدرسة والقيد
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] font-bold">
                {user?.schoolName || 'مدرسة مواظب'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E1EFEA] dark:bg-[#164736] text-[#0B5D43] dark:text-[#A3E2B8] font-bold">
                نطاق الصلاحية: {user?.access || 'جميع الشعب'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#718A80] dark:text-[#A3C7B9] mt-1">
              استعراض وتحديث بيانات طلاب المدرسة وإضافة الطلاب الجدد مع قيدهم في الفصول والشعب
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => {
            resetForm();
            if (classes.length > 0) setFormClassId(classes[0].classId);
            setIsFormModalOpen(true);
          }}
          className="bg-[#0B5D43] hover:bg-[#084733] text-white shrink-0"
        >
          <span>إضافة طالب جديد</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="بحث بالاسم أو رقم الهوية..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageNumber(1);
            }}
            rightIcon={<Search className="w-4 h-4 text-[#5F6B73] dark:text-[#9BAAB1]" />}
            className="w-full text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#5F6B73] dark:text-[#9BAAB1] shrink-0" />
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(Number(e.target.value));
              setPageNumber(1);
            }}
            className="h-10 px-3 bg-[#F5F7F8] dark:bg-[#122B23] text-[#17252B] dark:text-[#F0F4F6] text-xs font-medium rounded-lg border border-[#DCE3E6] dark:border-[#28373D] focus:border-[#245B63] outline-none cursor-pointer w-full sm:w-48"
          >
            <option value={0}>جميع شعب المدرسة</option>
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                شعبة {c.classNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs overflow-hidden">
        {isLoading ? (
          <MuwathibTableLoading colSpan={5} message="جاري استرجاع بيانات طلاب المدرسة..." />
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-sm text-[#17252B] dark:text-[#F0F4F6]">لا يوجد طلاب مطابقين</p>
            <p className="mt-1">لم يتم العثور على طلاب مسجلين وفق معايير البحث المحددة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F8FAFB] dark:bg-[#152328] border-b border-[#DCE3E6] dark:border-[#28373D] text-[#5F6B73] dark:text-[#9BAAB1]">
                <tr>
                  <th className="py-3 px-4 font-semibold">م</th>
                  <th className="py-3 px-4 font-semibold">اسم الطالب رباعياً</th>
                  <th className="py-3 px-4 font-semibold">رقم الهوية الوطنية</th>
                  <th className="py-3 px-4 font-semibold">الشعبة المسجل بها</th>
                  <th className="py-3 px-4 font-semibold">ولي الأمر والجوال</th>
                  <th className="py-3 px-4 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F3] dark:divide-[#28373D] text-[#17252B] dark:text-[#E8F1EC]">
                {students.map((student: Student, idx: number) => (
                  <tr
                    key={student.studentId}
                    className="hover:bg-[#F9FCFA] dark:hover:bg-[#1A3326] transition-colors"
                  >
                    <td className="py-3 px-4 text-[#5F6B73] dark:text-[#9BAAB1]">
                      {(pageNumber - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold">{student.fullName}</td>
                    <td className="py-3 px-4 font-mono text-[#3E544C] dark:text-[#A3E2B8]">
                      {student.nationalId}
                    </td>
                    <td className="py-3 px-4">
                      {student.classNumber ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#E8F1F3] dark:bg-[#1C353D] text-[#1F7A8C] dark:text-[#68D8D6] font-semibold text-[11px]">
                          <Building2 className="w-3 h-3" />
                          <span>شعبة {student.classNumber}</span>
                        </span>
                      ) : (
                        <span className="text-[#5F6B73] dark:text-[#9BAAB1] text-[11px]">
                          غير مقيد
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {student.parentName || student.parentPhoneNumber ? (
                        <div className="text-xs">
                          <span className="font-semibold block text-[#17252B] dark:text-[#F0F4F6]">
                            {student.parentName || 'ولي أمر'}
                          </span>
                          {student.parentPhoneNumber && (
                            <span className="font-mono text-[#5F6B73] dark:text-[#9BAAB1] text-[11px]">
                              {student.parentPhoneNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#89949A] text-[11px]">غير مسجل</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(student)}
                        className="text-xs text-[#0B5D43] hover:text-[#084733] hover:bg-[#EAF5EF] dark:hover:bg-[#163828] p-1.5"
                        title="تعديل بيانات الطالب"
                      >
                        <Pencil className="w-4 h-4 ml-1" />
                        <span>تعديل</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-[#DCE3E6] dark:border-[#28373D] flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
              إجمالي الطلاب: <strong className="text-[#17252B] dark:text-[#F0F4F6]">{totalCount}</strong> طالب
            </span>
            <PaginationControls
              pageNumber={pageNumber}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPageNumber}
            />
          </div>
        )}
      </div>

      {/* Modal: Add Student */}
      <Dialog
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        title="إضافة طالب جديد وقيده في شعبة"
        maxWidth="md"
      >
        <div className="space-y-3.5 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الاسم الأول *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="مثال: محمد"
              required
            />
            <Input
              label="اسم الأب *"
              value={secondName}
              onChange={(e) => {
                const val = e.target.value;
                setSecondName(val);
                if (!isParentNameCustomized) {
                  setParentName(`${val} ${thirdName} ${lastName}`.trim());
                }
              }}
              placeholder="مثال: عبدالله"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم الجد *"
              value={thirdName}
              onChange={(e) => {
                const val = e.target.value;
                setThirdName(val);
                if (!isParentNameCustomized) {
                  setParentName(`${secondName} ${val} ${lastName}`.trim());
                }
              }}
              placeholder="مثال: سعود"
              required
            />
            <Input
              label="اسم العائلة *"
              value={lastName}
              onChange={(e) => {
                const val = e.target.value;
                setLastName(val);
                if (!isParentNameCustomized) {
                  setParentName(`${secondName} ${thirdName} ${val}`.trim());
                }
              }}
              placeholder="مثال: القحطاني"
              required
            />
          </div>

          <Input
            label="رقم الهوية الوطنية *"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="10 أرقام"
            dir="ltr"
            className="text-left font-mono"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="اسم ولي الأمر"
                value={parentName}
                onChange={(e) => {
                  setParentName(e.target.value);
                  setIsParentNameCustomized(true);
                }}
                placeholder="مثال: عبدالله سالم القحطاني"
              />
              <p className="text-[10px] text-[#245B63] mt-1 font-medium">
                {parentName ? 'مستنتج من اسم الأب والجد واللقب' : 'يُستنتج تلقائياً إن تُرِك فارغاً'}
              </p>
            </div>
            <div>
              <Input
                label="رقم جوال ولي الأمر"
                value={parentPhoneNumber}
                onChange={(e) => setParentPhoneNumber(e.target.value)}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className="text-left font-mono"
              />
              <p className="text-[10px] text-[#5F6B73] mt-1">
                تحديث جوال ولي الأمر للتنبيهات
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] mb-1.5">
              الشعبة الدراسية المقيد بها *
            </label>
            <select
              value={formClassId}
              onChange={(e) => setFormClassId(Number(e.target.value))}
              className="w-full h-10 px-3 bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6] text-xs font-medium rounded-lg border border-[#DCE3E6] dark:border-[#28373D] focus:border-[#245B63] outline-none cursor-pointer"
            >
              <option value={0}>-- حدد الشعبة --</option>
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  شعبة {c.classNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={closeFormModal}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={addMutation.isPending || !firstName || !lastName || !nationalId || !formClassId}
            onClick={() => addMutation.mutate()}
            className="bg-[#0B5D43] hover:bg-[#084733] text-white"
          >
            {addMutation.isPending ? 'جاري الإضافة...' : 'حفظ وقيد الطالب'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal: Edit Student */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="تعديل بيانات الطالب"
        maxWidth="md"
      >
        <div className="space-y-3.5 pt-2">
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
              onChange={(e) => {
                const val = e.target.value;
                setSecondName(val);
                if (!isParentNameCustomized) {
                  setParentName(`${val} ${thirdName} ${lastName}`.trim());
                }
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم الجد *"
              value={thirdName}
              onChange={(e) => {
                const val = e.target.value;
                setThirdName(val);
                if (!isParentNameCustomized) {
                  setParentName(`${secondName} ${val} ${lastName}`.trim());
                }
              }}
              required
            />
            <Input
              label="اسم العائلة *"
              value={lastName}
              onChange={(e) => {
                const val = e.target.value;
                setLastName(val);
                if (!isParentNameCustomized) {
                  setParentName(`${secondName} ${thirdName} ${val}`.trim());
                }
              }}
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
            <div>
              <Input
                label="اسم ولي الأمر"
                value={parentName}
                onChange={(e) => {
                  setParentName(e.target.value);
                  setIsParentNameCustomized(true);
                }}
                placeholder="اسم ولي الأمر"
              />
              <p className="text-[10px] text-[#245B63] mt-1 font-medium">
                مستنتج: {secondName} {thirdName} {lastName}
              </p>
            </div>
            <div>
              <Input
                label="رقم جوال ولي الأمر"
                value={parentPhoneNumber}
                onChange={(e) => setParentPhoneNumber(e.target.value)}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className="text-left font-mono"
              />
              <p className="text-[10px] text-[#5F6B73] mt-1">
                تحديث جوال ولي الأمر للتنبيهات
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={closeEditModal}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={editMutation.isPending || !firstName || !lastName || !nationalId}
            onClick={() => editMutation.mutate()}
            className="bg-[#0B5D43] hover:bg-[#084733] text-white"
          >
            {editMutation.isPending ? 'جاري الحفظ...' : 'تحديث البيانات'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default ClerkStudentsPage;
