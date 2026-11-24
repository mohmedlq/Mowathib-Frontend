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
import { KeyRound, Lock, AlertCircle, ArrowLeft, ArrowRight, Info } from 'lucide-react';

export function RepresentativeLoginPage() {
  const { loginRepresentative } = useAuth();
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
      await loginRepresentative(data);
      navigate('/representative/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('بيانات الدخول غير صحيحة، يرجى التحقق من العريف ورقم الشعبة.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] dark:bg-[#0F171A] flex flex-col justify-center items-center p-4 selection:bg-[#245B63] selection:text-white transition-colors duration-150 relative">
      {/* Top Bar: Back to Landing Page & Theme Switcher */}
      <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-6 flex items-center justify-between pointer-events-none">
        <Link
          to="/"
          className="pointer-events-auto inline-flex items-center gap-2 text-xs font-semibold text-[#587268] hover:text-[#176B4B] dark:text-[#9DB5A8] dark:hover:text-[#6DD39A] bg-white/85 dark:bg-[#182226]/85 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-[#DCE7E2] dark:border-[#2C4539] transition-all shadow-2xs hover:shadow-xs hover:border-[#176B4B]/30"
          title="العودة إلى الصفحة الرئيسية"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </Link>
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Brand Wordmark & Official Mission */}
      <div className="w-full max-w-md">
        <div className="text-center mb-6 flex flex-col items-center">
          <Link to="/" title="العودة إلى الصفحة الرئيسية" className="inline-block transition-transform hover:scale-[1.02]">
            <BrandLogo
              variant="wordmark"
              className="h-16 sm:h-20 w-auto mb-2 filter drop-shadow-xs"
              alt="شعار منصة مواظب - حضور منظم لبيئة تعليمية أفضل"
            />
          </Link>
          <p className="text-xs text-[#3E544C] dark:text-[#A3C7B9] font-medium">بوابة عرفاء الفصول — رصد حضور الحصص الدراسية اليومية</p>
        </div>

        <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs p-7 sm:p-8 transition-colors">
          <div className="mb-6 pb-4 border-b border-[#EEF2F3] dark:border-[#28373D]">
            <h2 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">تسجيل دخول العريف أو النائب</h2>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5">استخدم اسم المستخدم المعتمد الذي تم توليده من قبل إدارة المدرسة</p>
          </div>

          <div className="mb-5 p-3 rounded-lg bg-[#F0F7F7] dark:bg-[#19383E]/50 border border-[#245B63]/20 dark:border-[#388B96]/30 text-[#245B63] dark:text-[#52B4C2] text-xs leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#245B63] dark:text-[#52B4C2]" />
            <div>
              <span className="font-semibold block mb-0.5">صيغة اسم المستخدم الرسمية:</span>
              <span>
                رمز الشعبة متبوعاً بـ <span className="font-mono font-bold">1_</span> للعريف الأساسي، أو{' '}
                <span className="font-mono font-bold">2_</span> للنائب (مثال: <span className="font-mono">105_1</span> أو{' '}
                <span className="font-mono">301_2</span>).
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-[#FDECEC] dark:bg-[#331518] border border-[#F1C3C3] dark:border-[#592226] text-[#A61B1B] dark:text-[#F87171] text-xs rounded-lg flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="اسم المستخدم (رمز الشعبة والدور)"
              placeholder="مثال: 105_1"
              rightIcon={<KeyRound className="w-4 h-4" />}
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
                دخول إلى لوحة الصف
              </Button>
            </div>
          </form>
        </div>

        {/* Switch Link & Back to Home */}
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#245B63] dark:text-[#388B96] hover:text-[#1D4B52] dark:hover:text-[#52B4C2] transition-colors"
          >
            <span>هل أنت مدير مدرسة أو وكيل؟ انتقل لبوابة الإدارة</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#245B63] dark:hover:text-[#52B4C2] transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة إلى الصفحة الرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RepresentativeLoginPage;
