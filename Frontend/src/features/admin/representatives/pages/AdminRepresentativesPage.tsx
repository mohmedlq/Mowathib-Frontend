import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { Users2, Copy, Check, Plus, Info, KeyRound } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { Input } from '../../../../shared/components/ui/Input';
import { useNotifications } from '../../../notifications';
import type { Representative } from '../../../../shared/types';

export function AdminRepresentativesPage() {
  const queryClient = useQueryClient();
  const { toast } = useNotifications();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number>(105);
  const [roleType, setRoleType] = useState<'Representative' | 'Deputy'>('Representative');
  const [phoneNumber, setPhoneNumber] = useState('0551234567');

  // Generated credential display modal
  const [generatedCreds, setGeneratedCreds] = useState<{
    username: string;
    tempPass: string;
    className: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { data: reps = [], isLoading } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => schoolDataService.getRepresentatives(),
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      const suffix = roleType === 'Representative' ? '1' : '2';
      const username = `${selectedClassId}_${suffix}`;
      const tempPass = 'temp' + Math.floor(1000 + Math.random() * 9000);

      const created = await schoolDataService.createRepresentative({
        enrollmentId: selectedClassId * 100 + Number(suffix),
        username,
        phoneNumber,
        role: roleType,
        isActive: true,
        mustChangePassword: true,
        className: `شعبة ${selectedClassId}`,
        password: tempPass,
      });

      return { created, tempPass, username };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      setIsAssignModalOpen(false);
      setGeneratedCreds({
        username: data.username,
        tempPass: data.tempPass,
        className: `شعبة ${selectedClassId}`,
      });
      toast.show('تم توليد بيانات الاعتماد المؤقتة بنجاح', 'success');
    },
  });

  const handleCopy = () => {
    if (!generatedCreds) return;
    const text = `بيانات الدخول لنظام مواظب:\nالشعبة: ${generatedCreds.className}\nاسم المستخدم: ${generatedCreds.username}\nكلمة المرور المؤقتة: ${generatedCreds.tempPass}\n(ملاحظة: يجب تغيير كلمة المرور عند أول تسجيل دخول)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B]">إدارة عرفاء الفصول والنواب</h1>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                تعيين العرفاء، توليد الحسابات الرسمية بصيغة (الشعبة_1 / الشعبة_2)، وإصدار كلمات المرور المؤقتة
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAssignModalOpen(true)}
          className="self-start sm:self-auto font-bold"
        >
          تعيين / تجديد عريف صف
        </Button>
      </div>

      {/* Info Notice */}
      <div className="p-4 bg-[#EAF2FF] border border-[#C3D9FF] rounded-xl text-xs text-[#28559A] leading-relaxed flex items-start gap-2.5 shadow-2xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#28559A]" />
        <div>
          <strong className="block mb-0.5">قاعدة تسمية الحسابات الرسمية:</strong>
          <span>
            العريف الأساسي للشعبة 105 يحمل اسم المستخدم <span className="font-mono font-bold">105_1</span>، بينما نائب العريف يحمل اسم{' '}
            <span className="font-mono font-bold">105_2</span>. يُلزم العريف بتغيير كلمة المرور المؤقتة عند أول تسجيل دخول لضمان الخصوصية والمسؤولية.
          </span>
        </div>
      </div>

      {/* Representatives Table */}
      <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#F5F7F8] text-[#17252B] border-b border-[#DCE3E6]">
                <th className="px-4 py-3.5 font-bold w-32">اسم المستخدم</th>
                <th className="px-4 py-3.5 font-bold">اسم الطالب المسؤول</th>
                <th className="px-4 py-3.5 font-bold w-32">الشعبة</th>
                <th className="px-4 py-3.5 font-bold w-36">الصفة والمسؤولية</th>
                <th className="px-4 py-3.5 font-bold w-36">رقم الجوال</th>
                <th className="px-4 py-3.5 font-bold text-center w-24">حالة الحساب</th>
                <th className="px-4 py-3.5 font-bold text-center w-36">حالة كلمة المرور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F3]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#5F6B73]">
                    جاري تحميل الحسابات...
                  </td>
                </tr>
              ) : reps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#89949A]">
                    لا توجد حسابات مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                reps.map((r: Representative) => (
                  <tr key={r.representativeId} className="hover:bg-[#F5F9F9] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#245B63]">{r.username}</td>
                    <td className="px-4 py-3 font-bold text-[#17252B]">
                      {r.studentName || 'طالب معين'}
                    </td>
                    <td className="px-4 py-3 text-[#5F6B73] font-mono">{r.className}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.role === 'Deputy'
                            ? 'bg-[#EEF2F3] text-[#5F6B73] border-[#DCE3E6]'
                            : 'bg-[#E8F1F1] text-[#245B63] border-[#CDE0E2]'
                        }`}
                      >
                        {r.role === 'Deputy' ? 'نائب العريف' : 'عريف الصف الأساسي'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#5F6B73]">{r.phoneNumber}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.isActive
                            ? 'bg-[#E8F5EC] text-[#176B3A] border-[#B7DEC5]'
                            : 'bg-[#FDECEC] text-[#A61B1B] border-[#F1C3C3]'
                        }`}
                      >
                        {r.isActive ? 'مفعل' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                          r.mustChangePassword
                            ? 'bg-[#FFF4DA] text-[#855500] border border-[#EDD38C]'
                            : 'bg-[#F5F7F8] text-[#5F6B73]'
                        }`}
                      >
                        {r.mustChangePassword ? 'مطلوب إلزامي' : 'تم التعيين'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      <Dialog
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="تعيين وتوليد حساب عريف أو نائب"
        description="اختر الشعبة والصفة لتوليد اسم المستخدم النظامي وكلمة المرور المؤقتة."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              الشعبة المستهدفة:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">الصفة والمسؤولية:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRoleType('Representative')}
                className={`p-3 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                  roleType === 'Representative'
                    ? 'border-[#245B63] bg-[#E8F1F1] text-[#245B63]'
                    : 'border-[#DCE3E6] bg-white text-[#5F6B73] hover:bg-[#F5F7F8]'
                }`}
              >
                عريف صف أساسي ({selectedClassId}_1)
              </button>
              <button
                type="button"
                onClick={() => setRoleType('Deputy')}
                className={`p-3 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                  roleType === 'Deputy'
                    ? 'border-[#245B63] bg-[#E8F1F1] text-[#245B63]'
                    : 'border-[#DCE3E6] bg-white text-[#5F6B73] hover:bg-[#F5F7F8]'
                }`}
              >
                نائب العريف ({selectedClassId}_2)
              </button>
            </div>
          </div>

          <Input
            label="رقم جوال العريف (للتواصل الإداري)"
            placeholder="05XXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => assignMutation.mutate()}
            isLoading={assignMutation.isPending}
          >
            توليد وتعيين الحساب
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Generated Credentials Success Modal */}
      {generatedCreds && (
        <Dialog
          isOpen={true}
          onClose={() => setGeneratedCreds(null)}
          title="تم توليد حساب العريف بنجاح"
          description="يرجى نسخ هذه البيانات وتسليمها للعريف رسمياً. سيلزم بتغيير كلمة المرور فور دخوله."
        >
          <div className="space-y-4">
            <div className="bg-[#F5F7F8] p-4 rounded-xl border border-[#DCE3E6] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F3]">
                <span className="text-[#5F6B73]">الشعبة:</span>
                <span className="font-bold text-[#17252B] font-sans">{generatedCreds.className}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F3]">
                <span className="text-[#5F6B73]">اسم المستخدم:</span>
                <span className="font-bold text-[#245B63] text-sm">{generatedCreds.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73]">كلمة المرور المؤقتة:</span>
                <span className="font-bold text-[#A61B1B] text-sm bg-white px-2 py-0.5 rounded border border-[#DCE3E6]">
                  {generatedCreds.tempPass}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#5F6B73]">
              <KeyRound className="w-4 h-4 text-[#245B63] shrink-0" />
              <span>يحق للعريف الدخول عبر بوابة العرفاء مباشرة باستخدام هذه البيانات.</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="primary"
              onClick={handleCopy}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'تم النسخ للحافظة' : 'نسخ بيانات الدخول'}
            </Button>
            <Button variant="secondary" onClick={() => setGeneratedCreds(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

export default AdminRepresentativesPage;
