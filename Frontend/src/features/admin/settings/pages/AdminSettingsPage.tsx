import { useState } from 'react';
import { Settings, Shield, Server, Database, Edit3, Check, RotateCcw, Info } from 'lucide-react';
import { useAuth } from '../../../auth';
import { Button } from '../../../../shared/components/ui/Button';
import { Input } from '../../../../shared/components/ui/Input';
import { useSchoolSettings } from '../../../../shared/services/schoolSettingsService';
import { useNotifications } from '../../../notifications';

export function AdminSettingsPage() {
  const { user, logout } = useAuth();
  const { schoolName, isCustom, updateSchoolName, resetSchoolName } = useSchoolSettings();
  const { toast } = useNotifications();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(schoolName);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) {
      toast.show('يرجى إدخال مسمى صحيح للمدرسة', 'danger');
      return;
    }
    updateSchoolName(editedName.trim());
    setIsEditingName(false);
    toast.show('تم تحديث اسم المدرسة وحفظ الإعداد بنجاح', 'success');
  };

  const handleResetName = () => {
    resetSchoolName();
    setEditedName('مدرسة التميز الثانوية للبنين');
    setIsEditingName(false);
    toast.show('تمت استعادة مسمى المدرسة الافتراضي', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#245B63]" />
          <h1 className="text-xl font-bold text-[#17252B]">إعدادات النظام والمدرسة</h1>
        </div>
        <p className="text-xs text-[#5F6B73] mt-1">
          بيانات المدرسة الرسمية، الاتصال بقاعدة البيانات، وحساب المسؤول
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* School Information */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#DCE3E6] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEF2F3] pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#245B63]" />
              <h2 className="text-sm font-bold text-[#17252B]">البيانات المؤسسية المعتمدة</h2>
            </div>
            {!isEditingName && (
              <button
                type="button"
                onClick={() => {
                  setEditedName(schoolName);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1 text-xs text-[#245B63] hover:text-[#1d494f] font-semibold bg-[#E8F1F1] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل المسمى</span>
              </button>
            )}
          </div>

          {/* School Name Edit Form */}
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="p-3.5 rounded-xl bg-[#F8FAFA] border border-[#245B63]/20 space-y-3">
              <Input
                label="اسم الصرح التعليمي المعتمد"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="أدخل مسمى المدرسة..."
                autoFocus
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="primary" size="sm" icon={<Check className="w-3.5 h-3.5" />}>
                    حفظ التغييرات
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditedName(schoolName);
                      setIsEditingName(false);
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
                {isCustom && (
                  <button
                    type="button"
                    onClick={handleResetName}
                    className="flex items-center gap-1 text-[11px] text-[#A61B1B] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    استعادة الافتراضي
                  </button>
                )}
              </div>
            </form>
          ) : null}

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">اسم الصرح التعليمي:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#17252B]">{schoolName}</span>
                {isCustom && (
                  <span className="text-[10px] bg-[#E8F1F1] text-[#245B63] px-2 py-0.5 rounded-full font-bold">
                    مخصص
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">العام الدراسي الفعّال:</span>
              <span className="font-mono font-bold text-[#245B63] bg-white px-2 py-0.5 rounded border border-[#DCE3E6]">2026-2027</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">هيكل الفصول المعتمد:</span>
              <span className="font-semibold text-[#17252B]">30 شعبة (10 لكل مرحلة)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">جدول الحصص الأسبوعي:</span>
              <span className="font-semibold text-[#17252B]">7 حصص يومياً (الأحد - الخميس)</span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F0F7F7] border border-[#245B63]/20 text-[11px] text-[#245B63]">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>ملاحظة الحفظ:</strong> يتم تطبيق اسم المدرسة فوراً في الترويسات الرسمية وبطاقات الاستئذان وتقارير الحضور المصدرة لـ Excel، ويُحفظ محلياً في إعدادات المتصفح.
            </p>
          </div>
        </div>

        {/* Backend & API Connectivity */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#DCE3E6] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#EEF2F3] pb-3">
            <Server className="w-4 h-4 text-[#245B63]" />
            <h2 className="text-sm font-bold text-[#17252B]">خادم الويب وقاعدة البيانات</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">محرك الخادم:</span>
              <span className="font-mono text-[#17252B] font-semibold">ASP.NET Core 9.0 Web API</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">محرك البيانات:</span>
              <span className="font-mono text-[#17252B] font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#245B63]" />
                PostgreSQL (EF Core)
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">عنوان API المعتمد:</span>
              <span className="font-mono font-semibold text-[#245B63]">/api (Proxy: localhost:5179)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5F7F8] border border-[#DCE3E6]/60">
              <span className="text-[#5F6B73]">حالة الاتصال والخدمة:</span>
              <span className="font-bold text-[#176B3A] bg-[#E8F5EC] border border-[#B7DEC5] px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#176B3A] animate-pulse" />
                متصل وجاهز للعمل
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info and Logout */}
      <div className="bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#17252B]">الحساب الإداري الحالي</h3>
          <p className="text-xs text-[#5F6B73] mt-0.5">
            مسجل باسم: <strong className="text-[#17252B]">{user?.fullName || 'مدير النظام'}</strong> (
            <span className="font-mono">{user?.username}</span>)
          </p>
        </div>

        <Button type="button" variant="danger" size="md" onClick={logout}>
          تسجيل الخروج من النظام
        </Button>
      </div>
    </div>
  );
}

