import { useAuth } from '../../auth';
import { useSchoolSettings } from '../../../shared/services/schoolSettingsService';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../shared/services/schoolDataService';
import { Dialog, DialogFooter } from '../../../shared/components/ui/Dialog';
import { Button } from '../../../shared/components/ui/Button';
import { Printer } from 'lucide-react';
import { BrandLogo } from '../../../components/common/BrandLogo';

interface PrintClassNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrintClassNumberModal({ isOpen, onClose }: PrintClassNumberModalProps) {
  const { user } = useAuth();
  const { schoolName } = useSchoolSettings();
  const classId = user?.classId || 105;

  // Fetch Class Details
  const { data: classItem } = useQuery({
    queryKey: ['class_details', classId],
    queryFn: () => schoolDataService.getClassById(classId),
    enabled: classId > 0 && isOpen,
  });

  // Fetch Representatives to get Main and Deputy names
  const { data: reps = [] } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => schoolDataService.getRepresentatives(),
    enabled: isOpen,
  });

  const mainRep = reps.find(
    (r) =>
      (r.classId === classId && r.role === 'Representative') ||
      r.username === `${classId}_1` ||
      (r.className === classItem?.className && r.role === 'Representative')
  );

  const deputyRep = reps.find(
    (r) =>
      (r.classId === classId && r.role === 'Deputy') ||
      r.username === `${classId}_2` ||
      (r.className === classItem?.className && r.role === 'Deputy')
  );

  const classNum = classItem?.classNumber || classId;
  const getGradeName = (num: number) => {
    if (num >= 101 && num <= 110) return 'الصف الأول الثانوي';
    if (num >= 201 && num <= 210) return 'الصف الثاني الثانوي';
    if (num >= 301 && num <= 310) return 'الصف الثالث الثانوي';
    return 'المرحلة الثانوية';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="طباعة لافتة رقم الشعبة (باب الفصل / المكتب)"
      description="نموذج رسمي معتمد جاهز للطباعة والتعليق على باب الفصل."
    >
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-class-sign, #printable-class-sign * {
            visibility: visible !important;
          }
          #printable-class-sign {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 2.5rem !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            border: 8px double #245B63 !important;
            box-sizing: border-box !important;
            z-index: 99999 !important;
          }
        }
      `}</style>

      {/* Printable Sheet Preview */}
      <div
        id="printable-class-sign"
        data-keep-white="true"
        className="bg-white p-8 rounded-2xl border-4 border-double border-[#245B63] shadow-sm text-center space-y-6 select-none my-2"
      >
        {/* Ministry / School Header */}
        <div className="flex items-center justify-between border-b-2 border-[#DCE3E6] pb-4">
          <div className="text-right text-xs space-y-1 text-[#17252B]">
            <p className="font-bold">المملكة العربية السعودية</p>
            <p className="font-medium text-[#5F6B73]">وزارة التعليم</p>
            <p className="font-medium text-[#5F6B73]">{schoolName || 'ثانوية الفرسان الأهلية'}</p>
          </div>

          <div className="flex flex-col items-center">
            <BrandLogo variant="wordmark" className="h-11 w-auto object-contain" />
          </div>

          <div className="text-left text-xs space-y-1 text-[#17252B]">
            <p className="font-bold">العام الدراسي 1446-1447هـ</p>
            <p className="font-medium text-[#5F6B73]">الفصل الدراسي الأول</p>
            <p className="font-medium text-[#5F6B73]">إدارة شؤون الطلاب</p>
          </div>
        </div>

        {/* Center Prominent Class Sign */}
        <div className="py-6 space-y-3">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#E8F1F1] text-[#245B63] font-bold text-sm border border-[#CDE0E2]">
            {getGradeName(classNum)}
          </span>

          <div className="text-6xl sm:text-7xl font-extrabold text-[#17252B] tracking-tight font-mono py-2">
            شعبة {classNum}
          </div>

          <p className="text-xs text-[#5F6B73] font-medium max-w-md mx-auto">
            قاعة دراسية مجهزة ومعتمدة بنظام الرصد الإلكتروني اليومي الموحد
          </p>
        </div>

        {/* Official Class Representatives Box */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-[#DCE3E6] text-right">
          <div className="p-3 bg-[#F5F7F8] rounded-xl border border-[#DCE3E6]">
            <span className="text-[11px] text-[#5F6B73] block mb-0.5">عريف الشعبة المعتمد</span>
            <span className="text-sm font-bold text-[#17252B] block">
              {mainRep?.studentName || user?.fullName || 'عريف الصف'}
            </span>
          </div>

          <div className="p-3 bg-[#F5F7F8] rounded-xl border border-[#DCE3E6]">
            <span className="text-[11px] text-[#5F6B73] block mb-0.5">نائب عريف الشعبة</span>
            <span className="text-sm font-bold text-[#17252B] block">
              {deputyRep?.studentName || 'نائب عريف الصف'}
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-[10px] text-[#89949A] flex items-center justify-between border-t border-[#EEF2F3]">
          <span>رصيد بطاقات الاستئذان المعتمد: {classItem?.totalCards || 3} بطاقات</span>
          <span>منصة مواظب لإدارة الحضور المدرسي</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
        <Button
          variant="primary"
          icon={<Printer className="w-4 h-4" />}
          onClick={handlePrint}
          className="font-bold shadow-xs"
        >
          طباعة اللافتة الآن
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default PrintClassNumberModal;
