import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { Button } from '../../shared/components/ui/Button';
import { LogIn, ArrowLeft } from 'lucide-react';

export const CtaBanner: React.FC = () => {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dark Emerald Call-to-Action Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B5D43] via-[#0D261D] to-[#122B23] p-8 sm:p-14 text-white shadow-2xl border border-[#3E9B78]/30 text-center space-y-6">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#3E9B78]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#0B5D43]/30 rounded-full blur-3xl pointer-events-none" />

          {/* Secondary Badge Logo (White text & icon on dark surface) */}
          <div className="flex justify-center relative z-10">
            <BrandLogo
              variant="secondary"
              className="h-12 sm:h-14 w-auto object-contain filter drop-shadow-md"
              alt="شعار منصة مواظب - بطاقة الهوية الرسمية"
            />
          </div>

          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              جاهز لرفع كفاءة الانضباط المدرسي في مدرستك؟
            </h2>
            <p className="text-sm sm:text-base text-[#D8E5DF] leading-relaxed">
              انضم إلى المنظومة المتطورة وابدأ بتسجيل حضور الحصص الدراسية بكل يسر وسرعة عبر بوابتي الإدارة وعرفاء الصفوف.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 relative z-10">
            <Link to="/admin/login">
              <Button
                variant="primary"
                size="lg"
                className="font-bold bg-white text-[#0B5D43] hover:bg-[#F4F8F6] border-none shadow-lg px-6"
                icon={<LogIn className="w-4 h-4 ml-1 text-[#0B5D43]" />}
              >
                تسجيل دخول الإدارة
              </Button>
            </Link>

            <Link to="/representative/login">
              <Button
                variant="outline"
                size="lg"
                className="font-bold border-white/60 text-white hover:bg-white/10 px-6"
                icon={<ArrowLeft className="w-4 h-4 ml-1" />}
              >
                بوابة عرفاء الفصول
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBanner;
