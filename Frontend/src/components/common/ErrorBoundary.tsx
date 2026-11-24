import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F4F8F6] dark:bg-[#0D1E18] text-[#122B23] dark:text-[#F4F8F6] flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
          <div className="max-w-md w-full bg-white dark:bg-[#122B23] p-8 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-center">
              <BrandLogo variant="wordmark" className="h-14 w-auto" />
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-[#17252B] dark:text-[#F0F4F6]">
                حدث خطأ غير متوقع في النظام
              </h1>
              <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] leading-relaxed">
                نعتذر عن هذا الخلل المؤقت. بياناتك المدرسية وسجلاتك محفوظة بأمان. يمكنك إعادة تحميل الصفحة للعودة للعمل بشكل طبيعي.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B5D43] hover:bg-[#084733] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل الصفحة</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#F5F7F8] dark:bg-[#1A3B31] text-[#17252B] dark:text-[#F0F4F6] border border-[#DCE3E6] dark:border-[#1E4638] hover:bg-[#EAF3EE] text-xs font-bold transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>الصفحة الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
