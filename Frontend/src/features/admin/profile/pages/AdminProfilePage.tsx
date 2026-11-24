
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth';
import { adminApi } from '../../../admin/api/adminApi';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';
import { useNotifications } from '../../../notifications';

import {
  UserRound,
  ShieldCheck,
  Building2,
  KeyRound,
  Save,
  Fingerprint,
  AtSign,
  LockKeyhole,
  Info,
  CheckCircle2,
  GraduationCap,
  School,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                  Styles                                    */
/* -------------------------------------------------------------------------- */

const SURFACE =
  'rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/70 dark:bg-slate-900';

const DIVIDER = 'border-slate-100 dark:border-slate-800';

/* -------------------------------------------------------------------------- */
/*                            Reusable Components                             */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
        {icon}
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function ProfileInfoItem({
  icon,
  label,
  value,
  dir,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
          {icon}
        </span>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>

      <div
        dir={dir}
        className="max-w-[60%] truncate text-left text-xs font-bold text-slate-800 dark:text-slate-100"
      >
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Main Component                               */
/* -------------------------------------------------------------------------- */

export function AdminProfilePage() {
  const { user, updateUserCredentials } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  /* ------------------------------------------------------------------------ */
  /*                                   State                                  */
  /* ------------------------------------------------------------------------ */

  const [adminName, setAdminName] = useState('');
  const [username, setUsername] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* ------------------------------------------------------------------------ */
  /*                              Fetch Profile                              */
  /* ------------------------------------------------------------------------ */

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin_profile', user?.id],

    queryFn: async () => {
      if (!user?.id) return null;

      return await adminApi.getAdminProfile(user.id);
    },

    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  /* ------------------------------------------------------------------------ */
  /*                         Synchronize Profile State                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (profile) {
      setAdminName(profile.adminName || user?.fullName || '');
      setUsername(profile.username || user?.username || '');
    } else if (user) {
      setAdminName(user.fullName || '');
      setUsername(user.username || '');
    }
  }, [profile, user]);

  /* ------------------------------------------------------------------------ */
  /*                              Derived State                              */
  /* ------------------------------------------------------------------------ */

  const originalAdminName =
    profile?.adminName || user?.fullName || '';

  const originalUsername =
    profile?.username || user?.username || '';

  const trimmedAdminName = adminName.trim();
  const trimmedUsername = username.trim();

  const passwordRequested =
    Boolean(newPassword.trim()) ||
    Boolean(confirmPassword.trim());

  const passwordsMismatch =
    passwordRequested &&
    newPassword.trim() !== confirmPassword.trim();

  const usernameChanged =
    trimmedUsername !== originalUsername.trim();

  const nameChanged =
    trimmedAdminName !== originalAdminName.trim();

  const hasChanges =
    nameChanged || usernameChanged || passwordRequested;

  /* ------------------------------------------------------------------------ */
  /*                              Update Mutation                            */
  /* ------------------------------------------------------------------------ */

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('معرف المستخدم غير متوفر');
      }

      if (!trimmedAdminName) {
        throw new Error('يرجى إدخال اسم المسؤول الكامل');
      }

      if (!trimmedUsername) {
        throw new Error('يرجى إدخال اسم المستخدم');
      }

      if (trimmedUsername.length < 3) {
        throw new Error('يجب ألا يقل اسم المستخدم عن 3 أحرف');
      }

      if (passwordRequested) {
        if (!currentPassword.trim()) {
          throw new Error(
            'يرجى إدخال كلمة المرور الحالية لتأكيد تغيير كلمة المرور'
          );
        }

        if (newPassword.trim().length < 6) {
          throw new Error(
            'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل'
          );
        }

        if (newPassword.trim() !== confirmPassword.trim()) {
          throw new Error(
            'كلمة المرور الجديدة وتأكيدها غير متطابقين'
          );
        }
      }

      if (!hasChanges) {
        throw new Error('لا توجد تغييرات جديدة لحفظها');
      }

      return await adminApi.updateAdminProfile(user.id, {
        adminName: trimmedAdminName,
        username: trimmedUsername,

        currentPassword: passwordRequested
          ? currentPassword.trim()
          : undefined,

        newPassword: passwordRequested
          ? newPassword.trim()
          : undefined,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin_profile', user?.id],
      });

      // Synchronize Auth Context.
      updateUserCredentials?.(
        trimmedUsername,
        trimmedAdminName
      );

      // Clear sensitive fields.
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast.show(
        passwordRequested
          ? 'تم تحديث بيانات الحساب وكلمة المرور بنجاح'
          : 'تم تحديث بيانات الملف الشخصي بنجاح',
        'success'
      );
    },

    onError: (err: any) => {
      const responseData = err?.response?.data;

      const message =
        typeof responseData === 'string'
          ? responseData
          : responseData?.message ||
            responseData?.title ||
            err?.message ||
            'فشل تحديث البيانات، يرجى التحقق من صحة المدخلات';

      toast.show(message, 'danger');
    },
  });

  /* ------------------------------------------------------------------------ */
  /*                               Form Handler                               */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  /* ------------------------------------------------------------------------ */
  /*                              Loading State                              */
  /* ------------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className={`${SURFACE} p-12`}>
        <MuwathibLoading message="جاري تحميل بيانات الملف الشخصي..." />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*                                   Render                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-right" dir="rtl">

      {/* ================================================================== */}
      {/*                            Page Header                             */}
      {/* ================================================================== */}

      <section className={`${SURFACE} relative overflow-hidden`}>
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm shadow-emerald-900/10 dark:bg-emerald-600">
              <UserRound className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  الملف الشخصي للمسؤول
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  إدارة المدرسة
                </span>
              </div>

              <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                إدارة بيانات المسؤول وتحديث معلومات الحساب وبيانات تسجيل الدخول.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />

            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                نوع الحساب
              </p>

              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                مسؤول المدرسة
              </p>
            </div>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-l from-emerald-700 via-emerald-500 to-emerald-100 dark:from-emerald-600 dark:via-emerald-700 dark:to-slate-800" />
      </section>

      {/* ================================================================== */}
      {/*                          Main Content                              */}
      {/* ================================================================== */}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">

        {/* ================================================================ */}
        {/*                     School & Account Information                 */}
        {/* ================================================================ */}

        <section className={`${SURFACE} overflow-hidden`}>

          <div className="p-5 sm:p-6">
            <SectionHeader
              icon={<Fingerprint className="h-5 w-5" />}
              title="معلومات الحساب"
              description="البيانات التعريفية للمسؤول والمدرسة المرتبطة بالحساب."
            />

            {/* Profile Identity */}
            <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm dark:bg-emerald-600">
                <UserRound className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                  {profile?.adminName ||
                    user?.fullName ||
                    'مسؤول المدرسة'}
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  المسؤول المعتمد لإدارة بيانات المدرسة.
                </p>

                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  حساب إداري
                </div>
              </div>
            </div>

            {/* School Identity */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400">
                  <School className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    المدرسة المقترنة بالحساب
                  </p>

                  <h3 className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                    {profile?.schoolName ||
                      user?.schoolName ||
                      'مدرسة مواظب'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Information */}
            <div className="mt-5 space-y-2.5">
              <ProfileInfoItem
                icon={<UserRound className="h-4 w-4" />}
                label="اسم المسؤول"
                value={
                  profile?.adminName ||
                  user?.fullName ||
                  '—'
                }
              />

              <ProfileInfoItem
                icon={<AtSign className="h-4 w-4" />}
                label="اسم المستخدم"
                value={
                  profile?.username ||
                  user?.username ||
                  '—'
                }
                dir="ltr"
              />

              <ProfileInfoItem
                icon={<Building2 className="h-4 w-4" />}
                label="المدرسة"
                value={
                  profile?.schoolName ||
                  user?.schoolName ||
                  'مدرسة مواظب'
                }
              />

              <ProfileInfoItem
                icon={<GraduationCap className="h-4 w-4" />}
                label="الصلاحية"
                value="مسؤول المدرسة"
              />
            </div>

            {/* Fetch Error Notice */}
            {isError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />

                <p className="leading-5">
                  تعذر تحميل بعض بيانات الملف الشخصي من الخادم.
                  يتم عرض البيانات المتاحة من جلسة تسجيل الدخول.
                </p>
              </div>
            )}
          </div>

          {/* Administrative Notice */}
          <div className={`border-t p-5 dark:border-slate-800 sm:p-6 ${DIVIDER}`}>
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5 dark:border-sky-900/60 dark:bg-sky-950/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                <Info className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  معلومات إدارية
                </h3>

                <p className="mt-1 text-xs leading-6 text-sky-800/80 dark:text-sky-300/80">
                  تعديل اسم المسؤول واسم المستخدم لا يؤثر على ارتباط
                  الحساب بالمدرسة أو صلاحيات إدارة النظام.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/*                       Account Settings                           */}
        {/* ================================================================ */}

        <section className={`${SURFACE} overflow-hidden`}>

          <form onSubmit={handleSubmit}>

            <div className="p-5 sm:p-6">

              <SectionHeader
                icon={<KeyRound className="h-5 w-5" />}
                title="إعدادات الحساب"
                description="تعديل الاسم واسم المستخدم وإدارة كلمة المرور."
              />

              {/* Basic Information */}
              <div className="mt-6 space-y-4">

                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <UserRound className="h-4 w-4" />
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    البيانات الأساسية
                  </h3>
                </div>

                {/* Admin Name */}
                <div>
                  <Input
                    label="اسم المسؤول الكامل"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="مثال: الأستاذ أحمد المنصور"
                    className="font-semibold"
                    required
                  />

                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    يظهر هذا الاسم في ترويسة لوحة التحكم والتقارير.
                  </p>
                </div>

                {/* Username */}
                <div>
                  <Input
                    label="اسم المستخدم (Username)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    dir="ltr"
                    className="text-left font-mono font-semibold"
                    required
                  />

                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    الاسم المستخدم لتسجيل الدخول إلى النظام.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className={`my-6 border-t ${DIVIDER}`} />

              {/* Password Section */}
              <div className="space-y-4">

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <LockKeyhole className="h-4 w-4" />
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        تغيير كلمة المرور
                      </h3>

                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        إجراء اختياري
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    اختياري
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                  <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    اترك حقول كلمة المرور فارغة للاحتفاظ بكلمة المرور الحالية.
                    عند تغييرها ستحتاج إلى تأكيد كلمة المرور الحالية.
                  </p>
                </div>

                {/* Current Password */}
                <Input
                  type="password"
                  label={
                    passwordRequested
                      ? 'كلمة المرور الحالية (مطلوبة)'
                      : 'كلمة المرور الحالية'
                  }
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  dir="ltr"
                  className="text-left font-mono"
                  autoComplete="current-password"
                />

                {/* New Password */}
                <Input
                  type="password"
                  label="كلمة المرور الجديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  dir="ltr"
                  className="text-left font-mono"
                  autoComplete="new-password"
                />

                {/* Confirm Password */}
                <Input
                  type="password"
                  label="تأكيد كلمة المرور الجديدة"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  dir="ltr"
                  className="text-left font-mono"
                  autoComplete="new-password"
                />

                {/* Password Validation */}
                {passwordRequested && (
                  <div
                    className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                      passwordsMismatch
                        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
                        : !newPassword.trim() ||
                            !confirmPassword.trim() ||
                            newPassword.trim().length < 6
                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                    }`}
                  >
                    {passwordsMismatch ? (
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    )}

                    <span className="leading-5">
                      {passwordsMismatch
                        ? 'كلمتا المرور غير متطابقتين.'
                        : !newPassword.trim() ||
                            !confirmPassword.trim()
                          ? 'يرجى إكمال حقلي كلمة المرور الجديدة والتأكيد.'
                          : newPassword.trim().length < 6
                            ? 'يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف.'
                            : 'كلمتا المرور متطابقتان.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/*                           Form Footer                       */}
            {/* ============================================================ */}

            <div className="border-t border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                  <span>
                    {hasChanges
                      ? 'توجد تغييرات غير محفوظة.'
                      : 'بيانات الحساب محدثة.'}
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    updateMutation.isPending ||
                    !trimmedAdminName ||
                    !trimmedUsername ||
                    trimmedUsername.length < 3 ||
                    !hasChanges ||
                    (passwordRequested &&
                      (
                        !currentPassword.trim() ||
                        !newPassword.trim() ||
                        !confirmPassword.trim() ||
                        newPassword.trim().length < 6 ||
                        passwordsMismatch
                      ))
                  }
                  isLoading={updateMutation.isPending}
                  icon={<Save className="h-4 w-4" />}
                  className="w-full justify-center font-bold sm:w-auto"
                >
                  حفظ التعديلات
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AdminProfilePage;
