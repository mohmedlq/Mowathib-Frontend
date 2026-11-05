import { useState, useEffect } from 'react';
import { useAuth } from '../../../auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { 
  UserCheck, 
  ShieldCheck, 
  UserX, 
  AlertCircle, 
  UserPlus, 
  Info,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Share2,
  X
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { useNotifications } from '../../../notifications';
import {
  generateSecureDeputyPassword,
  deputyCredentialStorage,
  type PendingDeputyCredential,
} from '../services/deputyCredentialStorage';

export function RepresentativeDeputyPage() {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const queryClient = useQueryClient();
  const classId = user?.classId || 0;
  const className = user?.className || 0;
  // Modals & form state
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0);

  // Password generation & visibility state
  const [generatedPassword, setGeneratedPassword] = useState<string>(() => generateSecureDeputyPassword());
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [showPasswordInSuccess, setShowPasswordInSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<'pass' | 'full' | null>(null);

  // Pending temporary credential from localStorage
  const [pendingCredential, setPendingCredential] = useState<PendingDeputyCredential | null>(null);

  useEffect(() => {
    // Check if there is an unexpired saved credential for this class
    const saved = deputyCredentialStorage.get(classId);
    setPendingCredential(saved);
  }, [classId]);

  // Queries
  const { data: reps = [], isLoading: isLoadingReps } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => schoolDataService.getRepresentatives(),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', classId],
    queryFn: () => schoolDataService.getEnrollmentsByClass(classId),
  });

  // Active Deputy student (_2 username)
  const deputy = reps.find((r) => r.username === `${className}_2` && r.isActive);

  // Selected student entity
  const selectedStudent = enrollments.find((e) => e.enrollmentId === selectedStudentId);

  // Mutations
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => schoolDataService.deactivateRepresentative(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      deputyCredentialStorage.clear();
      setPendingCredential(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof schoolDataService.createRepresentative>[0]) => 
      schoolDataService.createRepresentative(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
    },
  });

  const handleOpenAssignModal = () => {
    setGeneratedPassword(generateSecureDeputyPassword());
    setShowPasswordInModal(false);
    setSelectedStudentId(0);
    setIsChangeModalOpen(true);
  };

  const handleRegeneratePassword = () => {
    setGeneratedPassword(generateSecureDeputyPassword());
  };

  const handleChangeDeputy = async () => {
    if (selectedStudentId === 0 || !selectedStudent) return;

    try {
      // 1. Deactivate existing deputy if any
      if (deputy) {
        await deactivateMutation.mutateAsync(deputy.representativeId);
      }

      const assignedUsername = `${className}_2`;

      // 2. Create the new deputy record with the generated secure password
      await createMutation.mutateAsync({
        enrollmentId: selectedStudentId,
        username: assignedUsername,
        password: generatedPassword,
        role: 'Deputy',
        isActive: true,
        phoneNumber: '0000000000',
        mustChangePassword: true,
      });

      // 3. Store the temporary credential in localStorage with 24h expiration
      const savedCred = deputyCredentialStorage.save(
        classId,
        selectedStudent.studentName || 'طالب الشعبة',
        assignedUsername,
        generatedPassword
      );
      setPendingCredential(savedCred);

      // 4. Open the confirmation panel with credentials
      setIsChangeModalOpen(false);
      setShowPasswordInSuccess(false);
      setIsSuccessModalOpen(true);
      toast.show('تم تعيين النائب بنجاح وتوليد كلمة المرور الرسمية', 'success');
    } catch {
      toast.show('حدث خطأ أثناء تعيين النائب، يرجى المحاولة لاحقاً', 'danger');
    }
  };

  const handleRemoveDeputy = async () => {
    if (!deputy) return;
    
    try {
      await deactivateMutation.mutateAsync(deputy.representativeId);
      toast.show('تم إعفاء النائب من منصبه بنجاح وسحب صلاحياته', 'success');
      setIsRemoveModalOpen(false);
    } catch {
      toast.show('حدث خطأ أثناء صرف النائب', 'danger');
    }
  };

  const copyToClipboard = async (text: string, type: 'pass' | 'full') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(type);
      toast.show(type === 'pass' ? 'تم نسخ كلمة المرور للحافظة' : 'تم نسخ بطاقة الدخول كاملة', 'success');
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      toast.show('فشل النسخ التلقائي، يرجى التحديد والنسخ يدوياً', 'danger');
    }
  };

  const activeCredToShow = pendingCredential;

  const isProcessing = deactivateMutation.isPending || createMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">إدارة وتعيين نائب عريف الصف</h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            صلاحية خاصة بعريف الصف الأساسي لاختيار أو تعديل نائب العريف وتوليد بيانات الدخول له
          </p>
        </div>

        {!isLoadingReps && !deputy && (
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={handleOpenAssignModal}
            className="self-start sm:self-auto font-bold"
          >
            تعيين نائب جديد
          </Button>
        )}
      </div>

      {/* Pending Credential Recovery Banner */}
      {pendingCredential && deputy && (
        <div className="p-4 bg-[#E8F1F1] border border-[#245B63]/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <KeyRound className="w-5 h-5 text-[#245B63] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[#17252B]">
                تتوفر بيانات اعتماد مؤقتة لنائب العريف ({pendingCredential.deputyName})
              </h4>
              <p className="text-[11px] text-[#5F6B73] mt-0.5">
                تم حفظ كلمة المرور المؤقتة في متصفحك لمشاركتها مع الطالب قبل انتهاء صلاحية العرض.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#245B63] text-white hover:bg-[#1d494f] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>عرض ونسخ البيانات</span>
            </button>
            <button
              type="button"
              onClick={() => {
                deputyCredentialStorage.clear();
                setPendingCredential(null);
                toast.show('تم إخفاء وحذف سجل بيانات الدخول المؤقتة', 'info');
              }}
              className="p-1.5 rounded-lg text-[#5F6B73] hover:text-[#A61B1B] hover:bg-white transition-colors cursor-pointer"
              title="إغلاق وحذف من الذاكرة المحلية"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoadingReps ? (
        <div className="bg-white p-8 rounded-xl border border-[#DCE3E6] flex justify-center items-center">
          <span className="text-xs text-[#5F6B73]">جاري تحميل البيانات...</span>
        </div>
      ) : deputy ? (
        /* Has Deputy State */
        <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#EEF2F3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#245B63]" />
              <h3 className="text-sm font-bold text-[#17252B]">بيانات نائب العريف المعتمد حالياً</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                onClick={handleOpenAssignModal}
                className="text-xs"
              >
                تغيير النائب
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<UserX className="w-3.5 h-3.5" />}
                onClick={() => setIsRemoveModalOpen(true)}
                className="text-xs bg-[#FDECEC] text-[#A61B1B] hover:bg-[#F8DADA] border-[#F1C3C3]"
              >
                صرف من المنصب
              </Button>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-[#F5F7F8] rounded-xl border border-[#DCE3E6]/70">
              <span className="text-[#5F6B73] block mb-1">اسم الطالب:</span>
              <span className="font-bold text-[#17252B] text-sm">
                {deputy.studentName}
              </span>
            </div>

            <div className="p-3.5 bg-[#F5F7F8] rounded-xl border border-[#DCE3E6]/70">
              <span className="text-[#5F6B73] block mb-1">اسم المستخدم المخصص:</span>
              <span className="font-mono font-bold text-[#245B63] text-sm flex items-center gap-1.5">
                {deputy.username}
              </span>
            </div>

            <div className="p-3.5 bg-[#F5F7F8] rounded-xl border border-[#DCE3E6]/70">
              <span className="text-[#5F6B73] block mb-1">حالة الحساب:</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-[#176B3A] bg-[#E8F5EC] px-2.5 py-0.5 rounded-full border border-[#B7DEC5]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#176B3A] animate-pulse" />
                مفعل ونشط
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State (No Deputy) */
        <div className="bg-white p-12 rounded-xl border border-[#DCE3E6] border-dashed flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-14 h-14 bg-[#F5F7F8] rounded-full flex items-center justify-center mb-4 border border-[#DCE3E6]">
            <ShieldCheck className="w-7 h-7 text-[#89949A]" />
          </div>
          <h3 className="text-base font-bold text-[#17252B] mb-2">لم يتم تعيين نائب عريف للشعبة بعد</h3>
          <p className="text-xs text-[#5F6B73] max-w-sm mb-5 leading-relaxed">
            يمكنك اختيار أحد طلاب الشعبة ليكون نائباً لك، سيتم توليد كلمة مرور آمنة تلقائياً لمنحه صلاحيات الدخول لمساعدتك في رصد الحضور.
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={handleOpenAssignModal}
            className="font-bold"
          >
            اختيار نائب وتوليد كلمة المرور
          </Button>
        </div>
      )}

      {/* Change / Assign Deputy Modal with Password Generation */}
      <Dialog
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        title={deputy ? "تغيير نائب العريف وتوليد كلمة المرور" : "اختيار نائب عريف من طلاب الشعبة"}
        description={
          deputy 
            ? "اختر طالباً جديداً وسيتم توليد كلمة مرور جديدة له تلقائياً، مع إلغاء صلاحيات النائب الحالي." 
            : "اختر طالباً من قائمة طلاب الشعبة لتعيينه كنائب عريف وتوليد بيانات الدخول الرسمية له."
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">
              اختر الطالب من قائمة طلاب الشعبة:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] focus:ring-1 focus:ring-[#245B63] outline-none cursor-pointer"
            >
              <option value={0}>اختر طالباً...</option>
              {enrollments
                .filter((e) => !e.isRepresentative && e.studentId !== deputy?.representativeId)
                .map((e) => (
                  <option key={e.enrollmentId} value={e.enrollmentId}>
                    {e.studentName} ({e.student?.nationalId})
                  </option>
                ))}
            </select>
          </div>

          {/* Generated Password Preview */}
          <div className="p-3.5 bg-[#F8FAFA] rounded-xl border border-[#DCE3E6] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#17252B] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#245B63]" />
                <span>كلمة المرور المولدة للنائب:</span>
              </label>
              <button
                type="button"
                onClick={handleRegeneratePassword}
                className="text-[11px] font-semibold text-[#245B63] hover:text-[#1d494f] flex items-center gap-1 cursor-pointer"
                title="توليد كلمة مرور مختلفة"
              >
                <RefreshCw className="w-3 h-3" />
                <span>توليد أخرى</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DCE3E6]">
              <span className="font-mono text-xs font-bold text-[#17252B] tracking-wider">
                {showPasswordInModal ? generatedPassword : '••••••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                className="text-[#5F6B73] hover:text-[#17252B] p-1 cursor-pointer"
                title={showPasswordInModal ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPasswordInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-[#5F6B73]">
              كلمة مرور مؤقتة قوية ومطابقة لمعايير الأمان، وسيُطلب من الطالب تغييرها بعد الدخول.
            </p>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-[#F0F7F7] border border-[#245B63]/20 rounded-xl">
            <Info className="w-4 h-4 text-[#245B63] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#245B63] leading-relaxed">
              اسم المستخدم المخصص للنائب سيكون: <span className="font-bold font-mono text-sm">{classId}_2</span>. بعد الاعتماد ستظهر لك نافذة لتسليم البيانات للنائب.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsChangeModalOpen(false)} disabled={isProcessing}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleChangeDeputy}
            disabled={selectedStudentId === 0 || isProcessing}
            isLoading={isProcessing}
            className="font-bold"
          >
            تأكيد التعيين وتوليد الحساب
          </Button>
        </DialogFooter>
      </Dialog>

      {/* SUCCESS CONFIRMATION MODAL WITH CREDENTIALS */}
      <Dialog
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="تم اعتماد وتعيين نائب العريف بنجاح"
        description="تم إنشاء حساب النائب وتوليد بيانات الدخول الرسمية. يرجى نسخ هذه البيانات ومشاركتها مع الطالب بأمان."
      >
        {activeCredToShow ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#F8FAFA] rounded-xl border border-[#DCE3E6] space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F3]">
                <span className="text-[#5F6B73]">اسم نائب العريف:</span>
                <span className="font-bold text-[#17252B] text-sm">{activeCredToShow.deputyName}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F3]">
                <span className="text-[#5F6B73]">اسم المستخدم الرسمي:</span>
                <span className="font-mono font-bold text-[#245B63] bg-white px-2.5 py-0.5 rounded border border-[#DCE3E6]">
                  {activeCredToShow.username}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#5F6B73] font-semibold">كلمة المرور المؤقتة:</span>
                  <button
                    type="button"
                    onClick={() => setShowPasswordInSuccess(!showPasswordInSuccess)}
                    className="text-[11px] text-[#245B63] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPasswordInSuccess ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>إخفاء</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>إظهار</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DCE3E6]">
                  <span className="font-mono text-sm font-bold text-[#17252B] tracking-wider">
                    {showPasswordInSuccess ? activeCredToShow.password : '••••••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeCredToShow.password, 'pass')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#E8F1F1] text-[#245B63] hover:bg-[#245B63] hover:text-white transition-all text-xs font-bold cursor-pointer"
                  >
                    {copiedField === 'pass' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'pass' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Share Template */}
            <div className="p-3 bg-[#F0F7F7] border border-[#245B63]/20 rounded-xl space-y-2 text-xs text-[#245B63]">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>بطاقة الدعوة للمشاركة:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const message = `مرحباً ${activeCredToShow.deputyName}،\nتم تعيينك نائباً لعريف الصف في نظام مواظب المدرسي.\nبيانات الدخول لحسابك:\n• اسم المستخدم: ${activeCredToShow.username}\n• كلمة المرور: ${activeCredToShow.password}\nيرجى الدخول وتغيير كلمة المرور عند أول تسجيل دخول.`;
                    copyToClipboard(message, 'full');
                  }}
                  className="px-2 py-0.5 rounded bg-white border border-[#245B63]/30 text-[11px] font-bold hover:bg-[#245B63] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  {copiedField === 'full' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'full' ? 'تم نسخ الرسالة' : 'نسخ الرسالة كاملة'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#5F6B73] leading-relaxed">
                احرص على تسليم هذه البيانات للطالب بشكل آمن ومباشر. سيُطلب من الطالب تغيير كلمة المرور عند أول تسجيل دخول لضمان الخصوصية.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[#5F6B73]">لا توجد بيانات متاحة لعرضها.</div>
        )}

        <DialogFooter>
          <Button
            variant="primary"
            onClick={() => setIsSuccessModalOpen(false)}
            className="w-full font-bold"
          >
            تم الحفظ والإغلاق
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Remove Deputy Confirmation Modal */}
      <Dialog
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        title="تأكيد إعفاء النائب"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4">
            <div className="w-12 h-12 rounded-full bg-[#FDECEC] flex items-center justify-center border-4 border-white shadow-sm">
              <AlertCircle className="w-6 h-6 text-[#A61B1B]" />
            </div>
          </div>
          <p className="text-sm text-center text-[#17252B] leading-relaxed">
            هل أنت متأكد من رغبتك في صرف الطالب <span className="font-bold text-[#A61B1B]">{deputy?.studentName}</span> من منصب نائب العريف؟
          </p>
          <p className="text-xs text-center text-[#5F6B73]">
            سيتم تغيير حالته إلى (غير نشط) وسحب صلاحيات النظام منه فوراً ولن يتمكن من الدخول للوحة التحضير.
          </p>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsRemoveModalOpen(false)} disabled={isProcessing}>
            تراجع
          </Button>
          <Button 
            variant="danger" 
            onClick={handleRemoveDeputy}
            disabled={isProcessing}
            isLoading={isProcessing}
            className="bg-[#A61B1B] text-white hover:bg-[#851616]"
          >
            نعم، صرف من المنصب
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
