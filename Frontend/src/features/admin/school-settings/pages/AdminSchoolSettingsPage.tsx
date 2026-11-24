import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth';
import { schoolsApi } from '../../../schools/api/schoolsApi';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';
import { useNotifications } from '../../../notifications';
import {
  Building2,
  Copy,
  Check,
  ShieldCheck,
  GraduationCap,
  Layers,
  Save,
} from 'lucide-react';

export function AdminSchoolSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useNotifications();
  const [copied, setCopied] = useState(false);

  // Form State
  const [schoolName, setSchoolName] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Fetch school details
  const { data: school, isLoading } = useQuery({
    queryKey: ['admin_school_details', user?.schoolCode, user?.id],
    queryFn: async () => {
      if (user?.schoolCode) {
        return await schoolsApi.getSchoolByCode(user.schoolCode);
      }
      if (user?.id) {
        return await schoolsApi.getSchoolForAdmin(user.id);
      }
      const defaultCode = await schoolsApi.getDefaultSchoolCode();
      return await schoolsApi.getSchoolByCode(defaultCode);
    },
  });

  useEffect(() => {
    if (school) {
      setSchoolName(school.name);
      setIsActive(school.isActive);
    }
  }, [school]);

  const copySchoolCode = () => {
    if (school?.schoolCode) {
      navigator.clipboard.writeText(school.schoolCode);
      setCopied(true);
      toast.show('تم نسخ رمز المدرسة (UUID) إلى الحافظة', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!school?.schoolCode) throw new Error('رمز المدرسة غير متوفر');
      if (!schoolName.trim()) throw new Error('اسم المدرسة مطلوب');

      return await schoolsApi.updateSchool(school.schoolCode, {
        name: schoolName.trim(),
        isActive,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin_school_details'] });
      toast.show('تم تحديث إعدادات وبيانات المدرسة بنجاح', 'success');
      setSchoolName(updated.name);
      setIsActive(updated.isActive);
    },
    onError: (err: any) => {
      const msg = err?.response?.data || err?.message || 'فشل تحديث إعدادات المدرسة';
      toast.show(typeof msg === 'string' ? msg : 'فشل تحديث إعدادات المدرسة', 'danger');
    },
  });

  if (isLoading) {
    return <MuwathibLoading message="جاري تحميل بيانات وإعدادات المدرسة..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Context Bar */}
      <div className="bg-white dark:bg-[#122B23] p-5 sm:p-6 rounded-2xl border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0B5D43] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-[#122B23] dark:text-[#F4F8F6] tracking-tight">
                إعدادات المدرسة والمؤسسة التعليمية
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  school?.isActive
                    ? 'bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78]'
                    : 'bg-[#FDECEC] dark:bg-[#331518] text-[#C5221F] dark:text-[#F87171]'
                }`}
              >
                {school?.isActive ? 'مدرسة نشطة ومفعلة' : 'مدرسة غير مفعلة'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#718A80] dark:text-[#A3C7B9] mt-1">
              إدارة بيانات المدرسة، رمز المؤسسة الفريد (UUID)، والتحكم في حالة النشاط
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EAF5EF] dark:bg-[#163828] text-[#25855A] dark:text-[#75D39B] flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">إجمالي طلاب المدرسة</div>
            <div className="text-lg font-bold text-[#17252B] dark:text-[#F0F4F6]">
              {school?.studentsCount ?? 0} طالب
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8F1F3] dark:bg-[#1C353D] text-[#1F7A8C] dark:text-[#68D8D6] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">إجمالي الشعب الدراسية</div>
            <div className="text-lg font-bold text-[#17252B] dark:text-[#F0F4F6]">
              {school?.classesCount ?? 0} شعبة
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-[#182226] rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs p-6 space-y-6">
        {/* Read-Only Identifiers */}
        <div className="p-4 rounded-xl bg-[#F8FAFB] dark:bg-[#131D21] border border-[#EEF2F3] dark:border-[#28373D] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1]">
            <ShieldCheck className="w-4 h-4 text-[#0B5D43]" />
            <span>معرفات النظام غير القابلة للتعديل (Immutable Identifiers)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5F6B73] dark:text-[#9BAAB1] mb-1">
                الرقم التسلسلي للمدرسة (School ID):
              </label>
              <div className="h-10 px-3 bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6] text-xs font-mono font-bold rounded-lg border border-[#DCE3E6] dark:border-[#28373D] flex items-center">
                #{school?.schoolId}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5F6B73] dark:text-[#9BAAB1] mb-1">
                رمز المدرسة الفريد (School Code UUID):
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-10 px-3 bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6] text-xs font-mono rounded-lg border border-[#DCE3E6] dark:border-[#28373D] flex items-center overflow-x-auto select-all">
                  {school?.schoolCode}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copySchoolCode}
                  className="h-10 px-3 shrink-0"
                  title="نسخ الرمز"
                >
                  {copied ? <Check className="w-4 h-4 text-[#25855A]" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4">
          <div>
            <Input
              label="اسم المدرسة الرسمي *"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="مثال: مدرسة مواظب الثانوية"
              className="text-sm font-semibold"
            />
            <p className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] mt-1">
              يظهر هذا الاسم في ترويسة النظام ولوحات متابعة المعلمين والعرفاء
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#17252B] dark:text-[#F0F4F6]">
                حالة تفعيل المدرسة في النظام
              </div>
              <div className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] mt-0.5">
                عند إلغاء التفعيل، يتم تعليق عمليات رصد الحضور مؤقتاً
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B5D43]"></div>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-[#EEF2F3] dark:border-[#28373D] flex justify-end">
          <Button
            type="button"
            variant="primary"
            disabled={updateMutation.isPending || !schoolName.trim()}
            onClick={() => updateMutation.mutate()}
            className="bg-[#0B5D43] hover:bg-[#084733] text-white font-bold"
          >
            <Save className="w-4 h-4 ml-1.5" />
            <span>{updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdminSchoolSettingsPage;
