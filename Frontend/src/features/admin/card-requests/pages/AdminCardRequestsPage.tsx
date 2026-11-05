import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { FileQuestion, CheckCircle2, XCircle, Printer } from 'lucide-react';
import { CardRequestBadge } from '../../../../shared/components/ui/Badge';
import { useNotifications } from '../../../notifications';
import type { CardRequestStatus } from '../../../../shared/types';

export function AdminCardRequestsPage() {
  const queryClient = useQueryClient();
  const { toast } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['card_requests'],
    queryFn: () => schoolDataService.getCardRequests(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: CardRequestStatus }) => {
      await schoolDataService.updateCardRequestStatus(requestId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_requests'] });
      toast.show('تم تحديث حالة طلب البطاقة بنجاح', 'success');
    },
    onError: () => {
      toast.show('حدث خطأ أثناء تحديث حالة الطلب', 'danger');
    },
  });

  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B]">طلبات البطاقات البديلة</h1>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                مراجعة طلبات استبدال بطاقات الاستئذان المفقودة أو التالفة المقدمة من عرفاء الفصول
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#5F6B73] font-semibold text-xs">تصفية حسب الحالة:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9.5 px-3 bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg text-xs font-medium text-[#17252B] outline-none cursor-pointer hover:border-[#245B63] transition-colors"
          >
            <option value="all">جميع الحالات ({requests.length})</option>
            <option value="Pending">قيد الانتظار (جديدة)</option>
            <option value="Approved">تمت الموافقة</option>
            <option value="Printed">تمت الطباعة</option>
            <option value="Delivered">تم التسليم</option>
            <option value="Rejected">مرفوضة</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#F5F7F8] text-[#17252B] border-b border-[#DCE3E6]">
                <th className="px-4 py-3.5 font-bold w-16">#</th>
                <th className="px-4 py-3.5 font-bold w-28">الشعبة</th>
                <th className="px-4 py-3.5 font-bold w-36">مقدم الطلب (العريف)</th>
                <th className="px-4 py-3.5 font-bold">اسم الطالب المعني</th>
                <th className="px-4 py-3.5 font-bold w-32">نوع البطاقة</th>
                <th className="px-4 py-3.5 font-bold">سبب الطلب</th>
                <th className="px-4 py-3.5 font-bold text-center w-28">الحالة الحالية</th>
                <th className="px-4 py-3.5 font-bold text-center w-36">الإجراء المتاح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F3]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#5F6B73]">
                    جاري تحميل الطلبات...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#89949A]">
                    لا توجد طلبات بطاقات في هذا التصنيف
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-[#F5F9F9] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#89949A]">#{req.requestId}</td>
                    <td className="px-4 py-3 font-bold text-[#17252B] font-mono">{req.className}</td>
                    <td className="px-4 py-3 font-mono text-[#245B63] font-bold">{req.representativeUsername}</td>
                    <td className="px-4 py-3 font-medium text-[#17252B]">{req.studentName}</td>
                    <td className="px-4 py-3 text-[#5F6B73]">{req.cardType}</td>
                    <td className="px-4 py-3 text-[#17252B] max-w-xs">{req.reason}</td>
                    <td className="px-4 py-3 text-center">
                      <CardRequestBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {req.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                updateStatusMutation.mutate({ requestId: req.requestId, status: 'Approved' })
                              }
                              className="p-1.5 rounded-lg text-[#176B3A] hover:bg-[#E8F5EC] transition-colors cursor-pointer"
                              title="الموافقة على الطلب"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateStatusMutation.mutate({ requestId: req.requestId, status: 'Rejected' })
                              }
                              className="p-1.5 rounded-lg text-[#A61B1B] hover:bg-[#FDECEC] transition-colors cursor-pointer"
                              title="رفض الطلب"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {req.status === 'Approved' && (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatusMutation.mutate({ requestId: req.requestId, status: 'Printed' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#E8F1F1] text-[#245B63] border border-[#CDE0E2] hover:bg-[#D8E8E9] transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>تأكيد الطباعة</span>
                          </button>
                        )}

                        {req.status === 'Printed' && (
                          <button
                            type="button"
                            onClick={() =>
                              updateStatusMutation.mutate({ requestId: req.requestId, status: 'Delivered' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#E8F5EC] text-[#176B3A] border border-[#B7DEC5] hover:bg-[#D7EEDB] transition-colors cursor-pointer"
                          >
                            <span>تسليم للعريف</span>
                          </button>
                        )}

                        {req.status === 'Delivered' && (
                          <span className="text-[11px] text-[#176B3A] font-bold">مكتمل ومسلّم</span>
                        )}

                        {req.status === 'Rejected' && (
                          <span className="text-[11px] text-[#A61B1B] font-bold">مرفوض</span>
                        )}
                      </div>
                    </td>
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

export default AdminCardRequestsPage;
