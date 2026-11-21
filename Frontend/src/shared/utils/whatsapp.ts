/**
 * WhatsApp Utility Functions for Parent Attendance Notifications
 * Handles Saudi Arabia phone number normalization and wa.me deep links.
 */

/**
 * Normalizes a phone number to the international Saudi WhatsApp format: 9665XXXXXXXX
 * Handles variations such as:
 * - 05XXXXXXXX (10 digits)
 * - +9665XXXXXXXX
 * - 009665XXXXXXXX
 * - 5XXXXXXXX (9 digits)
 * - 9665XXXXXXXX (12 digits)
 *
 * @param phone Raw phone number string
 * @returns Standardized 12-digit string without plus or spaces, or null if invalid
 */
export function normalizeSaudiPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove whitespace, dashes, parentheses, and other non-digit chars
  let clean = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  // Strip leading plus
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  }

  // Strip leading 00 international prefix
  if (clean.startsWith('00')) {
    clean = clean.substring(2);
  }

  // Case 1: Local mobile format 05XXXXXXXX (10 digits)
  if (/^05\d{8}$/.test(clean)) {
    return '966' + clean.substring(1);
  }

  // Case 2: Short format 5XXXXXXXX (9 digits)
  if (/^5\d{8}$/.test(clean)) {
    return '966' + clean;
  }

  // Case 3: Already in international format 9665XXXXXXXX (12 digits)
  if (/^9665\d{8}$/.test(clean)) {
    return clean;
  }

  // If none matched, the phone does not conform to standard Saudi mobile format
  return null;
}

/**
 * Checks whether a given phone number can be normalized to a valid Saudi mobile number.
 */
export function isValidSaudiPhone(phone: string | null | undefined): boolean {
  return normalizeSaudiPhone(phone) !== null;
}

/**
 * Formats a phone number for user-friendly display (e.g. 05X XXX XXXX).
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return 'غير متوفر';
  const normalized = normalizeSaudiPhone(phone);
  if (normalized && normalized.startsWith('9665') && normalized.length === 12) {
    const local = '0' + normalized.substring(3);
    return `${local.substring(0, 3)} ${local.substring(3, 6)} ${local.substring(6)}`;
  }
  return phone;
}

/**
 * Default Arabic attendance absence message template.
 * Supports placeholder variables: {studentName}, {absentDate}, {schoolName}, {schoolGreeting}, {parentName}
 * Also supports Arabic placeholder equivalents: {اسم_الطالب}, {تاريخ_الغياب}, {اسم_المدرسة}, {تحية_المدرسة}, {اسم_ولي_الأمر}
 */
export const DEFAULT_ABSENCE_TEMPLATE =
  `السلام عليكم ورحمة الله وبركاته،\nالمكرم ولي أمر الطالب ({اسم_الطالب})، نود إشعاركم {تحية_المدرسة} بغياب ابنكم اليوم الموافق {absentDate}.\nنرجو منكم التواصل مع المدرسة أو تقديم عذر الغياب عبر المنصة.\nشاكرين ومقدرين حسن تعاونكم.`;

/**
 * Renders a notification message from a template and parameters.
 */
export function renderNotificationMessage(
  template: string,
  params: {
    studentName: string;
    absentDate: string;
    schoolName?: string;
    parentName?: string;
  }
): string {
  const tpl = template || DEFAULT_ABSENCE_TEMPLATE;
  const schoolGreeting = params.schoolName ? `من إدارة ${params.schoolName}` : 'من إدارة المدرسة';
  return tpl
    .replace(/\{studentName\}|\{اسم_الطالب\}/g, params.studentName)
    .replace(/\{parentName\}|\{اسم_ولي_الأمر\}/g, params.parentName || 'ولي الأمر')
    .replace(/\{absentDate\}|\{تاريخ_الغياب\}/g, params.absentDate)
    .replace(/\{schoolName\}|\{اسم_المدرسة\}/g, params.schoolName || 'المدرسة')
    .replace(/\{schoolGreeting\}|\{تحية_المدرسة\}/g, schoolGreeting);
}

/**
 * Generates the personalized Arabic attendance absence message.
 */
export function buildAbsenceNotificationMessage(
  studentName: string,
  absentDate: string,
  schoolName?: string,
  customTemplate?: string,
  parentName?: string
): string {
  return renderNotificationMessage(customTemplate || DEFAULT_ABSENCE_TEMPLATE, {
    studentName,
    absentDate,
    schoolName,
    parentName,
  });
}

/**
 * Builds the complete WhatsApp Click-to-Chat URL.
 */
export function createWhatsAppAbsenceUrl(
  studentName: string,
  absentDate: string,
  phone: string | null | undefined,
  schoolName?: string,
  customMessage?: string
): { url: string | null; isValid: boolean; normalizedPhone: string | null; message: string } {
  const normalized = normalizeSaudiPhone(phone);
  const message = customMessage || buildAbsenceNotificationMessage(studentName, absentDate, schoolName);

  if (!normalized) {
    return {
      url: null,
      isValid: false,
      normalizedPhone: null,
      message,
    };
  }

  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${normalized}?text=${encodedMessage}`;

  return {
    url,
    isValid: true,
    normalizedPhone: normalized,
    message,
  };
}
