import { useState } from 'react';
import { useAuth } from '../../../auth';
import { User, KeyRound, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';
import { useNotifications } from '../../../notifications';

export function RepresentativeProfilePage() {
  const { user, changePassword } = useAuth();
  const { toast } = useNotifications();

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.show('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف', 'danger');
      return;
    }
    if (newPass !== confirmPass) {
      toast.show('كلمتا المرور غير متطابقتين', 'danger');
      return;
    }

    setIsChanging(true);
    try {
      await changePassword(newPass);
      toast.show('تم تحديث كلمة المرور الخاصة بك بنجاح', 'success');
      setNewPass('');
      setConfirmPass('');
    } catch {
      toast.show('فشل تحديث كلمة المرور، يرجى المحاولة مرة أخرى', 'danger');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[#245B63]" />
          <h1 className="text-xl font-bold text-[#17252B]">الملف الشخصي والحساب</h1>
        </div>
        <p className="text-xs text-[#5F6B73] mt-1">
          بيانات العريف المعتمدة وإمكانية تغيير كلمة المرور الخاصة بالحساب
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Representative Details */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#EEF2F3] pb-3">
            <Shield className="w-4 h-4 text-[#245B63]" />
            <h2 className="text-sm font-bold text-[#17252B]">معلومات الحساب المعتمد</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">الاسم الكامل:</span>
              <span className="font-bold text-[#17252B]">{user?.fullName}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">اسم المستخدم الرسمي:</span>
              <span className="font-mono font-bold text-[#245B63] bg-white px-2 py-0.5 rounded border border-[#DCE3E6]">{user?.username}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">الشعبة المسندة:</span>
              <span className="font-bold text-[#17252B]">{user?.className || 'شعبة 105'}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">الصفة التمثيلية:</span>
              <span className="font-semibold text-[#245B63] bg-[#E8F1F1] px-2 py-0.5 rounded border border-[#245B63]/20">
                {user?.role === 'Representative' ? 'عريف الصف الأساسي' : 'نائب عريف الصف'}
              </span>
            </div>

            <div className="pt-2 flex items-center gap-1.5 text-[#176B3A] text-xs font-bold bg-[#E8F5EC] p-2.5 rounded-lg border border-[#B7DEC5]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>الحساب نشط ومصرح له برصد الحضور الرسمي</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#EEF2F3] pb-3">
            <KeyRound className="w-4 h-4 text-[#245B63]" />
            <h2 className="text-sm font-bold text-[#17252B]">تغيير كلمة المرور</h2>
          </div>

          <form onSubmit={handleSubmitPassword} className="space-y-3.5">
         

            <Input
              type="password"
              label="كلمة المرور الجديدة"
              placeholder="6 أحرف على الأقل"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
            />

            <Input
              type="password"
              label="تأكيد كلمة المرور الجديدة"
              placeholder="أعد إدخال كلمة المرور الجديدة"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" size="md" isLoading={isChanging} className="w-full font-bold">
                تحديث كلمة المرور
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

