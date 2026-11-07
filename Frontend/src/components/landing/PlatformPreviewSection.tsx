
import React from 'react';
import {
  CalendarCheck,
  CalendarRange,
  Users,
  ShieldCheck,
  ArrowUpLeft,
} from 'lucide-react';

const platformFeatures = [
  {
    icon: CalendarCheck,
    number: '01',
    title: 'رصد الحضور لكل حصة',
    description:
      'تسجيل حالات الحضور والغياب والانقطاع لكل طالب، مع تحديد اليوم والحصة الدراسية بسهولة.',
  },
  {
    icon: CalendarRange,
    number: '02',
    title: 'متابعة أسبوعية واضحة',
    description:
      'مراجعة سجل حضور الفصل على مدار الأسبوع، والرجوع إلى الأسابيع الدراسية السابقة.',
  },
  {
    icon: Users,
    number: '03',
    title: 'إدارة الفصول والطلاب',
    description:
      'تنظيم العام الدراسي والشعب وتسجيل الطلاب وربط كل طالب بفصله الدراسي.',
  },
  {
    icon: ShieldCheck,
    number: '04',
    title: 'تنظيم حسابات العرفاء',
    description:
      'تخصيص حسابات العرفاء والنواب وربط كل حساب بالشعبة والصلاحيات المناسبة.',
  },
];

export const PlatformPreviewSection: React.FC = () => {
  return (
    <section
      id="preview"
      className="relative overflow-hidden border-y border-[#DCE9DF] bg-white py-16 transition-colors dark:border-[#263E31] dark:bg-[#0B1912] sm:py-24"
    >
      <div className="pointer-events-none absolute -right-40 top-20 h-80 w-80 rounded-full bg-[#3E9B78]/10 blur-3xl dark:bg-[#3E9B78]/[0.07]" />
      <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-[#0B5D43]/[0.07] blur-3xl dark:bg-[#0B5D43]/10" />

      <div className="relative mx-auto max-w-7xl space-y-14 px-4 sm:px-6 lg:px-8">

        {/* Section Heading */}
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#CDE4D5] bg-[#EFF8F1] px-3.5 py-1.5 text-xs font-bold text-[#176B43] dark:border-[#315541] dark:bg-[#183326] dark:text-[#83D9A5]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#25A66A]" />
            تجربة مواظب
          </span>

          <h2 className="text-2xl font-black leading-snug tracking-tight text-[#142D20] dark:text-[#F0F7F1] sm:text-4xl">
            كل ما تحتاجه لمتابعة الحضور،
            <span className="block text-[#16815A] dark:text-[#75D39B]">
              في مكان واحد.
            </span>
          </h2>

          <p className="text-sm leading-8 text-[#5B7063] dark:text-[#A9C0B0] sm:text-base sm:leading-9">
            من تنظيم الفصول والطلاب إلى رصد الحصص ومراجعة الحضور أسبوعياً؛
            مواظب تربط أعمال الإدارة والعرفاء في تجربة مدرسية واحدة.
          </p>
        </div>

        {/* Actual Platform Screenshot */}
        <div className="relative mx-auto max-w-6xl">
          <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-r from-[#0B5D43]/10 via-[#3E9B78]/15 to-[#0B5D43]/10 blur-2xl dark:from-[#3E9B78]/10 dark:via-[#3E9B78]/10 dark:to-[#0B5D43]/10" />

          <div className="relative overflow-hidden rounded-2xl border border-[#D7E6DB] bg-[#F7FAF8] shadow-[0_30px_80px_rgba(16,67,43,0.13)] dark:border-[#2B4937] dark:bg-[#13251A] dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-[#E1EBE4] bg-white/80 px-4 py-3 dark:border-[#294133] dark:bg-[#172B20] sm:px-6">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E6B46A]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#79B991]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#9BAEB1]" />
              </div>

              <span className="text-[10px] font-bold tracking-wide text-[#64776B] dark:text-[#A7BBAE] sm:text-xs">
                مواظب — واجهة المنصة
              </span>
            </div>

            <img
              src="/assets/images/landing-mockup.jpg"
              alt="لقطة من واجهة منصة مواظب لمتابعة الحضور الدراسي"
              loading="lazy"
              className="block h-auto w-full object-contain"
            />
          </div>
        </div>

        {/* Actual Platform Capabilities */}
        <div className="space-y-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2 text-right">
              <span className="text-xs font-bold text-[#16815A] dark:text-[#75D39B]">
                ما الذي يقدمه مواظب؟
              </span>
              <h3 className="text-xl font-black text-[#142D20] dark:text-[#F0F7F1] sm:text-2xl">
                أدوات أساسية، وتجربة متكاملة.
              </h3>
            </div>

            <p className="max-w-md text-xs leading-7 text-[#718277] dark:text-[#A2B6A8] sm:text-sm">
              كل وظيفة مرتبطة باحتياج فعلي داخل المدرسة، دون تعقيد أو خطوات زائدة.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platformFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.number}
                  className="group relative overflow-hidden rounded-2xl border border-[#DFEAE1] bg-[#FAFCFA] p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:border-[#A9D1B7] hover:bg-white hover:shadow-[0_16px_35px_rgba(18,65,40,0.08)] dark:border-[#294234] dark:bg-[#122219] dark:hover:border-[#47775A] dark:hover:bg-[#172D20] dark:hover:shadow-[0_16px_35px_rgba(0,0,0,0.20)] sm:p-6"
                >
                  <div className="mb-7 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-[#91A599] dark:text-[#759381]">
                      {feature.number}
                    </span>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4E9DA] bg-[#EAF5ED] text-[#0B7049] transition-transform duration-300 group-hover:scale-105 dark:border-[#315540] dark:bg-[#203D2B] dark:text-[#83D9A5]">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <h4 className="mb-2 text-sm font-black text-[#1B3827] dark:text-[#EAF4EC] sm:text-base">
                    {feature.title}
                  </h4>

                  <p className="text-xs leading-7 text-[#66786C] dark:text-[#A6B9AA]">
                    {feature.description}
                  </p>

                  <div className="mt-5 flex items-center justify-end text-[#16815A] opacity-0 transition-all duration-300 group-hover:opacity-100 dark:text-[#75D39B]">
                    <ArrowUpLeft className="h-4 w-4" />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default PlatformPreviewSection;
