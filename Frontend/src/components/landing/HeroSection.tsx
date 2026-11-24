
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

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type DemoStatus = 'حاضر' | 'غائب' | 'غير محدد';

interface DemoStudent {
  id: string;
  name: string;
  status: DemoStatus;
}

/* -------------------------------------------------------------------------- */
/*                              Demo Data                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                              Status Styling                                */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<DemoStatus, string> = {
  حاضر:
    'border-[#C5E5D1] bg-[#E6F5EC] text-[#176B43] dark:border-[#2B5941] dark:bg-[#1A3B2A] dark:text-[#86E2B0]',

  غائب:
    'border-[#F5C7CA] bg-[#FDECEC] text-[#A61B1B] dark:border-[#5D2A31] dark:bg-[#3A1C20] dark:text-[#F8969E]',

  'غير محدد':
    'border-[#DCE2E5] bg-[#F1F4F5] text-[#58676F] dark:border-[#34464D] dark:bg-[#223136] dark:text-[#B8C7CE]',
};

/* -------------------------------------------------------------------------- */
/*                              Main Component                               */
/* -------------------------------------------------------------------------- */

export const HeroSection: React.FC = () => {
  const [students, setStudents] = useState<DemoStudent[]>(
    INITIAL_DEMO_STUDENTS
  );

  /* ------------------------------------------------------------------------ */
  /*                           Interactive Demo                              */
  /* ------------------------------------------------------------------------ */

  const toggleStudentStatus = (id: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id
          ? {
              ...student,
              status: STATUS_CYCLE[student.status],
            }
          : student
      )
    );
  };

  const presentCount = students.filter(
    (student) => student.status === 'حاضر'
  ).length;

  const absentCount = students.filter(
    (student) => student.status === 'غائب'
  ).length;

  /* ------------------------------------------------------------------------ */
  /*                                   Render                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <section
      id="hero"
      dir="rtl"
      className="border-b border-[#DCE7E2] bg-white py-12 transition-colors duration-300 dark:border-[#22382E] dark:bg-[#0D1A14] sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">

          {/* ================================================================= */}
          {/*                         Editorial Content                       */}
          {/* ================================================================= */}

          <div className="space-y-6 text-right lg:col-span-7">

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-3xl font-black leading-[1.3] tracking-tight text-[#12261E] dark:text-[#F0F7F3] sm:text-5xl lg:text-[3.25rem]">
                رصد الحضور المدرسي

                <span className="mt-1 block text-[#0B5D43] dark:text-[#75D39B]">
                  بدقة يومية ومنظومة واحدة.
                </span>
              </h1>

              <p className="max-w-xl text-sm leading-8 text-[#52685D] dark:text-[#AEC4B8] sm:text-base">
                يجمع مواظب بين إدارة الشعب والطلاب، ورصد الحضور لكل حصة دراسية،
                وإشعارات أولياء الأمور عبر واتساب، وتصدير كشوف التحضير الأسبوعية
                المعتمدة.
              </p>
            </div>

            {/* ============================================================= */}
            {/*                            Entry Points                       */}
            {/* ============================================================= */}

            <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center">

              {/* Admin Portal */}
              <Link to="/admin/login" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center border-0 bg-[#0B5D43] px-6 font-bold text-white hover:bg-[#084733] dark:bg-[#1F7A52] dark:text-white dark:hover:bg-[#269062] sm:w-auto"
                  icon={<ArrowLeft className="h-4 w-4" />}
                >
                  بوابة إدارة المدرسة
                </Button>
              </Link>

              {/* Representative Portal */}
              <Link to="/representative/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-center border-[#C8DCD0] bg-white px-5 font-bold text-[#174B37] hover:border-[#0B5D43] hover:bg-[#F2F8F4] dark:border-[#2E4C3E] dark:bg-[#14251D] dark:text-[#B4DEC6] dark:hover:border-[#4B7560] dark:hover:bg-[#1B3127] sm:w-auto"
                  icon={<Users className="h-4 w-4" />}
                >
                  بوابة العرفاء
                </Button>
              </Link>

              {/* Clerk Portal */}
              <Link to="/clerk/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-center border-[#C8DCD0] bg-white px-5 font-bold text-[#174B37] hover:border-[#0B5D43] hover:bg-[#F2F8F4] dark:border-[#2E4C3E] dark:bg-[#14251D] dark:text-[#B4DEC6] dark:hover:border-[#4B7560] dark:hover:bg-[#1B3127] sm:w-auto"
                  icon={<UserCheck className="h-4 w-4" />}
                >
                  مسجّل الحضور
                </Button>
              </Link>
            </div>

            {/* ============================================================= */}
            {/*                        Product Highlights                     */}
            {/* ============================================================= */}

            <div className="grid grid-cols-1 gap-3 border-t border-[#E3ECE7] pt-6 dark:border-[#294638] sm:grid-cols-3">

              {[
                {
                  icon: CheckCircle2,
                  text: 'رصد فوري للحصص اليومية',
                },
                {
                  icon: ClipboardCheck,
                  text: 'كشوف Excel أسبوعية للمراحل',
                },
                {
                  icon: Users,
                  text: 'توثيق إشعارات أولياء الأمور',
                },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-xs font-semibold text-[#486454] dark:text-[#B2C9BC]"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-[#0B5D43] dark:text-[#75D39B]" />

                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ================================================================= */}
          {/*                      Interactive Attendance Preview             */}
          {/* ================================================================= */}

          <div className="mx-auto w-full max-w-[500px] lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-[#D4E3DA] bg-[#F8FBF9] shadow-sm transition-colors duration-300 dark:border-[#294638] dark:bg-[#12221A]">

              {/* =========================================================== */}
              {/*                         Panel Header                       */}
              {/* =========================================================== */}

              <div className="flex flex-col gap-3 border-b border-[#E2ECE6] bg-white px-4 py-4 dark:border-[#294638] dark:bg-[#15281F] sm:flex-row sm:items-center sm:justify-between">

                {/* Panel Identity */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F5EC] text-[#0B5D43] dark:bg-[#1A3B2A] dark:text-[#75D39B]">
                    <CalendarCheck className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-extrabold text-[#142B22] dark:text-[#EDF7F1]">
                      شاشة الرصد السريع
                    </p>

                    <p className="mt-0.5 text-[11px] text-[#6B8075] dark:text-[#93AEA0]">
                      الأحد · الحصة الأولى
                    </p>
                  </div>
                </div>

                {/* Attendance Statistics */}
                <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums">
                  <span className="rounded-lg border border-[#C5E5D1] bg-[#E6F5EC] px-2.5 py-1 text-[#176B43] dark:border-[#2B5941] dark:bg-[#1A3B2A] dark:text-[#86E2B0]">
                    حاضر {presentCount}
                  </span>

                  <span className="rounded-lg border border-[#F5C7CA] bg-[#FDECEC] px-2.5 py-1 text-[#A61B1B] dark:border-[#5D2A31] dark:bg-[#3A1C20] dark:text-[#F8969E]">
                    غائب {absentCount}
                  </span>
                </div>
              </div>

              {/* =========================================================== */}
              {/*                        Interactive Rows                    */}
              {/* =========================================================== */}

              <div className="divide-y divide-[#E6EFEA] bg-white dark:divide-[#294638] dark:bg-[#12221A]">
                {students.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => toggleStudentStatus(student.id)}
                    aria-label={`${student.name}، الحالة الحالية: ${student.status}. اضغط لتغيير الحالة.`}
                    title="اضغط لتغيير حالة الحضور"
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-right transition-colors duration-150 hover:bg-[#F5FAF7] focus-visible:bg-[#F0F7F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0B5D43] dark:hover:bg-[#182C22] dark:focus-visible:bg-[#1B3A2C] dark:focus-visible:ring-[#75D39B] sm:py-3.5"
                  >
                    {/* Student Information */}
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1F5F2] font-mono text-xs font-bold text-[#708579] dark:bg-[#1A3328] dark:text-[#A3C7B9]">
                        {student.id}
                      </span>

                      <span className="text-xs font-bold text-[#1A3126] dark:text-[#E6F2EB]">
                        {student.name}
                      </span>
                    </div>

                    {/* Attendance Status */}
                    <span
                      className={`min-w-[76px] rounded-lg border px-3 py-1.5 text-center text-[11px] font-bold transition-colors ${STATUS_STYLES[student.status]}`}
                    >
                      {student.status}
                    </span>
                  </button>
                ))}
              </div>

              {/* =========================================================== */}
              {/*                          Panel Footer                       */}
              {/* =========================================================== */}

              <div className="flex flex-col gap-2 border-t border-[#E2ECE6] bg-[#F5F9F6] px-4 py-3 text-[11px] text-[#647C70] dark:border-[#294638] dark:bg-[#101E17] dark:text-[#A3B9AC] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  معاينة تفاعلية — اضغط على أي طالب لتغيير الحالة
                </span>

                <span className="font-mono font-bold text-[#0B5D43] dark:text-[#75D39B]">
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
