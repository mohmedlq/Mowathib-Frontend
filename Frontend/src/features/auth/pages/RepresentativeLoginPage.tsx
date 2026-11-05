import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../validation/auth.schema';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Users, KeyRound, Lock, AlertCircle, ArrowLeft, Info } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F5F7F8] flex flex-col justify-center items-center p-4 selection:bg-[#245B63] selection:text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#245B63] text-white shadow-md mb-4 ring-8 ring-[#E8F1F1]">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[#17252B] tracking-tight">بوابة عرفاء الفصول</h1>
          <p className="text-sm text-[#5F6B73] mt-1.5">نظام مواظب لتسجيل حضور الحصص الدراسية اليومية</p>
        </div>

        <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs p-7 sm:p-8">
          <div className="mb-6 pb-4 border-b border-[#EEF2F3]">
            <h2 className="text-base font-bold text-[#17252B]">تسجيل دخول العريف أو النائب</h2>
            <p className="text-xs text-[#5F6B73] mt-0.5">استخدم اسم المستخدم المعتمد الذي تم توليده من قبل إدارة المدرسة</p>
          </div>

          <div className="mb-5 p-3 rounded-lg bg-[#F0F7F7] border border-[#245B63]/20 text-[#245B63] text-xs leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#245B63]" />
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
            <div className="mb-5 p-3.5 bg-[#FDECEC] border border-[#F1C3C3] text-[#A61B1B] text-xs rounded-lg flex items-center gap-2.5">
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
              {...register('username')}
            />

            <Input
              type="password"
              label="كلمة المرور"
              placeholder="••••••••"
              rightIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              autoComplete="current-password"
              {...register('password')}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" size="lg" className="w-full font-semibold" isLoading={isSubmitting}>
                دخول إلى لوحة الصف
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#245B63] hover:text-[#1D4B52] transition-colors"
          >
            <span>بوابة الإدارة المدرسية والمشرفين</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
