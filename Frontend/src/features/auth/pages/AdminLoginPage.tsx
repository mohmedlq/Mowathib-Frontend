import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../validation/auth.schema';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { ShieldCheck, User, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export function AdminLoginPage() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg(null);
    try {
      await loginAdmin(data);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('حدث خطأ أثناء تسجيل الدخول، يرجى التحقق من بيانات الاعتماد أو اتصال الخادم.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] flex flex-col justify-center items-center p-4 selection:bg-[#245B63] selection:text-white">
      {/* Brand & Emblem */}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#245B63] text-white shadow-md mb-4 ring-8 ring-[#E8F1F1]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[#17252B] tracking-tight">نظام مـواظـب المدرسي</h1>
          <p className="text-sm text-[#5F6B73] mt-1.5">بوابة تسجيل دخول الإدارة المدرسية المعتمدة</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs p-7 sm:p-8">
          <div className="mb-6 pb-4 border-b border-[#EEF2F3]">
            <h2 className="text-base font-bold text-[#17252B]">تسجيل دخول المسؤول</h2>
            <p className="text-xs text-[#5F6B73] mt-0.5">أدخل بيانات الاعتماد الرسمية لإدارة شؤون المدرسة والطلاب</p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-[#FDECEC] border border-[#F1C3C3] text-[#A61B1B] text-xs rounded-lg flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="اسم مستخدم الإدارة"
              placeholder="مثال: admin"
              rightIcon={<User className="w-4 h-4" />}
              error={errors.username?.message}
              autoComplete="username"
              dir="ltr"
              className="text-left font-mono"
              {...register('username')}
            />

            <Input
              type="password"
              label="كلمة المرور"
              placeholder="••••••••"
              rightIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              autoComplete="current-password"
              dir="ltr"
              className="text-left font-mono"
              {...register('password')}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" size="lg" className="w-full font-semibold" isLoading={isSubmitting}>
                دخول إلى لوحة الإدارة
              </Button>
            </div>
          </form>
        </div>

        {/* Switch Link */}
        <div className="mt-6 text-center">
          <Link
            to="/representative/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#245B63] hover:text-[#1D4B52] transition-colors"
          >
            <span>هل أنت عريف صف أو نائب؟ انتقل لبوابة العرفاء</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
