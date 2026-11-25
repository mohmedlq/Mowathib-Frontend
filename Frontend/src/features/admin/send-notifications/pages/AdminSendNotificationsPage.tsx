import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  type LucideIcon,
} from 'lucide-react';

import { classesApi } from '../../../classes/api/classesApi';
import { attendanceWeeksApi } from '../../../attendance-weeks/api/attendanceWeeksApi';
import { parentNotificationsApi } from '../../../parent-notifications/api/parentNotificationsApi';
import { attendanceApi } from '../../../attendance/api/attendanceApi';
import { WeekSelector } from '../../../../shared/components/ui/weekselector';
import { useSchoolSettings } from '../../../../shared/services/schoolSettingsService';
import { useNotifications } from '../../../notifications';
import { SCHOOL_DAYS } from '../../../../shared/types';
import type { ClassItem, ParentNotification } from '../../../../shared/types';
import {
  calculateDateForDay,
  formatHijriDate,
  getArabicDayName,
  getRiyadhDateOnly,
  resolveDefaultAttendanceWeek,
} from '../../../../shared/utils/date';
import {
  createWhatsAppAbsenceUrl,
  DEFAULT_ABSENCE_TEMPLATE,
  formatPhoneDisplay,
  isValidSaudiPhone,
  renderNotificationMessage,
} from '../../../../shared/utils/whatsapp';
import { Button } from '../../../../shared/components/ui/Button';
import { Dialog, DialogFooter } from '../../../../shared/components/ui/Dialog';
import { MuwathibLoading } from '../../../../shared/components/ui/Spinner';
import { PaginationControls } from '../../../../shared/components/ui/PaginationControls';

// =============================================================================
// Configuration
// =============================================================================

const QUERY_KEYS = {
  classes: ['classes'] as const,
  weeks: ['weeks'] as const,
  notifications: 'parent_notifications',
  absentees: 'paged_absentees_count',
  autoGeneration: 'parent_notifications_auto_generation',
};

const STORAGE_KEYS = {
  template: 'mowathib_absence_template',
  customMessages: 'mowathib_custom_messages',
};

const DEFAULT_PAGE_SIZE = 15;

type StatusFilter = 'all' | 'sent' | 'pending';
type StatusUpdateSource = 'whatsapp' | 'manual';

interface NotificationStatusVariables {
  id: number;
  isSent: boolean;
  date: string;
  source: StatusUpdateSource;
}

interface NotificationStatusContext {
  queryKey: readonly [string, string];
  previousNotifications?: ParentNotification[];
}

const TEMPLATE_VARIABLES = [
  { tag: '{اسم_الطالب}', label: 'اسم الطالب' },
  { tag: '{تاريخ_الغياب}', label: 'تاريخ الغياب' },
  { tag: '{اسم_ولي_الأمر}', label: 'اسم ولي الأمر' },
  { tag: '{اسم_المدرسة}', label: 'اسم المدرسة' },
  { tag: '{تحية_المدرسة}', label: 'تحية المدرسة' },
] as const;

// =============================================================================
// Utility Functions
// =============================================================================

function getInitialDay(): number {
  const today = getRiyadhDateOnly();
  const dayOfWeek = new Date(`${today}T12:00:00Z`).getUTCDay();
  return dayOfWeek >= 0 && dayOfWeek <= 4 ? dayOfWeek + 1 : 1;
}

function readStoredTemplate(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.template) || DEFAULT_ABSENCE_TEMPLATE;
  } catch {
    return DEFAULT_ABSENCE_TEMPLATE;
  }
}

function readStoredCustomMessages(): Record<number, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.customMessages);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return parsed as Record<number, string>;
  } catch {
    return {};
  }
}

function saveCustomMessages(messages: Record<number, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.customMessages, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save custom notification messages:', error);
  }
}

function saveTemplate(template: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.template, template);
  } catch (error) {
    console.error('Failed to save notification template:', error);
  }
}

