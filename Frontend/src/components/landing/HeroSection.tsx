import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/components/ui/Button';
import { CheckCircle2, ShieldCheck, QrCode, ArrowLeft, Sparkles } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section id="hero" className="relative overflow-hidden py-12 lg:py-20">
      {/* Decorative background emerald glow */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#0B5D43]/10 dark:bg-[#3E9B78]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#3E9B78]/10 dark:bg-[#0B5D43]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Right Column (in RTL): Headline & Mission Copy */}
          <div className="lg:col-span-7 space-y-6 text-right">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] text-xs font-bold border border-[#D8E5DF] dark:border-[#1E4638]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>المنصة المدرسية الذكية المعتمدة</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-[#122B23] dark:text-[#F4F8F6] tracking-tight leading-tight">
              حضور منظم.. <br className="hidden sm:inline" />
              <span className="text-[#0B5D43] dark:text-[#3E9B78]">لبيئة تعليمية أفضل</span>
            </h1>

            <p className="text-base sm:text-lg text-[#3E544C] dark:text-[#A3C7B9] leading-relaxed max-w-2xl">
              منظومة إلكترونية متكاملة تُمكّن إدارة المدرسة وعرفاء الفصول من رصد حضور الحصص الدراسية بدقة لحظية، وإدارة بطاقات الاستئذان المعتمدة، وتصدير السجلات الرسمية بضغطة زر.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/admin/login">
                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold bg-[#0B5D43] hover:bg-[#084733] text-white shadow-md"
                  icon={<ArrowLeft className="w-4 h-4 ml-1" />}
                >
                  الدخول للوحة الإدارة
                </Button>
              </Link>

              <Link to="/representative/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="font-bold border border-[#D8E5DF] dark:border-[#1E4638]"
                >
                  بوابة عريف الفصل
                </Button>
              </Link>
            </div>

            {/* Quick Trust Badges */}
            <div className="pt-6 border-t border-[#D8E5DF] dark:border-[#1E4638] grid grid-cols-3 gap-4 text-xs font-semibold text-[#3E544C] dark:text-[#A3C7B9]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0B5D43] dark:text-[#3E9B78] shrink-0" />
                <span>رصد الحصص اللحظي</span>
              </div>
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#0B5D43] dark:text-[#3E9B78] shrink-0" />
                <span>ماسح بطاقات ذكي</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0B5D43] dark:text-[#3E9B78] shrink-0" />
                <span>تقارير وزارية معتمدة</span>
              </div>
            </div>
          </div>

          {/* Left Column (in RTL): Hero Visual Illustration */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-lg">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#0B5D43]/20 to-[#3E9B78]/20 blur-xl opacity-75" />
              <img
                src="/assets/images/hero-illustration.jpg"
                alt="لوحة تحكم مواظب ثلاثية الأبعاد وماسح رمز الاستجابة السريع"
                loading="eager"
                className="relative z-10 w-full h-auto rounded-2xl shadow-2xl border border-[#D8E5DF] dark:border-[#1E4638] object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
