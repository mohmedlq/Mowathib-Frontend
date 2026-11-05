import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, CreditCard, UserX, CheckCircle2, ChevronLeft } from 'lucide-react';
import type { ClassItem, CardRequest, Representative } from '../../../../shared/types';

export interface AttendanceAlertsWidgetProps {
  classes: ClassItem[];
  cardRequests: CardRequest[];
  representatives: Representative[];
  classSummaries?: Record<number, { attendanceRate?: number }>;
}

export function AttendanceAlertsWidget({
  classes,
  cardRequests,
  representatives,
  classSummaries = {},
}: AttendanceAlertsWidgetProps) {
  const navigate = useNavigate();

  // Pending card requests
  const pendingRequests = useMemo(
    () => cardRequests.filter((r) => r.status === 'Pending'),
    [cardRequests]
  );

  // Classes with attendance below threshold (85%)
  const lowAttendanceClasses = useMemo(() => {
    return classes
      .filter((c) => {
        const summary = classSummaries[c.classId];
        return summary && summary.attendanceRate !== undefined && summary.attendanceRate < 85;
      })
      .slice(0, 3);
  }, [classes, classSummaries]);

  // Classes with unassigned representative
  const classesMissingReps = useMemo(() => {
    return classes
      .filter((c) => {
        const rep = representatives.find(
          (r) =>
            (r.className === c.className || r.username.startsWith(`${c.classId}_`)) &&
            (r.role === 'Representative' || r.username.endsWith('_1'))
        );
        return !rep;
      })
      .slice(0, 2);
  }, [classes, representatives]);

  const hasAlerts =
    pendingRequests.length > 0 ||
    lowAttendanceClasses.length > 0 ||
    classesMissingReps.length > 0;

  return (
    <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-[#EEF2F3] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFF4DA] text-[#855500] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17252B]">تنبيهات المتابعة والعمليات</h3>
              <p className="text-[11px] text-[#5F6B73]">عناصر تتطلب اهتمام ومراجعة الإدارة اليوم</p>
            </div>
          </div>
          {hasAlerts && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDECEC] text-[#A61B1B] border border-[#F1C3C3]">
              تتطلب تدخلاً
            </span>
          )}
        </div>

        {!hasAlerts ? (
          <div className="py-8 text-center text-xs text-[#5F6B73] space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#E8F5EC] text-[#176B3A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="font-bold text-[#17252B]">جميع العمليات منتظمة</p>
            <p className="text-[11px]">لا توجد تنبيهات حرجة، نسب الحضور مستقرة في كافة الشعب.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending Requests Alert */}
            {pendingRequests.length > 0 && (
              <div className="p-3 rounded-lg bg-[#FAFCFD] border border-[#DCE3E6] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#FDECEC] text-[#A61B1B] flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#17252B] block">
                      {pendingRequests.length} طلبات بطاقات استئذان معلقة
                    </span>
                    <span className="text-[11px] text-[#5F6B73]">
                      بانتظار مراجعة واعتماد الإدارة
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/card-requests')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-[#245B63] border border-[#D2E4E6] hover:bg-[#E8F1F1] transition-colors cursor-pointer shrink-0"
                >
                  معالجة
                </button>
              </div>
            )}

            {/* Low Attendance Classes Alert */}
            {lowAttendanceClasses.map((c) => {
              const rate = classSummaries[c.classId]?.attendanceRate ?? 0;
              return (
                <div
                  key={c.classId}
                  className="p-3 rounded-lg bg-[#FAFCFD] border border-[#DCE3E6] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-[#FFF4DA] text-[#855500] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#17252B] block">
                        انخفاض حضور: {c.className} ({rate.toFixed(1)}%)
                      </span>
                      <span className="text-[11px] text-[#5F6B73]">
                        نسبة الحضور أقل من الحد المستهدف (85%)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/attendance?classId=${c.classId}`)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-[#245B63] border border-[#D2E4E6] hover:bg-[#E8F1F1] transition-colors cursor-pointer shrink-0"
                  >
                    مراجعة
                  </button>
                </div>
              );
            })}

            {/* Missing Reps Alert */}
            {classesMissingReps.map((c) => (
              <div
                key={c.classId}
                className="p-3 rounded-lg bg-[#FAFCFD] border border-[#DCE3E6] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#EEF2F3] text-[#5F6B73] flex items-center justify-center shrink-0">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#17252B] block">
                      {c.className}: لم يتم تعيين عريف أساسي
                    </span>
                    <span className="text-[11px] text-[#5F6B73]">
                      يرجى تعيين طالب مسؤول لرصد الحضور
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/representatives')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-[#245B63] border border-[#D2E4E6] hover:bg-[#E8F1F1] transition-colors cursor-pointer shrink-0"
                >
                  تعيين
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#EEF2F3] flex items-center justify-between text-[11px] text-[#5F6B73]">
        <span>تحديث تلقائي مستمر بناءً على سجلات الحضور</span>
        <button
          type="button"
          onClick={() => navigate('/admin/reports')}
          className="text-[#245B63] hover:text-[#1D4B52] font-bold inline-flex items-center gap-0.5 cursor-pointer"
        >
          <span>سجل التقارير</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default AttendanceAlertsWidget;

