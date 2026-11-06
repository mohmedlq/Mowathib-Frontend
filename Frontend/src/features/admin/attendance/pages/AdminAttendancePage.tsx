import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import {
  AttendanceTable,
  QuickAttendancePanel,
  AttendanceWeekSelector,
  useAttendanceMatrix,
} from '../../../attendance';
import { LoadingState } from '../../../../shared/components/ui/Spinner';
import {
  CalendarCheck,
  Eye,
  Edit3,
  UserX,
  Building2,
  Calendar,
} from 'lucide-react';
import { SCHOOL_DAYS, getPeriodsForDay } from '../../../../shared/types';
import type { ClassItem } from '../../../../shared/types';

export function AdminAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialClassId = Number(searchParams.get('classId')) || 105;

  const [selectedClassId, setSelectedClassId] = useState<number>(initialClassId);
  const [selectedWeekId, setSelectedWeekId] = useState<number>(11);
  const [selectedGrade, setSelectedGrade] = useState<number>(0); // 0 = all, 1 = 1st, 2 = 2nd, 3 = 3rd
  const [viewMode, setViewMode] = useState<'matrix' | 'absences' | 'quick'>('matrix');

  // Quick attendance slots
  const [quickDay, setQuickDay] = useState<number>(1);
  const [quickPeriod, setQuickPeriod] = useState<number>(1);

  // Classes query
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  // Attendance weeks query
  const { data: weeks = [] } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
  });

  const getClassNum = (c: ClassItem) => {
    const val = Number(c.classNumber ?? c.className ?? c.classId);
    return Number.isFinite(val) ? val : c.classId;
  };

  // Filter classes by grade
  const gradeFilteredClasses = useMemo(() => {
    if (selectedGrade === 0) return classes;
    return classes.filter((c) => {
      const num = getClassNum(c);
      if (selectedGrade === 1) return num >= 101 && num <= 110;
      if (selectedGrade === 2) return num >= 201 && num <= 210;
      if (selectedGrade === 3) return num >= 301 && num <= 310;
      return true;
    });
  }, [classes, selectedGrade]);

  // Attendance Matrix
  const {
    matrix,
    enrollments,
    records,
    isLoading,
    isSaving,
    saveSlot,
  } = useAttendanceMatrix(selectedClassId, selectedWeekId);

  const selectedClass = classes.find((c) => c.classId === selectedClassId) || classes[0];
  const selectedWeek = weeks.find((w) => w.attendanceWeekId === selectedWeekId) || weeks[0];

  // Absent students calculation
  const absentStudents = useMemo(() => {
    return matrix
      .map((studentRow) => {
        const absentDetails: Array<{ dayName: string; dayNumber: number; period: number }> = [];

        SCHOOL_DAYS.forEach((day) => {
          const daySlots = studentRow.slots[day.dayNumber] || {};
          getPeriodsForDay(day.dayNumber).forEach((period) => {
            if (daySlots[period]?.status === 'Absent') {
              absentDetails.push({
                dayName: day.nameAr,
                dayNumber: day.dayNumber,
                period,
              });
            }
          });
        });

        return {
          enrollment: studentRow.enrollment,
          absentCount: studentRow.summary.absent,
          absentDetails,
        };
      })
      .filter((s) => s.absentCount > 0)
      .sort((a, b) => b.absentCount - a.absentCount);
  }, [matrix]);

  // Handlers
  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
    setSearchParams({ classId: String(classId) });
  };

  const handleGradeChange = (grade: number) => {
    setSelectedGrade(grade);
    // Auto-select first class in that grade if current class is outside
    const inGrade = classes.filter((c) => {
      const num = getClassNum(c);
      if (grade === 1) return num >= 101 && num <= 110;
      if (grade === 2) return num >= 201 && num <= 210;
      if (grade === 3) return num >= 301 && num <= 310;
      return true;
    });
    if (inGrade.length > 0 && !inGrade.some((c) => c.classId === selectedClassId)) {
      handleClassChange(inGrade[0].classId);
    }
  };

  const handleSlotSelect = (
    _enrollmentId: number,
    dayNumber: number,
    periodNumber: number
  ) => {
    setQuickDay(dayNumber);
    setQuickPeriod(periodNumber);
    setViewMode('quick');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B]">رصد ومتابعة الحضور والغياب</h1>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                متابعة جدول الحضور الأسبوعي، تدقيق كشف الغائبين، أو التحضير السريع للحصص الدراسية
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-[#F5F7F8] p-1 rounded-lg border border-[#DCE3E6] self-start lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>جدول الحضور الأسبوعي</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('absences')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'absences'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>كشف الغائبين ({absentStudents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('quick')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'quick'
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>نمط التحضير السريع</span>
          </button>
        </div>
      </div>

      {/* Grade Filters & Selection Controls */}
      <div className="bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs space-y-3">
        {/* Grade tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-[#5F6B73] shrink-0 ml-1">المرحلة:</span>
          <button
            type="button"
            onClick={() => handleGradeChange(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 0
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            جميع المراحل
          </button>
          <button
            type="button"
            onClick={() => handleGradeChange(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 1
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الأول الثانوي
          </button>
          <button
            type="button"
            onClick={() => handleGradeChange(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 2
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الثاني الثانوي
          </button>
          <button
            type="button"
            onClick={() => handleGradeChange(3)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 3
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الثالث الثانوي
          </button>
        </div>

        {/* Class and Week Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EEF2F3]">
          <div>
            <label className="text-xs font-bold text-[#17252B] mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#245B63]" />
              <span>الشعبة الدراسية:</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(Number(e.target.value))}
              className="w-full h-10 px-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg text-[#17252B] font-medium focus:bg-white focus:border-[#245B63] outline-none cursor-pointer"
            >
              {gradeFilteredClasses.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className || `شعبة ${c.classId}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#17252B] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#245B63]" />
              <span>الأسبوع الدراسي:</span>
            </label>
            <AttendanceWeekSelector
              weeks={weeks}
              selectedWeekId={selectedWeekId}
              onSelectWeek={setSelectedWeekId}
            />
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-[#DCE3E6] p-12 shadow-xs">
          <LoadingState message="جاري تحميل سجلات حضور الفصل المختار..." />
        </div>
      ) : viewMode === 'matrix' ? (
        <div className="space-y-4">
          <div className="p-3.5 bg-[#F0F7F7] border border-[#245B63]/20 rounded-xl text-xs text-[#245B63] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#245B63]" />
              <strong>تلميح الإدارة:</strong>
              يمكنك النقر على أي حصة داخل الجدول للانتقال المباشر وتعديل حالتها في نمط التحضير السريع.
            </span>

            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white border border-[#245B63]/20 self-start sm:self-auto">
              {matrix.length} طالب مقيد
            </span>
          </div>

          <AttendanceTable
            attendances={matrix}
            weekStartDate={selectedWeek?.startDate}
            onSlotSelect={handleSlotSelect}
            interactive={true}
          />
        </div>
      ) : viewMode === 'absences' ? (
        /* Absent Students Roster */
        <div className="bg-white rounded-xl border border-[#DCE3E6] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#DCE3E6] bg-[#FAFCFD] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-[#A61B1B]" />
              <h2 className="text-sm font-bold text-[#17252B]">
                كشف الطلاب المتغيبين في {selectedClass?.className || `شعبة ${selectedClassId}`} — الأسبوع {selectedWeek?.weekNumber}
              </h2>
            </div>
            <span className="text-xs font-bold text-[#A61B1B] bg-[#FDECEC] px-2.5 py-1 rounded-md border border-[#F5C2C2] font-mono">
              إجمالي المتغيبين: {absentStudents.length} طلاب
            </span>
          </div>

          {absentStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#176B3A] bg-[#E8F5EC]/30">
              <div className="w-10 h-10 rounded-full bg-[#E8F5EC] text-[#176B3A] flex items-center justify-center mx-auto mb-2 font-bold">
                ✓
              </div>
              <strong className="block text-sm mb-1">لا يوجد غياب مسجل!</strong>
              نسبة الحضور مكتملة 100% في هذه الشعبة خلال هذا الأسبوع.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F7F8] text-[#17252B] border-b border-[#DCE3E6]">
                    <th className="px-4 py-3 font-bold w-12 text-center">#</th>
                    <th className="px-4 py-3 font-bold">اسم الطالب</th>
                    <th className="px-4 py-3 font-bold">رقم الهوية الوطنية</th>
                    <th className="px-4 py-3 font-bold text-center">إجمالي الحصص المتغيب عنها</th>
                    <th className="px-4 py-3 font-bold">تفاصيل الحصص والأيام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F3]">
                  {absentStudents.map((item, idx) => (
                    <tr
                      key={item.enrollment.enrollmentId}
                      className={`hover:bg-[#FDF6F6] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFD]'}`}
                    >
                      <td className="px-4 py-3 text-center font-mono text-[#5F6B73]">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-[#17252B]">
                        {item.enrollment.studentName}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#5F6B73]">
                        {item.enrollment.student?.nationalId || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[#FDECEC] text-[#A61B1B] border border-[#F5C2C2]">
                          {item.absentCount} حصة
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.absentDetails.map((det, dIdx) => (
                            <span
                              key={dIdx}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#F5F7F8] text-[#17252B] border border-[#DCE3E6]"
                            >
                              <span className="font-bold text-[#A61B1B]">{det.dayName}</span>
                              <span className="text-[#5F6B73]">ح{det.period}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <QuickAttendancePanel
          classNameTitle={selectedClass?.className || 'شعبة 105'}
          weekNumber={selectedWeek?.weekNumber || 11}
          selectedDay={quickDay}
          onSelectDay={setQuickDay}
          selectedPeriod={quickPeriod}
          onSelectPeriod={setQuickPeriod}
          enrollments={enrollments}
          records={records}
          onSaveSlot={async (day, period, changes) => {
            await saveSlot(day, period, changes);
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

export default AdminAttendancePage;
