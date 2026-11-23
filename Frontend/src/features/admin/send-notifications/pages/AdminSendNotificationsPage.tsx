
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
  Sparkles,
  Users,
  X,
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
// Configuration
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

// =============================================================================
// Utilities
// =============================================================================

function getInitialDay(): number {
  const today = getRiyadhDateOnly();
  const weekday = new Date(`${today}T12:00:00`).getDay();

  return weekday >= 0 && weekday <= 4
    ? weekday + 1
    : 1;
}

function readStoredTemplate(): string {
  try {
    return (
      localStorage.getItem(TEMPLATE_STORAGE_KEY) ||
      DEFAULT_ABSENCE_TEMPLATE
    );
  } catch {
    return DEFAULT_ABSENCE_TEMPLATE;
  }
}

function readStoredCustomMessages(): Record<number, string> {
  try {
    const saved = localStorage.getItem(
      CUSTOM_MESSAGES_STORAGE_KEY,
    );

    if (!saved) return {};

    const parsed: unknown = JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed as Record<number, string>;
  } catch {
    return {};
  }
}

function persistCustomMessages(
  messages: Record<number, string>,
): void {
  try {
    localStorage.setItem(
      CUSTOM_MESSAGES_STORAGE_KEY,
      JSON.stringify(messages),
    );
  } catch (error) {
    console.error('Failed to save custom messages:', error);
  }
}

function persistTemplate(template: string): void {
  try {
    localStorage.setItem(
      TEMPLATE_STORAGE_KEY,
      template,
    );
  } catch (error) {
    console.error('Failed to save template:', error);
  }
}

function getClassNumber(item: any): number | null {
  const raw = String(
    item?.classNumber ??
    item?.className ??
    '',
  );

  const match = raw.match(/\d+/);

  return match ? Number(match[0]) : null;
}

function getClassLabel(item: any): string {
  if (!item) return 'غير محدد';

  const number = getClassNumber(item);

  return number
    ? `شعبة ${number}`
    : item.className || `الشعبة ${item.classId}`;
}

function matchesSearch(
  notification: ParentNotification,
  search: string,
): boolean {
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
    String(value ?? '')
      .toLocaleLowerCase('ar')
      .includes(normalized),
  );
}

