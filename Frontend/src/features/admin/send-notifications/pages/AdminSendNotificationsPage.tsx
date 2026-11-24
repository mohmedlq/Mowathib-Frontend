import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  Building2,
  CalendarRange,
  Check,
  CheckCheck,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  X,
} from 'lucide-react';

import { classesApi } from '../../../classes/api/classesApi';
import { attendanceWeeksApi } from '../../../attendance-weeks/api/attendanceWeeksApi';
import { parentNotificationsApi } from '../../../parent-notifications/api/parentNotificationsApi';
import { attendanceApi } from '../../../attendance/api/attendanceApi';
import { WeekSelector } from '../../../../shared/components/ui/weekselector';
import { useSchoolSettings } from '../../../../shared/services/schoolSettingsService';
import { useNotifications } from '../../../notifications';
import { SCHOOL_DAYS } from '../../../../shared/types';
import type { ParentNotification } from '../../../../shared/types';
import {
  calculateDateForDay,
  formatArabicDate,
  getArabicDayName,
  resolveDefaultAttendanceWeek,
  getRiyadhDateOnly,
} from '../../../../shared/utils/date';
import {
  isValidSaudiPhone,
  formatPhoneDisplay,
  createWhatsAppAbsenceUrl,
  buildAbsenceNotificationMessage,
  DEFAULT_ABSENCE_TEMPLATE,
  renderNotificationMessage,
} from '../../../../shared/utils/whatsapp';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';

// =============================================================================
// Configuration & Utilities
// =============================================================================

const NOTIFICATIONS_QUERY_KEY = 'parent_notifications';
const ABSENTEES_QUERY_KEY = 'paged_absentees_count';
const AUTO_GENERATION_QUERY_KEY = 'parent_notifications_auto_generation';

const CLASSES_QUERY_KEY = ['classes'] as const;
const WEEKS_QUERY_KEY = ['weeks'] as const;

const TEMPLATE_STORAGE_KEY = 'mowathib_absence_template';
const CUSTOM_MESSAGES_STORAGE_KEY = 'mowathib_custom_messages';
const DEFAULT_PAGE_SIZE = 15;

type StatusFilter = 'all' | 'sent' | 'pending';

interface NotificationStatusVariables {
  id: number;
  isSent: boolean;
  date: string;
}

const TEMPLATE_VARIABLES = [
  { tag: '{اسم_الطالب}', label: 'اسم الطالب' },
  { tag: '{تاريخ_الغياب}', label: 'تاريخ الغياب' },
  { tag: '{اسم_ولي_الأمر}', label: 'اسم ولي الأمر' },
  { tag: '{اسم_المدرسة}', label: 'اسم المدرسة' },
  { tag: '{تحية_المدرسة}', label: 'تحية المدرسة' },
] as const;

function getInitialDay(): number {
  const today = getRiyadhDateOnly();
  const weekday = new Date(`${today}T12:00:00`).getDay();
  return weekday >= 0 && weekday <= 4 ? weekday + 1 : 1;
}

function readStoredTemplate(): string {
  try {
    return localStorage.getItem(TEMPLATE_STORAGE_KEY) || DEFAULT_ABSENCE_TEMPLATE;
  } catch {
    return DEFAULT_ABSENCE_TEMPLATE;
  }
}

function readStoredCustomMessages(): Record<number, string> {
  try {
    const saved = localStorage.getItem(CUSTOM_MESSAGES_STORAGE_KEY);
    if (!saved) return {};
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<number, string>;
  } catch {
    return {};
  }
}

function persistCustomMessages(messages: Record<number, string>): void {
  try {
    localStorage.setItem(CUSTOM_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save custom messages:', error);
  }
}

function persistTemplate(template: string): void {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
  } catch (error) {
    console.error('Failed to save template:', error);
  }
}

