import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { NotificationBell } from '../../features/notifications';
import { ChangePasswordModal } from '../../features/auth';
import { PrintClassNumberModal } from '../../features/representative/components/PrintClassNumberModal';
import {
  LayoutDashboard,
  CalendarCheck2,
  GraduationCap,
  UserCheck,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  Users,
  Printer,
} from 'lucide-react';

export function RepresentativeLayout() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const isMainRep = user?.role === 'Representative';

  const navItems = [
    { to: '/representative/dashboard', label: 'الرئيسية والتحضير اليومي', icon: LayoutDashboard },
    { to: '/representative/weekly-attendance', label: 'التحضير الأسبوعي (عرض فقط)', icon: CalendarCheck2 },
    { to: '/representative/students', label: 'قائمة طلاب الشعبة', icon: GraduationCap },
    ...(isMainRep ? [{ to: '/representative/deputy', label: 'إدارة نائب العريف', icon: UserCheck }] : []),
    { to: '/representative/card-requests', label: 'طلب بطاقة استئذان', icon: CreditCard },
    { to: '/representative/profile', label: 'الملف الشخصي', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F8] flex flex-col md:flex-row text-right selection:bg-[#245B63] selection:text-white">
      {/* Must Change Password Modal */}
      {user?.mustChangePassword && <ChangePasswordModal isOpen={true} />}

      {/* Print Class Number Modal */}
      <PrintClassNumberModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-[#DCE3E6] shrink-0 sticky top-0 h-screen select-none z-30 shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
        <div className="h-16 px-5 border-b border-[#DCE3E6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#245B63] text-white flex items-center justify-center font-bold shadow-xs ring-4 ring-[#E8F1F1]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#17252B] text-base block leading-tight tracking-tight">بوابة العريف</span>
              <span className="text-[10px] text-[#245B63] font-bold">{user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'شعبة الفصل')}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <span className="px-3 text-[10px] font-bold text-[#89949A] uppercase tracking-wider block mb-1">
            مهام عريف الشعبة
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#E8F1F1] text-[#245B63] font-bold border-r-3 border-[#245B63] shadow-2xs'
                      : 'text-[#5F6B73] hover:text-[#17252B] hover:bg-[#F5F7F8]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* Quick Action: Print Class Sign */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-[#245B63] bg-[#E8F1F1]/60 hover:bg-[#E8F1F1] border border-[#CDE0E2] transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0 text-[#245B63]" />
              <span className="font-bold">طباعة رقم الشعبة</span>
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-[#DCE3E6] bg-[#FAFCFD]">
          <div className="flex items-center justify-between p-2 rounded-lg border border-[#EEF2F3] bg-white">
            <div className="truncate">
              <div className="text-xs font-bold text-[#17252B] truncate">{user?.fullName || user?.username}</div>
              <div className="text-[10px] text-[#245B63] font-bold">
                {isMainRep ? 'عريف الصف الأساسي' : 'نائب عريف الصف'}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-md text-[#89949A] hover:text-[#A61B1B] hover:bg-[#FDECEC] transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 bg-white h-full flex flex-col z-10 border-l border-[#DCE3E6] shadow-xl">
            <div className="h-16 px-5 border-b border-[#DCE3E6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#245B63]" />
                <span className="font-bold text-[#17252B]">بوابة العريف</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-[#5F6B73] hover:text-[#17252B] cursor-pointer"
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
                          ? 'bg-[#E8F1F1] text-[#245B63] font-bold border-r-3 border-[#245B63]'
                          : 'text-[#5F6B73] hover:text-[#17252B]'
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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-[#245B63] bg-[#E8F1F1] border border-[#CDE0E2] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة رقم الشعبة</span>
              </button>
            </nav>
            <div className="p-3 border-t border-[#DCE3E6]">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#FDECEC] text-[#A61B1B] text-xs font-bold hover:bg-[#FAD9D9] transition-colors cursor-pointer"
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
        <header className="h-16 bg-white border-b border-[#DCE3E6] px-5 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 md:hidden text-[#5F6B73] hover:text-[#17252B] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-[#245B63] bg-[#E8F1F1] px-2.5 py-1 rounded-md border border-[#CDE0E2]">
                {user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'شعبة 105')}
              </span>
              <span className="text-xs text-[#89949A] hidden sm:inline">|</span>
              <span className="text-xs text-[#5F6B73] hidden sm:inline font-medium">
                {isMainRep ? 'العريف الأساسي' : 'نائب العريف'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Print Class Sign button in header */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#245B63] bg-[#E8F1F1] hover:bg-[#D5E7E8] border border-[#CDE0E2] transition-colors cursor-pointer"
              title="طباعة لافتة الشعبة"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>لافتة الشعبة</span>
            </button>

            <NotificationBell />
            <div className="h-4 w-px bg-[#DCE3E6] hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#245B63] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#E8F1F1]">
                {user?.fullName ? user.fullName[0] : 'ع'}
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-xs font-bold text-[#17252B] block leading-tight">
                  {user?.fullName || user?.username}
                </span>
                <span className="text-[10px] text-[#5F6B73]">
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
