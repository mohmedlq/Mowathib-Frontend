import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { QuenricLogo } from '../common/QuenricLogo';
import { ArrowLeft, CalendarCheck, UserCheck, Users } from 'lucide-react';

export const CtaBanner: React.FC = () => {
  return (
    <section
      dir="rtl"
      className="bg-white py-14 transition-colors dark:bg-[#0D1A14] sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-[#1E4B39] bg-[#0E281F] text-white">
          <div className="grid grid-cols-1 items-center gap-8 p-7 sm:p-10 lg:grid-cols-12 lg:p-12">
            {/* Message */}
            <div className="space-y-4 text-right lg:col-span-7">
              <BrandLogo
                variant="secondary"
                className="h-10 w-auto object-contain sm:h-11"
                alt="شعار مواظب"
              />

              <h2 className="text-2xl font-black leading-snug tracking-tight sm:text-3xl">
                اختر بوابتك وابدأ المتابعة اليومية مباشرة
              </h2>

              <p className="max-w-xl text-xs leading-7 text-[#C4DFD0] sm:text-sm">
                جميع أدوات الرصد والتقارير وإشعارات أولياء الأمور متاحة حسب
                صلاحية حسابك في المدرسة.
              </p>
            </div>

            {/* Direct Portal Buttons */}
            <div className="flex flex-col gap-2.5 lg:col-span-5">
              <Link
                to="/admin/login"
                className="inline-flex h-12 items-center justify-between rounded-xl bg-white px-5 text-sm font-black text-[#0B4A34] transition-colors hover:bg-[#EAF5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex items-center gap-2.5">
                  <CalendarCheck className="h-4 w-4" />
                  بوابة إدارة المدرسة
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Link
                  to="/representative/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-bold text-white transition-colors hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Users className="h-4 w-4 text-[#89DFAD]" />
                  بوابة العرفاء
                </Link>

                <Link
                  to="/clerk/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-bold text-white transition-colors hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <UserCheck className="h-4 w-4 text-[#89DFAD]" />
                  مسجّل الحضور
                </Link>
              </div>
            </div>
          </div>

          {/* Subtle QUENRIC Engineering Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0A1E17] px-7 py-3.5 text-xs text-[#9BBFB0] sm:px-10 lg:px-12">
            <span>تنظيم موحد للحضور والانضباط المدرسي</span>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-medium text-[#87AD9D]">
                هندسة وتطوير
              </span>
              <QuenricLogo className="h-5 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBanner;