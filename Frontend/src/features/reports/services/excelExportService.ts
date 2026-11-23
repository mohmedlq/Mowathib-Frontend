import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { schoolSettingsService } from '../../../shared/services/schoolSettingsService';

import type {
  DailyAttendanceRow,
  DailyAbsenceRecord,
  MonthlyStudentSummaryRow,
  MonthlyDetailedAbsenceRow,
} from '../types/report.types';
import type { StudentWeeklyAttendance } from '../../attendance';

import {
  SCHOOL_DAYS,
  ATTENDANCE_STATUS_ARABIC,
  type AttendanceStatus,
  type ClassItem,
  type ClassEnrollment,
  type AttendanceRecord,
} from '../../../shared/types';
import { calculateDateForDay } from '../../../shared/utils/date';

export interface MonthlyAttendanceWeekData {
  weekNumber?: number;
  startDate: string;
  endDate: string;
  attendances: StudentWeeklyAttendance[];
}

export interface GradeClassExportData {
  classItem: ClassItem;
  className: string | number;
  classNumber?: number;
  attendances: StudentWeeklyAttendance[];
}

// =============================================================================
// 0. EXPORT ENGINE
// =============================================================================

/**
 * ExcelJS passes `zip` directly to JSZip. Level 1 favors export speed over
 * maximum compression while preserving a normal, valid .xlsx file.
 */
const FAST_WRITE_OPTIONS = {
  zip: {
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  },
} as const;

async function writeWorkbookFast(workbook: ExcelJS.Workbook): Promise<ExcelJS.Buffer> {
  return workbook.xlsx.writeBuffer(FAST_WRITE_OPTIONS);
}

const YIELD_EVERY_ROWS = 600;

async function yieldToUI(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function shouldYieldAfterRow(index: number): boolean {
  return (index + 1) % YIELD_EVERY_ROWS === 0;
}

let cachedArDate = '';
let cachedArDateTimestamp = 0;

function getFastArabicDateString(): string {
  const now = Date.now();
  if (!cachedArDate || now - cachedArDateTimestamp >= 60_000) {
    cachedArDate = new Date().toLocaleDateString('ar-SA');
    cachedArDateTimestamp = now;
  }
  return cachedArDate;
}

function getSchoolName(name?: string): string {
  return name || schoolSettingsService.getSchoolName();
}

/**
 * Returns a meaningful display value and ignores default numeric zero values.
 * Some API projections populate className with 0 while classNumber contains
 * the actual school section number (for example, 101 or 203).
 */
function getValidDisplayValue(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value !== 0 ? String(value) : undefined;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized || /^0+(?:\.0+)?$/.test(normalized)) return undefined;
    if (/^شعبة\s*0+$/.test(normalized)) return undefined;
    return normalized;
  }

  return undefined;
}

/**
 * Resolve the real school-facing class label instead of accidentally printing
 * a default `0` or an internal database identifier when a class number exists.
 */
function getClassDisplayName(
  classItem?: ClassItem | Record<string, unknown> | null,
  fallback?: unknown
): string {
  const item = classItem as unknown as Record<string, unknown> | null | undefined;
  // Some export payloads wrap the real ClassItem alongside className/classNumber.
  // Resolve the nested class before falling back to a display label or database ID.
  const nestedClassItem = item?.classItem as Record<string, unknown> | undefined;
  const candidates = [
    item?.classNumber,
    item?.classNo,
    item?.classCode,
    item?.sectionNumber,
    nestedClassItem?.classNumber,
    nestedClassItem?.classNo,
    nestedClassItem?.classCode,
    nestedClassItem?.sectionNumber,
    item?.className,
    item?.sectionName,
    item?.name,
    item?.displayName,
    nestedClassItem?.className,
    nestedClassItem?.sectionName,
    nestedClassItem?.name,
    nestedClassItem?.displayName,
    fallback,
    item?.classId,
    item?.id,
    nestedClassItem?.classId,
    nestedClassItem?.id,
  ];

  for (const candidate of candidates) {
    const value = getValidDisplayValue(candidate);
    if (value !== undefined) return value;
  }

  return '—';
}

// =============================================================================
// 1. SANITIZATION / DOWNLOAD
// =============================================================================

export function sanitizeWorksheetName(
  name: string | number | undefined,
  fallback = 'Sheet'
): string {
  const cleaned = String(name ?? '')
    .replace(/[\\/*?:\[\]]/g, '-')
    .replace(/^'+|'+$/g, '')
    .trim()
    .slice(0, 31)
    .trim();
  return cleaned || fallback.slice(0, 31);
}

/** Excel worksheet names must be unique within a workbook. */
const worksheetNameCache = new WeakMap<
  ExcelJS.Workbook,
  { worksheetCount: number; names: Set<string> }
>();

function getUniqueWorksheetName(
  workbook: ExcelJS.Workbook,
  desiredName: string,
  fallback: string
): string {
  const base = sanitizeWorksheetName(desiredName, fallback);
  let cache = worksheetNameCache.get(workbook);

  // Rebuild only when a worksheet has been added since the previous lookup.
  if (!cache || cache.worksheetCount !== workbook.worksheets.length) {
    cache = {
      worksheetCount: workbook.worksheets.length,
      names: new Set(workbook.worksheets.map((sheet) => sheet.name.toLowerCase())),
    };
    worksheetNameCache.set(workbook, cache);
  }

  if (!cache.names.has(base.toLowerCase())) {
    cache.names.add(base.toLowerCase());
    return base;
  }

  for (let suffix = 2; suffix < 10_000; suffix++) {
    const suffixText = ` (${suffix})`;
    const candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
    const normalized = candidate.toLowerCase();
    if (!cache.names.has(normalized)) {
      cache.names.add(normalized);
      return candidate;
    }
  }

  throw new Error(`تعذر إنشاء اسم ورقة فريد للاسم: ${desiredName}`);
}

export function sanitizeFilename(filename: string): string {
  if (!filename?.trim()) return 'Mowathib_Report.xlsx';

  let cleaned = filename
    .replace(/[\\/?%*:|"<>]/g, '_')
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();

  if (!cleaned.toLowerCase().endsWith('.xlsx')) cleaned += '.xlsx';
  return cleaned;
}

export function saveExcelFile(buffer: ArrayBuffer | ArrayBufferView | Blob | any, filename: string): void {
  const cleanFilename = sanitizeFilename(filename);
  const blob = buffer instanceof Blob
    ? buffer
    : new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

  try {
    saveAs(blob, cleanFilename);
    return;
  } catch (error) {
    console.warn('file-saver failed; trying a native download link:', error);
  }

  try {
    if (typeof window === 'undefined' || !window.document) {
      throw new Error('Browser download APIs are unavailable.');
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = cleanFilename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    window.setTimeout(() => {
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(objectUrl);
    }, 1000);
  } catch (fallbackError) {
    console.error('Excel download failed:', fallbackError);
    throw new Error('تم إنشاء ملف Excel لكن تعذر بدء تنزيله. حاول مرة أخرى.');
  }
}

// =============================================================================
// 2. SHARED STYLES
// =============================================================================

const COLORS = {
  teal: 'FF245B63',
  white: 'FFFFFFFF',
  text: 'FF17252B',
  muted: 'FF5F6B73',
  border: 'FFDCE3E6',
  zebra: 'FFFAFCFD',
  presentBg: 'FFE8F5EC',
  presentText: 'FF176B3A',
  absentBg: 'FFFDECEC',
  absentText: 'FFA61B1B',
  unmarkedBg: 'FFF1F3F5',
  unmarkedText: 'FF59636E',
  discontinuedBg: 'FFFFF4DA',
  discontinuedText: 'FF855500',
} as const;

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

const ALIGN_CENTER: Partial<ExcelJS.Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
};
const ALIGN_RIGHT: Partial<ExcelJS.Alignment> = {
  horizontal: 'right',
  vertical: 'middle',
};

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

const FILL_TEAL = solidFill(COLORS.teal);
const FILL_META = solidFill('FFEEF2F3');
const FILL_HEADER_GRAY = solidFill('FFE2E8EB');
const FILL_PERIOD = solidFill('FFF1F3F5');
const FILL_PERIOD_ALT = solidFill('FFF5F7F8');
const FILL_ZEBRA = solidFill(COLORS.zebra);
const FILL_PRESENT = solidFill(COLORS.presentBg);
const FILL_ABSENT = solidFill(COLORS.absentBg);
const FILL_DISCONTINUED = solidFill(COLORS.discontinuedBg);
const FILL_UNMARKED = solidFill(COLORS.unmarkedBg);

const STYLES: Record<string, Partial<ExcelJS.Style>> = {
  title15: {
    font: { name: 'Arial', size: 15, bold: true, color: { argb: COLORS.white } },
    fill: FILL_TEAL,
    alignment: ALIGN_CENTER,
  },
  title14: {
    font: { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.white } },
    fill: FILL_TEAL,
    alignment: ALIGN_CENTER,
  },
  title13: {
    font: { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.white } },
    fill: FILL_TEAL,
    alignment: ALIGN_CENTER,
  },
  title12: {
    font: { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.white } },
    fill: FILL_TEAL,
    alignment: ALIGN_CENTER,
  },
  titleAbsent14: {
    font: { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.white } },
    fill: solidFill(COLORS.absentText),
    alignment: ALIGN_CENTER,
  },
  meta10: {
    font: { name: 'Arial', size: 10, color: { argb: COLORS.muted } },
    fill: FILL_META,
    alignment: ALIGN_CENTER,
  },
  meta95: {
    font: { name: 'Arial', size: 9.5, color: { argb: COLORS.muted } },
    fill: FILL_META,
    alignment: ALIGN_CENTER,
  },
  metaBold10: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.text } },
    fill: FILL_META,
    alignment: ALIGN_CENTER,
  },
  headerGray11: {
    font: { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.text } },
    fill: FILL_HEADER_GRAY,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  headerGray10: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.text } },
    fill: FILL_HEADER_GRAY,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  headerTeal11: {
    font: { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.white } },
    fill: FILL_TEAL,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  headerTeal10: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.white } },
    fill: FILL_TEAL,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  headerRed10: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.white } },
    fill: solidFill(COLORS.absentText),
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  periodHeader9: {
    font: { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.muted } },
    fill: FILL_PERIOD,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  periodHeaderAlt9: {
    font: { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.muted } },
    fill: FILL_PERIOD_ALT,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  periodHeader85: {
    font: { name: 'Arial', size: 8.5, bold: true, color: { argb: COLORS.muted } },
    fill: FILL_PERIOD,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  idCell10: {
    numFmt: '@',
    font: { name: 'Arial', size: 10 },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  idCellDefault: {
    numFmt: '@',
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  idCell9: {
    numFmt: '@',
    font: { name: 'Arial', size: 9 },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  idCellStage9: {
    font: { name: 'Arial', size: 9, color: { argb: COLORS.muted } },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  idCellStage9Zebra: {
    font: { name: 'Arial', size: 9, color: { argb: COLORS.muted } },
    fill: FILL_ZEBRA,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  nameCell10: {
    font: { name: 'Arial', size: 10, bold: true },
    alignment: ALIGN_RIGHT,
    border: BORDER_THIN,
  },
  nameCellBoldOnly: {
    font: { bold: true },
    alignment: ALIGN_RIGHT,
    border: BORDER_THIN,
  },
  nameCell95: {
    font: { name: 'Arial', size: 9.5, bold: true },
    alignment: ALIGN_RIGHT,
    border: BORDER_THIN,
  },
  nameCellStage10: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.text } },
    alignment: ALIGN_RIGHT,
    border: BORDER_THIN,
  },
  nameCellStage10Zebra: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.text } },
    fill: FILL_ZEBRA,
    alignment: ALIGN_RIGHT,
    border: BORDER_THIN,
  },
  totalBold10: {
    font: { name: 'Arial', size: 10, bold: true },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  totalBold10Zebra: {
    font: { name: 'Arial', size: 10, bold: true },
    fill: FILL_ZEBRA,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  centerDefault: { alignment: ALIGN_CENTER, border: BORDER_THIN },
  centerZebra: { fill: FILL_ZEBRA, alignment: ALIGN_CENTER, border: BORDER_THIN },
  rightDefault: { alignment: ALIGN_RIGHT, border: BORDER_THIN },
  rightZebra: { fill: FILL_ZEBRA, alignment: ALIGN_RIGHT, border: BORDER_THIN },
  absentAlertCell: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.absentText } },
    fill: FILL_ABSENT,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  stageColPresent: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.presentText } },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  stageColPresentZebra: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.presentText } },
    fill: FILL_ZEBRA,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  stageColAbsent: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.absentText } },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  stageColAbsentZebra: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.absentText } },
    fill: FILL_ZEBRA,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  stageColRate: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.teal } },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  stageColRateZebra: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.teal } },
    fill: FILL_ZEBRA,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  stageUnmarked9: {
    font: { name: 'Arial', size: 9, color: { argb: 'FF89949A' } },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  summaryCellNormal: {
    font: { name: 'Arial', size: 10, color: { argb: COLORS.text } },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  summaryCellZebra: {
    font: { name: 'Arial', size: 10, color: { argb: COLORS.text } },
    fill: FILL_ZEBRA,
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  summaryFooter11: {
    font: { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.text } },
    fill: solidFill('FFE4EBED'),
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
  summaryFooter10: {
    font: { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.text } },
    fill: solidFill('FFE8EFF0'),
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  },
};

interface StatusStylePreset {
  label: string;
  cellStyle9: Partial<ExcelJS.Style>;
  cellStyle85: Partial<ExcelJS.Style>;
  cellStyle8: Partial<ExcelJS.Style>;
  fastCellStyle8: Partial<ExcelJS.Style>;
}

function createStatusPreset(
  fill: ExcelJS.Fill,
  fontColor: string,
  label: string
): StatusStylePreset {
  const createCellStyle = (size: number): Partial<ExcelJS.Style> => ({
    fill,
    font: { name: 'Arial', size, bold: true, color: { argb: fontColor } },
    alignment: ALIGN_CENTER,
    border: BORDER_THIN,
  });

  return {
    label,
    cellStyle9: createCellStyle(9),
    cellStyle85: createCellStyle(8.5),
    cellStyle8: createCellStyle(8),
    // Row alignment and borders are applied once for the weekly grid.
    fastCellStyle8: {
      fill,
      font: { name: 'Arial', size: 8, bold: true, color: { argb: fontColor } },
    },
  };
}

const STATUS_PRESETS: Record<AttendanceStatus, StatusStylePreset> = {
  Present: createStatusPreset(FILL_PRESENT, COLORS.presentText, ATTENDANCE_STATUS_ARABIC.Present),
  Absent: createStatusPreset(FILL_ABSENT, COLORS.absentText, ATTENDANCE_STATUS_ARABIC.Absent),
  Discontinued: createStatusPreset(FILL_DISCONTINUED, COLORS.discontinuedText, ATTENDANCE_STATUS_ARABIC.Discontinued),
  Unmarked: createStatusPreset(FILL_UNMARKED, COLORS.unmarkedText, ATTENDANCE_STATUS_ARABIC.Unmarked),
};

function getStatusStyle(status: AttendanceStatus | undefined): StatusStylePreset {
  return (status && STATUS_PRESETS[status]) || STATUS_PRESETS.Unmarked;
}

// =============================================================================
// 3. SCHEDULE LAYOUT AND DATA HELPERS
// =============================================================================

interface DayHeaderLayout {
  dayNumber: number;
  name: string;
  startCol: number;
  endCol: number;
  periodCount: number;
}

interface FlatWeeklySlot {
  dayNumber: number;
  periodNumber: number;
  colIndex: number;
  slotOffset: number;
}

let cachedLayout: {
  dayHeaders: DayHeaderLayout[];
  flatSlots: FlatWeeklySlot[];
} | null = null;

function getWeeklyScheduleLayout() {
  if (cachedLayout) return cachedLayout;

  let currentCol = 2;
  const dayHeaders: DayHeaderLayout[] = [];
  const flatSlots: FlatWeeklySlot[] = [];

  for (const day of SCHOOL_DAYS) {
    dayHeaders.push({
      dayNumber: day.dayNumber,
      name: day.nameAr,
      startCol: currentCol,
      endCol: currentCol,
      periodCount: 1,
    });

    flatSlots.push({
      dayNumber: day.dayNumber,
      periodNumber: 1,
      colIndex: currentCol,
      slotOffset: day.dayNumber,
    });
    currentCol++;
  }

  cachedLayout = { dayHeaders, flatSlots };
  return cachedLayout;
}

function indexClassRecordsFlat(
  records: AttendanceRecord[]
): Map<number, AttendanceStatus> {
  const result = new Map<number, AttendanceStatus>();

  for (const record of records) {
    const key = record.enrollmentId * 64 + record.dayNumber;

    // Keep the first record, matching the original export behavior.
    if (!result.has(key)) result.set(key, record.status);
  }

  return result;
}

function setRowStyles(
  row: ExcelJS.Row,
  styles: Array<Partial<ExcelJS.Style> | undefined>
): void {
  // Apply common formatting once per row. Per-cell styles are only assigned
  // when a cell needs a special font, fill, number format, or alignment.
  row.alignment = ALIGN_CENTER;
  row.border = BORDER_THIN;

  for (let index = 0; index < styles.length; index++) {
    const style = styles[index];
    if (!style) continue;

    const hasCellSpecificFormatting = Boolean(
      style.font ||
      style.fill ||
      style.numFmt ||
      (style.alignment && (
        style.alignment.horizontal !== 'center' ||
        style.alignment.vertical !== 'middle'
      ))
    );

    if (hasCellSpecificFormatting) {
      row.getCell(index + 1).style = style;
    }
  }
}

function applyHeaderStyle(
  row: ExcelJS.Row,
  count: number,
  style: Partial<ExcelJS.Style> = STYLES.headerGray11
): void {
  for (let column = 1; column <= count; column++) {
    row.getCell(column).style = style;
  }
}

function addTitleAndMeta(
  worksheet: ExcelJS.Worksheet,
  lastColumn: number,
  title: string,
  meta: string,
  titleStyle: Partial<ExcelJS.Style> = STYLES.title14
): void {
  worksheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.style = titleStyle;
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells(2, 1, 2, lastColumn);
  const metaCell = worksheet.getCell(2, 1);
  metaCell.value = meta;
  metaCell.style = STYLES.meta10;
  worksheet.getRow(2).height = 20;
}

function configureIdentityColumns(
  worksheet: ExcelJS.Worksheet,
  lastColumn: number,
  periodWidth = 7.5
): void {
  // Weekly layout: Student Name | daily attendance statuses | National ID.
  worksheet.getColumn(1).width = 28;
  for (let column = 2; column < lastColumn; column++) {
    worksheet.getColumn(column).width = periodWidth;
  }
  worksheet.getColumn(lastColumn).width = 16;
}

function getWeeklySlotStatus(
  attendance: StudentWeeklyAttendance,
  slot: FlatWeeklySlot
): AttendanceStatus {
  const daySlot = attendance.slots?.[slot.dayNumber];
  if (!daySlot) return 'Unmarked';
  if (typeof daySlot === 'object' && 'status' in daySlot) {
    return (daySlot as any).status;
  }
  return 'Unmarked';
}

// =============================================================================
// 4. WEEKLY PREPARATION TABLE BUILDER
// =============================================================================

function appendClassWeeklyPreparationToWorksheet(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  classData: GradeClassExportData | {
    className: string | number;
    classNumber?: number;
    attendances: StudentWeeklyAttendance[];
  },
  meta: {
    weekNumber: number;
    weekRange: string;
    academicYear?: string;
    schoolName?: string;
  }
): number {
  const { dayHeaders, flatSlots } = getWeeklyScheduleLayout();
  const totalCols = 2 + flatSlots.length;
  const className = getClassDisplayName(classData as unknown as Record<string, unknown>);
  const displayClassName = className === '—'
    ? 'الشعبة غير محددة'
    : className.startsWith('شعبة') ? className : `شعبة ${className}`;
  const attendances = classData.attendances ?? [];

  worksheet.mergeCells(startRow, 1, startRow, totalCols);
  const titleCell = worksheet.getCell(startRow, 1);
  titleCell.value = `${displayClassName} — كشف التحضير الأسبوعي (الأسبوع ${meta.weekNumber})`;
  titleCell.style = STYLES.title12;
  worksheet.getRow(startRow).height = 26;

  worksheet.mergeCells(startRow + 1, 1, startRow + 1, totalCols);
  const metaCell = worksheet.getCell(startRow + 1, 1);
  metaCell.value =
    `المدرسة: ${meta.schoolName || getSchoolName()} | ` +
    `الفترة: ${meta.weekRange} | عدد الطلاب: ${attendances.length} | ` +
    `العام الدراسي: ${meta.academicYear || '1448-1449هـ'}`;
  metaCell.style = STYLES.meta95;
  worksheet.getRow(startRow + 1).height = 19;

  const headerRow1 = startRow + 3;
  const headerRow2 = startRow + 4;

  worksheet.mergeCells(headerRow1, 1, headerRow2, 1);
  worksheet.getCell(headerRow1, 1).value = 'اسم الطالب';
  worksheet.getCell(headerRow1, 1).style = STYLES.headerGray10;
  worksheet.getCell(headerRow2, 1).style = STYLES.headerGray10;

  const nationalIdColumn = totalCols;
  worksheet.mergeCells(headerRow1, nationalIdColumn, headerRow2, nationalIdColumn);
  worksheet.getCell(headerRow1, nationalIdColumn).value = 'رقم الهوية';
  worksheet.getCell(headerRow1, nationalIdColumn).style = STYLES.headerGray10;
  worksheet.getCell(headerRow2, nationalIdColumn).style = STYLES.headerGray10;

  const topHeader = worksheet.getRow(headerRow1);
  const bottomHeader = worksheet.getRow(headerRow2);
  topHeader.height = 22;
  bottomHeader.height = 19;

  for (const day of dayHeaders) {
    worksheet.mergeCells(headerRow1, day.startCol, headerRow2, day.endCol);
    topHeader.getCell(day.startCol).value = day.name;
    topHeader.getCell(day.startCol).style = STYLES.headerGray10;
    bottomHeader.getCell(day.startCol).style = STYLES.headerGray10;
  }

  let currentRow = headerRow2 + 1;

  if (attendances.length === 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, totalCols);
    const emptyCell = worksheet.getCell(currentRow, 1);
    emptyCell.value = 'لا توجد بيانات حضور مسجلة لهذه الشعبة في هذا الأسبوع';
    emptyCell.style = STYLES.meta95;
    worksheet.getRow(currentRow).height = 22;
    return currentRow + 1;
  }

  // Buffers are local to this table invocation. Module-level shared buffers
  // caused data corruption when two exports overlapped across UI yields.
  for (let studentIndex = 0; studentIndex < attendances.length; studentIndex++) {
    const item = attendances[studentIndex];
    const values = new Array<string | number>(totalCols);
    const styles = new Array<Partial<ExcelJS.Style>>(totalCols);

    values[0] =
      item.enrollment.studentName ||
      item.enrollment.student?.fullName ||
      'طالب';

    styles[0] = STYLES.nameCell95;

    for (let slotIndex = 0; slotIndex < flatSlots.length; slotIndex++) {
      const preset = getStatusStyle(
        getWeeklySlotStatus(item, flatSlots[slotIndex])
      );
      values[1 + slotIndex] = preset.label;
      styles[1 + slotIndex] = preset.fastCellStyle8;
    }

    values[totalCols - 1] =
      item.enrollment.student?.nationalId ||
      (item.enrollment as any).nationalId ||
      '—';
    styles[totalCols - 1] = STYLES.idCell9;

    const row = worksheet.addRow(values);
    row.height = 19;
    // Apply common formatting once per row instead of once per period cell.
    row.alignment = ALIGN_CENTER;
    row.border = BORDER_THIN;
    setRowStyles(row, styles);
  }

  return currentRow + attendances.length;
}

// =============================================================================
// 5. EXCEL EXPORT SERVICE
// =============================================================================

export const excelExportService = {
  // ---------------------------------------------------------------------------
  // 5.1 DAILY ATTENDANCE
  // ---------------------------------------------------------------------------

  async exportDailyAttendance(
    data: DailyAttendanceRow[],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: number | string | undefined;
      dayName: string;
      date: string;
      isAbsenceOnly?: boolean;
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const totalColumns = 5;

    const worksheet = workbook.addWorksheet(
      sanitizeWorksheetName(meta.isAbsenceOnly ? 'تقرير الغياب اليومي' : 'التقرير اليومي'),
      {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
      }
    );

    addTitleAndMeta(
      worksheet,
      totalColumns,
      `${getSchoolName(meta.schoolName)} — ${meta.isAbsenceOnly ? 'تقرير الغياب اليومي' : 'تقرير الحضور اليومي'}`,
      `العام الدراسي: ${meta.academicYear} | الشعبة: ${getClassDisplayName(undefined, meta.className)} | اليوم: ${meta.dayName} (${meta.date}) | تاريخ التوليد: ${getFastArabicDateString()}`
    );

    worksheet.addRow([]);

    const headers = [
      'اسم الطالب',
      'حالة الحضور',
      'رقم الهوية',
      'الشعبة',
      'التاريخ',
    ];

    const header = worksheet.addRow(headers);
    header.height = 24;
    applyHeaderStyle(header, totalColumns);

    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const preset = getStatusStyle(item.status);
      const values: Array<string | number> = [
        item.studentName ?? '',
        preset.label,
        String(item.nationalId ?? ''),
        getClassDisplayName(item as unknown as Record<string, unknown>, meta.className),
        item.date || meta.date,
      ];
      const styles: Array<Partial<ExcelJS.Style> | undefined> = [
        STYLES.nameCell10,
        preset.cellStyle9,
        STYLES.idCell10,
        STYLES.centerDefault,
        STYLES.centerDefault,
      ];

      const row = worksheet.addRow(values);
      row.height = 20;
      setRowStyles(row, styles);
      if (shouldYieldAfterRow(index)) await yieldToUI();
    }

    worksheet.getColumn(1).width = 28;
    worksheet.getColumn(2).width = 16;
    worksheet.getColumn(3).width = 16;
    worksheet.getColumn(4).width = 14;
    worksheet.getColumn(5).width = 14;

    if (data.length) {
      worksheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + data.length, column: totalColumns },
      };
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Daily_Attendance_${meta.academicYear}_${getClassDisplayName(undefined, meta.className)}_${meta.date}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.2 WEEKLY ATTENDANCE
  // ---------------------------------------------------------------------------

  async exportWeeklyAttendance(
    attendances: StudentWeeklyAttendance[],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: number | string | undefined;
      weekNumber: number;
      weekRange: string;
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const { dayHeaders, flatSlots } = getWeeklyScheduleLayout();
    const lastColumn = 2 + flatSlots.length;

    const worksheet = workbook.addWorksheet('التقرير الأسبوعي', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 5 }],
    });

    addTitleAndMeta(
      worksheet,
      lastColumn,
      `${getSchoolName(meta.schoolName)} — تقرير الحضور والغياب الأسبوعي (الأسبوع ${meta.weekNumber})`,
      `العام الدراسي: ${meta.academicYear} | الشعبة: ${getClassDisplayName(undefined, meta.className)} | الفترة: ${meta.weekRange} | عدد الطلاب: ${attendances.length}`
    );

    worksheet.mergeCells('A4:A5');
    worksheet.getCell('A4').value = 'اسم الطالب';
    worksheet.mergeCells(4, lastColumn, 5, lastColumn);
    worksheet.getCell(4, lastColumn).value = 'رقم الهوية';
    worksheet.getCell(4, lastColumn).style = STYLES.headerGray11;
    worksheet.getRow(5).getCell(lastColumn).style = STYLES.headerGray11;

    const firstHeader = worksheet.getRow(4);
    const secondHeader = worksheet.getRow(5);
    firstHeader.height = 22;
    secondHeader.height = 20;

    for (const day of dayHeaders) {
      worksheet.mergeCells(4, day.startCol, 5, day.endCol);
      const cell = worksheet.getCell(4, day.startCol);
      cell.value = day.name;
      cell.style = STYLES.headerGray11;
      secondHeader.getCell(day.startCol).style = STYLES.headerGray11;
    }

    worksheet.getCell('A4').style = STYLES.headerGray11;

    for (let index = 0; index < attendances.length; index++) {
      const item = attendances[index];
      const values: Array<string | number> = [
        item.enrollment.studentName ?? item.enrollment.student?.fullName ?? '',
      ];
      const styles: Array<Partial<ExcelJS.Style> | undefined> = [
        STYLES.nameCellBoldOnly,
      ];

      for (const slot of flatSlots) {
        const preset = getStatusStyle(getWeeklySlotStatus(item, slot));
        values.push(preset.label);
        styles.push(preset.cellStyle85);
      }

      values.push(String(item.enrollment.student?.nationalId ?? ''));
      styles.push(STYLES.idCellDefault);

      const row = worksheet.addRow(values);
      row.height = 20;
      setRowStyles(row, styles);
      if (shouldYieldAfterRow(index)) await yieldToUI();
    }

    configureIdentityColumns(worksheet, lastColumn, 7.5);

    if (attendances.length) {
      worksheet.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: 5 + attendances.length, column: lastColumn },
      };
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Weekly_Attendance_${meta.academicYear}_Week-${meta.weekNumber}_${getClassDisplayName(undefined, meta.className)}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.3 MONTHLY ATTENDANCE
  // ---------------------------------------------------------------------------

  async exportMonthlyReport(
    summaryData: MonthlyStudentSummaryRow[] = [],
    detailedAbsences: MonthlyDetailedAbsenceRow[] = [],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: number | string | undefined;
      month: string;
      weeks?: MonthlyAttendanceWeekData[];
    }
  ): Promise<void> {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(meta.month);
    if (!monthMatch) throw new Error('صيغة الشهر غير صحيحة. استخدم YYYY-MM.');

    const year = Number(monthMatch[1]);
    const monthNumber = Number(monthMatch[2]);
    if (monthNumber < 1 || monthNumber > 12) {
      throw new Error('الشهر المحدد غير صحيح.');
    }

    const monthStart = `${meta.month}-01`;
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const monthEnd = `${meta.month}-${String(lastDay).padStart(2, '0')}`;

    const normalizeDate = (value: string, label: string): string => {
      const date = String(value ?? '').trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`${label} غير صالح: ${value}`);
      }
      const parsed = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        throw new Error(`${label} غير صالح: ${value}`);
      }
      return date;
    };

    const hasWeeks = Boolean(meta.weeks?.length);
    const hasSummary = Boolean(summaryData?.length);
    const hasAbsences = Boolean(detailedAbsences?.length);

    if (!hasWeeks && !hasSummary && !hasAbsences) {
      throw new Error('لا توجد بيانات حضور أو غياب للشهر المحدد.');
    }

    const selectedWeeks = (meta.weeks || [])
      .map((week) => {
        const startDate = normalizeDate(week.startDate, 'تاريخ بداية الأسبوع');
        const endDate = normalizeDate(week.endDate, 'تاريخ نهاية الأسبوع');
        if (startDate > endDate) {
          throw new Error(`نطاق الأسبوع غير صحيح: ${startDate} - ${endDate}`);
        }

        const intersectsMonth = SCHOOL_DAYS.some((day) => {
          const schoolDate = normalizeDate(
            calculateDateForDay(startDate, day.dayNumber),
            'تاريخ اليوم الدراسي'
          );
          return schoolDate >= startDate && schoolDate <= endDate && schoolDate >= monthStart && schoolDate <= monthEnd;
        });

        return { week, startDate, endDate, intersectsMonth };
      })
      .filter((item) => item.intersectsMonth)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(meta.schoolName);

    // 1. Sheet 1: Monthly Attendance Summary (ملخص الحضور الشهري)
    if (hasSummary) {
      const summarySheet = workbook.addWorksheet('ملخص الحضور الشهري', {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
      });

      addTitleAndMeta(
        summarySheet,
        10,
        `${schoolName} — ملخص الحضور والغياب الشهري (شهر ${meta.month})`,
        `العام الدراسي: ${meta.academicYear} | الشعبة: ${getClassDisplayName(undefined, meta.className) === '—' ? 'كافة الشعب' : getClassDisplayName(undefined, meta.className)} | إجمالي الطلاب: ${summaryData.length} | تاريخ الاستخراج: ${getFastArabicDateString()}`,
        STYLES.title14
      );

      summarySheet.addRow([]);

      const headers = [
        'اسم الطالب',
        'أيام الحضور',
        'أيام الغياب',
        'أيام الانقطاع',
        'غير محدد',
        'رقم الهوية',
        'الشعبة',
        'الأيام المتوقعة',
        'نسبة الحضور',
        'م',
      ];

      const headerRow = summarySheet.addRow(headers);
      headerRow.height = 24;
      applyHeaderStyle(headerRow, 10);

      for (let i = 0; i < summaryData.length; i++) {
        const item = summaryData[i];
        const rateStr = `${item.attendanceRate.toFixed(1)}%`;
        const values: Array<string | number> = [
          item.studentName ?? '',
          item.presentCount,
          item.absentCount,
          item.discontinuedCount,
          item.unmarkedCount,
          String(item.nationalId ?? ''),
          getClassDisplayName(item as unknown as Record<string, unknown>, meta.className),
          item.totalExpected,
          rateStr,
          i + 1,
        ];

        const rateStyle =
          item.attendanceRate >= 90
            ? STATUS_PRESETS.Present.cellStyle9
            : item.attendanceRate >= 75
            ? STATUS_PRESETS.Discontinued.cellStyle9
            : STATUS_PRESETS.Absent.cellStyle9;

        const styles = [
          STYLES.nameCell10,
          STATUS_PRESETS.Present.cellStyle9,
          STATUS_PRESETS.Absent.cellStyle9,
          STATUS_PRESETS.Discontinued.cellStyle9,
          STATUS_PRESETS.Unmarked.cellStyle9,
          STYLES.idCell10,
          STYLES.centerDefault,
          STYLES.centerDefault,
          rateStyle,
          STYLES.centerDefault,
        ];

        const row = summarySheet.addRow(values);
        row.height = 20;
        setRowStyles(row, styles);
        if (shouldYieldAfterRow(i)) await yieldToUI();
      }

      summarySheet.getColumn(1).width = 28;
      summarySheet.getColumn(2).width = 14;
      summarySheet.getColumn(3).width = 14;
      summarySheet.getColumn(4).width = 14;
      summarySheet.getColumn(5).width = 12;
      summarySheet.getColumn(6).width = 16;
      summarySheet.getColumn(7).width = 14;
      summarySheet.getColumn(8).width = 14;
      summarySheet.getColumn(9).width = 14;
      summarySheet.getColumn(10).width = 6;

      summarySheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + summaryData.length, column: 10 },
      };
      summarySheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
    }

    // 2. Sheet 2: Detailed Absence Records (سجل الغياب التفصيلي)
    if (hasAbsences) {
      const detailedSheet = workbook.addWorksheet('سجل الغياب التفصيلي', {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
      });

      addTitleAndMeta(
        detailedSheet,
        7,
        `${schoolName} — سجل الغياب التفصيلي لشهر (${meta.month})`,
        `العام الدراسي: ${meta.academicYear} | الشعبة: ${getClassDisplayName(undefined, meta.className) === '—' ? 'كافة الشعب' : getClassDisplayName(undefined, meta.className)} | إجمالي حالات الغياب: ${detailedAbsences.length} | تاريخ الاستخراج: ${getFastArabicDateString()}`,
        STYLES.titleAbsent14
      );

      detailedSheet.addRow([]);

      const headers = [
        'اسم الطالب',
        'الحالة',
        'رقم الهوية',
        'الشعبة',
        'التاريخ',
        'اليوم',
        'م',
      ];

      const headerRow = detailedSheet.addRow(headers);
      headerRow.height = 24;
      applyHeaderStyle(headerRow, 7);

      for (let i = 0; i < detailedAbsences.length; i++) {
        const item = detailedAbsences[i];
        const values: Array<string | number> = [
          item.studentName ?? '',
          'غائب',
          String(item.nationalId ?? ''),
          getClassDisplayName(item as unknown as Record<string, unknown>, meta.className),
          item.date || '',
          item.dayName || '',
          i + 1,
        ];

        const styles = [
          STYLES.nameCell10,
          STATUS_PRESETS.Absent.cellStyle9,
          STYLES.idCell10,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
        ];

        const row = detailedSheet.addRow(values);
        row.height = 20;
        setRowStyles(row, styles);
        if (shouldYieldAfterRow(i)) await yieldToUI();
      }

      detailedSheet.getColumn(1).width = 28;
      detailedSheet.getColumn(2).width = 14;
      detailedSheet.getColumn(3).width = 16;
      detailedSheet.getColumn(4).width = 14;
      detailedSheet.getColumn(5).width = 14;
      detailedSheet.getColumn(6).width = 14;
      detailedSheet.getColumn(7).width = 6;

      detailedSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + detailedAbsences.length, column: 7 },
      };
      detailedSheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
    }

    // 3. Subsequent Sheets: Weekly attendance matrix for overlapping weeks
    const { dayHeaders, flatSlots } = getWeeklyScheduleLayout();
    const lastColumn = 2 + flatSlots.length;

    for (let weekIndex = 0; weekIndex < selectedWeeks.length; weekIndex++) {
      await yieldToUI();
      const { week, startDate, endDate } = selectedWeeks[weekIndex];
      const attendances = week.attendances ?? [];
      const weekNumber = week.weekNumber ?? weekIndex + 1;

      const worksheet = workbook.addWorksheet(
        getUniqueWorksheetName(workbook, `الأسبوع ${weekIndex + 1}`, `Week ${weekIndex + 1}`),
        {
          views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 5 }],
        }
      );

      worksheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      };

      addTitleAndMeta(
        worksheet,
        lastColumn,
        `${schoolName} — تفاصيل الحضور الأسبوعي (الأسبوع ${weekNumber})`,
        `العام الدراسي: ${meta.academicYear} | الشعبة: ${getClassDisplayName(undefined, meta.className)} | الفترة: ${startDate} - ${endDate} | عدد الطلاب: ${attendances.length}`
      );
      worksheet.getRow(3).height = 10;

      worksheet.mergeCells('A4:A5');
      worksheet.getCell('A4').value = 'اسم الطالب';
      worksheet.mergeCells(4, lastColumn, 5, lastColumn);
      worksheet.getCell(4, lastColumn).value = 'رقم الهوية';
      worksheet.getCell(4, lastColumn).style = STYLES.headerGray11;
      worksheet.getRow(5).getCell(lastColumn).style = STYLES.headerGray11;

      const firstHeader = worksheet.getRow(4);
      const secondHeader = worksheet.getRow(5);
      firstHeader.height = 22;
      secondHeader.height = 20;

      for (const day of dayHeaders) {
        worksheet.mergeCells(4, day.startCol, 5, day.endCol);
        const dayCell = worksheet.getCell(4, day.startCol);
        dayCell.value = day.name;
        dayCell.style = STYLES.headerGray11;
        secondHeader.getCell(day.startCol).style = STYLES.headerGray11;
      }

      worksheet.getCell('A4').style = STYLES.headerGray11;

      for (let studentIndex = 0; studentIndex < attendances.length; studentIndex++) {
        const item = attendances[studentIndex];
        const values: Array<string | number> = [
          item.enrollment.studentName ?? item.enrollment.student?.fullName ?? '',
        ];
        const styles: Array<Partial<ExcelJS.Style> | undefined> = [
          STYLES.nameCell10,
        ];

        for (const slot of flatSlots) {
          const preset = getStatusStyle(getWeeklySlotStatus(item, slot));
          values.push(preset.label);
          styles.push(preset.cellStyle85);
        }

        values.push(String(item.enrollment.student?.nationalId ?? ''));
        styles.push(STYLES.idCellDefault);

        const row = worksheet.addRow(values);
        row.height = 20;
        setRowStyles(row, styles);
        if (shouldYieldAfterRow(studentIndex)) await yieldToUI();
      }

      configureIdentityColumns(worksheet, lastColumn, 7.5);

      if (attendances.length) {
        worksheet.autoFilter = {
          from: { row: 5, column: 1 },
          to: { row: 5 + attendances.length, column: lastColumn },
        };
      }

      worksheet.pageSetup.printArea = `A1:${worksheet.getColumn(lastColumn).letter}${5 + attendances.length}`;
    }

    const buffer = await writeWorkbookFast(workbook);
    const safeClassName = (getClassDisplayName(undefined, meta.className) === '—'
      ? 'AllClasses'
      : getClassDisplayName(undefined, meta.className)).replace(/[\\/:*?"<>|]/g, '-');
    saveExcelFile(buffer, `Mowathib_Monthly_Attendance_${meta.academicYear}_${meta.month}_${safeClassName}.xlsx`);
  },

  // ---------------------------------------------------------------------------
  // 5.4 DAILY ABSENCE
  // ---------------------------------------------------------------------------

  async exportDailyAbsence(
    records: DailyAbsenceRecord[],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: number | string | undefined;
      date: string;
      dayName: string;
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('سجل الغياب اليومي', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 3 }],
    });

    addTitleAndMeta(
      worksheet,
      6,
      `${getSchoolName(meta.schoolName)} — سجل الغياب اليومي (${meta.date})`,
      `العام الدراسي: ${meta.academicYear} | الشعبة: ${getClassDisplayName(undefined, meta.className)} | اليوم: ${meta.dayName} | إجمالي حالات الغياب: ${records.length}`,
      STYLES.titleAbsent14
    );

    const header = worksheet.addRow([
      'اسم الطالب', 'حالة الحضور', 'رقم الهوية', 'الشعبة', 'التاريخ', 'اليوم',
    ]);
    header.height = 24;
    applyHeaderStyle(header, 6);

    for (let index = 0; index < records.length; index++) {
      const item = records[index];
      const centerStyle = index % 2 ? STYLES.centerZebra : STYLES.centerDefault;
      const row = worksheet.addRow([
        item.studentName,
        'غائب',
        String(item.nationalId ?? ''),
        getClassDisplayName(item as unknown as Record<string, unknown>, meta.className),
        item.date,
        item.dayName,
      ]);
      row.height = 20;
      setRowStyles(row, [
        STYLES.nameCellBoldOnly,
        STATUS_PRESETS.Absent.cellStyle9,
        STYLES.idCellDefault,
        centerStyle,
        centerStyle,
        centerStyle,
      ]);
      if (shouldYieldAfterRow(index)) await yieldToUI();
    }

    [28, 16, 16, 14, 14, 14].forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    if (records.length) {
      worksheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3 + records.length, column: 6 },
      };
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(buffer, `Mowathib_Daily_Absence_${meta.academicYear}_${getClassDisplayName(undefined, meta.className)}_${meta.date}.xlsx`);
  },

  // ---------------------------------------------------------------------------
  // 5.5 STAGE WEEKLY ATTENDANCE (SUMMARY + CLASS SHEETS)
  // ---------------------------------------------------------------------------

  async exportStageBatchReport(stageData: {
    stageNumber: 1 | 2 | 3;
    stageName: string;
    academicYear: string;
    weekNumber: number;
    weekRange: string;
    schoolName?: string;
    classesData: Array<{
      classItem: ClassItem;
      representativeName?: string;
      enrollments: ClassEnrollment[];
      records: AttendanceRecord[];
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const schoolName = getSchoolName(stageData.schoolName);
    const { dayHeaders, flatSlots } = getWeeklyScheduleLayout();
    const slotCount = flatSlots.length;
    const classLastColumn = 2 + slotCount + 3; // AL for the 33-period schedule.

    const summarySheet = workbook.addWorksheet('ملخص المرحلة', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 6 }],
    });

    summarySheet.pageSetup = {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    };

    addTitleAndMeta(
      summarySheet,
      8,
      `${schoolName} — التقرير الشامل لحضور وغياب ${stageData.stageName}`,
      `العام الدراسي: ${stageData.academicYear} | الأسبوع الدراسي: ${stageData.weekNumber} (${stageData.weekRange}) | عدد الشعب: ${stageData.classesData.length} | تاريخ الإصدار: ${getFastArabicDateString()}`,
      STYLES.title15
    );
    summarySheet.getRow(3).height = 10;

    let stageStudents = 0;
    let stagePresent = 0;
    let stageAbsent = 0;

    const preparedClasses = stageData.classesData.map((classData) => {
      const recordIndex = indexClassRecordsFlat(classData.records);
      const studentCount = classData.enrollments.length;
      stageStudents += studentCount;

      let classPresent = 0;
      let classAbsent = 0;
      let classDiscontinued = 0;

      const studentRows: Array<{
        values: Array<string | number>;
        styles: Array<Partial<ExcelJS.Style> | undefined>;
      }> = new Array(studentCount);

      for (let studentIndex = 0; studentIndex < studentCount; studentIndex++) {
        const enrollment = classData.enrollments[studentIndex];
        const baseKey = enrollment.enrollmentId * 64;
       const values: Array<string | number> = [
          enrollment.studentName ?? enrollment.student?.fullName ?? '',
        ];
        const styles: Array<Partial<ExcelJS.Style> | undefined> = [
          STYLES.nameCellStage10,
        ];

        let studentPresent = 0;
        let studentAbsent = 0;

        for (const slot of flatSlots) {
          const status = recordIndex.get(baseKey + slot.slotOffset);
          if (status === 'Present') {
            values.push('ح');
            styles.push(STATUS_PRESETS.Present.cellStyle9);
            studentPresent++;
            classPresent++;
          } else if (status === 'Absent') {
            values.push('غ');
            styles.push(STATUS_PRESETS.Absent.cellStyle9);
            studentAbsent++;
            classAbsent++;
          } else if (status === 'Discontinued') {
            values.push('م');
            styles.push(STATUS_PRESETS.Discontinued.cellStyle9);
            classDiscontinued++;
          } else {
            values.push('-');
            styles.push(STYLES.stageUnmarked9);
          }
        }

        const recorded = studentPresent + studentAbsent;
        const studentRate = recorded ? (studentPresent / recorded) * 100 : 0;
        values.push(String(enrollment.student?.nationalId ?? ''));
        styles.push(STYLES.idCellStage9);
        values.push(studentPresent, studentAbsent, `${studentRate.toFixed(0)}%`);
        styles.push(STYLES.stageColPresent, STYLES.stageColAbsent, STYLES.stageColRate);

        studentRows[studentIndex] = { values, styles };
      }

      stagePresent += classPresent;
      stageAbsent += classAbsent;

      const recorded = classPresent + classAbsent;
      const attendanceRate = recorded ? (classPresent / recorded) * 100 : 0;
      const absenceRate = recorded ? (classAbsent / recorded) * 100 : 0;

      return {
        ...classData,
        studentCount,
        present: classPresent,
        absent: classAbsent,
        discontinued: classDiscontinued,
        attendanceRate,
        absenceRate,
        studentRows,
      };
    });

    const stageRecorded = stagePresent + stageAbsent;
    const stageAttendanceRate = stageRecorded ? (stagePresent / stageRecorded) * 100 : 0;
    const stageAbsenceRate = stageRecorded ? (stageAbsent / stageRecorded) * 100 : 0;

    // KPI row blocks.
    const kpiGroups = [
      { first: 1, last: 2, label: 'إجمالي طلاب المرحلة', value: `${stageStudents} طالب`, fill: FILL_PERIOD_ALT, color: COLORS.text },
      { first: 3, last: 4, label: 'إجمالي الحضور المسجل', value: `${stagePresent} حصة`, fill: FILL_PRESENT, color: COLORS.presentText },
      { first: 5, last: 6, label: 'إجمالي الغياب المسجل', value: `${stageAbsent} حصة`, fill: FILL_ABSENT, color: COLORS.absentText },
      { first: 7, last: 8, label: 'النسبة العامة لحضور المرحلة', value: `${stageAttendanceRate.toFixed(1)}%`, fill: solidFill('FFE8F1F1'), color: COLORS.teal },
    ];

    for (const group of kpiGroups) {
      summarySheet.mergeCells(4, group.first, 4, group.last);
      summarySheet.mergeCells(5, group.first, 5, group.last);
      const labelCell = summarySheet.getCell(4, group.first);
      const valueCell = summarySheet.getCell(5, group.first);
      labelCell.value = group.label;
      valueCell.value = group.value;
      labelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: group.color } };
      valueCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: group.color } };
      labelCell.alignment = ALIGN_CENTER;
      valueCell.alignment = ALIGN_CENTER;
      labelCell.fill = group.fill;
      valueCell.fill = group.fill;
    }

    for (let row = 4; row <= 5; row++) {
      for (let col = 1; col <= 8; col++) summarySheet.getCell(row, col).border = BORDER_THIN;
    }
    summarySheet.getRow(4).height = 18;
    summarySheet.getRow(5).height = 24;

    const summaryHeaders = [
      'م', 'الشعبة / الفصل', 'عدد الطلاب المقيدين', 'إجمالي الحضور (حصة)',
      'إجمالي الغياب (حصة)', 'نسبة الحضور', 'نسبة الغياب', 'عريف الصف المعتمد',
    ];
    const summaryHeader = summarySheet.addRow(summaryHeaders);
    summaryHeader.height = 26;
    applyHeaderStyle(summaryHeader, 8, STYLES.headerTeal11);

    for (let index = 0; index < preparedClasses.length; index++) {
      const item = preparedClasses[index];
      const zebra = index % 2 === 1;
      const base = zebra ? STYLES.summaryCellZebra : STYLES.summaryCellNormal;
      const row = summarySheet.addRow([
        index + 1,
        getClassDisplayName(item.classItem),
        item.studentCount,
        item.present,
        item.absent,
        `${item.attendanceRate.toFixed(1)}%`,
        `${item.absenceRate.toFixed(1)}%`,
        item.representativeName || 'غير مسند',
      ]);
      row.height = 22;
      setRowStyles(row, [
        base,
        zebra ? STYLES.stageColRateZebra : STYLES.stageColRate,
        base,
        base,
        base,
        zebra ? STYLES.stageColPresentZebra : STYLES.stageColPresent,
        zebra ? STYLES.stageColAbsentZebra : STYLES.stageColAbsent,
        base,
      ]);
      if (shouldYieldAfterRow(index)) await yieldToUI();
    }

    const totalRow = summarySheet.addRow([
      'الإجمالي العام للمرحلة', `${preparedClasses.length} شعبة`, stageStudents,
      stagePresent, stageAbsent, `${stageAttendanceRate.toFixed(1)}%`,
      `${stageAbsenceRate.toFixed(1)}%`, '—',
    ]);
    totalRow.height = 26;
    for (let col = 1; col <= 8; col++) totalRow.getCell(col).style = STYLES.summaryFooter11;

    [6, 20, 20, 22, 22, 16, 16, 24].forEach((width, index) => {
      summarySheet.getColumn(index + 1).width = width;
    });

    if (preparedClasses.length) {
      summarySheet.autoFilter = {
        from: { row: 6, column: 1 },
        to: { row: 6 + preparedClasses.length, column: 8 },
      };
    }

    // Class worksheets. Names are made unique to prevent duplicate-name errors.
    for (let classIndex = 0; classIndex < preparedClasses.length; classIndex++) {
      await yieldToUI();
      const item = preparedClasses[classIndex];
      const requestedName = getClassDisplayName(item.classItem, `شعبة ${classIndex + 1}`);
      const sheetName = getUniqueWorksheetName(workbook, requestedName, `Class ${classIndex + 1}`);
      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 5 }],
      });

      worksheet.pageSetup = {
        orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      };

      addTitleAndMeta(
        worksheet,
        classLastColumn,
        `${schoolName} — سجل الحضور والغياب الأسبوعي: ${getClassDisplayName(item.classItem)} (${stageData.stageName})`,
        `العام الدراسي: ${stageData.academicYear} | الأسبوع ${stageData.weekNumber} (${stageData.weekRange}) | عدد الطلاب: ${item.studentCount} | العريف: ${item.representativeName || 'غير مسند'}`,
        STYLES.title13
      );

      worksheet.mergeCells('A4:A5');
      worksheet.getCell('A4').value = 'اسم الطالب';
      const nationalIdColumn = 2 + slotCount;
      worksheet.mergeCells(4, nationalIdColumn, 5, nationalIdColumn);
      worksheet.getCell(4, nationalIdColumn).value = 'رقم الهوية';
      worksheet.getCell(4, nationalIdColumn).style = STYLES.headerGray10;
      worksheet.getRow(5).getCell(nationalIdColumn).style = STYLES.headerGray10;

      const top = worksheet.getRow(4);
      const bottom = worksheet.getRow(5);
      top.height = 22;
      bottom.height = 20;

      for (const day of dayHeaders) {
        worksheet.mergeCells(4, day.startCol, 5, day.endCol);
        const dayCell = worksheet.getCell(4, day.startCol);
        dayCell.value = day.name;
        dayCell.style = STYLES.headerGray11;
        bottom.getCell(day.startCol).style = STYLES.headerGray11;
      }

      worksheet.getCell('A4').style = STYLES.headerGray10;

      const colPresent = 3 + slotCount;
      const colAbsent = 4 + slotCount;
      const colRate = 5 + slotCount;

      worksheet.mergeCells(4, colPresent, 5, colPresent);
      worksheet.getCell(4, colPresent).value = 'حاضر';
      worksheet.getCell(4, colPresent).style = STYLES.headerGray10;

      worksheet.mergeCells(4, colAbsent, 5, colAbsent);
      worksheet.getCell(4, colAbsent).value = 'غائب';
      worksheet.getCell(4, colAbsent).style = STYLES.headerGray10;

      worksheet.mergeCells(4, colRate, 5, colRate);
      worksheet.getCell(4, colRate).value = 'النسبة %';
      worksheet.getCell(4, colRate).style = STYLES.headerGray10;

      for (let studentIndex = 0; studentIndex < item.studentRows.length; studentIndex++) {
        const student = item.studentRows[studentIndex];
        const zebra = studentIndex % 2 === 1;
        student.styles[0] = zebra ? STYLES.nameCellStage10Zebra : STYLES.nameCellStage10;
        student.styles[1 + slotCount] = zebra ? STYLES.idCellStage9Zebra : STYLES.idCellStage9;
        student.styles[2 + slotCount] = zebra ? STYLES.stageColPresentZebra : STYLES.stageColPresent;
        student.styles[3 + slotCount] = zebra ? STYLES.stageColAbsentZebra : STYLES.stageColAbsent;
        student.styles[4 + slotCount] = zebra ? STYLES.stageColRateZebra : STYLES.stageColRate;

        const row = worksheet.addRow(student.values);
        row.height = 20;
        setRowStyles(row, student.styles);
        if (shouldYieldAfterRow(studentIndex)) await yieldToUI();
      }

      const totalValues: Array<string | number> = [
        'المجموع الإجمالي',
        ...Array.from({ length: slotCount }, () => '—'),
        '—',
        item.present,
        item.absent,
        `${item.attendanceRate.toFixed(1)}%`,
      ];

      const totalRowClass = worksheet.addRow(totalValues);
      totalRowClass.height = 24;
      for (let column = 1; column <= classLastColumn; column++) {
        totalRowClass.getCell(column).style = STYLES.summaryFooter10;
      }

      worksheet.getColumn(1).width = 28;
      for (let column = 2; column <= 1 + slotCount; column++) {
        worksheet.getColumn(column).width = 4.2;
      }
      worksheet.getColumn(2 + slotCount).width = 16;
      worksheet.getColumn(3 + slotCount).width = 12;
      worksheet.getColumn(4 + slotCount).width = 12;
      worksheet.getColumn(5 + slotCount).width = 12;

      if (item.studentCount) {
        worksheet.autoFilter = {
          from: { row: 5, column: 1 },
          to: { row: 5 + item.studentCount, column: classLastColumn },
        };
      }
    }

    const buffer = await writeWorkbookFast(workbook);
    const stageSlug = stageData.stageName.replace(/\s+/g, '_');
    saveExcelFile(buffer, `Mowathib_${stageSlug}_Week_${stageData.weekNumber}_${stageData.academicYear}.xlsx`);
  },

  // ---------------------------------------------------------------------------
  // 5.6 STAGE DAILY ABSENCE
  // ---------------------------------------------------------------------------

  async exportStageDailyAbsenceReport(params: {
    stageNumber: number;
    stageName: string;
    academicYear: string;
    date: string;
    dayName: string;
    schoolName?: string;
    classesData: Array<{
      classItem: ClassItem;
      representativeName?: string;
      enrollments: ClassEnrollment[];
      records: AttendanceRecord[];
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    const processed = params.classesData.map((classData) => {
      const absentEnrollments = new Set<number>();
      for (const record of classData.records) {
        if (record.status === 'Absent') {
          absentEnrollments.add(record.enrollmentId);
        }
      }

      const totalStudents = classData.enrollments.length;
      const absentStudents = absentEnrollments.size;
      const rate = totalStudents
        ? ((totalStudents - absentStudents) / totalStudents) * 100
        : 100;

      return {
        classData,
        className: getClassDisplayName(classData.classItem),
        totalStudents,
        absentStudents,
        rate,
        absentEnrollments,
      };
    });

    const totalStudents = processed.reduce((sum, item) => sum + item.totalStudents, 0);
    const totalAbsentStudents = processed.reduce((sum, item) => sum + item.absentStudents, 0);
    const overallRate = totalStudents
      ? ((totalStudents - totalAbsentStudents) / totalStudents) * 100
      : 100;

    const summary = workbook.addWorksheet('ملخص المرحلة', {
      views: [{ rightToLeft: true }],
    });

    addTitleAndMeta(
      summary,
      6,
      `${schoolName} — كشف الغياب اليومي المجمع لـ ${params.stageName}`,
      `العام الدراسي: ${params.academicYear} | اليوم: ${params.dayName} (${params.date}) | تاريخ الاستخراج: ${getFastArabicDateString()}`
    );

    summary.addRow([]);
    const kpi = summary.addRow([
      'إجمالي طلاب المرحلة', totalStudents,
      'إجمالي الغائبين', totalAbsentStudents,
      'نسبة الحضور العامة', `${overallRate.toFixed(1)}%`,
    ]);
    kpi.height = 24;
    kpi.eachCell((cell, column) => {
      cell.border = BORDER_THIN;
      cell.alignment = ALIGN_CENTER;
      cell.font = { name: 'Arial', size: column % 2 ? 10 : 11, bold: true };
      if (column % 2) cell.fill = FILL_META;
    });

    summary.addRow([]);
    const header = summary.addRow([
      'م', 'الشعبة', 'العريف المسؤول', 'إجمالي الطلاب', 'عدد الطلاب الغائبين', 'نسبة الحضور',
    ]);
    header.height = 24;
    applyHeaderStyle(header, 6, STYLES.headerTeal10);

    for (let index = 0; index < processed.length; index++) {
      const item = processed[index];
      const zebra = index % 2 === 1;
      const center = zebra ? STYLES.centerZebra : STYLES.centerDefault;
      const right = zebra ? STYLES.rightZebra : STYLES.rightDefault;
      const row = summary.addRow([
        index + 1,
        `شعبة ${item.className}`,
        item.classData.representativeName || '—',
        item.totalStudents,
        item.absentStudents,
        `${item.rate.toFixed(1)}%`,
      ]);
      row.height = 20;
      setRowStyles(row, [
        center, right, right, center,
        item.absentStudents ? STYLES.absentAlertCell : center,
        center,
      ]);
      if (shouldYieldAfterRow(index)) await yieldToUI();
    }

    const totalRow = summary.addRow([
      'الإجمالي', `${processed.length} شعب`, '—', totalStudents,
      totalAbsentStudents, `${overallRate.toFixed(1)}%`,
    ]);
    for (let column = 1; column <= 6; column++) {
      totalRow.getCell(column).style = STYLES.summaryFooter10;
    }

    [6, 16, 24, 16, 18, 16].forEach((width, index) => {
      summary.getColumn(index + 1).width = width;
    });

    for (let classIndex = 0; classIndex < processed.length; classIndex++) {
      await yieldToUI();
      const item = processed[classIndex];
      const worksheet = workbook.addWorksheet(
        getUniqueWorksheetName(workbook, `شعبة ${item.className}`, `Class ${classIndex + 1}`),
        { views: [{ rightToLeft: true }] }
      );

      addTitleAndMeta(
        worksheet,
        5,
        `${schoolName} — كشف غياب شعبة ${item.className} (${params.dayName} ${params.date})`,
        `العريف المسؤول: ${item.classData.representativeName || 'غير معين'} | إجمالي طلاب الشعبة: ${item.totalStudents} طالب`,
        STYLES.title13
      );

      const absentStudents: ClassEnrollment[] = [];

      for (const enrollment of item.classData.enrollments) {
        if (item.absentEnrollments.has(enrollment.enrollmentId)) {
          absentStudents.push(enrollment);
        }
      }

      if (!absentStudents.length) {
        worksheet.mergeCells('A4:E4');
        const note = worksheet.getCell('A4');
        note.value = '✓ لا توجد أي حالات غياب مسجلة لهذه الشعبة اليوم (نسبة انضباط 100%)';
        note.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.presentText } };
        note.fill = FILL_PRESENT;
        note.alignment = ALIGN_CENTER;
        worksheet.getRow(4).height = 32;
      } else {
        const classHeader = worksheet.addRow([
          'اسم الطالب', 'حالة الحضور', 'رقم الهوية الوطنية', 'اليوم', 'م',
        ]);
        classHeader.height = 22;
        applyHeaderStyle(classHeader, 5, STYLES.headerRed10);

        for (let index = 0; index < absentStudents.length; index++) {
          const enrollment = absentStudents[index];
          const zebra = index % 2 === 1;
          const center = zebra ? STYLES.centerZebra : STYLES.centerDefault;
          const right = zebra ? STYLES.rightZebra : STYLES.rightDefault;
          const row = worksheet.addRow([
            enrollment.studentName || enrollment.student?.fullName || '',
            'غائب (كامل اليوم)',
            String(enrollment.student?.nationalId ?? ''),
            params.dayName,
            index + 1,
          ]);
          row.height = 20;
          setRowStyles(row, [right, STATUS_PRESETS.Absent.cellStyle9, center, center, center]);
          if (shouldYieldAfterRow(index)) await yieldToUI();
        }
      }

      [28, 20, 18, 14, 6].forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
      });
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Daily_Absence_${params.stageName.replace(/\s+/g, '_')}_${params.date}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.7 STAGE WEEKLY ABSENCE
  // ---------------------------------------------------------------------------

  async exportStageWeeklyAbsenceReport(params: {
    stageNumber: number;
    stageName: string;
    academicYear: string;
    weekNumber: number;
    weekRange: string;
    schoolName?: string;
    classesData: Array<{
      classItem: ClassItem;
      representativeName?: string;
      enrollments: ClassEnrollment[];
      records: AttendanceRecord[];
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    const processed = params.classesData.map((classData) => {
      const absences = new Map<number, Int32Array>();
      let absentSlots = 0;
      let presentSlots = 0;

      for (const record of classData.records) {
        if (record.status === 'Present') {
          presentSlots++;
        } else if (record.status === 'Absent') {
          absentSlots++;
          let counts = absences.get(record.enrollmentId);
          if (!counts) {
            counts = new Int32Array(6);
            absences.set(record.enrollmentId, counts);
          }
          if (record.dayNumber >= 1 && record.dayNumber <= 5) {
            counts[record.dayNumber]++;
          }
          counts[0]++;
        }
      }

      // Daily attendance: total expected attendance days in the week (5 days)
      const totalExpected = classData.enrollments.length * 5;
      const rate = totalExpected > 0
        ? ((totalExpected - absentSlots) / totalExpected) * 100
        : 100;

      return {
        classData,
        className: getClassDisplayName(classData.classItem),
        totalStudents: classData.enrollments.length,
        absentSlots,
        presentSlots,
        totalExpected,
        rate,
        absences,
      };
    });

    const summary = workbook.addWorksheet('ملخص الأسبوع', {
      views: [{ rightToLeft: true }],
    });

    addTitleAndMeta(
      summary,
      6,
      `${schoolName} — كشف الغياب الأسبوعي المجمع لـ ${params.stageName}`,
      `العام الدراسي: ${params.academicYear} | الأسبوع: ${params.weekNumber} (${params.weekRange}) | تاريخ الاستخراج: ${getFastArabicDateString()}`
    );

    const header = summary.addRow([
      'م', 'الشعبة', 'العريف المسؤول', 'إجمالي الطلاب', 'إجمالي أيام الغياب', 'نسبة الحضور',
    ]);
    header.height = 24;
    applyHeaderStyle(header, 6, STYLES.headerTeal10);

    for (let index = 0; index < processed.length; index++) {
      const item = processed[index];
      const zebra = index % 2 === 1;
      const center = zebra ? STYLES.centerZebra : STYLES.centerDefault;
      const right = zebra ? STYLES.rightZebra : STYLES.rightDefault;
      const row = summary.addRow([
        index + 1,
        `شعبة ${item.className}`,
        item.classData.representativeName || '—',
        item.totalStudents,
        item.absentSlots,
        `${item.rate.toFixed(1)}%`,
      ]);
      row.height = 20;
      setRowStyles(row, [
        center, right, right, center,
        item.absentSlots ? STYLES.absentAlertCell : center,
        center,
      ]);
      if (shouldYieldAfterRow(index)) await yieldToUI();
    }

    [6, 16, 24, 16, 18, 16].forEach((width, index) => {
      summary.getColumn(index + 1).width = width;
    });

    for (let classIndex = 0; classIndex < processed.length; classIndex++) {
      await yieldToUI();
      const item = processed[classIndex];
      const worksheet = workbook.addWorksheet(
        getUniqueWorksheetName(workbook, `شعبة ${item.className}`, `Class ${classIndex + 1}`),
        { views: [{ rightToLeft: true }] }
      );

      addTitleAndMeta(
        worksheet,
        9,
        `${schoolName} — غياب شعبة ${item.className} (الأسبوع ${params.weekNumber})`,
        `العام الدراسي: ${params.academicYear} | الفترة: ${params.weekRange}`,
        STYLES.title13
      );

      const headerRow = worksheet.addRow([
        'اسم الطالب', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس',
        'إجمالي الغياب', 'رقم الهوية', 'م',
      ]);
      headerRow.height = 22;
      applyHeaderStyle(headerRow, 9, STYLES.headerTeal10);

      for (let studentIndex = 0; studentIndex < item.classData.enrollments.length; studentIndex++) {
        const enrollment = item.classData.enrollments[studentIndex];
        const counts = item.absences.get(enrollment.enrollmentId);
        const dailyCounts = [1, 2, 3, 4, 5].map((day) => counts?.[day] ?? 0);
        const totalAbsent = counts?.[0] ?? 0;
        const zebra = studentIndex % 2 === 1;
        const center = zebra ? STYLES.centerZebra : STYLES.centerDefault;
        const right = zebra ? STYLES.rightZebra : STYLES.rightDefault;

        const row = worksheet.addRow([
          enrollment.studentName || enrollment.student?.fullName || '',
          ...dailyCounts.map((count) => count ? `${count} حصة` : '—'),
          totalAbsent,
          String(enrollment.student?.nationalId ?? ''),
          studentIndex + 1,
        ]);
        row.height = 20;
        setRowStyles(row, [
          right, center, center, center, center, center,
          totalAbsent ? STYLES.absentAlertCell : center,
          center, center,
        ]);
        if (shouldYieldAfterRow(studentIndex)) await yieldToUI();
      }

      [28, 12, 12, 12, 12, 12, 14, 16, 6].forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
      });
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Weekly_Absence_${params.stageName.replace(/\s+/g, '_')}_Week_${params.weekNumber}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.8 STAGE MONTHLY ABSENCE
  // ---------------------------------------------------------------------------

  async exportStageMonthlyAbsenceReport(params: {
    stageNumber: number;
    stageName: string;
    academicYear: string;
    monthStr: string;
    schoolName?: string;
    classesData: Array<{
      classItem: ClassItem;
      representativeName?: string;
      enrollments: ClassEnrollment[];
      monthlySummary: MonthlyStudentSummaryRow[];
      detailedAbsences: MonthlyDetailedAbsenceRow[];
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    const summary = workbook.addWorksheet('ملخص الشهر', {
      views: [{ rightToLeft: true }],
    });

    addTitleAndMeta(
      summary,
      6,
      `${schoolName} — كشف الغياب الشهري المجمع لـ ${params.stageName} (${params.monthStr})`,
      `العام الدراسي: ${params.academicYear} | الشهر: ${params.monthStr}`
    );

    const header = summary.addRow([
      'م', 'الشعبة', 'العريف المسؤول', 'إجمالي الطلاب', 'إجمالي حصص الغياب', 'نسبة الحضور',
    ]);
    header.height = 24;
    applyHeaderStyle(header, 6, STYLES.headerTeal10);

    for (let index = 0; index < params.classesData.length; index++) {
      const classData = params.classesData[index];
      const className = getClassDisplayName(classData.classItem);
      const totalStudents = classData.enrollments.length;

      let totalAbsences = 0;
      let rateSum = 0;
      for (const student of classData.monthlySummary) {
        totalAbsences += student.absentCount;
        rateSum += student.attendanceRate;
      }
      const averageRate = classData.monthlySummary.length
        ? rateSum / classData.monthlySummary.length
        : 100;

      const zebra = index % 2 === 1;
      const center = zebra ? STYLES.centerZebra : STYLES.centerDefault;
      const right = zebra ? STYLES.rightZebra : STYLES.rightDefault;
      const row = summary.addRow([
        index + 1,
        `شعبة ${className}`,
        classData.representativeName || '—',
        totalStudents,
        totalAbsences,
        `${averageRate.toFixed(1)}%`,
      ]);
      row.height = 20;
      setRowStyles(row, [center, right, right, center, center, center]);
      if (shouldYieldAfterRow(index)) await yieldToUI();
    }

    [6, 16, 24, 16, 18, 16].forEach((width, index) => {
      summary.getColumn(index + 1).width = width;
    });

    for (let classIndex = 0; classIndex < params.classesData.length; classIndex++) {
      await yieldToUI();
      const classData = params.classesData[classIndex];
      const className = getClassDisplayName(classData.classItem);
      const worksheet = workbook.addWorksheet(
        getUniqueWorksheetName(workbook, `شعبة ${className}`, `Class ${classIndex + 1}`),
        { views: [{ rightToLeft: true }] }
      );

      addTitleAndMeta(
        worksheet,
        7,
        `${schoolName} — غياب شعبة ${className} (${params.monthStr})`,
        `العام الدراسي: ${params.academicYear} | الشهر: ${params.monthStr}`,
        STYLES.title13
      );

      const classHeader = worksheet.addRow([
        'اسم الطالب', 'حضور', 'غياب', 'نسبة الحضور', 'الحصص المتوقعة', 'رقم الهوية', 'م',
      ]);
      classHeader.height = 22;
      applyHeaderStyle(classHeader, 7, STYLES.headerTeal10);

      for (let studentIndex = 0; studentIndex < classData.monthlySummary.length; studentIndex++) {
        const student = classData.monthlySummary[studentIndex];
        const zebra = studentIndex % 2 === 1;
        const center = zebra ? STYLES.centerZebra : STYLES.centerDefault;
        const right = zebra ? STYLES.rightZebra : STYLES.rightDefault;
        const row = worksheet.addRow([
          student.studentName,
          student.presentCount,
          student.absentCount,
          `${student.attendanceRate.toFixed(1)}%`,
          student.totalExpected,
          String(student.nationalId ?? ''),
          studentIndex + 1,
        ]);
        row.height = 20;
        setRowStyles(row, [
          right,
          STATUS_PRESETS.Present.cellStyle9,
          student.absentCount > 0 ? STYLES.absentAlertCell : center,
          STYLES.stageColRate,
          center,
          STYLES.idCellDefault,
          center,
        ]);
        if (shouldYieldAfterRow(studentIndex)) await yieldToUI();
      }

      [28, 12, 12, 14, 14, 16, 6].forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
      });
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Monthly_Absence_${params.stageName.replace(/\s+/g, '_')}_${params.monthStr}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.9 SINGLE GRADE WEEKLY PREPARATION
  // ---------------------------------------------------------------------------

  async exportGradeWeeklyPreparation(params: {
    gradeName: string;
    weekNumber: number;
    weekRange: string;
    academicYear?: string;
    classesData: GradeClassExportData[];
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const sheetName = getUniqueWorksheetName(workbook, params.gradeName, 'كشف المرحلة');
    const schoolName = getSchoolName();
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 2 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    let currentRow = 1;
    for (let index = 0; index < params.classesData.length; index++) {
      await yieldToUI();
      currentRow = appendClassWeeklyPreparationToWorksheet(
        worksheet,
        currentRow,
        params.classesData[index],
        {
          weekNumber: params.weekNumber,
          weekRange: params.weekRange,
          academicYear: params.academicYear,
          schoolName,
        }
      );
      currentRow += 2;
    }

    configureIdentityColumns(worksheet, 2 + 5, 12);
    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Weekly_${sheetName.replace(/\s+/g, '_')}_Week${params.weekNumber}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.10 ALL GRADES WEEKLY PREPARATION (DASHBOARD EXPORT)
  // ---------------------------------------------------------------------------

  async exportAllGradesWeeklyPreparation(params: {
    weekNumber: number;
    weekRange: string;
    academicYear?: string;
    schoolName?: string;
    gradesData: Array<{
      gradeName: string;
      classesData: GradeClassExportData[];
    }>;
  }): Promise<void> {
    if (!params.gradesData?.length) {
      throw new Error('لا توجد مراحل دراسية لتصديرها.');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    for (let gradeIndex = 0; gradeIndex < params.gradesData.length; gradeIndex++) {
      await yieldToUI();
      const grade = params.gradesData[gradeIndex];
      const sheetName = getUniqueWorksheetName(
        workbook,
        grade.gradeName,
        `مرحلة ${gradeIndex + 1}`
      );

      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 2 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      let currentRow = 1;
      for (let classIndex = 0; classIndex < grade.classesData.length; classIndex++) {
        currentRow = appendClassWeeklyPreparationToWorksheet(
          worksheet,
          currentRow,
          grade.classesData[classIndex],
          {
            weekNumber: params.weekNumber,
            weekRange: params.weekRange,
            academicYear: params.academicYear,
            schoolName,
          }
        );
        currentRow += 2;
        if (shouldYieldAfterRow(classIndex)) await yieldToUI();
      }

      configureIdentityColumns(worksheet, 2 + 5, 12);
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Weekly_Preparation_All_Grades_Week${params.weekNumber}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.11 FIVE CONSECUTIVE WEEKS MONTHLY PREPARATION
  // ---------------------------------------------------------------------------

  async exportFiveWeeksMonthlyPreparation(params: {
    className: string | number;
    classNumber?: number;
    academicYear?: string;
    referenceWeekNumber: number;
    weeksData: Array<{
      weekNumber: number;
      weekRange: string;
      attendances: StudentWeeklyAttendance[];
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const classLabel = getClassDisplayName(undefined, params.classNumber) !== '—'
      ? getClassDisplayName(undefined, params.classNumber)
      : getClassDisplayName(undefined, params.className) !== '—'
        ? getClassDisplayName(undefined, params.className)
        : 'class';
    const schoolName = getSchoolName();
    const sheetName = getUniqueWorksheetName(
      workbook,
      `شهري 5 أسابيع شعبة ${classLabel}`,
      'تحضير شهري'
    );

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 2 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    let currentRow = 1;
    for (let weekIndex = 0; weekIndex < params.weeksData.length; weekIndex++) {
      await yieldToUI();
      const week = params.weeksData[weekIndex];
      currentRow = appendClassWeeklyPreparationToWorksheet(
        worksheet,
        currentRow,
        {
          className: params.className,
          classNumber: params.classNumber,
          attendances: week.attendances,
        },
        {
          weekNumber: week.weekNumber,
          weekRange: week.weekRange,
          academicYear: params.academicYear,
          schoolName,
        }
      );
      currentRow += 3;
    }

    configureIdentityColumns(worksheet, 2 + 5, 12);
    const buffer = await writeWorkbookFast(workbook);
    const safeClass = sanitizeFilename(classLabel).replace(/\.xlsx$/i, '');
    saveExcelFile(
      buffer,
      `Mowathib_Monthly_5Weeks_Class${safeClass}_RefWeek${params.referenceWeekNumber}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.12 GRADE DAILY ATTENDANCE (التقرير اليومي لمرحلة محددة)
  // ---------------------------------------------------------------------------

  async exportGradeDailyReport(params: {
    gradeName: string;
    academicYear: string;
    date: string;
    dayName: string;
    schoolName?: string;
    classesData: Array<{
      classItem: ClassItem;
      enrollments: ClassEnrollment[];
      records: AttendanceRecord[];
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    // 1. Sheet 1: Summary of the Grade
    const summarySheet = workbook.addWorksheet('ملخص المرحلة اليومي', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 5 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    addTitleAndMeta(
      summarySheet,
      7,
      `${schoolName} — ملخص الحضور اليومي لـ ${params.gradeName}`,
      `العام الدراسي: ${params.academicYear} | اليوم: ${params.dayName} (${params.date}) | عدد الشعب: ${params.classesData.length} | تاريخ الاستخراج: ${getFastArabicDateString()}`,
      STYLES.title14
    );

    summarySheet.addRow([]);

    let totalGradeStudents = 0;
    let totalGradePresent = 0;
    let totalGradeAbsent = 0;
    let totalGradeDiscontinued = 0;

    const classSummaries = params.classesData.map((cd) => {
      const studentCount = cd.enrollments.length;
      let present = 0;
      let absent = 0;
      let discontinued = 0;

      const recordsMap = new Map<number, string>();
      cd.records.forEach((r) => recordsMap.set(r.enrollmentId, r.status));

      cd.enrollments.forEach((e) => {
        const st = recordsMap.get(e.enrollmentId);
        if (st === 'Present') present++;
        else if (st === 'Absent') absent++;
        else if (st === 'Discontinued') discontinued++;
      });

      totalGradeStudents += studentCount;
      totalGradePresent += present;
      totalGradeAbsent += absent;
      totalGradeDiscontinued += discontinued;

      const recorded = present + absent;
      const rate = recorded ? (present / recorded) * 100 : studentCount ? (present / studentCount) * 100 : 100;

      return {
        classItem: cd.classItem,
        className: getClassDisplayName(cd.classItem),
        studentCount,
        present,
        absent,
        discontinued,
        rate,
        enrollments: cd.enrollments,
        recordsMap,
      };
    });

    const overallRecorded = totalGradePresent + totalGradeAbsent;
    const overallRate = overallRecorded
      ? (totalGradePresent / overallRecorded) * 100
      : totalGradeStudents
      ? (totalGradePresent / totalGradeStudents) * 100
      : 100;

    // KPI Cards row
    const kpiRow = summarySheet.addRow([
      'إجمالي طلاب المرحلة',
      totalGradeStudents,
      'إجمالي الحاضرين',
      totalGradePresent,
      'إجمالي الغائبين',
      totalGradeAbsent,
      'نسبة الحضور العامة',
      `${overallRate.toFixed(1)}%`,
    ]);
    kpiRow.height = 24;
    kpiRow.getCell(1).style = STYLES.metaBold10;
    kpiRow.getCell(2).style = STYLES.totalBold10;
    kpiRow.getCell(3).style = STYLES.stageColPresent;
    kpiRow.getCell(4).style = STYLES.stageColPresent;
    kpiRow.getCell(5).style = STYLES.stageColAbsent;
    kpiRow.getCell(6).style = STYLES.stageColAbsent;
    kpiRow.getCell(7).style = STYLES.stageColRate;
    kpiRow.getCell(8).style = STYLES.stageColRate;

    summarySheet.addRow([]);

    const summaryHeaders = [
      'م',
      'الشعبة الدراسية',
      'عدد الطلاب',
      'الحاضرون',
      'الغائبون',
      'المنقطعون',
      'نسبة الحضور',
    ];
    const sHeader = summarySheet.addRow(summaryHeaders);
    sHeader.height = 24;
    applyHeaderStyle(sHeader, 7);

    classSummaries.forEach((cs, idx) => {
      const row = summarySheet.addRow([
        idx + 1,
        cs.className,
        cs.studentCount,
        cs.present,
        cs.absent,
        cs.discontinued,
        `${cs.rate.toFixed(1)}%`,
      ]);
      row.height = 20;
      setRowStyles(row, [
        STYLES.centerDefault,
        STYLES.centerDefault,
        STYLES.centerDefault,
        STATUS_PRESETS.Present.cellStyle9,
        STATUS_PRESETS.Absent.cellStyle9,
        STATUS_PRESETS.Discontinued.cellStyle9,
        STYLES.stageColRate,
      ]);
    });

    summarySheet.getColumn(1).width = 6;
    summarySheet.getColumn(2).width = 20;
    summarySheet.getColumn(3).width = 14;
    summarySheet.getColumn(4).width = 14;
    summarySheet.getColumn(5).width = 14;
    summarySheet.getColumn(6).width = 14;
    summarySheet.getColumn(7).width = 16;

    // 2. Class Detail Sheets
    for (let cIdx = 0; cIdx < classSummaries.length; cIdx++) {
      await yieldToUI();
      const cs = classSummaries[cIdx];
      const sheetName = getUniqueWorksheetName(workbook, `شعبة ${cs.className}`, 'Class');
      const classSheet = workbook.addWorksheet(sheetName, {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      addTitleAndMeta(
        classSheet,
        6,
        `${schoolName} — كشف حضور شعبة ${cs.className} (${params.gradeName})`,
        `العام الدراسي: ${params.academicYear} | اليوم: ${params.dayName} (${params.date}) | الطلاب: ${cs.studentCount}`
      );
      classSheet.addRow([]);

      const cHeader = classSheet.addRow(['اسم الطالب', 'حالة الحضور', 'رقم الهوية', 'الشعبة', 'التاريخ', 'م']);
      cHeader.height = 22;
      applyHeaderStyle(cHeader, 6);

      cs.enrollments.forEach((e, sIdx) => {
        const rawStatus = cs.recordsMap.get(e.enrollmentId) as AttendanceStatus | undefined;
        const preset = getStatusStyle(rawStatus);
        const row = classSheet.addRow([
          e.studentName ?? e.student?.fullName ?? '',
          preset.label,
          String(e.student?.nationalId ?? ''),
          cs.className,
          params.date,
          sIdx + 1,
        ]);
        row.height = 20;
        setRowStyles(row, [
          STYLES.nameCell10,
          preset.cellStyle9,
          STYLES.idCell10,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
        ]);
      });

      classSheet.getColumn(1).width = 28;
      classSheet.getColumn(2).width = 16;
      classSheet.getColumn(3).width = 16;
      classSheet.getColumn(4).width = 14;
      classSheet.getColumn(5).width = 14;
      classSheet.getColumn(6).width = 6;
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Daily_Attendance_${sanitizeFilename(params.gradeName)}_${params.date}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.13 ALL GRADES DAILY ATTENDANCE (التقرير اليومي لجميع المراحل في ملف واحد)
  // ---------------------------------------------------------------------------

  async exportAllGradesDailyReport(params: {
    academicYear: string;
    date: string;
    dayName: string;
    schoolName?: string;
    gradesData: Array<{
      gradeId: number;
      gradeName: string;
      classesData: Array<{
        classItem: ClassItem;
        enrollments: ClassEnrollment[];
        records: AttendanceRecord[];
      }>;
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    // 1. School Summary Sheet
    const summarySheet = workbook.addWorksheet('ملخص المدرسة اليومي', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 5 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    addTitleAndMeta(
      summarySheet,
      8,
      `${schoolName} — التقرير اليومي العام لكافة المراحل والشعب`,
      `العام الدراسي: ${params.academicYear} | اليوم: ${params.dayName} (${params.date}) | تاريخ الاستخراج: ${getFastArabicDateString()}`,
      STYLES.title15
    );
    summarySheet.addRow([]);

    let grandTotalStudents = 0;
    let grandTotalPresent = 0;
    let grandTotalAbsent = 0;
    let grandTotalClasses = 0;

    const gradeSummaries = params.gradesData.map((gd) => {
      let gStudents = 0;
      let gPresent = 0;
      let gAbsent = 0;
      let gDiscontinued = 0;

      const processedClasses = gd.classesData.map((cd) => {
        const studentCount = cd.enrollments.length;
        let cPresent = 0;
        let cAbsent = 0;
        let cDiscontinued = 0;
        const recordsMap = new Map<number, string>();
        cd.records.forEach((r) => recordsMap.set(r.enrollmentId, r.status));

        cd.enrollments.forEach((e) => {
          const st = recordsMap.get(e.enrollmentId);
          if (st === 'Present') cPresent++;
          else if (st === 'Absent') cAbsent++;
          else if (st === 'Discontinued') cDiscontinued++;
        });

        gStudents += studentCount;
        gPresent += cPresent;
        gAbsent += cAbsent;
        gDiscontinued += cDiscontinued;

        return {
          classItem: cd.classItem,
          className: getClassDisplayName(cd.classItem),
          studentCount,
          present: cPresent,
          absent: cAbsent,
          discontinued: cDiscontinued,
          enrollments: cd.enrollments,
          recordsMap,
        };
      });

      grandTotalStudents += gStudents;
      grandTotalPresent += gPresent;
      grandTotalAbsent += gAbsent;
      grandTotalClasses += gd.classesData.length;

      const gRecorded = gPresent + gAbsent;
      const gRate = gRecorded ? (gPresent / gRecorded) * 100 : gStudents ? (gPresent / gStudents) * 100 : 100;

      return {
        ...gd,
        studentCount: gStudents,
        present: gPresent,
        absent: gAbsent,
        discontinued: gDiscontinued,
        rate: gRate,
        classes: processedClasses,
      };
    });

    const grandRecorded = grandTotalPresent + grandTotalAbsent;
    const grandRate = grandRecorded
      ? (grandTotalPresent / grandRecorded) * 100
      : grandTotalStudents
      ? (grandTotalPresent / grandTotalStudents) * 100
      : 100;

    const kpiRow = summarySheet.addRow([
      'إجمالي طلاب المدرسة',
      grandTotalStudents,
      'إجمالي الحاضرين',
      grandTotalPresent,
      'إجمالي الغائبين',
      grandTotalAbsent,
      'نسبة الحضور العامة',
      `${grandRate.toFixed(1)}%`,
    ]);
    kpiRow.height = 26;
    kpiRow.getCell(1).style = STYLES.metaBold10;
    kpiRow.getCell(2).style = STYLES.totalBold10;
    kpiRow.getCell(3).style = STYLES.stageColPresent;
    kpiRow.getCell(4).style = STYLES.stageColPresent;
    kpiRow.getCell(5).style = STYLES.stageColAbsent;
    kpiRow.getCell(6).style = STYLES.stageColAbsent;
    kpiRow.getCell(7).style = STYLES.stageColRate;
    kpiRow.getCell(8).style = STYLES.stageColRate;

    summarySheet.addRow([]);

    const headers = [
      'م',
      'المرحلة الدراسية',
      'عدد الشعب',
      'إجمالي الطلاب',
      'الحاضرون',
      'الغائبون',
      'المنقطعون',
      'نسبة الحضور',
    ];
    const sHeader = summarySheet.addRow(headers);
    sHeader.height = 24;
    applyHeaderStyle(sHeader, 8);

    gradeSummaries.forEach((gs, idx) => {
      const row = summarySheet.addRow([
        idx + 1,
        gs.gradeName,
        gs.classes.length,
        gs.studentCount,
        gs.present,
        gs.absent,
        gs.discontinued,
        `${gs.rate.toFixed(1)}%`,
      ]);
      row.height = 20;
      setRowStyles(row, [
        STYLES.centerDefault,
        STYLES.centerDefault,
        STYLES.centerDefault,
        STYLES.centerDefault,
        STATUS_PRESETS.Present.cellStyle9,
        STATUS_PRESETS.Absent.cellStyle9,
        STATUS_PRESETS.Discontinued.cellStyle9,
        STYLES.stageColRate,
      ]);
    });

    summarySheet.getColumn(1).width = 6;
    summarySheet.getColumn(2).width = 24;
    summarySheet.getColumn(3).width = 12;
    summarySheet.getColumn(4).width = 14;
    summarySheet.getColumn(5).width = 14;
    summarySheet.getColumn(6).width = 14;
    summarySheet.getColumn(7).width = 14;
    summarySheet.getColumn(8).width = 16;

    // 2. Add Worksheet per Grade with all students
    for (let gIdx = 0; gIdx < gradeSummaries.length; gIdx++) {
      await yieldToUI();
      const gs = gradeSummaries[gIdx];
      const sheetName = getUniqueWorksheetName(workbook, gs.gradeName, 'Grade');
      const gradeSheet = workbook.addWorksheet(sheetName, {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      addTitleAndMeta(
        gradeSheet,
        6,
        `${schoolName} — كشف حضور ${gs.gradeName}`,
        `العام الدراسي: ${params.academicYear} | اليوم: ${params.dayName} (${params.date}) | الطلاب: ${gs.studentCount}`
      );
      gradeSheet.addRow([]);

      const gHeader = gradeSheet.addRow(['اسم الطالب', 'حالة الحضور', 'رقم الهوية', 'الشعبة', 'التاريخ', 'م']);
      gHeader.height = 22;
      applyHeaderStyle(gHeader, 6);

      let rowIdx = 0;
      for (const cls of gs.classes) {
        for (const e of cls.enrollments) {
          rowIdx++;
          const rawStatus = cls.recordsMap.get(e.enrollmentId) as AttendanceStatus | undefined;
          const preset = getStatusStyle(rawStatus);
          const row = gradeSheet.addRow([
            e.studentName ?? e.student?.fullName ?? '',
            preset.label,
            String(e.student?.nationalId ?? ''),
            cls.className,
            params.date,
            rowIdx,
          ]);
          row.height = 20;
          setRowStyles(row, [
            STYLES.nameCell10,
            preset.cellStyle9,
            STYLES.idCell10,
            STYLES.centerDefault,
            STYLES.centerDefault,
            STYLES.centerDefault,
          ]);
        }
      }

      gradeSheet.getColumn(1).width = 28;
      gradeSheet.getColumn(2).width = 16;
      gradeSheet.getColumn(3).width = 16;
      gradeSheet.getColumn(4).width = 14;
      gradeSheet.getColumn(5).width = 14;
      gradeSheet.getColumn(6).width = 6;
      gradeSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + rowIdx, column: 6 },
      };
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Daily_Attendance_AllGrades_${params.academicYear}_${params.date}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.14 ALL GRADES WEEKLY ATTENDANCE (التقرير الأسبوعي الشامل لجميع المراحل)
  // ---------------------------------------------------------------------------

  async exportAllGradesWeeklyReport(params: {
    academicYear: string;
    weekNumber: number;
    weekRange: string;
    schoolName?: string;
    gradesData: Array<{
      gradeId: number;
      gradeName: string;
      classesData: Array<{
        classItem: ClassItem;
        representativeName?: string;
        enrollments: ClassEnrollment[];
        records: AttendanceRecord[];
      }>;
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    const { dayHeaders, flatSlots } = getWeeklyScheduleLayout();
    const lastColumn = 2 + flatSlots.length;

    // 1. School Summary Sheet
    const summarySheet = workbook.addWorksheet('ملخص المدرسة الأسبوعي', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 5 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    addTitleAndMeta(
      summarySheet,
      8,
      `${schoolName} — التقرير الأسبوعي الشامل للمدرسة (الأسبوع ${params.weekNumber})`,
      `العام الدراسي: ${params.academicYear} | الفترة: ${params.weekRange} | تاريخ الاستخراج: ${getFastArabicDateString()}`,
      STYLES.title15
    );
    summarySheet.addRow([]);

    let totalSchoolStudents = 0;
    let totalSchoolPresent = 0;
    let totalSchoolAbsent = 0;

    const processedGrades = params.gradesData.map((gd) => {
      let gStudents = 0;
      let gPresent = 0;
      let gAbsent = 0;

      const pClasses = gd.classesData.map((cd) => {
        const studentCount = cd.enrollments.length;
        gStudents += studentCount;

        const recordIndex = indexClassRecordsFlat(cd.records);
        let cPresent = 0;
        let cAbsent = 0;

        cd.enrollments.forEach((en) => {
          const baseKey = en.enrollmentId * 64;
          flatSlots.forEach((slot) => {
            const st = recordIndex.get(baseKey + slot.slotOffset);
            if (st === 'Present') cPresent++;
            else if (st === 'Absent') cAbsent++;
          });
        });

        gPresent += cPresent;
        gAbsent += cAbsent;

        return {
          ...cd,
          studentCount,
          cPresent,
          cAbsent,
          recordIndex,
        };
      });

      totalSchoolStudents += gStudents;
      totalSchoolPresent += gPresent;
      totalSchoolAbsent += gAbsent;

      const gRec = gPresent + gAbsent;
      const gRate = gRec ? (gPresent / gRec) * 100 : 100;

      return {
        ...gd,
        studentCount: gStudents,
        present: gPresent,
        absent: gAbsent,
        rate: gRate,
        classes: pClasses,
      };
    });

    const sRec = totalSchoolPresent + totalSchoolAbsent;
    const sRate = sRec ? (totalSchoolPresent / sRec) * 100 : 100;

    const kpi = summarySheet.addRow([
      'إجمالي طلاب المدرسة',
      totalSchoolStudents,
      'إجمالي الحصص المحضورة',
      totalSchoolPresent,
      'إجمالي الحصص الغائبة',
      totalSchoolAbsent,
      'نسبة الحضور الأسبوعية',
      `${sRate.toFixed(1)}%`,
    ]);
    kpi.height = 26;
    kpi.getCell(1).style = STYLES.metaBold10;
    kpi.getCell(2).style = STYLES.totalBold10;
    kpi.getCell(3).style = STYLES.stageColPresent;
    kpi.getCell(4).style = STYLES.stageColPresent;
    kpi.getCell(5).style = STYLES.stageColAbsent;
    kpi.getCell(6).style = STYLES.stageColAbsent;
    kpi.getCell(7).style = STYLES.stageColRate;
    kpi.getCell(8).style = STYLES.stageColRate;

    summarySheet.addRow([]);

    const headers = [
      'م',
      'المرحلة الدراسية',
      'الشعبة',
      'عريف الصف',
      'عدد الطلاب',
      'الحصص المحضورة',
      'الحصص الغائبة',
      'نسبة الحضور',
    ];
    const sHeader = summarySheet.addRow(headers);
    sHeader.height = 24;
    applyHeaderStyle(sHeader, 8);

    let rowCount = 0;
    processedGrades.forEach((g) => {
      g.classes.forEach((c) => {
        rowCount++;
        const rec = c.cPresent + c.cAbsent;
        const rate = rec ? (c.cPresent / rec) * 100 : 100;
        const className = getClassDisplayName(c.classItem);

        const row = summarySheet.addRow([
          rowCount,
          g.gradeName,
          className,
          c.representativeName || '—',
          c.studentCount,
          c.cPresent,
          c.cAbsent,
          `${rate.toFixed(1)}%`,
        ]);
        row.height = 20;
        setRowStyles(row, [
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STATUS_PRESETS.Present.cellStyle9,
          STATUS_PRESETS.Absent.cellStyle9,
          STYLES.stageColRate,
        ]);
      });
    });

    summarySheet.getColumn(1).width = 6;
    summarySheet.getColumn(2).width = 22;
    summarySheet.getColumn(3).width = 14;
    summarySheet.getColumn(4).width = 20;
    summarySheet.getColumn(5).width = 14;
    summarySheet.getColumn(6).width = 16;
    summarySheet.getColumn(7).width = 16;
    summarySheet.getColumn(8).width = 16;

    // 2. Class matrix sheets
    for (const g of processedGrades) {
      for (const c of g.classes) {
        await yieldToUI();
        const className = getClassDisplayName(c.classItem);
        const sheetName = getUniqueWorksheetName(workbook, `شعبة ${className}`, 'Class');
        const sheet = workbook.addWorksheet(sheetName, {
          views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 5 }],
          pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
        });

        addTitleAndMeta(
          sheet,
          lastColumn,
          `${schoolName} — سجل الحضور الأسبوعي لشعبة ${className} (${g.gradeName})`,
          `العام الدراسي: ${params.academicYear} | الأسبوع: ${params.weekNumber} (${params.weekRange}) | الطلاب: ${c.studentCount}`
        );
        sheet.getRow(3).height = 10;

        sheet.mergeCells('A4:A5');
        sheet.getCell('A4').value = 'اسم الطالب';
        sheet.mergeCells(4, lastColumn, 5, lastColumn);
        sheet.getCell(4, lastColumn).value = 'رقم الهوية';
        sheet.getCell(4, lastColumn).style = STYLES.headerGray11;
        sheet.getRow(5).getCell(lastColumn).style = STYLES.headerGray11;

        const h1 = sheet.getRow(4);
        const h2 = sheet.getRow(5);
        h1.height = 22;
        h2.height = 20;

        for (const day of dayHeaders) {
          sheet.mergeCells(4, day.startCol, 5, day.endCol);
          const cell = sheet.getCell(4, day.startCol);
          cell.value = day.name;
          cell.style = STYLES.headerGray11;
          h2.getCell(day.startCol).style = STYLES.headerGray11;
        }

        sheet.getCell('A4').style = STYLES.headerGray11;

        c.enrollments.forEach((en) => {
          const baseKey = en.enrollmentId * 64;
          const values: Array<string | number> = [
            en.studentName ?? en.student?.fullName ?? '',
          ];
          const styles: Array<Partial<ExcelJS.Style> | undefined> = [
            STYLES.nameCellBoldOnly,
          ];

          for (const slot of flatSlots) {
            const rawStatus = c.recordIndex.get(baseKey + slot.slotOffset);
            const preset = getStatusStyle(rawStatus as AttendanceStatus | undefined);
            values.push(preset.label);
            styles.push(preset.cellStyle85);
          }

          values.push(String(en.student?.nationalId ?? ''));
          styles.push(STYLES.idCellDefault);

          const r = sheet.addRow(values);
          r.height = 20;
          setRowStyles(r, styles);
        });

        configureIdentityColumns(sheet, lastColumn, 7.5);
      }
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Weekly_Attendance_AllGrades_${params.academicYear}_Week-${params.weekNumber}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.15 GRADE MONTHLY ATTENDANCE (التقرير الشهري لمرحلة محددة)
  // ---------------------------------------------------------------------------

  async exportGradeMonthlyReport(params: {
    gradeName: string;
    academicYear: string;
    month: string;
    schoolName?: string;
    summaryRows: MonthlyStudentSummaryRow[];
    detailedAbsences: MonthlyDetailedAbsenceRow[];
    weeks?: MonthlyAttendanceWeekData[];
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    // 1. Sheet 1: Monthly Attendance Summary for Grade
    if (params.summaryRows && params.summaryRows.length > 0) {
      const summarySheet = workbook.addWorksheet('ملخص المرحلة الشهري', {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      addTitleAndMeta(
        summarySheet,
        10,
        `${schoolName} — ملخص الحضور والغياب الشهري لـ ${params.gradeName} (${params.month})`,
        `العام الدراسي: ${params.academicYear} | الطلاب: ${params.summaryRows.length} | تاريخ الاستخراج: ${getFastArabicDateString()}`,
        STYLES.title14
      );

      summarySheet.addRow([]);

      const headers = [
        'اسم الطالب',
        'أيام الحضور',
        'أيام الغياب',
        'أيام الانقطاع',
        'غير محدد',
        'رقم الهوية',
        'الشعبة',
        'الأيام المتوقعة',
        'نسبة الحضور',
        'م',
      ];

      const headerRow = summarySheet.addRow(headers);
      headerRow.height = 24;
      applyHeaderStyle(headerRow, 10);

      for (let i = 0; i < params.summaryRows.length; i++) {
        const item = params.summaryRows[i];
        const rateStr = `${item.attendanceRate.toFixed(1)}%`;
        const values: Array<string | number> = [
          item.studentName ?? '',
          item.presentCount,
          item.absentCount,
          item.discontinuedCount,
          item.unmarkedCount,
          String(item.nationalId ?? ''),
          getClassDisplayName(item as unknown as Record<string, unknown>),
          item.totalExpected,
          rateStr,
          i + 1,
        ];

        const rateStyle =
          item.attendanceRate >= 90
            ? STATUS_PRESETS.Present.cellStyle9
            : item.attendanceRate >= 75
            ? STATUS_PRESETS.Discontinued.cellStyle9
            : STATUS_PRESETS.Absent.cellStyle9;

        const styles = [
          STYLES.nameCell10,
          STATUS_PRESETS.Present.cellStyle9,
          STATUS_PRESETS.Absent.cellStyle9,
          STATUS_PRESETS.Discontinued.cellStyle9,
          STATUS_PRESETS.Unmarked.cellStyle9,
          STYLES.idCell10,
          STYLES.centerDefault,
          STYLES.centerDefault,
          rateStyle,
          STYLES.centerDefault,
        ];

        const row = summarySheet.addRow(values);
        row.height = 20;
        setRowStyles(row, styles);
        if (shouldYieldAfterRow(i)) await yieldToUI();
      }

      summarySheet.getColumn(1).width = 28;
      summarySheet.getColumn(2).width = 14;
      summarySheet.getColumn(3).width = 14;
      summarySheet.getColumn(4).width = 14;
      summarySheet.getColumn(5).width = 12;
      summarySheet.getColumn(6).width = 16;
      summarySheet.getColumn(7).width = 14;
      summarySheet.getColumn(8).width = 14;
      summarySheet.getColumn(9).width = 14;
      summarySheet.getColumn(10).width = 6;

      summarySheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + params.summaryRows.length, column: 10 },
      };
    }

    // 2. Sheet 2: Detailed Absence Records
    if (params.detailedAbsences && params.detailedAbsences.length > 0) {
      const detailedSheet = workbook.addWorksheet('سجل غياب المرحلة', {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      addTitleAndMeta(
        detailedSheet,
        7,
        `${schoolName} — سجل غياب ${params.gradeName} (${params.month})`,
        `العام الدراسي: ${params.academicYear} | إجمالي حالات الغياب: ${params.detailedAbsences.length} | تاريخ الاستخراج: ${getFastArabicDateString()}`,
        STYLES.titleAbsent14
      );

      detailedSheet.addRow([]);

      const headers = ['اسم الطالب', 'الحالة', 'رقم الهوية', 'الشعبة', 'التاريخ', 'اليوم', 'م'];
      const headerRow = detailedSheet.addRow(headers);
      headerRow.height = 24;
      applyHeaderStyle(headerRow, 7);

      for (let i = 0; i < params.detailedAbsences.length; i++) {
        const item = params.detailedAbsences[i];
        const values: Array<string | number> = [
          item.studentName ?? '',
          'غائب',
          String(item.nationalId ?? ''),
          getClassDisplayName(item as unknown as Record<string, unknown>),
          item.date || '',
          item.dayName || '',
          i + 1,
        ];

        const styles = [
          STYLES.nameCell10,
          STATUS_PRESETS.Absent.cellStyle9,
          STYLES.idCell10,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
        ];

        const row = detailedSheet.addRow(values);
        row.height = 20;
        setRowStyles(row, styles);
        if (shouldYieldAfterRow(i)) await yieldToUI();
      }

      detailedSheet.getColumn(1).width = 28;
      detailedSheet.getColumn(2).width = 14;
      detailedSheet.getColumn(3).width = 16;
      detailedSheet.getColumn(4).width = 14;
      detailedSheet.getColumn(5).width = 14;
      detailedSheet.getColumn(6).width = 14;
      detailedSheet.getColumn(7).width = 6;

      detailedSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + params.detailedAbsences.length, column: 7 },
      };
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Monthly_Attendance_${sanitizeFilename(params.gradeName)}_${params.month}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.16 ALL GRADES MONTHLY ATTENDANCE (التقرير الشهري العام لكافة المراحل)
  // ---------------------------------------------------------------------------

  async exportAllGradesMonthlyReport(params: {
    academicYear: string;
    month: string;
    schoolName?: string;
    gradesData: Array<{
      gradeId: number;
      gradeName: string;
      summaryRows: MonthlyStudentSummaryRow[];
      detailedAbsences: MonthlyDetailedAbsenceRow[];
    }>;
    overallSummary: MonthlyStudentSummaryRow[];
    overallAbsences: MonthlyDetailedAbsenceRow[];
    weeks?: MonthlyAttendanceWeekData[];
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();
    const schoolName = getSchoolName(params.schoolName);

    // 1. School Summary Sheet
    const summarySheet = workbook.addWorksheet('ملخص المدرسة الشهري', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 5 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    addTitleAndMeta(
      summarySheet,
      8,
      `${schoolName} — التقرير الشهري العام لجميع المراحل (${params.month})`,
      `العام الدراسي: ${params.academicYear} | إجمالي طلاب المدرسة: ${params.overallSummary.length} | تاريخ الاستخراج: ${getFastArabicDateString()}`,
      STYLES.title15
    );
    summarySheet.addRow([]);

    let totalExpectedDays = 0;
    let totalPresentDays = 0;
    let totalAbsentDays = 0;

    params.overallSummary.forEach((s) => {
      totalExpectedDays += s.totalExpected;
      totalPresentDays += s.presentCount;
      totalAbsentDays += s.absentCount;
    });

    const recordedDays = totalPresentDays + totalAbsentDays;
    const overallRate = recordedDays ? (totalPresentDays / recordedDays) * 100 : 100;

    const kpi = summarySheet.addRow([
      'إجمالي طلاب المدرسة',
      params.overallSummary.length,
      'إجمالي أيام الحضور',
      totalPresentDays,
      'إجمالي أيام الغياب',
      totalAbsentDays,
      'النسبة الشهرية العامة',
      `${overallRate.toFixed(1)}%`,
    ]);
    kpi.height = 26;
    kpi.getCell(1).style = STYLES.metaBold10;
    kpi.getCell(2).style = STYLES.totalBold10;
    kpi.getCell(3).style = STYLES.stageColPresent;
    kpi.getCell(4).style = STYLES.stageColPresent;
    kpi.getCell(5).style = STYLES.stageColAbsent;
    kpi.getCell(6).style = STYLES.stageColAbsent;
    kpi.getCell(7).style = STYLES.stageColRate;
    kpi.getCell(8).style = STYLES.stageColRate;

    summarySheet.addRow([]);

    const headers = [
      'م',
      'المرحلة الدراسية',
      'عدد الطلاب',
      'الأيام المتوقعة',
      'أيام الحضور',
      'أيام الغياب',
      'حالات الغياب المسجلة',
      'نسبة الحضور',
    ];
    const sHeader = summarySheet.addRow(headers);
    sHeader.height = 24;
    applyHeaderStyle(sHeader, 8);

    params.gradesData.forEach((g, idx) => {
      let gExp = 0;
      let gPres = 0;
      let gAbs = 0;
      g.summaryRows.forEach((r) => {
        gExp += r.totalExpected;
        gPres += r.presentCount;
        gAbs += r.absentCount;
      });
      const gRec = gPres + gAbs;
      const gRate = gRec ? (gPres / gRec) * 100 : 100;

      const row = summarySheet.addRow([
        idx + 1,
        g.gradeName,
        g.summaryRows.length,
        gExp,
        gPres,
        gAbs,
        g.detailedAbsences.length,
        `${gRate.toFixed(1)}%`,
      ]);
      row.height = 20;
      setRowStyles(row, [
        STYLES.centerDefault,
        STYLES.centerDefault,
        STYLES.centerDefault,
        STYLES.centerDefault,
        STATUS_PRESETS.Present.cellStyle9,
        STATUS_PRESETS.Absent.cellStyle9,
        STATUS_PRESETS.Absent.cellStyle9,
        STYLES.stageColRate,
      ]);
    });

    summarySheet.getColumn(1).width = 6;
    summarySheet.getColumn(2).width = 24;
    summarySheet.getColumn(3).width = 14;
    summarySheet.getColumn(4).width = 16;
    summarySheet.getColumn(5).width = 16;
    summarySheet.getColumn(6).width = 16;
    summarySheet.getColumn(7).width = 20;
    summarySheet.getColumn(8).width = 16;

    // 2. School All Students Summary
    if (params.overallSummary.length > 0) {
      const allStudentsSheet = workbook.addWorksheet('سجل الطلاب الشهري العام', {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      addTitleAndMeta(
        allStudentsSheet,
        10,
        `${schoolName} — كشف الحضور الشهري لجميع طلاب المدرسة (${params.month})`,
        `العام الدراسي: ${params.academicYear} | إجمالي الطلاب: ${params.overallSummary.length}`
      );
      allStudentsSheet.addRow([]);

      const stHeaders = [
        'اسم الطالب',
        'أيام الحضور',
        'أيام الغياب',
        'أيام الانقطاع',
        'غير محدد',
        'رقم الهوية',
        'الشعبة',
        'الأيام المتوقعة',
        'نسبة الحضور',
        'م',
      ];
      const hRow = allStudentsSheet.addRow(stHeaders);
      hRow.height = 22;
      applyHeaderStyle(hRow, 10);

      params.overallSummary.forEach((item, i) => {
        const rateStr = `${item.attendanceRate.toFixed(1)}%`;
        const row = allStudentsSheet.addRow([
          item.studentName ?? '',
          item.presentCount,
          item.absentCount,
          item.discontinuedCount,
          item.unmarkedCount,
          String(item.nationalId ?? ''),
          getClassDisplayName(item as unknown as Record<string, unknown>),
          item.totalExpected,
          rateStr,
          i + 1,
        ]);
        row.height = 20;
        setRowStyles(row, [
          STYLES.nameCell10,
          STATUS_PRESETS.Present.cellStyle9,
          STATUS_PRESETS.Absent.cellStyle9,
          STATUS_PRESETS.Discontinued.cellStyle9,
          STATUS_PRESETS.Unmarked.cellStyle9,
          STYLES.idCell10,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.stageColRate,
          STYLES.centerDefault,
        ]);
      });

      allStudentsSheet.getColumn(1).width = 28;
      allStudentsSheet.getColumn(2).width = 14;
      allStudentsSheet.getColumn(3).width = 14;
      allStudentsSheet.getColumn(4).width = 14;
      allStudentsSheet.getColumn(5).width = 12;
      allStudentsSheet.getColumn(6).width = 16;
      allStudentsSheet.getColumn(7).width = 14;
      allStudentsSheet.getColumn(8).width = 14;
      allStudentsSheet.getColumn(9).width = 14;
      allStudentsSheet.getColumn(10).width = 6;
      allStudentsSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + params.overallSummary.length, column: 10 },
      };
    }

    // 3. School All Absences
    if (params.overallAbsences.length > 0) {
      const absencesSheet = workbook.addWorksheet('سجل الغياب الشهري العام', {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      addTitleAndMeta(
        absencesSheet,
        7,
        `${schoolName} — سجل الغياب الشهري العام (${params.month})`,
        `العام الدراسي: ${params.academicYear} | إجمالي الغيابات: ${params.overallAbsences.length}`
      );
      absencesSheet.addRow([]);

      const abHeaders = ['اسم الطالب', 'الحالة', 'رقم الهوية', 'الشعبة', 'التاريخ', 'اليوم', 'م'];
      const hRow = absencesSheet.addRow(abHeaders);
      hRow.height = 22;
      applyHeaderStyle(hRow, 7);

      params.overallAbsences.forEach((item, i) => {
        const row = absencesSheet.addRow([
          item.studentName ?? '',
          'غائب',
          String(item.nationalId ?? ''),
          getClassDisplayName(item as unknown as Record<string, unknown>),
          item.date || '',
          item.dayName || '',
          i + 1,
        ]);
        row.height = 20;
        setRowStyles(row, [
          STYLES.nameCell10,
          STATUS_PRESETS.Absent.cellStyle9,
          STYLES.idCell10,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
          STYLES.centerDefault,
        ]);
      });

      absencesSheet.getColumn(1).width = 28;
      absencesSheet.getColumn(2).width = 14;
      absencesSheet.getColumn(3).width = 16;
      absencesSheet.getColumn(4).width = 14;
      absencesSheet.getColumn(5).width = 14;
      absencesSheet.getColumn(6).width = 14;
      absencesSheet.getColumn(7).width = 6;
      absencesSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + params.overallAbsences.length, column: 7 },
      };
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Monthly_Attendance_AllGrades_${params.academicYear}_${params.month}.xlsx`
    );
  },
};
