import { useState, useMemo } from 'react';
import type { MonthlyStudentSummaryRow, MonthlyDetailedAbsenceRow } from '../types/report.types';
import { PaginationControls } from '../../../shared/components/ui/PaginationControls';
import { cn } from '../../../shared/utils/cn';

export interface MonthlyReportViewProps {
  summaryRows: MonthlyStudentSummaryRow[];
  detailedAbsences: MonthlyDetailedAbsenceRow[];
  monthStr: string;
  classNameTitle: string;
}

export function MonthlyReportView({
  summaryRows,
  detailedAbsences,
  monthStr,
  classNameTitle,
}: MonthlyReportViewProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>('summary');
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryPageSize, setSummaryPageSize] = useState(15);
  const [detailedPage, setDetailedPage] = useState(1);
  const [detailedPageSize, setDetailedPageSize] = useState(15);

  const totalSummaryPages = Math.ceil(summaryRows.length / summaryPageSize) || 1;
  const paginatedSummaryRows = useMemo(() => {
    const start = (summaryPage - 1) * summaryPageSize;
    return summaryRows.slice(start, start + summaryPageSize);
  }, [summaryRows, summaryPage, summaryPageSize]);

  const totalDetailedPages = Math.ceil(detailedAbsences.length / detailedPageSize) || 1;
  const paginatedDetailedAbsences = useMemo(() => {
    const start = (detailedPage - 1) * detailedPageSize;
    return detailedAbsences.slice(start, start + detailedPageSize);
  }, [detailedAbsences, detailedPage, detailedPageSize]);

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-[#DCE3E6]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeTab === 'summary'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            )}
          >
            ملخص الحضور الشهري
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('detailed')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeTab === 'detailed'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            )}
          >
            سجل الغياب التفصيلي ({detailedAbsences.length})
          </button>
        </div>

        <span className="text-xs text-[#5F6B73]">
          الشهر: <strong className="text-[#17252B] font-mono">{monthStr}</strong> | {classNameTitle}
        </span>
      </div>

      {activeTab === 'summary' ? (
        <div className="bg-white rounded-xl border border-[#DCE3E6] overflow-hidden shadow-xs">
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
                  <th className="px-3 py-3 text-center font-bold border-l border-[#DCE3E6]">الأيام المتوقعة</th>
                  <th className="px-3 py-3 text-center font-bold text-[#176B3A] border-l border-[#DCE3E6]">حاضر</th>
                  <th className="px-3 py-3 text-center font-bold text-[#A61B1B] border-l border-[#DCE3E6]">غائب</th>
                  <th className="px-3 py-3 text-center font-bold text-[#855500] border-l border-[#DCE3E6]">منقطع</th>
                  <th className="px-3 py-3 text-center font-bold text-[#5F6B73] border-l border-[#DCE3E6]">غير محدد</th>
                  <th className="px-4 py-3 text-center font-bold text-[#245B63]">نسبة الحضور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3E6]">
                {summaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-xs text-[#89949A]">
                      لا توجد بيانات حضور مسجلة لهذا الشهر
                    </td>
                  </tr>
                ) : (
                  paginatedSummaryRows.map((row) => (
                    <tr key={row.enrollmentId} className="hover:bg-[#F5F7F8]">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#5F6B73] sticky right-0 bg-inherit border-l border-[#DCE3E6]">
                        {row.nationalId}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#17252B] sticky right-28 bg-inherit border-l border-[#DCE3E6]">
                        {row.studentName}
                      </td>
                      <td className="px-3 py-2.5 text-[#5F6B73] border-l border-[#DCE3E6]">{row.className}</td>
                      <td className="px-3 py-2 text-center font-mono border-l border-[#DCE3E6]">{row.totalExpected}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-[#176B3A] border-l border-[#DCE3E6]">
                        {row.presentCount}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-[#A61B1B] border-l border-[#DCE3E6]">
                        {row.absentCount}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-[#855500] border-l border-[#DCE3E6]">
                        {row.discontinuedCount}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-[#5F6B73] border-l border-[#DCE3E6]">
                        {row.unmarkedCount}
                      </td>
                      <td className="px-4 py-2 text-center font-mono font-bold text-xs">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full inline-block',
                            row.attendanceRate >= 90
                              ? 'bg-[#E8F5EC] text-[#176B3A]'
                              : row.attendanceRate >= 75
                              ? 'bg-[#FFF4DA] text-[#855500]'
                              : 'bg-[#FDECEC] text-[#A61B1B]'
                          )}
                        >
                          {row.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {summaryRows.length > summaryPageSize && (
            <div className="border-t border-[#DCE3E6]">
              <PaginationControls
                pageNumber={summaryPage}
                totalPages={totalSummaryPages}
                totalCount={summaryRows.length}
                pageSize={summaryPageSize}
                onPageChange={(p) => setSummaryPage(p)}
                onPageSizeChange={(s) => {
                  setSummaryPageSize(s);
                  setSummaryPage(1);
                }}
                itemLabel="طالب"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#DCE3E6] overflow-hidden shadow-xs">
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
                  <th className="px-4 py-3 font-bold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3E6]">
                {detailedAbsences.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-xs text-[#176B3A] font-semibold bg-[#E8F5EC]/20">
                      لا يوجد أي حالات غياب مسجلة في هذا الشهر.
                    </td>
                  </tr>
                ) : (
                  paginatedDetailedAbsences.map((r, idx) => (
                    <tr key={`${r.enrollmentId}-${r.date}-${idx}`} className="hover:bg-[#FDECEC]/10">
                      <td className="px-4 py-2.5 font-mono text-[#89949A]">{(detailedPage - 1) * detailedPageSize + idx + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-[#5F6B73]">{r.nationalId}</td>
                      <td className="px-4 py-2.5 font-bold text-[#17252B]">{r.studentName}</td>
                      <td className="px-4 py-2.5 text-[#5F6B73]">{r.className}</td>
                      <td className="px-4 py-2.5 font-mono text-[#5F6B73]">{r.date}</td>
                      <td className="px-4 py-2.5 text-[#5F6B73]">{r.dayName}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-[#A61B1B]">غائب</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {detailedAbsences.length > detailedPageSize && (
            <div className="border-t border-[#DCE3E6]">
              <PaginationControls
                pageNumber={detailedPage}
                totalPages={totalDetailedPages}
                totalCount={detailedAbsences.length}
                pageSize={detailedPageSize}
                onPageChange={(p) => setDetailedPage(p)}
                onPageSizeChange={(s) => {
                  setDetailedPageSize(s);
                  setDetailedPage(1);
                }}
                itemLabel="حالة غياب"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

