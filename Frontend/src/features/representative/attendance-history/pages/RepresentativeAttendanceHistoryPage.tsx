import { useState } from 'react';
import { useAuth } from '../../../auth';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  AttendanceTable,
  AttendanceWeekSelector,
  AttendanceProgressSummary,
  useAttendanceMatrix,
} from '../../../attendance';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import { History, Printer, Eye } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { currentWeek } from '@/shared/services/schoolSettingsService';
import { formatArabicDateShort } from '../../../../shared/utils/date';

export function RepresentativeAttendanceHistoryPage() {
  const { user } = useAuth();
  const classId = user?.classId || 105;

  const [selectedWeekId, setSelectedWeekId] = useState<number>(currentWeek);

  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const {
    matrix,
    overallSummary,
    isLoading,
  } = useAttendanceMatrix(classId, selectedWeekId);

  const selectedWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId) || weeks[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, aside, header, .no-print, button, select, input {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .print-header {
            display: block !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#17252B]">سجل التحضير الأسبوعي للشعبة</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F5F7F8] text-[#5F6B73] border border-[#DCE3E6] flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  عرض فقط
                </span>
              </div>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                مراجعة كشف الحضور والغياب الكامل لـ{user?.className || (user?.classNumber ? `شعبة ${user.classNumber}` : 'الشعبة')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
            className="text-xs font-bold"
          >
            طباعة الكشف
          </Button>

          <div className="w-full sm:w-64">
            <AttendanceWeekSelector
              weeks={weeks}
              selectedWeekId={selectedWeekId}
              onSelectWeek={setSelectedWeekId}
            />
          </div>
        </div>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block mb-4 text-center border-b pb-3">
        <h2 className="text-lg font-bold">كشف الحضور الأسبوعي المعتمد — {user?.className || `شعبة ${classId}`}</h2>
        <p className="text-xs text-gray-600 mt-1">
          الأسبوع الدراسي {selectedWeek?.weekNumber} ({formatArabicDateShort(selectedWeek?.startDate)} - {formatArabicDateShort(selectedWeek?.endDate)})
        </p>
      </div>

      {/* Summary */}
      <div className="no-print">
        <AttendanceProgressSummary
          totalStudents={overallSummary.totalStudents}
          presentCount={overallSummary.present}
          absentCount={overallSummary.absent}
          discontinuedCount={overallSummary.discontinued}
          unmarkedCount={overallSummary.unmarked}
          label={`إجمالي رصد الأسبوع ${selectedWeek?.weekNumber || 0}`}
        />
      </div>

      {/* Main Table (Strictly READ ONLY) */}
      {isLoading ? (
        <LoadingState message="جاري استعراض سجل الأسبوع للشعبة..." />
      ) : (
        <AttendanceTable
          attendances={matrix}
          weekStartDate={selectedWeek?.startDate}
          interactive={false}
        />
      )}
    </div>
  );
}

export default RepresentativeAttendanceHistoryPage;
