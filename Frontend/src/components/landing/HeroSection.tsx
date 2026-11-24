import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { Button } from '../../shared/components/ui/Button';
import { QuenricLogo } from '../common/QuenricLogo';

type DemoStatus = 'حاضر' | 'غائب' | 'غير محدد';

interface DemoStudent {
  id: string;
  name: string;
  status: DemoStatus;
}

const INITIAL_DEMO_STUDENTS: DemoStudent[] = [
  { id: '01', name: 'طالب 01', status: 'حاضر' },
  { id: '02', name: 'طالب 02', status: 'غائب' },
  { id: '03', name: 'طالب 03', status: 'حاضر' },
  { id: '04', name: 'طالب 04', status: 'غير محدد' },
];

const STATUS_CYCLE: Record<DemoStatus, DemoStatus> = {
  حاضر: 'غائب',
  غائب: 'غير محدد',
  'غير محدد': 'حاضر',
};

export const HeroSection: React.FC = () => {
  const [students, setStudents] = useState<DemoStudent[]>(INITIAL_DEMO_STUDENTS);

  const toggleStudentStatus = (id: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id
          ? { ...student, status: STATUS_CYCLE[student.status] }
          : student
      )
    );
  };

  const presentCount = students.filter((s) => s.status === 'حاضر').length;
  const absentCount = students.filter((s) => s.status === 'غائب').length;

  return (
    <section
      id="hero"
      dir="rtl"
      className="border-b border-[#DCE7E2] bg-white py-12 transition-colors dark:border-[#22382E] dark:bg-[#0D1A14] sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Editorial Content */}
          <div className="space-y-6 text-right lg:col-span-7">
            {/* QUENRIC Signature Badge */}
            <div className="inline-flex items-center gap-3 rounded-xl border border-[#1E4435] bg-[#0F241D] px-3.5 py-2 text-white shadow-xs">
              <QuenricLogo className="h-5 w-auto shrink-0" />
              <span className="h-3.5 w-px bg-white/20" aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-wide text-[#CBE6D7]">
                إحدى منصات QUENRIC التعليمية
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-black leading-[1.3] tracking-tight text-[#12261E] dark:text-[#F0F7F3] sm:text-5xl lg:text-[3.25rem]">
                رصد الحضور المدرسي
                <span className="mt-1 block text-[#0B5D43] dark:text-[#6AD19C]">
                  بدقة يومية ومنظومة واحدة.
                </span>
              </h1>

              <p className="max-w-xl text-sm leading-8 text-[#52685D] dark:text-[#AEC4B8] sm:text-base">
                يجمع مواظب بين إدارة الشعب والطلاب، ورصد الحضور لكل حصة دراسية،
                وإشعارات أولياء الأمور عبر واتساب، وتصدير كشوف التحضير الأسبوعية
                المعتمدة.
              </p>
            </div>

            {/* Entry Points */}
            <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
              <Link to="/admin/login" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center border-0 bg-[#0B5D43] px-6 font-bold text-white hover:bg-[#084733] dark:bg-[#1F7A52] dark:hover:bg-[#269062] sm:w-auto"
                  icon={<ArrowLeft className="h-4 w-4" />}
                >
                  بوابة إدارة المدرسة
                </Button>
              </Link>

              <Link to="/representative/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-center border-[#C8DCD0] bg-white px-5 font-bold text-[#174B37] hover:border-[#0B5D43] hover:bg-[#F2F8F4] dark:border-[#2E4C3E] dark:bg-[#13241C] dark:text-[#B4DEC6] dark:hover:bg-[#1A3127] sm:w-auto"
                  icon={<Users className="h-4 w-4" />}
                >
                  بوابة العرفاء
                </Button>
              </Link>

              <Link to="/clerk/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-center border-[#C8DCD0] bg-white px-5 font-bold text-[#174B37] hover:border-[#0B5D43] hover:bg-[#F2F8F4] dark:border-[#2E4C3E] dark:bg-[#13241C] dark:text-[#B4DEC6] dark:hover:bg-[#1A3127] sm:w-auto"
                  icon={<UserCheck className="h-4 w-4" />}
                >
                  مسجّل الحضور
                </Button>
              </Link>
            </div>

            {/* Concrete Highlights */}
            <div className="grid grid-cols-1 gap-3 border-t border-[#E3ECE7] pt-6 dark:border-[#22382E] sm:grid-cols-3">
              {[
                { icon: CheckCircle2, text: 'رصد فوري للحصص اليومية' },
                { icon: ClipboardCheck, text: 'كشوف Excel أسبوعية للمراحل' },
                { icon: Users, text: 'توثيق إشعارات أولياء الأمور' },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-xs font-semibold text-[#486454] dark:text-[#B2C9BC]"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-[#0B5D43] dark:text-[#6AD19C]" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Attendance Preview Panel */}
          <div className="mx-auto w-full max-w-[500px] lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-[#D4E3DA] bg-[#F8FBF9] shadow-sm dark:border-[#263E33] dark:bg-[#12221A]">
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-[#E2ECE6] bg-white px-4 py-3.5 dark:border-[#243B31] dark:bg-[#15281F]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EC] text-[#0B5D43] dark:bg-[#1B3A2C] dark:text-[#75D4A1]">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#142B22] dark:text-[#EDF7F1]">
                      شاشة الرصد السريع
                    </p>
                    <p className="text-[11px] text-[#6B8075] dark:text-[#93AEA0]">
                      الأحد · الحصة الأولى
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums">
                  <span className="rounded-md bg-[#E6F5EC] px-2 py-0.5 text-[#176B43] dark:bg-[#1A3B2A] dark:text-[#7EE0AA]">
                    حاضر {presentCount}
                  </span>
                  <span className="rounded-md bg-[#FDECEC] px-2 py-0.5 text-[#A61B1B] dark:bg-[#3A1C20] dark:text-[#F8969E]">
                    غائب {absentCount}
                  </span>
                </div>
              </div>

              {/* Interactive Rows */}
              <div className="divide-y divide-[#E6EFEA] bg-white dark:divide-[#23392F] dark:bg-[#12221A]">
                {students.map((student) => {
                  const badgeStyle =
                    student.status === 'حاضر'
                      ? 'bg-[#E6F5EC] text-[#176B43] border-[#C5E5D1] dark:bg-[#1A3B2A] dark:text-[#86E2B0] dark:border-[#2B5941]'
                      : student.status === 'غائب'
                        ? 'bg-[#FDECEC] text-[#A61B1B] border-[#F5C7CA] dark:bg-[#3A1C20] dark:text-[#F8969E] dark:border-[#5D2A31]'
                        : 'bg-[#F1F4F5] text-[#58676F] border-[#DCE2E5] dark:bg-[#223136] dark:text-[#B8C7CE] dark:border-[#34464D]';

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudentStatus(student.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-[#F5FAF7] focus-visible:bg-[#F0F7F3] focus-visible:outline-none dark:hover:bg-[#182C22]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#7C9085] dark:text-[#7E9C8C]">
                          {student.id}
                        </span>
                        <span className="text-xs font-bold text-[#1A3126] dark:text-[#E6F2EB]">
                          {student.name}
                        </span>
                      </div>

                      <span
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors ${badgeStyle}`}
                      >
                        {student.status}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Preview Footer */}
              <div className="flex items-center justify-between border-t border-[#E2ECE6] bg-[#F5F9F6] px-4 py-2.5 text-[11px] text-[#647C70] dark:border-[#243B31] dark:bg-[#101E17] dark:text-[#91AC9E]">
                <span>معاينة تفاعلية — اضغط على أي طالب لتغيير الحالة</span>
                <span className="font-mono font-bold text-[#0B5D43] dark:text-[#6AD19C]">
                  مواظب
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;