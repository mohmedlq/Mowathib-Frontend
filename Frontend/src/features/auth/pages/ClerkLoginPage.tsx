import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../validation/auth.schema';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { ThemeToggle } from '../../../shared/components/ui/ThemeToggle';
import { BrandLogo } from '../../../components/common/BrandLogo';
import { UserCheck, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export function ClerkLoginPage() {
  const { loginClerk } = useAuth();
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
      await loginClerk(data);
      navigate('/clerk/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('حدث خطأ أثناء تسجيل الدخول، يرجى التحقق من بيانات الاعتماد أو اتصال الخادم.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] dark:bg-[#0F171A] flex flex-col justify-center items-center p-4 selection:bg-[#245B63] selection:text-white transition-colors duration-150 relative">
      {/* Top Bar with Theme Switcher */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <ThemeToggle />
      </div>

      {/* Brand Wordmark & Mission */}
      <div className="w-full max-w-md">
        <div className="text-center mb-6 flex flex-col items-center">
          <BrandLogo
            variant="wordmark"
            className="h-16 sm:h-20 w-auto mb-2 filter drop-shadow-xs"
            alt="شعار منصة مواظب - رصد دقيق للحضور والغياب"
          />
          <p className="text-xs text-[#3E544C] dark:text-[#A3C7B9] font-medium">بوابة تسجيل دخول مُسجّل الحضور</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs p-7 sm:p-8 transition-colors">
          <div className="mb-6 pb-4 border-b border-[#EEF2F3] dark:border-[#28373D]">
            <h2 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">تسجيل دخول مسجّل الحضور</h2>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5">أدخل بيانات الاعتماد لرصد الحضور والغياب لجميع فصول وشعب المدرسة</p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-[#FDECEC] dark:bg-[#331518] border border-[#F1C3C3] dark:border-[#592226] text-[#A61B1B] dark:text-[#F87171] text-xs rounded-lg flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="اسم المستخدم"
              placeholder="مثال: clerk_user"
              rightIcon={<UserCheck className="w-4 h-4" />}
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
              <Button
                type="submit"
                className="w-full text-xs font-bold"
                size="md"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-[#EEF2F3] dark:border-[#28373D] text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#1F7A8C] dark:hover:text-[#68D8D6] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>العودة إلى الصفحة الرئيسية</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClerkLoginPage;