// =============================================================================
// Reusable Components
// =============================================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  color: 'rose' | 'emerald' | 'amber';
}) {
  const colors = {
    rose: {
      icon: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
      value: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-100 dark:border-rose-950/70',
    },
    emerald: {
      icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      value: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-950/70',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      value: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-950/70',
    },
  };

  const style = colors[color];

  return (
    <div className={`rounded-xl border bg-white p-3.5 shadow-sm dark:bg-slate-900 sm:p-4 ${style.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className={`mt-2 text-2xl font-black tabular-nums sm:text-3xl ${style.value}`}>
            {value}
          </p>

          <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ isSent }: { isSent: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
        isSent
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
      }`}
    >
      {isSent ? (
        <Check className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}

      {isSent ? 'تم التوثيق' : 'بانتظار الإرسال'}
    </span>
  );
}

function EmptyState({
  title,
  description,
  icon: Icon = BellRing,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-6 w-6" />
      </span>

      <h3 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
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

  // ===========================================================================
  // 1. State
  // ===========================================================================

  const [selectedDayNumber, setSelectedDayNumber] =
    useState(getInitialDay);

  const [selectedWeekId, setSelectedWeekId] =
    useState(0);

  const [selectedClassId, setSelectedClassId] =
    useState(0);

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('pending');

  const [searchQuery, setSearchQuery] =
    useState('');

  const [pageNumber, setPageNumber] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(DEFAULT_PAGE_SIZE);


  // Message editor

  const [previewNotification, setPreviewNotification] =
    useState<ParentNotification | null>(null);

  const [editedMessageText, setEditedMessageText] =
    useState('');


  // Templates

  const [globalTemplate, setGlobalTemplate] =
    useState(readStoredTemplate);

  const [draftTemplate, setDraftTemplate] =
    useState(globalTemplate);

  const [isTemplateModalOpen, setIsTemplateModalOpen] =
    useState(false);

  const [customMessages, setCustomMessages] =
    useState<Record<number, string>>(
      readStoredCustomMessages,
    );


  // Prevent repeated generation in the same page session.

  const autoGenerationAttempts = useRef<Set<string>>(
    new Set(),
  );


  // ===========================================================================
  // 2. Reference Queries
  // ===========================================================================

  const {
    data: classes = [],
    isLoading: isLoadingClasses,
    isError: isClassesError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: CLASSES_QUERY_KEY,
    queryFn: () => schoolDataService.getClasses(),
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
    queryFn: () => schoolDataService.getAttendanceWeeks(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });


  // ===========================================================================
  // 3. Week and Date
  // ===========================================================================

  const defaultWeek = useMemo(
    () =>
      resolveDefaultAttendanceWeek(weeks) ||
      weeks[0],
    [weeks],
  );


  const activeWeek = useMemo(
    () =>
      weeks.find(
        (week) =>
          week.attendanceWeekId === selectedWeekId,
      ) || defaultWeek,
    [weeks, selectedWeekId, defaultWeek],
  );


  useEffect(() => {
    if (!defaultWeek) return;

    const exists = weeks.some(
      (week) =>
        week.attendanceWeekId === selectedWeekId,
    );

    if (!exists) {
      setSelectedWeekId(
        defaultWeek.attendanceWeekId,
      );
    }
  }, [
    weeks,
    selectedWeekId,
    defaultWeek,
  ]);


  const effectiveDate = useMemo(
    () =>
      activeWeek?.startDate
        ? calculateDateForDay(
            activeWeek.startDate,
            selectedDayNumber,
          )
        : '',
    [activeWeek, selectedDayNumber],
  );


  const today = getRiyadhDateOnly();

  const dayName = getArabicDayName(
    selectedDayNumber,
  );

  const formattedDate = effectiveDate
    ? formatArabicDate(effectiveDate)
    : 'لا يوجد تاريخ محدد';


  const weekday = effectiveDate
    ? new Date(`${effectiveDate}T12:00:00`).getDay()
    : -1;


  const isValidDate =
    Boolean(effectiveDate) &&
    weekday >= 0 &&
    weekday <= 4 &&
    effectiveDate <= today;


  // ===========================================================================
  // 4. Notification Queries
  // ===========================================================================

  const notificationQueryKey = [
    NOTIFICATIONS_QUERY_KEY,
    effectiveDate,
  ] as const;

  const absenteesQueryKey = [
    ABSENTEES_QUERY_KEY,
    effectiveDate,
  ] as const;


  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    isFetching: isFetchingNotifications,
    isError: isNotificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: notificationQueryKey,

    queryFn: () =>
      schoolDataService.getParentNotifications({
        date: effectiveDate,
      }),

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
    queryKey: absenteesQueryKey,

    queryFn: () =>
      schoolDataService.getPagedAbsentees({
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


  // ===========================================================================
  // 5. Derived Statistics
  // ===========================================================================

  const totalAbsentOnDate =
    absenteesPaged?.totalCount ??
    notifications.length;

  const totalNotifications =
    notifications.length;

  const sentCount = useMemo(
    () =>
      notifications.filter(
        (item) => item.isSent,
      ).length,
    [notifications],
  );

  const pendingCount =
    totalNotifications - sentCount;

  const missingNotificationsCount = Math.max(
    totalAbsentOnDate - totalNotifications,
    0,
  );





  // ===========================================================================
  // 6. Generate Mutation
  // ===========================================================================

  const generateMutation = useMutation({
    mutationFn: (targetDate: string) =>
      schoolDataService.generateParentNotifications(
        targetDate,
      ),

    onSuccess: (result, targetDate) => {
      void queryClient.invalidateQueries({
        queryKey: [
          NOTIFICATIONS_QUERY_KEY,
          targetDate,
        ],
      });

      void queryClient.invalidateQueries({
        queryKey: [
          ABSENTEES_QUERY_KEY,
          targetDate,
        ],
      });

      if (result.generatedCount > 0) {
        toast.show(
          `تم تجهيز ${result.generatedCount} إشعار. تم تجاوز ${result.skippedCount} حالة.`,
          'success',
        );
      } else if (result.alreadyExistingCount > 0) {
        toast.show(
          `الإشعارات مسجلة مسبقاً (${result.alreadyExistingCount}).`,
          'info',
        );
      } else if (result.totalAbsent === 0) {
        toast.show(
          'لا توجد حالات غياب لهذا التاريخ.',
          'info',
        );
      } else {
        toast.show(
          `اكتمل الفحص، ولم تُنشأ إشعارات جديدة. تم تجاوز ${result.skippedCount} حالة.`,
          'warning',
        );
      }
    },

    onError: (error: any) => {
      console.error(
        'Automatic notification generation failed:',
        error,
      );

      toast.show(
        error?.message ||
          'تعذر تجهيز إشعارات أولياء الأمور.',
        'danger',
      );
    },
  });


  // ===========================================================================
  // 7. Automatic Generation
  // ===========================================================================

  useEffect(() => {
    if (!effectiveDate || !isValidDate) return;

    // Wait for both requests to complete.
    if (
      isLoadingNotifications ||
      isLoadingAbsentees ||
      isFetchingNotifications ||
      isFetchingAbsentees
    ) {
      return;
    }

    // Never generate if reading failed.
    if (
      isNotificationsError ||
      isAbsenteesError
    ) {
      return;
    }

    // Prevent concurrent mutations.
    if (generateMutation.isPending) return;

    const expectedCount =
      absenteesPaged?.totalCount ??
      notifications.length;

    // No absences or all expected notifications exist.
    if (
      expectedCount <= 0 ||
      notifications.length >= expectedCount
    ) {
      return;
    }

    const generationKey = [
      AUTO_GENERATION_QUERY_KEY,
      effectiveDate,
    ] as const;


    // Prevent repeated requests during remounts.
    if (
      autoGenerationAttempts.current.has(
        effectiveDate,
      )
    ) {
      return;
    }

    // Prevent repeated attempts from cached state.
    if (
      queryClient.getQueryData(generationKey)
    ) {
      return;
    }


    // Mark the date before sending the mutation.
    autoGenerationAttempts.current.add(
      effectiveDate,
    );

    queryClient.setQueryData(
      generationKey,
      {
        attempted: true,
        date: effectiveDate,
        attemptedAt: Date.now(),
      },
    );


    console.info(
      `[Notifications] Automatic generation started: ${effectiveDate}`,
    );

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


  // ===========================================================================
  // 8. Status Mutation
  // ===========================================================================

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      isSent,
    }: NotificationStatusVariables) =>
      schoolDataService.updateNotificationStatus(
        id,
        isSent,
      ),

    onMutate: async (variables) => {
      const key = [
        NOTIFICATIONS_QUERY_KEY,
        variables.date,
      ] as const;

      await queryClient.cancelQueries({
        queryKey: key,
      });

      const previous =
        queryClient.getQueryData<ParentNotification[]>(
          key,
        );

      queryClient.setQueryData<ParentNotification[]>(
        key,
        (old) =>
          old?.map((item) =>
            item.id === variables.id
              ? {
                  ...item,
                  isSent: variables.isSent,
                }
              : item,
          ) ?? [],
      );

      return {
        key,
        previous,
      };
    },

    onSuccess: () => {
      toast.show(
        'تم تحديث حالة الإرسال.',
        'success',
      );
    },

    onError: (
      error: any,
      _variables,
      context,
    ) => {
      if (context?.previous) {
        queryClient.setQueryData(
          context.key,
          context.previous,
        );
      }

      toast.show(
        error?.message ||
          'فشل حفظ حالة الإرسال.',
        'danger',
      );
    },

    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [
          NOTIFICATIONS_QUERY_KEY,
          variables.date,
        ],
      });
    },
  });


  // ===========================================================================
  // 9. Refresh
  // ===========================================================================

  const handleRefresh = async () => {
    if (!effectiveDate || !isValidDate) return;

    if (
      isFetchingNotifications ||
      isFetchingAbsentees ||
      generateMutation.isPending
    ) {
      return;
    }

    // Allow automatic retry following a deliberate refresh.
    autoGenerationAttempts.current.delete(
      effectiveDate,
    );

    queryClient.removeQueries({
      queryKey: [
        AUTO_GENERATION_QUERY_KEY,
        effectiveDate,
      ],
      exact: true,
    });

    await Promise.all([
      refetchNotifications(),
      refetchAbsentees(),
    ]);
  };


  // ===========================================================================
  // 10. Navigation
  // ===========================================================================

  const handleWeekChange = (weekId: number) => {
    setSelectedWeekId(weekId);
    setPageNumber(1);
  };


  const handleDayChange = (dayNumber: number) => {
    setSelectedDayNumber(dayNumber);
    setPageNumber(1);
  };


  // ===========================================================================
  // 11. Message Helpers
  // ===========================================================================

  const getNotificationMessage = (
    notification: ParentNotification,
  ): string => {
    if (
      customMessages[notification.id] !== undefined
    ) {
      return customMessages[notification.id];
    }

    return buildAbsenceNotificationMessage(
      notification.studentName,
      notification.absentDate,
      schoolName,
      globalTemplate,
      notification.parentName,
    );
  };


  const handleOpenPreview = (
    notification: ParentNotification,
  ) => {
    setPreviewNotification(notification);

    setEditedMessageText(
      getNotificationMessage(notification),
    );
  };


  const handleSaveCustomMessage = (
    id: number,
    message: string,
  ) => {
    const next = {
      ...customMessages,
      [id]: message,
    };

    setCustomMessages(next);

    persistCustomMessages(next);
  };


  const handleResetCustomMessage = (
    notification: ParentNotification,
  ) => {
    const defaultMessage =
      buildAbsenceNotificationMessage(
        notification.studentName,
        notification.absentDate,
        schoolName,
        globalTemplate,
        notification.parentName,
      );

    setEditedMessageText(defaultMessage);

    const next = {
      ...customMessages,
    };

    delete next[notification.id];

    setCustomMessages(next);

    persistCustomMessages(next);

    toast.show(
      'تم استعادة الرسالة الافتراضية.',
      'info',
    );
  };


  // ===========================================================================
  // 12. Template Management
  // ===========================================================================

  const handleSaveGlobalTemplate = () => {
    if (!draftTemplate.trim()) {
      toast.show(
        'لا يمكن حفظ قالب فارغ.',
        'danger',
      );

      return;
    }

    setGlobalTemplate(draftTemplate);

    persistTemplate(draftTemplate);

    setIsTemplateModalOpen(false);

    toast.show(
      'تم حفظ قالب الرسائل.',
      'success',
    );
  };


  const handleResetGlobalTemplate = () => {
    setDraftTemplate(DEFAULT_ABSENCE_TEMPLATE);

    setGlobalTemplate(DEFAULT_ABSENCE_TEMPLATE);

    try {
      localStorage.removeItem(
        TEMPLATE_STORAGE_KEY,
      );
    } catch (error) {
      console.error(error);
    }

    toast.show(
      'تم استعادة القالب الافتراضي.',
      'info',
    );
  };


  // ===========================================================================
  // 13. WhatsApp
  // ===========================================================================

  const handleOpenWhatsApp = (
    notification: ParentNotification,
    messageOverride?: string,
  ) => {
    const message =
      messageOverride ??
      getNotificationMessage(notification);

    const whatsapp = createWhatsAppAbsenceUrl(
      notification.studentName,
      notification.absentDate,
      notification.phoneNumber,
      schoolName,
      message,
    );

    if (!whatsapp.isValid || !whatsapp.url) {
      toast.show(
        `رقم الهاتف ${notification.phoneNumber} غير صالح لواتساب.`,
        'danger',
      );

      return;
    }

    if (messageOverride !== undefined) {
      handleSaveCustomMessage(
        notification.id,
        messageOverride,
      );
    }

    const whatsappWindow = window.open(
      whatsapp.url,
      '_blank',
    );

    if (!whatsappWindow) {
      toast.show(
        'تعذر فتح واتساب. تحقق من إعدادات النوافذ المنبثقة.',
        'warning',
      );

      return;
    }

    whatsappWindow.opener = null;

    setPreviewNotification(null);

    toast.show(
      'تم فتح محادثة واتساب. أرسل الرسالة ثم وثّق الإرسال.',
      'info',
    );
  };


  // ===========================================================================
  // 14. Update Status
  // ===========================================================================

  const handleToggleSentStatus = (
    notification: ParentNotification,
  ) => {
    if (updateStatusMutation.isPending) return;

    updateStatusMutation.mutate({
      id: notification.id,
      isSent: !notification.isSent,
      date: effectiveDate,
    });
  };


  // ===========================================================================
  // 15. Filters and Pagination
  // ===========================================================================

  const selectedClass = useMemo(
    () =>
      classes.find(
        (item) =>
          item.classId === selectedClassId,
      ),
    [classes, selectedClassId],
  );


  const filteredNotifications = useMemo(() => {
    let result = notifications.filter((item) => {
      if (
        statusFilter === 'sent' &&
        !item.isSent
      ) {
        return false;
      }

      if (
        statusFilter === 'pending' &&
        item.isSent
      ) {
        return false;
      }


      if (selectedClass) {
        const selectedNumber =
          getClassNumber(selectedClass);

        const notificationNumber =
          String(item.className || '').match(/\d+/);

        const actualNumber = notificationNumber
          ? Number(notificationNumber[0])
          : null;

        if (
          selectedNumber !== null &&
          actualNumber !== null &&
          selectedNumber !== actualNumber
        ) {
          return false;
        }

        if (
          (selectedNumber === null ||
            actualNumber === null) &&
          item.className !== selectedClass.className
        ) {
          return false;
        }
      }


      if (!matchesSearch(item, searchQuery.trim())) {
        return false;
      }

      return true;
    });


    // Pending messages are shown first.
    result = result.sort(
      (a, b) =>
        Number(a.isSent) - Number(b.isSent),
    );

    return result;

  }, [
    notifications,
    statusFilter,
    selectedClass,
    searchQuery,
  ]);


  const totalCount =
    filteredNotifications.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / pageSize),
  );


  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
  }, [pageNumber, totalPages]);


  const paginatedNotifications = useMemo(() => {
    const start =
      (pageNumber - 1) * pageSize;

    return filteredNotifications.slice(
      start,
      start + pageSize,
    );
  }, [
    filteredNotifications,
    pageNumber,
    pageSize,
  ]);


  const resetFilters = () => {
    setStatusFilter('pending');
    setSelectedClassId(0);
    setSearchQuery('');
    setPageNumber(1);
  };


  // ===========================================================================
  // 16. Loading States
  // ===========================================================================

  const isBaseLoading =
    isLoadingClasses ||
    isLoadingWeeks;

  const isBaseError =
    isClassesError ||
    isWeeksError;

  const isLoadingDateData =
    isLoadingNotifications ||
    isLoadingAbsentees;

  const isDateError =
    isNotificationsError ||
    isAbsenteesError;

  const isRefreshing =
    isFetchingNotifications ||
    isFetchingAbsentees;


  // ===========================================================================
  // 17. Message Variables
  // ===========================================================================

  const templateVariables = [
    { tag: '{اسم_الطالب}', label: 'اسم الطالب' },
    { tag: '{تاريخ_الغياب}', label: 'تاريخ الغياب' },
    { tag: '{اسم_ولي_الأمر}', label: 'اسم ولي الأمر' },
    { tag: '{اسم_المدرسة}', label: 'اسم المدرسة' },
    { tag: '{تحية_المدرسة}', label: 'تحية المدرسة' },
  ];


  // ===========================================================================
  // Base Loading
  // ===========================================================================

  if (isBaseLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <MuwathibLoading
          message="جاري تحميل الصفحة..."
          submessage="يتم تجهيز الأسابيع والشعب الدراسية."
        />
      </div>
    );
  }


  if (isBaseError) {
    return (
      <main dir="rtl" className="p-5">
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-7 text-center dark:border-rose-950 dark:bg-slate-900">

          <AlertCircle className="mx-auto h-9 w-9 text-rose-600 dark:text-rose-400" />

          <h2 className="mt-3 text-base font-extrabold">
            تعذر تحميل البيانات الأساسية
          </h2>

          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            تعذر الاتصال بالخادم لتحميل الشعب أو الأسابيع الدراسية.
          </p>

          <button
            type="button"
            onClick={() => {
              void Promise.all([
                refetchClasses(),
                refetchWeeks(),
              ]);
            }}
            className="mt-5 h-10 rounded-xl bg-emerald-700 px-5 text-xs font-bold text-white hover:bg-emerald-800"
          >
            إعادة المحاولة
          </button>

        </div>
      </main>
    );
  }


  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <main
      dir="rtl"
      className="min-w-0 space-y-5 pb-10 text-slate-800 dark:text-slate-100"
    >

      {/* ================================================================= */}
      {/* Header */}
      {/* ================================================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white dark:bg-emerald-600">
              <BellRing className="h-5 w-5" />
            </span>

            <div className="min-w-0">

              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
                إشعارات أولياء الأمور
              </h1>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                تجهيز ومتابعة إشعارات الغياب عبر واتساب.
              </p>

            </div>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <button
              type="button"
              onClick={() => {
                setDraftTemplate(globalTemplate);
                setIsTemplateModalOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FileText className="h-4 w-4" />
              قالب الرسائل
            </button>


            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={
                !isValidDate ||
                isRefreshing ||
                generateMutation.isPending
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              تحديث
            </button>

          </div>

        </div>

      </section>


      {/* ================================================================= */}
      {/* Week and Day */}
      {/* ================================================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">

          <div>

            <div className="flex items-center gap-2">

              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                1
              </span>

              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                حدد يوم الغياب
              </h2>

            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              اختر الأسبوع ثم اليوم المطلوب.
            </p>

          </div>


          {effectiveDate && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">

              <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                التاريخ المحدد
              </p>

              <p className="mt-0.5 text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                {dayName}، {formattedDate}
              </p>

            </div>
          )}

        </div>


        {/* Week */}

        <div className="mb-4 max-w-md">

          <label
            htmlFor="notification-week"
            className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            الأسبوع الدراسي
          </label>

          <div className="relative">

            <CalendarRange className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              id="notification-week"
              value={activeWeek?.attendanceWeekId ?? 0}
              onChange={(event) =>
                handleWeekChange(Number(event.target.value))
              }
              disabled={weeks.length === 0}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >

              {weeks.map((week) => (
                <option
                  key={week.attendanceWeekId}
                  value={week.attendanceWeekId}
                >
                  الأسبوع {week.weekNumber}
                  {' — '}
                  {formatArabicDate(week.startDate)}
                  {' إلى '}
                  {formatArabicDate(week.endDate)}
                </option>
              ))}

            </select>

          </div>

        </div>


        {/* Days */}

        <div className="grid grid-cols-5 gap-2">

          {SCHOOL_DAYS.map((day) => {
            const selected =
              selectedDayNumber === day.dayNumber;

            return (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() =>
                  handleDayChange(day.dayNumber)
                }
                aria-pressed={selected}
                className={`flex min-h-[66px] flex-col items-center justify-center gap-2 rounded-xl border transition focus:outline-none focus:ring-4 focus:ring-emerald-600/10 ${
                  selected
                    ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30'
                }`}
              >

                <span className="text-xs font-bold sm:text-sm">
                  {getArabicDayName(day.dayNumber)}
                </span>

                {selected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="h-4" />
                )}

              </button>
            );
          })}

        </div>


        {/* Date Validation */}

        {!activeWeek ? (

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">

            <AlertCircle className="h-4 w-4 shrink-0" />

            لا توجد أسابيع دراسية متاحة.

          </div>

        ) : effectiveDate > today ? (

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">

            <AlertCircle className="h-4 w-4 shrink-0" />

            التاريخ المحدد مستقبلي.

          </div>

        ) : isValidDate ? (

          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">

            <Check className="h-4 w-4" />

            التاريخ صالح ويمكن تجهيز الإشعارات.

          </div>

        ) : null}

      </section>


      {/* ================================================================= */}
      {/* Automatic Generation Status */}
      {/* ================================================================= */}

      {isValidDate && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-start gap-3">

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">

              {isLoadingDateData ||
              generateMutation.isPending ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : generateMutation.isError ? (
                <AlertCircle className="h-5 w-5 text-rose-500" />
              ) : (
                <BellRing className="h-5 w-5" />
              )}

            </span>


            <div className="min-w-0 flex-1">

              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">

                {isDateError
                  ? 'تعذر فحص بيانات الغياب'
                  : isLoadingDateData
                    ? 'جاري فحص سجلات الغياب'
                    : generateMutation.isPending
                      ? 'جاري تجهيز إشعارات أولياء الأمور'
                      : generateMutation.isError
                        ? 'تعذر تجهيز الإشعارات'
                        : totalAbsentOnDate === 0
                          ? 'لا توجد حالات غياب'
                          : missingNotificationsCount === 0
                            ? 'الإشعارات جاهزة'
                            : 'تم تجهيز بعض الإشعارات'}

              </h3>


              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">

                {isDateError
                  ? 'تعذر قراءة البيانات من الخادم. استخدم التحديث لإعادة المحاولة.'
                  : isLoadingDateData
                    ? 'يتم تحميل الغياب والإشعارات المسجلة لهذا اليوم.'
                    : generateMutation.isPending
                      ? 'يتم إنشاء الإشعارات وربطها ببيانات أولياء الأمور.'
                      : generateMutation.isError
                        ? 'حدث خطأ أثناء إنشاء الإشعارات. استخدم التحديث لإعادة المحاولة.'
                        : totalAbsentOnDate === 0
                          ? 'لا يوجد طلاب غائبون في التاريخ المحدد.'
                          : missingNotificationsCount === 0
                            ? `تم تجهيز ${totalNotifications} إشعار لهذا اليوم.`
                            : `تم تسجيل ${totalNotifications} إشعاراً من أصل ${totalAbsentOnDate} حالة غياب. قد تكون بعض بيانات أولياء الأمور غير مكتملة.`}

              </p>


              {generateMutation.isPending && (
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  role="progressbar"
                  aria-label="تجهيز الإشعارات"
                >
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400" />
                </div>
              )}

            </div>

          </div>

        </section>
      )}


      {/* ================================================================= */}
      {/* Statistics */}
      {/* ================================================================= */}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <StatCard
          title="الطلاب الغائبون"
          value={totalAbsentOnDate}
          description="حالات الغياب المسجلة"
          icon={Users}
          color="rose"
        />

        <StatCard
          title="تم توثيق الإرسال"
          value={sentCount}
          description="رسائل أُرسلت وتم توثيقها"
          icon={CheckCheck}
          color="emerald"
        />

        <StatCard
          title="بانتظار الإرسال"
          value={pendingCount}
          description="رسائل لم يتم توثيقها"
          icon={Clock}
          color="amber"
        />

      </section>


      {/* ================================================================= */}
      {/* Notifications */}
      {/* ================================================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Heading */}

        <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                إشعارات أولياء الأمور
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                افتح واتساب لإرسال الرسالة ثم وثّق الإرسال.
              </p>

            </div>

            <div className="flex items-center gap-2">

              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {totalCount} نتيجة
              </span>

              {isRefreshing && (
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              )}

            </div>

          </div>


          {/* Filters */}

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">

            {/* Status */}

            <div className="lg:col-span-4">

              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                حالة الإشعار
              </label>

              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">

                {([
                  {
                    value: 'all',
                    label: 'الكل',
                    count: totalNotifications,
                  },
                  {
                    value: 'pending',
                    label: 'بانتظار الإرسال',
                    count: pendingCount,
                  },
                  {
                    value: 'sent',
                    label: 'موثق',
                    count: sentCount,
                  },
                ] as const).map((item) => {

                  const selected =
                    statusFilter === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(item.value);
                        setPageNumber(1);
                      }}
                      aria-pressed={selected}
                      className={`min-w-0 rounded-lg px-2 py-2 text-xs font-bold transition ${
                        selected
                          ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >

                      <span className="block truncate">
                        {item.label}
                      </span>

                      <span className="mt-0.5 block text-[10px] tabular-nums opacity-75">
                        {item.count}
                      </span>

                    </button>
                  );
                })}

              </div>

            </div>


            {/* Class */}

            <div className="lg:col-span-3">

              <label
                htmlFor="notification-class-filter"
                className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                الشعبة
              </label>

              <div className="relative">

                <Building2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  id="notification-class-filter"
                  value={selectedClassId}
                  onChange={(event) => {
                    setSelectedClassId(
                      Number(event.target.value),
                    );

                    setPageNumber(1);
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >

                  <option value={0}>
                    جميع الشعب
                  </option>

                  {classes.map((item) => (
                    <option
                      key={item.classId}
                      value={item.classId}
                    >
                      {getClassLabel(item)}
                    </option>
                  ))}

                </select>

              </div>

            </div>


            {/* Search */}

            <div className="lg:col-span-5">

              <label
                htmlFor="notification-search"
                className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                البحث
              </label>

              <div className="relative">

                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="notification-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPageNumber(1);
                  }}
                  placeholder="اسم الطالب أو رقم ولي الأمر..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />

                {searchQuery && (
                  <button
                    type="button"
                    aria-label="مسح البحث"
                    onClick={() => {
                      setSearchQuery('');
                      setPageNumber(1);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

              </div>

            </div>

          </div>

        </div>


        {/* Data states */}

        {!isValidDate ? (

          <EmptyState
            title="اختر يوماً صالحاً"
            description="اختر أسبوعاً دراسياً ثم اضغط على أحد أيام الدوام لعرض الإشعارات."
            icon={CalendarRange}
          />

        ) : isLoadingDateData ? (

          <div className="p-8">
            <MuwathibLoading
              message="جاري تحميل الإشعارات..."
              submessage="يتم استرجاع الغياب وبيانات أولياء الأمور."
            />
          </div>

        ) : isDateError ? (

          <div className="p-8 text-center">

            <AlertCircle className="mx-auto h-9 w-9 text-rose-600 dark:text-rose-400" />

            <h3 className="mt-3 text-sm font-extrabold">
              تعذر تحميل الإشعارات
            </h3>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              تحقق من اتصال الخادم ثم حاول مرة أخرى.
            </p>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>

          </div>

        ) : notifications.length === 0 ? (

          <EmptyState
            title={
              totalAbsentOnDate > 0
                ? 'يتم تجهيز الإشعارات'
                : 'لا توجد حالات غياب'
            }
            description={
              totalAbsentOnDate > 0
                ? generateMutation.isError
                  ? 'تعذر تجهيز الإشعارات. استخدم زر التحديث لإعادة المحاولة.'
                  : 'يتم تجهيز الإشعارات تلقائياً عند وجود حالات غياب.'
                : 'لا توجد سجلات غياب في اليوم المحدد.'
            }
            icon={Sparkles}
          />

        ) : filteredNotifications.length === 0 ? (

          <div className="p-8 text-center">

            <Search className="mx-auto h-8 w-8 text-slate-400" />

            <h3 className="mt-3 text-sm font-extrabold">
              لا توجد نتائج مطابقة
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              غيّر البحث أو عوامل التصفية.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-400"
            >
              إعادة ضبط الفلاتر
            </button>

          </div>

        ) : (

          <>

            {/* Mobile cards */}

            <div className="space-y-3 p-3 md:hidden">

              {paginatedNotifications.map((notification) => {

                const validPhone =
                  isValidSaudiPhone(
                    notification.phoneNumber,
                  );

                const savingThis =
                  updateStatusMutation.isPending &&
                  updateStatusMutation.variables?.id ===
                    notification.id;

                return (
                  <article
                    key={notification.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                            {notification.studentName}
                          </h3>

                          {customMessages[notification.id] !== undefined && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                              رسالة معدلة
                            </span>
                          )}

                        </div>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {notification.className || 'غير محدد'}
                        </p>

                      </div>

                      <StatusBadge isSent={notification.isSent} />

                    </div>


                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">

                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          ولي الأمر
                        </p>

                        <p className="mt-1 truncate font-semibold text-slate-800 dark:text-slate-200">
                          {notification.parentName}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          رقم الجوال
                        </p>

                        <p
                          className="mt-1 font-mono font-semibold text-slate-800 dark:text-slate-200"
                          dir="ltr"
                        >
                          {formatPhoneDisplay(notification.phoneNumber)}
                        </p>
                      </div>

                    </div>


                    {!validPhone && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        رقم الجوال غير صالح.
                      </p>
                    )}


                    <div className="mt-3 flex gap-2">

                      <button
                        type="button"
                        disabled={!validPhone}
                        onClick={() =>
                          handleOpenWhatsApp(notification)
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1fa855] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#168b45] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        واتساب
                        <ExternalLink className="h-3 w-3" />
                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          handleOpenPreview(notification)
                        }
                        aria-label="تعديل الرسالة"
                        className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>


                      <button
                        type="button"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          handleToggleSentStatus(notification)
                        }
                        aria-label={
                          notification.isSent
                            ? 'إلغاء توثيق الإرسال'
                            : 'توثيق الإرسال'
                        }
                        className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {savingThis ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCheck className="h-4 w-4" />
                        )}
                      </button>

                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        تاريخ الغياب: {notification.absentDate}
                      </span>
                      <span>#{notification.id}</span>
                    </div>

                  </article>
                );
              })}

            </div>


            {/* Desktop table */}

            <div className="hidden overflow-x-auto md:block">

              <table className="w-full min-w-[850px] text-right text-xs">

                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">

                  <tr className="border-b border-slate-200 dark:border-slate-800">

                    <th className="px-4 py-3">الطالب</th>

                    <th className="px-4 py-3">الشعبة</th>

                    <th className="px-4 py-3">ولي الأمر</th>

                    <th className="px-4 py-3">رقم الجوال</th>

                    <th className="px-4 py-3">الحالة</th>

                    <th className="px-4 py-3 text-center">
                      الإجراءات
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

                  {paginatedNotifications.map((notification) => {

                    const validPhone =
                      isValidSaudiPhone(
                        notification.phoneNumber,
                      );

                    const savingThis =
                      updateStatusMutation.isPending &&
                      updateStatusMutation.variables?.id ===
                        notification.id;

                    return (
                      <tr
                        key={notification.id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >

                        <td className="px-4 py-3.5">

                          <div className="flex items-center gap-2">

                            <span className="font-bold text-slate-900 dark:text-white">
                              {notification.studentName}
                            </span>

                            {customMessages[notification.id] !== undefined && (
                              <span
                                title="رسالة مخصصة"
                                className="h-2 w-2 rounded-full bg-amber-500"
                              />
                            )}

                          </div>

                          <p className="mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {notification.nationalId || '—'}
                          </p>

                        </td>


                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {notification.className || 'غير محدد'}
                          </span>
                        </td>


                        <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {notification.parentName}
                        </td>


                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">

                            <span
                              className="font-mono text-[11px] text-slate-600 dark:text-slate-300"
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


                        <td className="px-4 py-3.5">
                          <StatusBadge isSent={notification.isSent} />
                        </td>


                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">

                            <button
                              type="button"
                              disabled={!validPhone}
                              onClick={() =>
                                handleOpenWhatsApp(notification)
                              }
                              title="فتح واتساب"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1fa855] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#168b45] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              واتساب
                            </button>


                            <button
                              type="button"
                              onClick={() =>
                                handleOpenPreview(notification)
                              }
                              title="تعديل الرسالة"
                              aria-label="تعديل الرسالة"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>


                            <button
                              type="button"
                              disabled={updateStatusMutation.isPending}
                              onClick={() =>
                                handleToggleSentStatus(notification)
                              }
                              title={
                                notification.isSent
                                  ? 'إلغاء توثيق الإرسال'
                                  : 'توثيق الإرسال'
                              }
                              className="rounded-lg p-2 text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                            >
                              {savingThis ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCheck className="h-4 w-4" />
                              )}
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

            <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800 sm:px-5">

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


      {/* ================================================================= */}
      {/* Message Editor */}
      {/* ================================================================= */}

      {previewNotification && (
        <Dialog
          isOpen={Boolean(previewNotification)}
          onClose={() => setPreviewNotification(null)}
          title="رسالة ولي الأمر"
          maxWidth="lg"
        >

          <div className="space-y-4 text-right">

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-700 dark:bg-slate-950 sm:grid-cols-2">

              <div>
                <p className="text-slate-500 dark:text-slate-400">
                  الطالب
                </p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {previewNotification.studentName}
                </p>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400">
                  ولي الأمر
                </p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {previewNotification.parentName}
                </p>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400">
                  رقم الجوال
                </p>
                <p className="mt-1 font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                  {formatPhoneDisplay(previewNotification.phoneNumber)}
                </p>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400">
                  تاريخ الغياب
                </p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {previewNotification.absentDate}
                </p>
              </div>

            </div>


            <div className="space-y-2">

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  نص الرسالة
                </label>

                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {editedMessageText.length} حرف
                </span>
              </div>


              <div className="flex flex-wrap gap-1.5">

                <button
                  type="button"
                  onClick={() =>
                    setEditedMessageText(
                      (value) => `${value}\nنرجو مراجعة إدارة المدرسة.`,
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  + مراجعة الإدارة
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setEditedMessageText(
                      (value) => `${value}\nيرجى تقديم عذر رسمي معتمد.`,
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  + طلب عذر
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setEditedMessageText(
                      (value) => `${value}\nنود التنبيه إلى تكرر غياب الطالب.`,
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  + تكرر الغياب
                </button>

              </div>


              <textarea
                value={editedMessageText}
                onChange={(event) =>
                  setEditedMessageText(event.target.value)
                }
                rows={7}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="اكتب الرسالة..."
              />

            </div>


            <div className="space-y-2">

              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                معاينة الرسالة
              </p>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm leading-7 text-slate-800 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-slate-100">
                <p className="whitespace-pre-wrap">
                  {editedMessageText || '—'}
                </p>
              </div>

            </div>


            {!isValidSaudiPhone(previewNotification.phoneNumber) && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-6 text-rose-800 dark:border-rose-950 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  رقم ولي الأمر غير صالح. صحح الرقم قبل فتح واتساب.
                </span>
              </div>
            )}

          </div>


          <DialogFooter className="mt-5 flex-wrap gap-2">

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() =>
                handleResetCustomMessage(previewNotification)
              }
            >
              استعادة الافتراضي
            </Button>


            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Save className="h-3.5 w-3.5" />}
              onClick={() => {
                handleSaveCustomMessage(
                  previewNotification.id,
                  editedMessageText,
                );

                toast.show(
                  'تم حفظ الرسالة المخصصة.',
                  'success',
                );
              }}
            >
              حفظ
            </Button>


            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewNotification(null)}
            >
              إغلاق
            </Button>


            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Send className="h-4 w-4" />}
              disabled={
                !isValidSaudiPhone(
                  previewNotification.phoneNumber,
                )
              }
              onClick={() =>
                handleOpenWhatsApp(
                  previewNotification,
                  editedMessageText,
                )
              }
              className="bg-[#1fa855] text-white hover:bg-[#168b45]"
            >
              فتح واتساب
            </Button>

          </DialogFooter>

        </Dialog>
      )}


      {/* ================================================================= */}
      {/* Global Template */}
      {/* ================================================================= */}

      {isTemplateModalOpen && (
        <Dialog
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          title="قالب رسائل الغياب"
          maxWidth="lg"
        >

          <div className="space-y-4 text-right">

            <p className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs leading-6 text-blue-900 dark:border-blue-950 dark:bg-blue-950/40 dark:text-blue-200">
              يستخدم هذا القالب عند إنشاء الرسائل الجديدة. الرسائل المخصصة المحفوظة للطلاب تبقى مستقلة عنه.
            </p>


            <div>

              <p className="mb-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                المتغيرات المتاحة
              </p>

              <div className="flex flex-wrap gap-2">

                {templateVariables.map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    title={label}
                    onClick={() =>
                      setDraftTemplate(
                        (value) => `${value}${tag}`,
                      )
                    }
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-mono text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    + {tag}
                  </button>
                ))}

              </div>

            </div>


            <div>

              <label
                htmlFor="global-notification-template"
                className="mb-1.5 block text-xs font-bold text-slate-800 dark:text-slate-100"
              >
                نص القالب
              </label>

              <textarea
                id="global-notification-template"
                value={draftTemplate}
                onChange={(event) =>
                  setDraftTemplate(event.target.value)
                }
                rows={7}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-7 text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="اكتب قالب الرسالة..."
              />

            </div>


            <div>

              <p className="mb-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                معاينة
              </p>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm leading-7 text-slate-800 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-slate-100">

                <p className="whitespace-pre-wrap">
                  {renderNotificationMessage(
                    draftTemplate,
                    {
                      studentName: 'سلطان عبد العزيز الخالدي',
                      parentName: 'عبد العزيز الخالدي',
                      absentDate: effectiveDate,
                      schoolName: schoolName || 'اسم المدرسة',
                    },
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
              className="bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              حفظ القالب
            </Button>

          </DialogFooter>

        </Dialog>
      )}

    </main>
  );
}
