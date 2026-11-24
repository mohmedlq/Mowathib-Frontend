
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { useAuth } from '../../../auth';
import { attendanceClerksApi } from '../../../attendance-clerks/api/attendanceClerksApi';
import { useNotifications } from '../../../notifications';

import {
  UserRound,
  KeyRound,
  ShieldCheck,
  Building2,
  GraduationCap,
  Save,
  LockKeyhole,
  AtSign,
  CheckCircle2,
  Info,
  Fingerprint,
  ShieldCheckIcon,
} from 'lucide-react';

import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';

/* -------------------------------------------------------------------------- */
/*                                  Styles                                    */
/* -------------------------------------------------------------------------- */

const SURFACE =
  'rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/70 dark:bg-slate-900';

const DIVIDER = 'border-slate-100 dark:border-slate-800';

/* -------------------------------------------------------------------------- */
/*                              Reusable Components                           */
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

export function ClerkProfilePage() {
  const { user, updateUserCredentials } = useAuth();
  const { toast } = useNotifications();

  /* ------------------------------------------------------------------------ */
  /*                                   State                                  */
  /* ------------------------------------------------------------------------ */

  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------------------------------------------------ */
  /*                              Derived State                              */
  /* ------------------------------------------------------------------------ */

  const currentUsername = user?.username || '';

  const trimmedUsername = username.trim();

  const usernameChanged = trimmedUsername !== currentUsername;

  const passwordChanged =
    newPassword.length > 0 || confirmPassword.length > 0;

  const hasChanges = usernameChanged || passwordChanged;

  const passwordsMismatch =
    Boolean(newPassword || confirmPassword) &&
    newPassword !== confirmPassword;

  /* ------------------------------------------------------------------------ */
  /*                         Sync Username With Auth                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setUsername(user?.username || '');
  }, [user?.username]);

  /* ------------------------------------------------------------------------ */
  /*                               Form Submit                                */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!trimmedUsername) {
      toast.show('اسم المستخدم مطلوب', 'danger');
      return;
    }

    if (!user?.id) {
      toast.show('تعذر تحديد معرف الحساب الحالي', 'danger');
      return;
    }

    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    // Password validation is only required when changing it.
    if (passwordChanged) {
      if (trimmedPassword.length < 6) {
        toast.show(
          'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف',
          'danger'
        );
        return;
      }

      if (trimmedPassword !== trimmedConfirm) {
        toast.show('كلمتا المرور غير متطابقتين', 'danger');
        return;
      }
    }

    if (!hasChanges) {
      toast.show('لا توجد تغييرات جديدة لحفظها', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await attendanceClerksApi.updateAttendanceClerk(
        user.id,
        {
          username: trimmedUsername,
          password: trimmedPassword || undefined,
        },
        user.schoolCode
      );

      const updatedUsername = updated?.username || trimmedUsername;

      // Synchronize the authenticated user context.
      updateUserCredentials?.(updatedUsername);

      // Keep the form synchronized with the server response.
      setUsername(updatedUsername);

      // Clear sensitive fields after successful update.
      setNewPassword('');
      setConfirmPassword('');

      toast.show(
        passwordChanged
          ? 'تم تحديث بيانات الدخول وكلمة المرور بنجاح'
          : 'تم تحديث اسم المستخدم بنجاح',
        'success'
      );
    } catch (err: any) {
      const responseData = err?.response?.data;

      const message =
        typeof responseData === 'string'
          ? responseData
          : responseData?.message ||
            responseData?.title ||
            err?.message ||
            'فشل تحديث بيانات الحساب، يرجى المحاولة مرة أخرى';

      toast.show(message, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                                   Render                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6 text-right" dir="rtl">

      {/* ================================================================== */}
      {/*                           Page Header                              */}
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
                  الملف الشخصي
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  حساب مسجّل الحضور
                </span>
              </div>

              <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                إدارة معلومات حسابك وتحديث بيانات تسجيل الدخول الخاصة بك.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />

            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                نوع الحساب
              </p>

              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                مسجّل حضور مدرسي
              </p>
            </div>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-l from-emerald-700 via-emerald-500 to-emerald-100 dark:from-emerald-600 dark:via-emerald-700 dark:to-slate-800" />
      </section>

      {/* ================================================================== */}
      {/*                         Main Content                               */}
      {/* ================================================================== */}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">

        {/* ================================================================ */}
        {/*                     Account Information                         */}
        {/* ================================================================ */}

        <section className={`${SURFACE} overflow-hidden`}>

          {/* Profile Identity */}
          <div className="p-5 sm:p-6">
            <SectionHeader
              icon={<Fingerprint className="h-5 w-5" />}
              title="معلومات الحساب"
              description="بياناتك التعريفية ونطاق الصلاحيات المعتمد في المدرسة."
            />

            <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm dark:bg-emerald-600">
                <UserRound className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                  {user?.fullName || user?.username || 'مسجّل الحضور'}
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  الحساب المسؤول عن عمليات رصد الحضور.
                </p>

                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  مسجّل في منصة مواظب
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-5 space-y-2.5">
              <ProfileInfoItem
                icon={<UserRound className="h-4 w-4" />}
                label="اسم الطالب"
                value={user?.fullName || '—'}
              />

              <ProfileInfoItem
                icon={<AtSign className="h-4 w-4" />}
                label="اسم المستخدم الحالي"
                value={user?.username || '—'}
                dir="ltr"
              />

              <ProfileInfoItem
                icon={<Building2 className="h-4 w-4" />}
                label="المدرسة"
                value={user?.schoolName || 'مدرسة مواظب'}
              />

              <ProfileInfoItem
                icon={<GraduationCap className="h-4 w-4" />}
                label="الصفة الرسمية"
                value="مسجّل حضور مدرسي"
              />

              <ProfileInfoItem
                icon={<ShieldCheck className="h-4 w-4" />}
                label="نطاق الصلاحية"
                value={user?.access || 'جميع الشعب'}
              />
            </div>
          </div>

          {/* Permission Notice */}
          <div className={`border-t p-5 dark:border-slate-800 sm:p-6 ${DIVIDER}`}>
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5 dark:border-sky-900/60 dark:bg-sky-950/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                <Info className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  حول صلاحيات حسابك
                </h3>

                <p className="mt-1 text-xs leading-6 text-sky-800/80 dark:text-sky-300/80">
                  يتم تحديد صلاحيات رصد الحضور من قبل إدارة المدرسة.
                  تعديل اسم المستخدم أو كلمة المرور لا يغيّر نطاق صلاحياتك.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/*                     Account Settings                             */}
        {/* ================================================================ */}

        <section className={`${SURFACE} overflow-hidden`}>

          <form onSubmit={handleSubmit}>

            {/* Form Header */}
            <div className="p-5 sm:p-6">
              <SectionHeader
                icon={<KeyRound className="h-5 w-5" />}
                title="إعدادات تسجيل الدخول"
                description="حدّث اسم المستخدم أو غيّر كلمة المرور الخاصة بحسابك."
              />

              {/* Username Section */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <AtSign className="h-4 w-4" />
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      اسم المستخدم
                    </h3>
                  </div>

                  {usernameChanged && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      تم تعديله
                    </span>
                  )}
                </div>

                <Input
                  label="اسم المستخدم الجديد"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  dir="ltr"
                  className="text-left font-mono font-semibold"
                  required
                />

                <p className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  سيُستخدم اسم المستخدم الجديد عند تسجيل الدخول القادم.
                </p>
              </div>

              {/* Divider */}
              <div className={`my-6 border-t ${DIVIDER}`} />

              {/* Password Section */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
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

                <div className="space-y-3">
                  <Input
                    type="password"
                    label="كلمة المرور الجديدة"
                    placeholder="أدخل كلمة المرور الجديدة"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    dir="ltr"
                    className="text-left font-mono"
                    autoComplete="new-password"
                  />

                  <Input
                    type="password"
                    label="تأكيد كلمة المرور الجديدة"
                    placeholder="أعد إدخال كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    dir="ltr"
                    className="text-left font-mono"
                    autoComplete="new-password"
                  />
                </div>

                {/* Password Validation */}
                {passwordChanged && (
                  <div
                    className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                      passwordsMismatch
                        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
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
                        ? 'كلمتا المرور غير متطابقتين. يرجى التأكد من إدخال نفس كلمة المرور في الحقلين.'
                        : newPassword.trim().length < 6
                          ? 'يجب ألا تقل كلمة المرور عن 6 أحرف.'
                          : 'كلمتا المرور متطابقتان.'}
                    </span>
                  </div>
                )}

                {!passwordChanged && (
                  <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      اترك الحقلين فارغين للاحتفاظ بكلمة المرور الحالية.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Footer */}
            <div className="border-t border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                  <span>
                    {hasChanges
                      ? 'لديك تغييرات غير محفوظة.'
                      : 'بيانات الدخول محدثة.'}
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center font-bold sm:w-auto"
                  isLoading={isSubmitting}
                  disabled={
                    isSubmitting ||
                    !trimmedUsername ||
                    !hasChanges ||
                    passwordsMismatch ||
                    (passwordChanged && newPassword.trim().length < 6)
                  }
                  icon={<Save className="h-4 w-4" />}
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

export default ClerkProfilePage;
