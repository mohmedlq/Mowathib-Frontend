import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';
import { Button } from '../../shared/components/ui/Button';
import { LogIn, Users } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-[#122B23]/90 border-b border-[#D8E5DF] dark:border-[#1E4638] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Right-most Start of RTL Container: Brand Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center" aria-label="الرئيسية - مواظب">
            <BrandLogo
              autoTheme={true}
              className="h-12 w-auto object-contain cursor-pointer"
              alt="شعار منصة مواظب - حضور منظم لبيئة تعليمية أفضل"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#3E544C] dark:text-[#A3C7B9]">
            <a href="#hero" className="hover:text-[#0B5D43] dark:hover:text-[#3E9B78] transition-colors">
              الرئيسية
            </a>
            <a href="#features" className="hover:text-[#0B5D43] dark:hover:text-[#3E9B78] transition-colors">
              المميزات
            </a>
            <a href="#preview" className="hover:text-[#0B5D43] dark:hover:text-[#3E9B78] transition-colors">
              جولة في النظام
            </a>
          </nav>
        </div>

        {/* Left Actions Container */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link to="/representative/login">
            <Button
              variant="outline"
              size="sm"
              icon={<Users className="w-4 h-4" />}
              className="font-bold border-[#0B5D43] text-[#0B5D43] dark:border-[#3E9B78] dark:text-[#3E9B78]"
            >
              <span className="hidden sm:inline">بوابة</span> العرفاء
            </Button>
          </Link>

          <Link to="/admin/login">
            <Button
              variant="primary"
              size="sm"
              icon={<LogIn className="w-4 h-4" />}
              className="font-bold shadow-xs bg-[#0B5D43] hover:bg-[#084733] text-white"
            >
              <span className="hidden sm:inline">تسجيل دخول</span> الإدارة
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
