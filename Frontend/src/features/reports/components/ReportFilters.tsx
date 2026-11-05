import type { ReportFilterOptions, ReportKind } from '../types/report.types';
import type { ClassItem, AttendanceWeek } from '../../../shared/types';
import { SCHOOL_DAYS } from '../../../shared/types';
import { formatArabicDateShort } from '../../../shared/utils/date';
import { Calendar, Filter } from 'lucide-react';

export interface ReportFiltersProps {
  filters: ReportFilterOptions;
  onChange: (updated: Partial<ReportFilterOptions>) => void;
  classes: ClassItem[];
  weeks: AttendanceWeek[];
  isAdmin?: boolean;
}

export function ReportFilters({ filters, onChange, classes, weeks, isAdmin = true }: ReportFiltersProps) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#EEF2F3] pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#17252B]">
          <Filter className="w-4 h-4 text-[#245B63]" />
          <span>تحديد نوع ومعايير التقرير</span>
        </div>

        {/* Period Selector Tabs: Daily, Weekly, Monthly */}
        <div className="flex items-center bg-[#F5F7F8] p-1 rounded-lg border border-[#DCE3E6]">
          <button
            type="button"
            onClick={() => onChange({ periodType: 'daily' })}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              filters.periodType === 'daily'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            تقرير يومي
          </button>
          <button
            type="button"
            onClick={() => onChange({ periodType: 'weekly' })}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              filters.periodType === 'weekly'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            تقرير أسبوعي
          </button>
          <button
            type="button"
            onClick={() => onChange({ periodType: 'monthly' })}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              filters.periodType === 'monthly'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            تقرير شهري
          </button>
        </div>
      </div>

      {/* Dynamic Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-right">
        {/* Report Kind: Attendance vs Absence */}
        <div>
          <label className="block text-xs font-semibold text-[#17252B] mb-1">نوع البيانات:</label>
          <select
            value={filters.reportKind}
            onChange={(e) => onChange({ reportKind: e.target.value as ReportKind })}
            className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
          >
            <option value="attendance">تقرير الحضور والغياب الشامل</option>
            <option value="absence">تقرير الغياب فقط (الحالات الفعلية)</option>
          </select>
        </div>

        {/* Class Selector (Admin can select specific class or all classes) */}
        <div>
          <label className="block text-xs font-semibold text-[#17252B] mb-1">الشعبة / الفصل:</label>
          <select
            value={filters.classId}
            onChange={(e) => onChange({ classId: Number(e.target.value) })}
            disabled={!isAdmin && filters.classId > 0}
            className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer disabled:bg-[#EEF2F3]"
          >
            {isAdmin && <option value={0}>جميع فصول المدرسة (30 شعبة)</option>}
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className}
              </option>
            ))}
          </select>
        </div>

        {/* Daily & Weekly: Week selector */}
        {(filters.periodType === 'daily' || filters.periodType === 'weekly') && (
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1">الأسبوع الدراسي:</label>
            <select
              value={filters.weekId}
              onChange={(e) => onChange({ weekId: Number(e.target.value) })}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              {weeks.map((w) => (
                <option key={w.attendanceWeekId} value={w.attendanceWeekId}>
                  الأسبوع {w.weekNumber} ({formatArabicDateShort(w.startDate)} - {formatArabicDateShort(w.endDate)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Daily Only: Day of Week selector */}
        {filters.periodType === 'daily' && (
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1">اليوم الدراسي:</label>
            <select
              value={filters.dayNumber}
              onChange={(e) => onChange({ dayNumber: Number(e.target.value) })}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              {SCHOOL_DAYS.map((d) => (
                <option key={d.dayNumber} value={d.dayNumber}>
                  {d.nameAr}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Monthly Only: Month selector */}
        {filters.periodType === 'monthly' && (
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1">الشهر الميلادي:</label>
            <div className="relative">
              <input
                type="month"
                value={filters.month}
                onChange={(e) => onChange({ month: e.target.value })}
                className="w-full h-10 px-3 bg-white text-xs font-mono font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
              />
              <Calendar className="w-4 h-4 text-[#89949A] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