function getClassNumber(item: any): number | null {
  const raw = String(item?.classNumber ?? item?.className ?? '');
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function getClassLabel(item: any): string {
  if (!item) return 'غير محدد';
  const number = getClassNumber(item);
  return number ? `شعبة ${number}` : item.className || `الشعبة ${item.classId}`;
}

function matchesSearch(notification: ParentNotification, search: string): boolean {
  if (!search) return true;
  const normalized = search.toLocaleLowerCase('ar');
  const values = [
    notification.studentName,
    notification.parentName,
    notification.nationalId || '',
    notification.phoneNumber || '',
    notification.className || '',
  ];
  return values.some((value) =>
    String(value ?? '').toLocaleLowerCase('ar').includes(normalized)
  );
}

// =============================================================================
// Small UI Helpers
// =============================================================================

function StatusBadge({ isSent }: { isSent: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
        isSent
          ? 'bg-[#E8F6EE] text-[#176B4B] dark:bg-[#193B2A] dark:text-[#6DD39A]'
          : 'bg-[#FFF4E2] text-[#98651E] dark:bg-[#45351F] dark:text-[#F1C16F]'
      }`}
    >
      {isSent ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {isSent ? 'موثّق' : 'بانتظار الإرسال'}
    </span>
  );
}

function EmptyState({
  title,
  description,
  icon: Icon = BellRing,
  action,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F2F7F4] text-[#587268] dark:bg-[#1E3329] dark:text-[#9DB5A8]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-[#647C70] dark:text-[#9DB5A8]">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export function AdminSendNotificationsPage() {
  const { schoolName } = useSchoolSettings();
  const { toast } = useNotifications();
  const queryClient = useQueryClient();

  // State
  const [selectedDayNumber, setSelectedDayNumber] = useState(getInitialDay);
  const [selectedWeekId, setSelectedWeekId] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Message & Template Modals
  const [previewNotification, setPreviewNotification] = useState<ParentNotification | null>(null);
  const [editedMessageText, setEditedMessageText] = useState('');
  const [globalTemplate, setGlobalTemplate] = useState(readStoredTemplate);
  const [draftTemplate, setDraftTemplate] = useState(globalTemplate);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [customMessages, setCustomMessages] = useState<Record<number, string>>(
    readStoredCustomMessages
  );

  const autoGenerationAttempts = useRef<Set<string>>(new Set());

  // Reference Queries
  const {
    data: classes = [],
    isLoading: isLoadingClasses,
    isError: isClassesError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: CLASSES_QUERY_KEY,
    queryFn: () => classesApi.getClasses(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  const {
    data: weeks = [],
    isLoading: isLoadingWeeks,
    isError: isWeeksError,
    refetch: refetchWeeks,
  } = useQuery({
    queryKey: WEEKS_QUERY_KEY,
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  // Week & Date
  const defaultWeek = useMemo(() => resolveDefaultAttendanceWeek(weeks) || weeks[0], [weeks]);
  const activeWeek = useMemo(
    () => weeks.find((w) => w.attendanceWeekId === selectedWeekId) || defaultWeek,
    [weeks, selectedWeekId, defaultWeek]
  );

  useEffect(() => {
    if (!defaultWeek) return;
    if (!weeks.some((w) => w.attendanceWeekId === selectedWeekId)) {
      setSelectedWeekId(defaultWeek.attendanceWeekId);
    }
  }, [weeks, selectedWeekId, defaultWeek]);

  const effectiveDate = useMemo(
    () => (activeWeek?.startDate ? calculateDateForDay(activeWeek.startDate, selectedDayNumber) : ''),
    [activeWeek, selectedDayNumber]
  );

  const today = getRiyadhDateOnly();
  const dayName = getArabicDayName(selectedDayNumber);
  const formattedDate = effectiveDate ? formatArabicDate(effectiveDate) : '';
  const weekday = effectiveDate ? new Date(`${effectiveDate}T12:00:00`).getDay() : -1;
  const isValidDate = Boolean(effectiveDate) && weekday >= 0 && weekday <= 4 && effectiveDate <= today;

  // Data Queries
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    isFetching: isFetchingNotifications,
    isError: isNotificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, effectiveDate] as const,
    queryFn: () => parentNotificationsApi.getParentNotifications({ date: effectiveDate }),
    enabled: isValidDate,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: absenteesPaged,
    isLoading: isLoadingAbsentees,
    isFetching: isFetchingAbsentees,
    isError: isAbsenteesError,
    refetch: refetchAbsentees,
  } = useQuery({
    queryKey: [ABSENTEES_QUERY_KEY, effectiveDate] as const,
    queryFn: () =>
      attendanceApi.getPagedAbsentees({ date: effectiveDate, pageNumber: 1, pageSize: 1 }),
    enabled: isValidDate,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Stats
  const totalAbsentOnDate = absenteesPaged?.totalCount ?? notifications.length;
  const totalNotifications = notifications.length;
  const sentCount = useMemo(() => notifications.filter((i) => i.isSent).length, [notifications]);
  const pendingCount = totalNotifications - sentCount;
  const missingNotificationsCount = Math.max(totalAbsentOnDate - totalNotifications, 0);
  const sentPercent = totalNotifications > 0 ? Math.round((sentCount / totalNotifications) * 100) : 0;

  // Generate Mutation
  const generateMutation = useMutation({
    mutationFn: (targetDate: string) => parentNotificationsApi.generateParentNotifications(targetDate),
    onSuccess: (result, targetDate) => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, targetDate] });
      void queryClient.invalidateQueries({ queryKey: [ABSENTEES_QUERY_KEY, targetDate] });

      if (result.generatedCount > 0) {
        toast.show(
          `تم تجهيز ${result.generatedCount} إشعار${result.skippedCount > 0 ? ` (تم تجاوز ${result.skippedCount})` : ''}.`,
          'success'
        );
      }
    },
    onError: (error: any) => {
      console.error('Automatic notification generation failed:', error);
      toast.show(error?.message || 'تعذر تجهيز إشعارات أولياء الأمور.', 'danger');
    },
  });

  // Automatic Generation Guard
  useEffect(() => {
    if (!effectiveDate || !isValidDate) return;
    if (
      isLoadingNotifications ||
      isLoadingAbsentees ||
      isFetchingNotifications ||
      isFetchingAbsentees ||
      isNotificationsError ||
      isAbsenteesError ||
      generateMutation.isPending
    ) {
      return;
    }

    const expectedCount = absenteesPaged?.totalCount ?? notifications.length;
    if (expectedCount <= 0 || notifications.length >= expectedCount) return;

    const generationKey = [AUTO_GENERATION_QUERY_KEY, effectiveDate] as const;
    if (autoGenerationAttempts.current.has(effectiveDate) || queryClient.getQueryData(generationKey)) {
      return;
    }

    autoGenerationAttempts.current.add(effectiveDate);
    queryClient.setQueryData(generationKey, { attempted: true, date: effectiveDate, attemptedAt: Date.now() });
    generateMutation.mutate(effectiveDate);
  }, [
    effectiveDate,
    isValidDate,
    isLoadingNotifications,
    isLoadingAbsentees,
    isFetchingNotifications,
    isFetchingAbsentees,
    isNotificationsError,
    isAbsenteesError,
    notifications.length,
    absenteesPaged?.totalCount,
    generateMutation.isPending,
    generateMutation.mutate,
    queryClient,
  ]);

  // Optimistic Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isSent }: NotificationStatusVariables) =>
      parentNotificationsApi.updateNotificationStatus(id, isSent),
    onMutate: async (variables) => {
      const key = [NOTIFICATIONS_QUERY_KEY, variables.date] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ParentNotification[]>(key);

      queryClient.setQueryData<ParentNotification[]>(
        key,
        (old) =>
          old?.map((item) =>
            item.id === variables.id ? { ...item, isSent: variables.isSent } : item
          ) ?? []
      );
      return { key, previous };
    },
    onSuccess: (_data, variables) => {
      toast.show(variables.isSent ? 'تم توثيق الإرسال.' : 'تم إلغاء التوثيق.', 'success');
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
      toast.show(error?.message || 'فشل حفظ حالة الإرسال.', 'danger');
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, variables.date] });
    },
  });

  // Handlers
  const handleRefresh = async () => {
    if (!effectiveDate || !isValidDate || isFetchingNotifications || isFetchingAbsentees || generateMutation.isPending) {
      return;
    }
    autoGenerationAttempts.current.delete(effectiveDate);
    queryClient.removeQueries({ queryKey: [AUTO_GENERATION_QUERY_KEY, effectiveDate], exact: true });
    await Promise.all([refetchNotifications(), refetchAbsentees()]);
  };

  const getNotificationMessage = (notification: ParentNotification): string => {
    if (customMessages[notification.id] !== undefined) return customMessages[notification.id];
    return buildAbsenceNotificationMessage(
      notification.studentName,
      notification.absentDate,
      schoolName,
      globalTemplate,
      notification.parentName
    );
  };

  const handleOpenPreview = (notification: ParentNotification) => {
    setPreviewNotification(notification);
    setEditedMessageText(getNotificationMessage(notification));
  };

  const handleSaveCustomMessage = (id: number, message: string) => {
    const next = { ...customMessages, [id]: message };
    setCustomMessages(next);
    persistCustomMessages(next);
  };

  const handleResetCustomMessage = (notification: ParentNotification) => {
    const defaultMessage = buildAbsenceNotificationMessage(
      notification.studentName,
      notification.absentDate,
      schoolName,
      globalTemplate,
      notification.parentName
    );
    setEditedMessageText(defaultMessage);
    const next = { ...customMessages };
    delete next[notification.id];
    setCustomMessages(next);
    persistCustomMessages(next);
    toast.show('تم استعادة الرسالة الافتراضية.', 'info');
  };

  const handleSaveGlobalTemplate = () => {
    if (!draftTemplate.trim()) {
      toast.show('لا يمكن حفظ قالب فارغ.', 'danger');
      return;
    }
    setGlobalTemplate(draftTemplate);
    persistTemplate(draftTemplate);
    setIsTemplateModalOpen(false);
    toast.show('تم حفظ قالب الرسائل.', 'success');
  };

  const handleResetGlobalTemplate = () => {
    setDraftTemplate(DEFAULT_ABSENCE_TEMPLATE);
    setGlobalTemplate(DEFAULT_ABSENCE_TEMPLATE);
    try {
      localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    } catch (error) {
      console.error(error);
    }
    toast.show('تم استعادة القالب الافتراضي.', 'info');
  };

  const handleOpenWhatsApp = (notification: ParentNotification, messageOverride?: string) => {
    const message = messageOverride ?? getNotificationMessage(notification);
    const whatsapp = createWhatsAppAbsenceUrl(
      notification.studentName,
      notification.absentDate,
      notification.phoneNumber,
      schoolName,
      message
    );

    if (!whatsapp.isValid || !whatsapp.url) {
      toast.show(`رقم الهاتف ${notification.phoneNumber} غير صالح لواتساب.`, 'danger');
      return;
    }

    if (messageOverride !== undefined) {
      handleSaveCustomMessage(notification.id, messageOverride);
    }

    const whatsappWindow = window.open(whatsapp.url, '_blank', 'noopener,noreferrer');
    if (!whatsappWindow) {
      toast.show('تعذر فتح واتساب. تحقق من إعدادات النوافذ المنبثقة.', 'warning');
      return;
    }

    whatsappWindow.opener = null;
    setPreviewNotification(null);
    toast.show('تم فتح واتساب — بعد الإرسال اضغط "توثيق".', 'info');
  };

  const handleToggleSentStatus = (notification: ParentNotification) => {
    if (updateStatusMutation.isPending) return;
    updateStatusMutation.mutate({
      id: notification.id,
      isSent: !notification.isSent,
      date: effectiveDate,
    });
  };

  // Filtering & Pagination
  const selectedClass = useMemo(
    () => classes.find((item) => item.classId === selectedClassId),
    [classes, selectedClassId]
  );

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((item) => {
        if (statusFilter === 'sent' && !item.isSent) return false;
        if (statusFilter === 'pending' && item.isSent) return false;

        if (selectedClass) {
          const selectedNumber = getClassNumber(selectedClass);
          const match = String(item.className || '').match(/\d+/);
          const actualNumber = match ? Number(match[0]) : null;
          if (selectedNumber !== null && actualNumber !== null && selectedNumber !== actualNumber) {
            return false;
          }
          if ((selectedNumber === null || actualNumber === null) && item.className !== selectedClass.className) {
            return false;
          }
        }

        return matchesSearch(item, searchQuery.trim());
      })
      .sort((a, b) => Number(a.isSent) - Number(b.isSent));
  }, [notifications, statusFilter, selectedClass, searchQuery]);

  const totalCount = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (pageNumber > totalPages) setPageNumber(totalPages);
  }, [pageNumber, totalPages]);

  const paginatedNotifications = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, pageNumber, pageSize]);

  const resetFilters = () => {
    setStatusFilter('all');
    setSelectedClassId(0);
    setSearchQuery('');
    setPageNumber(1);
  };

  // Loading & Error Flags
  const isBaseLoading = isLoadingClasses || isLoadingWeeks;
  const isBaseError = isClassesError || isWeeksError;
  const isLoadingDateData = isLoadingNotifications || isLoadingAbsentees;
  const isDateError = isNotificationsError || isAbsenteesError;
  const isRefreshing = isFetchingNotifications || isFetchingAbsentees;

  if (isBaseLoading) {
    return (
      <div className="rounded-2xl border border-[#DCE7E2] bg-white p-8 dark:border-[#293E35] dark:bg-[#17251F]">
        <MuwathibLoading message="جاري تحميل إشعارات أولياء الأمور..." />
      </div>
    );
  }

  if (isBaseError) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-7 text-center dark:border-rose-900 dark:bg-[#17251F]">
        <AlertCircle className="mx-auto h-9 w-9 text-rose-600 dark:text-rose-400" />
        <h2 className="mt-3 text-base font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
          تعذر تحميل البيانات الأساسية
        </h2>
        <p className="mt-1.5 text-xs text-[#647C70] dark:text-[#9DB5A8]">
          تعذر الاتصال بالخادم لتحميل الشعب أو الأسابيع الدراسية.
        </p>
        <button
          type="button"
          onClick={() => void Promise.all([refetchClasses(), refetchWeeks()])}
          className="mt-4 h-10 rounded-xl bg-[#176B4B] px-5 text-xs font-bold text-white hover:bg-[#10583C]"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-w-0 space-y-4 pb-8 text-[#20362B] dark:text-[#EAF3ED]">
      {/* 1. Compact Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3]">
            إشعارات أولياء الأمور
          </h1>
          <p className="mt-0.5 text-xs text-[#647C70] dark:text-[#9DB5A8]">
            {effectiveDate ? `${dayName}، ${formattedDate}` : 'اختر الأسبوع واليوم لعرض الغياب'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDraftTemplate(globalTemplate);
              setIsTemplateModalOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE7E2] bg-white px-3 text-xs font-bold text-[#294337] transition hover:bg-[#F3F7F4] dark:border-[#293E35] dark:bg-[#17251F] dark:text-[#E2F0E7] dark:hover:bg-[#1F332A]"
          >
            <FileText className="h-3.5 w-3.5" />
            قالب الرسائل
          </button>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={!isValidDate || isRefreshing || generateMutation.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE7E2] bg-white px-3 text-xs font-bold text-[#294337] transition hover:bg-[#F3F7F4] disabled:opacity-40 dark:border-[#293E35] dark:bg-[#17251F] dark:text-[#E2F0E7] dark:hover:bg-[#1F332A]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </header>

      {/* 2. Unified Date Selector & Progress Bar */}
      <section className="rounded-2xl border border-[#DCE7E2] bg-white p-3.5 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Week + Days */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <WeekSelector
              selectedWeekId={activeWeek?.attendanceWeekId ?? 0}
              onSelectWeek={(weekId) => {
                setSelectedWeekId(weekId);
                setPageNumber(1);
              }}
              showDateRange
              className="sm:w-64"
            />

            <div className="grid grid-cols-5 gap-1 rounded-xl bg-[#F2F6F4] p-1 dark:bg-[#111D18]">
              {SCHOOL_DAYS.map((day) => {
                const selected = selectedDayNumber === day.dayNumber;
                return (
                  <button
                    key={day.dayNumber}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedDayNumber(day.dayNumber);
                      setPageNumber(1);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      selected
                        ? 'bg-[#176B4B] text-white shadow-2xs dark:bg-[#23845B]'
                        : 'text-[#587268] hover:text-[#1E3429] dark:text-[#9DB5A8] dark:hover:text-white'
                    }`}
                  >
                    {getArabicDayName(day.dayNumber)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inline Progress Summary (replaces 3 duplicate stat cards) */}
          {isValidDate && !isLoadingDateData && totalNotifications > 0 && (
            <div className="flex items-center gap-3 border-t border-[#EDF2EF] pt-3 lg:border-t-0 lg:pt-0 dark:border-[#263B31]">
              <div className="min-w-[130px] flex-1 lg:w-40">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#587268] dark:text-[#9DB5A8]">
                    تم توثيق {sentCount} من {totalNotifications}
                  </span>
                  <span className="tabular-nums text-[#176B4B] dark:text-[#6DD39A]">
                    {sentPercent}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E8F0EC] dark:bg-[#253B31]">
                  <div
                    className="h-full rounded-full bg-[#176B4B] transition-all duration-300 dark:bg-[#6DD39A]"
                    style={{ width: `${sentPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Conditional Alerts ONLY when action/attention is needed */}
        {effectiveDate > today && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF4E2] px-3 py-2 text-xs font-semibold text-[#98651E] dark:bg-[#3A2D19] dark:text-[#F1C16F]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            التاريخ المحدد مستقبلي — اختر يوم اليوم أو يوماً سابقاً.
          </div>
        )}

        {isValidDate && generateMutation.isPending && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
            جاري تجهيز إشعارات أولياء الأمور تلقائياً لهذا اليوم...
          </div>
        )}

        {isValidDate && !isLoadingDateData && !generateMutation.isPending && missingNotificationsCount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF4E2] px-3 py-2 text-xs font-semibold text-[#98651E] dark:bg-[#3A2D19] dark:text-[#F1C16F]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            يوجد {missingNotificationsCount} طالب غائب لم يُنشأ لهم إشعار (غالباً لعدم اكتمال بيانات ولي الأمر).
          </div>
        )}
      </section>

      {/* 3. Main Notifications Workspace */}
      <section className="overflow-hidden rounded-2xl border border-[#DCE7E2] bg-white shadow-xs dark:border-[#293E35] dark:bg-[#17251F]">
        {/* Integrated Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-[#E9EFEC] p-3.5 dark:border-[#263B31] lg:flex-row lg:items-center lg:justify-between sm:p-4">
          {/* Status Tabs */}
          <div className="inline-grid grid-cols-3 gap-1 rounded-xl bg-[#F2F6F4] p-1 dark:bg-[#111D18]">
            {(
              [
                { value: 'pending', label: 'بانتظار الإرسال', count: pendingCount },
                { value: 'sent', label: 'موثّق', count: sentCount },
                { value: 'all', label: 'الكل', count: totalNotifications },
              ] as const
            ).map((tab) => {
              const selected = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPageNumber(1);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    selected
                      ? 'bg-white text-[#176B4B] shadow-2xs dark:bg-[#1F352B] dark:text-[#9BD5B7]'
                      : 'text-[#647C70] hover:text-[#1E3429] dark:text-[#9DB5A8] dark:hover:text-white'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] tabular-nums dark:bg-white/10">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Class + Search */}
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:max-w-lg">
            <div className="relative sm:w-44">
              <Building2 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71837A]" />
              <select
                aria-label="تصفية حسب الشعبة"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(Number(e.target.value));
                  setPageNumber(1);
                }}
                className="h-9 w-full appearance-none rounded-xl border border-[#DCE7E2] bg-[#FAFCFA] py-1.5 pl-3 pr-8 text-xs font-semibold text-[#1E3429] outline-none focus:border-[#176B4B] dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#EAF3ED]"
              >
                <option value={0}>جميع الشعب</option>
                {classes.map((item) => (
                  <option key={item.classId} value={item.classId}>
                    {getClassLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71837A]" />
              <input
                type="search"
                aria-label="بحث عن طالب أو ولي أمر"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPageNumber(1);
                }}
                placeholder="ابحث بالاسم أو الجوال..."
                className="h-9 w-full rounded-xl border border-[#DCE7E2] bg-[#FAFCFA] py-1.5 pl-8 pr-8 text-xs text-[#1E3429] outline-none placeholder:text-[#87978F] focus:border-[#176B4B] dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#EAF3ED]"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => {
                    setSearchQuery('');
                    setPageNumber(1);
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#71837A] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content States */}
        {!isValidDate ? (
          <EmptyState
            title="اختر يوماً دراسياً صالحاً"
            description="حدد الأسبوع واليوم من الشريط العلوي لعرض قائمة الطلاب الغائبين."
            icon={CalendarRange}
          />
        ) : isLoadingDateData ? (
          <div className="p-8">
            <MuwathibLoading message="جاري تحميل قائمة الإشعارات..." />
          </div>
        ) : isDateError ? (
          <EmptyState
            title="تعذر تحميل الإشعارات"
            description="حدث خطأ أثناء الاتصال بالخادم. حاول التحديث مرة أخرى."
            icon={AlertCircle}
            action={
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#176B4B] px-4 text-xs font-bold text-white hover:bg-[#10583C]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </button>
            }
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            title={totalAbsentOnDate > 0 ? 'جاري تجهيز الإشعارات' : 'لا يوجد غياب في هذا اليوم'}
            description={
              totalAbsentOnDate > 0
                ? 'اضغط "تحديث" إذا لم تظهر الإشعارات خلال لحظات.'
                : 'لم تُسجّل أي حالات غياب لهذا التاريخ.'
            }
            icon={CheckCheck}
          />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            title="لا توجد نتائج مطابقة"
            description="جرّب تغيير الفلتر أو مسح نص البحث."
            icon={Search}
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-bold text-[#176B4B] hover:underline dark:text-[#6DD39A]"
              >
                عرض جميع الإشعارات
              </button>
            }
          />
        ) : (
          <>
            {/* Mobile List */}
            <div className="divide-y divide-[#EDF2EF] dark:divide-[#263B31] md:hidden">
              {paginatedNotifications.map((notification) => {
                const validPhone = isValidSaudiPhone(notification.phoneNumber);
                const savingThis =
                  updateStatusMutation.isPending &&
                  updateStatusMutation.variables?.id === notification.id;

                return (
                  <article key={notification.id} className="p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                            {notification.studentName}
                          </h3>
                          {customMessages[notification.id] !== undefined && (
                            <span className="h-2 w-2 rounded-full bg-amber-500" title="رسالة مخصصة" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#647C70] dark:text-[#9DB5A8]">
                          {notification.className || 'غير محدد'} · {notification.parentName}
                        </p>
                      </div>
                      <StatusBadge isSent={notification.isSent} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-[#31463A] dark:text-[#D8E8DE]" dir="ltr">
                        {formatPhoneDisplay(notification.phoneNumber)}
                      </span>
                      {!validPhone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          رقم غير صالح
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!validPhone}
                        onClick={() => handleOpenWhatsApp(notification)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1FA855] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#168B45] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-[#24362E] dark:disabled:text-[#6B8276]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        واتساب
                        <ExternalLink className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => handleToggleSentStatus(notification)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                          notification.isSent
                            ? 'border-[#BDE7CE] bg-[#EDF8F2] text-[#176B4B] dark:border-[#28573D] dark:bg-[#1B3628] dark:text-[#6DD39A]'
                            : 'border-[#DCE7E2] bg-white text-[#294337] hover:bg-[#F3F7F4] dark:border-[#2C4539] dark:bg-[#1B2E26] dark:text-[#E2F0E7]'
                        }`}
                      >
                        {savingThis ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-3.5 w-3.5" />
                        )}
                        {notification.isSent ? 'موثّق' : 'توثيق'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPreview(notification)}
                        aria-label="تعديل الرسالة"
                        className="rounded-xl border border-[#DCE7E2] p-2 text-[#587268] hover:bg-[#F3F7F4] dark:border-[#2C4539] dark:text-[#9DB5A8] dark:hover:bg-[#1F332A]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-right text-xs">
                <thead className="bg-[#F7FAF8] text-[11px] font-bold text-[#647C70] dark:bg-[#14201B] dark:text-[#9DB5A8]">
                  <tr className="border-b border-[#E9EFEC] dark:border-[#263B31]">
                    <th className="px-4 py-3">الطالب</th>
                    <th className="px-4 py-3">الشعبة</th>
                    <th className="px-4 py-3">ولي الأمر</th>
                    <th className="px-4 py-3">الجوال</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3 text-left">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF2EF] dark:divide-[#263B31]">
                  {paginatedNotifications.map((notification) => {
                    const validPhone = isValidSaudiPhone(notification.phoneNumber);
                    const savingThis =
                      updateStatusMutation.isPending &&
                      updateStatusMutation.variables?.id === notification.id;

                    return (
                      <tr
                        key={notification.id}
                        className="transition-colors hover:bg-[#FAFCFA] dark:hover:bg-[#1B2C24]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1E3429] dark:text-[#F0F7F3]">
                              {notification.studentName}
                            </span>
                            {customMessages[notification.id] !== undefined && (
                              <span
                                title="رسالة مخصصة"
                                className="h-2 w-2 rounded-full bg-amber-500"
                              />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg border border-[#DCE8E1] bg-[#F2F7F4] px-2 py-0.5 font-semibold text-[#315F47] dark:border-[#304D3D] dark:bg-[#1D3127] dark:text-[#B5D7C1]">
                            {notification.className || 'غير محدد'}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-medium text-[#31463A] dark:text-[#D8E8DE]">
                          {notification.parentName}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-[#465E53] dark:text-[#B8CEC2]" dir="ltr">
                              {formatPhoneDisplay(notification.phoneNumber)}
                            </span>
                            {!validPhone && (
                              <AlertTriangle
                                className="h-3.5 w-3.5 text-rose-500"
                                aria-label="رقم غير صالح"
                              />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge isSent={notification.isSent} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={!validPhone}
                              onClick={() => handleOpenWhatsApp(notification)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1FA855] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#168B45] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-[#24362E] dark:disabled:text-[#6B8276]"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              واتساب
                            </button>

                            <button
                              type="button"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => handleToggleSentStatus(notification)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
                                notification.isSent
                                  ? 'border-[#BDE7CE] bg-[#EDF8F2] text-[#176B4B] hover:bg-[#D9F1E3] dark:border-[#28573D] dark:bg-[#1B3628] dark:text-[#6DD39A]'
                                  : 'border-[#DCE7E2] bg-white text-[#294337] hover:bg-[#F3F7F4] dark:border-[#2C4539] dark:bg-[#1B2E26] dark:text-[#E2F0E7]'
                              }`}
                            >
                              {savingThis ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCheck className="h-3.5 w-3.5" />
                              )}
                              {notification.isSent ? 'موثّق' : 'توثيق'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenPreview(notification)}
                              title="تعديل الرسالة"
                              aria-label="تعديل الرسالة"
                              className="rounded-lg p-1.5 text-[#647C70] transition hover:bg-[#F0F7F2] hover:text-[#176B4B] dark:text-[#9DB5A8] dark:hover:bg-[#1F332A]"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-[#E9EFEC] px-3 py-3 dark:border-[#263B31] sm:px-4">
              <PaginationControls
                pageNumber={pageNumber}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setPageNumber}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPageNumber(1);
                }}
                isLoading={isLoadingDateData}
                itemLabel="إشعار"
              />
            </div>
          </>
        )}
      </section>

      {/* 4. Individual Message Editor Modal */}
      {previewNotification && (
        <Dialog
          isOpen={Boolean(previewNotification)}
          onClose={() => setPreviewNotification(null)}
          title={`رسالة ولي أمر: ${previewNotification.studentName}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-right">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DCE7E2] bg-[#F7FAF8] px-3.5 py-2.5 text-xs dark:border-[#263B31] dark:bg-[#14201B]">
              <span className="font-bold text-[#1E3429] dark:text-[#F0F7F3]">
                {previewNotification.parentName}
              </span>
              <span className="font-mono font-semibold text-[#587268] dark:text-[#9DB5A8]" dir="ltr">
                {formatPhoneDisplay(previewNotification.phoneNumber)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#1E3429] dark:text-[#F0F7F3]">
                  نص الرسالة
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '+ مراجعة الإدارة', text: '\nنرجو مراجعة إدارة المدرسة.' },
                    { label: '+ طلب عذر', text: '\nيرجى تقديم عذر رسمي معتمد.' },
                    { label: '+ تكرر الغياب', text: '\nنود التنبيه إلى تكرر غياب الطالب.' },
                  ].map((snippet) => (
                    <button
                      key={snippet.label}
                      type="button"
                      onClick={() => setEditedMessageText((v) => `${v}${snippet.text}`)}
                      className="rounded-lg border border-[#DCE7E2] bg-[#FAFCFA] px-2 py-1 text-[11px] font-semibold text-[#294337] hover:bg-[#EFF5F1] dark:border-[#2C4539] dark:bg-[#1B2E26] dark:text-[#D8E8DE]"
                    >
                      {snippet.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={editedMessageText}
                onChange={(e) => setEditedMessageText(e.target.value)}
                rows={7}
                className="w-full resize-y rounded-xl border border-[#DCE7E2] bg-white p-3.5 text-sm leading-7 text-[#1E3429] outline-none focus:border-[#176B4B] dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#EAF3ED]"
                placeholder="اكتب الرسالة..."
              />
            </div>

            {!isValidSaudiPhone(previewNotification.phoneNumber) && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                رقم ولي الأمر غير صالح — صحّح الرقم قبل فتح واتساب.
              </div>
            )}
          </div>

          <DialogFooter className="mt-5 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => handleResetCustomMessage(previewNotification)}
            >
              استعادة الافتراضي
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Save className="h-3.5 w-3.5" />}
              onClick={() => {
                handleSaveCustomMessage(previewNotification.id, editedMessageText);
                toast.show('تم حفظ الرسالة المخصصة.', 'success');
              }}
            >
              حفظ
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Send className="h-4 w-4" />}
              disabled={!isValidSaudiPhone(previewNotification.phoneNumber)}
              onClick={() => handleOpenWhatsApp(previewNotification, editedMessageText)}
              className="bg-[#1FA855] text-white hover:bg-[#168B45]"
            >
              فتح واتساب
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 5. Global Template Modal */}
      {isTemplateModalOpen && (
        <Dialog
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          title="قالب رسائل الغياب"
          maxWidth="lg"
        >
          <div className="space-y-4 text-right">
            <div>
              <p className="mb-2 text-xs font-bold text-[#1E3429] dark:text-[#F0F7F3]">
                اضغط لإدراج متغير:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    title={label}
                    onClick={() => setDraftTemplate((v) => `${v}${tag}`)}
                    className="rounded-lg border border-[#CFE2D8] bg-[#EDF8F2] px-2.5 py-1 font-mono text-[11px] font-bold text-[#176B4B] hover:bg-[#DCEDE2] dark:border-[#28573D] dark:bg-[#1B3628] dark:text-[#9BD5B7]"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="global-notification-template"
                className="mb-1.5 block text-xs font-bold text-[#1E3429] dark:text-[#F0F7F3]"
              >
                نص القالب
              </label>
              <textarea
                id="global-notification-template"
                value={draftTemplate}
                onChange={(e) => setDraftTemplate(e.target.value)}
                rows={6}
                className="w-full resize-y rounded-xl border border-[#DCE7E2] bg-white p-3.5 text-sm leading-7 text-[#1E3429] outline-none focus:border-[#176B4B] dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#EAF3ED]"
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold text-[#587268] dark:text-[#9DB5A8]">
                معاينة حية
              </p>
              <div className="rounded-xl border border-[#CFE2D8] bg-[#F4FAF7] p-3.5 text-xs leading-7 text-[#1E3429] dark:border-[#28573D] dark:bg-[#14261E] dark:text-[#E2F0E7]">
                <p className="whitespace-pre-wrap">
                  {renderNotificationMessage(draftTemplate, {
                    studentName: 'سلطان عبد العزيز الخالدي',
                    parentName: 'عبد العزيز الخالدي',
                    absentDate: effectiveDate,
                    schoolName: schoolName || 'اسم المدرسة',
                  })}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleResetGlobalTemplate}
            >
              استعادة الافتراضي
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Save className="h-4 w-4" />}
              onClick={handleSaveGlobalTemplate}
              className="bg-[#176B4B] text-white hover:bg-[#10583C]"
            >
              حفظ القالب
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </main>
  );
}

export default AdminSendNotificationsPage;