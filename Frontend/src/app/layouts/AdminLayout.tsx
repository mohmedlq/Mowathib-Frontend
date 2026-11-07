import { useState, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../features/auth';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useSchoolSettings } from '../../shared/services/schoolSettingsService';
import { schoolDataService } from '../../shared/services/schoolDataService';
import { resolveDefaultAttendanceWeek } from '../../shared/utils/date';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet,
  Building2,
  GraduationCap,
  Users2,
  CalendarClock,
  // CreditCard,
  // FileQuestion,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Calendar,
} from 'lucide-react';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { schoolName } = useSchoolSettings();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Fetch Weeks to determine Current Week Number
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
  });

  // Fetch Active Academic Year
  const { data: activeYear } = useQuery({
    queryKey: ['active_academic_year'],
    queryFn: () => schoolDataService.getActiveAcademicYear(),
    staleTime: 1000 * 60 * 30,
  });

  const activeWeek = useMemo(() => resolveDefaultAttendanceWeek(weeks), [weeks]);
  const currentWeekNumber = activeWeek?.weekNumber;

  const navSections = [
    {
      title: 'العمليات وسجلات الحضور',
      items: [
        { to: '/admin/dashboard', label: 'الرئيسية (لوحة المتابعة)', icon: LayoutDashboard },
        { to: '/admin/attendance', label: 'الحضور والغياب', icon: CalendarCheck },
        // مؤجل مؤقتاً بناءً على طلب الإدارة: التحضير الشهري
        // { to: '/admin/monthly-preparation', label: 'التحضير الشهري (5 أسابيع)', icon: CalendarRange },
        { to: '/admin/weekly-preparation', label: 'التحضير الأسبوعي (المراحل)', icon: FileSpreadsheet },
        { to: '/admin/reports', label: 'تقارير الحضور والغياب', icon: CalendarDays },
      ],
    },
    {
      title: 'إدارة المدرسة والجداول',
      items: [
        { to: '/admin/classes', label: 'الشعب والفصول الدراسية', icon: Building2 },
        { to: '/admin/academic-weeks', label: 'الأسابيع الدراسية', icon: CalendarClock },
        { to: '/admin/students', label: 'إدارة الطلاب والقيد', icon: GraduationCap },
        { to: '/admin/representatives', label: 'عرفاء الفصول والنواب', icon: Users2 },
        { to: '/admin/academic-years', label: 'الأعوام الدراسية', icon: CalendarRange },
      ],
    },
    {
      title: 'الخدمات والإعدادات',
      items: [
        // مؤجل مؤقتاً بناءً على طلب الإدارة: البطاقات والطباعة وطلبات البطاقات البديلة
        // { to: '/admin/cards', label: 'البطاقات والطباعة', icon: CreditCard },
        // { to: '/admin/card-requests', label: 'طلبات البطاقات البديلة', icon: FileQuestion },
        { to: '/admin/settings', label: 'إعدادات النظام', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F8] dark:bg-[#0F171A] flex flex-col md:flex-row text-right selection:bg-[#245B63] selection:text-white transition-colors duration-150">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-white dark:bg-[#122B23] border-l border-[#DCE3E6] dark:border-[#1E4638] shrink-0 sticky top-0 h-screen select-none z-30 shadow-[1px_0_4px_rgba(0,0,0,0.02)] transition-all duration-200 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
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

        {/* Navigation Links with Categorized Sections */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isSidebarCollapsed && (
                <span className="px-3 text-[10px] font-bold text-[#89949A] dark:text-[#718A80] uppercase tracking-wider block mb-1">
                  {section.title}
                </span>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center ${
                        isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                      } rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] font-bold border-r-3 border-[#0B5D43] dark:border-[#3E9B78] shadow-2xs'
                          : 'text-[#5F6B73] dark:text-[#A3C7B9] hover:text-[#122B23] dark:hover:text-[#F4F8F6] hover:bg-[#F4F8F6] dark:hover:bg-[#153B2E]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Info */}
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
                <div className="text-xs font-bold text-[#122B23] dark:text-[#F4F8F6] truncate">{user?.fullName || 'مدير المدرسة'}</div>
                <div className="text-[10px] text-[#5F6B73] dark:text-[#A3C7B9] truncate font-mono">admin@mowathib.edu</div>
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
          <div className="relative w-64 bg-white dark:bg-[#122B23] h-full flex flex-col z-10 border-l border-[#DCE3E6] dark:border-[#1E4638] shadow-xl transition-colors duration-150">
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
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {navSections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1">
                  <span className="px-3 text-[10px] font-bold text-[#89949A] dark:text-[#6E7F87] uppercase tracking-wider block mb-1">
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
                              ? 'bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] font-bold border-r-3 border-[#245B63] dark:border-[#388B96]'
                              : 'text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#17252B] dark:hover:text-[#F0F4F6]'
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
            <div className="p-3 border-t border-[#DCE3E6] dark:border-[#1E4638]">
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
        {/* Top Header */}
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
            <div className="flex items-center gap-2 flex-wrap">
              {/* Academic Year Badge */}
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B5D43] dark:text-[#3E9B78] bg-[#E8F5F0] dark:bg-[#1A3B31] px-2.5 py-1 rounded-md border border-[#D8E5DF] dark:border-[#1E4638]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5D43] dark:bg-[#3E9B78] animate-pulse"></span>
                <span className="hidden xs:inline">{activeYear?.yearName ? `العام الدراسي ${activeYear.yearName}` : 'العام الدراسي 1448-1449هـ'}</span>
                <span className="xs:hidden">{activeYear?.yearName || '1448-1449هـ'}</span>
              </span>

              {/* Current Week Number Badge */}
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#245B63] dark:text-[#388B96] bg-[#E8F1F1] dark:bg-[#19383E] px-2.5 py-1 rounded-md border border-[#245B63]/25 dark:border-[#388B96]/30 shadow-2xs">
                <Calendar className="w-3.5 h-3.5" />
                <span>{currentWeekNumber ? `الأسبوع ${currentWeekNumber}` : 'الأسبوع الدراسي'}</span>
              </span>

              <span className="text-xs text-[#89949A] dark:text-[#718A80] hidden sm:inline">|</span>
              <span className="text-xs text-[#5F6B73] dark:text-[#A3C7B9] hidden sm:inline font-medium">{schoolName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            <div className="h-4 w-px bg-[#DCE3E6] dark:bg-[#28373D] hidden sm:block" />
            <div
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate('/admin/settings')}
            >
              <div className="w-8 h-8 rounded-full bg-[#245B63] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#E8F1F1] dark:ring-[#19383E]">
                م
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-xs font-bold text-[#17252B] dark:text-[#F0F4F6] block leading-tight">{user?.fullName || 'مدير المدرسة'}</span>
                <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">مسؤول النظام</span>
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
