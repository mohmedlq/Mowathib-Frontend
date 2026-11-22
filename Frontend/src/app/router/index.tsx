import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { AdminLayout } from '../layouts/AdminLayout';
import { RepresentativeLayout } from '../layouts/RepresentativeLayout';
import { ClerkLayout } from '../layouts/ClerkLayout';

// Auth Pages
import { AdminLoginPage, RepresentativeLoginPage, ClerkLoginPage } from '../../features/auth';

// Lazy Admin Pages
const AdminDashboardPage = React.lazy(() => import('../../features/admin/dashboard/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminAttendancePage = React.lazy(() => import('../../features/admin/attendance/pages/AdminAttendancePage').then(m => ({ default: m.AdminAttendancePage })));
const AdminClassesPage = React.lazy(() => import('../../features/admin/classes/pages/AdminClassesPage').then(m => ({ default: m.AdminClassesPage })));
const AdminStudentsPage = React.lazy(() => import('../../features/admin/students/pages/AdminStudentsPage').then(m => ({ default: m.AdminStudentsPage })));
const AdminRepresentativesPage = React.lazy(() => import('../../features/admin/representatives/pages/AdminRepresentativesPage').then(m => ({ default: m.AdminRepresentativesPage })));
const AdminAcademicYearsPage = React.lazy(() => import('../../features/admin/academic-years/pages/AdminAcademicYearsPage').then(m => ({ default: m.AdminAcademicYearsPage })));
const AdminCardsPage = React.lazy(() => import('../../features/admin/cards/pages/AdminCardsPage').then(m => ({ default: m.AdminCardsPage })));
const AdminCardRequestsPage = React.lazy(() => import('../../features/admin/card-requests/pages/AdminCardRequestsPage').then(m => ({ default: m.AdminCardRequestsPage })));
const AdminSettingsPage = React.lazy(() => import('../../features/admin/settings/pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const AdminMonthlyPreparationPage = React.lazy(() => import('../../features/admin/monthly-preparation/pages/AdminMonthlyPreparationPage').then(m => ({ default: m.AdminMonthlyPreparationPage })));
const AdminWeeklyPreparationPage = React.lazy(() => import('../../features/admin/weekly-preparation/pages/AdminWeeklyPreparationPage').then(m => ({ default: m.AdminWeeklyPreparationPage })));
const AdminAcademicWeeksPage = React.lazy(() => import('../../features/admin/academic-weeks/pages/AdminAcademicWeeksPage').then(m => ({ default: m.AdminAcademicWeeksPage })));
const AdminSendNotificationsPage = React.lazy(() => import('../../features/admin/send-notifications/pages/AdminSendNotificationsPage').then(m => ({ default: m.AdminSendNotificationsPage })));
const AdminSchoolSettingsPage = React.lazy(() => import('../../features/admin/school-settings/pages/AdminSchoolSettingsPage').then(m => ({ default: m.AdminSchoolSettingsPage })));
const AdminProfilePage = React.lazy(() => import('../../features/admin/profile/pages/AdminProfilePage').then(m => ({ default: m.AdminProfilePage })));

// Lazy Report Center
const ReportCenterPage = React.lazy(() => import('../../features/reports/pages/ReportCenterPage').then(m => ({ default: m.ReportCenterPage })));

// Lazy Representative Pages
const RepresentativeDashboardPage = React.lazy(() => import('../../features/representative/dashboard/pages/RepresentativeDashboardPage').then(m => ({ default: m.RepresentativeDashboardPage })));
const RepresentativeAttendancePage = React.lazy(() => import('../../features/representative/attendance/pages/RepresentativeAttendancePage').then(m => ({ default: m.RepresentativeAttendancePage })));
const RepresentativeAttendanceHistoryPage = React.lazy(() => import('../../features/representative/attendance-history/pages/RepresentativeAttendanceHistoryPage').then(m => ({ default: m.RepresentativeAttendanceHistoryPage })));
const RepresentativeStudentsPage = React.lazy(() => import('../../features/representative/students/pages/RepresentativeStudentsPage').then(m => ({ default: m.RepresentativeStudentsPage })));
const RepresentativeDeputyPage = React.lazy(() => import('../../features/representative/deputy/pages/RepresentativeDeputyPage').then(m => ({ default: m.RepresentativeDeputyPage })));
const RepresentativeCardRequestsPage = React.lazy(() => import('../../features/representative/card-requests/pages/RepresentativeCardRequestsPage').then(m => ({ default: m.RepresentativeCardRequestsPage })));
const RepresentativeProfilePage = React.lazy(() => import('../../features/representative/profile/pages/RepresentativeProfilePage').then(m => ({ default: m.RepresentativeProfilePage })));

// Lazy Clerk Pages
const ClerkDashboardPage = React.lazy(() => import('../../features/clerk/dashboard/pages/ClerkDashboardPage').then(m => ({ default: m.ClerkDashboardPage })));
const ClerkAttendancePage = React.lazy(() => import('../../features/clerk/attendance/pages/ClerkAttendancePage').then(m => ({ default: m.ClerkAttendancePage })));
const ClerkStudentsPage = React.lazy(() => import('../../features/clerk/students/pages/ClerkStudentsPage').then(m => ({ default: m.ClerkStudentsPage })));

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
  if (user.role === 'AttendanceClerk') {
    return <Navigate to="/clerk/dashboard" replace />;
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
    if (user.role === 'AttendanceClerk') {
      return <Navigate to="/clerk/dashboard" replace />;
    }
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
    if (user.role === 'AttendanceClerk') {
      return <Navigate to="/clerk/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
}

// Guard: Clerk routes
function ClerkRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/clerk/login" replace />;
  }
  if (user.role !== 'AttendanceClerk') {
    if (user.role === 'Admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/representative/dashboard" replace />;
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
  {
    path: '/clerk/login',
    element: <ClerkLoginPage />,
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
      { path: 'send-notifications', element: <AdminSendNotificationsPage /> },
      { path: 'classes', element: <AdminClassesPage /> },
      { path: 'academic-weeks', element: <AdminAcademicWeeksPage /> },
      { path: 'students', element: <AdminStudentsPage /> },
      { path: 'representatives', element: <AdminRepresentativesPage /> },
      { path: 'academic-years', element: <AdminAcademicYearsPage /> },
      { path: 'cards', element: <AdminCardsPage /> },
      { path: 'card-requests', element: <AdminCardRequestsPage /> },
      { path: 'school-settings', element: <AdminSchoolSettingsPage /> },
      { path: 'profile', element: <AdminProfilePage /> },
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

  // Attendance Clerk Portal Routes
  {
    path: '/clerk',
    element: (
      <ClerkRoute>
        <ClerkLayout />
      </ClerkRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/clerk/dashboard" replace /> },
      { path: 'dashboard', element: <ClerkDashboardPage /> },
      { path: 'attendance', element: <ClerkAttendancePage /> },
      { path: 'students', element: <ClerkStudentsPage /> },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
