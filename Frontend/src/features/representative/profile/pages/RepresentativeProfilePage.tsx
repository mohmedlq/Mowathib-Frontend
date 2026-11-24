import { useState, type FormEvent } from 'react';
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../../../auth';
import { Button } from '../../../../shared/components/ui/Button';
import { useNotifications } from '../../../notifications';

export function RepresentativeProfilePage() {
  const { user, changePassword } = useAuth();
  const { toast } = useNotifications();

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const isMainRep = user?.role === 'Representative';
  const displayName = user?.fullName || user?.username || 'عريف الشعبة';
  const roleLabel = isMainRep ? 'العريف الأساسي' : 'نائب العريف';
  const classLabel =
    user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'غير محدد');
  const avatarInitial = displayName.trim().charAt(0) || 'ع';

  const hasMinLength = newPass.length >= 6;
  const passwordsMatch = confirmPass.length > 0 && newPass === confirmPass;
  const canSubmit = hasMinLength && passwordsMatch && !isChanging;

  const handleSubmitPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!hasMinLength) {
      toast.show('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.', 'danger');
      return;
    }

    if (newPass !== confirmPass) {
      toast.show('كلمتا المرور غير متطابقتين.', 'danger');
      return;
    }

    setIsChanging(true);
    try {
      await changePassword(newPass);
      toast.show('تم تحديث كلمة المرور بنجاح.', 'success');
      setNewPass('');
      setConfirmPass('');
      setShowNewPass(false);
      setShowConfirmPass(false);
    } catch {
      toast.show('فشل تحديث كلمة المرور، يرجى المحاولة مرة أخرى.', 'danger');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-4xl min-w-0 space-y-5 pb-8 text-[#1E3429] transition-colors dark:text-[#EAF3ED]"
    >
      {/* 1. Compact Header */}
      <header className="border-b border-[#DCE7E2] pb-4 dark:border-[#263B31]">
        <h1 className="text-xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3] sm:text-2xl">
          الملف الشخصي
        </h1>
        <p className="mt-1 text-xs text-[#587268] dark:text-[#9DB5A8]">
          بيانات الحساب المعتمدة وتحديث كلمة المرور
        </p>
      </header>

      {/* 2. Content Grid */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Account Information */}
        <section
          aria-label="معلومات الحساب"
          className="overflow-hidden rounded-2xl border border-[#DCE7E2] bg-white shadow-xs transition-colors dark:border-[#293E35] dark:bg-[#17251F] lg:col-span-5"
        >
          {/* Identity Summary */}
          <div className="flex items-center gap-3.5 border-b border-[#E9EFEC] p-5 dark:border-[#263B31]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E8F3EC] text-lg font-black text-[#176B4B] dark:bg-[#1E3A2C] dark:text-[#8CD9AE]">
              {avatarInitial}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
                {displayName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-[#CFE2D8] bg-[#EDF6F1] px-2 py-0.5 text-[11px] font-bold text-[#176B4B] dark:border-[#2C4E3C] dark:bg-[#193226] dark:text-[#8CD9AE]">
                  <ShieldCheck className="h-3 w-3" />
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Structured Account Details */}
          <dl className="divide-y divide-[#EDF2EF] px-5 text-xs dark:divide-[#263B31]">
            <div className="flex items-center justify-between gap-3 py-3.5">
              <dt className="font-semibold text-[#587268] dark:text-[#9DB5A8]">
                اسم المستخدم
              </dt>
              <dd
                dir="ltr"
                className="rounded-lg border border-[#E4EDE8] bg-[#F6FAF7] px-2.5 py-1 font-mono text-xs font-bold text-[#142B22] dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#EAF3ED]"
              >
                {user?.username || '—'}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-3 py-3.5">
              <dt className="font-semibold text-[#587268] dark:text-[#9DB5A8]">
                الشعبة المسندة
              </dt>
              <dd className="inline-flex items-center gap-1.5 font-bold text-[#142B22] dark:text-[#F0F7F3]">
                <Building2 className="h-3.5 w-3.5 text-[#176B4B] dark:text-[#6DD39A]" />
                <span>{classLabel}</span>
              </dd>
            </div>

            <div className="flex items-center justify-between gap-3 py-3.5">
              <dt className="font-semibold text-[#587268] dark:text-[#9DB5A8]">
                حالة الصلاحية
              </dt>
              <dd className="inline-flex items-center gap-1.5 font-bold text-[#176B4B] dark:text-[#6DD39A]">
                <span className="h-2 w-2 rounded-full bg-[#176B4B] dark:bg-[#6DD39A]" />
                <span>مفعّل لرصد الحضور</span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Change Password Form */}
        <section
          aria-label="تغيير كلمة المرور"
          className="rounded-2xl border border-[#DCE7E2] bg-white p-5 shadow-xs transition-colors dark:border-[#293E35] dark:bg-[#17251F] lg:col-span-7"
        >
          <div className="flex items-center gap-2.5 border-b border-[#E9EFEC] pb-4 dark:border-[#263B31]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF6F1] text-[#176B4B] dark:bg-[#1B3428] dark:text-[#7AD4A2]">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-[#142B22] dark:text-[#F0F7F3]">
                تغيير كلمة المرور
              </h2>
              <p className="mt-0.5 text-[11px] text-[#587268] dark:text-[#9DB5A8]">
                اختر كلمة مرور جديدة لحماية حسابك
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitPassword} className="mt-4 space-y-4">
            {/* New Password */}
            <div>
              <label
                htmlFor="rep-new-password"
                className="mb-1.5 block text-xs font-bold text-[#1E3429] dark:text-[#E2F0E7]"
              >
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  id="rep-new-password"
                  type={showNewPass ? 'text' : 'password'}
                  dir="ltr"
                  autoComplete="new-password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-10 w-full rounded-xl border border-[#DCE7E2] bg-[#FAFCFA] pl-3 pr-10 text-left font-mono text-sm text-[#142B22] outline-none transition-colors placeholder:text-[#8FA398] focus:border-[#176B4B] focus:bg-white dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#F0F7F3] dark:placeholder:text-[#587268] dark:focus:border-[#4ADE80] dark:focus:bg-[#111D18]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass((v) => !v)}
                  aria-label={showNewPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#647C70] transition-colors hover:bg-black/5 hover:text-[#142B22] dark:text-[#9DB5A8] dark:hover:bg-white/10 dark:hover:text-[#F0F7F3]"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="rep-confirm-password"
                className="mb-1.5 block text-xs font-bold text-[#1E3429] dark:text-[#E2F0E7]"
              >
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  id="rep-confirm-password"
                  type={showConfirmPass ? 'text' : 'password'}
                  dir="ltr"
                  autoComplete="new-password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-10 w-full rounded-xl border border-[#DCE7E2] bg-[#FAFCFA] pl-3 pr-10 text-left font-mono text-sm text-[#142B22] outline-none transition-colors placeholder:text-[#8FA398] focus:border-[#176B4B] focus:bg-white dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#F0F7F3] dark:placeholder:text-[#587268] dark:focus:border-[#4ADE80] dark:focus:bg-[#111D18]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass((v) => !v)}
                  aria-label={showConfirmPass ? 'إخفاء تأكيد كلمة المرور' : 'إظهار تأكيد كلمة المرور'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#647C70] transition-colors hover:bg-black/5 hover:text-[#142B22] dark:text-[#9DB5A8] dark:hover:bg-white/10 dark:hover:text-[#F0F7F3]"
                >
                  {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Live Compact Validation Checklist */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold">
              <span
                className={`inline-flex items-center gap-1 transition-colors ${
                  hasMinLength
                    ? 'text-[#176B4B] dark:text-[#6DD39A]'
                    : 'text-[#71837A] dark:text-[#849D90]'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>6 أحرف على الأقل</span>
              </span>

              <span
                className={`inline-flex items-center gap-1 transition-colors ${
                  passwordsMatch
                    ? 'text-[#176B4B] dark:text-[#6DD39A]'
                    : confirmPass.length > 0
                      ? 'text-[#A61B1B] dark:text-[#FCA5A5]'
                      : 'text-[#71837A] dark:text-[#849D90]'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>
                  {confirmPass.length > 0 && !passwordsMatch
                    ? 'كلمتا المرور غير متطابقتين'
                    : 'تطابق كلمتي المرور'}
                </span>
              </span>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isChanging}
                disabled={!canSubmit}
                className="h-10 w-full justify-center rounded-xl border-transparent bg-[#176B4B] text-xs font-bold text-white hover:bg-[#10583C] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#1E7A53] dark:hover:bg-[#248F62]"
              >
                تحديث كلمة المرور
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default RepresentativeProfilePage;