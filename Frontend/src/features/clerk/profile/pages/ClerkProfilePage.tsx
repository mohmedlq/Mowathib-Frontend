import { useState } from 'react';
import { useAuth } from '../../../auth';
import { attendanceClerksApi } from '../../../attendance-clerks/api/attendanceClerksApi';
import { useNotifications } from '../../../notifications';
import {
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Building,
  GraduationCap,
  Save,
  Lock,
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';

export function ClerkProfilePage() {
  const { user, updateUserCredentials } = useAuth();
  const { toast } = useNotifications();

  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      toast.show('اسم المستخدم مطلوب', 'danger');
      return;
    }

    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (trimmedPassword || trimmedConfirm) {
      if (trimmedPassword.length < 6) {
        toast.show('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف', 'danger');
        return;
      }
      if (trimmedPassword !== trimmedConfirm) {
        toast.show('كلمتا المرور غير متطابقتين', 'danger');
        return;
      }
    }

    if (!user?.id) {
      toast.show('تعذر تحديد معرف الحساب الحالي', 'danger');
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

      // Update state in context
      if (updateUserCredentials) {
        updateUserCredentials(updated.username || trimmedUsername);
      }

      setNewPassword('');
      setConfirmPassword('');
      toast.show('تم تحديث بيانات الحساب وكلمة المرور بنجاح', 'success');
    } catch (err: any) {
      const msg =
        err?.response?.data ||
        err?.message ||
        'فشل تحديث بيانات الحساب، يرجى المحاولة مرة أخرى';
      toast.show(msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#122B23] p-4 sm:p-5 rounded-xl border border-[#DCE3E6] dark:border-[#1E4638] shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#0B5D43] text-white flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#17252B] dark:text-[#F4F8F6]">
              الملف الشخصي والحساب
            </h1>
            <p className="text-xs text-[#5F6B73] dark:text-[#A3C7B9] mt-0.5">
              بيانات مسجّل الحضور المعتمدة وإمكانية تعديل اسم المستخدم وتغيير كلمة المرور
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details Card */}
        <div className="bg-white dark:bg-[#122B23] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#1E4638] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#EEF2F3] dark:border-[#1E4638] pb-3">
            <ShieldCheck className="w-4 h-4 text-[#0B5D43] dark:text-[#75D39B]" />
            <h2 className="text-sm font-bold text-[#17252B] dark:text-[#F4F8F6]">
              معلومات الحساب المعتمد
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] dark:bg-[#1A3B31]/40 border border-[#DCE3E6]/60 dark:border-[#1E4638]">
              <span className="text-[#5F6B73] dark:text-[#A3C7B9]">الطالب المسؤول:</span>
              <span className="font-bold text-[#17252B] dark:text-[#F4F8F6]">
                {user?.fullName || user?.username}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] dark:bg-[#1A3B31]/40 border border-[#DCE3E6]/60 dark:border-[#1E4638]">
              <span className="text-[#5F6B73] dark:text-[#A3C7B9]">اسم المستخدم الحالي:</span>
              <span className="font-mono font-bold text-[#0B5D43] dark:text-[#75D39B] bg-white dark:bg-[#122B23] px-2 py-0.5 rounded border border-[#DCE3E6] dark:border-[#1E4638]" dir="ltr">
                {user?.username}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] dark:bg-[#1A3B31]/40 border border-[#DCE3E6]/60 dark:border-[#1E4638]">
              <span className="text-[#5F6B73] dark:text-[#A3C7B9] flex items-center gap-1">
                <Building className="w-3.5 h-3.5" />
                <span>المدرسة:</span>
              </span>
              <span className="font-bold text-[#17252B] dark:text-[#F4F8F6]">
                {user?.schoolName || 'مدرسة مواظب'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] dark:bg-[#1A3B31]/40 border border-[#DCE3E6]/60 dark:border-[#1E4638]">
              <span className="text-[#5F6B73] dark:text-[#A3C7B9]">الصفة الرسمية:</span>
              <span className="font-semibold text-[#0B5D43] dark:text-[#75D39B] bg-[#E1EFEA] dark:bg-[#164736] px-2 py-0.5 rounded">
                مسجّل حضور مدرسي
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] dark:bg-[#1A3B31]/40 border border-[#DCE3E6]/60 dark:border-[#1E4638]">
              <span className="text-[#5F6B73] dark:text-[#A3C7B9] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>نطاق الصلاحية:</span>
              </span>
              <span className="font-bold text-[#17252B] dark:text-[#F4F8F6]">
                {user?.access || 'جميع الشعب'}
              </span>
            </div>

            <div className="pt-2 flex items-center gap-2 text-[#0B5D43] dark:text-[#75D39B] text-xs font-bold bg-[#E8F5F0] dark:bg-[#164736]/50 p-2.5 rounded-lg border border-[#B7DEC5] dark:border-[#1E4638]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>الحساب نشط ومصرح له برصد الحضور وإدارة قيد الطلاب</span>
            </div>
          </div>
        </div>

        {/* Change Username & Password Card */}
        <div className="bg-white dark:bg-[#122B23] p-5 rounded-xl border border-[#DCE3E6] dark:border-[#1E4638] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#EEF2F3] dark:border-[#1E4638] pb-3">
            <KeyRound className="w-4 h-4 text-[#0B5D43] dark:text-[#75D39B]" />
            <h2 className="text-sm font-bold text-[#17252B] dark:text-[#F4F8F6]">
              تعديل بيانات الدخول وكلمة المرور
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="اسم المستخدم"
                placeholder="أدخل اسم المستخدم الجديد"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                dir="ltr"
                className="text-left font-mono"
                required
              />
              <span className="text-[11px] text-[#5F6B73] dark:text-[#A3C7B9] mt-1 block">
                يمكنك تغيير اسم الدخول الخاص بك في أي وقت
              </span>
            </div>

            <div className="pt-2 border-t border-[#EEF2F3] dark:border-[#1E4638] space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#17252B] dark:text-[#F4F8F6]">
                <Lock className="w-3.5 h-3.5 text-[#0B5D43] dark:text-[#75D39B]" />
                <span>تغيير كلمة المرور (اختياري)</span>
              </div>

              <Input
                type="password"
                label="كلمة المرور الجديدة"
                placeholder="اترك الحقل فارغاً إذا كنت لا ترغب بتغييرها"
                dir="ltr"
                className="text-left font-mono"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Input
                type="password"
                label="تأكيد كلمة المرور الجديدة"
                placeholder="أعد إدخال كلمة المرور الجديدة"
                dir="ltr"
                className="text-left font-mono"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full font-bold bg-[#0B5D43] hover:bg-[#084733] text-white"
                isLoading={isSubmitting}
                disabled={isSubmitting || !username.trim()}
                icon={<Save className="w-4 h-4" />}
              >
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ClerkProfilePage;
