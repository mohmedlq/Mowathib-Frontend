
import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';
import { LogIn, Users } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#DCE9DF]/80 bg-white/85 shadow-[0_2px_18px_rgba(17,56,34,0.04)] backdrop-blur-xl transition-colors duration-200 dark:border-[#294234]/80 dark:bg-[#0D1D14]/90 dark:shadow-[0_2px_18px_rgba(0,0,0,0.15)]">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:min-h-[76px] sm:px-6 lg:px-8">

        {/* Brand */}
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16815A] focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#0D1D14]"
          aria-label="الرئيسية - مواظب"
        >
          <BrandLogo
            autoTheme={true}
            className="h-9 w-auto object-contain sm:h-11"
            alt="شعار مواظب"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#52685A] dark:text-[#B2C7B8] md:flex">
          <a
            href="#hero"
            className="transition-colors hover:text-[#0B7049] dark:hover:text-[#75D39B]"
          >
            الرئيسية
          </a>
          <a
            href="#preview"
            className="transition-colors hover:text-[#0B7049] dark:hover:text-[#75D39B]"
          >
            عن مواظب
          </a>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />

          <Link
            to="/representative/login"
            aria-label="الدخول إلى بوابة العرفاء"
            title="بوابة العرفاء"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#CFE2D5] bg-white px-2.5 text-xs font-bold text-[#176B43] transition-all hover:border-[#83B997] hover:bg-[#EFF8F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16815A] dark:border-[#345642] dark:bg-[#17291E] dark:text-[#A3E2B8] dark:hover:border-[#578366] dark:hover:bg-[#1C3728] sm:min-h-10 sm:px-3.5 sm:text-sm"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>العرفاء</span>
          </Link>

          <Link
            to="/admin/login"
            aria-label="الدخول إلى لوحة الإدارة"
            title="بوابة الإدارة"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0B5D43] px-2.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(11,93,67,0.16)] transition-all hover:-translate-y-0.5 hover:bg-[#084733] hover:shadow-[0_7px_18px_rgba(11,93,67,0.23)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16815A] focus-visible:ring-offset-2 dark:bg-[#23764E] dark:hover:bg-[#2B8B5D] sm:min-h-10 sm:px-3.5 sm:text-sm"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span>الإدارة</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
