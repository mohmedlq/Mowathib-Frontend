import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  CalendarCheck,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CreditCard,
  GraduationCap,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { useNotifications } from '../../../notifications';
import type { ClassItem } from '../../../../shared/types';

export function AdminClassesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const [selectedGrade, setSelectedGrade] = useState<number>(0); // 0 = all
  const [search, setSearch] = useState('');

  // Dialog States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);

  // Form Fields
  const [formClassNumber, setFormClassNumber] = useState<number>(101);
  const [formTotalCards, setFormTotalCards] = useState<number>(3);

  // 1. Fetch Classes
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  // 2. Fetch Representatives
  const { data: reps = [] } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => schoolDataService.getRepresentatives(),
  });

  // 3. Fetch All Enrollments (to count students per class)
  const { data: allEnrollments = [] } = useQuery({
    queryKey: ['all_enrollments'],
    queryFn: () => schoolDataService.getAllEnrollments(),
  });

  // 4. Fetch Active Academic Year
  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => schoolDataService.getActiveAcademicYear(),
  });

  const academicYearId = activeYear?.academicYearId || 1;

  // Student count map per classId
  const studentsCountByClass = useMemo(() => {
    const map = new Map<number, number>();
    allEnrollments.forEach((e) => {
      map.set(e.classId, (map.get(e.classId) || 0) + 1);
    });
    return map;
  }, [allEnrollments]);

  // Helper to get grade name
  const getGradeName = (classIdOrNumber: number) => {
    if (classIdOrNumber >= 101 && classIdOrNumber <= 110) return 'الأول الثانوي';
    if (classIdOrNumber >= 201 && classIdOrNumber <= 210) return 'الثاني الثانوي';
    if (classIdOrNumber >= 301 && classIdOrNumber <= 310) return 'الثالث الثانوي';
    return 'شعبة دراسية';
  };

  const getClassNum = (c: ClassItem) => {
    const val = Number(c.classNumber ?? c.className ?? c.classId);
    return Number.isFinite(val) ? val : c.classId;
  };

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const num = getClassNum(c);
      if (selectedGrade === 1 && !(num >= 101 && num <= 110)) return false;
      if (selectedGrade === 2 && !(num >= 201 && num <= 210)) return false;
      if (selectedGrade === 3 && !(num >= 301 && num <= 310)) return false;

      if (
        search.trim() &&
        !String(c.className).includes(search) &&
        !String(c.classNumber).includes(search) &&
        !String(c.classId).includes(search)
      ) {
        return false;
      }

      return true;
    });
  }, [classes, selectedGrade, search]);

  // Open Add Modal
  const openAddModal = () => {
    // Pick next available class number
    const existingNums = classes.map(getClassNum);
    let nextNum = 101;
    while (existingNums.includes(nextNum)) {
      nextNum++;
    }
    setFormClassNumber(nextNum);
    setFormTotalCards(3);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (c: ClassItem) => {
    setEditingClass(c);
    setFormClassNumber(c.classNumber || c.classId);
    setFormTotalCards(c.totalCards || 3);
  };

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const num = Number(formClassNumber);
      if (!num || isNaN(num)) throw new Error('يرجى إدخال رقم شعبة صحيح');

      // Duplicate check
      const duplicate = classes.some((c) => getClassNum(c) === num);
      if (duplicate) throw new Error(`الشعبة رقم ${num} مسجلة مسبقاً`);

      return await schoolDataService.createClass({
        className: `شعبة ${num}`,
        classNumber: num,
        academicYearId,
        totalCards: Number(formTotalCards) || 3,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.show('تمت إضافة الشعبة الدراسية بنجاح', 'success');
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'فشلت إضافة الشعبة الدراسية';
      toast.show(msg, 'danger');
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingClass) return;
      const num = Number(formClassNumber);
      if (!num || isNaN(num)) throw new Error('يرجى إدخال رقم شعبة صحيح');

      return await schoolDataService.updateClass(editingClass.classId, {
        className: `شعبة ${num}`,
        classNumber: num,
        academicYearId: editingClass.academicYearId || academicYearId,
        totalCards: Number(formTotalCards) || 3,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.show('تم تعديل بيانات الشعبة بنجاح', 'success');
      setEditingClass(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'فشل تعديل بيانات الشعبة';
      toast.show(msg, 'danger');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (classId: number) => {
      return await schoolDataService.deleteClass(classId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['all_enrollments'] });
      toast.show('تم حذف الشعبة الدراسية بنجاح', 'success');
      setClassToDelete(null);
    },
    onError: (err: any) => {
      console.error(err);
      toast.show(
        'لا يمكن حذف هذه الشعبة لوجود سجلات مرتبطة بها في قاعدة البيانات (مثل الطلاب أو الحضور).',
        'danger'
      );
      setClassToDelete(null);
    },
  });

  const studentsInDeleteClass = classToDelete ? (studentsCountByClass.get(classToDelete.classId) || 0) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B]">إدارة الفصول والشعب الدراسية</h1>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                استعراض الشعب الدراسية، طلاب كل شعبة، بطاقات الاستئذان، والعرفاء المعتمدين
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <span className="text-xs font-bold px-3 py-1.5 bg-[#E8F1F1] text-[#245B63] rounded-lg border border-[#CDE0E2] font-mono">
            إجمالي: {classes.length} شعبة
          </span>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
            className="text-xs font-bold shadow-xs"
          >
            إضافة شعبة جديدة
          </Button>
        </div>
      </div>

      {/* Grade Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedGrade(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 0
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            جميع المراحل ({classes.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 1
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الأول الثانوي (101-110)
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 2
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الثاني الثانوي (201-210)
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade(3)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 3
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الثالث الثانوي (301-310)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم أو اسم الشعبة..."
            className="w-full h-9.5 pr-9 pl-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg focus:bg-white focus:border-[#245B63] focus:ring-1 focus:ring-[#245B63] outline-none transition-all placeholder:text-[#89949A]"
          />
          <Search className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isClassesLoading ? (
          <div className="col-span-full p-12 bg-white dark:bg-[#122B23] rounded-xl border border-[#D8E5DF] dark:border-[#1E4638]">
            <MuwathibLoading message="جاري استرجاع قائمة الشعب الدراسية..." />
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-[#89949A] bg-white rounded-xl border border-[#DCE3E6]">
            لا توجد شعب مطابقة لخيارات الفرز الحالية
          </div>
        ) : (
          filteredClasses.map((c) => {
            const classNum = getClassNum(c);
            const studentCount = studentsCountByClass.get(c.classId) || 0;
            const mainRep = reps.find(
              (r) =>
                r.username === `${c.classId}_1` ||
                (r.className === c.className && r.role === 'Representative')
            );
            const depRep = reps.find(
              (r) =>
                r.username === `${c.classId}_2` ||
                (r.className === c.className && r.role === 'Deputy')
            );

            return (
              <div
                key={c.classId}
                className="bg-white rounded-xl border border-[#DCE3E6] p-5 shadow-xs flex flex-col justify-between hover:border-[#245B63] hover:shadow-sm transition-all"
              >
                <div>
                  {/* Card Top: Name & Badges + Actions */}
                  <div className="flex items-start justify-between border-b border-[#EEF2F3] pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#17252B] font-mono">
                          {c.className || `شعبة ${c.classId}`}
                        </span>
                        <span className="text-[10px] text-[#5F6B73] px-2 py-0.5 rounded bg-[#F5F7F8] border border-[#EEF2F3] font-medium">
                          {getGradeName(classNum)}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#89949A] font-mono block mt-0.5">
                        الرمز النظامي: {c.classId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-1.5 text-[#5F6B73] hover:text-[#245B63] hover:bg-[#E8F1F1] rounded-md transition-colors cursor-pointer"
                        title="تعديل الشعبة"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setClassToDelete(c)}
                        className="p-1.5 text-[#5F6B73] hover:text-[#A61B1B] hover:bg-[#FDECEC] rounded-md transition-colors cursor-pointer"
                        title="حذف الشعبة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-2 text-xs">
                    {/* Enrolled Students Count */}
                    <div className="flex items-center justify-between text-[#5F6B73] py-1 border-b border-[#FAFCFD]">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#245B63]" />
                        <span>الطلاب المقيدون:</span>
                      </span>
                      <span className="font-mono font-bold text-[#245B63] bg-[#E8F1F1] px-2 py-0.5 rounded border border-[#CDE0E2]">
                        {studentCount} طالباً
                      </span>
                    </div>

                    {/* Bathroom Cards */}
                    <div className="flex items-center justify-between text-[#5F6B73] py-1 border-b border-[#FAFCFD]">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#855500]" />
                        <span>بطاقات الاستئذان:</span>
                      </span>
                      <span className="font-mono font-bold text-[#855500] bg-[#FFF4DA] px-2 py-0.5 rounded border border-[#EDD38C]">
                        {c.totalCards || 3} بطاقات
                      </span>
                    </div>

                    {/* Main Representative */}
                    <div className="flex items-center justify-between text-[#5F6B73] py-1 border-b border-[#FAFCFD]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#245B63]"></span>
                        <span>العريف الأساسي:</span>
                      </span>
                      <span className="font-medium text-[#17252B] truncate max-w-[130px]">
                        {mainRep?.studentName || `${c.classId}_1`}
                      </span>
                    </div>

                    {/* Deputy Representative */}
                    <div className="flex items-center justify-between text-[#5F6B73] py-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#89949A]"></span>
                        <span>نائب العريف:</span>
                      </span>
                      <span className="font-medium text-[#17252B] truncate max-w-[130px]">
                        {depRep?.studentName || `${c.classId}_2`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="pt-4 mt-4 border-t border-[#EEF2F3] flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    onClick={() => navigate(`/admin/attendance?classId=${c.classId}`)}
                    icon={<CalendarCheck className="w-3.5 h-3.5 text-[#245B63]" />}
                  >
                    رصد الحضور
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    onClick={() => navigate(`/admin/students?classId=${c.classId}`)}
                    icon={<Users className="w-3.5 h-3.5" />}
                  >
                    الطلاب ({studentCount})
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Class Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة شعبة دراسية جديدة"
        description="أدخل رقم الشعبة ورصيد بطاقات الاستئذان المخصصة لها."
      >
        <div className="space-y-4">
          <Input
            type="number"
            label="رقم الشعبة (مثال: 101، 205، 308)"
            value={formClassNumber}
            onChange={(e) => setFormClassNumber(Number(e.target.value))}
            min={100}
            max={999}
          />

          <Input
            type="number"
            label="رصيد بطاقات الاستئذان المعتمد"
            value={formTotalCards}
            onChange={(e) => setFormTotalCards(Number(e.target.value))}
            min={1}
            max={10}
          />

          <div className="p-3 bg-[#F5F7F8] rounded-lg border border-[#DCE3E6] text-xs text-[#5F6B73]">
            سيتم إدراج الشعبة تلقائياً في المرحلة الدراسية المناسبة حسب رقمها:
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[#17252B]">
              <li>من 101 إلى 110: الصف الأول الثانوي</li>
              <li>من 201 إلى 210: الصف الثاني الثانوي</li>
              <li>من 301 إلى 310: الصف الثالث الثانوي</li>
            </ul>
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
            إضافة الشعبة
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Class Modal */}
      <Dialog
        isOpen={!!editingClass}
        onClose={() => setEditingClass(null)}
        title={`تعديل الشعبة ${editingClass?.className || editingClass?.classId}`}
        description="تعديل بيانات الشعبة ورصيد بطاقات الاستئذان."
      >
        <div className="space-y-4">
          <Input
            type="number"
            label="رقم الشعبة"
            value={formClassNumber}
            onChange={(e) => setFormClassNumber(Number(e.target.value))}
            min={100}
            max={999}
          />

          <Input
            type="number"
            label="رصيد بطاقات الاستئذان"
            value={formTotalCards}
            onChange={(e) => setFormTotalCards(Number(e.target.value))}
            min={1}
            max={10}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setEditingClass(null)}>
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

      {/* Delete Class Confirmation Modal */}
      <Dialog
        isOpen={!!classToDelete}
        onClose={() => setClassToDelete(null)}
        title="تأكيد حذف الشعبة الدراسية"
        description={`هل أنت متأكد من رغبتك في حذف ${classToDelete?.className || `شعبة ${classToDelete?.classId}`}؟`}
      >
        {studentsInDeleteClass > 0 ? (
          <div className="p-3 bg-[#FDECEC] border border-[#F5C2C2] rounded-lg text-xs text-[#A61B1B] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-1">لا يمكن حذف هذه الشعبة حالياً:</strong>
              تضم هذه الشعبة <strong>{studentsInDeleteClass} طالب مقيد</strong>. لحماية سجلات وبيانات الطلاب الأكاديمية، يجب نقل أو إلغاء قيد جميع الطلاب من الشعبة أولاً قبل التمكن من حذفها.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#FFF4DA] border border-[#EDD38C] rounded-lg text-xs text-[#855500] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              تنبيه: سيتم حذف الشعبة نهائياً من النظام. تأكد من عدم وجود بيانات مرتبطة بها.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => setClassToDelete(null)}>
            إلغاء
          </Button>
          <Button
            variant="danger"
            disabled={studentsInDeleteClass > 0}
            onClick={() => classToDelete && deleteMutation.mutate(classToDelete.classId)}
            isLoading={deleteMutation.isPending}
          >
            تأكيد الحذف
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default AdminClassesPage;
