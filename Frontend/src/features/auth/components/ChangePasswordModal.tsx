import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordFormData } from '../validation/auth.schema';
import { useAuth } from '../hooks/useAuth';
import { Dialog, DialogFooter } from '../../../shared/components/ui/Dialog';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Lock, AlertCircle } from 'lucide-react';

export function ChangePasswordModal({ isOpen }: { isOpen: boolean }) {
  const { changePassword, logout } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setErrorMsg(null);
    try {
      await changePassword(data.newPassword);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('حدث خطأ أثناء تغيير كلمة المرور');
      }
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {}}
      title="تغيير كلمة المرور المؤقتة"
      description="يجب عليك تعيين كلمة مرور جديدة وخاصة بك للمتابعة لأول مرة."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-[#FDECEC] border border-[#F1C3C3] text-[#A61B1B] text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Input
          type="password"
          label="كلمة المرور الجديدة"
          placeholder="أدخل 6 أحرف على الأقل"
          rightIcon={<Lock className="w-4 h-4" />}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <Input
          type="password"
          label="تأكيد كلمة المرور الجديدة"
          placeholder="أعد إدخال كلمة المرور الجديدة"
          rightIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <DialogFooter className="mt-6">
          <Button type="button" variant="ghost" size="sm" onClick={logout}>
            تسجيل الخروج
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
            حفظ ومتابعة
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

