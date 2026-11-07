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
    <div className={cn('bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors', className)}>
      {label && (
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#245B63] dark:bg-[#388B96]" />
          <span className="text-xs font-bold text-[#17252B] dark:text-[#F0F4F6]">{label}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EEF2F3] dark:bg-[#212E33] text-[#17252B] dark:text-[#F0F4F6] border border-[#DCE3E6]/60 dark:border-[#28373D]">
          <span className="text-[#5F6B73] dark:text-[#9BAAB1]">الطلاب:</span>
          <span className="font-mono font-bold text-xs">{totalStudents}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] border border-[#B7DEC5] dark:border-[#1B4D32]">
          <span>حاضر:</span>
          <span className="font-mono font-bold text-xs">{presentCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] border border-[#F1C3C3] dark:border-[#592226]">
          <span>غائب:</span>
          <span className="font-mono font-bold text-xs">{absentCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] border border-[#EDD38C] dark:border-[#594218]">
          <span>منقطع:</span>
          <span className="font-mono font-bold text-xs">{discontinuedCount}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F1F3F5] dark:bg-[#1E292D] text-[#59636E] dark:text-[#9BAAB1] border border-[#D9DEE3] dark:border-[#2C3C43]">
          <span>غير محدد:</span>
          <span className="font-mono font-bold text-xs">{unmarkedCount}</span>
        </div>
      </div>
    </div>
  );
}

export default AttendanceProgressSummary;
