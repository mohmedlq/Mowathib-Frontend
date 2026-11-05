import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from '../features/auth';
import { NotificationsProvider } from '../features/notifications';
import { router } from './router';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <NotificationsProvider>
          <RouterProvider router={router} />
        </NotificationsProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

