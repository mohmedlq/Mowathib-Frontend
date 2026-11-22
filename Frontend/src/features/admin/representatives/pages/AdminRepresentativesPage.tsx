import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  Users2,
  UserCheck,
  Copy,
  Check,
  Plus,
  Info,
  KeyRound,
  Search,
  Edit3,
  Power,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibTableLoading } from '../../../../shared/components/ui/Spinner';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';
import { useNotifications } from '../../../notifications';
import type { Representative, AttendanceClerk } from '../../../../shared/types';
import { CLERK_ACCESS_OPTIONS } from '../../../../shared/utils/clerkAccess';

export function AdminRepresentativesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();
  const schoolCode = user?.schoolCode;

  // Active Hub Selection: 'representatives' | 'clerks'
  const [activeTab, setActiveTab] = useState<'representatives' | 'clerks'>('representatives');

  // ==========================================
  // REPRESENTATIVES STATE
  // ==========================================
  const [repViewMode, setRepViewMode] = useState<'cards' | 'table'>('cards');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number>(101);
  const [roleType, setRoleType] = useState<'Representative' | 'Deputy'>('Representative');
  const [phoneNumber, setPhoneNumber] = useState('0551234567');
  const [repSearch, setRepSearch] = useState('');
  const [repFilterRole, setFilterRole] = useState<'all' | 'Representative' | 'Deputy'>('all');
  const [repPage, setRepPage] = useState(1);
  const [repPageSize, setRepPageSize] = useState(9);

  // Generated credential display modal
  const [generatedCreds, setGeneratedCreds] = useState<{
    username: string;
    tempPass: string;
    className: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // ==========================================
  // ATTENDANCE CLERKS STATE
  // ==========================================
  const [clerkSearch, setClerkSearch] = useState('');
  const [clerkFilterStatus, setClerkFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [clerkPage, setClerkPage] = useState(1);
  const [clerkPageSize, setClerkPageSize] = useState(9);

  // Add Clerk Modal
  const [isAddClerkModalOpen, setIsAddClerkModalOpen] = useState(false);
  const [newClerkStudentId, setNewClerkStudentId] = useState<number | ''>('');
  const [newClerkUsername, setNewClerkUsername] = useState('');
  const [newClerkPassword, setNewClerkPassword] = useState('');
  const [newClerkAccess, setNewClerkAccess] = useState<string>('جميع الشعب');

  // Edit Clerk Modal
  const [editingClerk, setEditingClerk] = useState<AttendanceClerk | null>(null);
  const [editClerkUsername, setEditClerkUsername] = useState('');
  const [editClerkPassword, setEditClerkPassword] = useState('');
  const [editClerkIsActive, setEditClerkIsActive] = useState(true);
  const [editClerkAccess, setEditClerkAccess] = useState<string>('جميع الشعب');

  // Quick copied username tracking
  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);

  // ==========================================
  // QUERIES
  // ==========================================
  const { data: classes = [] } = useQuery({
    queryKey: ['classes', schoolCode],
    queryFn: async () => {
      if (schoolCode) return await schoolDataService.getClassesBySchool(schoolCode);
      return await schoolDataService.getClasses();
    },
  });

  // Representatives Paged Query
  const { data: repsPagedData, isLoading: isRepsLoading } = useQuery({
    queryKey: ['representatives_paged', schoolCode, repSearch, repFilterRole, repPage, repPageSize],
    queryFn: () =>
      schoolDataService.getPagedRepresentatives({
        search: repSearch.trim() || undefined,
        role: repFilterRole !== 'all' ? repFilterRole : undefined,
        schoolCode,
        pageNumber: repPage,
        pageSize: repPageSize,
      }),
  });

  const reps = repsPagedData?.items ?? [];
  const repTotalCount = repsPagedData?.totalCount ?? 0;
  const repTotalPages = repsPagedData?.totalPages ?? 1;

  // Attendance Clerks Paged Query
  const { data: clerksPagedData, isLoading: isClerksLoading } = useQuery({
    queryKey: ['attendance_clerks_paged', schoolCode, clerkSearch, clerkFilterStatus, clerkPage, clerkPageSize],
    queryFn: () =>
      schoolDataService.getAttendanceClerksPaged({
        schoolCode,
        search: clerkSearch.trim() || undefined,
        activeOnly: clerkFilterStatus === 'active' ? true : clerkFilterStatus === 'inactive' ? false : undefined,
        pageNumber: clerkPage,
        pageSize: clerkPageSize,
      }),
  });

  const clerks = clerksPagedData?.items ?? [];
  const clerkTotalCount = clerksPagedData?.totalCount ?? 0;
  const clerkTotalPages = clerksPagedData?.totalPages ?? 1;

  // Eligible school students for creating a new clerk
  const { data: schoolStudentsData } = useQuery({
    queryKey: ['school_students_for_clerk_select', schoolCode],
    queryFn: () =>
      schoolDataService.getStudentsBySchoolPaged(schoolCode, {
        pageNumber: 1,
        pageSize: 200,
      }),
    enabled: isAddClerkModalOpen,
  });

  const schoolStudents = schoolStudentsData?.items ?? [];

  // ==========================================
  // MUTATIONS (REPRESENTATIVES)
  // ==========================================
  const toggleRepStatusMutation = useMutation({
    mutationFn: async ({ repId, isActive }: { repId: number; isActive: boolean }) => {
      return await schoolDataService.toggleRepresentativeStatus(repId, isActive);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['representatives_paged'] });
      toast.show(
        variables.isActive ? 'تم تفعيل حساب العريف بنجاح' : 'تم تعطيل حساب العريف بنجاح',
        'success'
      );
    },
    onError: () => {
      toast.show('فشل تعديل حالة الحساب، يرجى المحاولة لاحقاً', 'danger');
    },
  });

  const assignRepMutation = useMutation({
    mutationFn: async () => {
      const suffix = roleType === 'Representative' ? '1' : '2';
      const username = `${selectedClassId}_${suffix}`;
      const tempPass = 'temp' + Math.floor(1000 + Math.random() * 9000);

      const created = await schoolDataService.createRepresentative({
        enrollmentId: selectedClassId * 100 + Number(suffix),
        username,
        phoneNumber,
        role: roleType,
        isActive: true,
        mustChangePassword: true,
        className: `شعبة ${selectedClassId}`,
        password: tempPass,
      });

      return { created, tempPass, username };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['representatives_paged'] });
      setIsAssignModalOpen(false);
      setGeneratedCreds({
        username: data.username,
        tempPass: data.tempPass,
        className: `شعبة ${selectedClassId}`,
      });
      toast.show('تم توليد بيانات الاعتماد بنجاح', 'success');
    },
    onError: () => {
      toast.show('فشل تعيين حساب العريف، يرجى التأكد من البيانات', 'danger');
    },
  });

  // ==========================================
  // MUTATIONS (ATTENDANCE CLERKS)
  // ==========================================
  const toggleClerkStatusMutation = useMutation({
    mutationFn: async ({ clerkId, isActive }: { clerkId: number; isActive: boolean }) => {
      return await schoolDataService.toggleClerkStatus(clerkId, isActive, schoolCode);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_clerks_paged'] });
      toast.show(
        variables.isActive ? 'تم تفعيل حساب مسجّل الحضور بنجاح' : 'تم تعطيل حساب مسجّل الحضور بنجاح',
        'success'
      );
    },
    onError: () => {
      toast.show('فشل تعديل حالة المسجّل، يرجى المحاولة لاحقاً', 'danger');
    },
  });

  const createClerkMutation = useMutation({
    mutationFn: async () => {
      if (!newClerkStudentId) throw new Error('يرجى اختيار طالب من القائمة');
      if (!newClerkUsername.trim()) throw new Error('يرجى كتابة اسم المستخدم');
      if (!newClerkPassword.trim()) throw new Error('يرجى تحديد كلمة المرور');

      return await schoolDataService.createAttendanceClerk(
        {
          studentId: Number(newClerkStudentId),
          username: newClerkUsername.trim(),
          password: newClerkPassword.trim(),
          access: newClerkAccess,
        },
        schoolCode
      );
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_clerks_paged'] });
      setIsAddClerkModalOpen(false);
      setNewClerkStudentId('');
      setNewClerkUsername('');
      setNewClerkPassword('');
      setNewClerkAccess('جميع الشعب');
      toast.show(`تم إنشاء حساب مسجّل الحضور (${created.username}) بنجاح`, 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err?.message || 'فشل إنشاء حساب المسجّل';
      toast.show(msg, 'danger');
    },
  });

  const updateClerkMutation = useMutation({
    mutationFn: async () => {
      if (!editingClerk) return;
      return await schoolDataService.updateAttendanceClerk(
        editingClerk.clerkId,
        {
          username: editClerkUsername.trim() || undefined,
          password: editClerkPassword.trim() || undefined,
          isActive: editClerkIsActive,
          access: editClerkAccess,
        },
        schoolCode
      );
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_clerks_paged'] });
      setEditingClerk(null);
      toast.show(`تم تحديث بيانات المسجّل (${updated?.username || ''}) بنجاح`, 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err?.message || 'فشل تحديث بيانات المسجّل';
      toast.show(msg, 'danger');
    },
  });

  // ==========================================
  // HELPERS
  // ==========================================
  const handleCopyUsername = (uname: string) => {
    navigator.clipboard.writeText(uname);
    setCopiedUsername(uname);
    setTimeout(() => setCopiedUsername(null), 2000);
  };

  const handleCopyGeneratedCreds = () => {
    if (!generatedCreds) return;
    const text = `بيانات الدخول لنظام مواظب:\nالشعبة: ${generatedCreds.className}\nاسم المستخدم: ${generatedCreds.username}\nكلمة المرور المؤقتة: ${generatedCreds.tempPass}\n(ملاحظة: يجب تغيير كلمة المرور عند أول تسجيل دخول)`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const openEditClerkModal = (clerk: AttendanceClerk) => {
    setEditingClerk(clerk);
    setEditClerkUsername(clerk.username);
    setEditClerkPassword('');
    setEditClerkIsActive(clerk.isActive);
    setEditClerkAccess(clerk.access || 'جميع الشعب');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE3E6] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold shadow-xs">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#17252B]">إدارة ممثلي الفصول ومسجلي الحضور</h1>
            <p className="text-xs text-[#5F6B73] mt-1">
              لوحة التحكم المركزية لتعيين عرفاء الشعب، نوابهم، ومسجلي الحضور العامين في المدرسة
            </p>
          </div>
        </div>

        {activeTab === 'representatives' ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAssignModalOpen(true)}
            className="self-start sm:self-auto font-bold shadow-xs"
          >
            تعيين / تجديد عريف صف
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddClerkModalOpen(true)}
            className="self-start sm:self-auto font-bold shadow-xs"
          >
            إضافة مسجّل حضور جديد
          </Button>
        )}
      </div>

      {/* ==========================================
          TOP NAVIGATION CARDS (CARD #1 & CARD #2)
          ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card #1: Representatives */}
        <button
          type="button"
          onClick={() => setActiveTab('representatives')}
          className={`relative p-5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 text-start ${
            activeTab === 'representatives'
              ? 'bg-[#F4F9F9] border-2 border-[#245B63] shadow-md ring-2 ring-[#245B63]/10'
              : 'bg-white border-[#DCE3E6] hover:border-[#B2CBCF] hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 w-full">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  activeTab === 'representatives'
                    ? 'bg-[#245B63] text-white shadow-xs'
                    : 'bg-[#EEF4F5] text-[#245B63]'
                }`}
              >
                <Users2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#5F6B73] uppercase tracking-wider block">
                  البطاقة الأولى (1)
                </span>
                <h3 className="text-base font-bold text-[#17252B] mt-0.5">
                  عرفاء الفصول والنواب
                </h3>
              </div>
            </div>

            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                activeTab === 'representatives'
                  ? 'bg-[#245B63] text-white border-[#245B63]'
                  : 'bg-[#EEF2F3] text-[#5F6B73] border-[#DCE3E6]'
              }`}
            >
              {repTotalCount} حساب مسجل
            </span>
          </div>

          <p className="text-xs text-[#5F6B73] leading-relaxed">
            الحسابات الرسمية بصيغة (الشعبة_1 / الشعبة_2) المخولة برصد حضور وغياب الطلاب داخل شعبتهم فقط.
          </p>

          <div className="pt-2 border-t border-[#DCE3E6]/60 flex items-center justify-between text-xs font-semibold w-full">
            <span className={activeTab === 'representatives' ? 'text-[#245B63] font-bold' : 'text-[#89949A]'}>
              {activeTab === 'representatives' ? '● القسم المعروض حالياً' : 'انقر للاستعراض والإدارة'}
            </span>
            <span className="text-[11px] text-[#5F6B73]">عريف أساسي ونائب</span>
          </div>
        </button>

        {/* Card #2: Attendance Clerks */}
        <button
          type="button"
          onClick={() => setActiveTab('clerks')}
          className={`relative p-5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 text-start ${
            activeTab === 'clerks'
              ? 'bg-[#F4F9F9] border-2 border-[#245B63] shadow-md ring-2 ring-[#245B63]/10'
              : 'bg-white border-[#DCE3E6] hover:border-[#B2CBCF] hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 w-full">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  activeTab === 'clerks'
                    ? 'bg-[#245B63] text-white shadow-xs'
                    : 'bg-[#EEF4F5] text-[#245B63]'
                }`}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#5F6B73] uppercase tracking-wider block">
                  البطاقة الثانية (2)
                </span>
                <h3 className="text-base font-bold text-[#17252B] mt-0.5">
                  مسجلو الحضور بالمدرسة
                </h3>
              </div>
            </div>

            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                activeTab === 'clerks'
                  ? 'bg-[#245B63] text-white border-[#245B63]'
                  : 'bg-[#EEF2F3] text-[#5F6B73] border-[#DCE3E6]'
              }`}
            >
              {clerkTotalCount} مسجّل حضور
            </span>
          </div>

          <p className="text-xs text-[#5F6B73] leading-relaxed">
            الكوادر المخولة برصد الحضور لكافة فصول المدرسة وإدارة بيانات الطلاب وتسجيلهم دون قيود الشعبة.
          </p>

          <div className="pt-2 border-t border-[#DCE3E6]/60 flex items-center justify-between text-xs font-semibold w-full">
            <span className={activeTab === 'clerks' ? 'text-[#245B63] font-bold' : 'text-[#89949A]'}>
              {activeTab === 'clerks' ? '● القسم المعروض حالياً' : 'انقر للاستعراض والإدارة'}
            </span>
            <span className="text-[11px] text-[#5F6B73]">صلاحيات رصد مدرسية شاملة</span>
          </div>
        </button>
      </div>

      {/* ==============================================================
          SECTION CONTENT: ATTENDANCE CLERKS (DISPLAYED IN CARDS)
          ============================================================== */}
      {activeTab === 'clerks' && (
        <div className="space-y-4">
          {/* Clerk Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-[#5F6B73] shrink-0">حالة الحساب:</label>
              <select
                value={clerkFilterStatus}
                onChange={(e) => {
                  setClerkFilterStatus(e.target.value as any);
                  setClerkPage(1);
                }}
                className="h-9.5 px-3 bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg text-xs font-medium text-[#17252B] outline-none cursor-pointer hover:border-[#245B63] transition-colors"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">الحسابات النشطة فقط</option>
                <option value="inactive">الحسابات المعطلة فقط</option>
              </select>
            </div>

            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={clerkSearch}
                onChange={(e) => {
                  setClerkSearch(e.target.value);
                  setClerkPage(1);
                }}
                placeholder="بحث باسم المسجّل، الطالب، أو اسم المستخدم..."
                className="w-full h-9.5 pr-9 pl-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg focus:bg-white focus:border-[#245B63] focus:ring-2 focus:ring-[#245B63]/15 outline-none transition-all placeholder:text-[#89949A]"
              />
              <Search className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Clerks Information Rendered as Modern Cards */}
          {isClerksLoading ? (
            <div className="bg-white p-12 rounded-xl border border-[#DCE3E6] text-center">
              <MuwathibTableLoading message="جاري استرجاع سجل مسجلي الحضور..." />
            </div>
          ) : clerks.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-[#DCE3E6] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F5F7F8] text-[#89949A] flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#17252B]">لا يوجد مسجلو حضور مسجلين حالياً</p>
              <p className="text-xs text-[#5F6B73]">
                يمكنك إضافة مسجّل حضور جديد واختيار الطالب وكلمة المرور من خلال الزر أعلاه
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddClerkModalOpen(true)}
              >
                إضافة أول مسجّل حضور
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {clerks.map((clerk: AttendanceClerk) => (
                <div
                  key={clerk.clerkId}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md ${
                    clerk.isActive
                      ? 'border-[#DCE3E6] hover:border-[#245B63]/50'
                      : 'border-[#F1C3C3] bg-[#FCF8F8]/40'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`relative w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                            clerk.isActive
                              ? 'bg-[#E8F1F1] text-[#245B63]'
                              : 'bg-[#EEF2F3] text-[#89949A]'
                          }`}
                        >
                          <UserCheck className="w-5 h-5" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                              clerk.isActive ? 'bg-[#176B3A]' : 'bg-[#A61B1B]'
                            }`}
                          />
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-[#17252B] line-clamp-1">
                            {clerk.studentName || 'مسجّل معتمد'}
                          </h4>
                          <span className="text-[11px] font-semibold text-[#5F6B73] block mt-0.5">
                            {clerk.className || (clerk.classNumber ? `شعبة ${clerk.classNumber}` : 'طالب بالمدرسة')}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          clerk.isActive
                            ? 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5]'
                            : 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]'
                        }`}
                      >
                        {clerk.isActive ? 'مفعّل' : 'معطّل'}
                      </span>
                    </div>

                    {/* Card Body Details */}
                    <div className="mt-4 pt-3.5 border-t border-[#EEF2F3] space-y-2 text-xs">
                      {/* Username with Copy */}
                      <div className="flex items-center justify-between bg-[#F8FAFA] px-3 py-1.5 rounded-lg border border-[#E4EBEC]">
                        <span className="text-[#5F6B73] font-medium text-[11px]">اسم الدخول:</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-[#245B63] text-xs">
                            {clerk.username}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyUsername(clerk.username)}
                            className="p-1 hover:bg-white rounded transition-colors text-[#5F6B73] hover:text-[#245B63]"
                            title="نسخ اسم المستخدم"
                          >
                            {copiedUsername === clerk.username ? (
                              <Check className="w-3.5 h-3.5 text-[#176B3A]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* National ID */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[#5F6B73] text-[11px]">رقم الهوية:</span>
                        <span className="font-mono font-semibold text-[#17252B]">
                          {clerk.nationalId || '—'}
                        </span>
                      </div>

                      {/* School Name */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[#5F6B73] text-[11px]">المدرسة:</span>
                        <span className="font-semibold text-[#17252B] text-[11px] truncate max-w-[170px]">
                          {clerk.schoolName || 'مدرسة مواظب'}
                        </span>
                      </div>

                      {/* Access Scope */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[#5F6B73] text-[11px]">نطاق الصلاحية:</span>
                        <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-[#E8F1F1] text-[#245B63] border border-[#CDE0E2]">
                          {clerk.access || 'جميع الشعب'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-[#EEF2F3] flex items-center gap-2">
                    {/* Edit Button */}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={() => openEditClerkModal(clerk)}
                      className="flex-1 font-bold text-xs"
                    >
                      تعديل
                    </Button>

                    {/* Instant Status Toggle Button */}
                    <button
                      type="button"
                      disabled={toggleClerkStatusMutation.isPending}
                      onClick={() =>
                        toggleClerkStatusMutation.mutate({
                          clerkId: clerk.clerkId,
                          isActive: !clerk.isActive,
                        })
                      }
                      className={`flex-1 flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        clerk.isActive
                          ? 'bg-[#FDECEC] text-[#A61B1B] hover:bg-[#FADADA] border-[#F1C3C3]'
                          : 'bg-[#E8F5EC] text-[#176B3A] hover:bg-[#D5EEDB] border-[#B7DEC5]'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{clerk.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clerks Pagination */}
          <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs">
            <PaginationControls
              pageNumber={clerkPage}
              totalPages={clerkTotalPages}
              totalCount={clerkTotalCount}
              pageSize={clerkPageSize}
              onPageChange={(page) => setClerkPage(page)}
              onPageSizeChange={(newSize) => {
                setClerkPageSize(newSize);
                setClerkPage(1);
              }}
              isLoading={isClerksLoading}
              itemLabel="مسجّل حضور"
            />
          </div>
        </div>
      )}

      {/* ==============================================================
          SECTION CONTENT: REPRESENTATIVES & DEPUTIES
          ============================================================== */}
      {activeTab === 'representatives' && (
        <div className="space-y-4">
          {/* Info Notice */}
          <div className="p-4 bg-[#EAF2FF] border border-[#C3D9FF] rounded-xl text-xs text-[#28559A] leading-relaxed flex items-start gap-2.5 shadow-2xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#28559A]" />
            <div>
              <strong className="block mb-0.5">قاعدة تسمية الحسابات الرسمية:</strong>
              <span>
                العريف الأساسي للشعبة 101 يحمل اسم المستخدم <span className="font-mono font-bold">101_1</span>، بينما نائب العريف يحمل اسم{' '}
                <span className="font-mono font-bold">101_2</span>. يُلزم العريف بتغيير كلمة المرور المؤقتة فور أول دخول.
              </span>
            </div>
          </div>

          {/* Filter, Search, and View Mode Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-[#5F6B73] shrink-0">الصفة:</label>
              <select
                value={repFilterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value as any);
                  setRepPage(1);
                }}
                className="h-9.5 px-3 bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg text-xs font-medium text-[#17252B] outline-none cursor-pointer hover:border-[#245B63] transition-colors"
              >
                <option value="all">جميع الصفات</option>
                <option value="Representative">عريف الصف الأساسي</option>
                <option value="Deputy">نائب العريف</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={repSearch}
                  onChange={(e) => {
                    setRepSearch(e.target.value);
                    setRepPage(1);
                  }}
                  placeholder="بحث باسم المستخدم أو الطالب أو الجوال..."
                  className="w-full h-9.5 pr-9 pl-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg focus:bg-white focus:border-[#245B63] focus:ring-2 focus:ring-[#245B63]/15 outline-none transition-all placeholder:text-[#89949A]"
                />
                <Search className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Mode Toggle (Cards vs Table) */}
              <div className="flex items-center bg-[#F5F7F8] p-0.5 rounded-lg border border-[#DCE3E6]">
                <button
                  type="button"
                  onClick={() => setRepViewMode('cards')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    repViewMode === 'cards'
                      ? 'bg-white text-[#245B63] shadow-xs font-bold'
                      : 'text-[#89949A] hover:text-[#17252B]'
                  }`}
                  title="عرض بطاقات"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRepViewMode('table')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    repViewMode === 'table'
                      ? 'bg-white text-[#245B63] shadow-xs font-bold'
                      : 'text-[#89949A] hover:text-[#17252B]'
                  }`}
                  title="عرض جدول"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Representatives Display */}
          {isRepsLoading ? (
            <div className="bg-white p-12 rounded-xl border border-[#DCE3E6] text-center">
              <MuwathibTableLoading message="جاري استرجاع سجل حسابات العرفاء والنواب..." />
            </div>
          ) : reps.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-[#DCE3E6] text-center space-y-3">
              <p className="text-sm font-bold text-[#17252B]">لا توجد حسابات مسجلة حتى الآن</p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAssignModalOpen(true)}
              >
                تعيين أول عريف
              </Button>
            </div>
          ) : repViewMode === 'cards' ? (
            /* Cards View for Representatives */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {reps.map((r: Representative) => (
                <div
                  key={r.representativeId}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md ${
                    r.isActive
                      ? 'border-[#DCE3E6] hover:border-[#245B63]/50'
                      : 'border-[#F1C3C3] bg-[#FCF8F8]/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#245B63] text-sm bg-[#E8F1F1] px-2 py-0.5 rounded">
                            {r.username}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              r.role === 'Deputy'
                                ? 'bg-[#EEF2F3] text-[#5F6B73] border-[#DCE3E6]'
                                : 'bg-[#E8F1F1] text-[#245B63] border-[#CDE0E2]'
                            }`}
                          >
                            {r.role === 'Deputy' ? 'نائب العريف' : 'عريف الصف الأساسي'}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-[#17252B] mt-2 line-clamp-1">
                          {r.studentName || 'طالب معين'}
                        </h4>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          r.isActive
                            ? 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5]'
                            : 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]'
                        }`}
                      >
                        {r.isActive ? 'مفعّل' : 'معطّل'}
                      </span>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-[#EEF2F3] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#5F6B73] text-[11px]">الشعبة:</span>
                        <span className="font-bold text-[#17252B]">
                          {r.className || (r.classNumber ? `شعبة ${r.classNumber}` : `شعبة ${r.classId}`)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#5F6B73] text-[11px]">رقم الجوال:</span>
                        <span className="font-mono text-[#5F6B73]">{r.phoneNumber}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#5F6B73] text-[11px]">حالة كلمة المرور:</span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                            r.mustChangePassword
                              ? 'bg-[#FFF4DA] text-[#855500] border border-[#EDD38C]'
                              : 'bg-[#F5F7F8] text-[#5F6B73]'
                          }`}
                        >
                          {r.mustChangePassword ? 'مطلوب إلزامي' : 'تم التعيين'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Instant Toggle Button */}
                  <div className="pt-3 border-t border-[#EEF2F3]">
                    <button
                      type="button"
                      disabled={toggleRepStatusMutation.isPending}
                      onClick={() =>
                        toggleRepStatusMutation.mutate({
                          repId: r.representativeId,
                          isActive: !r.isActive,
                        })
                      }
                      className={`w-full flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        r.isActive
                          ? 'bg-[#FDECEC] text-[#A61B1B] hover:bg-[#FADADA] border-[#F1C3C3]'
                          : 'bg-[#E8F5EC] text-[#176B3A] hover:bg-[#D5EEDB] border-[#B7DEC5]'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{r.isActive ? 'تعطيل الحساب فوراً' : 'تفعيل الحساب فوراً'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View for Representatives */
            <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F7F8] text-[#17252B] border-b border-[#DCE3E6]">
                      <th className="px-4 py-3.5 font-bold w-32">اسم المستخدم</th>
                      <th className="px-4 py-3.5 font-bold">اسم الطالب المسؤول</th>
                      <th className="px-4 py-3.5 font-bold w-32">الشعبة</th>
                      <th className="px-4 py-3.5 font-bold w-36">الصفة والمسؤولية</th>
                      <th className="px-4 py-3.5 font-bold w-36">رقم الجوال</th>
                      <th className="px-4 py-3.5 font-bold text-center w-24">حالة الحساب</th>
                      <th className="px-4 py-3.5 font-bold text-center w-36">حالة كلمة المرور</th>
                      <th className="px-4 py-3.5 font-bold text-center w-28">التحكم بالحساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F3]">
                    {reps.map((r: Representative) => (
                      <tr key={r.representativeId} className="hover:bg-[#F5F9F9] transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#245B63]">{r.username}</td>
                        <td className="px-4 py-3 font-bold text-[#17252B]">
                          {r.studentName || 'طالب معين'}
                        </td>
                        <td className="px-4 py-3 text-[#5F6B73] font-bold">
                          {r.className || (r.classNumber ? `شعبة ${r.classNumber}` : (r.classId ? `شعبة ${r.classId}` : '—'))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              r.role === 'Deputy'
                                ? 'bg-[#EEF2F3] text-[#5F6B73] border-[#DCE3E6]'
                                : 'bg-[#E8F1F1] text-[#245B63] border-[#CDE0E2]'
                            }`}
                          >
                            {r.role === 'Deputy' ? 'نائب العريف' : 'عريف الصف الأساسي'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#5F6B73]">{r.phoneNumber}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              r.isActive
                                ? 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5]'
                                : 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]'
                            }`}
                          >
                            {r.isActive ? 'مفعل' : 'معطل'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                              r.mustChangePassword
                                ? 'bg-[#FFF4DA] text-[#855500] border border-[#EDD38C]'
                                : 'bg-[#F5F7F8] text-[#5F6B73]'
                            }`}
                          >
                            {r.mustChangePassword ? 'مطلوب إلزامي' : 'تم التعيين'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={toggleRepStatusMutation.isPending}
                            onClick={() =>
                              toggleRepStatusMutation.mutate({
                                repId: r.representativeId,
                                isActive: !r.isActive,
                              })
                            }
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              r.isActive
                                ? 'bg-[#FDECEC] text-[#A61B1B] hover:bg-[#FADADA] border border-[#F1C3C3]'
                                : 'bg-[#E8F5EC] text-[#176B3A] hover:bg-[#D5EEDB] border border-[#B7DEC5]'
                            }`}
                            title={r.isActive ? 'تعطيل الحساب فوراً' : 'تفعيل الحساب فوراً'}
                          >
                            {r.isActive ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Representatives Pagination */}
          <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs">
            <PaginationControls
              pageNumber={repPage}
              totalPages={repTotalPages}
              totalCount={repTotalCount}
              pageSize={repPageSize}
              onPageChange={(page) => setRepPage(page)}
              onPageSizeChange={(newSize) => {
                setRepPageSize(newSize);
                setRepPage(1);
              }}
              isLoading={isRepsLoading}
              itemLabel="عريف / نائب"
            />
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS
          ========================================== */}

      {/* 1. Add Clerk Modal */}
      <Dialog
        isOpen={isAddClerkModalOpen}
        onClose={() => setIsAddClerkModalOpen(false)}
        title="إضافة مسجّل حضور جديد"
        description="اختر طالباً من طلاب المدرسة لتسجيله كمسجّل حضور وتعيين بيانات الدخول الخاصة به."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              اختيار الطالب المسؤول:
            </label>
            <select
              value={newClerkStudentId}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : '';
                setNewClerkStudentId(val);
                if (val && !newClerkUsername) {
                  const student = schoolStudents.find((s: any) => s.studentId === val);
                  if (student) {
                    const cleanName = student.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    setNewClerkUsername(`clerk_${cleanName || student.studentId}`);
                  }
                }
              }}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              <option value="">-- اختر طالباً من قائمة طلاب المدرسة --</option>
              {schoolStudents.map((st: any) => (
                <option key={st.studentId} value={st.studentId}>
                  {st.fullName} (هوية: {st.nationalId}) — {st.className || 'شعبة ' + st.classNumber}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="اسم المستخدم (للدخول للمنظومة)"
            placeholder="مثال: clerk_ahmed"
            value={newClerkUsername}
            onChange={(e) => setNewClerkUsername(e.target.value)}
          />

          <Input
            label="كلمة المرور"
            type="password"
            placeholder="أدخل كلمة مرور قوية"
            value={newClerkPassword}
            onChange={(e) => setNewClerkPassword(e.target.value)}
          />

          {/* Access Scope Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              نطاق صلاحية رصد الحضور (الشعب المسموحة):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CLERK_ACCESS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNewClerkAccess(opt)}
                  className={`p-2.5 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                    newClerkAccess === opt
                      ? 'border-[#245B63] bg-[#E8F1F1] text-[#245B63]'
                      : 'border-[#DCE3E6] bg-white text-[#5F6B73] hover:bg-[#F5F7F8]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#F4F9F9] border border-[#CDE0E2] rounded-xl text-xs text-[#245B63] space-y-1">
            <span className="font-bold block">ملاحظة تنظيمية:</span>
            <span>
              يحدد نطاق الصلاحية الفصول والشعب التي يتاح للمسجّل رصد حضورها والوصول لبيانات طلابها في المدرسة.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsAddClerkModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => createClerkMutation.mutate()}
            isLoading={createClerkMutation.isPending}
          >
            إنشاء حساب المسجّل
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 2. Edit Clerk Modal */}
      {editingClerk && (
        <Dialog
          isOpen={true}
          onClose={() => setEditingClerk(null)}
          title="تعديل بيانات مسجّل الحضور"
          description={`تعديل بيانات الحساب للمسجّل: ${editingClerk.studentName}`}
        >
          <div className="space-y-4">
            {/* Student info read-only display */}
            <div className="bg-[#F8FAFA] p-3 rounded-xl border border-[#DCE3E6] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5F6B73]">الطالب المسؤول:</span>
                <span className="font-bold text-[#17252B]">{editingClerk.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B73]">الشعبة:</span>
                <span className="font-semibold text-[#17252B]">{editingClerk.className || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B73]">رقم الهوية:</span>
                <span className="font-mono text-[#17252B]">{editingClerk.nationalId}</span>
              </div>
            </div>

            <Input
              label="اسم المستخدم"
              value={editClerkUsername}
              onChange={(e) => setEditClerkUsername(e.target.value)}
            />

            <Input
              label="كلمة المرور الجديدة (اختياري)"
              type="password"
              placeholder="اتركه فارغاً إذا كنت لا ترغب بتغيير كلمة المرور"
              value={editClerkPassword}
              onChange={(e) => setEditClerkPassword(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
                حالة الحساب:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditClerkIsActive(true)}
                  className={`p-2.5 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                    editClerkIsActive
                      ? 'border-[#176B3A] bg-[#E8F5EC] text-[#176B3A]'
                      : 'border-[#DCE3E6] bg-white text-[#5F6B73]'
                  }`}
                >
                  حساب مفعّل
                </button>
                <button
                  type="button"
                  onClick={() => setEditClerkIsActive(false)}
                  className={`p-2.5 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                    !editClerkIsActive
                      ? 'border-[#A61B1B] bg-[#FDECEC] text-[#A61B1B]'
                      : 'border-[#DCE3E6] bg-white text-[#5F6B73]'
                  }`}
                >
                  حساب معطّل
                </button>
              </div>
            </div>

            {/* Edit Access Scope */}
            <div>
              <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
                نطاق صلاحية رصد الحضور:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CLERK_ACCESS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEditClerkAccess(opt)}
                    className={`p-2.5 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                      editClerkAccess === opt
                        ? 'border-[#245B63] bg-[#E8F1F1] text-[#245B63]'
                        : 'border-[#DCE3E6] bg-white text-[#5F6B73] hover:bg-[#F5F7F8]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingClerk(null)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => updateClerkMutation.mutate()}
              isLoading={updateClerkMutation.isPending}
            >
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 3. Assign Representative Modal */}
      <Dialog
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="تعيين وتوليد حساب عريف أو نائب"
        description="اختر الشعبة والصفة لتوليد اسم المستخدم النظامي وكلمة المرور المؤقتة."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              الشعبة المستهدفة:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">الصفة والمسؤولية:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRoleType('Representative')}
                className={`p-3 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                  roleType === 'Representative'
                    ? 'border-[#245B63] bg-[#E8F1F1] text-[#245B63]'
                    : 'border-[#DCE3E6] bg-white text-[#5F6B73] hover:bg-[#F5F7F8]'
                }`}
              >
                عريف صف أساسي ({selectedClassId}_1)
              </button>
              <button
                type="button"
                onClick={() => setRoleType('Deputy')}
                className={`p-3 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                  roleType === 'Deputy'
                    ? 'border-[#245B63] bg-[#E8F1F1] text-[#245B63]'
                    : 'border-[#DCE3E6] bg-white text-[#5F6B73] hover:bg-[#F5F7F8]'
                }`}
              >
                نائب العريف ({selectedClassId}_2)
              </button>
            </div>
          </div>

          <Input
            label="رقم جوال العريف (للتواصل الإداري)"
            placeholder="05XXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => assignRepMutation.mutate()}
            isLoading={assignRepMutation.isPending}
          >
            توليد وتعيين الحساب
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 4. Generated Credentials Success Modal */}
      {generatedCreds && (
        <Dialog
          isOpen={true}
          onClose={() => setGeneratedCreds(null)}
          title="تم توليد حساب العريف بنجاح"
          description="يرجى نسخ هذه البيانات وتسليمها للعريف رسمياً. سيلزم بتغيير كلمة المرور فور دخوله."
        >
          <div className="space-y-4">
            <div className="bg-[#F5F7F8] p-4 rounded-xl border border-[#DCE3E6] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F3]">
                <span className="text-[#5F6B73]">الشعبة:</span>
                <span className="font-bold text-[#17252B] font-sans">{generatedCreds.className}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F3]">
                <span className="text-[#5F6B73]">اسم المستخدم:</span>
                <span className="font-bold text-[#245B63] text-sm">{generatedCreds.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73]">كلمة المرور المؤقتة:</span>
                <span className="font-bold text-[#A61B1B] text-sm bg-white px-2 py-0.5 rounded border border-[#DCE3E6]">
                  {generatedCreds.tempPass}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#5F6B73]">
              <KeyRound className="w-4 h-4 text-[#245B63] shrink-0" />
              <span>يحق للعريف الدخول عبر بوابة العرفاء مباشرة باستخدام هذه البيانات.</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="primary"
              onClick={handleCopyGeneratedCreds}
              icon={copiedCreds ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copiedCreds ? 'تم النسخ للحافظة' : 'نسخ بيانات الدخول'}
            </Button>
            <Button variant="secondary" onClick={() => setGeneratedCreds(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

export default AdminRepresentativesPage;
