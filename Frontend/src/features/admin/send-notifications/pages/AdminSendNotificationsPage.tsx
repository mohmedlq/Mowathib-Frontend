import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellRing,
  Users,
  AlertCircle,
  Calendar,
  Building2,
  Search,
  Check,
  X,
  Clock,
  Sparkles,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Filter,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react';

import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { useSchoolSettings } from '../../../../shared/services/schoolSettingsService';
import { useNotifications } from '../../../notifications';
import { SCHOOL_DAYS } from '../../../../shared/types';
import type { ParentNotification } from '../../../../shared/types';
import {
  calculateDateForDay,
  formatArabicDate,
  getArabicDayName,
  resolveDefaultAttendanceWeek,
} from '../../../../shared/utils/date';
import {
  isValidSaudiPhone,
  formatPhoneDisplay,
  createWhatsAppAbsenceUrl,
  buildAbsenceNotificationMessage,
} from '../../../../shared/utils/whatsapp';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';

export function AdminSendNotificationsPage() {
  const { schoolName } = useSchoolSettings();
  const { toast } = useNotifications();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Date & Filter State
  // ---------------------------------------------------------------------------
  const getInitialDay = () => {
    const jsDay = new Date().getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (jsDay >= 0 && jsDay <= 4) {
      return jsDay + 1; // 1: Sunday, 2: Monday, 3: Tuesday, 4: Wednesday, 5: Thursday
    }
    return 1; // Default to Sunday on weekends
  };

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(getInitialDay);
  const [selectedClassId, setSelectedClassId] = useState<number>(0); // 0 = All Classes
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [customDate, setCustomDate] = useState<string>('');

  // Modal State
  const [previewNotification, setPreviewNotification] = useState<ParentNotification | null>(null);

  // ---------------------------------------------------------------------------
  // Queries: Classes & Weeks
  // ---------------------------------------------------------------------------
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
    staleTime: 1000 * 60 * 30,
  });

  const { data: weeks = [], isLoading: isLoadingWeeks } = useQuery({
    queryKey: ['weeks'],
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
  });

  const activeWeek = useMemo(() => {
    return resolveDefaultAttendanceWeek(weeks) || weeks[0];
  }, [weeks]);

  // Determine current active date
  const currentDayName = getArabicDayName(selectedDayNumber);
  const calculatedDate = activeWeek?.startDate
    ? calculateDateForDay(activeWeek.startDate, selectedDayNumber)
    : '';

  // Use custom date if manually selected via datepicker, else default to calculated week day
  const effectiveDate = customDate || calculatedDate;

  // ---------------------------------------------------------------------------
  // Query: Persistent Parent Notifications from Backend
  // ---------------------------------------------------------------------------
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    isFetching: isFetchingNotifications,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['parent_notifications', effectiveDate],
    queryFn: () => schoolDataService.getParentNotifications({ date: effectiveDate }),
    enabled: Boolean(effectiveDate),
    staleTime: 1000 * 30,
  });

  // Query: Daily absent count from attendance records (to verify if notifications were generated)
  const { data: absenteesPaged } = useQuery({
    queryKey: ['paged_absentees_count', effectiveDate],
    queryFn: () =>
      schoolDataService.getPagedAbsentees({
        date: effectiveDate,
        pageNumber: 1,
        pageSize: 1,
      }),
    enabled: Boolean(effectiveDate),
    staleTime: 1000 * 30,
  });

  const totalAbsentOnDate = absenteesPaged?.totalCount ?? notifications.length;

  // ---------------------------------------------------------------------------
  // Mutations: Generate & Update Status
  // ---------------------------------------------------------------------------
  const generateMutation = useMutation({
    mutationFn: (targetDate: string) => schoolDataService.generateParentNotifications(targetDate),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['parent_notifications', effectiveDate] });
      queryClient.invalidateQueries({ queryKey: ['paged_absentees_count', effectiveDate] });

      if (res.generatedCount > 0) {
        toast.show(
          `تم توليد ${res.generatedCount} إشعار غياب بنجاح (${res.alreadyExistingCount} إشعار مسجل مسبقاً، وتخطي ${res.skippedCount}).`,
          'success'
        );
      } else if (res.alreadyExistingCount > 0) {
        toast.show(
          `تم رصد وتوليد جميع إشعارات هذا اليوم مسبقاً (${res.alreadyExistingCount} إشعار مسجل).`,
          'info'
        );
      } else if (res.totalAbsent === 0) {
        toast.show('لا توجد سجلات غياب مسجلة لهذا اليوم لتوليد إشعارات لها.', 'info');
      } else {
        toast.show(
          `تم فحص السجلات: لم يتم إنشاء إشعارات جديدة (تم تخطي ${res.skippedCount} طالب لعدم توفر بيانات ولي أمر).`,
          'warning'
        );
      }
    },
    onError: (err: any) => {
      toast.show(
        err?.message || 'حدث خطأ أثناء محاولة توليد إشعارات أولياء الأمور.',
        'danger'
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isSent }: { id: number; isSent: boolean }) =>
      schoolDataService.updateNotificationStatus(id, isSent),
    onSuccess: (_, variables) => {
      // Optimistically update React Query cache for instant visual feedback
      queryClient.setQueryData<ParentNotification[]>(
        ['parent_notifications', effectiveDate],
        (old) => {
          if (!old) return [];
          return old.map((n) => (n.id === variables.id ? { ...n, isSent: variables.isSent } : n));
        }
      );
    },
    onError: (err: any) => {
      toast.show(err?.message || 'فشل تحديث حالة الإشعار في قاعدة البيانات.', 'danger');
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleDayChange = (dayNumber: number) => {
    setSelectedDayNumber(dayNumber);
    setCustomDate('');
    setPageNumber(1);
  };

  const handleCustomDateChange = (date: string) => {
    setCustomDate(date);
    setPageNumber(1);
  };

  const handleGenerate = () => {
    if (!effectiveDate) return;
    generateMutation.mutate(effectiveDate);
  };

  /**
   * Primary Action: Opens WhatsApp Click-to-Chat in a new browser tab
   * and immediately updates the backend persistent state to isSent = true.
   */
  const handleOpenWhatsApp = (notification: ParentNotification) => {
    const wa = createWhatsAppAbsenceUrl(
      notification.studentName,
      notification.absentDate,
      notification.phoneNumber,
      schoolName
    );

    if (!wa.isValid || !wa.url) {
      toast.show(
        `رقم الهاتف '${notification.phoneNumber}' غير صالح للإرسال عبر واتساب (صيغة الجوال المطلوبة: 05XXXXXXXX).`,
        'danger'
      );
      return;
    }

    // 1. Open WhatsApp Click-to-Chat window
    window.open(wa.url, '_blank', 'noopener,noreferrer');

    // 2. Immediately persist IsSent = true to backend
    if (!notification.isSent) {
      updateStatusMutation.mutate({ id: notification.id, isSent: true });
      toast.show(
        `تم فتح واتساب للطالب (${notification.studentName}) وتحديث حالة الإشعار إلى "تم الإرسال".`,
        'success'
      );
    } else {
      toast.show(`تم فتح محادثة واتساب لإعادة إرسال الإشعار لولي أمر (${notification.studentName}).`, 'info');
    }

    if (previewNotification) {
      setPreviewNotification(null);
    }
  };

  const handleToggleSentStatus = (notification: ParentNotification) => {
    const newStatus = !notification.isSent;
    updateStatusMutation.mutate({ id: notification.id, isSent: newStatus });
    toast.show(
      newStatus
        ? `تم تحديث حالة الإشعار إلى "تم الإرسال" للطالب (${notification.studentName}).`
        : `تمت إعادة الإشعار إلى حالة "قيد الانتظار" للطالب (${notification.studentName}).`,
      'info'
    );
  };

  // ---------------------------------------------------------------------------
  // Filtering & Pagination Logic
  // ---------------------------------------------------------------------------
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // 1. Status Filter
      if (statusFilter === 'sent' && !item.isSent) return false;
      if (statusFilter === 'pending' && item.isSent) return false;

      // 2. Class Filter (match class name or number if present)
      if (selectedClassId > 0) {
        const selectedClass = classes.find((c) => c.classId === selectedClassId);
        const expectedNum = selectedClass?.classNumber || selectedClass?.classId;
        if (expectedNum && !item.className?.includes(String(expectedNum))) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const studentMatch = item.studentName.toLowerCase().includes(q);
        const parentMatch = item.parentName.toLowerCase().includes(q);
        const nationalIdMatch = item.nationalId?.toLowerCase().includes(q) ?? false;
        const phoneMatch = item.phoneNumber.includes(q);
        const classMatch = item.className?.toLowerCase().includes(q) ?? false;

        if (!studentMatch && !parentMatch && !nationalIdMatch && !phoneMatch && !classMatch) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, statusFilter, selectedClassId, searchQuery, classes]);

  // Derived KPI metrics
  const totalNotifications = notifications.length;
  const sentCount = useMemo(() => notifications.filter((n) => n.isSent).length, [notifications]);
  const pendingCount = useMemo(() => notifications.filter((n) => !n.isSent).length, [notifications]);
  const invalidPhonesCount = useMemo(
    () => notifications.filter((n) => !isValidSaudiPhone(n.phoneNumber)).length,
    [notifications]
  );

  // Paginated items
  const totalCount = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedNotifications = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, pageNumber, pageSize]);

  const isLoading = isLoadingClasses || isLoadingWeeks || isLoadingNotifications;

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------------------------- */}
      {/* 1. Header Overview & Primary Actions                                         */}
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
                رصد الغياب والربط المباشر مع واتساب
              </span>
            </div>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] max-w-2xl leading-relaxed">
              توليد إشعارات الغياب اليومية للطلاب الغائبين وإرسال رسائل موثقة لأولياء أمورهم عبر روابط واتساب المباشرة
              مع حفظ وتوثيق حالة الإرسال في قاعدة البيانات.
            </p>
          </div>

          {/* Top Actions: Generate & Refresh */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={<RefreshCw className={`w-4 h-4 ${isFetchingNotifications ? 'animate-spin' : ''}`} />}
              onClick={() => refetchNotifications()}
              disabled={isFetchingNotifications}
              className="text-xs font-semibold"
              title="تحديث البيانات"
            >
              <span>تحديث</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Sparkles className="w-4 h-4" />}
              isLoading={generateMutation.isPending}
              disabled={generateMutation.isPending || !effectiveDate}
              onClick={handleGenerate}
              className="bg-[#0B5D43] hover:bg-[#084733] dark:bg-[#1E7D45] dark:hover:bg-[#176B3A] text-white font-bold text-xs shadow-xs"
            >
              <span>توليد إشعارات الغياب لهذا اليوم</span>
            </Button>
          </div>
        </div>

        {/* Date and Context Indicator Bar */}
        <div className="mt-5 pt-4 border-t border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#5F6B73] dark:text-[#9BAAB1] flex-wrap">
            <Calendar className="w-4 h-4 text-[#0B5D43] dark:text-[#3E9B78]" />
            <span>
              اليوم المحدد: <strong className="text-[#17252B] dark:text-[#F0F4F6]">{currentDayName}</strong>
              {effectiveDate && ` (${formatArabicDate(effectiveDate)})`}
            </span>
            <span className="hidden sm:inline text-[#DCE3E6] dark:text-[#28373D]">|</span>
            <span className="hidden sm:inline">
              الأسبوع:{' '}
              <strong className="text-[#17252B] dark:text-[#F0F4F6]">
                {activeWeek?.weekNumber ? `الأسبوع ${activeWeek.weekNumber}` : 'الأسبوع الحالي'}
              </strong>
            </span>
            <span className="hidden md:inline text-[#DCE3E6] dark:text-[#28373D]">|</span>
            <span className="hidden md:inline font-mono">العام الدراسي: 1448-1449هـ</span>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-[#5F6B73] dark:text-[#9BAAB1]">
              تحديد تاريخ مخصص:
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-[#DCE3E6] dark:border-[#28373D] bg-[#F8FAFA] dark:bg-[#141E22] text-[#17252B] dark:text-[#F0F4F6] focus:outline-none focus:ring-1 focus:ring-[#0B5D43]"
            />
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* 2. KPI Summary Cards                                                         */}
      {/* --------------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Absent Students on Selected Date */}
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] block">الطلاب الغائبون اليوم</span>
            <span className="text-2xl font-black text-[#A61B1B] dark:text-[#F87171] mt-1 block">
              {totalAbsentOnDate}
            </span>
            <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">مسجلون في سجلات الحضور اليومية</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FDECEC] dark:bg-[#331518] text-[#A61B1B] dark:text-[#F87171] flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Generated Notifications */}
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] block">إجمالي الإشعارات المسجلة</span>
            <span className="text-2xl font-black text-[#0B5D43] dark:text-[#3E9B78] mt-1 block">
              {totalNotifications}
            </span>
            <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">تم توليدها في قاعدة البيانات</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Sent via WhatsApp */}
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] block">تم إرسالها لولي الأمر</span>
            <span className="text-2xl font-black text-[#176B3A] dark:text-[#4ADE80] mt-1 block">
              {sentCount}
            </span>
            <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">
              {totalNotifications > 0 ? `${Math.round((sentCount / totalNotifications) * 100)}% من الإجمالي` : '0%'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] dark:bg-[#122B1E] text-[#176B3A] dark:text-[#4ADE80] flex items-center justify-center font-bold">
            <CheckCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Pending / Awaiting WhatsApp */}
        <div className="bg-white dark:bg-[#182226] p-4 rounded-xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] block">قيد الانتظار (لم ترسل بعد)</span>
            <span className="text-2xl font-black text-[#855500] dark:text-[#FACC15] mt-1 block">
              {pendingCount}
            </span>
            <span className="text-[10px] text-[#5F6B73] dark:text-[#9BAAB1]">
              {invalidPhonesCount > 0 ? `منها ${invalidPhonesCount} برقم غير مطابق` : 'جاهزة للإرسال المباشر'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FFF4DA] dark:bg-[#332712] text-[#855500] dark:text-[#FACC15] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* 3. Controls & Filters (Days, Classes, Status, Search)                        */}
      {/* --------------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#182226] p-4 sm:p-5 rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs space-y-4">
        {/* Row 1: School Days Tabs */}
        <div>
          <label className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-2">
            اختر اليوم الدراسي من الأسبوع الحالي:
          </label>
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
            {SCHOOL_DAYS.map((day) => {
              const isSelected = !customDate && day.dayNumber === selectedDayNumber;
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => handleDayChange(day.dayNumber)}
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

        {/* Row 2: Status Tabs, Class filter & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-[#EEF2F3] dark:border-[#28373D]">
          {/* Status Tabs */}
          <div className="sm:col-span-12 lg:col-span-4">
            <label className="text-[11px] font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-1">
              تصفية حسب حالة الإشعار:
            </label>
            <div className="flex items-center gap-1.5 bg-[#F8FAFA] dark:bg-[#141E22] p-1 rounded-xl border border-[#DCE3E6] dark:border-[#28373D]">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setPageNumber(1);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-[#202E34] text-[#0B5D43] dark:text-[#3E9B78] shadow-xs'
                    : 'text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#17252B]'
                }`}
              >
                الكل ({totalNotifications})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('pending');
                  setPageNumber(1);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-white dark:bg-[#202E34] text-[#855500] dark:text-[#FACC15] shadow-xs'
                    : 'text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#17252B]'
                }`}
              >
                قيد الانتظار ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('sent');
                  setPageNumber(1);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === 'sent'
                    ? 'bg-white dark:bg-[#202E34] text-[#176B3A] dark:text-[#4ADE80] shadow-xs'
                    : 'text-[#5F6B73] dark:text-[#9BAAB1] hover:text-[#17252B]'
                }`}
              >
                تم الإرسال ({sentCount})
              </button>
            </div>
          </div>

          {/* Class Filter */}
          <div className="sm:col-span-5 lg:col-span-3">
            <label className="text-[11px] font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-1">
              تصفية حسب الشعبة:
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(Number(e.target.value));
                  setPageNumber(1);
                }}
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
          <div className="sm:col-span-7 lg:col-span-5">
            <label className="text-[11px] font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-1">
              البحث في كشف الإشعارات:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPageNumber(1);
                }}
                placeholder="ابحث باسم الطالب، الهوية، اسم ولي الأمر، أو رقم الهاتف..."
                className="w-full pl-3 pr-9 py-2 rounded-lg bg-[#F8FAFA] dark:bg-[#141E22] border border-[#DCE3E6] dark:border-[#28373D] text-xs font-medium text-[#17252B] dark:text-[#F0F4F6] focus:outline-none focus:ring-1 focus:ring-[#0B5D43]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPageNumber(1);
                  }}
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
      {/* 4. Table Section (Parent Notifications Table)                                */}
      {/* --------------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#182226] rounded-2xl border border-[#DCE3E6] dark:border-[#28373D] shadow-xs overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-[#EEF2F3] dark:border-[#28373D] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0B5D43] dark:text-[#3E9B78]" />
            <h2 className="text-sm font-bold text-[#17252B] dark:text-[#F0F4F6]">
              كشف إشعارات أولياء الأمور ليوم {currentDayName} ({formatArabicDate(effectiveDate)})
            </h2>
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
              ({filteredNotifications.length} إشعار)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5F6B73] dark:text-[#9BAAB1]">
              الحالة محفوظة تلقائياً ومستمرة عبر الأجهزة في قاعدة البيانات
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="p-12">
            <MuwathibLoading
              message="جاري جلب إشعارات أولياء الأمور وبيانات الاتصال..."
              submessage="يتم فحص قاعدة البيانات واسترجاع حالات الإرسال وروابط واتساب المعتمدة"
            />
          </div>
        ) : notifications.length === 0 ? (
          /* Empty State (Not Generated Yet) */
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F5F0] dark:bg-[#1A3B31] text-[#0B5D43] dark:text-[#3E9B78] flex items-center justify-center">
              <BellRing className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">
                لم يتم توليد إشعارات أولياء الأمور لهذا اليوم بعد
              </h3>
              <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] max-w-md mx-auto">
                يوجد {totalAbsentOnDate} طالب غائب مسجل في كشف الحضور لهذا اليوم. اضغط على الزر أدناه لتوليد إشعارات
                أولياء الأمور وربطها برقم كل طالب مباشرة.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Sparkles className="w-4 h-4" />}
              isLoading={generateMutation.isPending}
              onClick={handleGenerate}
              className="bg-[#0B5D43] hover:bg-[#084733] text-white font-bold text-xs shadow-xs"
            >
              <span>توليد إشعارات أولياء الأمور الآن</span>
            </Button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty Search / Filter State */
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#F5F7F8] dark:bg-[#1A262C] text-[#89949A] flex items-center justify-center">
              <Filter className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#17252B] dark:text-[#F0F4F6]">
              لا توجد إشعارات تطابق معايير التصفية والبحث
            </h3>
            <p className="text-xs text-[#5F6B73] dark:text-[#9BAAB1] max-w-md mx-auto">
              جرب تغيير خيار التصفية أو إزالة نص البحث لعرض جميع الإشعارات المسجلة.
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
                  <th className="py-3 px-4">رقم الهوية</th>
                  <th className="py-3 px-4">الشعبة</th>
                  <th className="py-3 px-4">اسم ولي الأمر</th>
                  <th className="py-3 px-4">رقم جوال ولي الأمر</th>
                  <th className="py-3 px-4">تاريخ الغياب</th>
                  <th className="py-3 px-4">حالة الإشعار</th>
                  <th className="py-3 px-4 text-center">إجراء واتساب</th>
                  <th className="py-3 px-4 text-center">خيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F3] dark:divide-[#243338]">
                {paginatedNotifications.map((row, idx) => {
                  const isValidPhone = isValidSaudiPhone(row.phoneNumber);
                  const isSent = row.isSent;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#F9FBFA] dark:hover:bg-[#1B272C] transition-colors"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 font-mono text-[#89949A]">
                        {(pageNumber - 1) * pageSize + idx + 1}
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#17252B] dark:text-[#F0F4F6]">
                          {row.studentName}
                        </div>
                      </td>

                      {/* Student National ID */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[#5F6B73] dark:text-[#9BAAB1]">
                          {row.nationalId || '—'}
                        </span>
                      </td>

                      {/* Class Name */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#F5F7F8] dark:bg-[#1F2C31] text-[#245B63] dark:text-[#388B96] font-semibold text-[11px] border border-[#DCE3E6]/60 dark:border-[#28373D]">
                          {row.className || 'شعبة عامة'}
                        </span>
                      </td>

                      {/* Parent Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#17252B] dark:text-[#F0F4F6]">
                          {row.parentName}
                        </div>
                      </td>

                      {/* Parent Phone */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6]" dir="ltr">
                            {formatPhoneDisplay(row.phoneNumber)}
                          </span>
                          {!isValidPhone && (
                            <span className="text-[10px] font-bold text-[#A61B1B] dark:text-[#F87171] bg-[#FDECEC] dark:bg-[#331518] px-1.5 py-0.2 rounded border border-[#FAD9D9] dark:border-[#451C20]">
                              غير قياسي
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Absent Date */}
                      <td className="py-3 px-4 font-mono text-[#5F6B73] dark:text-[#9BAAB1]">
                        {row.absentDate}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#176B3A] dark:text-[#4ADE80] bg-[#E8F5EC] dark:bg-[#122B1E] px-2.5 py-0.5 rounded-full border border-[#B7DEC5] dark:border-[#1B4D32]">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            تم الإرسال
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#855500] dark:text-[#FACC15] bg-[#FFF4DA] dark:bg-[#332712] px-2.5 py-0.5 rounded-full border border-[#FFE7A8] dark:border-[#473516]">
                            <Clock className="w-3 h-3" />
                            قيد الانتظار
                          </span>
                        )}
                      </td>

                      {/* WhatsApp Direct Action Button */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(row)}
                          disabled={!isValidPhone}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                            !isValidPhone
                              ? 'bg-[#F2F4F5] dark:bg-[#1D272B] text-[#89949A] cursor-not-allowed opacity-60'
                              : isSent
                              ? 'bg-[#E8F5EC] dark:bg-[#122B1E] hover:bg-[#D4EEDC] text-[#176B3A] dark:text-[#4ADE80] border border-[#B7DEC5] dark:border-[#1B4D32]'
                              : 'bg-[#25D366] hover:bg-[#20BD5A] text-white active:scale-98'
                          }`}
                          title={
                            !isValidPhone
                              ? 'رقم الهاتف غير متوافق مع صيغة الجوال السعودية'
                              : isSent
                              ? 'فتح محادثة واتساب لإعادة الإرسال'
                              : 'فتح محادثة واتساب وتوثيق الإرسال فوراً'
                          }
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{isSent ? 'إعادة الإرسال' : 'إرسال واتساب'}</span>
                          <ExternalLink className="w-3 h-3 opacity-75" />
                        </button>
                      </td>

                      {/* Additional Options */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Preview message modal button */}
                          <button
                            type="button"
                            onClick={() => setPreviewNotification(row)}
                            className="p-1.5 rounded-lg text-[#5F6B73] dark:text-[#9BAAB1] hover:bg-[#F0F4F6] dark:hover:bg-[#243338] transition-colors cursor-pointer"
                            title="معاينة نص الرسالة وتفاصيل الإشعار"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle status manually */}
                          <button
                            type="button"
                            onClick={() => handleToggleSentStatus(row)}
                            className="p-1.5 rounded-lg text-[#5F6B73] dark:text-[#9BAAB1] hover:bg-[#F0F4F6] dark:hover:bg-[#243338] transition-colors cursor-pointer"
                            title={isSent ? 'الرجوع إلى حالة قيد الانتظار' : 'تحديد كـ تم الإرسال يدوياً'}
                          >
                            <CheckCheck className={`w-3.5 h-3.5 ${isSent ? 'text-[#176B3A] dark:text-[#4ADE80]' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <PaginationControls
          pageNumber={pageNumber}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={(page) => setPageNumber(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPageNumber(1);
          }}
          isLoading={isLoading}
          itemLabel="إشعار غياب"
        />
      </div>

      {/* --------------------------------------------------------------------------- */}
      {/* 5. Notification Preview Modal                                                */}
      {/* --------------------------------------------------------------------------- */}
      {previewNotification && (
        <Dialog
          isOpen={Boolean(previewNotification)}
          onClose={() => setPreviewNotification(null)}
          title="معاينة إشعار غياب ولي الأمر"
          maxWidth="md"
        >
          <div className="space-y-4 text-right">
            {/* Header Details */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFA] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">اسم الطالب:</span>
                <strong className="text-[#17252B] dark:text-[#F0F4F6]">
                  {previewNotification.studentName} ({previewNotification.className || 'شعبة عامة'})
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">رقم الهوية:</span>
                <span className="font-mono font-bold text-[#17252B] dark:text-[#F0F4F6]">
                  {previewNotification.nationalId || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">ولي الأمر:</span>
                <strong className="text-[#17252B] dark:text-[#F0F4F6]">
                  {previewNotification.parentName}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">رقم الهاتف:</span>
                <span className="font-mono font-bold text-[#17252B] dark:text-[#F0F4F6]" dir="ltr">
                  {formatPhoneDisplay(previewNotification.phoneNumber)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">تاريخ الغياب:</span>
                <span className="font-mono font-bold text-[#17252B] dark:text-[#F0F4F6]">
                  {previewNotification.absentDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B73] dark:text-[#9BAAB1]">حالة الإرسال الحالية:</span>
                <span className="font-bold text-xs">
                  {previewNotification.isSent ? (
                    <span className="text-[#176B3A] dark:text-[#4ADE80]">تم الإرسال مسبقاً</span>
                  ) : (
                    <span className="text-[#855500] dark:text-[#FACC15]">قيد الانتظار</span>
                  )}
                </span>
              </div>
            </div>

            {/* Message Preview Box */}
            <div>
              <label className="text-xs font-bold text-[#5F6B73] dark:text-[#9BAAB1] block mb-1.5">
                نص الرسالة المرسلة عبر واتساب:
              </label>
              <div className="p-4 rounded-xl bg-[#E8F5EC]/40 dark:bg-[#122B1E]/40 border border-[#B7DEC5]/60 dark:border-[#1B4D32] text-xs text-[#17252B] dark:text-[#F0F4F6] whitespace-pre-wrap leading-relaxed">
                {buildAbsenceNotificationMessage(
                  previewNotification.studentName,
                  previewNotification.absentDate,
                  schoolName
                )}
              </div>
            </div>

            {!isValidSaudiPhone(previewNotification.phoneNumber) && (
              <div className="p-3 rounded-xl bg-[#FDECEC] dark:bg-[#331518] border border-[#FAD9D9] dark:border-[#451C20] flex items-center gap-2 text-xs text-[#A61B1B] dark:text-[#F87171]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  تنبيه: رقم هاتف ولي الأمر غير مطابق لصيغة الجوال السعودية (05XXXXXXXX). يُرجى تصحيح الرقم في شاشة
                  أولياء الأمور أولاً.
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewNotification(null)}
              className="text-xs"
            >
              <span>إغلاق</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<MessageSquare className="w-4 h-4" />}
              disabled={!isValidSaudiPhone(previewNotification.phoneNumber)}
              onClick={() => handleOpenWhatsApp(previewNotification)}
              className="bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold shadow-xs"
            >
              <span>فتح واتساب وإرسال الإشعار</span>
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
