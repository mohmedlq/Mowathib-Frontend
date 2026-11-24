import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
  UserRound,
  Phone,
  Building2,
  LockKeyhole,
  SlidersHorizontal,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';
import { useNotifications } from '../../../notifications';
import type { Representative, AttendanceClerk } from '../../../../shared/types';
import { CLERK_ACCESS_OPTIONS } from '../../../../shared/utils/clerkAccess';

const SURFACE = 'rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/70 dark:bg-slate-900';
const FIELD = 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-950 dark:focus:ring-emerald-500/10';
const LABEL = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300';
const MUTED = 'text-slate-500 dark:text-slate-400';
const DIVIDER = 'border-slate-100 dark:border-slate-800';

function getClassNum(cls?: { classNumber?: number | string; className?: string | number; classId: number } | null): string {
  if (!cls) return '101';
  if (cls.classNumber && !isNaN(Number(cls.classNumber))) {
    return String(cls.classNumber);
  }
  const match = String(cls.className || '').match(/\d+/);
  if (match) {
    return match[0];
  }
  return String(cls.classId || '101');
}

function generateRandomPassword(length = 8): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const specials = '@#!$%';
  const all = uppers + lowers + digits + specials;

  const res = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    digits[Math.floor(Math.random() * digits.length)],
    specials[Math.floor(Math.random() * specials.length)],
  ];
  for (let i = res.length; i < length; i++) {
    res.push(all[Math.floor(Math.random() * all.length)]);
  }
  return res.sort(() => Math.random() - 0.5).join('');
}

function generateRepresentativeUsername(
  classNum: string,
  role: 'Representative' | 'Deputy',
  existingReps: Representative[]
): string {
  const base = role === 'Representative' ? `rep_${classNum}` : `rep_${classNum}_2`;
  if (!existingReps.some((r) => r.username?.toLowerCase() === base.toLowerCase())) {
    return base;
  }
  let counter = 2;
  while (existingReps.some((r) => r.username?.toLowerCase() === `rep_${classNum}_${counter}`.toLowerCase())) {
    counter++;
  }
  return `rep_${classNum}_${counter}`;
}

function generateClerkUsername(
  classNum: string,
  existingClerks: AttendanceClerk[]
): string {
  const base = `clerk_${classNum}`;
  if (!existingClerks.some((c) => c.username?.toLowerCase() === base.toLowerCase())) {
    return base;
  }
  let counter = 2;
  while (existingClerks.some((c) => c.username?.toLowerCase() === `clerk_${classNum}_${counter}`.toLowerCase())) {
    counter++;
  }
  return `clerk_${classNum}_${counter}`;
}

