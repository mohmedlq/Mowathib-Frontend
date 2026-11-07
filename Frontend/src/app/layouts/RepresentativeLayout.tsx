import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';
import { ChangePasswordModal } from '../../features/auth';
import { PrintClassNumberModal } from '../../features/representative/components/PrintClassNumberModal';
import { BrandLogo } from '../../components/common/BrandLogo';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarCheck2,
  GraduationCap,
  UserCheck,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  Printer,
  ChevronLeft,
} from 'lucide-react';

export function RepresentativeLayout() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isMainRep = user?.role === 'Representative';

  const navItems = [
    { to: '/representative/dashboard', label: 'الرئيسية (لوحة المتابعة)', icon: LayoutDashboard },
    { to: '/representative/daily-attendance', label: 'رصد الحضور اليومي', icon: CalendarCheck },
    { to: '/representative/weekly-attendance', label: 'التحضير الأسبوعي (عرض فقط)', icon: CalendarCheck2 },
    { to: '/representative/students', label: 'قائمة طلاب الشعبة', icon: GraduationCap },
    ...(isMainRep ? [{ to: '/representative/deputy', label: 'إدارة نائب العريف', icon: UserCheck }] : []),
    { to: '/representative/card-requests', label: 'طلب بطاقة استئذان', icon: CreditCard },
    { to: '/representative/profile', label: 'الملف الشخصي', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F8] dark:bg-[#0F171A] flex flex-col md:flex-row text-right selection:bg-[#245B63] selection:text-white transition-colors duration-150">
      {/* Must Change Password Modal */}
      {user?.mustChangePassword && <ChangePasswordModal isOpen={true} />}

      {/* Print Class Number Modal */}
      <PrintClassNumberModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-white dark:bg-[#122B23] border-l border-[#DCE3E6] dark:border-[#1E4638] shrink-0 sticky top-0 h-screen select-none z-30 shadow-[1px_0_4px_rgba(0,0,0,0.02)] transition-all duration-200 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="h-16 px-3.5 border-b border-[#DCE3E6] dark:border-[#1E4638] flex items-center justify-between">
          {isSidebarCollapsed ? (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                title="توسيع القائمة الجانبية"
                className="p-1 rounded-xl hover:bg-[#F4F8F6] dark:hover:bg-[#1A3B31] transition-colors cursor-pointer"
              >
                <BrandLogo
                  collapsed={true}
                  className="w-10 h-10 object-contain"
                  alt="أيقونة منصة مواظب"
                />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 overflow-hidden">
                <BrandLogo
                  autoTheme={true}
                  className="h-9 sm:h-10 w-auto object-contain"
                  alt="شعار منصة مواظب - حضور منظم لبيئة تعليمية أفضل"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1.5 rounded-lg text-[#5F6B73] dark:text-[#A3C7B9] hover:bg-[#F4F8F6] dark:hover:bg-[#1A3B31] transition-colors cursor-pointer"
                title="طي القائمة الجانبية"
                aria-label="طي القائمة الجانبية"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {!isSidebarCollapsed && (
            <span className="px-3 text-[10px] font-bold text-[#89949A] dark:text-[#718A80] uppercase tracking-wider block mb-1">
              مهام عريف الشعبة
            </span>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isSidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                  } rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] font-bold border-r-3 border-[#0B5D43] dark:border-[#3E9B78] shadow-2xs'
                      : 'text-[#5F6B73] dark:text-[#A3C7B9] hover:text-[#122B23] dark:hover:text-[#F4F8F6] hover:bg-[#F4F8F6] dark:hover:bg-[#153B2E]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Quick Action: Print Class Sign */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              title={isSidebarCollapsed ? 'طباعة رقم الشعبة' : undefined}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              } rounded-lg text-xs font-semibold text-[#0B5D43] dark:text-[#3E9B78] bg-[#E8F5F0] dark:bg-[#1A3B31] hover:bg-[#D7EEDB] dark:hover:bg-[#20454c] border border-[#D8E5DF] dark:border-[#1E4638] transition-all cursor-pointer`}
            >
              <Printer className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="font-bold">طباعة رقم الشعبة</span>}
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-[#DCE3E6] dark:border-[#1E4638] bg-[#FAFCFD] dark:bg-[#0D1E18]">
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg text-[#89949A] dark:text-[#718A80] hover:text-[#A61B1B] dark:hover:text-[#F87171] hover:bg-[#FDECEC] dark:hover:bg-[#331518] transition-colors cursor-pointer"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-lg border border-[#EEF2F3] dark:border-[#1E4638] bg-white dark:bg-[#122B23]">
              <div className="truncate">
                <div className="text-xs font-bold text-[#122B23] dark:text-[#F4F8F6] truncate">{user?.fullName || user?.username}</div>
                <div className="text-[10px] text-[#0B5D43] dark:text-[#3E9B78] font-bold">
                  {isMainRep ? 'عريف الصف الأساسي' : 'نائب عريف الصف'}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-md text-[#89949A] dark:text-[#718A80] hover:text-[#A61B1B] dark:hover:text-[#F87171] hover:bg-[#FDECEC] dark:hover:bg-[#331518] transition-colors cursor-pointer"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 bg-white dark:bg-[#182226] h-full flex flex-col z-10 border-l border-[#DCE3E6] dark:border-[#28373D] shadow-xl transition-colors duration-150">
            <div className="h-16 px-4 border-b border-[#DCE3E6] dark:border-[#1E4638] flex items-center justify-between">
              <BrandLogo
                autoTheme={true}
                className="h-8 w-auto object-contain"
                alt="شعار منصة مواظب"
              />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-[#5F6B73] dark:text-[#A3C7B9] hover:text-[#122B23] dark:hover:text-[#F4F8F6] cursor-pointer"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                        isActive
                          ? 'bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] font-bold border-r-3 border-[#0B5D43] dark:border-[#3E9B78]'
                          : 'text-[#5F6B73] dark:text-[#A3C7B9] hover:text-[#122B23] dark:hover:text-[#F4F8F6] hover:bg-[#F4F8F6] dark:hover:bg-[#153B2E]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsPrintModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-[#0B5D43] dark:text-[#3E9B78] bg-[#E8F5F0] dark:bg-[#1A3B31] border border-[#D8E5DF] dark:border-[#1E4638] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة رقم الشعبة</span>
              </button>
            </nav>
            <div className="p-3 border-t border-[#DCE3E6] dark:border-[#28373D]">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] text-xs font-bold hover:bg-[#FAD9D9] dark:hover:bg-[#451C20] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-[#122B23] border-b border-[#DCE3E6] dark:border-[#1E4638] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs transition-colors duration-150">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 md:hidden text-[#5F6B73] dark:text-[#A3C7B9] hover:text-[#122B23] dark:hover:text-[#F4F8F6] cursor-pointer"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Favicon for compact mobile viewports (< 480px) */}
            <div className="md:hidden flex items-center">
              <BrandLogo variant="favicon" className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0B5D43] dark:text-[#3E9B78] bg-[#E8F5F0] dark:bg-[#1A3B31] px-2.5 py-1 rounded-md border border-[#D8E5DF] dark:border-[#1E4638]">
                {user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'شعبة 105')}
              </span>
              <span className="text-xs text-[#89949A] dark:text-[#718A80] hidden sm:inline">|</span>
              <span className="text-xs text-[#5F6B73] dark:text-[#A3C7B9] hidden sm:inline font-medium">
                {isMainRep ? 'العريف الأساسي' : 'نائب العريف'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Print Class Sign button in header */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0B5D43] dark:text-[#3E9B78] bg-[#E8F5F0] dark:bg-[#1A3B31] hover:bg-[#D7EEDB] dark:hover:bg-[#224b3e] border border-[#D8E5DF] dark:border-[#1E4638] transition-colors cursor-pointer"
              title="طباعة لافتة الشعبة"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>لافتة الشعبة</span>
            </button>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            <div className="h-4 w-px bg-[#DCE3E6] dark:border-[#1E4638] hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B5D43] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#E8F5F0] dark:ring-[#1A3B31]">
                {user?.fullName ? user.fullName[0] : 'ع'}
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-xs font-bold text-[#122B23] dark:text-[#F4F8F6] block leading-tight">
                  {user?.fullName || user?.username}
                </span>
                <span className="text-[10px] text-[#5F6B73] dark:text-[#A3C7B9]">
                  {isMainRep ? 'عريف الشعبة' : 'نائب العريف'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default RepresentativeLayout;
