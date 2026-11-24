import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from '../features/auth';
import { ToastProvider } from '../features/notifications';
import { ThemeProvider } from '../shared/context/ThemeContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
