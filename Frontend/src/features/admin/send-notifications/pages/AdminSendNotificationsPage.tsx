import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Send,
  BellRing,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  Phone,
  Search,
  Check,
  X,
  ShieldAlert,
  Info,
  Clock,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { useSchoolSettings } from '../../../../shared/services/schoolSettingsService';
import { useNotifications } from '../../../notifications';
import {
  SCHOOL_DAYS,
  type ClassEnrollment,
  type AttendanceRecord,
  type Student,
  type Parent,
} from '../../../../shared/types';
import {
  calculateDateForDay,
  formatArabicDate,
  getArabicDayName,
  resolveDefaultAttendanceWeek,
} from '../../../../shared/utils/date';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';

interface AbsentStudentRow {
  enrollmentId: number;
  studentId: number;
  studentName: string;
  nationalId: string;
  classId: number;
  className: string;
  absentPeriods: number[];
  parentId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  hasValidPhone: boolean;
}

export function AdminSendNotificationsPage() {
  const { schoolName } = useSchoolSettings();
  const { toast } = useNotifications();

  // ---------------------------------------------------------------------------
  // Date & Day Selection State
  // ---------------------------------------------------------------------------
  // Calculate current school day in Saudi Arabia (Sunday = 1 ... Thursday = 5)
  const getInitialDay = () => {
    const jsDay = new Date().getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (jsDay >= 0 && jsDay <= 4) {
      return jsDay + 1; // 1: Sunday, 2: Monday, 3: Tuesday, 4: Wednesday, 5: Thursday
    }
    return 1; // Default to Sunday on weekends
  };

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(getInitialDay);
  const [selectedClassId, setSelectedClassId] = useState<number>(0); // 0 = All Classes
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Track simulation state for sent notifications (set of enrollmentIds)
  const [sentStudentIds, setSentStudentIds] = useState<Set<number>>(new Set());

  // Modal States
  const [singleStudentModal, setSingleStudentModal] = useState<AbsentStudentRow | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSimulatingSending, setIsSimulatingSending] = useState(false);

  // ---------------------------------------------------------------------------
  // Data Queries
  // ---------------------------------------------------------------------------

  // 1. Fetch Classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
    staleTime: 1000 * 60 * 30,
  });

  // 2. Fetch Weeks
  const { data: weeks = [], isLoading: isLoadingWeeks } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
  });

  // Determine Active Week
  const activeWeek = useMemo(() => {
    return resolveDefaultAttendanceWeek(weeks) || weeks[0];
  }, [weeks]);

  // 3. Fetch All Enrollments
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['all_enrollments'],
    queryFn: () => schoolDataService.getAllEnrollments(),
    staleTime: 1000 * 60 * 15,
  });

  // 4. Fetch All Students (to get ParentId relationships)
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['all_students'],
    queryFn: () => schoolDataService.getAllStudents(),
    staleTime: 1000 * 60 * 15,
  });

  // 5. Fetch All Parents (from existing Parent table)
  const { data: parents = [], isLoading: isLoadingParents } = useQuery({
    queryKey: ['all_parents'],
    queryFn: () => schoolDataService.getParents(),
    staleTime: 1000 * 60 * 15,
  });

  // 6. Fetch Attendance Records for Active Week
  const { data: records = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['notification_attendance_records', activeWeek?.attendanceWeekId, selectedClassId],
    queryFn: async () => {
      if (!activeWeek?.attendanceWeekId) return [];

      // If a specific class is selected, fetch only that class's records
      if (selectedClassId > 0) {
        return await schoolDataService
          .getAttendanceRecords(selectedClassId, activeWeek.attendanceWeekId)
          .catch(() => []);
      }

      // If all classes selected, fetch records across classes in chunks of 5
      const targetClasses = classes.length > 0 ? classes : [];
      const allFetchedRecords: AttendanceRecord[] = [];
      const chunkSize = 5;

      for (let i = 0; i < targetClasses.length; i += chunkSize) {
        const chunk = targetClasses.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(
          chunk.map((cls) =>
            schoolDataService
              .getAttendanceRecords(cls.classId, activeWeek.attendanceWeekId)
              .catch(() => [])
          )
        );
        chunkResults.forEach((res) => allFetchedRecords.push(...res));
      }

      return allFetchedRecords;
    },
    enabled: Boolean(activeWeek?.attendanceWeekId && (classes.length > 0 || selectedClassId > 0)),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Data Mappings & Calculations
  // ---------------------------------------------------------------------------

  // Map: studentId -> Student (contains parentId)
  const studentMap = useMemo(() => {
    const map = new Map<number, Student>();
    students.forEach((s) => map.set(s.studentId, s));
    return map;
  }, [students]);

  // Map: parentId (Guid string) -> Parent (contains FullName, PhoneNumber)
  const parentMap = useMemo(() => {
    const map = new Map<string, Parent>();
    parents.forEach((p) => {
      if (p.id) {
        map.set(String(p.id).toLowerCase(), p);
      }
    });
    return map;
  }, [parents]);

  // Map: enrollmentId -> ClassEnrollment
  const enrollmentMap = useMemo(() => {
    const map = new Map<number, ClassEnrollment>();
    enrollments.forEach((e) => map.set(e.enrollmentId, e));
    return map;
  }, [enrollments]);

  // Current Date string formatted for the selected school day
  const currentDayName = getArabicDayName(selectedDayNumber);
  const currentDayDate = activeWeek?.startDate
    ? calculateDateForDay(activeWeek.startDate, selectedDayNumber)
    : '';

  // Identify absent students on the selected day
  const absentStudentsList: AbsentStudentRow[] = useMemo(() => {
    if (!records.length || !enrollmentMap.size) return [];

    // Filter records for the selected day where status === 'Absent'
    const dayAbsentRecords = records.filter(
      (r) => r.dayNumber === selectedDayNumber && r.status === 'Absent'
    );

    // Group absent periods by enrollmentId
    const enrollmentAbsenceMap = new Map<number, number[]>();
    dayAbsentRecords.forEach((r) => {
      const existing = enrollmentAbsenceMap.get(r.enrollmentId) || [];
      if (!existing.includes(r.periodNumber)) {
        existing.push(r.periodNumber);
      }
      enrollmentAbsenceMap.set(r.enrollmentId, existing);
    });

    const rows: AbsentStudentRow[] = [];

    enrollmentAbsenceMap.forEach((periods, enrollmentId) => {
      const enrollment = enrollmentMap.get(enrollmentId);
      if (!enrollment) return;

      // Filter by selected class if specified
      if (selectedClassId > 0 && enrollment.classId !== selectedClassId) {
        return;
      }

      const studentId = enrollment.studentId;
      const studentObj = studentMap.get(studentId) || enrollment.student;

      // Retrieve Parent via Student's ParentId Foreign Key
      const rawParentId = studentObj?.parentId;
      const parentIdStr = rawParentId ? String(rawParentId).toLowerCase() : null;
      const parentObj = parentIdStr ? parentMap.get(parentIdStr) : null;

      // Determine Parent Name & Phone Number
      const parentName = parentObj?.fullName || studentObj?.parentName || null;
      const parentPhone = parentObj?.phoneNumber || null;
      const hasValidPhone = Boolean(parentPhone && parentPhone.trim().length >= 7);

      const className =
        enrollment.className ||
        (enrollment.classNumber ? `شعبة ${enrollment.classNumber}` : `شعبة ${enrollment.classId}`);

      rows.push({
        enrollmentId,
        studentId,
        studentName: enrollment.studentName || studentObj?.fullName || 'طالب غير محدد',
        nationalId: studentObj?.nationalId || (enrollment as any).nationalId || 'غير متوفر',
        classId: enrollment.classId,
        className: String(className),
        absentPeriods: periods.sort((a, b) => a - b),
        parentId: parentIdStr,
        parentName,
        parentPhone,
        hasValidPhone,
      });
    });

    // Sort by class name then student name
    return rows.sort((a, b) => {
      if (a.className !== b.className) return a.className.localeCompare(b.className);
      return a.studentName.localeCompare(b.studentName);
    });
  }, [records, enrollmentMap, selectedDayNumber, selectedClassId, studentMap, parentMap]);

  // Apply search query filter
  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return absentStudentsList;
    const q = searchQuery.trim().toLowerCase();
    return absentStudentsList.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.nationalId.toLowerCase().includes(q) ||
        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
        (s.parentPhone && s.parentPhone.includes(q)) ||
        s.className.toLowerCase().includes(q)
    );
  }, [absentStudentsList, searchQuery]);

  // KPI Metrics
  const totalAbsentCount = absentStudentsList.length;
  const eligibleParentsCount = absentStudentsList.filter((s) => s.hasValidPhone).length;
  const missingPhoneCount = totalAbsentCount - eligibleParentsCount;
  const totalSimulatedSent = absentStudentsList.filter((s) => sentStudentIds.has(s.enrollmentId)).length;

  // ---------------------------------------------------------------------------
  // Handlers for Sending Simulations
  // ---------------------------------------------------------------------------

  const handleOpenSingleModal = (student: AbsentStudentRow) => {
    setSingleStudentModal(student);
  };

  const handleConfirmSingleSend = async () => {
    if (!singleStudentModal) return;

    setIsSimulatingSending(true);
    // Simulate brief network latency for realistic feedback
    await new Promise((resolve) => setTimeout(resolve, 450));

    setSentStudentIds((prev) => {
      const next = new Set(prev);
      next.add(singleStudentModal.enrollmentId);
      return next;
    });

    setIsSimulatingSending(false);
    const targetStudent = singleStudentModal;
    setSingleStudentModal(null);

    toast.show(
      `تمت محاكاة إرسال إشعار الغياب بنجاح إلى ولي أمر الطالب: ${targetStudent.studentName} (${targetStudent.parentPhone || 'رقم مسجل'}) — وضع العرض التجريبي (Simulation)`,
      'success'
    );
  };

  const handleConfirmBulkSend = async () => {
    setIsSimulatingSending(true);
    // Simulate brief network latency
    await new Promise((resolve) => setTimeout(resolve, 750));

    // Mark all displayed students with valid phone as sent
    const newSentIds = new Set(sentStudentIds);
    let sentCount = 0;

    displayedStudents.forEach((student) => {
      if (student.hasValidPhone) {
        newSentIds.add(student.enrollmentId);
        sentCount++;
      }
    });

    setSentStudentIds(newSentIds);
    setIsSimulatingSending(false);
    setIsBulkModalOpen(false);

    toast.show(
      `تمت محاكاة إرسال إشعارات الغياب بنجاح إلى ${sentCount} من أولياء الأمور — وضع العرض التجريبي (Demo Simulation)`,
      'success'
    );
  };

  // Helper to format absent periods
  const formatPeriodsText = (periods: number[]) => {
    if (periods.length === 0) return 'كامل اليوم';
    if (periods.length >= 6) return 'كامل اليوم الدراسي';
    return `الحصص: ${periods.join('، ')}`;
  };

  const isLoading =
    isLoadingClasses ||
    isLoadingWeeks ||
    isLoadingEnrollments ||
    isLoadingStudents ||
    isLoadingParents ||
    isLoadingRecords;

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------------------------- */}
      {/* 1. Header Overview & Primary Action                                          */}
      {/* --------------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#182226] p-5 sm:p-6 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78]">
                <BellRing className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#17252B] dark:text-[#F0F4F6] tracking-tight">
                إشعارات أولياء الأمور — Send Notifications
              </h1>
              <span className="text-[11px] font-bold text-[#0B5D43] dark:text-[#3E9B78] bg-[#E8F5F0] dark:bg-[#1A3B31] px-2.5 py-0.5 rounded-full border border-[#D8E5DF] dark:border-[#1E4638]">
                رصد الغياب اليومي
              </span>
            </div>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] max-w-2xl leading-relaxed">
              عرض الطلاب المسجلين كغائبين لليوم الفعّال وإرسال إشعارات فورية لأولياء أمورهم عبر قنوات التواصل المعتمدة.
            </p>
          </div>

          {/* Primary Action: Send to All Parents */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Send className="w-4 h-4 rtl:rotate-180" />}
              disabled={displayedStudents.length === 0 || eligibleParentsCount === 0}
              onClick={() => setIsBulkModalOpen(true)}
              className="w-full sm:w-auto bg-[#0B5D43] hover:bg-[#084733] dark:bg-[#1E7D45] dark:hover:bg-[#176B3A] text-white font-bold text-xs shadow-xs"
            >
              <span>إرسال إلى جميع أولياء الأمور ({eligibleParentsCount})</span>
            </Button>
          </div>
        </div>

        {/* Date and Context Indicator Bar */}
        <div className="mt-5 pt-4 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#5F6B73] dark:text-[#9BAAB1]">
            <Calendar className="w-4 h-4 text-[#0B5D43] dark:text-[#3E9B78]" />
            <span>
              اليوم المحدد: <strong className="text-[#17252B] dark:text-[#F0F4F6]">{currentDayName}</strong>
              {currentDayDate && ` (${formatArabicDate(currentDayDate)})`}
            </span>
            <span className="hidden sm:inline text-[#DCE3E6] dark:text-[#28373D]">|</span>
            <span className="hidden sm:inline">
              الأسبوع: <strong className="text-[#17252B] dark:text-[#F0F4F6]">{activeWeek?.weekNumber ? `الأسبوع ${activeWeek.weekNumber}` : 'الأسبوع الحالي'}</strong>
            </span>
            <span className="hidden md:inline text-[#DCE3E6] dark:text-[#28373D]">|</span>
            <span className="hidden md:inline font-mono">العام الدراسي: 1448-1449هـ</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#245B63] dark:text-[#388B96] bg-[#E8F1F1] dark:bg-[#19383E] px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>محاكاة إرسال تجريبية (Demo Mode)</span>
            </span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* 2. KPI Summary Cards                                                         */}
      {/* --------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Absent Students */}
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] block">الطلاب الغائبون اليوم</span>
            <span className="text-2xl font-black text-[#A61B1B] dark:text-[#F87171] mt-1 block">
              {totalAbsentCount}
            </span>
            <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">مسجلون في رصد الحصص</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Eligible Parents */}
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] block">أولياء الأمور المؤهلون للإشعار</span>
            <span className="text-2xl font-black text-[#0B5D43] dark:text-[#3E9B78] mt-1 block">
              {eligibleParentsCount}
            </span>
            <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">يتوفر لهم رقم هاتف معتمد</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center font-bold">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Missing Parent / Phone info */}
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] block">أرقام هواتف غير متوفرة</span>
            <span className="text-2xl font-black text-[#855500] dark:text-[#FACC15] mt-1 block">
              {missingPhoneCount}
            </span>
            <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">يتطلب تحديث قيد الطالب</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Simulated Sent Status */}
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] block">حالة الإرسال (المحاكاة)</span>
            <span className="text-2xl font-black text-[#245B63] dark:text-[#388B96] mt-1 block">
              {totalSimulatedSent} / {totalAbsentCount}
            </span>
            <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">تم إرسال إشعار تجريبي لهم</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E] text-[#245B63] dark:text-[#388B96] flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* 3. Controls & Filters (Days, Classes, Search)                                */}
      {/* --------------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#182226] p-4 sm:p-5 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs space-y-4">
        {/* Row 1: School Days Tabs */}
        <div>
          <label className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-2">
            اختر اليوم الدراسي لعرض غيابه:
          </label>
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
            {SCHOOL_DAYS.map((day) => {
              const isSelected = day.dayNumber === selectedDayNumber;
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => setSelectedDayNumber(day.dayNumber)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0B5D43] text-white shadow-xs'
                      : 'bg-[#F4F8F6] dark:bg-[#15231D] text-[#5F6B73] dark:text-[#A3C7B9] hover:bg-[#E8F5F0] dark:hover:bg-[#1C332A]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{day.nameAr}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Class filter & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-[#EEF2F3] dark:border-[#28373D]">
          {/* Class Filter */}
          <div className="sm:col-span-5 lg:col-span-4">
            <label className="text-[11px] font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-1">
              تصفية حسب الشعبة الدراسية:
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="w-full pl-3 pr-9 py-2 rounded-lg bg-[#F8FAFA] dark:bg-[#141E22] border border-[#DCE3E6] dark:border-[#28373D] text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] focus:outline-none focus:ring-1 focus:ring-[#0B5D43] cursor-pointer"
              >
                <option value={0}>جميع الشعب المدرسية ({classes.length} شعبة)</option>
                {classes.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    {c.className || `شعبة ${c.classNumber || c.classId}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="sm:col-span-7 lg:col-span-8">
            <label className="text-[11px] font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-1">
              البحث في كشف الغياب:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطالب، رقم الهوية الوطنية، اسم ولي الأمر، أو رقم الهاتف..."
                className="w-full pl-3 pr-9 py-2 rounded-lg bg-[#F8FAFA] dark:bg-[#141E22] border border-[#DCE3E6] dark:border-[#28373D] text-xs font-medium text-[#17252B] dark:text-[#F0F4F6] focus:outline-none focus:ring-1 focus:ring-[#0B5D43]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89949A] hover:text-[#17252B] dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* 4. Table Section (Daily Absence Table)                                       */}
      {/* --------------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#182226] rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0B5D43] dark:text-[#3E9B78]" />
            <h2 className="text-sm font-bold text-[#17252B] dark:text-[#F0F4F6]">
              سجل الطلاب الغائبين ليوم {currentDayName}
            </h2>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
              ({displayedStudents.length} طالب)
            </span>
          </div>

          <div className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
            بيانات أولياء الأمور مسترجعة مباشرة من جدول <code className="font-mono text-[#0B5D43] dark:text-[#3E9B78]">Parent</code> المرتبط بالطالب
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="p-12">
            <MuwathibLoading
              message="جاري جلب سجلات الغياب اليومية وبيانات أولياء الأمور..."
              submessage="يتم فحص مصفوفة الحضور اليومية وقراءة جداول الطلاب وأولياء الأمور المعتمدة"
            />
          </div>
        ) : displayedStudents.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">
              {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : `لا يوجد غياب مسجل ليوم ${currentDayName}`}
            </h3>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] max-w-md mx-auto">
              {searchQuery
                ? 'جرب البحث بكلمات أخرى أو تأكد من صحة رقم الهوية أو الاسم المدخل.'
                : 'جميع طلاب الشعب المحددة مسجلون كحاضرين، أو لم يتم رصد غياب لهذا اليوم بعد.'}
            </p>
          </div>
        ) : (
          /* Responsive Table */
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#F8FAFA] dark:bg-[#141E22] text-[#5F6B73] dark:text-[#9BAAB1] font-bold border-b border-[#DCE3E6] dark:border-[#28373D]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4">رقم الهوية الوطنية</th>
                  <th className="py-3 px-4">الشعبة</th>
                  <th className="py-3 px-4">اسم ولي الأمر</th>
                  <th className="py-3 px-4">رقم هاتف ولي الأمر</th>
                  <th className="py-3 px-4">حالة الغياب</th>
                  <th className="py-3 px-4">حالة الإشعار</th>
                  <th className="py-3 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F3] dark:divide-[#243338]">
                {displayedStudents.map((row, idx) => {
                  const isSent = sentStudentIds.has(row.enrollmentId);

                  return (
                    <tr
                      key={row.enrollmentId}
                      className="hover:bg-[#F9FBFA] dark:hover:bg-[#1B272C] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-[#89949A]">{idx + 1}</td>

                      {/* Student Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#17252B] dark:text-[#F0F4F6]">
                          {row.studentName}
                        </div>
                      </td>

                      {/* Student National ID */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[#5F6B73] dark:text-[#9BAAB1]">
                          {row.nationalId}
                        </span>
                      </td>

                      {/* Class Name */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#F5F7F8] dark:bg-[#1F2C31] text-[#245B63] dark:text-[#388B96] font-semibold text-[11px] border border-[#DCE3E6]/60 dark:border-[#28373D]">
                          {row.className}
                        </span>
                      </td>

                      {/* Parent Name (from Parent Entity) */}
                      <td className="py-3 px-4">
                        {row.parentName ? (
                          <div className="font-semibold text-[#17252B] dark:text-[#F0F4F6]">
                            {row.parentName}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#89949A] dark:text-[#6E7F87] italic">
                            غير مسجل
                          </span>
                        )}
                      </td>

                      {/* Parent Phone (from Parent Entity) */}
                      <td className="py-3 px-4">
                        {row.parentPhone ? (
                          <div className="font-mono text-[#17252B] dark:text-[#F0F4F6] flex items-center gap-1.5" dir="ltr">
                            <Phone className="w-3 h-3 text-[#0B5D43] dark:text-[#3E9B78]" />
                            <span>{row.parentPhone}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#A61B1B] dark:text-[#F87171] font-semibold italic">
                            غير متوفر
                          </span>
                        )}
                      </td>

                      {/* Absence Status Badge */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A61B1B] dark:text-[#F87171] bg-[#FDECEC] dark:bg-[#331518] px-2 py-0.5 rounded-full border border-[#FAD9D9] dark:border-[#451C20]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#A61B1B] dark:bg-[#F87171]" />
                            غائب
                          </span>
                          <span className="block text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">
                            {formatPeriodsText(row.absentPeriods)}
                          </span>
                        </div>
                      </td>

                      {/* Notification Status */}
                      <td className="py-3 px-4">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#176B3A] dark:text-[#4ADE80] bg-[#E8F5EC] dark:bg-[#122B1E] px-2 py-0.5 rounded-full border border-[#B7DEC5] dark:border-[#1B4D32]">
                            <Check className="w-3 h-3" />
                            تم الإرسال (تجريبي)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5F6B73] dark:text-[#9BAAB1] bg-[#F5F7F8] dark:bg-[#1E2B30] px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-[#89949A]" />
                            بانتظار الإرسال
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-center">
                        <Button
                          type="button"
                          variant={isSent ? 'outline' : 'primary'}
                          size="sm"
                          icon={<Send className="w-3 h-3 rtl:rotate-180" />}
                          disabled={!row.hasValidPhone}
                          onClick={() => handleOpenSingleModal(row)}
                          className={
                            isSent
                              ? 'text-[11px] font-semibold border-[#0B5D43]/30 text-[#0B5D43] dark:text-[#3E9B78]'
                              : 'text-[11px] font-bold bg-[#0B5D43] hover:bg-[#084733] text-white dark:bg-[#1E7D45]'
                          }
                          title={!row.hasValidPhone ? 'لا يمكن الإرسال لعدم توفر رقم هاتف ولي الأمر' : 'إرسال إشعار غياب لولي الأمر'}
                        >
                          <span>{isSent ? 'إعادة الإرسال' : 'إرسال الإشعار'}</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* 5. Individual Student Notification Confirmation Modal                        */}
      {/* --------------------------------------------------------------------------- */}
      {singleStudentModal && (
        <Dialog
          isOpen={Boolean(singleStudentModal)}
          onClose={() => setSingleStudentModal(null)}
          title="تأكيد إرسال إشعار غياب لولي الأمر"
          maxWidth="md"
        >
          <div className="space-y-4 text-right">
            {/* Simulation Notice Banner */}
            <div className="p-3 rounded-xl bg-[#E8F1F1] dark:bg-[#19383E]/50 border border-[#245B63]/25 dark:border-[#388B96]/30 flex items-start gap-2.5 text-xs text-[#245B63] dark:text-[#52B4C2]">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#0B5D43] dark:text-[#3E9B78]" />
              <div>
                <strong className="block mb-0.5 font-bold">محاكاة عرض تجريبية (Frontend Simulation):</strong>
                <span>
                  هذا الإجراء يقوم بمحاكاة تدفق إرسال الإشعار فقط للعرض، ولن يتم إجراء أي خصم رصيد أو اتصال خارجي بمزودي الرسائل (SMS/WhatsApp).
                </span>
              </div>
            </div>

            {/* Target Information Card */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFA] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">الطالب المستهدف:</span>
                <strong className="text-[#17252B] dark:text-[#F0F4F6]">
                  {singleStudentModal.studentName} ({singleStudentModal.className})
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">الهوية الوطنية:</span>
                <span className="font-mono font-bold text-[#17252B] dark:text-[#F0F4F6]">
                  {singleStudentModal.nationalId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">ولي الأمر المعني:</span>
                <strong className="text-[#17252B] dark:text-[#F0F4F6]">
                  {singleStudentModal.parentName || 'ولي أمر الطالب'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">رقم الهاتف المسجل:</span>
                <span className="font-mono font-bold text-[#0B5D43] dark:text-[#3E9B78]" dir="ltr">
                  {singleStudentModal.parentPhone || 'غير متوفر'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">فترة الغياب:</span>
                <span className="font-semibold text-[#A61B1B] dark:text-[#F87171]">
                  يوم {currentDayName} — {formatPeriodsText(singleStudentModal.absentPeriods)}
                </span>
              </div>
            </div>

            {/* Message Preview Box */}
            <div>
              <label className="text-xs font-bold text-[#17252B] dark:text-[#F0F4F6] block mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#0B5D43] dark:text-[#3E9B78]" />
                معاينة نص الرسالة التي ستصل لولي الأمر:
              </label>
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#121B1F] border border-[#245B63]/20 dark:border-[#388B96]/30 text-xs text-[#17252B] dark:text-[#E2E8F0] leading-relaxed shadow-2xs font-sans">
                <p>
                  المكرم ولي أمر الطالب/ <strong>{singleStudentModal.studentName}</strong> المحترم،
                </p>
                <p className="mt-1">
                  السلام عليكم ورحمة الله وبركاته،
                  <br />
                  نفيدكم بتسجيل غياب ابنكم عن الحضور للمدرسة اليوم (<strong>{currentDayName}</strong>) في{' '}
                  {formatPeriodsText(singleStudentModal.absentPeriods)}. نأمل منكم التكرم بمتابعة وموافاتنا بسبب الغياب لتوثيقه نظامياً في منصة مواظب.
                </p>
                <p className="mt-2 text-[11px] text-[#5F6B73] dark:text-[#9BAAB1]">
                  إدارة مدرسة: {schoolName} — منصة مواظب
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setSingleStudentModal(null)}
                disabled={isSimulatingSending}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={<Send className="w-4 h-4 rtl:rotate-180" />}
                onClick={handleConfirmSingleSend}
                disabled={isSimulatingSending}
                className="bg-[#0B5D43] hover:bg-[#084733] text-white font-bold"
              >
                <span>{isSimulatingSending ? 'جاري المحاكاة...' : 'تأكيد وإرسال الإشعار (محاكاة)'}</span>
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* --------------------------------------------------------------------------- */}
      {/* 6. Bulk Notification Confirmation Modal (إرسال إلى جميع أولياء الأمور)        */}
      {/* --------------------------------------------------------------------------- */}
      {isBulkModalOpen && (
        <Dialog
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="تأكيد إرسال الإشعارات لجميع أولياء الأمور"
          maxWidth="lg"
        >
          <div className="space-y-4 text-right">
            {/* Explanatory Simulation Banner */}
            <div className="p-3.5 rounded-xl bg-[#E8F5F0] dark:bg-[#1A3B31]/60 border border-[#0B5D43]/20 dark:border-[#3E9B78]/30 flex items-start gap-3 text-xs text-[#0B5D43] dark:text-[#A3E2B8]">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="block font-bold text-sm mb-1">
                  محاكاة إرسال الإشعارات الجماعية لجميع أولياء الأمور
                </strong>
                سيتم تنفيذ محاكاة إرسال رسائل التنبيه لكافة أولياء أمور الطلاب الغائبين المسجلين في القائمة الحالية (المعروضة). هذا الإجراء لا يتصل بمزودات الرسائل الحقيقية لأغراض العرض والتجربة.
              </div>
            </div>

            {/* Target Stats Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#F8FAFA] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] text-center">
                <span className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] block">إجمالي الطلاب الغائبين</span>
                <span className="text-xl font-black text-[#17252B] dark:text-[#F0F4F6] mt-1 block">
                  {displayedStudents.length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFA] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] text-center">
                <span className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] block">أولياء الأمور المتاح إرسالهم</span>
                <span className="text-xl font-black text-[#0B5D43] dark:text-[#3E9B78] mt-1 block">
                  {eligibleParentsCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFA] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] text-center">
                <span className="text-[11px] text-[#5F6B73] dark:text-[#9BAAB1] block">أرقام غير متوفرة (مستبعدون)</span>
                <span className="text-xl font-black text-[#A61B1B] dark:text-[#F87171] mt-1 block">
                  {missingPhoneCount}
                </span>
              </div>
            </div>

            {missingPhoneCount > 0 && (
              <div className="p-3 rounded-xl bg-[#FFF4DA] dark:bg-[#332712]/60 border border-[#EDD38C] dark:border-[#594218] flex items-center gap-2 text-xs text-[#855500] dark:text-[#FACC15]">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  تنبيه: يوجد {missingPhoneCount} طالب بدون رقم هاتف مسجل لولي الأمر، ولن يشملهم الإرسال حتى يتم تحديث بياناتهم.
                </span>
              </div>
            )}

            {/* Message Template Preview */}
            <div className="p-3 rounded-xl bg-[#F8FAFA] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] text-xs text-[#5F6B73] dark:text-[#9BAAB1] space-y-1">
              <span className="font-bold text-[#17252B] dark:text-[#F0F4F6] block">
                القالب المعتمد للرسائل الفردية:
              </span>
              <p className="italic leading-relaxed">
                « المكرم ولي أمر الطالب/ [اسم الطالب]، نفيدكم بغياب ابنكم عن الحضور للمدرسة اليوم ({currentDayName}). نرجو التكرم بمتابعة سبب الغياب والتواصل مع المدرسة. — إدارة {schoolName} »
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsBulkModalOpen(false)}
                disabled={isSimulatingSending}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={<Send className="w-4 h-4 rtl:rotate-180" />}
                onClick={handleConfirmBulkSend}
                disabled={isSimulatingSending || eligibleParentsCount === 0}
                className="bg-[#0B5D43] hover:bg-[#084733] text-white font-bold"
              >
                <span>
                  {isSimulatingSending
                    ? 'جاري محاكاة الإرسال الجماعي...'
                    : `تأكيد إرسال الإشعارات لـ (${eligibleParentsCount}) ولي أمر`}
                </span>
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default AdminSendNotificationsPage;
