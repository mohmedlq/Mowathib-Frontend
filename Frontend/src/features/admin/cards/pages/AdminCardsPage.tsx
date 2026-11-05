import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { useSchoolSettings } from '../../../../shared/services/schoolSettingsService';
import { CreditCard, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';

export function AdminCardsPage() {
  const { schoolName } = useSchoolSettings();
  const [selectedCardType, setSelectedCardType] = useState<'rep' | 'bathroom'>('bathroom');
  const [selectedClassId, setSelectedClassId] = useState<number>(105);
  const [displayType, setDisplayType] = useState<'class' | 'rep'>('class');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { data: reps = [] } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => schoolDataService.getRepresentatives(),
  });

  const selectedClass = classes.find((c) => c.classId === selectedClassId);
  const mainRep = reps.find((r) => r.username === `${selectedClassId}_1`);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#245B63]" />
            <h1 className="text-xl font-bold text-[#17252B]">طباعة بطاقات العرفاء والاستئذان</h1>
          </div>
          <p className="text-xs text-[#5F6B73] mt-1">
            إصدار وطباعة بطاقات التعريف للعرفاء وبطاقات استئذان دورات المياه الرسمية للشعب
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={<Printer className="w-4 h-4" />}
          onClick={handlePrint}
          className="self-start sm:self-auto font-bold"
        >
          طباعة البطاقة المعروضة
        </Button>
      </div>

      {/* Configuration Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DCE3E6] shadow-xs space-y-4 no-print">
        <div className="flex items-center gap-2 border-b border-[#EEF2F3] pb-3">
          <button
            type="button"
            onClick={() => setSelectedCardType('bathroom')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCardType === 'bathroom'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            بطاقة استئذان دورة المياه (خاصة بالشعبة)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCardType('rep')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCardType === 'rep'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            بطاقة تعريف عريف / نائب الصف
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#17252B] mb-1.5">الشعبة المستهدفة:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className} (رصيد البطاقات: {c.totalCards})
                </option>
              ))}
            </select>
          </div>

          {selectedCardType === 'bathroom' && (
            <div>
              <label className="block text-xs font-semibold text-[#17252B] mb-1.5">النص المعروض على البطاقة:</label>
              <select
                value={displayType}
                onChange={(e) => setDisplayType(e.target.value as 'class' | 'rep')}
                className="w-full h-10 px-3 bg-white text-xs font-medium rounded-lg border border-[#DCE3E6] focus:border-[#245B63] outline-none cursor-pointer"
              >
                <option value="class">إظهار اسم الشعبة بارزاً (موصى به)</option>
                <option value="rep">إظهار اسم عريف الصف المعتمد</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Card Preview Container */}
      <div className="flex flex-col items-center justify-center p-8 bg-[#EEF2F3]/60 rounded-xl border border-dashed border-[#C8D2D7]">
        <span className="text-xs text-[#5F6B73] font-medium mb-4 no-print">
          معاينة شكل البطاقة قبل الطباعة الفعلية (أبعاد قياسية مخصصة لحامل البطاقات):
        </span>

        {/* Physical Card Representation (approx 85.6mm x 54mm standard badge) */}
        {selectedCardType === 'bathroom' ? (
          <div className="w-[340px] h-[215px] bg-white border-2 border-[#245B63] rounded-2xl shadow-sm p-4 flex flex-col justify-between text-right relative overflow-hidden select-none bg-gradient-to-b from-[#F9FBFC] to-white">
            {/* Lanyard punch hole indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full border border-[#DCE3E6] bg-[#ECEFF1]" />

            {/* Top Header Badge */}
            <div className="flex items-center justify-between border-b-2 border-[#245B63] pb-2 mt-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#245B63]" />
                <span className="text-xs font-bold text-[#17252B]">{schoolName}</span>
              </div>
              <span className="text-[10px] font-mono text-[#5F6B73]">2026-2027</span>
            </div>

            {/* Main Center Content */}
            <div className="my-auto text-center py-2">
              <span className="text-[10px] font-bold text-[#855500] bg-[#FFF4DA] px-3 py-0.5 rounded-full border border-[#EDD38C] inline-block mb-1.5">
                بطاقة استئذان رسمي لدورة المياه
              </span>
              <h2 className="text-2xl font-black text-[#245B63] tracking-tight">
                {displayType === 'class' ? selectedClass?.className || 'شعبة 105' : mainRep?.studentName || 'شعبة 105'}
              </h2>
              <p className="text-[10px] text-[#5F6B73] mt-1 font-mono">
                رقم البطاقة: MOW-{selectedClassId}-01
              </p>
            </div>

            {/* Bottom Footer Notice */}
            <div className="border-t border-[#DCE3E6] pt-1.5 flex items-center justify-between text-[9px] text-[#5F6B73]">
              <span>تُستخدم لطالب واحد فقط في الحصة</span>
              <span className="font-bold text-[#A61B1B]">يُمنع الخروج بدونها</span>
            </div>
          </div>
        ) : (
          <div className="w-[340px] h-[215px] bg-white border-2 border-[#245B63] rounded-2xl shadow-sm p-4 flex flex-col justify-between text-right relative overflow-hidden select-none bg-gradient-to-b from-[#F9FBFC] to-white">
            {/* Lanyard punch hole indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full border border-[#1d494f] bg-[#1d494f] z-10" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#245B63] pb-2 bg-[#245B63] text-white -mx-4 -mt-4 px-4 pt-3.5">
              <span className="text-xs font-bold">بطاقة تعريف عريف صف معتمد</span>
              <span className="text-[10px] font-mono font-bold tracking-wider">مواظب</span>
            </div>

            {/* Center Content */}
            <div className="my-auto space-y-1.5 py-2">
              <div className="text-[11px] text-[#5F6B73]">اسم العريف المعتمد:</div>
              <div className="text-base font-bold text-[#17252B]">
                {mainRep?.studentName || 'محمد أحمد سالم العتيبي'}
              </div>
              <div className="flex items-center justify-between text-xs text-[#5F6B73] pt-1">
                <span className="bg-[#E8F1F1] px-2 py-0.5 rounded text-[#245B63] font-bold">
                  {selectedClass?.className}
                </span>
                <span className="text-[11px]">
                  رمز الدخول: <strong className="font-mono text-[#17252B] bg-[#F5F7F8] px-1.5 py-0.5 rounded border border-[#DCE3E6]">{selectedClassId}_1</strong>
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#DCE3E6] pt-1.5 flex items-center justify-between text-[9px] text-[#5F6B73]">
              <span>إدارة المدرسة والشؤون التعليمية</span>
              <span className="font-mono font-medium">العام 2026-2027</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

