
import { useEffect, useState } from 'react';
import { useAuth } from '../../../auth';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { representativesApi } from '../../../representatives/api/representativesApi';
import { enrollmentsApi } from '../../../enrollments/api/enrollmentsApi';

import {
  UserCheck,
  ShieldCheck,
  UserX,
  AlertCircle,
  UserPlus,
  Info,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  X,
  Building2,
} from 'lucide-react';

import { Button } from '../../../../shared/components/ui/Button';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';

import {
  Dialog,
  DialogFooter,
} from '../../../../shared/components/ui/Dialog';

import { useNotifications } from '../../../notifications';

import {
  generateSecureDeputyPassword,
  deputyCredentialStorage,
  type PendingDeputyCredential,
} from '../services/deputyCredentialStorage';

/* -------------------------------------------------------------------------- */
/*                                  Styles                                    */
/* -------------------------------------------------------------------------- */

const SURFACE =
  'rounded-2xl border border-[#DCE6E1] bg-white shadow-sm dark:border-[#1E4638] dark:bg-[#122B23]';

const INNER =
  'rounded-xl border border-[#E7EEEA] bg-[#F5F8F6] dark:border-[#1E4638] dark:bg-[#0D211A]';

const MUTED = 'text-[#71827A] dark:text-[#A3C7B9]';

const DIVIDER = 'border-[#E7EEEA] dark:border-[#1E4638]';

const FIELD =
  'h-11 w-full rounded-xl border border-[#DCE6E1] bg-white px-3 text-sm text-[#17252B] outline-none transition placeholder:text-[#9BAAA2] focus:border-[#0B5D43] focus:ring-4 focus:ring-[#0B5D43]/10 dark:border-[#285344] dark:bg-[#0D211A] dark:text-[#F4F8F6] dark:placeholder:text-[#78998B] dark:focus:border-[#75D39B] dark:focus:ring-[#75D39B]/10';

/* -------------------------------------------------------------------------- */
/*                         Random Username Generator                         */
/* -------------------------------------------------------------------------- */

/**
 * Generates a cryptographically random username.
 *
 * - 12 characters.
 * - No class number.
 * - No role prefix.
 * - No account-type prefix.
 * - Checks usernames already loaded from the API.
 *
 * Database uniqueness must still be enforced by the backend.
 */
function generateRandomUsername(
  existingUsernames: string[] = []
): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';

  const existing = new Set(
    existingUsernames.map((username) => username.toLowerCase())
  );

  const limit = Math.floor(256 / alphabet.length) * alphabet.length;

  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = new Uint8Array(24);

    globalThis.crypto.getRandomValues(bytes);

    let username = '';

    for (const byte of bytes) {
      if (byte >= limit) continue;

      username += alphabet[byte % alphabet.length];

      if (username.length === 12) break;
    }

    if (
      username.length === 12 &&
      !existing.has(username.toLowerCase())
    ) {
      return username;
    }
  }

  throw new Error('تعذر توليد اسم مستخدم جديد. يرجى المحاولة مرة أخرى.');
}

/* -------------------------------------------------------------------------- */
/*                              Main Component                               */
/* -------------------------------------------------------------------------- */

