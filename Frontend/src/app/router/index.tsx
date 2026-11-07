import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { AdminLayout } from '../layouts/AdminLayout';
import { RepresentativeLayout } from '../layouts/RepresentativeLayout';

// Auth Pages
import { AdminLoginPage, RepresentativeLoginPage } from '../../features/auth';

// Admin Pages
import {
  AdminDashboardPage,
  AdminAttendancePage,
  AdminClassesPage,
  AdminStudentsPage,
  AdminRepresentativesPage,
  AdminAcademicYearsPage,
  AdminCardsPage,
  AdminCardRequestsPage,
  AdminSettingsPage,
  AdminMonthlyPreparationPage,
  AdminWeeklyPreparationPage,
  AdminAcademicWeeksPage,
} from '../../features/admin';

// Report Center
import { ReportCenterPage } from '../../features/reports';

// Representative Pages
import {
  RepresentativeDashboardPage,
  RepresentativeAttendancePage,
  RepresentativeAttendanceHistoryPage,
  RepresentativeStudentsPage,
  RepresentativeDeputyPage,
  RepresentativeCardRequestsPage,
  RepresentativeProfilePage,
} from '../../features/representative';

// Landing Page
import { LandingPage } from '../../components/landing';

// Guard: Root index redirect
function RootIndexRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <LandingPage />;
  }
  if (user.role === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/representative/dashboard" replace />;
}

// Guard: Admin routes
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (user.role !== 'Admin') {
    return <Navigate to="/representative/dashboard" replace />;
  }
  return <>{children}</>;
}

// Guard: Representative routes
function RepresentativeRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/representative/login" replace />;
  }
  if (user.role !== 'Representative' && user.role !== 'Deputy') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootIndexRedirect />,
  },
  {
    path: '/landing',
    element: <LandingPage />,
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/representative/login',
    element: <RepresentativeLoginPage />,
  },

  // Admin Portal Routes
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'attendance', element: <AdminAttendancePage /> },
      { path: 'monthly-preparation', element: <AdminMonthlyPreparationPage /> },
      { path: 'weekly-preparation', element: <AdminWeeklyPreparationPage /> },
      { path: 'reports', element: <ReportCenterPage /> },
      { path: 'classes', element: <AdminClassesPage /> },
      { path: 'academic-weeks', element: <AdminAcademicWeeksPage /> },
      { path: 'students', element: <AdminStudentsPage /> },
      { path: 'representatives', element: <AdminRepresentativesPage /> },
      { path: 'academic-years', element: <AdminAcademicYearsPage /> },
      { path: 'cards', element: <AdminCardsPage /> },
      { path: 'card-requests', element: <AdminCardRequestsPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
    ],
  },

  // Representative Portal Routes
  {
    path: '/representative',
    element: (
      <RepresentativeRoute>
        <RepresentativeLayout />
      </RepresentativeRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/representative/dashboard" replace /> },
      { path: 'dashboard', element: <RepresentativeDashboardPage /> },
      { path: 'daily-attendance', element: <RepresentativeAttendancePage /> },
      { path: 'attendance', element: <RepresentativeAttendancePage /> },
      { path: 'weekly-attendance', element: <RepresentativeAttendanceHistoryPage /> },
      { path: 'attendance-history', element: <RepresentativeAttendanceHistoryPage /> },
      { path: 'students', element: <RepresentativeStudentsPage /> },
      { path: 'deputy', element: <RepresentativeDeputyPage /> },
      { path: 'card-requests', element: <RepresentativeCardRequestsPage /> },
      { path: 'profile', element: <RepresentativeProfilePage /> },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

