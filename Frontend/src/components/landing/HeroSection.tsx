
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Users,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../shared/components/ui/Button';

const demoStudents = [
  { id: '01', name: 'طالب 01', status: 'حاضر' },
  { id: '02', name: 'طالب 02', status: 'غائب' },
  { id: '03', name: 'طالب 03', status: 'غير محدد' },
] as const;

export const HeroSection: React.FC = () => {
  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden py-14 sm:py-20 lg:py-24"
    >
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_15%,rgba(11,93,67,0.10),transparent_42%),radial-gradient(ellipse_at_10%_90%,rgba(62,155,120,0.09),transparent_40%)] dark:bg-[radial-gradient(ellipse_at_85%_15%,rgba(62,155,120,0.12),transparent_42%),radial-gradient(ellipse_at_10%_90%,rgba(11,93,67,0.12),transparent_40%)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">

          {/* Content */}
          <div className="space-y-7 text-right lg:col-span-7">

            
            <div className="space-y-4">
              <h1 className="text-[2.35rem] font-black leading-[1.35] tracking-tight text-[#122B23] dark:text-[#F1F8F4] sm:text-5xl lg:text-[3.65rem]">
                حضور الحصص،
                <br />
                <span className="bg-gradient-to-l from-[#0B5D43] via-[#167B59] to-[#43A77D] bg-clip-text text-transparent dark:from-[#65C995] dark:via-[#55B98A] dark:to-[#9BE6BA]">
                  أوضح. أسهل. أكثر تنظيماً.
                </span>
              </h1>

              <p className="max-w-2xl text-sm leading-8 text-[#52685D] dark:text-[#B3C9BC] sm:text-base sm:leading-9">
                مواظب تجمع إدارة الفصول والطلاب مع رصد الحضور لكل حصة دراسية،
                وتمنح إدارة المدرسة والعرفاء تجربة موحدة لمتابعة الانضباط
                المدرسي وتنظيم سجلات الحضور.
              </p>
            </div>

            {/* Main Actions */}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
              <Link to="/admin/login" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center border-0 bg-[#0B5D43] px-7 font-bold text-white shadow-[0_8px_24px_rgba(11,93,67,0.20)] transition-all hover:-translate-y-0.5 hover:bg-[#084733] hover:shadow-[0_12px_28px_rgba(11,93,67,0.28)] sm:w-auto"
                  icon={<ArrowLeft className="h-4 w-4" />}
                >
                  الدخول إلى لوحة الإدارة
                </Button>
              </Link>

              <Link to="/representative/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-center border-[#BCD6C8] bg-white/70 px-7 font-bold text-[#155B40] transition-all hover:-translate-y-0.5 hover:border-[#0B5D43] hover:bg-[#EAF5EE] dark:border-[#355B49] dark:bg-[#122B23]/70 dark:text-[#A1E2BC] dark:hover:bg-[#1A3B2D] sm:w-auto"
                  icon={<Users className="h-4 w-4" />}
                >
                  بوابة عريف الفصل
                </Button>
              </Link>
            </div>

            {/* Real Platform Highlights */}
            <div className="grid grid-cols-1 gap-3 border-t border-[#D8E5DF] pt-6 dark:border-[#254536] sm:grid-cols-3">
              {[
                { icon: CheckCircle2, text: 'رصد لكل حصة دراسية' },
                { icon: Users, text: 'إدارة الفصول والطلاب' },
                { icon: ClipboardCheck, text: 'متابعة أسبوعية منظمة' },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-xs font-semibold text-[#486454] dark:text-[#B5CFBE]"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-[#16845B] dark:text-[#6DD6A0]" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Attendance Preview */}
          <div className="relative mx-auto w-full max-w-[540px] lg:col-span-5">

            <div className="absolute -inset-6 -z-10 rounded-full bg-[#3E9B78]/15 blur-3xl dark:bg-[#3E9B78]/10" />

            <div className="relative rounded-[28px] border border-[#D4E7DA] bg-white/95 p-3 shadow-[0_28px_80px_rgba(15,65,43,0.14)] backdrop-blur dark:border-[#2B5140] dark:bg-[#11261C]/95 dark:shadow-[0_28px_80px_rgba(0,0,0,0.35)] sm:p-5">

              {/* Preview Topbar */}
              <div className="flex items-center justify-between border-b border-[#E5EEE8] px-2 pb-4 dark:border-[#294336]">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EC] text-[#0B5D43] dark:bg-[#1B3C2C] dark:text-[#78D6A4]">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#172F23] dark:text-[#EDF8F0]">
                      رصد الحضور اليومي
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#83958A] dark:text-[#91B19D]">
                      معاينة توضيحية للمنصة
                    </p>
                  </div>
                </div>

                <span className="rounded-lg border border-[#CDE5D5] bg-[#F0F8F2] px-2.5 py-1.5 text-[10px] font-bold text-[#167348] dark:border-[#315D43] dark:bg-[#1B3B2A] dark:text-[#8BE0AA]">
                  الأحد
                </span>
              </div>

              {/* Selected Lesson */}
              <div className="grid grid-cols-2 gap-3 py-4">
                <div className="rounded-2xl border border-[#E3ECE5] bg-[#F7FAF8] p-3 dark:border-[#294436] dark:bg-[#172D21]">
                  <p className="text-[10px] font-medium text-[#819187] dark:text-[#9BB2A2]">
                    اليوم الدراسي
                  </p>
                  <p className="mt-1.5 text-sm font-black text-[#173D29] dark:text-[#E9F6ED]">
                    الأحد
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E3ECE5] bg-[#F7FAF8] p-3 dark:border-[#294436] dark:bg-[#172D21]">
                  <p className="text-[10px] font-medium text-[#819187] dark:text-[#9BB2A2]">
                    الحصة المحددة
                  </p>
                  <p className="mt-1.5 text-sm font-black text-[#173D29] dark:text-[#E9F6ED]">
                    الحصة الأولى
                  </p>
                </div>
              </div>

              {/* Status Legend */}
              <div className="rounded-2xl border border-[#E3ECE5] p-3 dark:border-[#294436]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#263D30] dark:text-[#EAF5ED]">
                    حالات تحضير الطلاب
                  </span>
                  <span className="text-[10px] text-[#89988F] dark:text-[#94AA9A]">
                    عرض توضيحي
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#E5F5E9] px-3 py-1.5 text-[10px] font-bold text-[#167044] dark:bg-[#1C432B] dark:text-[#8BE0A9]">
                    حاضر
                  </span>
                  <span className="rounded-full bg-[#FCEBED] px-3 py-1.5 text-[10px] font-bold text-[#A52B38] dark:bg-[#48252B] dark:text-[#F59AA2]">
                    غائب
                  </span>
                  <span className="rounded-full bg-[#EDF0F2] px-3 py-1.5 text-[10px] font-bold text-[#596771] dark:bg-[#303D43] dark:text-[#CAD4D9]">
                    غير محدد
                  </span>
                </div>

                {/* Illustrative Student Rows */}
                <div className="mt-3 space-y-2">
                  {demoStudents.map((student) => {
                    const statusClasses =
                      student.status === 'حاضر'
                        ? 'border-[#CBE7D2] bg-[#EFF8F1] dark:border-[#315C3D] dark:bg-[#1B3927]'
                        : student.status === 'غائب'
                          ? 'border-[#F1D0D3] bg-[#FFF5F5] dark:border-[#69343B] dark:bg-[#392329]'
                          : 'border-[#E0E5E8] bg-[#F5F7F8] dark:border-[#3E4B51] dark:bg-[#28353B]';

                    const badgeClasses =
                      student.status === 'حاضر'
                        ? 'bg-[#D7F0DE] text-[#176B3A] dark:bg-[#28573A] dark:text-[#A0E5B5]'
                        : student.status === 'غائب'
                          ? 'bg-[#F7DEE1] text-[#A52B38] dark:bg-[#603039] dark:text-[#FFADB3]'
                          : 'bg-[#E5EAED] text-[#596771] dark:bg-[#3B4B52] dark:text-[#D2DCE1]';

                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${statusClasses}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-[10px] font-bold text-[#64776B] dark:bg-white/10 dark:text-[#CAD8CE]">
                            {student.id}
                          </span>
                          <span className="text-xs font-bold text-[#233B2C] dark:text-[#E6F2E9]">
                            {student.name}
                          </span>
                        </div>
                        <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${badgeClasses}`}>
                          {student.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview Footer */}
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#0B5D43] px-3 py-3 text-white dark:bg-[#1B4933]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#A5E9BD]" />
                <span className="text-[11px] font-semibold">
                  تنظيم واضح لرصد الحضور ومتابعته
                </span>
              </div>
            </div>

            {/* Floating Accent */}
            <div className="absolute -bottom-5 -left-2 hidden items-center gap-2 rounded-2xl border border-[#D9EADF] bg-white px-4 py-3 shadow-xl dark:border-[#31523F] dark:bg-[#172D21] sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EC] text-[#0B5D43] dark:bg-[#214832] dark:text-[#82DCA5]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-black text-[#1A3928] dark:text-[#E8F4EB]">
                  الإدارة والعرفاء
                </p>
                <p className="text-[10px] text-[#819187] dark:text-[#A2B7A8]">
                  تجربة موحدة للمدرسة
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
