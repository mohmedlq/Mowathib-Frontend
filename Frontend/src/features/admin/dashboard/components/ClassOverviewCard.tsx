import { useMemo } from 'react';
import type { ClassItem, Representative } from '../../../../shared/types';
import { ArrowUpRight, Users, UserCheck, CreditCard } from 'lucide-react';
import { cn } from '../../../../shared/utils/cn';

export interface ClassOverviewCardProps {
  classItem: ClassItem;
  enrolledCount?: number;
  attendanceRate?: number;
  representatives: Representative[];
  onClick: () => void;
}

export function ClassOverviewCard({
  classItem,
  enrolledCount,
  attendanceRate,
  representatives,
  onClick,
}: ClassOverviewCardProps) {
  // Find assigned representative & deputy for this class
  const { mainRep, depRep } = useMemo(() => {
    const classReps = representatives.filter(
      (r) =>
        r.className === classItem.className ||
        r.username.startsWith(`${classItem.classId}_`)
    );

    const main = classReps.find(
      (r) => r.role === 'Representative' || r.username.endsWith('_1')
    );
    const deputy = classReps.find(
      (r) => r.role === 'Deputy' || r.username.endsWith('_2')
    );

    return { mainRep: main, depRep: deputy };
  }, [classItem, representatives]);

  // Determine Grade name from class numbering
  const gradeLabel = useMemo(() => {
    const cid = classItem.classId;
    if (cid >= 101 && cid <= 110) return 'الأول الثانوي';
    if (cid >= 201 && cid <= 210) return 'الثاني الثانوي';
    if (cid >= 301 && cid <= 310) return 'الثالث الثانوي';
    return 'شعبة دراسية';
  }, [classItem.classId]);

  // Rate color calculation
  const rateConfig = useMemo(() => {
    if (attendanceRate === undefined || attendanceRate === null) {
      return {
        text: 'غير متوفر',
        badgeClass: 'bg-[#F5F7F8] text-[#89949A] border-[#DCE3E6]',
      };
    }
    if (attendanceRate >= 92) {
      return {
        text: `${attendanceRate.toFixed(1)}%`,
        badgeClass: 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5]',
      };
    }
    if (attendanceRate >= 80) {
      return {
        text: `${attendanceRate.toFixed(1)}%`,
        badgeClass: 'bg-[#FFF4DA] text-[#855500] border-[#EDD38C]',
      };
    }
    return {
      text: `${attendanceRate.toFixed(1)}%`,
      badgeClass: 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]',
    };
  }, [attendanceRate]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-white rounded-xl border border-[#DCE3E6] hover:border-[#245B63] p-4.5 transition-all cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-sm select-none"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-[#17252B] group-hover:text-[#245B63] transition-colors">
              {classItem.className}
            </span>
            <span className="text-[10px] text-[#5F6B73] px-2 py-0.5 rounded bg-[#F5F7F8] border border-[#EEF2F3] font-medium">
              {gradeLabel}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#F5F7F8] group-hover:bg-[#E8F1F1] text-[#89949A] group-hover:text-[#245B63] flex items-center justify-center transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-[#FAFCFD] border border-[#EEF2F3] text-xs">
          <div>
            <span className="text-[11px] text-[#5F6B73] block mb-0.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#89949A]" />
              <span>الطلاب:</span>
            </span>
            <span className="font-mono font-bold text-[#17252B]">
              {enrolledCount !== undefined ? `${enrolledCount} طالب` : '32 طالب'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[#5F6B73] block mb-0.5 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-[#89949A]" />
              <span>نسبة الحضور:</span>
            </span>
            <span
              className={cn(
                'inline-block px-1.5 py-0.2 rounded font-mono font-bold text-[11px] border',
                rateConfig.badgeClass
              )}
            >
              {rateConfig.text}
            </span>
          </div>
        </div>

        {/* Representatives Section */}
        <div className="space-y-1.5 text-[11px] border-t border-[#EEF2F3] pt-2.5">
          <div className="flex items-center justify-between text-[#5F6B73]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#245B63]"></span>
              <span>العريف:</span>
            </span>
            <span className="font-medium text-[#17252B] truncate max-w-[120px]">
              {mainRep?.studentName || (
                <span className="text-[#89949A] font-normal italic">معين ({classItem.classId}_1)</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#5F6B73]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#89949A]"></span>
              <span>النائب:</span>
            </span>
            <span className="font-medium text-[#17252B] truncate max-w-[120px]">
              {depRep?.studentName || (
                <span className="text-[#89949A] font-normal italic">معين ({classItem.classId}_2)</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-[#EEF2F3] flex items-center justify-between text-[11px] text-[#89949A]">
        <span className="flex items-center gap-1">
          <CreditCard className="w-3.5 h-3.5" />
          <span>بطاقات الاستئذان:</span>
        </span>
        <span className="font-mono font-bold text-[#5F6B73]">
          {classItem.totalCards}
        </span>
      </div>
    </div>
  );
}

export default ClassOverviewCard;

