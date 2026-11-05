import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return <Loader2 className={cn('animate-spin text-[#245B63]', sizes[size], className)} />;
}

export function LoadingState({ message = 'جاري تحميل البيانات...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3 text-[#5F6B73]">
      <Spinner size="lg" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function EmptyState({
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على أي عناصر مطابقة في الوقت الحالي.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-[#DCE3E6] my-4">
      <h4 className="text-base font-semibold text-[#17252B] mb-1">{title}</h4>
      <p className="text-sm text-[#5F6B73] max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

