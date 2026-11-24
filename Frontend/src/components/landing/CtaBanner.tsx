
import React from 'react';
import { Link } from 'react-router-dom';

import { BrandLogo } from '../common/BrandLogo';

import {
  ArrowLeft,
  CalendarCheck,
  UserCheck,
  Users,
} from 'lucide-react';

export const CtaBanner: React.FC = () => {
  return (
    <section
      dir="rtl"
      className="bg-white py-14 transition-colors duration-300 dark:bg-[#0D1A14] sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ================================================================ */}
        {/*                         CTA Main Panel                           */}
        {/* ================================================================ */}

        <div className="relative overflow-hidden rounded-2xl border border-[#CFE0D5] bg-[#F0F7F2] transition-colors duration-300 dark:border-[#294638] dark:bg-[#0E281F]">

          <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-9 lg:grid-cols-12 lg:gap-12 lg:p-12">

            {/* ============================================================ */}
            {/*                          Message                             */}
            {/* ============================================================ */}

            <div className="space-y-5 text-right lg:col-span-7">

              {/* Brand Logo */}
              <BrandLogo
                autoTheme={true}
                className="h-10 w-auto object-contain sm:h-11"
                alt="شعار مواظب"
              />

              {/* Heading */}
              <div className="space-y-3">
                <h2 className="max-w-xl text-2xl font-black leading-[1.4] tracking-tight text-[#12261E] dark:text-[#F0F7F3] sm:text-3xl lg:text-[2.15rem]">
                  اختر بوابتك وابدأ المتابعة اليومية مباشرة
                </h2>

                <p className="max-w-xl text-xs leading-7 text-[#52685D] dark:text-[#B3CBBE] sm:text-sm">
                  جميع أدوات الرصد والتقارير وإشعارات أولياء الأمور متاحة
                  حسب صلاحية حسابك في المدرسة.
                </p>
              </div>

              {/* Subtle Supporting Detail */}
              <div className="flex items-center gap-2 border-t border-[#D6E5DB] pt-4 text-xs font-medium text-[#52705E] dark:border-[#294638] dark:text-[#A3C7B9]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCEEE2] text-[#0B5D43] dark:bg-[#194331] dark:text-[#75D39B]">
                  <CalendarCheck className="h-4 w-4" />
                </span>

                <span>
                  منظومة واحدة لمتابعة الانضباط المدرسي.
                </span>
              </div>
            </div>

            {/* ============================================================ */}
            {/*                         Portal Actions                       */}
            {/* ============================================================ */}

            <div className="flex flex-col gap-3 lg:col-span-5">

              {/* Admin Portal */}
              <Link
                to="/admin/login"
                className="group inline-flex min-h-[52px] items-center justify-between gap-3 rounded-xl bg-[#0B5D43] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-[#084733] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5D43] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F0F7F2] dark:bg-[#75C99A] dark:text-[#103424] dark:hover:bg-[#8AD9AB] dark:focus-visible:ring-[#75C99A] dark:focus-visible:ring-offset-[#0E281F]"
              >
                <span className="flex items-center gap-2.5">
                  <CalendarCheck className="h-4 w-4 shrink-0" />
                  بوابة إدارة المدرسة
                </span>

                <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
              </Link>

              {/* Other Portals */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">

                {/* Representative Portal */}
                <Link
                  to="/representative/login"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#C8DCD0] bg-white px-3 py-3 text-xs font-bold text-[#174B37] transition-colors hover:border-[#82B79A] hover:bg-[#E8F3EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5D43] dark:border-[#355A46] dark:bg-[#142F23] dark:text-[#C1E3CE] dark:hover:border-[#56866B] dark:hover:bg-[#1A3D2D] dark:focus-visible:ring-[#75C99A]"
                >
                  <Users className="h-4 w-4 shrink-0 text-[#0B5D43] dark:text-[#75D39B]" />
                  بوابة العرفاء
                </Link>

                {/* Attendance Clerk Portal */}
                <Link
                  to="/clerk/login"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#C8DCD0] bg-white px-3 py-3 text-xs font-bold text-[#174B37] transition-colors hover:border-[#82B79A] hover:bg-[#E8F3EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5D43] dark:border-[#355A46] dark:bg-[#142F23] dark:text-[#C1E3CE] dark:hover:border-[#56866B] dark:hover:bg-[#1A3D2D] dark:focus-visible:ring-[#75C99A]"
                >
                  <UserCheck className="h-4 w-4 shrink-0 text-[#0B5D43] dark:text-[#75D39B]" />
                  مسجّل الحضور
                </Link>
              </div>

              {/* Supporting Note */}
              <p className="pt-1 text-center text-[11px] leading-5 text-[#71877B] dark:text-[#91B3A0]">
                اختر البوابة المناسبة لنوع حسابك وصلاحياتك.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBanner;
