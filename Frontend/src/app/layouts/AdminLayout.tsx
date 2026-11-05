import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { NotificationBell } from '../../features/notifications';
import { useSchoolSettings } from '../../shared/services/schoolSettingsService';
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  GraduationCap,
  Users2,
  CalendarRange,
  CreditCard,
  FileQuestion,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { schoolName } = useSchoolSettings();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navSections = [
    {
      title: 'العمليات والحضور',
      items: [
        { to: '/admin/dashboard', label: 'لوحة المتابعة', icon: LayoutDashboard },
        { to: '/admin/attendance', label: 'تسجيل ومتابعة الحضور', icon: CalendarCheck },
        { to: '/admin/reports', label: 'تقارير الحضور والغياب', icon: CalendarRange },
      ],
    },
    {
      title: 'إدارة المدرسة',
      items: [
        { to: '/admin/classes', label: 'الشعب والفصول (30 شعبة)', icon: Building2 },
        { to: '/admin/students', label: 'إدارة الطلاب والقيد', icon: GraduationCap },
        { to: '/admin/representatives', label: 'عرفاء الفصول والنواب', icon: Users2 },
        { to: '/admin/academic-years', label: 'الأعوام والأسابيع الدراسية', icon: CalendarRange },
      ],
    },
    {
      title: 'الخدمات والإعدادات',
      items: [
        { to: '/admin/cards', label: 'البطاقات والطباعة', icon: CreditCard },
        { to: '/admin/card-requests', label: 'طلبات البطاقات البديلة', icon: FileQuestion },
        { to: '/admin/notifications', label: 'مركز التنبيهات', icon: Bell },
        { to: '/admin/settings', label: 'إعدادات النظام', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F8] flex flex-col md:flex-row text-right selection:bg-[#245B63] selection:text-white">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-[#DCE3E6] shrink-0 sticky top-0 h-screen select-none z-30 shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-[#DCE3E6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#245B63] text-white flex items-center justify-center font-bold shadow-xs ring-4 ring-[#E8F1F1]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#17252B] text-base block leading-tight tracking-tight">مـواظـب</span>
              <span className="text-[10px] text-[#5F6B73] font-medium">لوحة إدارة المدرسة</span>
            </div>
          </div>
        </div>

        {/* Navigation Links with Categorized Sections */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-[#89949A] uppercase tracking-wider block mb-1">
                {section.title}
              </span>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#E8F1F1] text-[#245B63] font-bold border-r-3 border-[#245B63] shadow-2xs'
                          : 'text-[#5F6B73] hover:text-[#17252B] hover:bg-[#F5F7F8]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-[#DCE3E6] bg-[#FAFCFD]">
          <div className="flex items-center justify-between p-2 rounded-lg border border-[#EEF2F3] bg-white">
            <div className="truncate">
              <div className="text-xs font-bold text-[#17252B] truncate">{user?.fullName || 'مدير المدرسة'}</div>
              <div className="text-[10px] text-[#5F6B73] truncate font-mono">admin@mowathib.edu</div>
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
                <ShieldCheck className="w-5 h-5 text-[#245B63]" />
                <span className="font-bold text-[#17252B]">إدارة مواظب</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-[#5F6B73] hover:text-[#17252B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {navSections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1">
                  <span className="px-3 text-[10px] font-bold text-[#89949A] uppercase tracking-wider block mb-1">
                    {section.title}
                  </span>
                  {section.items.map((item) => {
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
                </div>
              ))}
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
        {/* Top Header */}
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
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#245B63] bg-[#E8F1F1] px-2.5 py-1 rounded-md border border-[#CDE0E2]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#176B3A] animate-pulse"></span>
                <span>العام الدراسي 1446-1447هـ</span>
              </span>
              <span className="text-xs text-[#89949A] hidden sm:inline">|</span>
              <span className="text-xs text-[#5F6B73] hidden sm:inline font-medium">{schoolName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <NotificationBell />
            <div className="h-4 w-px bg-[#DCE3E6] hidden sm:block" />
            <div
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate('/admin/settings')}
            >
              <div className="w-8 h-8 rounded-full bg-[#245B63] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#E8F1F1]">
                م
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-xs font-bold text-[#17252B] block leading-tight">{user?.fullName || 'مدير المدرسة'}</span>
                <span className="text-[10px] text-[#5F6B73]">مسؤول النظام</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