export function RepresentativeDeputyPage() {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const queryClient = useQueryClient();

  const classId = user?.classId || 0;

  /* ------------------------------------------------------------------------ */
  /*                                   State                                  */
  /* ------------------------------------------------------------------------ */

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<number>(0);

  const [generatedUsername, setGeneratedUsername] = useState(
    () => generateRandomUsername()
  );

  const [generatedPassword, setGeneratedPassword] = useState(
    () => generateSecureDeputyPassword()
  );

  const [showPasswordInForm, setShowPasswordInForm] = useState(false);
  const [showPasswordInCredentials, setShowPasswordInCredentials] =
    useState(false);

  const [copiedField, setCopiedField] = useState<
    'username' | 'password' | 'all' | null
  >(null);

  const [pendingCredential, setPendingCredential] =
    useState<PendingDeputyCredential | null>(null);

  /* ------------------------------------------------------------------------ */
  /*                           Load Saved Credentials                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const saved = deputyCredentialStorage.get(classId);
    setPendingCredential(saved);
  }, [classId]);

  /* ------------------------------------------------------------------------ */
  /*                                   Queries                                */
  /* ------------------------------------------------------------------------ */

  const {
    data: reps = [],
    isLoading: isLoadingReps,
    isError: isRepsError,
  } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => representativesApi.getRepresentatives(),
    enabled: classId > 0,
  });

  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments,
    isError: isEnrollmentsError,
  } = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: () => enrollmentsApi.getEnrollmentsByClass(classId),
    enabled: classId > 0,
  });

  const isLoadingPage = isLoadingReps || isLoadingEnrollments;

  const hasLoadingError = isRepsError || isEnrollmentsError;

  /* ------------------------------------------------------------------------ */
  /*                        Class Representative Verification                */
  /* ------------------------------------------------------------------------ */

  const classRepresentativeEnrollment = enrollments.find((enrollment) => {
    if (!enrollment.isRepresentative) return false;

    return reps.some(
      (representative) =>
        representative.enrollmentId === enrollment.enrollmentId &&
        representative.isActive
    );
  });

  const classRepresentative = classRepresentativeEnrollment
    ? reps.find(
        (representative) =>
          representative.enrollmentId ===
            classRepresentativeEnrollment.enrollmentId &&
          representative.isActive
      )
    : undefined;

  const hasClassRepresentative = Boolean(
    classRepresentative ||
      (user?.role === 'Representative' && classId > 0)
  );

  /* ------------------------------------------------------------------------ */
  /*                             Deputy Identification                       */
  /* ------------------------------------------------------------------------ */

  const classEnrollmentIds = new Set(
    enrollments.map((enrollment) => enrollment.enrollmentId)
  );

  const deputy = reps.find(
    (representative) =>
      representative.isActive &&
      representative.role === 'Deputy' &&
      classEnrollmentIds.has(representative.enrollmentId)
  );

  const selectedStudent = enrollments.find(
    (enrollment) => enrollment.enrollmentId === selectedStudentId
  );

  /* ------------------------------------------------------------------------ */
  /*                           Available Students                            */
  /* ------------------------------------------------------------------------ */

  const availableStudents = enrollments.filter((enrollment) => {
    // The class representative cannot be appointed as deputy.
    if (enrollment.isRepresentative) return false;

    // Do not offer the currently appointed deputy as a replacement.
    if (enrollment.enrollmentId === deputy?.enrollmentId) {
      return false;
    }

    // Exclude students who already have another active representative account.
    const hasOtherActiveAccount = reps.some(
      (representative) =>
        representative.enrollmentId === enrollment.enrollmentId &&
        representative.isActive &&
        representative.role !== 'Deputy'
    );

    return !hasOtherActiveAccount;
  });

  /* ------------------------------------------------------------------------ */
  /*                                Mutations                                 */
  /* ------------------------------------------------------------------------ */

  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      representativesApi.deactivateRepresentative(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['representatives'],
      });

      deputyCredentialStorage.clear();
      setPendingCredential(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (
      data: Parameters<
        typeof representativesApi.createRepresentative
      >[0]
    ) => representativesApi.createRepresentative(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['representatives'],
      });
    },
  });

  const isProcessing =
    deactivateMutation.isPending || createMutation.isPending;

  /* ------------------------------------------------------------------------ */
  /*                            Generate Credentials                         */
  /* ------------------------------------------------------------------------ */

  const regenerateUsername = () => {
    try {
      setGeneratedUsername(
        generateRandomUsername(
          reps.map((representative) => representative.username)
        )
      );
    } catch {
      toast.show(
        'تعذر توليد اسم مستخدم جديد',
        'danger'
      );
    }
  };

  const regeneratePassword = () => {
    setGeneratedPassword(generateSecureDeputyPassword());
    setShowPasswordInForm(false);
  };

  /* ------------------------------------------------------------------------ */
  /*                            Open Assign Modal                             */
  /* ------------------------------------------------------------------------ */

  const handleOpenAssignModal = () => {
    if (!hasClassRepresentative) {
      toast.show(
        'لا يمكن تعيين نائب قبل وجود عريف نشط للشعبة',
        'danger'
      );
      return;
    }

    if (availableStudents.length === 0) {
      toast.show(
        'لا يوجد طلاب متاحون للتعيين في هذه الشعبة',
        'warning'
      );
      return;
    }

    setSelectedStudentId(0);
    regeneratePassword();
    regenerateUsername();

    setIsAssignModalOpen(true);
  };

  /* ------------------------------------------------------------------------ */
  /*                           Assign / Change Deputy                        */
  /* ------------------------------------------------------------------------ */

  const handleChangeDeputy = async () => {
    if (!hasClassRepresentative) {
      toast.show(
        'لا يمكن تعيين نائب لعدم وجود عريف نشط لهذه الشعبة',
        'danger'
      );
      return;
    }

    if (!selectedStudentId || !selectedStudent) {
      toast.show('يرجى اختيار الطالب أولاً', 'warning');
      return;
    }

    if (!classEnrollmentIds.has(selectedStudentId)) {
      toast.show(
        'الطالب المحدد لا ينتمي إلى هذه الشعبة',
        'danger'
      );
      return;
    }

    if (selectedStudent.isRepresentative) {
      toast.show(
        'لا يمكن تعيين عريف الشعبة نائباً لنفسه',
        'danger'
      );
      return;
    }

    if (availableStudents.every(
      (student) => student.enrollmentId !== selectedStudentId
    )) {
      toast.show(
        'هذا الطالب غير متاح للتعيين',
        'danger'
      );
      return;
    }

    try {
      // Recheck username uniqueness against all loaded accounts.
      const existingUsernames = reps.map(
        (representative) => representative.username
      );

      const assignedUsername = existingUsernames.some(
        (username) =>
          username.toLowerCase() === generatedUsername.toLowerCase()
      )
        ? generateRandomUsername(existingUsernames)
        : generatedUsername;

      setGeneratedUsername(assignedUsername);

      // Deactivate the previous deputy before replacing the account.
      if (deputy) {
        await deactivateMutation.mutateAsync(
          deputy.representativeId
        );
      }

      // Create the new deputy account.
      await createMutation.mutateAsync({
        enrollmentId: selectedStudentId,
        username: assignedUsername,
        password: generatedPassword,
        role: 'Deputy',
        isActive: true,
        phoneNumber: '0000000000',
        mustChangePassword: true,
      });

      // Store the new credentials for later recovery in this browser.
      const savedCredential = deputyCredentialStorage.save(
        classId,
        selectedStudent.studentName || 'طالب الشعبة',
        assignedUsername,
        generatedPassword
      );

      setPendingCredential(savedCredential);

      await queryClient.invalidateQueries({
        queryKey: ['representatives'],
      });

      setIsAssignModalOpen(false);
      setShowPasswordInCredentials(false);
      setIsCredentialsModalOpen(true);

      toast.show(
        'تم تعيين النائب بنجاح وتوليد بيانات الدخول',
        'success'
      );
    } catch (error: any) {
      console.error('Deputy assignment failed:', error);

      const message =
        typeof error?.response?.data === 'string'
          ? error.response.data
          : error?.response?.data?.message ||
            'حدث خطأ أثناء تعيين النائب، يرجى المحاولة مرة أخرى';

      toast.show(message, 'danger');
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                              Remove Deputy                               */
  /* ------------------------------------------------------------------------ */

  const handleRemoveDeputy = async () => {
    if (!deputy) return;

    try {
      await deactivateMutation.mutateAsync(
        deputy.representativeId
      );

      await queryClient.invalidateQueries({
        queryKey: ['representatives'],
      });

      setIsRemoveModalOpen(false);

      toast.show(
        'تم إعفاء النائب من منصبه وسحب صلاحياته بنجاح',
        'success'
      );
    } catch (error) {
      console.error('Deputy removal failed:', error);

      toast.show(
        'حدث خطأ أثناء إعفاء النائب، يرجى المحاولة مرة أخرى',
        'danger'
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                             Copy Credentials                            */
  /* ------------------------------------------------------------------------ */

  const copyToClipboard = async (
    text: string,
    type: 'username' | 'password' | 'all'
  ) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedField(type);

      toast.show(
        type === 'username'
          ? 'تم نسخ اسم المستخدم'
          : type === 'password'
            ? 'تم نسخ كلمة المرور'
            : 'تم نسخ بيانات الدخول كاملة',
        'success'
      );

      window.setTimeout(() => {
        setCopiedField(null);
      }, 2500);
    } catch {
      toast.show(
        'تعذر النسخ تلقائياً، يرجى النسخ يدوياً',
        'danger'
      );
    }
  };

  const copyAllCredentials = () => {
    if (!pendingCredential) return;

    const message =
      `بيانات الدخول إلى منصة مواظب:\n` +
      `الطالب: ${pendingCredential.deputyName}\n` +
      `الصفة: نائب العريف\n` +
      `اسم المستخدم: ${pendingCredential.username}\n` +
      `كلمة المرور المؤقتة: ${pendingCredential.password}\n\n` +
      `يرجى تغيير كلمة المرور عند أول تسجيل دخول.`+
      'رابط المنصة https://mowathib.mohmedisa630.workers.dev/representative/login';

    void copyToClipboard(message, 'all');
  };

  /* ------------------------------------------------------------------------ */
  /*                             Dialog Handlers                             */
  /* ------------------------------------------------------------------------ */

  const closeAssignModal = () => {
    if (isProcessing) return;
    setIsAssignModalOpen(false);
  };

  const closeCredentialsModal = () => {
    setIsCredentialsModalOpen(false);
    setShowPasswordInCredentials(false);
    setCopiedField(null);
  };

  const closeRemoveModal = () => {
    if (deactivateMutation.isPending) return;
    setIsRemoveModalOpen(false);
  };

  /* ------------------------------------------------------------------------ */
  /*                              Loading State                              */
  /* ------------------------------------------------------------------------ */

  if (isLoadingPage) {
    return (
      <div className={`${SURFACE} p-10`}>
        <MuwathibLoading message="جاري تحميل بيانات نائب العريف..." />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*                              Access Control                             */
  /* ------------------------------------------------------------------------ */

  if (user?.role !== 'Representative') {
    return (
      <div className={`${SURFACE} p-8 text-center sm:p-12`}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FDECEC] text-[#A61B1B] dark:bg-[#351E1E] dark:text-[#F0AAAA]">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h2 className="text-base font-bold text-[#17252B] dark:text-[#F4F8F6]">
          صلاحية إدارة نائب العريف
        </h2>

        <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#71827A] dark:text-[#A3C7B9]">
          هذه الخاصية متاحة لعريف الشعبة الأساسي فقط.
          لا يملك نائب العريف صلاحية تعيين نائب آخر أو إدارة هذا الحساب.
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*                              Error States                               */
  /* ------------------------------------------------------------------------ */

  if (classId <= 0) {
    return (
      <div className={`${SURFACE} p-8 text-center`}>
        <AlertCircle className="mx-auto h-7 w-7 text-[#B7791F] dark:text-[#E9C978]" />

        <h2 className="mt-3 text-sm font-bold text-[#17252B] dark:text-[#F4F8F6]">
          الحساب غير مرتبط بشعبة
        </h2>

        <p className={`mt-2 text-xs ${MUTED}`}>
          تعذر تحديد الشعبة المرتبطة بحسابك. يرجى التواصل مع إدارة المدرسة.
        </p>
      </div>
    );
  }

  if (hasLoadingError) {
    return (
      <div className={`${SURFACE} p-8 text-center`}>
        <AlertCircle className="mx-auto h-7 w-7 text-[#A61B1B] dark:text-[#F0AAAA]" />

        <h2 className="mt-3 text-sm font-bold text-[#17252B] dark:text-[#F4F8F6]">
          تعذر تحميل بيانات الشعبة
        </h2>

        <p className={`mt-2 text-xs ${MUTED}`}>
          حدثت مشكلة أثناء استرجاع بيانات العرفاء والطلاب.
          يرجى تحديث الصفحة والمحاولة مرة أخرى.
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*                                   Render                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-5 text-right" dir="rtl">

      {/* ================================================================== */}
      {/*                              Page Header                           */}
      {/* ================================================================== */}

      <section className={`${SURFACE} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F5F0] text-[#0B5D43] dark:bg-[#164736] dark:text-[#75D39B]">
              <UserCheck className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-lg font-extrabold text-[#17252B] dark:text-[#F4F8F6]">
                نائب عريف الصف
              </h1>

              <p className={`mt-1 text-xs ${MUTED}`}>
                تعيين النائب وإدارة بيانات حسابه وصلاحياته.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#E1EAE5] bg-[#F5F8F6] px-3 py-2 dark:border-[#1E4638] dark:bg-[#0D211A]">
            <Building2 className="h-4 w-4 text-[#0B5D43] dark:text-[#75D39B]" />

            <span className="text-xs font-bold text-[#355B48] dark:text-[#B4DEC6]">
              الشعبة {user?.classNumber || classId}
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*                       Class Representative Check                   */}
      {/* ================================================================== */}

      {!hasClassRepresentative ? (
        <section className={`${SURFACE} p-8 text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF7DF] text-[#855500] dark:bg-[#342B18] dark:text-[#E9C978]">
            <AlertCircle className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-sm font-bold text-[#17252B] dark:text-[#F4F8F6]">
            لا يوجد عريف نشط لهذه الشعبة
          </h2>

          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#71827A] dark:text-[#A3C7B9]">
            يجب وجود عريف أساسي نشط قبل إمكانية تعيين نائب له.
            يرجى مراجعة إدارة المدرسة.
          </p>
        </section>
      ) : deputy ? (

        /* ================================================================ */
        /*                         Active Deputy                            */
        /* ================================================================ */

        <section className={`${SURFACE} overflow-hidden`}>

          {/* Card Header */}
          <div className="flex flex-col gap-3 border-b border-[#E7EEEA] p-4 dark:border-[#1E4638] sm:flex-row sm:items-center sm:justify-between sm:p-5">

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F5F0] text-[#0B5D43] dark:bg-[#164736] dark:text-[#75D39B]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-[#17252B] dark:text-[#F4F8F6]">
                  النائب المعتمد
                </h2>

                <p className={`mt-0.5 text-[11px] ${MUTED}`}>
                  بيانات الحساب المسجلة لهذه الشعبة.
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#B7DEC5] bg-[#E8F5F0] px-2.5 py-1 text-[11px] font-bold text-[#176B3A] dark:border-[#285344] dark:bg-[#164736] dark:text-[#8DDFAC]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2E9962]" />
              نشط
            </span>
          </div>

          {/* Deputy Details */}
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">

            <div className={`${INNER} p-4`}>
              <p className={`text-[11px] ${MUTED}`}>
                اسم الطالب
              </p>

              <p className="mt-2 text-sm font-bold text-[#17252B] dark:text-[#F4F8F6]">
                {deputy.studentName || 'طالب الشعبة'}
              </p>
            </div>

            <div className={`${INNER} p-4`}>
              <p className={`text-[11px] ${MUTED}`}>
                اسم المستخدم
              </p>

              <p
                dir="ltr"
                className="mt-2 text-sm font-bold font-mono text-[#0B5D43] dark:text-[#75D39B] text-right"
              >
                {deputy.username}
              </p>
            </div>
          </div>

          {/* Saved Credentials Recovery */}
          {pendingCredential && (
            <div className="mx-4 mb-4 flex flex-col gap-3 rounded-xl border border-[#DCE6E1] bg-[#F5F8F6] p-3 dark:border-[#1E4638] dark:bg-[#0D211A] sm:mx-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-2.5">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#0B5D43] dark:text-[#75D39B]" />

                <div>
                  <p className="text-xs font-bold text-[#17252B] dark:text-[#F4F8F6]">
                    بيانات الدخول المؤقتة محفوظة
                  </p>

                  <p className={`mt-1 text-[11px] leading-5 ${MUTED}`}>
                    يمكنك استعادتها ونسخها من هذا المتصفح.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordInCredentials(false);
                    setIsCredentialsModalOpen(true);
                  }}
                  className="text-xs font-bold text-[#0B5D43] hover:underline dark:text-[#75D39B]"
                >
                  عرض بيانات الدخول
                </button>

                <button
                  type="button"
                  onClick={() => {
                    deputyCredentialStorage.clear();
                    setPendingCredential(null);

                    toast.show(
                      'تم حذف بيانات الدخول المحفوظة من هذا المتصفح',
                      'info'
                    );
                  }}
                  className="rounded-lg p-1.5 text-[#71827A] transition hover:bg-[#E5ECE7] hover:text-[#A61B1B] dark:text-[#A3C7B9] dark:hover:bg-[#183A2E] dark:hover:text-[#F0AAAA]"
                  title="حذف بيانات الدخول المحفوظة"
                  aria-label="حذف بيانات الدخول المحفوظة"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={`flex flex-col gap-2 border-t p-4 dark:border-[#1E4638] sm:flex-row sm:justify-end sm:p-5 ${DIVIDER}`}>

            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={<UserPlus className="h-4 w-4" />}
              onClick={handleOpenAssignModal}
              disabled={availableStudents.length === 0}
              className="font-bold"
            >
              تغيير النائب
            </Button>

            <button
              type="button"
              onClick={() => setIsRemoveModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E8B9B9] bg-[#FDF0F0] px-4 text-xs font-bold text-[#A62D2D] transition hover:bg-[#F9E0E0] disabled:opacity-50 dark:border-[#713B3B] dark:bg-[#351E1E] dark:text-[#F0AAAA] dark:hover:bg-[#462626]"
            >
              <UserX className="h-4 w-4" />
              إعفاء النائب
            </button>
          </div>
        </section>

      ) : (

        /* ================================================================ */
        /*                           Empty State                            */
        /* ================================================================ */

        <section className={`${SURFACE} border-dashed p-8 text-center sm:p-12`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F5F0] text-[#0B5D43] dark:bg-[#164736] dark:text-[#75D39B]">
            <UserPlus className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-base font-bold text-[#17252B] dark:text-[#F4F8F6]">
            لم يتم تعيين نائب للشعبة
          </h2>

          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#71827A] dark:text-[#A3C7B9]">
            يمكنك اختيار أحد طلاب الشعبة ليكون نائباً لك،
            ومنحه حساباً مستقلاً للمساعدة في أعمال رصد الحضور.
          </p>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={handleOpenAssignModal}
            disabled={availableStudents.length === 0}
            className="mt-5 font-bold"
          >
            تعيين نائب جديد
          </Button>

          {availableStudents.length === 0 && (
            <p className="mt-3 text-[11px] text-[#855500] dark:text-[#E9C978]">
              لا يوجد طلاب متاحون للتعيين في هذه الشعبة.
            </p>
          )}
        </section>
      )}

      {/* ================================================================== */}
      {/*                        Assign Deputy Dialog                       */}
      {/* ================================================================== */}

      <Dialog
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        title={deputy ? 'تغيير نائب العريف' : 'تعيين نائب جديد'}
        description={
          deputy
            ? 'اختر طالباً بديلاً، وسيتم إنشاء بيانات دخول جديدة له.'
            : 'اختر طالباً من الشعبة لإنشاء حساب نائب العريف.'
        }
      >
        <div className="space-y-5">

          {/* Student Selection */}
          <div>
            <label
              htmlFor="deputy-student"
              className="mb-2 block text-xs font-bold text-[#355B48] dark:text-[#B4DEC6]"
            >
              الطالب المراد تعيينه
            </label>

            <select
              id="deputy-student"
              value={selectedStudentId}
              onChange={(e) =>
                setSelectedStudentId(Number(e.target.value))
              }
              className={FIELD}
              disabled={isProcessing || availableStudents.length === 0}
            >
              <option value={0}>
                اختر الطالب...
              </option>

              {availableStudents.map((enrollment) => {
                const nationalId =
                  enrollment.student?.nationalId ||
                  (enrollment as any).nationalId;

                return (
                  <option
                    key={enrollment.enrollmentId}
                    value={enrollment.enrollmentId}
                  >
                    {enrollment.studentName}
                    {nationalId ? ` (${nationalId})` : ''}
                  </option>
                );
              })}
            </select>

            {selectedStudent && (
              <p className="mt-2 text-[11px] text-[#176B3A] dark:text-[#8DDFAC]">
                تم اختيار: {selectedStudent.studentName}
              </p>
            )}
          </div>

          {/* Username */}
          <div className={`${INNER} space-y-2.5 p-3.5`}>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#17252B] dark:text-[#F4F8F6]">
                اسم المستخدم
              </label>

              <button
                type="button"
                onClick={regenerateUsername}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0B5D43] transition hover:text-[#084733] disabled:opacity-50 dark:text-[#75D39B] dark:hover:text-[#A3E7BB]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                توليد آخر
              </button>
            </div>

            <div className="flex min-h-11 items-center justify-between rounded-lg border border-[#DCE6E1] bg-white px-3 dark:border-[#285344] dark:bg-[#122B23]">
              <code
                dir="ltr"
                className="text-sm font-bold tracking-wider text-[#0B5D43] dark:text-[#75D39B]"
              >
                {generatedUsername}
              </code>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(generatedUsername, 'username')
                }
                className="rounded-lg p-2 text-[#71827A] transition hover:bg-[#F0F5F1] dark:text-[#A3C7B9] dark:hover:bg-[#183A2E]"
                title="نسخ اسم المستخدم"
                aria-label="نسخ اسم المستخدم"
              >
                {copiedField === 'username' ? (
                  <Check className="h-4 w-4 text-[#2E9962]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="text-[11px] leading-5 text-[#71827A] dark:text-[#A3C7B9]">
              اسم عشوائي مستقل عن رقم الشعبة أو نوع الحساب.
            </p>
          </div>

          {/* Password */}
          <div className={`${INNER} space-y-2.5 p-3.5`}>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#17252B] dark:text-[#F4F8F6]">
                كلمة المرور المؤقتة
              </label>

              <button
                type="button"
                onClick={regeneratePassword}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0B5D43] transition hover:text-[#084733] disabled:opacity-50 dark:text-[#75D39B] dark:hover:text-[#A3E7BB]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                توليد أخرى
              </button>
            </div>

            <div className="flex min-h-11 items-center justify-between rounded-lg border border-[#DCE6E1] bg-white px-3 dark:border-[#285344] dark:bg-[#122B23]">
              <code
                dir="ltr"
                className="text-sm font-bold tracking-wider text-[#17252B] dark:text-[#F4F8F6]"
              >
                {showPasswordInForm
                  ? generatedPassword
                  : '••••••••••••'}
              </code>

              <button
                type="button"
                onClick={() =>
                  setShowPasswordInForm((value) => !value)
                }
                className="rounded-lg p-2 text-[#71827A] transition hover:bg-[#F0F5F1] dark:text-[#A3C7B9] dark:hover:bg-[#183A2E]"
                title={
                  showPasswordInForm
                    ? 'إخفاء كلمة المرور'
                    : 'إظهار كلمة المرور'
                }
                aria-label={
                  showPasswordInForm
                    ? 'إخفاء كلمة المرور'
                    : 'إظهار كلمة المرور'
                }
              >
                {showPasswordInForm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="text-[11px] leading-5 text-[#71827A] dark:text-[#A3C7B9]">
              سيُطلب من النائب تغيير كلمة المرور عند أول تسجيل دخول.
            </p>
          </div>

          {/* Help Note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-[#B7D9E8] bg-[#EDF7FC] p-3 dark:border-[#285168] dark:bg-[#142D39]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#25617C] dark:text-[#8BC6E2]" />

            <p className="text-[11px] leading-5 text-[#39677D] dark:text-[#A3CFDF]">
              بعد اعتماد التعيين ستظهر بيانات الدخول. احرص على نسخها
              وتسليمها للطالب بشكل آمن.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={closeAssignModal}
            disabled={isProcessing}
          >
            إلغاء
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleChangeDeputy}
            disabled={
              !selectedStudentId ||
              isProcessing ||
              !hasClassRepresentative
            }
            isLoading={isProcessing}
            className="font-bold"
          >
            {deputy ? 'تأكيد تغيير النائب' : 'تأكيد التعيين'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ================================================================== */}
      {/*                        Credentials Dialog                         */}
      {/* ================================================================== */}

      <Dialog
        isOpen={isCredentialsModalOpen}
        onClose={closeCredentialsModal}
        title="بيانات دخول نائب العريف"
        description="يمكنك نسخ بيانات الحساب وتسليمها للنائب بشكل آمن."
      >
        {pendingCredential ? (
          <div className="space-y-4">

            {/* Student Information */}
            <div className={`${INNER} space-y-3 p-4`}>
              <div>
                <p className={`text-[11px] ${MUTED}`}>
                  اسم الطالب
                </p>

                <p className="mt-1.5 text-sm font-bold text-[#17252B] dark:text-[#F4F8F6]">
                  {pendingCredential.deputyName}
                </p>
              </div>

              <div className={`border-t pt-3 ${DIVIDER}`}>
                <p className={`text-[11px] ${MUTED}`}>
                  الصفة
                </p>

                <p className="mt-1.5 text-xs font-bold text-[#0B5D43] dark:text-[#75D39B]">
                  نائب عريف الصف
                </p>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#355B48] dark:text-[#B4DEC6]">
                اسم المستخدم
              </label>

              <div className="flex min-h-11 items-center justify-between rounded-xl border border-[#DCE6E1] bg-white px-3 dark:border-[#285344] dark:bg-[#0D211A]">
                <code
                  dir="ltr"
                  className="text-sm font-bold text-[#0B5D43] dark:text-[#75D39B]"
                >
                  {pendingCredential.username}
                </code>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      pendingCredential.username,
                      'username'
                    )
                  }
                  className="rounded-lg p-2 text-[#71827A] hover:bg-[#F0F5F1] dark:text-[#A3C7B9] dark:hover:bg-[#183A2E]"
                  aria-label="نسخ اسم المستخدم"
                >
                  {copiedField === 'username' ? (
                    <Check className="h-4 w-4 text-[#2E9962]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#355B48] dark:text-[#B4DEC6]">
                  كلمة المرور المؤقتة
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setShowPasswordInCredentials((value) => !value)
                  }
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0B5D43] hover:underline dark:text-[#75D39B]"
                >
                  {showPasswordInCredentials ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      إخفاء
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      إظهار
                    </>
                  )}
                </button>
              </div>

              <div className="flex min-h-11 items-center justify-between rounded-xl border border-[#DCE6E1] bg-white px-3 dark:border-[#285344] dark:bg-[#0D211A]">
                <code
                  dir="ltr"
                  className="text-sm font-bold tracking-wider text-[#17252B] dark:text-[#F4F8F6]"
                >
                  {showPasswordInCredentials
                    ? pendingCredential.password
                    : '••••••••••••'}
                </code>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      pendingCredential.password,
                      'password'
                    )
                  }
                  className="rounded-lg p-2 text-[#71827A] hover:bg-[#F0F5F1] dark:text-[#A3C7B9] dark:hover:bg-[#183A2E]"
                  aria-label="نسخ كلمة المرور"
                >
                  {copiedField === 'password' ? (
                    <Check className="h-4 w-4 text-[#2E9962]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Copy All */}
            <button
              type="button"
              onClick={copyAllCredentials}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#B7DEC5] bg-[#E8F5F0] text-xs font-bold text-[#0B5D43] transition hover:bg-[#DCEFE4] dark:border-[#285344] dark:bg-[#164736] dark:text-[#A5E5BA] dark:hover:bg-[#1C513A]"
            >
              {copiedField === 'all' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}

              {copiedField === 'all'
                ? 'تم نسخ بيانات الدخول'
                : 'نسخ جميع بيانات الدخول'}
            </button>

            <p className="text-[11px] leading-5 text-[#71827A] dark:text-[#A3C7B9]">
              احرص على تسليم كلمة المرور بشكل آمن. سيتم طلب تغييرها
              عند أول تسجيل دخول.
            </p>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-[#71827A] dark:text-[#A3C7B9]">
            لا توجد بيانات دخول محفوظة.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="primary"
            onClick={closeCredentialsModal}
            className="font-bold"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ================================================================== */}
      {/*                        Remove Deputy Dialog                        */}
      {/* ================================================================== */}

      <Dialog
        isOpen={isRemoveModalOpen}
        onClose={closeRemoveModal}
        title="إعفاء نائب العريف"
        description="تأكيد سحب صلاحيات النائب وإيقاف حسابه."
      >
        <div className="space-y-4">

          <div className="rounded-xl border border-[#E8B9B9] bg-[#FDF0F0] p-4 dark:border-[#713B3B] dark:bg-[#351E1E]">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#A62D2D] dark:text-[#F0AAAA]" />

              <div>
                <p className="text-xs font-bold text-[#842323] dark:text-[#F0AAAA]">
                  تأكيد إعفاء الطالب
                </p>

                <p className="mt-1.5 text-xs leading-6 text-[#A13E3E] dark:text-[#E7B1B1]">
                  سيتم تعطيل حساب النائب{' '}
                  <span className="font-bold">
                    {deputy?.studentName}
                  </span>
                  {' '}وسحب صلاحياته. لن يتمكن من تسجيل الدخول بعد نجاح العملية.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs leading-6 text-[#71827A] dark:text-[#A3C7B9]">
            يمكن تعيين نائب جديد لاحقاً من نفس الصفحة.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={closeRemoveModal}
            disabled={deactivateMutation.isPending}
          >
            تراجع
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={handleRemoveDeputy}
            isLoading={deactivateMutation.isPending}
            disabled={deactivateMutation.isPending}
            className="font-bold"
          >
            تأكيد الإعفاء
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default RepresentativeDeputyPage;