type GeneratedCredentials = {
  type: 'representative' | 'clerk';
  title: string;
  studentName: string;
  className: string;
  roleOrAccess: string;
  username: string;
  password: string;
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {active ? 'نشط' : 'معطّل'}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const deputy = role === 'Deputy';
  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-1 text-[11px] font-semibold ${
        deputy
          ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300'
          : 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900/70 dark:bg-teal-950/40 dark:text-teal-300'
      }`}
    >
      {deputy ? 'نائب العريف' : 'عريف الصف'}
    </span>
  );
}

function PasswordBadge({ required }: { required: boolean }) {
  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-1 text-[11px] font-semibold ${
        required
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300'
          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {required ? 'يلزم تغييرها' : 'تم تغييرها'}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${SURFACE} px-5 py-14 text-center`}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function AdminRepresentativesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();
  const schoolCode = user?.schoolCode;

  const [activeTab, setActiveTab] = useState<'representatives' | 'clerks'>('representatives');

  // Representatives
  const [repViewMode, setRepViewMode] = useState<'cards' | 'table'>('cards');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number>(101);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | ''>('');
  const [roleType, setRoleType] = useState<'Representative' | 'Deputy'>('Representative');
  const [repUsername, setRepUsername] = useState('');
  const [repPassword, setRepPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [repSearch, setRepSearch] = useState('');
  const [debouncedRepSearch, setDebouncedRepSearch] = useState('');
  const [repFilterRole, setFilterRole] = useState<'all' | 'Representative' | 'Deputy'>('all');
  const [repPage, setRepPage] = useState(1);
  const [repPageSize, setRepPageSize] = useState(9);

  // Attendance clerks
  const [clerkSearch, setClerkSearch] = useState('');
  const [debouncedClerkSearch, setDebouncedClerkSearch] = useState('');
  const [clerkFilterStatus, setClerkFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [clerkPage, setClerkPage] = useState(1);
  const [clerkPageSize, setClerkPageSize] = useState(9);
  const [isAddClerkModalOpen, setIsAddClerkModalOpen] = useState(false);
  const [clerkClassId, setClerkClassId] = useState<number>(101);
  const [newClerkStudentId, setNewClerkStudentId] = useState<number | ''>('');
  const [newClerkUsername, setNewClerkUsername] = useState('');
  const [newClerkPassword, setNewClerkPassword] = useState('');
  const [newClerkAccess, setNewClerkAccess] = useState<string>('جميع الشعب');
  const [editingClerk, setEditingClerk] = useState<AttendanceClerk | null>(null);
  const [editClerkUsername, setEditClerkUsername] = useState('');
  const [editClerkPassword, setEditClerkPassword] = useState('');
  const [editClerkConfirmPassword, setEditClerkConfirmPassword] = useState('');
  const [editClerkIsActive, setEditClerkIsActive] = useState(true);
  const [editClerkAccess, setEditClerkAccess] = useState<string>('جميع الشعب');

  // Generated credentials popup for both representative and clerk
  const [generatedCreds, setGeneratedCreds] = useState<GeneratedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | 'all' | null>(null);
  const [copiedCardUsername, setCopiedCardUsername] = useState<string | null>(null);

  // Debounce search inputs so a request is not sent for every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedRepSearch(repSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [repSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedClerkSearch(clerkSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [clerkSearch]);

  // Queries
  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => schoolDataService.getActiveAcademicYear(),
    staleTime: 1000 * 60 * 30,
  });
  const activeYearId = activeYear?.academicYearId || 1;

  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes', schoolCode],
    queryFn: async () => {
      if (schoolCode) return await schoolDataService.getClassesBySchool(schoolCode);
      return await schoolDataService.getClasses();
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.classId === selectedClassId)) {
      setSelectedClassId(classes[0].classId);
    }
    if (classes.length > 0 && !classes.some((c) => c.classId === clerkClassId)) {
      setClerkClassId(classes[0].classId);
    }
  }, [classes, selectedClassId, clerkClassId]);

  const assignmentClassId = classes.some((c) => c.classId === selectedClassId)
    ? selectedClassId
    : classes[0]?.classId ?? 0;
  const selectedAssignmentClass = classes.find((c) => c.classId === assignmentClassId);

  const effectiveClerkClassId = classes.some((c) => c.classId === clerkClassId)
    ? clerkClassId
    : classes[0]?.classId ?? 0;
  const selectedClerkClass = classes.find((c) => c.classId === effectiveClerkClassId);

  const {
    data: repsPagedData,
    isLoading: isRepsLoading,
    isFetching: isRepsFetching,
  } = useQuery({
    queryKey: ['representatives_paged', schoolCode, debouncedRepSearch, repFilterRole, repPage, repPageSize],
    queryFn: () =>
      schoolDataService.getPagedRepresentatives({
        search: debouncedRepSearch || undefined,
        role: repFilterRole !== 'all' ? repFilterRole : undefined,
        schoolCode,
        pageNumber: repPage,
        pageSize: repPageSize,
      }),
    staleTime: 1000 * 20,
    gcTime: 1000 * 60 * 10,
  });

  const reps = repsPagedData?.items ?? [];
  const repTotalCount = repsPagedData?.totalCount ?? 0;
  const repTotalPages = repsPagedData?.totalPages ?? 1;

  const {
    data: clerksPagedData,
    isLoading: isClerksLoading,
    isFetching: isClerksFetching,
  } = useQuery({
    queryKey: ['attendance_clerks_paged', schoolCode, debouncedClerkSearch, clerkFilterStatus, clerkPage, clerkPageSize],
    queryFn: () =>
      schoolDataService.getAttendanceClerksPaged({
        schoolCode,
        search: debouncedClerkSearch || undefined,
        activeOnly: clerkFilterStatus === 'active' ? true : clerkFilterStatus === 'inactive' ? false : undefined,
        pageNumber: clerkPage,
        pageSize: clerkPageSize,
      }),
    staleTime: 1000 * 20,
    gcTime: 1000 * 60 * 10,
  });

  const clerks = clerksPagedData?.items ?? [];
  const clerkTotalCount = clerksPagedData?.totalCount ?? 0;
  const clerkTotalPages = clerksPagedData?.totalPages ?? 1;

  // Enrolled students in the selected class for Representative
  const {
    data: repClassEnrollments = [],
    isLoading: isRepClassEnrollmentsLoading,
  } = useQuery({
    queryKey: ['class_enrollments_for_rep', assignmentClassId, activeYearId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(assignmentClassId, activeYearId),
    enabled: isAssignModalOpen && Boolean(assignmentClassId),
    staleTime: 1000 * 60 * 5,
  });

  // Enrolled students in the selected class for Clerk
  const {
    data: clerkClassEnrollments = [],
    isLoading: isClerkClassEnrollmentsLoading,
  } = useQuery({
    queryKey: ['class_enrollments_for_clerk', effectiveClerkClassId, activeYearId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(effectiveClerkClassId, activeYearId),
    enabled: isAddClerkModalOpen && Boolean(effectiveClerkClassId),
    staleTime: 1000 * 60 * 5,
  });

  const selectedRepEnrollment = useMemo(
    () => repClassEnrollments.find((e: any) => e.enrollmentId === Number(selectedEnrollmentId)),
    [repClassEnrollments, selectedEnrollmentId]
  );

  const selectedClerkEnrollment = useMemo(
    () => clerkClassEnrollments.find((e: any) => e.studentId === Number(newClerkStudentId)),
    [clerkClassEnrollments, newClerkStudentId]
  );

  // Representative opening and selection helpers
  const openAssignRepModal = () => {
    const initialClassId = classes[0]?.classId || 101;
    setSelectedClassId(initialClassId);
    setSelectedEnrollmentId('');
    setRoleType('Representative');
    setPhoneNumber('');
    const cls = classes.find((c) => c.classId === initialClassId) || classes[0];
    const classNum = getClassNum(cls);
    setRepUsername(generateRepresentativeUsername(classNum, 'Representative', reps));
    setRepPassword(generateRandomPassword());
    setIsAssignModalOpen(true);
  };

  const handleRepClassChange = (newClassId: number) => {
    setSelectedClassId(newClassId);
    setSelectedEnrollmentId('');
    const cls = classes.find((c) => c.classId === newClassId);
    const classNum = getClassNum(cls);
    setRepUsername(generateRepresentativeUsername(classNum, roleType, reps));
  };

  const handleRoleTypeChange = (newRole: 'Representative' | 'Deputy') => {
    setRoleType(newRole);
    const cls = classes.find((c) => c.classId === selectedClassId);
    const classNum = getClassNum(cls);
    setRepUsername(generateRepresentativeUsername(classNum, newRole, reps));
  };

  // Clerk opening and selection helpers
  const openAddClerkModal = () => {
    const initialClassId = classes[0]?.classId || 101;
    setClerkClassId(initialClassId);
    setNewClerkStudentId('');
    setNewClerkAccess('جميع الشعب');
    const cls = classes.find((c) => c.classId === initialClassId) || classes[0];
    const classNum = getClassNum(cls);
    setNewClerkUsername(generateClerkUsername(classNum, clerks));
    setNewClerkPassword(generateRandomPassword());
    setIsAddClerkModalOpen(true);
  };

  const handleClerkClassChange = (newClassId: number) => {
    setClerkClassId(newClassId);
    setNewClerkStudentId('');
    const cls = classes.find((c) => c.classId === newClassId);
    const classNum = getClassNum(cls);
    setNewClerkUsername(generateClerkUsername(classNum, clerks));
  };

  // Representative mutations
  const toggleRepStatusMutation = useMutation({
    mutationFn: async ({ repId, isActive }: { repId: number; isActive: boolean }) =>
      schoolDataService.toggleRepresentativeStatus(repId, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['representatives_paged', schoolCode] });
      toast.show(
        variables.isActive ? 'تم تفعيل حساب العريف بنجاح' : 'تم تعطيل حساب العريف بنجاح',
        'success'
      );
    },
    onError: () => toast.show('فشل تعديل حالة الحساب، يرجى المحاولة لاحقاً', 'danger'),
  });

  const assignRepMutation = useMutation({
    mutationFn: async () => {
      if (!assignmentClassId) throw new Error('يرجى اختيار شعبة صالحة');
      if (!selectedEnrollmentId) throw new Error('يرجى اختيار طالب من الشعبة لتعيينه');
      if (!repUsername.trim()) throw new Error('يرجى تحديد اسم المستخدم');
      if (!repPassword.trim()) throw new Error('يرجى تحديد كلمة المرور');
      if (!phoneNumber.trim()) throw new Error('يرجى إدخال رقم جوال العريف');

      const enrolled = repClassEnrollments.find((e: any) => e.enrollmentId === Number(selectedEnrollmentId));
      const studentName = enrolled?.studentName || enrolled?.student?.fullName || 'الطالب المختار';
      const className = selectedAssignmentClass?.className
        ? String(selectedAssignmentClass.className)
        : `شعبة ${assignmentClassId}`;

      const created = await schoolDataService.createRepresentative({
        enrollmentId: Number(selectedEnrollmentId),
        username: repUsername.trim(),
        phoneNumber: phoneNumber.trim(),
        role: roleType,
        isActive: true,
        mustChangePassword: true,
        className,
        password: repPassword.trim(),
      });

      return {
        created,
        username: repUsername.trim(),
        password: repPassword.trim(),
        studentName,
        className,
        role: roleType === 'Deputy' ? 'نائب العريف' : 'عريف الصف الأساسي',
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['representatives_paged', schoolCode] });
      setIsAssignModalOpen(false);
      setGeneratedCreds({
        type: 'representative',
        title: 'بيانات حساب العريف',
        studentName: data.studentName,
        className: data.className,
        roleOrAccess: data.role,
        username: data.username,
        password: data.password,
      });
      setPhoneNumber('');
      setSelectedEnrollmentId('');
      toast.show('تم إنشاء حساب العريف وتوليد بيانات الاعتماد بنجاح', 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data || err?.message || 'فشل تعيين حساب العريف، يرجى التأكد من البيانات';
      toast.show(message, 'danger');
    },
  });

  // Attendance clerk mutations
  const toggleClerkStatusMutation = useMutation({
    mutationFn: async ({ clerkId, isActive }: { clerkId: number; isActive: boolean }) =>
      schoolDataService.toggleClerkStatus(clerkId, isActive, schoolCode),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_clerks_paged', schoolCode] });
      toast.show(
        variables.isActive ? 'تم تفعيل حساب مسجّل الحضور بنجاح' : 'تم تعطيل حساب مسجّل الحضور بنجاح',
        'success'
      );
    },
    onError: () => toast.show('فشل تعديل حالة المسجّل، يرجى المحاولة لاحقاً', 'danger'),
  });

  const createClerkMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveClerkClassId) throw new Error('يرجى اختيار الشعبة المدرسية');
      if (!newClerkStudentId) throw new Error('يرجى اختيار طالب من الشعبة');
      if (!newClerkUsername.trim()) throw new Error('يرجى تحديد اسم المستخدم');
      if (!newClerkPassword.trim()) throw new Error('يرجى تحديد كلمة المرور');
      if (newClerkPassword.trim().length < 6) throw new Error('كلمة المرور يجب ألا تقل عن 6 أحرف');

      const enrolled = clerkClassEnrollments.find((e: any) => e.studentId === Number(newClerkStudentId));
      const studentName = enrolled?.studentName || enrolled?.student?.fullName || 'الطالب المختار';
      const className = selectedClerkClass?.className
        ? String(selectedClerkClass.className)
        : `شعبة ${effectiveClerkClassId}`;

      const created = await schoolDataService.createAttendanceClerk(
        {
          studentId: Number(newClerkStudentId),
          username: newClerkUsername.trim(),
          password: newClerkPassword.trim(),
          access: newClerkAccess,
        },
        schoolCode
      );

      return {
        created,
        username: newClerkUsername.trim(),
        password: newClerkPassword.trim(),
        studentName,
        className,
        access: newClerkAccess,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_clerks_paged', schoolCode] });
      setIsAddClerkModalOpen(false);
      setGeneratedCreds({
        type: 'clerk',
        title: 'بيانات حساب مسجّل الحضور',
        studentName: data.studentName,
        className: data.className,
        roleOrAccess: data.access,
        username: data.username,
        password: data.password,
      });
      setNewClerkStudentId('');
      setNewClerkUsername('');
      setNewClerkPassword('');
      setNewClerkAccess('جميع الشعب');
      toast.show(`تم إنشاء حساب مسجّل الحضور (${data.username}) بنجاح`, 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data || err?.message || 'فشل إنشاء حساب المسجّل';
      toast.show(message, 'danger');
    },
  });

  const updateClerkMutation = useMutation({
    mutationFn: async () => {
      if (!editingClerk) throw new Error('لم يتم تحديد مسجّل الحضور');
      const pass = editClerkPassword.trim();
      const conf = editClerkConfirmPassword.trim();
      if (pass || conf) {
        if (pass.length < 6) {
          throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
        }
        if (pass !== conf) {
          throw new Error('كلمتا المرور غير متطابقتين');
        }
      }
      return await schoolDataService.updateAttendanceClerk(
        editingClerk.clerkId,
        {
          username: editClerkUsername.trim() || undefined,
          password: pass || undefined,
          isActive: editClerkIsActive,
          access: editClerkAccess,
        },
        schoolCode
      );
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_clerks_paged', schoolCode] });
      setEditingClerk(null);
      setEditClerkPassword('');
      setEditClerkConfirmPassword('');
      toast.show(`تم تحديث بيانات المسجّل (${updated?.username || ''}) بنجاح`, 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data || err?.message || 'فشل تحديث بيانات المسجّل';
      toast.show(message, 'danger');
    },
  });

  const handleCopyValue = async (value: string, field: 'username' | 'password' | 'all') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.show('تعذر النسخ تلقائياً، يرجى النسخ يدوياً', 'warning');
    }
  };

  const handleCopyAllCredentials = () => {
    if (!generatedCreds) return;
    const text =
      `بيانات الدخول لمنصة مواظب:\n` +
      `الصفة: ${generatedCreds.roleOrAccess}\n` +
      `الطالب: ${generatedCreds.studentName}\n` +
      `الشعبة: ${generatedCreds.className}\n` +
      `اسم المستخدم: ${generatedCreds.username}\n` +
      `كلمة المرور المؤقتة: ${generatedCreds.password}\n` +
      `(ملاحظة: يرجى تغيير كلمة المرور عند أول تسجيل دخول)`;

    void handleCopyValue(text, 'all');
  };

  const handleCopyCardUsername = async (username: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedCardUsername(username);
      window.setTimeout(() => setCopiedCardUsername(null), 2000);
    } catch {
      toast.show('تعذر النسخ', 'warning');
    }
  };

  const openEditClerkModal = (clerk: AttendanceClerk) => {
    setEditingClerk(clerk);
    setEditClerkUsername(clerk.username);
    setEditClerkPassword('');
    setEditClerkConfirmPassword('');
    setEditClerkIsActive(clerk.isActive);
    setEditClerkAccess(clerk.access || 'جميع الشعب');
  };

  const pageTitle = activeTab === 'representatives' ? 'عرفاء الفصول والنواب' : 'مسجلو الحضور';

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Page header */}
      <section className={`${SURFACE} overflow-hidden`}>
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/70">
              <Users2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  إدارة الحسابات والصلاحيات
                </h1>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                  إدارة المدرسة
                </span>
              </div>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-slate-500 dark:text-slate-400">
                إدارة حسابات عرفاء الشعب والنواب، وإنشاء حسابات مسجلي الحضور وتحديد نطاق صلاحياتهم.
              </p>
            </div>
          </div>

          {activeTab === 'representatives' ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Plus className="h-4 w-4" />}
              onClick={openAssignRepModal}
              disabled={classes.length === 0}
              className="w-full shrink-0 font-bold sm:w-auto"
            >
              تعيين عريف أو نائب
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Plus className="h-4 w-4" />}
              onClick={openAddClerkModal}
              disabled={classes.length === 0}
              className="w-full shrink-0 font-bold sm:w-auto"
            >
              إضافة مسجّل حضور
            </Button>
          )}
        </div>

        <div className={`grid grid-cols-2 border-t ${DIVIDER} sm:grid-cols-4`}>
          <div className="border-l p-3.5 dark:border-slate-800 sm:p-4">
            <span className={`block text-[11px] ${MUTED}`}>عرفاء ونواب</span>
            <strong className="mt-1 block text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {repTotalCount}
            </strong>
          </div>
          <div className="border-l p-3.5 dark:border-slate-800 sm:p-4">
            <span className={`block text-[11px] ${MUTED}`}>مسجلو الحضور</span>
            <strong className="mt-1 block text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {clerkTotalCount}
            </strong>
          </div>
          <div className="border-l p-3.5 dark:border-slate-800 sm:p-4">
            <span className={`block text-[11px] ${MUTED}`}>الشعب المدرسية</span>
            <strong className="mt-1 block text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {isClassesLoading ? '—' : classes.length}
            </strong>
          </div>
          <div className="p-3.5 sm:p-4">
            <span className={`block text-[11px] ${MUTED}`}>القسم الحالي</span>
            <strong className="mt-1 block truncate text-sm font-bold text-emerald-800 dark:text-emerald-300">
              {pageTitle}
            </strong>
          </div>
        </div>
      </section>

      {/* Main section switcher */}
      <nav className={`${SURFACE} flex flex-col gap-2 p-2 sm:flex-row`} aria-label="أقسام إدارة الحسابات">
        <button
          type="button"
          onClick={() => setActiveTab('representatives')}
          aria-pressed={activeTab === 'representatives'}
          className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-4 py-3 text-right transition ${
            activeTab === 'representatives'
              ? 'bg-emerald-700 text-white shadow-sm dark:bg-emerald-700'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeTab === 'representatives' ? 'bg-white/15' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              <Users2 className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <strong className="block text-sm font-bold">عرفاء الفصول والنواب</strong>
              <span className={`mt-0.5 block truncate text-[11px] ${activeTab === 'representatives' ? 'text-emerald-50/80' : 'text-slate-500 dark:text-slate-400'}`}>
                حساب لكل شعبة مع نائب احتياطي
              </span>
            </span>
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${activeTab === 'representatives' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            {repTotalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clerks')}
          aria-pressed={activeTab === 'clerks'}
          className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-4 py-3 text-right transition ${
            activeTab === 'clerks'
              ? 'bg-emerald-700 text-white shadow-sm dark:bg-emerald-700'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeTab === 'clerks' ? 'bg-white/15' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <strong className="block text-sm font-bold">مسجلو الحضور</strong>
              <span className={`mt-0.5 block truncate text-[11px] ${activeTab === 'clerks' ? 'text-emerald-50/80' : 'text-slate-500 dark:text-slate-400'}`}>
                صلاحيات رصد على مستوى المدرسة
              </span>
            </span>
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${activeTab === 'clerks' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            {clerkTotalCount}
          </span>
        </button>
      </nav>

      {/* Attendance clerks section */}
      {activeTab === 'clerks' && (
        <section className="space-y-4">
          <div className={`${SURFACE} p-4 sm:p-5`}>
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">حسابات مسجلي الحضور</h2>
              <p className={`text-xs ${MUTED}`}>ابحث عن الحساب، راجع نطاق صلاحيته، أو عدّل حالته.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_230px]">
              <div>
                <label className={LABEL} htmlFor="clerk-search">البحث</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="clerk-search"
                    type="search"
                    value={clerkSearch}
                    onChange={(e) => { setClerkSearch(e.target.value); setClerkPage(1); }}
                    placeholder="اسم المسجّل، الطالب، أو اسم المستخدم"
                    className={`${FIELD} pr-10`}
                  />
                  {clerkSearch && (
                    <button type="button" onClick={() => { setClerkSearch(''); setClerkPage(1); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="مسح البحث">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className={LABEL} htmlFor="clerk-status">حالة الحساب</label>
                <select
                  id="clerk-status"
                  value={clerkFilterStatus}
                  onChange={(e) => { setClerkFilterStatus(e.target.value as 'all' | 'active' | 'inactive'); setClerkPage(1); }}
                  className={FIELD}
                >
                  <option value="all">كل الحسابات</option>
                  <option value="active">الحسابات النشطة</option>
                  <option value="inactive">الحسابات المعطّلة</option>
                </select>
              </div>
            </div>
            <div className={`mt-3 flex items-center justify-between border-t pt-3 ${DIVIDER}`}>
              <span className={`text-xs ${MUTED}`}>{clerkTotalCount} حساب مسجل</span>
              {isClerksFetching && !isClerksLoading && <span className="text-[11px] text-emerald-700 dark:text-emerald-400">يتم تحديث النتائج...</span>}
            </div>
          </div>

          {isClerksLoading ? (
            <div className={`${SURFACE} p-10 text-center`}><MuwathibLoading message="جاري تحميل حسابات مسجلي الحضور..." /></div>
          ) : clerks.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="h-6 w-6" />}
              title={debouncedClerkSearch || clerkFilterStatus !== 'all' ? 'لا توجد نتائج مطابقة' : 'لم تتم إضافة مسجلي حضور بعد'}
              description={debouncedClerkSearch || clerkFilterStatus !== 'all' ? 'جرّب تغيير كلمات البحث أو اختيار حالة أخرى.' : 'أضف حساباً لطالب موثوق وحدد الشعب التي يمكنه رصد حضورها.'}
              action={debouncedClerkSearch || clerkFilterStatus !== 'all' ? (
                <Button type="button" variant="outline" size="sm" onClick={() => { setClerkSearch(''); setClerkFilterStatus('all'); setClerkPage(1); }}>مسح عوامل التصفية</Button>
              ) : (
                <Button type="button" variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAddClerkModal}>إضافة أول مسجّل حضور</Button>
              )}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clerks.map((clerk: AttendanceClerk) => (
                <article key={clerk.clerkId} className={`${SURFACE} flex min-w-0 flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${!clerk.isActive ? 'opacity-90' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${clerk.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{clerk.studentName || 'مسجّل حضور'}</h3>
                        <p className={`mt-1 truncate text-[11px] ${MUTED}`}>{clerk.className || (clerk.classNumber ? `شعبة ${clerk.classNumber}` : 'طالب بالمدرسة')}</p>
                      </div>
                    </div>
                    <StatusBadge active={clerk.isActive} />
                  </div>

                  <div className={`my-4 space-y-3 border-y py-4 ${DIVIDER}`}>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950/70">
                      <span className={`flex items-center gap-1.5 text-[11px] ${MUTED}`}><KeyRound className="h-3.5 w-3.5" /> اسم الدخول</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <code className="truncate text-xs font-bold text-emerald-800 dark:text-emerald-300" dir="ltr">{clerk.username}</code>
                        <button type="button" onClick={() => handleCopyCardUsername(clerk.username)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300" title="نسخ اسم المستخدم" aria-label="نسخ اسم المستخدم">
                          {copiedCardUsername === clerk.username ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={`flex items-center gap-1.5 ${MUTED}`}><UserRound className="h-3.5 w-3.5" /> رقم الهوية</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{clerk.nationalId || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={`flex items-center gap-1.5 ${MUTED}`}><Building2 className="h-3.5 w-3.5" /> المدرسة</span>
                      <span className="max-w-[60%] truncate font-semibold text-slate-700 dark:text-slate-200">{clerk.schoolName || 'مدرسة مواظب'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <span className={`flex items-center gap-1.5 pt-1 ${MUTED}`}><SlidersHorizontal className="h-3.5 w-3.5" /> نطاق الصلاحية</span>
                      <span className="max-w-[65%] rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-right text-[11px] font-bold text-teal-800 dark:border-teal-900/70 dark:bg-teal-950/40 dark:text-teal-300">{clerk.access || 'جميع الشعب'}</span>
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" icon={<Edit3 className="h-3.5 w-3.5" />} onClick={() => openEditClerkModal(clerk)} className="font-bold">تعديل الحساب</Button>
                    <button
                      type="button"
                      disabled={toggleClerkStatusMutation.isPending}
                      onClick={() => toggleClerkStatusMutation.mutate({ clerkId: clerk.clerkId, isActive: !clerk.isActive })}
                      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${clerk.isActive ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70'}`}
                    >
                      <Power className="h-3.5 w-3.5" />{clerk.isActive ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className={SURFACE}>
            <PaginationControls pageNumber={clerkPage} totalPages={clerkTotalPages} totalCount={clerkTotalCount} pageSize={clerkPageSize} onPageChange={setClerkPage} onPageSizeChange={(size) => { setClerkPageSize(size); setClerkPage(1); }} isLoading={isClerksLoading} itemLabel="مسجّل حضور" />
          </div>
        </section>
      )}

      {/* Representatives section */}
      {activeTab === 'representatives' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/70 dark:bg-sky-950/30 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300"><Info className="h-4.5 w-4.5" /></div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-sky-950 dark:text-sky-200">طريقة تسمية الحسابات</h2>
                <p className="mt-1 text-xs leading-6 text-sky-900/80 dark:text-sky-200/80">
                  لكل شعبة حسابان: العريف الأساسي ينتهي بـ <code className="rounded bg-white/70 px-1.5 py-0.5 font-bold dark:bg-slate-900">_1</code>، والنائب ينتهي بـ <code className="rounded bg-white/70 px-1.5 py-0.5 font-bold dark:bg-slate-900">_2</code>. يطلب من المستخدم تغيير كلمة المرور المؤقتة عند أول دخول.
                </p>
              </div>
            </div>
          </div>

          <div className={`${SURFACE} p-4 sm:p-5`}>
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">قائمة العرفاء والنواب</h2>
              <p className={`text-xs ${MUTED}`}>استخدم البحث والصفة للوصول إلى الحساب، ثم بدّل طريقة العرض كما يناسبك.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
              <div>
                <label className={LABEL} htmlFor="rep-search">البحث عن حساب</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="rep-search" type="search" value={repSearch} onChange={(e) => { setRepSearch(e.target.value); setRepPage(1); }} placeholder="اسم الطالب، اسم المستخدم، أو رقم الجوال" className={`${FIELD} pr-10`} />
                  {repSearch && <button type="button" onClick={() => { setRepSearch(''); setRepPage(1); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="مسح البحث"><X className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
              <div>
                <label className={LABEL} htmlFor="rep-role-filter">تصفية حسب الصفة</label>
                <select id="rep-role-filter" value={repFilterRole} onChange={(e) => { setFilterRole(e.target.value as 'all' | 'Representative' | 'Deputy'); setRepPage(1); }} className={FIELD}>
                  <option value="all">كل الحسابات</option>
                  <option value="Representative">العرفاء الأساسيون</option>
                  <option value="Deputy">النواب</option>
                </select>
              </div>
              <div className="flex items-end justify-between gap-3 lg:justify-end">
                <div className="min-w-0 pb-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{repTotalCount}</span> حساب
                  {isRepsFetching && !isRepsLoading && <span className="mr-2 text-emerald-700 dark:text-emerald-400">يتم التحديث...</span>}
                </div>
                <div className="inline-flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950">
                  <button type="button" onClick={() => setRepViewMode('cards')} aria-pressed={repViewMode === 'cards'} className={`rounded-lg p-2 transition ${repViewMode === 'cards' ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`} title="عرض البطاقات"><LayoutGrid className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setRepViewMode('table')} aria-pressed={repViewMode === 'table'} className={`rounded-lg p-2 transition ${repViewMode === 'table' ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`} title="عرض الجدول"><TableIcon className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>

          {isRepsLoading ? (
            <div className={`${SURFACE} p-10 text-center`}><MuwathibLoading message="جاري تحميل حسابات العرفاء والنواب..." /></div>
          ) : reps.length === 0 ? (
            <EmptyState
              icon={<Users2 className="h-6 w-6" />}
              title={debouncedRepSearch || repFilterRole !== 'all' ? 'لا توجد حسابات مطابقة' : 'لا توجد حسابات عرفاء أو نواب بعد'}
              description={debouncedRepSearch || repFilterRole !== 'all' ? 'غيّر كلمات البحث أو أزل التصفية لعرض بقية الحسابات.' : 'ابدأ بتعيين عريف أساسي أو نائب لإحدى الشعب المدرسية.'}
              action={debouncedRepSearch || repFilterRole !== 'all' ? (
                <Button type="button" variant="outline" size="sm" onClick={() => { setRepSearch(''); setFilterRole('all'); setRepPage(1); }}>مسح عوامل التصفية</Button>
              ) : (
                <Button type="button" variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAssignRepModal} disabled={classes.length === 0}>تعيين أول عريف</Button>
              )}
            />
          ) : repViewMode === 'cards' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reps.map((rep: Representative) => (
                <article key={rep.representativeId} className={`${SURFACE} flex min-w-0 flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${!rep.isActive ? 'opacity-90' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-extrabold text-emerald-800 dark:bg-slate-800 dark:text-emerald-300" dir="ltr">{rep.username}</code>
                        <RoleBadge role={rep.role} />
                      </div>
                      <h3 className="mt-3 truncate text-sm font-bold text-slate-900 dark:text-white">{rep.studentName || 'طالب معيّن'}</h3>
                      <p className={`mt-1 text-[11px] ${MUTED}`}>{rep.className || (rep.classNumber ? `شعبة ${rep.classNumber}` : `شعبة ${rep.classId}`)}</p>
                    </div>
                    <StatusBadge active={rep.isActive} />
                  </div>

                  <div className={`my-4 space-y-3 border-y py-4 ${DIVIDER}`}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={`flex items-center gap-1.5 ${MUTED}`}><Phone className="h-3.5 w-3.5" /> رقم الجوال</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200" dir="ltr">{rep.phoneNumber || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={`flex items-center gap-1.5 ${MUTED}`}><LockKeyhole className="h-3.5 w-3.5" /> كلمة المرور</span>
                      <PasswordBadge required={rep.mustChangePassword} />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={toggleRepStatusMutation.isPending}
                    onClick={() => toggleRepStatusMutation.mutate({ repId: rep.representativeId, isActive: !rep.isActive })}
                    className={`mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${rep.isActive ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70'}`}
                  >
                    <Power className="h-3.5 w-3.5" />{rep.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className={`${SURFACE} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-3.5 font-bold">اسم المستخدم</th>
                      <th className="px-4 py-3.5 font-bold">الطالب</th>
                      <th className="px-4 py-3.5 font-bold">الشعبة</th>
                      <th className="px-4 py-3.5 font-bold">الصفة</th>
                      <th className="px-4 py-3.5 font-bold">رقم الجوال</th>
                      <th className="px-4 py-3.5 text-center font-bold">الحالة</th>
                      <th className="px-4 py-3.5 text-center font-bold">كلمة المرور</th>
                      <th className="px-4 py-3.5 text-center font-bold">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reps.map((rep: Representative) => (
                      <tr key={rep.representativeId} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3"><code className="font-bold text-emerald-800 dark:text-emerald-300" dir="ltr">{rep.username}</code></td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{rep.studentName || 'طالب معيّن'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rep.className || (rep.classNumber ? `شعبة ${rep.classNumber}` : `شعبة ${rep.classId}`)}</td>
                        <td className="px-4 py-3"><RoleBadge role={rep.role} /></td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300" dir="ltr">{rep.phoneNumber || '—'}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge active={rep.isActive} /></td>
                        <td className="px-4 py-3 text-center"><PasswordBadge required={rep.mustChangePassword} /></td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" disabled={toggleRepStatusMutation.isPending} onClick={() => toggleRepStatusMutation.mutate({ repId: rep.representativeId, isActive: !rep.isActive })} className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${rep.isActive ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                            {rep.isActive ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={SURFACE}>
            <PaginationControls pageNumber={repPage} totalPages={repTotalPages} totalCount={repTotalCount} pageSize={repPageSize} onPageChange={setRepPage} onPageSizeChange={(size) => { setRepPageSize(size); setRepPage(1); }} isLoading={isRepsLoading} itemLabel="عريف / نائب" />
          </div>
        </section>
      )}

      {/* Add attendance clerk */}
      <Dialog
        isOpen={isAddClerkModalOpen}
        onClose={() => setIsAddClerkModalOpen(false)}
        title="إضافة مسجّل حضور"
        description="اختر الشعبة، ثم الطالب من الشعبة، وسيتم توليد اسم المستخدم وكلمة المرور تلقائياً."
        maxWidth="lg"
      >
        <div className="space-y-5 text-right">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
            سيتم ربط حساب المسجّل بالطالب المختار من الشعبة وتوليد بيانات اعتماد خاصة به تبدأ برمز الشعبة.
          </div>

          {/* 1. Select Class */}
          <div>
            <label className={LABEL} htmlFor="new-clerk-class">1. الشعبة المدرسية</label>
            <select
              id="new-clerk-class"
              value={effectiveClerkClassId}
              disabled={isClassesLoading || classes.length === 0}
              onChange={(e) => handleClerkClassChange(Number(e.target.value))}
              className={FIELD}
            >
              {classes.map((item) => (
                <option key={item.classId} value={item.classId}>
                  {item.className || `شعبة ${item.classNumber || item.classId}`}
                </option>
              ))}
            </select>
            {classes.length === 0 && (
              <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">لا توجد شعب متاحة حالياً.</p>
            )}
          </div>

          {/* 2. Select Student from Class */}
          <div>
            <label className={LABEL} htmlFor="new-clerk-student">2. اختيار الطالب من الشعبة</label>
            <select
              id="new-clerk-student"
              value={newClerkStudentId}
              disabled={isClerkClassEnrollmentsLoading || clerkClassEnrollments.length === 0}
              onChange={(e) => setNewClerkStudentId(e.target.value ? Number(e.target.value) : '')}
              className={FIELD}
            >
              <option value="">
                {isClerkClassEnrollmentsLoading
                  ? 'جاري تحميل طلاب الشعبة...'
                  : clerkClassEnrollments.length === 0
                  ? 'لا يوجد طلاب مسجلون في هذه الشعبة'
                  : 'اختر الطالب ليكون مسجلاً للحضور'}
              </option>
              {clerkClassEnrollments.map((enrollment: any) => (
                <option key={enrollment.studentId || enrollment.enrollmentId} value={enrollment.studentId}>
                  {enrollment.studentName || enrollment.student?.fullName || `طالب #${enrollment.studentId}`}
                  {enrollment.nationalId ? ` (هوية: ${enrollment.nationalId})` : ''}
                </option>
              ))}
            </select>
            {selectedClerkEnrollment && (
              <div className="mt-2 rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <span className="font-bold">الطالب المختار: </span>
                {selectedClerkEnrollment.studentName || selectedClerkEnrollment.student?.fullName}
                {selectedClerkEnrollment.nationalId ? ` · رقم الهوية: ${selectedClerkEnrollment.nationalId}` : ''}
              </div>
            )}
          </div>

          {/* 3. Generated Username & Password */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="اسم المستخدم (تم التوليد تلقائياً)"
                placeholder="مثال: clerk_201"
                value={newClerkUsername}
                onChange={(e) => setNewClerkUsername(e.target.value)}
                dir="ltr"
                className="text-left font-mono font-bold"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                يبدأ برمز clerk متبوعاً برقم الشعبة
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={LABEL}>كلمة المرور المؤقتة</label>
                <button
                  type="button"
                  onClick={() => setNewClerkPassword(generateRandomPassword())}
                  className="mb-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  <RefreshCw className="h-3 w-3" />
                  توليد أخرى
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={newClerkPassword}
                  onChange={(e) => setNewClerkPassword(e.target.value)}
                  dir="ltr"
                  className={`${FIELD} pr-9 font-mono font-bold text-amber-700 dark:text-amber-400`}
                />
                <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                كلمة مرور عشوائية قوية مخصصة للمسجّل
              </p>
            </div>
          </div>

          {/* 4. Access Scope */}
          <div>
            <label className={LABEL}>3. نطاق صلاحية رصد الحضور</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CLERK_ACCESS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setNewClerkAccess(option)}
                  aria-pressed={newClerkAccess === option}
                  className={`rounded-xl border p-3 text-right text-xs font-bold transition ${
                    newClerkAccess === option
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/10 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    {option}
                    {newClerkAccess === option && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsAddClerkModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => createClerkMutation.mutate()}
            isLoading={createClerkMutation.isPending}
            disabled={
              createClerkMutation.isPending ||
              isClerkClassEnrollmentsLoading ||
              !newClerkStudentId ||
              !newClerkUsername.trim() ||
              !newClerkPassword.trim()
            }
          >
            إنشاء الحساب وتوليد البيانات
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit attendance clerk */}
      {editingClerk && (
        <Dialog isOpen={true} onClose={() => setEditingClerk(null)} title="تعديل حساب مسجّل الحضور" description={`إدارة بيانات الحساب: ${editingClerk.studentName || editingClerk.username}`} maxWidth="lg">
          <div className="space-y-5 text-right">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-700 dark:bg-slate-950 sm:grid-cols-2">
              <div><span className={MUTED}>الطالب المسؤول</span><strong className="mt-1 block text-slate-800 dark:text-slate-100">{editingClerk.studentName || '—'}</strong></div>
              <div><span className={MUTED}>الشعبة</span><strong className="mt-1 block text-slate-800 dark:text-slate-100">{editingClerk.className || '—'}</strong></div>
              <div><span className={MUTED}>رقم الهوية</span><strong className="mt-1 block font-mono text-slate-800 dark:text-slate-100">{editingClerk.nationalId || '—'}</strong></div>
              <div><span className={MUTED}>حالة الحساب</span><div className="mt-1"><StatusBadge active={editClerkIsActive} /></div></div>
            </div>
            <Input label="اسم المستخدم" value={editClerkUsername} onChange={(e) => setEditClerkUsername(e.target.value)} dir="ltr" className="text-left font-mono" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="كلمة مرور جديدة (اختياري)" type="password" placeholder="اترك الحقل فارغاً للإبقاء على الحالية" value={editClerkPassword} onChange={(e) => setEditClerkPassword(e.target.value)} dir="ltr" className="text-left font-mono" />
              <Input label="تأكيد كلمة المرور الجديدة" type="password" placeholder="أعد إدخال كلمة المرور الجديدة" value={editClerkConfirmPassword} onChange={(e) => setEditClerkConfirmPassword(e.target.value)} dir="ltr" className="text-left font-mono" />
            </div>
            <div>
              <label className={LABEL}>حالة الحساب</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: true, label: 'نشط' }, { value: false, label: 'معطّل' }].map((item) => (
                  <button key={String(item.value)} type="button" onClick={() => setEditClerkIsActive(item.value)} aria-pressed={editClerkIsActive === item.value} className={`rounded-xl border p-3 text-xs font-bold transition ${editClerkIsActive === item.value ? item.value ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-rose-600 bg-rose-50 text-rose-800 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>{item.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={LABEL}>نطاق صلاحية رصد الحضور</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CLERK_ACCESS_OPTIONS.map((option) => (
                  <button key={option} type="button" onClick={() => setEditClerkAccess(option)} aria-pressed={editClerkAccess === option} className={`rounded-xl border p-3 text-right text-xs font-bold transition ${editClerkAccess === option ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>{option}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingClerk(null)}>إلغاء</Button>
            <Button type="button" variant="primary" onClick={() => updateClerkMutation.mutate()} isLoading={updateClerkMutation.isPending} disabled={updateClerkMutation.isPending || !editClerkUsername.trim()}>حفظ التعديلات</Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Assign representative */}
      <Dialog
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="تعيين عريف أو نائب"
        description="اختر الشعبة، ثم الطالب من الشعبة، وسيتم توليد اسم المستخدم وكلمة المرور تلقائياً."
        maxWidth="lg"
      >
        <div className="space-y-5 text-right">
          {/* 1. Select Class */}
          <div>
            <label className={LABEL} htmlFor="rep-class">1. الشعبة المدرسية</label>
            <select
              id="rep-class"
              value={assignmentClassId}
              onChange={(e) => handleRepClassChange(Number(e.target.value))}
              disabled={isClassesLoading || classes.length === 0}
              className={FIELD}
            >
              {classes.map((item) => (
                <option key={item.classId} value={item.classId}>
                  {item.className || `شعبة ${item.classNumber || item.classId}`}
                </option>
              ))}
            </select>
            {classes.length === 0 && (
              <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">لا توجد شعب متاحة للتعيين حالياً.</p>
            )}
          </div>

          {/* 2. Select Student from Class */}
          <div>
            <label className={LABEL} htmlFor="rep-student">2. اختيار الطالب من الشعبة</label>
            <select
              id="rep-student"
              value={selectedEnrollmentId}
              disabled={isRepClassEnrollmentsLoading || repClassEnrollments.length === 0}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : '';
                setSelectedEnrollmentId(val);
                if (val) {
                  const found = repClassEnrollments.find((item: any) => item.enrollmentId === val);
                  if (found?.parentPhoneNumber && !phoneNumber) {
                    setPhoneNumber(found.parentPhoneNumber);
                  }
                }
              }}
              className={FIELD}
            >
              <option value="">
                {isRepClassEnrollmentsLoading
                  ? 'جاري تحميل طلاب الشعبة...'
                  : repClassEnrollments.length === 0
                  ? 'لا يوجد طلاب مسجلون في هذه الشعبة'
                  : 'اختر الطالب لتعيينه'}
              </option>
              {repClassEnrollments.map((enrollment: any) => (
                <option key={enrollment.enrollmentId} value={enrollment.enrollmentId}>
                  {enrollment.studentName || enrollment.student?.fullName || `طالب #${enrollment.studentId}`}
                  {enrollment.nationalId ? ` (هوية: ${enrollment.nationalId})` : ''}
                </option>
              ))}
            </select>
            {selectedRepEnrollment && (
              <div className="mt-2 rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <span className="font-bold">الطالب المختار: </span>
                {selectedRepEnrollment.studentName || selectedRepEnrollment.student?.fullName}
                {selectedRepEnrollment.nationalId ? ` · رقم الهوية: ${selectedRepEnrollment.nationalId}` : ''}
              </div>
            )}
          </div>

          {/* 3. Account Type / Role */}
          <div>
            <label className={LABEL}>3. صفة التعيين</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleRoleTypeChange('Representative')}
                aria-pressed={roleType === 'Representative'}
                className={`rounded-xl border p-3.5 text-right transition ${
                  roleType === 'Representative'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/10 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold">عريف الصف الأساسي</span>
                  {roleType === 'Representative' && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <code className="mt-1 block text-[11px] font-mono text-emerald-800 dark:text-emerald-300" dir="ltr">
                  rep_{getClassNum(selectedAssignmentClass)}
                </code>
              </button>
              <button
                type="button"
                onClick={() => handleRoleTypeChange('Deputy')}
                aria-pressed={roleType === 'Deputy'}
                className={`rounded-xl border p-3.5 text-right transition ${
                  roleType === 'Deputy'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/10 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold">نائب العريف</span>
                  {roleType === 'Deputy' && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <code className="mt-1 block text-[11px] font-mono text-emerald-800 dark:text-emerald-300" dir="ltr">
                  rep_{getClassNum(selectedAssignmentClass)}_2
                </code>
              </button>
            </div>
          </div>

          {/* 4. Generated Username & Password */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="اسم المستخدم (تم التوليد تلقائياً)"
                placeholder="مثال: rep_101"
                value={repUsername}
                onChange={(e) => setRepUsername(e.target.value)}
                dir="ltr"
                className="text-left font-mono font-bold"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                يبدأ برمز rep متبوعاً برقم الشعبة
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={LABEL}>كلمة المرور المؤقتة</label>
                <button
                  type="button"
                  onClick={() => setRepPassword(generateRandomPassword())}
                  className="mb-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  <RefreshCw className="h-3 w-3" />
                  توليد أخرى
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={repPassword}
                  onChange={(e) => setRepPassword(e.target.value)}
                  dir="ltr"
                  className={`${FIELD} pr-9 font-mono font-bold text-amber-700 dark:text-amber-400`}
                />
                <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                كلمة مرور عشوائية قوية يمكن تجديدها
              </p>
            </div>
          </div>

          <Input
            label="رقم جوال العريف للتواصل الإداري"
            placeholder="05XXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            dir="ltr"
            className="text-left font-mono"
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            سيُنشأ الحساب ببيانات الدخول أعلاه، ويُلزم العريف أو نائبه بتغيير كلمة المرور عند أول تسجيل دخول.
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => assignRepMutation.mutate()}
            isLoading={assignRepMutation.isPending}
            disabled={
              assignRepMutation.isPending ||
              isRepClassEnrollmentsLoading ||
              !selectedEnrollmentId ||
              !repUsername.trim() ||
              !repPassword.trim() ||
              !phoneNumber.trim()
            }
          >
            إنشاء بيانات الدخول
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Generated credentials Dialog */}
      {generatedCreds && (
        <Dialog
          isOpen={true}
          onClose={() => setGeneratedCreds(null)}
          title="تم إنشاء الحساب وتوليد بيانات الدخول بنجاح"
          description="انسخ بيانات الدخول وسلّمها للمستخدم بطريقة آمنة. لن تظهر كلمة المرور مجدداً بعد إغلاق هذه النافذة."
          maxWidth="lg"
        >
          <div className="space-y-4 text-right">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {generatedCreds.title}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  {generatedCreds.roleOrAccess}
                </span>
              </div>

              <div className="space-y-3 rounded-lg border border-emerald-200/70 bg-white p-3.5 dark:border-emerald-900/70 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className={MUTED}>الطالب</span>
                  <strong className="text-slate-900 dark:text-slate-100">{generatedCreds.studentName}</strong>
                </div>
                <div className={`border-t pt-2.5 ${DIVIDER} flex items-center justify-between gap-3 text-xs`}>
                  <span className={MUTED}>الشعبة</span>
                  <strong className="text-slate-900 dark:text-slate-100">{generatedCreds.className}</strong>
                </div>

                {/* Username copy field */}
                <div className={`border-t pt-3 ${DIVIDER}`}>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    اسم المستخدم (Username)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-extrabold text-emerald-800 dark:border-slate-800 dark:bg-slate-900 dark:text-emerald-300" dir="ltr">
                      {generatedCreds.username}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={copiedField === 'username' ? 'primary' : 'outline'}
                      onClick={() => handleCopyValue(generatedCreds.username, 'username')}
                      className="shrink-0 font-bold"
                    >
                      {copiedField === 'username' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          تم النسخ
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          نسخ
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password copy field */}
                <div className={`border-t pt-3 ${DIVIDER}`}>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    كلمة المرور المؤقتة (Temporary Password)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 font-mono text-sm font-extrabold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200" dir="ltr">
                      {generatedCreds.password}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={copiedField === 'password' ? 'primary' : 'outline'}
                      onClick={() => handleCopyValue(generatedCreds.password, 'password')}
                      className="shrink-0 font-bold"
                    >
                      {copiedField === 'password' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          تم النسخ
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          نسخ
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <p className={`flex items-start gap-2 text-xs leading-6 ${MUTED}`}>
              <KeyRound className="mt-1 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              يرجى تسليم هذه البيانات للمستخدم مباشرة. ينصح بتغيير كلمة المرور عند أول تسجيل دخول.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="primary"
              onClick={handleCopyAllCredentials}
              icon={copiedField === 'all' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            >
              {copiedField === 'all' ? 'تم نسخ جميع البيانات' : 'نسخ جميع بيانات الدخول'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setGeneratedCreds(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

export default AdminRepresentativesPage;
