import { cn } from '../../../shared/utils/cn';

export interface AttendanceProgressSummaryProps {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  discontinuedCount: number;
  unmarkedCount: number;
  className?: string;
  label?: string;
}

export function AttendanceProgressSummary({
  totalStudents,
  presentCount,
  absentCount,
  discontinuedCount,
  unmarkedCount,
  className,
  label,
}: AttendanceProgressSummaryProps) {
  return (
    <div className={cn('bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs flex flex-wrap items-center justify-between gap-3', className)}>
      {label && (
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#245B63]" />
          <span className="text-xs font-bold text-[#17252B]">{label}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EEF2F3] text-[#17252B] border border-[#DCE3E6]/60">
          <span className="text-[#5F6B73]">الطلاب:</span>
          <span className="font-mono font-bold text-xs">{totalStudents}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E8F5EC] text-[#176B3A] border border-[#B7DEC5]">
          <span>حاضر:</span>
          <span className="font-mono font-bold text-xs">{presentCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FDECEC] text-[#A61B1B] border border-[#F1C3C3]">
          <span>غائب:</span>
          <span className="font-mono font-bold text-xs">{absentCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFF4DA] text-[#855500] border border-[#EDD38C]">
          <span>منقطع:</span>
          <span className="font-mono font-bold text-xs">{discontinuedCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F1F3F5] text-[#59636E] border border-[#D9DEE3]">
          <span>غير محدد:</span>
          <span className="font-mono font-bold text-xs">{unmarkedCount}</span>
        </div>
      </div>
    </div>
  );
}

