import { Suspense, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  CalendarCheck2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  User,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';

import { useAuth, ChangePasswordModal } from '../../features/auth';
import { ThemeToggle } from '../../shared/components/ui/ThemeToggle';
import { BrandLogo } from '../../components/common/BrandLogo';
import { MuwathibLoading } from '../../shared/components/ui/Spinner';

// =============================================================================
// Navigation Configuration
// =============================================================================

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

function getNavItems(isMainRep: boolean): NavItem[] {
  return [
    { to: '/representative/dashboard', label: 'لوحة المتابعة', icon: LayoutDashboard },
    { to: '/representative/daily-attendance', label: 'رصد الحضور اليومي', icon: CalendarCheck },
    { to: '/representative/weekly-attendance', label: 'السجل الأسبوعي', icon: CalendarCheck2 },
    { to: '/representative/students', label: 'طلاب الشعبة', icon: GraduationCap },
    ...(isMainRep
      ? [{ to: '/representative/deputy', label: 'نائب العريف', icon: UserCheck }]
      : []),
    { to: '/representative/profile', label: 'الملف الشخصي', icon: User },
  ];
}

// =============================================================================
// Shared Navigation List
// =============================================================================

function RepresentativeNav({
  items,
  collapsed = false,
  onNavigate,
}: {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="قائمة مهام العريف" className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-extrabold tracking-wide text-[#84958B] dark:text-[#829B8C]">
          مهام عريف الشعبة
        </p>
      )}

      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex min-h-10 items-center gap-3 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#438A69] ${
                collapsed ? 'justify-center px-2' : 'px-3'
              } ${
                isActive
                  ? 'bg-[#E8F3EC] text-[#176B4B] shadow-2xs dark:bg-[#1E3A2C] dark:text-[#A4D7B9]'
                  : 'text-[#63746A] hover:bg-[#F3F7F4] hover:text-[#20392C] dark:text-[#AEC2B5] dark:hover:bg-[#1B3025] dark:hover:text-[#F0F7F3]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute bottom-2 right-0 top-2 w-[3px] rounded-l-full bg-[#238052] dark:bg-[#79C79A]" />
                )}
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    isActive
                      ? 'text-[#176B4B] dark:text-[#A4D7B9]'
                      : 'text-[#83938A] group-hover:text-[#347456] dark:text-[#91A99A] dark:group-hover:text-[#A4D7B9]'
                  }`}
                />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                {!collapsed && isActive && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#238052] dark:bg-[#79C79A]" />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

// =============================================================================
// Main Layout
// =============================================================================

export function RepresentativeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isMainRep = user?.role === 'Representative';
  const navItems = useMemo(() => getNavItems(isMainRep), [isMainRep]);

  const currentPage = useMemo(() => {
    return (
      navItems.find(
        (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
      ) ?? navItems[0]
    );
  }, [navItems, location.pathname]);

  const displayName = user?.fullName || user?.username || 'عريف الشعبة';
  const roleLabel = isMainRep ? 'العريف الأساسي' : 'نائب العريف';
  const classLabel =
    user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'الشعبة الدراسية');
  const avatarInitial = displayName.trim().charAt(0) || 'ع';

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen bg-[#F4F7F5] text-[#20362B] selection:bg-[#23764F] selection:text-white transition-colors duration-200 dark:bg-[#0E1712] dark:text-[#EAF3ED]"
    >
      {/* Must Change Password Modal */}
      {user?.mustChangePassword && <ChangePasswordModal isOpen={true} />}

      {/* Desktop Sidebar */}
      <aside
        className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-l border-[#DCE7E1] bg-white shadow-[0_0_24px_rgba(25,55,39,0.035)] transition-[width] duration-200 dark:border-[#263D30] dark:bg-[#14221A] md:flex ${
          isSidebarCollapsed ? 'w-[80px]' : 'w-[260px]'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`flex h-[72px] shrink-0 items-center border-b border-[#E8EFEB] px-4 dark:border-[#263D30] ${
            isSidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {isSidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="rounded-xl p-1 transition hover:bg-[#F1F6F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#438A69] dark:hover:bg-[#20372A]"
              title="توسيع القائمة"
              aria-label="توسيع القائمة الجانبية"
            >
              <BrandLogo collapsed className="h-9 w-9 object-contain" alt="مواظب" />
            </button>
          ) : (
            <>
              <BrandLogo
                autoTheme
                className="h-9 max-w-[160px] object-contain"
                alt="شعار منصة مواظب"
              />
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="rounded-lg p-2 text-[#71857A] transition hover:bg-[#F1F6F2] hover:text-[#285D42] dark:text-[#91A99A] dark:hover:bg-[#20372A] dark:hover:text-[#B7E0C5]"
                title="طي القائمة الجانبية"
                aria-label="طي القائمة الجانبية"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Assigned Class Context Card */}
        {!isSidebarCollapsed && (
          <div className="mx-3 mt-4 rounded-xl border border-[#DCE9E1] bg-[#F4F9F5] p-3 dark:border-[#2C4937] dark:bg-[#192A20]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#176B4B] shadow-2xs dark:bg-[#243E2F] dark:text-[#A4D7B9]">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-[#20362B] dark:text-[#EAF3ED]">
                  {classLabel}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-[#647C70] dark:text-[#9AB0A1]">
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>
        )}

        <RepresentativeNav items={navItems} collapsed={isSidebarCollapsed} />

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-[#E8EFEB] p-3 dark:border-[#263D30]">
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="rounded-lg p-2 text-[#71857A] transition hover:bg-[#F1F6F2] dark:text-[#91A99A] dark:hover:bg-[#20372A]"
                title="توسيع القائمة"
                aria-label="توسيع القائمة"
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-[#8A9690] transition hover:bg-[#FCEDEC] hover:text-[#A83E3E] dark:text-[#91A99A] dark:hover:bg-[#3A2423] dark:hover:text-[#F49A93]"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-[#E5ECE8] bg-[#FAFCFA] p-2 dark:border-[#2A4032] dark:bg-[#19291F]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCEDE2] text-sm font-black text-[#176B4B] dark:bg-[#294936] dark:text-[#B5E0C5]">
                {avatarInitial}
              </div>
              <button
                type="button"
                onClick={() => navigate('/representative/profile')}
                className="min-w-0 flex-1 text-right"
              >
                <span className="block truncate text-xs font-extrabold text-[#294337] dark:text-[#E2F0E7]">
                  {displayName}
                </span>
                <span className="mt-0.5 block text-[10px] text-[#829188] dark:text-[#9AB0A1]">
                  {roleLabel}
                </span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-[#8A9690] transition hover:bg-[#FCEDEC] hover:text-[#A83E3E] dark:text-[#91A99A] dark:hover:bg-[#3A2423] dark:hover:text-[#F49A93]"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="القائمة الرئيسية"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#08130D]/55 backdrop-blur-[2px]"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="إغلاق القائمة"
          />
          <aside className="absolute bottom-0 right-0 top-0 flex w-[min(84vw,300px)] flex-col border-l border-[#DCE7E1] bg-white shadow-2xl dark:border-[#263D30] dark:bg-[#14221A]">
            <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#E8EFEB] px-4 dark:border-[#263D30]">
              <BrandLogo
                autoTheme
                className="h-9 max-w-[155px] object-contain"
                alt="شعار مواظب"
              />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 text-[#71857A] hover:bg-[#F1F6F2] dark:text-[#91A99A] dark:hover:bg-[#20372A]"
                aria-label="إغلاق القائمة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-3 mt-3 rounded-xl border border-[#DCE9E1] bg-[#F4F9F5] px-3 py-2.5 dark:border-[#2C4937] dark:bg-[#192A20]">
              <p className="text-xs font-extrabold text-[#20362B] dark:text-[#EAF3ED]">
                {classLabel}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#647C70] dark:text-[#9AB0A1]">
                {displayName} · {roleLabel}
              </p>
            </div>

            <RepresentativeNav
              items={navItems}
              onNavigate={() => setIsMobileMenuOpen(false)}
            />

            <div className="border-t border-[#E8EFEB] p-3 dark:border-[#263D30]">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FCEDEC] px-4 py-3 text-xs font-extrabold text-[#A83E3E] transition hover:bg-[#F8DDDA] dark:bg-[#3A2423] dark:text-[#F49A93] dark:hover:bg-[#4A2B29]"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[#DCE7E1] bg-white/95 backdrop-blur-md dark:border-[#263D30] dark:bg-[#14221A]/95">
          <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-xl border border-[#E0E9E3] p-2 text-[#476A56] transition hover:bg-[#F1F6F2] dark:border-[#304A38] dark:text-[#A4D7B9] dark:hover:bg-[#20372A] md:hidden"
                aria-label="فتح القائمة الجانبية"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center md:hidden">
                <BrandLogo variant="favicon" className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-extrabold text-[#20362B] dark:text-[#EAF3ED] sm:text-base">
                    {currentPage.label}
                  </h1>
                  <span className="shrink-0 rounded-lg border border-[#D9E7DE] bg-[#F1F7F3] px-2.5 py-0.5 text-[11px] font-bold text-[#176B4B] dark:border-[#315540] dark:bg-[#1B3324] dark:text-[#A4D7B9]">
                    {classLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />

              <div className="hidden h-5 w-px bg-[#E1EAE4] dark:bg-[#2D4537] sm:block" />

              <button
                type="button"
                onClick={() => navigate('/representative/profile')}
                className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-[#F1F6F2] dark:hover:bg-[#20372A]"
                title="الملف الشخصي"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCEDE2] text-xs font-black text-[#176B4B] ring-2 ring-white dark:bg-[#294936] dark:text-[#B5E0C5] dark:ring-[#14221A]">
                  {avatarInitial}
                </span>
                <span className="hidden max-w-[130px] text-right sm:block">
                  <span className="block truncate text-xs font-extrabold text-[#294337] dark:text-[#E2F0E7]">
                    {displayName}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[#829188] dark:text-[#9AB0A1]">
                    {roleLabel}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <Suspense
            fallback={
              <div className="rounded-2xl border border-[#DCE7E1] bg-white p-10 dark:border-[#263D30] dark:bg-[#14221A]">
                <MuwathibLoading size="fullscreen" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        <footer className="border-t border-[#E1EAE4] bg-white/75 px-4 py-3 text-center text-[10px] text-[#87978F] dark:border-[#263D30] dark:bg-[#14221A]/75 dark:text-[#829B8C] sm:px-6">
          منصة مواظب لإدارة البيئة المدرسية · بوابة عرفاء الفصول
        </footer>
      </div>
    </div>
  );
}

export default RepresentativeLayout;