
import {
  CalendarCheck,
  CalendarRange,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  GraduationCap,
  ClipboardCheck,
  ArrowLeft,
  Check,
  type LucideIcon,
} from 'lucide-react';

const workflowSteps: {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    number: '01',
    title: 'تنظيم المدرسة',
    description:
      'إعداد العام الدراسي وإنشاء الشعب وتنظيم الفصول الدراسية.',
    icon: GraduationCap,
  },
  {
    number: '02',
    title: 'تسجيل الطلاب',
    description:
      'تسجيل الطلاب وربط كل طالب بالشعبة المناسبة له.',
    icon: Users,
  },
  {
    number: '03',
    title: 'رصد الحضور',
    description:
      'تسجيل حالات الحضور والغياب والانقطاع لكل حصة دراسية.',
    icon: ClipboardCheck,
  },
  {
    number: '04',
    title: 'مراجعة التقارير',
    description:
      'متابعة السجلات الأسبوعية واستخراج كشوف الحضور.',
    icon: FileSpreadsheet,
  },
];

const platformFeatures: {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
}[] = [
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

export function PlatformPreviewSection() {
  return (
    <section
      id="preview"
      dir="rtl"
      className="relative isolate overflow-hidden border-y border-[#DFEAE1] bg-[#F8FBF8] py-20 transition-colors dark:border-[#263E31] dark:bg-[#0B1912] sm:py-28"
    >
      {/* Background Decoration */}
      <div className="pointer-events-none absolute -right-40 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-[#3E9B78]/[0.08] blur-[100px] dark:bg-[#3E9B78]/[0.06]" />

      <div className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-[420px] w-[420px] rounded-full bg-[#0B5D43]/[0.07] blur-[100px] dark:bg-[#0B5D43]/[0.08]" />

      <div className="mx-auto max-w-7xl space-y-20 px-4 sm:px-6 lg:px-8">

        {/* =====================================================
            SECTION HEADING
        ===================================================== */}

        <div className="mx-auto max-w-3xl space-y-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#CDE4D5] bg-[#EFF8F1] px-4 py-2 text-xs font-bold text-[#176B43] dark:border-[#315541] dark:bg-[#183326] dark:text-[#83D9A5]">
            <span className="h-2 w-2 rounded-full bg-[#25A66A]" />
            اكتشف إمكانيات مواظب
          </span>

          <h2 className="text-3xl font-black leading-[1.5] tracking-tight text-[#142D20] dark:text-[#F0F7F1] sm:text-4xl lg:text-5xl">
            إدارة الحضور تبدأ من هنا،
            <span className="block text-[#16815A] dark:text-[#75D39B]">
              وكل التفاصيل في مكان واحد.
            </span>
          </h2>

          <p className="mx-auto max-w-2xl text-sm leading-8 text-[#64766A] dark:text-[#A9C0B0] sm:text-base sm:leading-9">
            مواظب يجمع تنظيم المدرسة وإدارة الطلاب ورصد الحضور
            ومراجعة التقارير في منظومة واحدة، مصممة لتسهيل
            العمل اليومي داخل المدرسة.
          </p>
        </div>

        {/* =====================================================
            WORKFLOW — HOW MOWATHIB WORKS
        ===================================================== */}

        <div className="relative overflow-hidden rounded-[28px] border border-[#DCE9DF] bg-white p-5 shadow-[0_20px_65px_rgba(18,65,40,0.045)] dark:border-[#294234] dark:bg-[#112119] sm:rounded-[32px] sm:p-9 lg:p-11">

          {/* Decorative Background */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#E7F5EA]/70 blur-3xl dark:bg-[#1A3D29]/30" />

          <div className="relative space-y-9">

            {/* Workflow Heading */}

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <span className="text-xs font-bold tracking-wide text-[#16815A] dark:text-[#75D39B]">
                  طريقة العمل
                </span>

                <h3 className="text-xl font-black text-[#142D20] dark:text-[#F0F7F1] sm:text-2xl">
                  من إعداد المدرسة إلى كشف الحضور.
                </h3>
              </div>

              <p className="max-w-sm text-xs leading-7 text-[#738277] dark:text-[#A2B6A8] sm:text-sm">
                خطوات مترابطة تجعل إدارة الحضور أكثر تنظيمًا
                ووضوحًا لجميع المسؤولين.
              </p>
            </div>

            {/* Workflow Steps */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.number}
                    className="group relative flex min-h-[220px] flex-col rounded-2xl border border-[#E4ECE5] bg-[#FAFCFA] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#B9DCC3] hover:bg-white hover:shadow-[0_16px_35px_rgba(18,65,40,0.07)] dark:border-[#294234] dark:bg-[#14271B] dark:hover:border-[#47775A] dark:hover:bg-[#192F20] sm:p-6"
                  >
                    {/* Top Row */}

                    <div className="mb-8 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold tracking-[0.2em] text-[#A0B2A4] dark:text-[#64836D]">
                        STEP {step.number}
                      </span>

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D7E9DC] bg-[#EDF7EF] text-[#176B43] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#176B43] group-hover:text-white dark:border-[#315541] dark:bg-[#203D2B] dark:text-[#83D9A5] dark:group-hover:bg-[#25845C] dark:group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Content */}

                    <div className="mt-auto space-y-2">
                      <h4 className="text-base font-black text-[#1B3827] dark:text-[#EAF4EC]">
                        {step.title}
                      </h4>

                      <p className="text-xs leading-7 text-[#718277] dark:text-[#A6B9AA]">
                        {step.description}
                      </p>
                    </div>

                    {/* Step Indicator */}

                    <div className="absolute bottom-0 right-5 left-5 h-[2px] overflow-hidden rounded-full bg-[#E8F0E9] dark:bg-[#263E30]">
                      <div
                        className="h-full origin-right rounded-full bg-[#25845C] transition-transform duration-500 group-hover:scale-x-100"
                        style={{
                          transform: 'scaleX(0)',
                        }}
                      />
                    </div>

                    {/* Step Number Accent */}

                    {index === workflowSteps.length - 1 && (
                      <span className="sr-only">
                        الخطوة الأخيرة
                      </span>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Workflow Result */}

            <div className="flex flex-col gap-4 rounded-2xl border border-[#D8E9DD] bg-[#F1F8F2] p-5 dark:border-[#315541] dark:bg-[#193326] sm:flex-row sm:items-center sm:justify-between sm:px-7">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDF0E1] text-[#176B43] dark:bg-[#28543A] dark:text-[#83D9A5]">
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                </div>

                <div>
                  <h4 className="text-sm font-black text-[#1B3827] dark:text-[#EAF4EC]">
                    كل أعمال الحضور مترابطة.
                  </h4>

                  <p className="mt-1 text-xs leading-6 text-[#718277] dark:text-[#A6B9AA]">
                    من تسجيل البيانات إلى استعراضها واستخراجها.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  'سجلات منظمة',
                  'متابعة أسبوعية',
                  'كشوف Excel',
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-lg border border-[#D6E6D9] bg-white px-3 py-2 text-[11px] font-bold text-[#32744F] dark:border-[#3B6348] dark:bg-[#203D2B] dark:text-[#A4DDB6]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* =====================================================
            PLATFORM FEATURES
        ===================================================== */}

        <div className="space-y-8">

          {/* Features Heading */}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#16815A] dark:text-[#75D39B]">
                إمكانيات المنصة
              </span>

              <h3 className="text-2xl font-black tracking-tight text-[#142D20] dark:text-[#F0F7F1] sm:text-3xl">
                أدوات تخدم احتياجات المدرسة.
              </h3>
            </div>

            <p className="max-w-md text-xs leading-7 text-[#718277] dark:text-[#A2B6A8] sm:text-sm">
              وظائف عملية تجمع أهم مهام الإدارة والعرفاء،
              وتساعد على الوصول إلى المعلومات بسهولة.
            </p>
          </div>

          {/* Feature Cards */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.number}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#DFEAE1] bg-white p-6 text-right transition-all duration-300 hover:-translate-y-1 hover:border-[#B4D6BD] hover:shadow-[0_18px_40px_rgba(18,65,40,0.07)] dark:border-[#294234] dark:bg-[#122219] dark:hover:border-[#47775A] dark:hover:shadow-[0_18px_40px_rgba(0,0,0,0.2)] sm:min-h-[245px]"
                >
                  {/* Top Accent */}

                  <div className="absolute right-0 top-0 h-[3px] w-0 bg-[#25845C] transition-all duration-500 group-hover:w-full" />

                  {/* Icon + Number */}

                  <div className="mb-8 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold tracking-widest text-[#A1B3A5] dark:text-[#759381]">
                      {feature.number}
                    </span>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF7EF] text-[#176B43] transition-all duration-300 group-hover:bg-[#176B43] group-hover:text-white dark:bg-[#203D2B] dark:text-[#83D9A5] dark:group-hover:bg-[#25845C] dark:group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Feature Content */}

                  <div className="space-y-3">
                    <h4 className="text-base font-black text-[#1B3827] dark:text-[#EAF4EC]">
                      {feature.title}
                    </h4>

                    <p className="text-xs leading-7 text-[#718277] dark:text-[#A6B9AA]">
                      {feature.description}
                    </p>
                  </div>

                  {/* Bottom Indicator */}

                  <div className="mt-auto flex justify-end pt-7">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E0EBE2] text-[#7C9C84] transition-all duration-300 group-hover:border-[#176B43] group-hover:bg-[#176B43] group-hover:text-white dark:border-[#315541] dark:text-[#83D9A5] dark:group-hover:border-[#25845C] dark:group-hover:bg-[#25845C]">
                      <ArrowLeft className="h-4 w-4" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

export default PlatformPreviewSection;
