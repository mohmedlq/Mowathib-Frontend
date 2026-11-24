import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  GraduationCap,
  Search,
  UserPlus,
  UserX,
  Pencil,
  Building2,
  Filter,
  Users,
  Phone,
  ShieldCheck,
  IdCard,
  UserRound,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';
import { useNotifications } from '../../../notifications';

export function AdminStudentsPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const classIdParam = searchParams.get('classId');
  const initialClassId = classIdParam ? Number(classIdParam) : 0;

  const [selectedClassId, setSelectedClassId] = useState<number>(
    Number.isFinite(initialClassId) && initialClassId > 0 ? initialClassId : 0
  );
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [enrollmentToRemove, setEnrollmentToRemove] = useState<{
    enrollmentId: number;
    studentName: string;
    className: string;
  } | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [thirdName, setThirdName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');
  const [isParentNameCustomized, setIsParentNameCustomized] = useState(false);
  const [targetClassId, setTargetClassId] = useState<number>(0);

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

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    resetForm();
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    resetForm();
  };

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
    staleTime: 1000 * 60 * 10,
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
    staleTime: 1000 * 30,
  });

  const enrollments = pagedData?.items ?? [];
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;

  // Keep a valid default class for the add-student form.
  useEffect(() => {
    if (classes.length === 0) return;

    setTargetClassId((current) => {
      if (classes.some((c) => c.classId === current)) return current;
      if (selectedClassId > 0 && classes.some((c) => c.classId === selectedClassId)) {
        return selectedClassId;
      }
      return classes[0].classId;
    });
  }, [classes, selectedClassId]);

  // Keep the list filter in sync when navigation changes the classId query parameter.
  useEffect(() => {
    const rawClassId = searchParams.get('classId');
    const parsedClassId = rawClassId ? Number(rawClassId) : 0;
    const nextClassId = Number.isFinite(parsedClassId) && parsedClassId > 0 ? parsedClassId : 0;

    setSelectedClassId((current) => (current === nextClassId ? current : nextClassId));
    setPageNumber(1);
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPageNumber(1);
  };

  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
    setPageNumber(1);
  };

  const openAddModal = () => {
    resetForm();
    const preferredClassId =
      selectedClassId > 0 && classes.some((c) => c.classId === selectedClassId)
        ? selectedClassId
        : classes[0]?.classId ?? 0;
    setTargetClassId(preferredClassId);
    setIsAddModalOpen(true);
  };

  const openEditModal = (enrollment: any) => {
    const student = enrollment.student || enrollment;
    setEditingStudentId(student.studentId || enrollment.studentId);

    const currentFirstName = student.firstName || enrollment.firstName || '';
    const currentSecondName = student.secondName || enrollment.secondName || '';
    const currentThirdName = student.thirdName || enrollment.thirdName || '';
    const currentLastName = student.lastName || enrollment.lastName || '';

    setFirstName(currentFirstName);
    setSecondName(currentSecondName);
    setThirdName(currentThirdName);
    setLastName(currentLastName);
    setNationalId(student.nationalId || enrollment.nationalId || '');

    const concluded = `${currentSecondName} ${currentThirdName} ${currentLastName}`.trim();
    const existingParentName =
      student.parent?.fullName || student.parentName || enrollment.parentName;

    setParentName(existingParentName || concluded);
    setIsParentNameCustomized(
      Boolean(existingParentName) && existingParentName !== concluded
    );
    setParentPhoneNumber(
      student.parent?.phoneNumber ||
        student.parentPhoneNumber ||
        enrollment.parentPhoneNumber ||
        ''
    );
    setIsEditModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!targetClassId || targetClassId <= 0) {
        throw new Error('يرجى تحديد الشعبة الدراسية للطالب');
      }

      const concluded = `${secondName.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim();
      const finalParentName = parentName.trim() || concluded || undefined;

      return await schoolDataService.createStudent(
        {
          firstName: firstName.trim(),
          secondName: secondName.trim(),
          thirdName: thirdName.trim(),
          lastName: lastName.trim(),
          nationalId: nationalId.trim(),
          parentName: finalParentName,
          parentPhoneNumber: parentPhoneNumber.trim() || undefined,
        },
        targetClassId,
        1
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paged_enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['students_paged'] });
      toast.show('تمت إضافة الطالب وقيده في الشعبة بنجاح', 'success');
      closeAddModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data ||
        error?.message ||
        'فشل إضافة الطالب، يرجى التأكد من صحة البيانات';
      toast.show(typeof message === 'string' ? message : 'فشل إضافة الطالب', 'danger');
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingStudentId) return;

      const concluded = `${secondName.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim();
      const finalParentName = parentName.trim() || concluded || undefined;

      return await schoolDataService.updateStudentDetails(editingStudentId, {
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
      // Optimistic cache update for instantaneous UI reaction
      const concluded = `${secondName.trim()} ${thirdName.trim()} ${lastName.trim()}`.trim();
      const finalParentName = parentName.trim() || concluded;
      const finalPhone = parentPhoneNumber.trim();

      queryClient.setQueriesData<any>(
        { queryKey: ['paged_enrollments'] },
        (old: any) => {
          if (!old || !Array.isArray(old.items)) return old;
          return {
            ...old,
            items: old.items.map((item: any) => {
              const sid = item.student?.studentId || item.studentId;
              if (sid === editingStudentId) {
                return {
                  ...item,
                  firstName: firstName.trim(),
                  secondName: secondName.trim(),
                  thirdName: thirdName.trim(),
                  lastName: lastName.trim(),
                  studentName: `${firstName.trim()} ${concluded}`.trim(),
                  nationalId: nationalId.trim(),
                  parentName: finalParentName,
                  parentPhoneNumber: finalPhone,
                  student: {
                    ...(item.student || {}),
                    firstName: firstName.trim(),
                    secondName: secondName.trim(),
                    thirdName: thirdName.trim(),
                    lastName: lastName.trim(),
                    fullName: `${firstName.trim()} ${concluded}`.trim(),
                    nationalId: nationalId.trim(),
                    parentName: finalParentName,
                    parentPhoneNumber: finalPhone,
                    parent: {
                      ...(item.student?.parent || {}),
                      fullName: finalParentName,
                      phoneNumber: finalPhone,
                    },
                  },
                };
              }
              return item;
            }),
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: ['paged_enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['students_paged'] });
      toast.show('تم تحديث بيانات الطالب وولي الأمر بنجاح', 'success');
      closeEditModal();
    },
    onError: (error: any) => {
      const message = error?.response?.data || error?.message || 'فشل تحديث بيانات الطالب';
      toast.show(typeof message === 'string' ? message : 'فشل التحديث', 'danger');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      await schoolDataService.removeStudentFromClass(enrollmentId);
    },
    onSuccess: (_, enrollmentId) => {
      // Optimistic cache update: remove the enrollment immediately from the visible list
      queryClient.setQueriesData<any>(
        { queryKey: ['paged_enrollments'] },
        (old: any) => {
          if (!old || !Array.isArray(old.items)) return old;
          return {
            ...old,
            totalCount: Math.max(0, (old.totalCount || 1) - 1),
            items: old.items.filter((item: any) => item.enrollmentId !== enrollmentId),
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: ['paged_enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['students_paged'] });
      setEnrollmentToRemove(null);
      toast.show('تم إنهاء قيد الطالب من الشعبة بنجاح. بقيت بياناته محفوظة في سجل الطلاب.', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data || error?.message || 'تعذر إنهاء قيد الطالب';
      toast.show(typeof message === 'string' ? message : 'تعذر إنهاء القيد', 'danger');
    },
  });

  const selectedClass = classes.find((item) => item.classId === selectedClassId);

  return (
    <div className="space-y-6 text-[#17252B] dark:text-[#E8F1EC]">
      {/* --------------------------------------------------------------------- */}
      {/* Page Header                                                           */}
      {/* --------------------------------------------------------------------- */}
      <section className="bg-white dark:bg-[#182226] p-5 sm:p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F1F1] dark:bg-[#1C353D] text-[#245B63] dark:text-[#68D8D6] flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#17252B] dark:text-[#F0F4F6]">
                  إدارة قيد وسجلات الطلاب
                </h1>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#E8F1F1] dark:bg-[#1C353D] text-[#245B63] dark:text-[#68D8D6] border border-[#CDE0E2] dark:border-[#2B4B53] font-bold">
                  {totalCount} طالب مقيد
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#5F6B73] dark:text-[#9BAAB1] mt-1 leading-relaxed">
                إدارة بيانات الطلاب وأولياء الأمور، ومتابعة قيدهم في الشعب الدراسية.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={openAddModal}
            disabled={classes.length === 0 || isClassesLoading}
            className="self-stretch lg:self-auto bg-[#245B63] hover:bg-[#1D4B52] dark:bg-[#28747B] dark:hover:bg-[#21646B] text-white font-bold shadow-xs"
          >
            <span>إضافة طالب جديد</span>
          </Button>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* Search and Filters                                                    */}
      {/* --------------------------------------------------------------------- */}
      <section className="bg-white dark:bg-[#182226] p-4 sm:p-5 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="w-full lg:max-w-md">
            <label className="block text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] mb-1.5">
              البحث عن طالب
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#89949A] dark:text-[#82939A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="ابحث بالاسم الكامل أو رقم الهوية الوطنية..."
                className="w-full h-10 pr-9 pl-3 text-xs bg-[#F8FAFA] dark:bg-[#141E22] border border-[#DCE3E6] dark:border-[#33434A] rounded-xl text-[#17252B] dark:text-[#F0F4F6] placeholder:text-[#89949A] dark:placeholder:text-[#82939A] outline-none transition-all focus:bg-white dark:focus:bg-[#172328] focus:border-[#245B63] dark:focus:border-[#438E94] focus:ring-2 focus:ring-[#245B63]/10"
              />
            </div>
          </div>

          <div className="w-full lg:w-auto lg:min-w-[260px]">
            <label className="block text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] mb-1.5">
              تصفية حسب الشعبة
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#89949A] dark:text-[#82939A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedClassId}
                onChange={(event) => handleClassChange(Number(event.target.value))}
                className="w-full h-10 pr-9 pl-3 bg-[#F8FAFA] dark:bg-[#141E22] border border-[#DCE3E6] dark:border-[#33434A] rounded-xl text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] outline-none cursor-pointer transition-colors focus:border-[#245B63] dark:focus:border-[#438E94] focus:ring-2 focus:ring-[#245B63]/10"
              >
                <option value={0}>جميع الفصول والشعب</option>
                {classes.map((classItem) => (
                  <option key={classItem.classId} value={classItem.classId}>
                    {classItem.className || `شعبة ${classItem.classNumber || classItem.classId}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#EEF2F3] dark:border-[#28373D]">
          <div className="flex items-center gap-2 text-[11px] text-[#5F6B73] dark:text-[#9BAAB1]">
            <Filter className="w-3.5 h-3.5" />
            <span>
              {selectedClassId > 0
                ? `عرض الطلاب المقيدين في ${selectedClass?.className || `شعبة ${selectedClass?.classNumber || selectedClassId}`}`
                : 'عرض الطلاب في جميع الشعب'}
            </span>
          </div>
          {(search || selectedClassId > 0) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedClassId(0);
                setPageNumber(1);
              }}
              className="text-[11px] font-bold text-[#245B63] dark:text-[#68D8D6] hover:underline focus:outline-none"
            >
              مسح عوامل التصفية
            </button>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* Students Table                                                        */}
      {/* --------------------------------------------------------------------- */}
      <section className="bg-white dark:bg-[#182226] rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-[#EEF2F3] dark:border-[#28373D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F1F1] dark:bg-[#1C353D] text-[#245B63] dark:text-[#68D8D6] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#17252B] dark:text-[#F0F4F6]">
                سجل الطلاب المقيدين
              </h2>
              <p className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5">
                بيانات الطالب والقيد ووسائل التواصل مع ولي الأمر
              </p>
            </div>
          </div>
          <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
            إجمالي النتائج: <strong className="text-[#17252B] dark:text-[#F0F4F6] tabular-nums">{totalCount}</strong>
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 sm:p-12">
            <MuwathibLoading message="جاري استرجاع سجلات الطلاب المقيدين..." />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="p-10 sm:p-14 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#F5F7F8] dark:bg-[#202D33] text-[#89949A] dark:text-[#9BAAB1] flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#17252B] dark:text-[#F0F4F6]">
              لا توجد سجلات مطابقة
            </h3>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-1 max-w-md mx-auto leading-relaxed">
              لم نعثر على طلاب وفق خيارات البحث الحالية. جرّب تغيير الشعبة أو تعديل عبارة البحث.
            </p>
            {(search || selectedClassId > 0) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedClassId(0);
                  setPageNumber(1);
                }}
                className="mt-4 dark:border-[#3A4A50] dark:text-[#E8F1EC] dark:hover:bg-[#243238]"
              >
                عرض جميع الطلاب
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-right text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFA] dark:bg-[#141E22] text-[#5F6B73] dark:text-[#9BAAB1] font-bold border-b border-[#DCE3E6] dark:border-[#28373D]">
                  <th className="py-3.5 px-4 w-14 text-center">م</th>
                  <th className="py-3.5 px-4 min-w-[190px]">اسم الطالب</th>
                  <th className="py-3.5 px-4 min-w-[145px]">رقم الهوية الوطنية</th>
                  <th className="py-3.5 px-4 min-w-[125px]">الشعبة</th>
                  <th className="py-3.5 px-4 min-w-[190px]">ولي الأمر وبيانات التواصل</th>
                  <th className="py-3.5 px-4 min-w-[110px] text-center">صفة التمثيل</th>
                  <th className="py-3.5 px-4 min-w-[100px] text-center">حالة القيد</th>
                  <th className="py-3.5 px-4 min-w-[110px] text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F3] dark:divide-[#243338] text-[#17252B] dark:text-[#E8F1EC]">
                {enrollments.map((enrollment: any, index: number) => {
                  const student = enrollment.student || enrollment;
                  const secondName = student?.secondName || enrollment.secondName || '';
                  const thirdName = student?.thirdName || enrollment.thirdName || '';
                  const lastName = student?.lastName || enrollment.lastName || '';
                  const concluded = `${secondName} ${thirdName} ${lastName}`.trim();
                  const parentDisplayName =
                    student?.parent?.fullName ||
                    student?.parentName ||
                    enrollment.parentName ||
                    concluded;
                  const parentPhone =
                    student?.parent?.phoneNumber ||
                    student?.parentPhoneNumber ||
                    enrollment.parentPhoneNumber;
                  const studentName =
                    enrollment.studentName ||
                    student?.fullName ||
                    `${student?.firstName || enrollment.firstName || ''} ${concluded}`.trim() ||
                    '—';
                  const studentNationalId = student?.nationalId || enrollment.nationalId || '—';
                  const classDisplayName =
                    enrollment.className ||
                    student?.className ||
                    (enrollment.classNumber
                      ? `شعبة ${enrollment.classNumber}`
                      : enrollment.classId
                        ? `شعبة ${enrollment.classId}`
                        : 'غير محددة');

                  return (
                    <tr
                      key={enrollment.enrollmentId}
                      className="hover:bg-[#F9FBFA] dark:hover:bg-[#1B272C] transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-[#89949A] dark:text-[#82939A] tabular-nums">
                        {(pageNumber - 1) * pageSize + index + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#E8F1F1] dark:bg-[#1C353D] text-[#245B63] dark:text-[#68D8D6] flex items-center justify-center shrink-0">
                            <UserRound className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-[#17252B] dark:text-[#F0F4F6] leading-relaxed">
                            {studentName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex px-2 py-1 rounded-md bg-[#F5F7F8] dark:bg-[#202D33] border border-[#E5EBED] dark:border-[#33434A] font-mono font-semibold text-[#52636A] dark:text-[#B3C0C5]"
                          dir="ltr"
                        >
                          {studentNationalId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8F1F3] dark:bg-[#1C353D] text-[#1F7A8C] dark:text-[#68D8D6] border border-[#D5E7E9] dark:border-[#2B4B53] font-semibold text-[11px]">
                          <Building2 className="w-3.5 h-3.5" />
                          {classDisplayName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {parentDisplayName || parentPhone ? (
                          <div className="space-y-1">
                            <span className="font-semibold block text-[#17252B] dark:text-[#F0F4F6]">
                              {parentDisplayName || 'ولي أمر'}
                            </span>
                            {parentPhone ? (
                              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#5F6B73] dark:text-[#9BAAB1]" dir="ltr">
                                <Phone className="w-3 h-3" />
                                {parentPhone}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#89949A] dark:text-[#82939A]">
                                رقم الجوال غير مسجل
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#89949A] dark:text-[#82939A]">
                            بيانات ولي الأمر غير مسجلة
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {enrollment.isRepresentative ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#245B63] dark:text-[#68D8D6] bg-[#E8F1F1] dark:bg-[#1C353D] px-2.5 py-1 rounded-full border border-[#CDE0E2] dark:border-[#2B4B53]">
                            <ShieldCheck className="w-3 h-3" />
                            عريف
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#89949A] dark:text-[#82939A]">طالب</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#176B3A] dark:text-[#4ADE80] bg-[#E8F5EC] dark:bg-[#122B1E] px-2.5 py-1 rounded-full border border-[#B7DEC5] dark:border-[#1B4D32]">
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          نشط
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(enrollment)}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#245B63] dark:text-[#68D8D6] hover:bg-[#E8F1F1] dark:hover:bg-[#1C353D] border border-transparent hover:border-[#CDE0E2] dark:hover:border-[#2B4B53] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#245B63]/40"
                            title="تعديل بيانات الطالب وولي الأمر"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                          <button
                            type="button"
                            disabled={removeMutation.isPending}
                            onClick={() =>
                              setEnrollmentToRemove({
                                enrollmentId: enrollment.enrollmentId,
                                studentName,
                                className: classDisplayName,
                              })
                            }
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#89949A] dark:text-[#9BAAB1] hover:text-[#A61B1B] dark:hover:text-[#F87171] hover:bg-[#FDECEC] dark:hover:bg-[#331518] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                            title="إنهاء القيد من الشعبة"
                            aria-label={`إنهاء قيد ${studentName}`}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalCount > 0 && (
          <div className="p-3 sm:p-4 border-t border-[#DCE3E6] dark:border-[#28373D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
              عرض <strong className="text-[#17252B] dark:text-[#F0F4F6] tabular-nums">{enrollments.length}</strong> من أصل{' '}
              <strong className="text-[#17252B] dark:text-[#F0F4F6] tabular-nums">{totalCount}</strong> طالب
            </span>
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
        )}
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* Add Student Modal                                                     */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="إضافة طالب جديد وقيده في الشعبة"
        description="أدخل بيانات الطالب وولي الأمر، ثم حدد الشعبة التي سيتم قيده فيها."
        maxWidth="md"
      >
        <div className="space-y-4 pt-1 text-right">
          <div className="p-3 rounded-xl bg-[#F5F8F9] dark:bg-[#141E22] border border-[#E4EBEC] dark:border-[#33434A] flex items-start gap-2.5">
            <IdCard className="w-4 h-4 mt-0.5 text-[#245B63] dark:text-[#68D8D6] shrink-0" />
            <p className="text-[11px] leading-relaxed text-[#5F6B73] dark:text-[#B3C0C5]">
              أدخل الاسم الرباعي ورقم الهوية كما هو مسجل رسمياً. يمكنك ترك اسم ولي الأمر فارغاً ليُستنتج من اسم الأب والجد والعائلة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="الاسم الأول *"
              placeholder="مثال: محمد"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
            />
            <Input
              label="اسم الأب *"
              placeholder="مثال: أحمد"
              value={secondName}
              onChange={(event) => {
                const value = event.target.value;
                setSecondName(value);
                if (!isParentNameCustomized) {
                  setParentName(`${value} ${thirdName} ${lastName}`.trim());
                }
              }}
              required
            />
            <Input
              label="اسم الجد *"
              placeholder="مثال: سالم"
              value={thirdName}
              onChange={(event) => {
                const value = event.target.value;
                setThirdName(value);
                if (!isParentNameCustomized) {
                  setParentName(`${secondName} ${value} ${lastName}`.trim());
                }
              }}
              required
            />
            <Input
              label="اسم العائلة *"
              placeholder="مثال: العتيبي"
              value={lastName}
              onChange={(event) => {
                const value = event.target.value;
                setLastName(value);
                if (!isParentNameCustomized) {
                  setParentName(`${secondName} ${thirdName} ${value}`.trim());
                }
              }}
              required
            />
          </div>

          <Input
            label="رقم الهوية الوطنية (10 أرقام) *"
            placeholder="مثال: 1023456789"
            value={nationalId}
            onChange={(event) => setNationalId(event.target.value)}
            dir="ltr"
            className="text-left font-mono"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="اسم ولي الأمر"
                placeholder="مثال: أحمد سالم العتيبي"
                value={parentName}
                onChange={(event) => {
                  setParentName(event.target.value);
                  setIsParentNameCustomized(true);
                }}
              />
              <p className="mt-1 text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">
                {isParentNameCustomized ? 'تم تخصيص الاسم يدوياً' : 'يُستنتج تلقائياً من اسم الأب والجد والعائلة'}
              </p>
            </div>
            <div>
              <Input
                label="رقم جوال ولي الأمر"
                placeholder="05XXXXXXXX"
                value={parentPhoneNumber}
                onChange={(event) => setParentPhoneNumber(event.target.value)}
                dir="ltr"
                className="text-left font-mono"
              />
              <p className="mt-1 text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">
                يستخدم للتواصل والتنبيهات المدرسية
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17252B] dark:text-[#F0F4F6] mb-1.5">
              الشعبة الدراسية المقيد بها *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#89949A] dark:text-[#82939A] pointer-events-none" />
              <select
                value={targetClassId}
                onChange={(event) => setTargetClassId(Number(event.target.value))}
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-white dark:bg-[#141E22] border border-[#DCE3E6] dark:border-[#33434A] text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] outline-none cursor-pointer focus:border-[#245B63] dark:focus:border-[#438E94]"
              >
                <option value={0}>-- حدد الشعبة --</option>
                {classes.map((classItem) => (
                  <option key={classItem.classId} value={classItem.classId}>
                    {classItem.className || `شعبة ${classItem.classNumber || classItem.classId}`}
                  </option>
                ))}
              </select>
            </div>
            {classes.length === 0 && (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                لا توجد شعب متاحة لإضافة الطالب.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={closeAddModal}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => createMutation.mutate()}
            isLoading={createMutation.isPending}
            disabled={
              createMutation.isPending ||
              !firstName.trim() ||
              !lastName.trim() ||
              nationalId.trim().length < 10 ||
              !targetClassId
            }
            className="bg-[#245B63] hover:bg-[#1D4B52] dark:bg-[#28747B] dark:hover:bg-[#21646B] text-white"
          >
            حفظ وقيد الطالب
          </Button>
        </DialogFooter>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* Edit Student Modal                                                    */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="تعديل بيانات الطالب وولي الأمر"
        description="حدّث البيانات الأساسية وبيانات التواصل المسجلة للطالب."
        maxWidth="md"
      >
        <div className="space-y-4 pt-1 text-right">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="الاسم الأول *"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
            />
            <Input
              label="اسم الأب *"
              value={secondName}
              onChange={(event) => {
                const value = event.target.value;
                setSecondName(value);
                if (!isParentNameCustomized) {
                  setParentName(`${value} ${thirdName} ${lastName}`.trim());
                }
              }}
              required
            />
            <Input
              label="اسم الجد *"
              value={thirdName}
              onChange={(event) => {
                const value = event.target.value;
                setThirdName(value);
                if (!isParentNameCustomized) {
                  setParentName(`${secondName} ${value} ${lastName}`.trim());
                }
              }}
              required
            />
            <Input
              label="اسم العائلة *"
              value={lastName}
              onChange={(event) => {
                const value = event.target.value;
                setLastName(value);
                if (!isParentNameCustomized) {
                  setParentName(`${secondName} ${thirdName} ${value}`.trim());
                }
              }}
              required
            />
          </div>

          <Input
            label="رقم الهوية الوطنية (10 أرقام) *"
            value={nationalId}
            onChange={(event) => setNationalId(event.target.value)}
            dir="ltr"
            className="text-left font-mono"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="اسم ولي الأمر"
                placeholder="اسم ولي الأمر"
                value={parentName}
                onChange={(event) => {
                  setParentName(event.target.value);
                  setIsParentNameCustomized(true);
                }}
              />
              <p className="mt-1 text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">
                الاسم المستنتج: {`${secondName} ${thirdName} ${lastName}`.trim() || '—'}
              </p>
            </div>
            <div>
              <Input
                label="رقم جوال ولي الأمر"
                placeholder="05XXXXXXXX"
                value={parentPhoneNumber}
                onChange={(event) => setParentPhoneNumber(event.target.value)}
                dir="ltr"
                className="text-left font-mono"
              />
              <p className="mt-1 text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">
                يستخدم للتواصل والتنبيهات المدرسية
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={closeEditModal}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => editMutation.mutate()}
            isLoading={editMutation.isPending}
            disabled={
              editMutation.isPending ||
              !firstName.trim() ||
              !lastName.trim() ||
              nationalId.trim().length < 10
            }
            className="bg-[#245B63] hover:bg-[#1D4B52] dark:bg-[#28747B] dark:hover:bg-[#21646B] text-white"
          >
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* Confirm Enrollment Removal                                            */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        isOpen={Boolean(enrollmentToRemove)}
        onClose={() => {
          if (!removeMutation.isPending) setEnrollmentToRemove(null);
        }}
        title="تأكيد إنهاء قيد الطالب"
        description="راجع بيانات الطالب قبل تأكيد الإجراء. لن يتم حذف سجل الطالب أو بياناته الشخصية."
        maxWidth="sm"
      >
        {enrollmentToRemove && (
          <div className="space-y-4 text-right">
            <div className="flex items-start gap-3 rounded-xl border border-[#F1C3C3] bg-[#FFF5F5] p-4 dark:border-[#63353A] dark:bg-[#2B1B1E]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDECEC] text-[#A61B1B] dark:bg-[#48252A] dark:text-[#FCA5A5]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-bold text-[#8F1D1D] dark:text-[#FCA5A5]">
                  هل أنت متأكد من إنهاء قيد هذا الطالب؟
                </h3>
                <p className="text-xs leading-6 text-[#7B4545] dark:text-[#E7B8BC]">
                  سيُزال الطالب من الشعبة المحددة، ولن يظهر ضمن الطلاب المقيدين فيها بعد تنفيذ العملية.
                  يمكنك إعادة قيده لاحقاً من خلال إضافة طالب إلى الشعبة.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE3E6] bg-[#F8FAFA] p-3.5 dark:border-[#33434A] dark:bg-[#141E22]">
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">اسم الطالب</span>
                <strong className="text-sm text-[#17252B] dark:text-[#F0F4F6]">
                  {enrollmentToRemove.studentName}
                </strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#E7ECEE] pt-3 dark:border-[#28373D]">
                <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">الشعبة الحالية</span>
                <span className="rounded-lg bg-[#E8F1F3] px-2.5 py-1 text-xs font-bold text-[#1F7A8C] dark:bg-[#1C353D] dark:text-[#68D8D6]">
                  {enrollmentToRemove.className}
                </span>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-[#5F6B73] dark:text-[#9BAAB1]">
              تنبيه: هذا الإجراء ينهي <strong>القيد في هذه الشعبة فقط</strong>، ولا يحذف ملف الطالب أو بيانات ولي الأمر من النظام.
            </p>
          </div>
        )}

        <DialogFooter className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={removeMutation.isPending}
            onClick={() => setEnrollmentToRemove(null)}
            className="dark:border-[#3A4A50] dark:text-[#E8F1EC] dark:hover:bg-[#243238]"
          >
            إلغاء والعودة
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!enrollmentToRemove || removeMutation.isPending}
            isLoading={removeMutation.isPending}
            onClick={() => {
              if (enrollmentToRemove && !removeMutation.isPending) {
                removeMutation.mutate(enrollmentToRemove.enrollmentId);
              }
            }}
            className="bg-[#B42318] text-white hover:bg-[#912018] focus-visible:ring-[#B42318]/30 dark:bg-[#C2413A] dark:hover:bg-[#A8322C]"
          >
            تأكيد إنهاء القيد
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default AdminStudentsPage;
