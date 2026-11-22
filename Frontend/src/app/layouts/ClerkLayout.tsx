import { useState, Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';
import { BrandLogo } from '../../components/common/BrandLogo';
import { MuwathibLoading } from '../../shared/components/ui/Spinner';
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Building,
  UserCheck,
} from 'lucide-react';

export function ClerkLayout() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    { to: '/clerk/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { to: '/clerk/attendance', label: 'رصد الحضور والغياب', icon: CalendarCheck },
    { to: '/clerk/students', label: 'إدارة الطلاب', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F8] dark:bg-[#0F171A] flex flex-col md:flex-row text-right selection:bg-[#245B63] selection:text-white transition-colors duration-150">
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
                  alt="شعار منصة مواظب"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                title="طي القائمة الجانبية"
                className="p-1.5 rounded-lg text-[#5F6B73] dark:text-[#8EAA90] hover:bg-[#F0F4F6] dark:hover:bg-[#1E4638] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* User / School Info Box */}
        <div className="p-3 border-b border-[#EEF2F3] dark:border-[#1E4638]">
          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg bg-[#F4F8F6] dark:bg-[#1A3B31]/60 ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#122B23] dark:bg-[#0B5D43] text-white flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#17252B] dark:text-[#E8F1EC] truncate">
                  {user?.fullName || user?.username}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#0B5D43] dark:text-[#75D39B] font-medium truncate">
                  <Building className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user?.schoolName || 'مدرسة مواظب'}</span>
                </div>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] bg-[#E1EFEA] dark:bg-[#164736] text-[#0B5D43] dark:text-[#A3E2B8] rounded font-semibold">
                  مُسجّل الحضور • {user?.access || 'جميع الشعب'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isSidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#122B23] dark:bg-[#0B5D43] text-white shadow-xs'
                      : 'text-[#3E544C] dark:text-[#B2C7B8] hover:bg-[#F0F4F6] dark:hover:bg-[#1A3B31] hover:text-[#122B23] dark:hover:text-[#F4F8F6]'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#DCE3E6] dark:border-[#1E4638] space-y-2">
          {!isSidebarCollapsed && (
            <div className="flex items-center justify-between px-2 py-1 text-xs text-[#5F6B73] dark:text-[#8EAA90]">
              <span>المظهر</span>
              <ThemeToggle />
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-[#C5221F] dark:text-[#F87171] hover:bg-[#FDECEC] dark:hover:bg-[#331518] rounded-lg transition-colors cursor-pointer ${
              isSidebarCollapsed ? 'justify-center px-0' : ''
            }`}
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header for Mobile */}
        <header className="md:hidden h-16 bg-white dark:bg-[#122B23] border-b border-[#DCE3E6] dark:border-[#1E4638] px-4 flex items-center justify-between sticky top-0 z-20">
          <BrandLogo autoTheme={true} className="h-8 w-auto object-contain" alt="منصة مواظب" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-[#5F6B73] dark:text-[#8EAA90] hover:bg-[#F0F4F6] dark:hover:bg-[#1A3B31]"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#122B23] border-b border-[#DCE3E6] dark:border-[#1E4638] px-4 py-3 space-y-1">
            <div className="p-2.5 mb-2 rounded-lg bg-[#F4F8F6] dark:bg-[#1A3B31]/60">
              <div className="text-xs font-bold text-[#17252B] dark:text-[#E8F1EC]">
                {user?.fullName || user?.username}
              </div>
              <div className="text-[11px] text-[#0B5D43] dark:text-[#75D39B]">
                {user?.schoolName || 'مدرسة مواظب'} (مُسجّل الحضور)
              </div>
            </div>
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
                        ? 'bg-[#122B23] dark:bg-[#0B5D43] text-white'
                        : 'text-[#3E544C] dark:text-[#B2C7B8] hover:bg-[#F0F4F6] dark:hover:bg-[#1A3B31]'
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
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-[#C5221F] dark:text-[#F87171] hover:bg-[#FDECEC] dark:hover:bg-[#331518] rounded-lg mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Suspense fallback={<MuwathibLoading message="جاري التحميل..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default ClerkLayout;
