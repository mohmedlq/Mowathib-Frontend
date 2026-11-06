import { Navigate } from 'react-router-dom';

/**
 * RepresentativeAttendancePage is now integrated directly into the RepresentativeDashboardPage.
 * This redirect ensures any direct links or bookmarks route to the main dashboard.
 */
export function RepresentativeAttendancePage() {
  return <Navigate to="/representative/dashboard" replace />;
}

export default RepresentativeAttendancePage;
