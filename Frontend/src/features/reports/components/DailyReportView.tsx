import type { DailyAttendanceRow, DailyAbsenceRecord } from '../types/report.types';
import { SCHOOL_PERIODS, type AttendanceStatus } from '../../../shared/types';
import { PeriodStatusBox } from '../../attendance';
import { AttendanceLegend } from '../../attendance';

export interface DailyReportViewProps {
  rows: DailyAttendanceRow[];
  absenceRecords: DailyAbsenceRecord[];
  isAbsenceOnly: boolean;
  dayName: string;
  dateStr: string;
}

export function DailyReportView({
  rows,
  absenceRecords,
  isAbsenceOnly,
  dayName,
  dateStr,
}: DailyReportViewProps) {
  if (isAbsenceOnly) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-[#DCE3E6] overflow-hidden shadow-xs">
          <div className="p-4 bg-[#FDECEC]/40 border-b border-[#F1C3C3] flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#A61B1B]">سجل الغياب اليومي — {dayName}</h4>
              <p className="text-xs text-[#5F6B73] mt-0.5 font-mono">{dateStr}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#FDECEC] text-[#A61B1B] border border-[#F1C3C3]">
              إجمالي حالات الغياب: {absenceRecords.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-[#EEF2F3] text-[#17252B] border-b border-[#DCE3E6]">
                  <th className="px-4 py-3 font-bold">#</th>
                  <th className="px-4 py-3 font-bold">رقم الهوية</th>
                  <th className="px-4 py-3 font-bold">اسم الطالب</th>
                  <th className="px-4 py-3 font-bold">الشعبة</th>
                  <th className="px-4 py-3 font-bold">التاريخ</th>
                  <th className="px-4 py-3 font-bold">اليوم</th>
                  <th className="px-4 py-3 font-bold">الحصة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3E6]">
                {absenceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-xs text-[#176B3A] font-semibold bg-[#E8F5EC]/20">
                      لا يوجد أي حالات غياب مسجلة في هذا اليوم. جميع الطلاب حاضرون!
                    </td>
                  </tr>
                ) : (
                  absenceRecords.map((r, idx) => (
                    <tr key={`${r.enrollmentId}-${r.periodNumber}-${idx}`} className="hover:bg-[#FDECEC]/10">
                      <td className="px-4 py-2.5 font-mono text-[#89949A]">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-[#5F6B73]">{r.nationalId}</td>
                      <td className="px-4 py-2.5 font-bold text-[#17252B]">{r.studentName}</td>
                      <td className="px-4 py-2.5 text-[#5F6B73]">{r.className}</td>
                      <td className="px-4 py-2.5 font-mono text-[#5F6B73]">{r.date}</td>
                      <td className="px-4 py-2.5 text-[#5F6B73]">{r.dayName}</td>
                      <td className="px-4 py-2.5 font-bold text-[#A61B1B]">الحصة {r.periodNumber}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#DCE3E6] overflow-hidden shadow-xs">
        <div className="p-4 bg-[#F5F7F8] border-b border-[#DCE3E6] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#17252B]">تقرير الحضور اليومي الكامل — {dayName}</h4>
            <p className="text-xs text-[#5F6B73] mt-0.5 font-mono">{dateStr}</p>
          </div>
          <span className="text-xs text-[#5F6B73] font-mono">{rows.length} طالب</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#EEF2F3] text-[#17252B] border-b border-[#DCE3E6]">
                <th className="px-3 py-3 font-bold sticky right-0 bg-[#EEF2F3] w-28 border-l border-[#DCE3E6]">
                  رقم الهوية
                </th>
                <th className="px-4 py-3 font-bold sticky right-28 bg-[#EEF2F3] min-w-[160px] border-l border-[#DCE3E6]">
                  اسم الطالب
                </th>
                <th className="px-3 py-3 font-bold border-l border-[#DCE3E6]">الشعبة</th>
                {SCHOOL_PERIODS.map((p) => (
                  <th key={p} className="px-2 py-3 text-center font-bold border-l border-[#DCE3E6] w-12">
                    ح {p}
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-bold text-[#176B3A] border-l border-[#DCE3E6]">حاضر</th>
                <th className="px-3 py-3 text-center font-bold text-[#A61B1B] border-l border-[#DCE3E6]">غائب</th>
                <th className="px-3 py-3 text-center font-bold text-[#855500]">منقطع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E6]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-xs text-[#89949A]">
                    لا توجد بيانات متاحة لهذا اليوم
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.enrollmentId} className="hover:bg-[#F5F7F8]">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#5F6B73] sticky right-0 bg-inherit border-l border-[#DCE3E6]">
                      {row.nationalId}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#17252B] sticky right-28 bg-inherit border-l border-[#DCE3E6]">
                      <span className="truncate">{row.studentName}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[#5F6B73] border-l border-[#DCE3E6]">{row.className}</td>
                    {SCHOOL_PERIODS.map((p) => {
                      const st: AttendanceStatus = row.periods[p] || 'Unmarked';
                      return (
                        <td key={p} className="px-2 py-2 text-center border-l border-[#DCE3E6]">
                          <PeriodStatusBox periodNumber={p} status={st} size="sm" />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-mono font-bold text-[#176B3A] border-l border-[#DCE3E6]">
                      {row.presentCount}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold text-[#A61B1B] border-l border-[#DCE3E6]">
                      {row.absentCount}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold text-[#855500]">
                      {row.discontinuedCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AttendanceLegend />
    </div>
  );
}

