import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';
import { LogIn, Users, UserCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header
      dir="rtl"
      className="sticky top-0 z-50 w-full border-b border-[#DCE7E2] bg-white/95 backdrop-blur-md transition-colors dark:border-[#243B31] dark:bg-[#0D1A14]/95"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          to="/"
          className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0D1A14]"
          aria-label="الرئيسية - مواظب"
        >
          <BrandLogo
            autoTheme={true}
            className="h-9 w-auto object-contain sm:h-10"
            alt="شعار مواظب"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-7 text-sm font-semibold text-[#587064] dark:text-[#A8BEB2] md:flex"
        >
          <a
            href="#hero"
            className="transition-colors hover:text-[#0B5D43] dark:hover:text-[#7AD4A2]"
          >
            الرئيسية
          </a>
          <a
            href="#workflow"
            className="transition-colors hover:text-[#0B5D43] dark:hover:text-[#7AD4A2]"
          >
            آلية العمل
          </a>
          <a
            href="#preview"
            className="transition-colors hover:text-[#0B5D43] dark:hover:text-[#7AD4A2]"
          >
            المزايا
          </a>
        </nav>

        {/* Portal Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          <Link
            to="/representative/login"
            aria-label="الدخول إلى بوابة العرفاء"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D4E3DA] bg-white px-2.5 text-xs font-bold text-[#1D4B38] transition-colors hover:border-[#8AB8A0] hover:bg-[#F2F8F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:border-[#2C483B] dark:bg-[#14251D] dark:text-[#B4DEC6] dark:hover:border-[#4B7560] dark:hover:bg-[#1B3127] sm:px-3"
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>العرفاء</span>
          </Link>

          <Link
            to="/clerk/login"
            aria-label="الدخول إلى بوابة مسجّل الحضور"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D4E3DA] bg-white px-2.5 text-xs font-bold text-[#1D4B38] transition-colors hover:border-[#8AB8A0] hover:bg-[#F2F8F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] dark:border-[#2C483B] dark:bg-[#14251D] dark:text-[#B4DEC6] dark:hover:border-[#4B7560] dark:hover:bg-[#1B3127] sm:px-3"
          >
            <UserCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">مسجّل الحضور</span>
          </Link>

          <Link
            to="/admin/login"
            aria-label="الدخول إلى لوحة الإدارة"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0B5D43] px-3 text-xs font-bold text-white transition-colors hover:bg-[#084733] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B4B] focus-visible:ring-offset-2 dark:bg-[#1F7A52] dark:hover:bg-[#269062] sm:px-3.5"
          >
            <LogIn className="h-3.5 w-3.5 shrink-0" />
            <span>الإدارة</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;