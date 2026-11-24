
import React from 'react';
import { Link } from 'react-router-dom';

import { BrandLogo } from '../common/BrandLogo';
import { QuenricLogo } from '../common/QuenricLogo';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';

import { LogIn, Users, UserCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header
      dir="rtl"
      className="sticky top-0 z-50 w-full border-b border-[#084733] bg-[#0B5D43] text-white shadow-sm transition-colors dark:border-[#173F30] dark:bg-[#0D3023]"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:h-[72px] sm:gap-4 sm:px-6 lg:px-8">

        {/* ================================================================ */}
        {/*                            Brand Area                            */}
        {/* ================================================================ */}

        <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3.5">

          {/* Quenric - Parent Brand */}
          <div className="flex shrink-0 items-center gap-2">

            <QuenricLogo
              autoTheme={false}
              className="h-5 w-auto object-contain sm:h-6 lg:h-7"
            />

            {/* Quiet Brand Attribution */}
            <span className="hidden whitespace-nowrap text-[9px] font-medium text-[#C0D7CB] xl:block">
              إحدى منصاتنا التعليمية
            </span>
          </div>

          {/* Minimal Brand Separator */}
          <div
            aria-hidden="true"
            className="h-6 w-px shrink-0 bg-white/25 sm:h-8"
          />

          {/* Mowathib - Main Product */}
          <Link
            to="/"
            aria-label="الرئيسية - مواظب"
            className="flex shrink-0 items-center rounded-lg transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B5D43] dark:focus-visible:ring-offset-[#0D3023]"
          >
            <BrandLogo
              variant="secondary"
              className="h-7 w-auto max-w-[78px] object-contain sm:h-8 sm:max-w-none lg:h-9"
              alt="شعار مواظب"
            />
          </Link>
        </div>

        {/* ================================================================ */}
        {/*                         Desktop Navigation                       */}
        {/* ================================================================ */}

        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-6 text-xs font-semibold text-[#D0E5D9] xl:flex"
        >
          <a
            href="#hero"
            className="transition-colors hover:text-white"
          >
            الرئيسية
          </a>

          <a
            href="#workflow"
            className="transition-colors hover:text-white"
          >
            آلية العمل
          </a>

          <a
            href="#preview"
            className="transition-colors hover:text-white"
          >
            المزايا
          </a>
        </nav>

        {/* ================================================================ */}
        {/*                           Portal Actions                         */}
        {/* ================================================================ */}

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 lg:gap-2">

          {/* Theme Toggle */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 [&_button]:!text-white [&_button]:hover:!bg-white/10">
            <ThemeToggle />
          </div>

          {/* Representative Portal */}
          <Link
            to="/representative/login"
            aria-label="الدخول إلى بوابة العرفاء"
            title="بوابة العرفاء"
            className="inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:border-white/50 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-9 sm:w-auto sm:px-2.5 lg:px-3"
          >
            <Users className="h-4 w-4 shrink-0" />

            <span className="hidden whitespace-nowrap text-[11px] font-bold md:inline">
              العرفاء
            </span>
          </Link>

          {/* Attendance Clerk Portal */}
          <Link
            to="/clerk/login"
            aria-label="الدخول إلى بوابة مسجّل الحضور"
            title="بوابة مسجّل الحضور"
            className="inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:border-white/50 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-9 sm:w-auto sm:px-2.5 lg:px-3"
          >
            <UserCheck className="h-4 w-4 shrink-0" />

            <span className="hidden whitespace-nowrap text-[11px] font-bold md:inline">
              مسجّل الحضور
            </span>
          </Link>

          {/* Admin Portal */}
          <Link
            to="/admin/login"
            aria-label="الدخول إلى لوحة الإدارة"
            title="لوحة الإدارة"
            className="inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-lg border border-[#D9C58E]/50 bg-[#D9C58E] text-[#183A2B] transition-colors hover:border-[#EBDCAA] hover:bg-[#E7D7A9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-9 sm:w-auto sm:px-2.5 lg:px-3.5"
          >
            <LogIn className="h-4 w-4 shrink-0" />

            <span className="hidden whitespace-nowrap text-[11px] font-extrabold md:inline">
              الإدارة
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