function getClassNumber(classItem: Pick<ClassItem, 'classNumber' | 'className'>): number | null {
  const value = String(classItem.classNumber ?? classItem.className ?? '');
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function getClassLabel(classItem: ClassItem): string {
  const classNumber = getClassNumber(classItem);
  return classNumber!= 0? `شعبة ${classNumber}`:`الشعبة ${classItem.classId}`;
}

function matchesSearch(notification: ParentNotification, search: string): boolean {
  if (!search) return true;

  const normalizedSearch = search.toLocaleLowerCase('ar');
  const searchableValues = [
    notification.studentName,
    notification.parentName,
    notification.nationalId || '',
    notification.phoneNumber || '',
    notification.className || '',
  ];

  return searchableValues.some((value) =>
    String(value ?? '').toLocaleLowerCase('ar').includes(normalizedSearch)
  );
}

/**
 * Converts unambiguous ISO Gregorian dates in saved/custom text to Hijri.
 * This also upgrades custom messages saved by older versions of the page.
 */
function convertGregorianDatesToHijri(message: string): string {
  return message
    // ISO: 2026-11-25 or 2026-11-25T00:00:00
    .replace(/\b(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?\b/g, (value) =>
      formatHijriDate(value.slice(0, 10))
    )
    // Year first: 2026/11/25
    .replace(/\b((?:19|20)\d{2})\/(\d{1,2})\/(\d{1,2})\b/g, (_value, year, month, day) =>
      formatHijriDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    )
    // Day first: 25/11/2026 or 25-11-2026
    .replace(/\b(\d{1,2})[/-](\d{1,2})[/-]((?:19|20)\d{2})\b/g, (_value, day, month, year) =>
      formatHijriDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    );
}

function buildMessage(
  template: string,
  notification: Pick<ParentNotification, 'studentName' | 'parentName' | 'absentDate'>,
  schoolName?: string
): string {
  const message = renderNotificationMessage(template, {
    studentName: notification.studentName,
    parentName: notification.parentName,
    absentDate: formatHijriDate(notification.absentDate),
    schoolName: schoolName || 'المدرسة',
  });

  return convertGregorianDatesToHijri(message);
}

function getNotificationQueryKey(date: string) {
  return [QUERY_KEYS.notifications, date] as const;
}

function getAbsenteesQueryKey(date: string) {
  return [QUERY_KEYS.absentees, date] as const;
}

// =============================================================================
// Small UI Components
// =============================================================================

function StatusBadge({ isSent }: { isSent: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        isSent
          ? 'bg-[#E8F6EE] text-[#176B4B] dark:bg-[#193B2A] dark:text-[#6DD39A]'
          : 'bg-[#FFF4E2] text-[#98651E] dark:bg-[#45351F] dark:text-[#F1C16F]'
      }`}
    >
      {isSent ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {isSent ? 'مرسل' : 'بانتظار الإرسال'}
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
  icon?: LucideIcon;
  action?: ReactNode;
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

  // Page filters and pagination
  const [selectedDayNumber, setSelectedDayNumber] = useState(getInitialDay);
  const [selectedWeekId, setSelectedWeekId] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Message editor and templates
  const [previewNotification, setPreviewNotification] = useState<ParentNotification | null>(null);
  const [editedMessageText, setEditedMessageText] = useState('');
  const [globalTemplate, setGlobalTemplate] = useState(readStoredTemplate);
  const [draftTemplate, setDraftTemplate] = useState(globalTemplate);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [customMessages, setCustomMessages] = useState<Record<number, string>>(
    readStoredCustomMessages
  );

  const autoGenerationAttempts = useRef(new Set<string>());

  // ---------------------------------------------------------------------------
  // Reference data
  // ---------------------------------------------------------------------------

  const {
    data: classes = [],
    isLoading: isLoadingClasses,
    isError: isClassesError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: QUERY_KEYS.classes,
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
    queryKey: QUERY_KEYS.weeks,
    queryFn: () => attendanceWeeksApi.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  const defaultWeek = useMemo(
    () => resolveDefaultAttendanceWeek(weeks) || weeks[0],
    [weeks]
  );

  const activeWeek = useMemo(
    () => weeks.find((week) => week.attendanceWeekId === selectedWeekId) || defaultWeek,
    [weeks, selectedWeekId, defaultWeek]
  );

  useEffect(() => {
    if (!defaultWeek) return;

    const selectedWeekExists = weeks.some(
      (week) => week.attendanceWeekId === selectedWeekId
    );

    if (!selectedWeekExists) {
      setSelectedWeekId(defaultWeek.attendanceWeekId);
    }
  }, [weeks, selectedWeekId, defaultWeek]);

  // ---------------------------------------------------------------------------
  // Selected date
  // ---------------------------------------------------------------------------

  const effectiveDate = useMemo(
    () =>
      activeWeek?.startDate
        ? calculateDateForDay(activeWeek.startDate, selectedDayNumber)
        : '',
    [activeWeek, selectedDayNumber]
  );

  const today = getRiyadhDateOnly();
  const dayName = getArabicDayName(selectedDayNumber);
  const formattedHijriDate = effectiveDate ? formatHijriDate(effectiveDate) : '';
  const weekday = effectiveDate
    ? new Date(`${effectiveDate}T12:00:00Z`).getUTCDay()
    : -1;

  const isValidDate =
    Boolean(effectiveDate) && weekday >= 0 && weekday <= 4 && effectiveDate <= today;

  // ---------------------------------------------------------------------------
  // Date-based data
  // ---------------------------------------------------------------------------

  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    isFetching: isFetchingNotifications,
    isError: isNotificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: getNotificationQueryKey(effectiveDate),
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
    queryKey: getAbsenteesQueryKey(effectiveDate),
    queryFn: () =>
      attendanceApi.getPagedAbsentees({
        date: effectiveDate,
        pageNumber: 1,
        pageSize: 1,
      }),
    enabled: isValidDate,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // ---------------------------------------------------------------------------
  // Notification statistics
  // ---------------------------------------------------------------------------

  const totalAbsentOnDate = absenteesPaged?.totalCount ?? notifications.length;
  const totalNotifications = notifications.length;
  const sentCount = useMemo(
    () => notifications.filter((notification) => notification.isSent).length,
    [notifications]
  );
  const pendingCount = totalNotifications - sentCount;
  const missingNotificationsCount = Math.max(totalAbsentOnDate - totalNotifications, 0);
  const sentPercent = totalNotifications
    ? Math.round((sentCount / totalNotifications) * 100)
    : 0;

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const generateMutation = useMutation({
    mutationFn: (date: string) =>
      parentNotificationsApi.generateParentNotifications(date),
    onSuccess: (result, date) => {
      void queryClient.invalidateQueries({ queryKey: getNotificationQueryKey(date) });
      void queryClient.invalidateQueries({ queryKey: getAbsenteesQueryKey(date) });

      if (result.generatedCount > 0) {
        const skippedMessage = result.skippedCount
          ? ` (تم تجاوز ${result.skippedCount})`
          : '';

        toast.show(
          `تم تجهيز ${result.generatedCount} إشعار${skippedMessage}.`,
          'success'
        );
      }
    },
    onError: (error: Error) => {
      console.error('Notification generation failed:', error);
      toast.show(error.message || 'تعذر تجهيز إشعارات أولياء الأمور.', 'danger');
    },
  });

  // Generate any missing notifications once for the selected date.
  useEffect(() => {
    if (!effectiveDate || !isValidDate) return;

    const isQueryBusy =
      isLoadingNotifications ||
      isLoadingAbsentees ||
      isFetchingNotifications ||
      isFetchingAbsentees;

    if (
      isQueryBusy ||
      isNotificationsError ||
      isAbsenteesError ||
      generateMutation.isPending
    ) {
      return;
    }

    const expectedCount = absenteesPaged?.totalCount ?? notifications.length;
    const hasMissingNotifications =
      expectedCount > 0 && notifications.length < expectedCount;

    if (!hasMissingNotifications) return;

    const generationKey = [QUERY_KEYS.autoGeneration, effectiveDate] as const;
    const alreadyAttempted =
      autoGenerationAttempts.current.has(effectiveDate) ||
      queryClient.getQueryData(generationKey);

    if (alreadyAttempted) return;

    autoGenerationAttempts.current.add(effectiveDate);
    queryClient.setQueryData(generationKey, {
      attempted: true,
      date: effectiveDate,
      attemptedAt: Date.now(),
    });

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
    generateMutation.isPending,
    generateMutation.mutate,
    absenteesPaged?.totalCount,
    notifications.length,
    queryClient,
  ]);

  const updateStatusMutation = useMutation<
    unknown,
    Error,
    NotificationStatusVariables,
    NotificationStatusContext
  >({
    mutationFn: ({ id, isSent }) =>
      parentNotificationsApi.updateNotificationStatus(id, isSent),

    // Optimistic update: the UI changes immediately when the user clicks.
    onMutate: (variables) => {
      const queryKey = getNotificationQueryKey(variables.date);
      void queryClient.cancelQueries({ queryKey });

      const previousNotifications = queryClient.getQueryData<ParentNotification[]>(queryKey);

      queryClient.setQueryData<ParentNotification[]>(queryKey, (current) =>
        current?.map((notification) =>
          notification.id === variables.id
            ? { ...notification, isSent: variables.isSent }
            : notification
        ) ?? []
      );

      return { queryKey, previousNotifications };
    },

    onSuccess: (_result, variables) => {
      if (variables.source === 'whatsapp' && variables.isSent) {
        toast.show('تم تسجيل الإشعار كمرسل.', 'success');
        return;
      }

      toast.show(
        variables.isSent ? 'تم توثيق الإشعار.' : 'تم إلغاء توثيق الإشعار.',
        'success'
      );
    },

    onError: (error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(context.queryKey, context.previousNotifications);
      }

      toast.show(error.message || 'تعذر حفظ حالة الإشعار.', 'danger');
    },

    onSettled: (_result, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: getNotificationQueryKey(variables.date),
      });
    },
  });

  // ---------------------------------------------------------------------------
  // Message helpers and actions
  // ---------------------------------------------------------------------------

  const getNotificationMessage = (notification: ParentNotification): string => {
    const template =
      customMessages[notification.id] !== undefined
        ? customMessages[notification.id]
        : globalTemplate;

    return buildMessage(template, notification, schoolName);
  };

  const saveCustomMessage = (notificationId: number, message: string): void => {
    const updatedMessages = {
      ...customMessages,
      [notificationId]: message,
    };

    setCustomMessages(updatedMessages);
    saveCustomMessages(updatedMessages);
  };

  const openMessageEditor = (notification: ParentNotification): void => {
    setPreviewNotification(notification);
    setEditedMessageText(getNotificationMessage(notification));
  };

  const resetCustomMessage = (notification: ParentNotification): void => {
    const defaultMessage = buildMessage(globalTemplate, notification, schoolName);
    const updatedMessages = { ...customMessages };

    delete updatedMessages[notification.id];
    setCustomMessages(updatedMessages);
    saveCustomMessages(updatedMessages);
    setEditedMessageText(defaultMessage);

    toast.show('تم استعادة الرسالة الافتراضية.', 'info');
  };

  const markNotificationAsSent = (notification: ParentNotification): void => {
    if (notification.isSent) return;

    updateStatusMutation.mutate({
      id: notification.id,
      isSent: true,
      date: effectiveDate,
      source: 'whatsapp',
    });
  };

  /**
   * Opens WhatsApp and marks the notification as sent immediately on click.
   * The status represents an initiated send attempt, not confirmed delivery.
   */
  const sendWhatsAppNotification = (
    notification: ParentNotification,
    messageOverride?: string
  ): void => {
    if (!isValidSaudiPhone(notification.phoneNumber)) {
      toast.show(
        `رقم الهاتف ${notification.phoneNumber || ''} غير صالح لواتساب.`,
        'danger'
      );
      return;
    }

    const message = convertGregorianDatesToHijri(
      messageOverride ?? getNotificationMessage(notification)
    );
    const hijriAbsentDate = formatHijriDate(notification.absentDate);

    const whatsapp = createWhatsAppAbsenceUrl(
      notification.studentName,
      hijriAbsentDate,
      notification.phoneNumber,
      schoolName,
      message
    );

    if (!whatsapp.isValid || !whatsapp.url) {
      toast.show('تعذر إنشاء رابط واتساب لهذا الرقم.', 'danger');
      return;
    }

    if (messageOverride !== undefined) {
      saveCustomMessage(notification.id, message);
      setPreviewNotification(null);
    }

    // Register the send attempt immediately. WhatsApp delivery is not checked.
    markNotificationAsSent(notification);

    // Keep window.open in the click handler to avoid browser popup blockers.
    const whatsappWindow = window.open(whatsapp.url, '_blank');

    if (whatsappWindow) {
      whatsappWindow.opener = null;
    } else {
      toast.show(
        'تم تسجيل الإشعار كمرسل، لكن تعذر فتح واتساب. تحقق من إعدادات النوافذ المنبثقة.',
        'warning'
      );
    }
  };

  const toggleNotificationStatus = (notification: ParentNotification): void => {
    if (updateStatusMutation.isPending) return;

    updateStatusMutation.mutate({
      id: notification.id,
      isSent: !notification.isSent,
      date: effectiveDate,
      source: 'manual',
    });
  };

  const refreshData = async (): Promise<void> => {
    if (
      !effectiveDate ||
      !isValidDate ||
      isFetchingNotifications ||
      isFetchingAbsentees ||
      generateMutation.isPending
    ) {
      return;
    }

    autoGenerationAttempts.current.delete(effectiveDate);
    queryClient.removeQueries({
      queryKey: [QUERY_KEYS.autoGeneration, effectiveDate],
      exact: true,
    });

    await Promise.all([refetchNotifications(), refetchAbsentees()]);
  };

  const saveGlobalTemplate = (): void => {
    if (!draftTemplate.trim()) {
      toast.show('لا يمكن حفظ قالب فارغ.', 'danger');
      return;
    }

    setGlobalTemplate(draftTemplate);
    saveTemplate(draftTemplate);
    setIsTemplateModalOpen(false);
    toast.show('تم حفظ قالب الرسائل.', 'success');
  };

  const resetGlobalTemplate = (): void => {
    setDraftTemplate(DEFAULT_ABSENCE_TEMPLATE);
    setGlobalTemplate(DEFAULT_ABSENCE_TEMPLATE);

    try {
      localStorage.removeItem(STORAGE_KEYS.template);
    } catch (error) {
      console.error('Failed to reset notification template:', error);
    }

    toast.show('تم استعادة القالب الافتراضي.', 'info');
  };

  // ---------------------------------------------------------------------------
  // Filtering and pagination
  // ---------------------------------------------------------------------------

  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.classId === selectedClassId),
    [classes, selectedClassId]
  );

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((notification) => {
        if (statusFilter === 'sent' && !notification.isSent) return false;
        if (statusFilter === 'pending' && notification.isSent) return false;

        if (selectedClass) {
          const selectedClassNumber = getClassNumber(selectedClass);
          const notificationClassMatch = String(notification.className || '').match(/\d+/);
          const notificationClassNumber = notificationClassMatch
            ? Number(notificationClassMatch[0])
            : null;

          if (
            selectedClassNumber !== null &&
            notificationClassNumber !== null &&
            selectedClassNumber !== notificationClassNumber
          ) {
            return false;
          }

          if (
            (selectedClassNumber === null || notificationClassNumber === null) &&
            notification.className !== selectedClass.className
          ) {
            return false;
          }
        }

        return matchesSearch(notification, searchQuery.trim());
      })
      .sort((first, second) => Number(first.isSent) - Number(second.isSent));
  }, [notifications, statusFilter, selectedClass, searchQuery]);

  const totalCount = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
  }, [pageNumber, totalPages]);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (pageNumber - 1) * pageSize;
    return filteredNotifications.slice(startIndex, startIndex + pageSize);
  }, [filteredNotifications, pageNumber, pageSize]);

  const resetFilters = (): void => {
    setStatusFilter('all');
    setSelectedClassId(0);
    setSearchQuery('');
    setPageNumber(1);
  };

  // ---------------------------------------------------------------------------
  // Loading and error states
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main dir="rtl" className="min-w-0 space-y-4 pb-8 text-[#20362B] dark:text-[#EAF3ED]">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#142B22] dark:text-[#F0F7F3]">
            إشعارات أولياء الأمور
          </h1>
          <p className="mt-0.5 text-xs text-[#647C70] dark:text-[#9DB5A8]">
            {effectiveDate
              ? `${dayName}، ${formattedHijriDate}`
              : 'اختر الأسبوع واليوم لعرض الغياب'}
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
            onClick={() => void refreshData()}
            disabled={!isValidDate || isRefreshing || generateMutation.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE7E2] bg-white px-3 text-xs font-bold text-[#294337] transition hover:bg-[#F3F7F4] disabled:opacity-40 dark:border-[#293E35] dark:bg-[#17251F] dark:text-[#E2F0E7] dark:hover:bg-[#1F332A]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </header>

      {/* Week, day and progress */}
      <section className="rounded-2xl border border-[#DCE7E2] bg-white p-3.5 shadow-xs dark:border-[#293E35] dark:bg-[#17251F] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
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
                const isSelected = selectedDayNumber === day.dayNumber;

                return (
                  <button
                    key={day.dayNumber}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedDayNumber(day.dayNumber);
                      setPageNumber(1);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      isSelected
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

          {isValidDate && !isLoadingDateData && totalNotifications > 0 && (
            <div className="flex items-center gap-3 border-t border-[#EDF2EF] pt-3 dark:border-[#263B31] lg:border-t-0 lg:pt-0">
              <div className="min-w-[130px] flex-1 lg:w-40">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#587268] dark:text-[#9DB5A8]">
                    تم تسجيل {sentCount} من {totalNotifications} كمرسل
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

        {effectiveDate > today && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF4E2] px-3 py-2 text-xs font-semibold text-[#98651E] dark:bg-[#3A2D19] dark:text-[#F1C16F]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            التاريخ المحدد مستقبلي — اختر اليوم أو يوماً سابقاً.
          </div>
        )}

        {isValidDate && generateMutation.isPending && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
            جاري تجهيز إشعارات أولياء الأمور لهذا اليوم...
          </div>
        )}

        {isValidDate &&
          !isLoadingDateData &&
          !generateMutation.isPending &&
          missingNotificationsCount > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF4E2] px-3 py-2 text-xs font-semibold text-[#98651E] dark:bg-[#3A2D19] dark:text-[#F1C16F]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              يوجد {missingNotificationsCount} طالب غائب لم يُنشأ له إشعار، غالباً لعدم اكتمال بيانات ولي الأمر.
            </div>
          )}
      </section>

      {/* Notification workspace */}
      <section className="overflow-hidden rounded-2xl border border-[#DCE7E2] bg-white shadow-xs dark:border-[#293E35] dark:bg-[#17251F]">
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-[#E9EFEC] p-3.5 dark:border-[#263B31] sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-grid grid-cols-3 gap-1 rounded-xl bg-[#F2F6F4] p-1 dark:bg-[#111D18]">
            {(
              [
                { value: 'pending', label: 'بانتظار الإرسال', count: pendingCount },
                { value: 'sent', label: 'مرسل', count: sentCount },
                { value: 'all', label: 'الكل', count: totalNotifications },
              ] as const
            ).map((tab) => {
              const isSelected = statusFilter === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPageNumber(1);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    isSelected
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

          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:max-w-lg">
            <div className="relative sm:w-44">
              <Building2 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71837A]" />
              <select
                aria-label="تصفية حسب الشعبة"
                value={selectedClassId}
                onChange={(event) => {
                  setSelectedClassId(Number(event.target.value));
                  setPageNumber(1);
                }}
                className="h-9 w-full appearance-none rounded-xl border border-[#DCE7E2] bg-[#FAFCFA] py-1.5 pl-3 pr-8 text-xs font-semibold text-[#1E3429] outline-none focus:border-[#176B4B] dark:border-[#2C4539] dark:bg-[#13201A] dark:text-[#EAF3ED]"
              >
                <option value={0}>جميع الشعب</option>
                {classes.map((classItem) => (
                  <option key={classItem.classId} value={classItem.classId}>
                    {getClassLabel(classItem)}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71837A]" />
              <input
                type="search"
                aria-label="بحث عن طالب أو ولي أمر"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
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

        {/* Content states */}
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
                onClick={() => void refreshData()}
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
                ? 'اضغط تحديث إذا لم تظهر الإشعارات خلال لحظات.'
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
            {/* Mobile cards */}
            <div className="divide-y divide-[#EDF2EF] dark:divide-[#263B31] md:hidden">
              {paginatedNotifications.map((notification) => {
                const validPhone = isValidSaudiPhone(notification.phoneNumber);
                const isUpdatingThisNotification =
                  updateStatusMutation.isPending &&
                  updateStatusMutation.variables?.id === notification.id;

                return (
                  <article key={notification.id} className="space-y-3 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-extrabold text-[#1E3429] dark:text-[#F0F7F3]">
                            {notification.studentName}
                          </h3>
                          {customMessages[notification.id] !== undefined && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                              title="رسالة مخصصة"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#647C70] dark:text-[#9DB5A8]">
                          {notification.className || 'غير محدد'} · {notification.parentName}
                        </p>
                      </div>
                      <StatusBadge isSent={notification.isSent} />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className="font-mono font-semibold text-[#31463A] dark:text-[#D8E8DE]"
                        dir="ltr"
                      >
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
                        disabled={!validPhone || isUpdatingThisNotification}
                        onClick={() => sendWhatsAppNotification(notification)}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1FA855] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#168B45] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-[#24362E] dark:disabled:text-[#6B8276]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        إرسال واتساب
                        <ExternalLink className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        disabled={isUpdatingThisNotification}
                        onClick={() => toggleNotificationStatus(notification)}
                        className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                          notification.isSent
                            ? 'border-[#BDE7CE] bg-[#EDF8F2] text-[#176B4B] dark:border-[#28573D] dark:bg-[#1B3628] dark:text-[#6DD39A]'
                            : 'border-[#DCE7E2] bg-white text-[#294337] hover:bg-[#F3F7F4] dark:border-[#2C4539] dark:bg-[#1B2E26] dark:text-[#E2F0E7]'
                        }`}
                      >
                        {isUpdatingThisNotification ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-3.5 w-3.5" />
                        )}
                        {notification.isSent ? 'إلغاء التوثيق' : 'توثيق يدوياً'}
                      </button>

                      <button
                        type="button"
                        onClick={() => openMessageEditor(notification)}
                        aria-label="تعديل الرسالة"
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DCE7E2] px-3 text-[#587268] hover:bg-[#F3F7F4] dark:border-[#2C4539] dark:text-[#9DB5A8] dark:hover:bg-[#1F332A]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop table */}
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
                    const isUpdatingThisNotification =
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
                            <span
                              className="font-mono text-[11px] text-[#465E53] dark:text-[#B8CEC2]"
                              dir="ltr"
                            >
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
                              disabled={!validPhone || isUpdatingThisNotification}
                              onClick={() => sendWhatsAppNotification(notification)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1FA855] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#168B45] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-[#24362E] dark:disabled:text-[#6B8276]"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              إرسال واتساب
                            </button>

                            <button
                              type="button"
                              disabled={isUpdatingThisNotification}
                              onClick={() => toggleNotificationStatus(notification)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
                                notification.isSent
                                  ? 'border-[#BDE7CE] bg-[#EDF8F2] text-[#176B4B] hover:bg-[#D9F1E3] dark:border-[#28573D] dark:bg-[#1B3628] dark:text-[#6DD39A]'
                                  : 'border-[#DCE7E2] bg-white text-[#294337] hover:bg-[#F3F7F4] dark:border-[#2C4539] dark:bg-[#1B2E26] dark:text-[#E2F0E7]'
                              }`}
                            >
                              {isUpdatingThisNotification ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCheck className="h-3.5 w-3.5" />
                              )}
                              {notification.isSent ? 'إلغاء التوثيق' : 'توثيق يدوياً'}
                            </button>

                            <button
                              type="button"
                              onClick={() => openMessageEditor(notification)}
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
                onPageSizeChange={(newPageSize) => {
                  setPageSize(newPageSize);
                  setPageNumber(1);
                }}
                isLoading={isLoadingDateData}
                itemLabel="إشعار"
              />
            </div>
          </>
        )}
      </section>

      {/* Individual message editor */}
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
              <span
                className="font-mono font-semibold text-[#587268] dark:text-[#9DB5A8]"
                dir="ltr"
              >
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
                      onClick={() =>
                        setEditedMessageText((current) => `${current}${snippet.text}`)
                      }
                      className="rounded-lg border border-[#DCE7E2] bg-[#FAFCFA] px-2 py-1 text-[11px] font-semibold text-[#294337] hover:bg-[#EFF5F1] dark:border-[#2C4539] dark:bg-[#1B2E26] dark:text-[#D8E8DE]"
                    >
                      {snippet.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={editedMessageText}
                onChange={(event) => setEditedMessageText(event.target.value)}
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

            <p className="text-[11px] leading-5 text-[#71837A] dark:text-[#9DB5A8]">
              سيتم تحويل أي تاريخ ميلادي بصيغة YYYY-MM-DD في نص الرسالة إلى التاريخ الهجري عند فتح واتساب.
            </p>
          </div>

          <DialogFooter className="mt-5 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => resetCustomMessage(previewNotification)}
            >
              استعادة الافتراضي
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Save className="h-3.5 w-3.5" />}
              onClick={() => {
                saveCustomMessage(
                  previewNotification.id,
                  convertGregorianDatesToHijri(editedMessageText)
                );
                setEditedMessageText(convertGregorianDatesToHijri(editedMessageText));
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
              disabled={
                !isValidSaudiPhone(previewNotification.phoneNumber) ||
                (updateStatusMutation.isPending &&
                  updateStatusMutation.variables?.id === previewNotification.id)
              }
              onClick={() =>
                sendWhatsAppNotification(previewNotification, editedMessageText)
              }
              className="bg-[#1FA855] text-white hover:bg-[#168B45]"
            >
              إرسال عبر واتساب
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Global template editor */}
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
                    onClick={() => setDraftTemplate((current) => `${current}${tag}`)}
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
                onChange={(event) => setDraftTemplate(event.target.value)}
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
                  {convertGregorianDatesToHijri(
                    renderNotificationMessage(draftTemplate, {
                      studentName: 'سلطان عبد العزيز الخالدي',
                      parentName: 'عبد العزيز الخالدي',
                      absentDate: effectiveDate ? formatHijriDate(effectiveDate) : '',
                      schoolName: schoolName || 'اسم المدرسة',
                    })
                  )}
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
              onClick={resetGlobalTemplate}
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
              onClick={saveGlobalTemplate}
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
