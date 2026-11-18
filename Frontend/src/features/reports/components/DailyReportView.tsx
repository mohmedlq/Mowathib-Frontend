import { useState, useMemo } from 'react';
import type { DailyAttendanceRow, DailyAbsenceRecord } from '../types/report.types';
import type { AttendanceStatus } from '../../../shared/types';
import { ATTENDANCE_STATUS_ARABIC } from '../../../shared/types';
import { AttendanceLegend } from '../../attendance';
import { PaginationControls } from '../../../shared/components/ui/PaginationControls';
import { Check, X, Minus, AlertCircle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export interface DailyReportViewProps {
  rows: DailyAttendanceRow[];
  absenceRecords: DailyAbsenceRecord[];
  isAbsenceOnly: boolean;
  dayName: string;
  dateStr: string;
  dayNumber?: number;
}

const statusStyles: Record<
  AttendanceStatus,
  { bg: string; text: string; border: string; icon: any; label: string }
> = {
  Present: {
    bg: 'bg-[#E8F5EC] dark:bg-[#122B1E]',
    text: 'text-[#176B3A] dark:text-[#4ADE80]',
    border: 'border-[#B7DEC5] dark:border-[#1B4D32]',
    icon: Check,
    label: ATTENDANCE_STATUS_ARABIC.Present,
  },
  Absent: {
    bg: 'bg-[#FDECEC] dark:bg-[#331518]',
    text: 'text-[#A61B1B] dark:text-[#F87171]',
    border: 'border-[#F1C3C3] dark:border-[#592226]',
    icon: X,
    label: ATTENDANCE_STATUS_ARABIC.Absent,
  },
  Discontinued: {
    bg: 'bg-[#FFF4DA] dark:bg-[#332712]',
    text: 'text-[#855500] dark:text-[#FACC15]',
    border: 'border-[#EDD38C] dark:border-[#594218]',
    icon: AlertCircle,
    label: ATTENDANCE_STATUS_ARABIC.Discontinued,
  },
  Unmarked: {
    bg: 'bg-[#F1F3F5] dark:bg-[#1E292D]',
    text: 'text-[#59636E] dark:text-[#9BAAB1]',
    border: 'border-[#D9DEE3] dark:border-[#2C3C43]',
    icon: Minus,
    label: ATTENDANCE_STATUS_ARABIC.Unmarked,
  },
};

export function DailyReportView({
  rows,
  absenceRecords,
  isAbsenceOnly,
  dayName,
  dateStr,
}: DailyReportViewProps) {
  const [absencePage, setAbsencePage] = useState(1);
  const [absencePageSize, setAbsencePageSize] = useState(15);
  const [rowsPage, setRowsPage] = useState(1);
  const [rowsPageSize, setRowsPageSize] = useState(15);

  const totalAbsencePages = Math.ceil(absenceRecords.length / absencePageSize) || 1;
  const paginatedAbsenceRecords = useMemo(() => {
    const start = (absencePage - 1) * absencePageSize;
    return absenceRecords.slice(start, start + absencePageSize);
  }, [absenceRecords, absencePage, absencePageSize]);

  const totalRowsPages = Math.ceil(rows.length / rowsPageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (rowsPage - 1) * rowsPageSize;
    return rows.slice(start, start + rowsPageSize);
  }, [rows, rowsPage, rowsPageSize]);

  if (isAbsenceOnly) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] overflow-hidden shadow-xs transition-colors">
          <div className="p-4 bg-[#FDECEC]/40 dark:bg-[#331518]/40 border-b border-[#F1C3C3] dark:border-[#592226] flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#A61B1B] dark:text-[#F87171]">
                سجل الغياب اليومي — {dayName}
              </h4>
              <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5 font-mono">{dateStr}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] border border-[#F1C3C3] dark:border-[#592226]">
              إجمالي حالات الغياب: {absenceRecords.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-[#EEF2F3] dark:bg-[#151E22] text-[#17252B] dark:text-[#F0F4F6] border-b border-[#DCE3E6] dark:border-[#28373D]">
                  <th className="px-4 py-3 font-bold">#</th>
                  <th className="px-4 py-3 font-bold">رقم الهوية</th>
                  <th className="px-4 py-3 font-bold">اسم الطالب</th>
                  <th className="px-4 py-3 font-bold">الشعبة</th>
                  <th className="px-4 py-3 font-bold">التاريخ</th>
                  <th className="px-4 py-3 font-bold">اليوم</th>
                  <th className="px-4 py-3 font-bold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3E6] dark:divide-[#28373D]">
                {absenceRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-xs text-[#176B3A] dark:text-[#4ADE80] font-semibold bg-[#E8F5EC]/20 dark:bg-[#122B1E]/20"
                    >
                      لا توجد أي حالات غياب مسجلة في هذا اليوم. جميع الطلاب حاضرون!
                    </td>
                  </tr>
                ) : (
                  paginatedAbsenceRecords.map((r, idx) => (
                    <tr key={`${r.enrollmentId}-${idx}`} className="hover:bg-[#FDECEC]/10 dark:hover:bg-[#331518]/20">
                      <td className="px-4 py-2.5 font-mono text-[#89949A]">{(absencePage - 1) * absencePageSize + idx + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-[#5F6B73] dark:text-[#9BAAB1]">{r.nationalId}</td>
                      <td className="px-4 py-2.5 font-bold text-[#17252B] dark:text-[#F0F4F6]">{r.studentName}</td>
                      <td className="px-4 py-2.5 text-[#5F6B73] dark:text-[#9BAAB1]">{r.className}</td>
                      <td className="px-4 py-2.5 font-mono text-[#5F6B73] dark:text-[#9BAAB1]">{r.date}</td>
                      <td className="px-4 py-2.5 text-[#5F6B73] dark:text-[#9BAAB1]">{r.dayName}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] border border-[#F1C3C3] dark:border-[#592226]">
                          غائب
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {absenceRecords.length > absencePageSize && (
            <div className="border-t border-[#EEF2F3] dark:border-[#28373D]">
              <PaginationControls
                pageNumber={absencePage}
                totalPages={totalAbsencePages}
                totalCount={absenceRecords.length}
                pageSize={absencePageSize}
                onPageChange={(p) => setAbsencePage(p)}
                onPageSizeChange={(s) => {
                  setAbsencePageSize(s);
                  setAbsencePage(1);
                }}
                itemLabel="طالب متغيب"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, cur) => {
      acc.present += cur.presentCount;
      acc.absent += cur.absentCount;
      acc.discontinued += cur.discontinuedCount;
      acc.unmarked += cur.unmarkedCount;
      return acc;
    },
    { present: 0, absent: 0, discontinued: 0, unmarked: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] overflow-hidden shadow-xs transition-colors">
        <div className="p-4 bg-[#F5F7F8] dark:bg-[#151E22] border-b border-[#DCE3E6] dark:border-[#28373D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-[#17252B] dark:text-[#F0F4F6]">
              تقرير الحضور والغياب اليومي — {dayName}
            </h4>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5 font-mono">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 rounded-md bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] font-bold">
              حاضر: {totals.present}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] font-bold">
              غائب: {totals.absent}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] font-bold">
              منقطع: {totals.discontinued}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#F1F3F5] dark:bg-[#1E292D] text-[#59636E] dark:text-[#9BAAB1] font-bold">
              غير محدد: {totals.unmarked}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#EEF2F3] dark:bg-[#151E22] text-[#17252B] dark:text-[#F0F4F6] border-b border-[#DCE3E6] dark:border-[#28373D]">
                <th className="px-3 py-3 font-bold sticky right-0 bg-[#EEF2F3] dark:bg-[#151E22] w-28 border-l border-[#DCE3E6] dark:border-[#28373D]">
                  رقم الهوية
                </th>
                <th className="px-4 py-3 font-bold sticky right-28 bg-[#EEF2F3] dark:bg-[#151E22] min-w-[160px] border-l border-[#DCE3E6] dark:border-[#28373D]">
                  اسم الطالب
                </th>
                <th className="px-3 py-3 font-bold border-l border-[#DCE3E6] dark:border-[#28373D]">الشعبة</th>
                <th className="px-4 py-3 font-bold border-l border-[#DCE3E6] dark:border-[#28373D]">التاريخ</th>
                <th className="px-4 py-3 text-center font-bold">حالة الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E6] dark:divide-[#28373D]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-[#89949A] dark:text-[#6E7F87]">
                    لا توجد بيانات متاحة لهذا اليوم
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const conf = statusStyles[row.status] || statusStyles.Unmarked;
                  const Icon = conf.icon;

                  return (
                    <tr key={row.enrollmentId} className="hover:bg-[#F5F7F8] dark:hover:bg-[#202E34]">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] sticky right-0 bg-inherit border-l border-[#DCE3E6] dark:border-[#28373D]">
                        {row.nationalId}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#17252B] dark:text-[#F0F4F6] sticky right-28 bg-inherit border-l border-[#DCE3E6] dark:border-[#28373D]">
                        <span className="truncate font-bold">{row.studentName}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[#5F6B73] dark:text-[#9BAAB1] border-l border-[#DCE3E6] dark:border-[#28373D]">
                        {row.className}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[#5F6B73] dark:text-[#9BAAB1] border-l border-[#DCE3E6] dark:border-[#28373D]">
                        {row.date || dateStr}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border',
                            conf.bg,
                            conf.text,
                            conf.border
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{conf.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {rows.length > rowsPageSize && (
          <div className="border-t border-[#EEF2F3] dark:border-[#28373D]">
            <PaginationControls
              pageNumber={rowsPage}
              totalPages={totalRowsPages}
              totalCount={rows.length}
              pageSize={rowsPageSize}
              onPageChange={(p) => setRowsPage(p)}
              onPageSizeChange={(s) => {
                setRowsPageSize(s);
                setRowsPage(1);
              }}
              itemLabel="طالب"
            />
          </div>
        )}
      </div>

      <AttendanceLegend />
    </div>
  );
}

export default DailyReportView;
