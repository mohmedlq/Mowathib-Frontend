
import { useMemo, useState } from 'react';
import type { StudentWeeklyAttendance } from '../types/attendance.types';
import { SCHOOL_DAYS, getPeriodsForDay, type AttendanceStatus } from '../../../shared/types';
import { AttendanceDayCell } from './AttendanceDayCell';
import { AttendanceLegend } from './AttendanceLegend';
import { Search, Filter } from 'lucide-react';
import { calculateDateForDay, formatArabicDateShort } from '../../../shared/utils/date';

export interface AttendanceTableProps {
  attendances: StudentWeeklyAttendance[];
  weekStartDate?: string;
  onSlotSelect?: (
    enrollmentId: number,
    dayNumber: number,
    periodNumber: number
  ) => void;
  interactive?: boolean;
}

export function AttendanceTable({
  attendances,
  weekStartDate,
  onSlotSelect,
  interactive = true,
}: AttendanceTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | AttendanceStatus
  >('all');

  const filteredList = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return attendances.filter((item) => {
      // Search by student name or national ID
      const studentName = (item.enrollment.studentName ?? '').toLowerCase();
      const nationalId = String(
        item.enrollment.student?.nationalId ?? ''
      ).toLowerCase();

      const matchesSearch =
        normalizedQuery === '' ||
        studentName.includes(normalizedQuery) ||
        nationalId.includes(normalizedQuery);

      if (!matchesSearch) return false;

      // Show all students when no status filter is selected
      if (statusFilter === 'all') return true;

      // Show students who have at least one slot matching the selected status
      return Object.values(item.slots ?? {}).some((daySlots) =>
        Object.values(daySlots ?? {}).some(
          (slot) => slot?.status === statusFilter
        )
      );
    });
  }, [attendances, searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو رقم الهوية الوطنية..."
            className="w-full h-9.5 pr-9 pl-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg focus:bg-white focus:border-[#245B63] focus:ring-2 focus:ring-[#245B63]/15 outline-none transition-all placeholder:text-[#89949A]"
          />

          <Search className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[#5F6B73] font-semibold text-xs flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#89949A]" />
              <span>تصفية:</span>
            </span>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | AttendanceStatus)
              }
              className="h-9 px-3 bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg text-xs text-[#17252B] font-medium outline-none cursor-pointer hover:border-[#245B63] transition-colors"
            >
              <option value="all">جميع الحالات</option>
              <option value="Absent">الطلاب ذوو الغياب</option>
              <option value="Discontinued">المنقطعون عن الدراسة</option>
              <option value="Unmarked">غير المكتمل تحضيرهم</option>
            </select>
          </div>

          <span className="text-xs text-[#245B63] bg-[#E8F1F1] font-mono font-bold px-2.5 py-1 rounded-md border border-[#CDE0E2] shrink-0">
            {filteredList.length} من {attendances.length} طالب
          </span>
        </div>
      </div>

      {/* Main Weekly Attendance Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-[#DCE3E6] bg-white shadow-xs">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-[#F5F7F8] text-[#17252B] border-b border-[#DCE3E6] select-none">
              <th className="sticky right-0 z-10 bg-[#F5F7F8] px-3.5 py-3 font-bold border-l border-[#DCE3E6] w-28 whitespace-nowrap shadow-[1px_0_0_#DCE3E6]">
                رقم الهوية
              </th>

              <th className="sticky right-28 z-10 bg-[#F5F7F8] px-4 py-3 font-bold border-l border-[#DCE3E6] min-w-[180px] whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                اسم الطالب
              </th>

              {SCHOOL_DAYS.map((day) => {
                const dayDate = weekStartDate
                  ? calculateDateForDay(weekStartDate, day.dayNumber)
                  : null;

                return (
                  <th
                    key={day.dayNumber}
                    className="px-3 py-2.5 text-center font-bold border-l border-[#DCE3E6] min-w-[215px] last:border-l-0"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-[#17252B]">
                        {day.nameAr}
                      </span>

                      {dayDate && (
                        <span className="text-[10px] text-[#5F6B73] font-mono mt-0.5 font-normal">
                          {formatArabicDateShort(dayDate)}
                        </span>
                      )}

                      <div className="flex items-center justify-center gap-1 mt-1 text-[9px] text-[#89949A] font-mono">
                        {getPeriodsForDay(day.dayNumber).map((period) => (
                          <span key={period} className="w-5 text-center">{period}</span>
                        ))}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#EEF2F3]">
            {filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={2 + SCHOOL_DAYS.length}
                  className="px-6 py-14 text-center text-[#89949A] text-xs"
                >
                  لا توجد نتائج مطابقة لبحثك في هذه الشعبة
                </td>
              </tr>
            ) : (
              filteredList.map((item, idx) => (
                <tr
                  key={item.enrollment.enrollmentId}
                  className={`transition-colors ${
                    idx % 2 === 0
                      ? 'bg-white hover:bg-[#F5F9F9]'
                      : 'bg-[#FAFCFD] hover:bg-[#F5F9F9]'
                  }`}
                >
                  {/* Sticky National ID */}
                  <td className="sticky right-0 z-10 bg-inherit px-3.5 py-2.5 font-mono text-[11px] text-[#5F6B73] border-l border-[#EEF2F3] whitespace-nowrap shadow-[1px_0_0_#DCE3E6]">
                    {item.enrollment.student?.nationalId ?? '—'}
                  </td>

                  {/* Sticky Student Name + Public Name Tag */}
                  <td className="sticky right-28 z-10 bg-inherit px-4 py-2.5 font-medium text-[#17252B] border-l border-[#EEF2F3] whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {item.enrollment.studentName}
                      </span>
                    </div>
                  </td>

                  {/* Attendance Days */}
                  {SCHOOL_DAYS.map((day) => {
                    const daySlots = item.slots[day.dayNumber] || {};

                    return (
                      <td
                        key={day.dayNumber}
                        className="px-2 py-2 text-center border-l border-[#EEF2F3] last:border-l-0"
                      >
                        <AttendanceDayCell
                          dayNumber={day.dayNumber}
                          periodStatuses={daySlots}
                          interactive={interactive}
                          onPeriodClick={(period) =>
                            onSlotSelect?.(
                              item.enrollment.enrollmentId,
                              day.dayNumber,
                              period
                            )
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Attendance Legend */}
      <div className="bg-white p-3.5 rounded-xl border border-[#DCE3E6] shadow-2xs">
        <AttendanceLegend />
      </div>
    </div>
  );
}

export default AttendanceTable;
