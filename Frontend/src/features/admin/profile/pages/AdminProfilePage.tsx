import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';
import { useNotifications } from '../../../notifications';
import {
  User,
  ShieldCheck,
  Building,
  KeyRound,
  Save,
} from 'lucide-react';

export function AdminProfilePage() {
  const { user, updateUserCredentials } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  // Form State
  const [adminName, setAdminName] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch Admin Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin_profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await schoolDataService.getAdminProfile(user.id);
    },
  });

  useEffect(() => {
    if (profile) {
      setAdminName(profile.adminName || user?.fullName || '');
      setUsername(profile.username || user?.username || '');
    } else if (user) {
      setAdminName(user.fullName || '');
      setUsername(user.username || '');
    }
  }, [profile, user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('معرف المستخدم غير متوفر');
      if (!adminName.trim()) throw new Error('يرجى إدخال اسم المسؤول الكامل');
      if (!username.trim()) throw new Error('يرجى إدخال اسم المستخدم');
      if (username.trim().length < 3) throw new Error('يجب ألا يقل اسم المستخدم عن 3 أحرف');

      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          throw new Error('يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل');
        }
        if (newPassword.trim() !== confirmPassword.trim()) {
          throw new Error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
        }
      }

      return await schoolDataService.updateAdminProfile(user.id, {
        adminName: adminName.trim(),
        username: username.trim(),
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_profile'] });
      updateUserCredentials?.(username.trim(), adminName.trim());
      toast.show('تم حفظ بيانات الملف الشخصي بنجاح', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err?.message || 'فشل تحديث البيانات، يرجى التحقق من صحة المدخلات';
      toast.show(typeof msg === 'string' ? msg : 'فشل تحديث البيانات', 'danger');
    },
  });

  if (isLoading) {
    return <MuwathibLoading message="جاري تحميل بيانات الملف الشخصي..." />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      {/* Header Context Bar */}
      <div className="bg-white dark:bg-[#122B23] p-5 sm:p-6 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0B5D43] text-white flex items-center justify-center shrink-0 shadow-xs">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-[#122B23] dark:text-[#F4F8F6] tracking-tight">
                الملف الشخصي للمسؤول
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] font-bold">
                إدارة المدرسة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#718A80] dark:text-[#A3C7B9] mt-1">
              إدارة بيانات حساب المسؤول، وتعديل الاسم واسم المستخدم، وتغيير كلمة المرور
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs p-6 space-y-6">
        {/* Associated School Information */}
        <div className="p-4 rounded-xl bg-[#F8FAFB] dark:bg-[#131D21] border border-[#EEF2F3] dark:border-[#28373D] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1]">
            <Building className="w-4 h-4 text-[#0B5D43]" />
            <span>المدرسة المقترنة بالحساب:</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#0B5D43] dark:text-[#75D39B]">
            <ShieldCheck className="w-4 h-4" />
            <span>{profile?.schoolName || user?.schoolName || 'مدرسة مواظب'}</span>
          </div>
        </div>

        {/* Section 1: Basic Account Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#17252B] dark:text-[#F0F4F6]">
            <User className="w-4 h-4 text-[#0B5D43]" />
            <span>البيانات الأساسية للحساب</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="اسم المسؤول الكامل *"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="مثال: الأستاذ أحمد المنصور"
                className="text-sm font-semibold"
              />
              <p className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] mt-1">
                يظهر هذا الاسم في ترويسة لوحة التحكم والتقارير
              </p>
            </div>

            <div>
              <Input
                label="اسم المستخدم (Username) *"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: admin_school"
                dir="ltr"
                className="text-left font-mono font-bold"
              />
              <p className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] mt-1">
                اسم المستخدم المستخدم لتسجيل الدخول للنظام
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Change Password */}
        <div className="pt-4 border-t border-[#EEF2F3] dark:border-[#28373D] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#17252B] dark:text-[#F0F4F6]">
            <KeyRound className="w-4 h-4 text-[#0B5D43]" />
            <span>تغيير كلمة المرور (اختياري)</span>
          </div>
          <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
            اترك هذه الحقول فارغة إذا كنت ترغب بالاحتفاظ بكلمة المرور الحالية دون تغيير.
          </p>

          <div className="space-y-3">
            <Input
              type="password"
              label="كلمة المرور الحالية (اختياري)"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              className="text-left font-mono"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="password"
                label="كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="•••••••• (6 أحرف على الأقل)"
                dir="ltr"
                className="text-left font-mono"
              />

              <Input
                type="password"
                label="تأكيد كلمة المرور الجديدة"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="text-left font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-[#EEF2F3] dark:border-[#28373D] flex justify-end">
          <Button
            type="button"
            variant="primary"
            disabled={updateMutation.isPending || !adminName.trim() || !username.trim()}
            onClick={() => updateMutation.mutate()}
            className="bg-[#0B5D43] hover:bg-[#084733] text-white font-bold"
          >
            <Save className="w-4 h-4 ml-1.5" />
            <span>{updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ بيانات الملف الشخصي'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdminProfilePage;
