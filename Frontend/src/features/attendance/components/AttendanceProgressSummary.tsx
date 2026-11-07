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
    <div
      className={cn(
        'bg-white dark:bg-[#152126] p-3.5 sm:p-4 rounded-xl border border-[#DCE3E6] dark:border-[#27383F] shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors',
        className
      )}
    >
      {label && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0B5D43] dark:bg-[#3E9B78]" />
          <span className="text-xs sm:text-sm font-bold text-[#17252B] dark:text-[#F0F4F6]">{label}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-xs font-semibold">
        {/* Total */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-[#F1F4F6] dark:bg-[#1E2C32] text-[#2E3C43] dark:text-[#E2ECF0] border border-[#D0D9DF] dark:border-[#2F424B]">
          <span className="text-[#5F6B73] dark:text-[#9BAAB1] text-[11px] sm:text-xs">الطلاب:</span>
          <span className="font-mono font-black text-xs sm:text-sm">{totalStudents}</span>
        </div>

        {/* Present */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-[#EAF6EE] dark:bg-[#133022] text-[#135A31] dark:text-[#86E0A9] border border-[#B2DEBF] dark:border-[#1F5438]">
          <span className="text-[11px] sm:text-xs">حاضر:</span>
          <span className="font-mono font-black text-xs sm:text-sm">{presentCount}</span>
        </div>

        {/* Absent */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-[#FDECEC] dark:bg-[#301619] text-[#991B1B] dark:text-[#FCA5A5] border border-[#F6B8B8] dark:border-[#5C2329]">
          <span className="text-[11px] sm:text-xs">غائب:</span>
          <span className="font-mono font-black text-xs sm:text-sm">{absentCount}</span>
        </div>

        {/* Discontinued */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-[#FFF6E5] dark:bg-[#30220F] text-[#92400E] dark:text-[#FDE047] border border-[#FDE096] dark:border-[#5E4218]">
          <span className="text-[11px] sm:text-xs">منقطع:</span>
          <span className="font-mono font-black text-xs sm:text-sm">{discontinuedCount}</span>
        </div>

        {/* Unmarked */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-[#EDF1F4] dark:bg-[#253239] text-[#3D4C54] dark:text-[#CFDAE0] border border-[#C7D2D9] dark:border-[#40545E]">
          <span className="text-[11px] sm:text-xs">غير محدد:</span>
          <span className="font-mono font-black text-xs sm:text-sm">{unmarkedCount}</span>
        </div>
      </div>
    </div>
  );
}

export default AttendanceProgressSummary;
