import React from 'react';
import { CalendarCheck, ShieldCheck, Download, Users } from 'lucide-react';

export const PlatformPreviewSection: React.FC = () => {
  return (
    <section id="preview" className="py-16 bg-[#F4F8F6] dark:bg-[#0D1E18]/60 border-y border-[#D8E5DF] dark:border-[#1E4638] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-center">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold text-[#0B5D43] dark:text-[#3E9B78] uppercase tracking-wider">
            جولة في النظام
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#122B23] dark:text-[#F4F8F6]">
            واجهة تفاعلية مصممة خصيصاً للميدان التعليمي
          </h2>
          <p className="text-sm sm:text-base text-[#3E544C] dark:text-[#A3C7B9]">
            تجربة استخدام فائقة السلاسة توفر وقت المعلمين والإدارة، وتمكن العرفاء من إتمام التحضير في أقل من 30 ثانية لكل حصة.
          </p>
        </div>

        {/* Showcase Image with border-radius: 20px and soft emerald shadow */}
        <div className="relative max-w-5xl mx-auto">
          <div className="absolute -inset-4 rounded-[28px] bg-[#0B5D43]/15 dark:bg-[#3E9B78]/15 blur-2xl pointer-events-none" />
          <div className="relative z-10 overflow-hidden rounded-[20px] shadow-[0_20px_50px_rgba(11,93,67,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#D8E5DF] dark:border-[#1E4638] bg-white dark:bg-[#122B23]">
            <img
              src="/assets/images/landing-mockup.jpg"
              alt="معاينة شاشة التحضير الأسبوعي وإحصائيات الحضور في منصة مواظب"
              loading="lazy"
              className="w-full h-auto object-cover"
              style={{ borderRadius: '20px' }}
            />
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 text-right">
          <div className="p-5 rounded-xl bg-white dark:bg-[#122B23] border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#122B23] dark:text-[#F4F8F6]">جدول حصص ديناميكي</h3>
            <p className="text-xs text-[#3E544C] dark:text-[#A3C7B9] leading-relaxed">
              تكيّف تلقائي لعدد الحصص (7 حصص الأحد إلى الثلاثاء، و6 حصص الأربعاء والخميس).
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#122B23] border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#122B23] dark:text-[#F4F8F6]">صلاحيات محددة للعريف</h3>
            <p className="text-xs text-[#3E544C] dark:text-[#A3C7B9] leading-relaxed">
              بوابة مخصصة ومبسطة للعريف والنائب لرصد الحصة بدون أي تعقيد أو وصول غير مصرح.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#122B23] border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#122B23] dark:text-[#F4F8F6]">تصدير Excel فوري</h3>
            <p className="text-xs text-[#3E544C] dark:text-[#A3C7B9] leading-relaxed">
              استخراج مصنفات الحضور الأسبوعية والشهرية لجميع المراحل الدراسية مطابقة لمتطلبات الوزارة.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#122B23] border border-[#D8E5DF] dark:border-[#1E4638] shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#122B23] dark:text-[#F4F8F6]">بطاقات استئذان ذكية</h3>
            <p className="text-xs text-[#3E544C] dark:text-[#A3C7B9] leading-relaxed">
              تنظيم خروج الطلاب ببطاقات استئذان رسمية وطباعة لافتات الفصول بلمسة واحدة.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformPreviewSection;
