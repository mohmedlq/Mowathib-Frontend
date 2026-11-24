import {
  CalendarCheck,
  CalendarRange,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  GraduationCap,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';

const workflowSteps: {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    number: '٠١',
    title: 'إعداد المدرسة والشعب',
    description: 'تحديد العام الدراسي والأسابيع وتوزيع الشعب الدراسية لكل مرحلة.',
    icon: GraduationCap,
  },
  {
    number: '٠٢',
    title: 'قيد الطلاب وتكليف العرفاء',
    description: 'ربط الطلاب بشعبهم وتعيين عرفاء الفصول ومسجلي الحضور بصلاحيات محددة.',
    icon: Users,
  },
  {
    number: '٠٣',
    title: 'الرصد اليومي للحصص',
    description: 'تسجيل الحضور والغياب مباشرة مع متابعة فورية للشعب التي لم تحضّر بعد.',
    icon: ClipboardCheck,
  },
  {
    number: '٠٤',
    title: 'الإشعارات وكشوف Excel',
    description: 'توثيق رسائل أولياء الأمور عبر واتساب وتصدير كشوف التحضير الأسبوعية.',
    icon: FileSpreadsheet,
  },
];

const platformFeatures: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: CalendarCheck,
    title: 'رصد الحضور لكل حصة ويوم',
    description:
      'واجهة سريعة لتسجيل حضور وغياب الطلاب دون تعقيد، مع تحديث فوري يظهر لإدارة المدرسة لحظة بلحظة.',
  },
  {
    icon: CalendarRange,
    title: 'سجل أسبوعي وتقارير جاهزة',
    description:
      'استعراض حضور أي شعبة أو مرحلة على مدار الأسبوع، وتصدير ملفات Excel منسقة وجاهزة للطباعة والاعتماد.',
  },
  {
    icon: Users,
    title: 'متابعة الغياب وإشعارات واتساب',
    description:
      'حصر تلقائي للطلاب الغائبين يومياً مع قوالب رسائل قابلة للتعديل وتوثيق مباشر لحالة الإرسال.',
  },
  {
    icon: ShieldCheck,
    title: 'صلاحيات واضحة لكل دور',
    description:
      'بوابات منفصلة لإدارة المدرسة، ومسجل الحضور، وعريف الفصل بحيث يرى كل مستخدم مهامه فقط.',
  },
];

export function PlatformPreviewSection() {
  return (
    <section
      id="preview"
      dir="rtl"
      className="bg-[#F6F9F7] py-16 transition-colors dark:bg-[#0A140F] sm:py-24"
    >
      <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
        {/* Part 1: Architectural Workflow Strip */}
        <div id="workflow" className="space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-bold text-[#0B5D43] dark:text-[#6AD19C]">
                آلية العمل
              </span>
              <h2 className="mt-1.5 text-2xl font-black tracking-tight text-[#12261E] dark:text-[#F0F7F3] sm:text-3xl">
                من إعداد الشعب إلى كشف التحضير المعتمد
              </h2>
            </div>
            <p className="max-w-sm text-xs leading-6 text-[#5E7469] dark:text-[#9BB2A5] sm:text-sm">
              أربع خطوات مترابطة تختصر العمل الورقي اليومي داخل المدرسة.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#DCE7E2] bg-white dark:border-[#23392F] dark:bg-[#111E18]">
            <ol className="grid grid-cols-1 divide-y divide-[#E6EFEA] dark:divide-[#23392F] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-x-reverse">
              {workflowSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.number}
                    className="flex flex-col justify-between gap-5 p-6 sm:border-b sm:border-[#E6EFEA] sm:dark:border-[#23392F] lg:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#0B5D43] dark:text-[#6AD19C]">
                        {step.number}
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF6F1] text-[#0B5D43] dark:bg-[#1A3327] dark:text-[#7AD4A2]">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-extrabold text-[#142B22] dark:text-[#EDF7F1]">
                        {step.title}
                      </h3>
                      <p className="text-xs leading-6 text-[#60766B] dark:text-[#9DB5A8]">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Part 2: Core Capabilities (2x2 Editorial Grid) */}
        <div className="space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-[#0B5D43] dark:text-[#6AD19C]">
              إمكانيات المنصة
            </span>
            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-[#12261E] dark:text-[#F0F7F3] sm:text-3xl">
              مصممة لبيئة العمل المدرسية الفعلية
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-8 border-t border-[#DCE7E2] pt-8 dark:border-[#23392F] md:grid-cols-2">
            {platformFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4E3DA] bg-white text-[#0B5D43] dark:border-[#294236] dark:bg-[#14241D] dark:text-[#7AD4A2]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold text-[#142B22] dark:text-[#EDF7F1]">
                      {feature.title}
                    </h3>
                    <p className="text-xs leading-7 text-[#5E7469] dark:text-[#9DB5A8] sm:text-sm">
                      {feature.description}
                    </p>
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