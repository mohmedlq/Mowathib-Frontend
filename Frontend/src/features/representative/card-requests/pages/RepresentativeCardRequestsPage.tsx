import { useState } from 'react';
import { useAuth } from '../../../auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { CreditCard, Plus } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { CardRequestBadge } from '../../../../shared/components/ui/Badge';
import { useNotifications } from '../../../notifications';

export function RepresentativeCardRequestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();
  const classId = user?.classId || 105;

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number>(0);
  const [reason, setReason] = useState('فقدان البطاقة أثناء اليوم الدراسي');
  const [cardType, setCardType] = useState('بطاقة استئذان دورة المياه');

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(classId),
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['card_requests'],
    queryFn: () => schoolDataService.getCardRequests(),
  });

  const myRequests = requests.filter(
    (r) => r.representativeUsername === user?.username || r.className?.toString()?.includes(String(classId))
  );

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      return await schoolDataService.createCardRequest({
        enrollmentId: selectedEnrollmentId || enrollments[0]?.enrollmentId || 1,
        representativeId: user?.id || 0,
        reason,
        cardType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_requests'] });
      toast.show('تم إرسال طلب البطاقة بنجاح إلى الإدارة المدرسية', 'success');
      setIsRequestModalOpen(false);
      setReason('');
    },
    onError: () => {
      toast.show('فشل إرسال الطلب، يرجى المحاولة لاحقاً', 'danger');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">طلب بطاقة استئذان بديلة</h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            تقديم طلب رسمي لإدارة المدرسة في حال تلف أو فقدان إحدى بطاقات استئذان الشعبة
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (enrollments.length > 0 && selectedEnrollmentId === 0) {
              setSelectedEnrollmentId(enrollments[0].enrollmentId);
            }
            setIsRequestModalOpen(true);
          }}
          className="self-start sm:self-auto font-bold"
        >
          تقديم طلب بطاقة جديدة
        </Button>
      </div>

      {/* Requests History Table */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#DCE3E6] bg-[#F8FAFA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#245B63]" />
            <h3 className="text-sm font-bold text-[#17252B]">سجل الطلبات السابقة للشعبة</h3>
          </div>
          <span className="text-xs text-[#5F6B73] font-mono bg-white px-2.5 py-0.5 rounded border border-[#DCE3E6]">{myRequests.length} طلبات</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#F0F4F5] text-[#17252B] border-b border-[#DCE3E6]">
                <th className="px-4 py-3 font-bold w-16">#</th>
                <th className="px-4 py-3 font-bold">تاريخ الطلب</th>
                <th className="px-4 py-3 font-bold">اسم الطالب المعني</th>
                <th className="px-4 py-3 font-bold">نوع البطاقة</th>
                <th className="px-4 py-3 font-bold">سبب الطلب</th>
                <th className="px-4 py-3 font-bold text-center">حالة الطلب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E6]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#5F6B73]">
                    جاري تحميل سجل الطلبات...
                  </td>
                </tr>
              ) : myRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#89949A]">
                    لم يتم تقديم أي طلبات بطاقات بديلة حتى الآن.
                  </td>
                </tr>
              ) : (
                myRequests.map((req) => (
                  <tr key={req.requestId} className="transition-colors hover:bg-[#F0F7F7]">
                    <td className="px-4 py-3 font-mono text-[#89949A]">#{req.requestId}</td>
                    <td className="px-4 py-3 font-mono text-[#5F6B73]">{req.createdAt || 'اليوم'}</td>
                    <td className="px-4 py-3 font-bold text-[#17252B]">{req.studentName}</td>
                    <td className="px-4 py-3 text-[#5F6B73]">{req.cardType}</td>
                    <td className="px-4 py-3 text-[#17252B]">{req.reason}</td>
                    <td className="px-4 py-3 text-center">
                      <CardRequestBadge status={req.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      <Dialog
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="طلب إصدار بطاقة استئذان بديلة"
        description="حدد الطالب وسبب طلب إصدار البطاقة البديلة لإرساله للإدارة المدرسية."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              اختر الطالب المعني:
            </label>
            <select
              value={selectedEnrollmentId}
              onChange={(e) => setSelectedEnrollmentId(Number(e.target.value))}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              {enrollments.map((e) => (
                <option key={e.enrollmentId} value={e.enrollmentId}>
                  {e.studentName} ({e.student?.nationalId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              نوع البطاقة المطلوبة:
            </label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              <option value="بطاقة استئذان دورة المياه">بطاقة استئذان دورة المياه الرسمية</option>
              <option value="بطاقة تعريف عريف الصف">بطاقة تعريف عريف الصف</option>
            </select>
          </div>

          <Input
            label="سبب طلب البديل"
            placeholder="مثال: فقدان البطاقة أثناء اليوم الدراسي"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsRequestModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => createRequestMutation.mutate()}
            isLoading={createRequestMutation.isPending}
            disabled={!reason.trim()}
          >
            إرسال الطلب للإدارة
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

