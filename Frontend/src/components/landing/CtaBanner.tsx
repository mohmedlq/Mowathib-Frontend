
import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import {
  ArrowLeft,
  Users,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';

export const CtaBanner: React.FC = () => {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="relative isolate overflow-hidden rounded-[28px] border border-[#327653] bg-gradient-to-br from-[#0B5D43] via-[#104C35] to-[#102B20] px-6 py-12 text-center text-white shadow-[0_30px_80px_rgba(11,70,45,0.22)] dark:border-[#356A4A] dark:from-[#153D2A] dark:via-[#102B20] dark:to-[#0A1911] sm:rounded-[36px] sm:px-12 sm:py-16 lg:px-20">

          {/* Atmospheric Decoration */}
          <div className="pointer-events-none absolute -right-24 -top-40 -z-10 h-96 w-96 rounded-full bg-[#71D49A]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-48 -left-24 -z-10 h-96 w-96 rounded-full bg-[#0B8A5B]/30 blur-3xl" />

          <div className="relative mx-auto max-w-3xl space-y-7">

            {/* Logo */}
            <div className="flex justify-center">
              <BrandLogo
                variant="secondary"
                className="h-11 w-auto object-contain sm:h-14"
                alt="شعار مواظب"
              />
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-[#C4EAD1]">
                <Sparkles className="h-3.5 w-3.5" />
                لننظم الحضور معاً
              </span>

              <h2 className="text-2xl font-black leading-snug tracking-tight sm:text-4xl lg:text-[2.75rem]">
                اجعل متابعة الحضور
                <span className="block text-[#91E2AF]">
                  أكثر وضوحاً وتنظيماً.
                </span>
              </h2>

              <p className="mx-auto max-w-2xl text-sm leading-8 text-[#D4E9DA] sm:text-base sm:leading-9">
                من إدارة الفصول والطلاب إلى رصد الحصص ومتابعة سجلات الحضور،
                يجمع مواظب الإدارة والعرفاء في تجربة واحدة تساعد المدرسة
                على تنظيم العمل اليومي.
              </p>
            </div>

            {/* Entry Points */}
            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap">

              <Link
                to="/admin/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-[#105A3B] shadow-lg transition-all hover:-translate-y-1 hover:bg-[#EEF8F1] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#104C35]"
              >
                <CalendarCheck className="h-4 w-4" />
                بوابة إدارة المدرسة
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <Link
                to="/representative/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/[0.07] px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-1 hover:border-white/60 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Users className="h-4 w-4" />
                بوابة العرفاء
              </Link>

            </div>

            <p className="pt-2 text-[11px] font-medium text-[#AFD4BB]">
              مساحة واحدة لتنظيم الحضور المدرسي.
            </p>

          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBanner;
