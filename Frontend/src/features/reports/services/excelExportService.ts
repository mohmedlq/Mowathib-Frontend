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
  getPeriodsForDay,
  getPeriodsCountForDay,
  TOTAL_WEEKLY_PERIODS,
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

const YIELD_EVERY_ROWS = 250;

async function yieldToUI(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function yieldAfterRow(index: number): Promise<void> {
  if ((index + 1) % YIELD_EVERY_ROWS === 0) {
    await yieldToUI();
  }
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

/** Excel worksheet names must also be unique within a workbook. */
function getUniqueWorksheetName(
  workbook: ExcelJS.Workbook,
  desiredName: string,
  fallback: string
): string {
  const base = sanitizeWorksheetName(desiredName, fallback);
  const existing = new Set(
    workbook.worksheets.map((sheet) => sheet.name.toLowerCase())
  );

  if (!existing.has(base.toLowerCase())) return base;

  for (let suffix = 2; suffix < 10_000; suffix++) {
    const suffixText = ` (${suffix})`;
    const candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
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

  let currentCol = 3;
  const dayHeaders: DayHeaderLayout[] = [];
  const flatSlots: FlatWeeklySlot[] = [];

  for (const day of SCHOOL_DAYS) {
    const periods = getPeriodsForDay(day.dayNumber);
    const periodCount = getPeriodsCountForDay(day.dayNumber);
    const startCol = currentCol;
    const endCol = startCol + periodCount - 1;

    dayHeaders.push({
      dayNumber: day.dayNumber,
      name: day.nameAr,
      startCol,
      endCol,
      periodCount,
    });

    for (const periodNumber of periods) {
      flatSlots.push({
        dayNumber: day.dayNumber,
        periodNumber,
        colIndex: currentCol,
        slotOffset: (day.dayNumber << 3) | periodNumber,
      });
      currentCol++;
    }
  }

  if (flatSlots.length !== TOTAL_WEEKLY_PERIODS) {
    throw new Error(
      `إعدادات الجدول غير متطابقة: عدد الحصص الفعلي ${flatSlots.length}، والمتوقع ${TOTAL_WEEKLY_PERIODS}.`
    );
  }

  cachedLayout = { dayHeaders, flatSlots };
  return cachedLayout;
}

function indexClassRecordsFlat(
  records: AttendanceRecord[]
): Map<number, AttendanceStatus> {
  const result = new Map<number, AttendanceStatus>();

  for (const record of records) {
    const key =
      record.enrollmentId * 64 +
      ((record.dayNumber << 3) | record.periodNumber);

    // Keep the first record, matching the original export behavior.
    if (!result.has(key)) result.set(key, record.status);
  }

  return result;
}

function setRowStyles(
  row: ExcelJS.Row,
  styles: Array<Partial<ExcelJS.Style> | undefined>
): void {
  for (let index = 0; index < styles.length; index++) {
    const style = styles[index];
    if (style) row.getCell(index + 1).style = style;
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
  worksheet.getColumn(1).width = 16;
  worksheet.getColumn(2).width = 28;
  for (let column = 3; column <= lastColumn; column++) {
    worksheet.getColumn(column).width = periodWidth;
  }
}

function getWeeklySlotStatus(
  attendance: StudentWeeklyAttendance,
  slot: FlatWeeklySlot
): AttendanceStatus {
  return attendance.slots?.[slot.dayNumber]?.[slot.periodNumber]?.status ?? 'Unmarked';
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
  const className = String(classData.className ?? classData.classNumber ?? 'شعبة');
  const displayClassName = className.startsWith('شعبة') ? className : `شعبة ${className}`;
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
  worksheet.getCell(headerRow1, 1).value = 'رقم الهوية';
  worksheet.getCell(headerRow1, 1).style = STYLES.headerGray10;
  worksheet.getCell(headerRow2, 1).style = STYLES.headerGray10;

  worksheet.mergeCells(headerRow1, 2, headerRow2, 2);
  worksheet.getCell(headerRow1, 2).value = 'اسم الطالب';
  worksheet.getCell(headerRow1, 2).style = STYLES.headerGray10;
  worksheet.getCell(headerRow2, 2).style = STYLES.headerGray10;

  const topHeader = worksheet.getRow(headerRow1);
  const bottomHeader = worksheet.getRow(headerRow2);
  topHeader.height = 22;
  bottomHeader.height = 19;

  for (const day of dayHeaders) {
    worksheet.mergeCells(headerRow1, day.startCol, headerRow1, day.endCol);
    for (let column = day.startCol; column <= day.endCol; column++) {
      topHeader.getCell(column).style = STYLES.headerGray10;
    }
    topHeader.getCell(day.startCol).value = day.name;

    for (let period = 1; period <= day.periodCount; period++) {
      const cell = bottomHeader.getCell(day.startCol + period - 1);
      cell.value = `ح ${period}`;
      cell.style = STYLES.periodHeader85;
    }
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
      item.enrollment.student?.nationalId ||
      (item.enrollment as any).nationalId ||
      '—';

    values[1] =
      item.enrollment.studentName ||
      item.enrollment.student?.fullName ||
      'طالب';

    styles[0] = STYLES.idCell9;
    styles[1] = STYLES.nameCell95;

    for (let slotIndex = 0; slotIndex < flatSlots.length; slotIndex++) {
      const preset = getStatusStyle(
        getWeeklySlotStatus(item, flatSlots[slotIndex])
      );
      values[2 + slotIndex] = preset.label;
      styles[2 + slotIndex] = preset.fastCellStyle8;
    }

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

    const day = SCHOOL_DAYS.find(
      (item) => item.nameAr === meta.dayName || item.dayNumber === (meta as any).dayNumber
    );
    const periods = getPeriodsForDay(day?.dayNumber ?? 1);
    const totalColumns = periods.length + 5;

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
      `العام الدراسي: ${meta.academicYear} | الشعبة: ${meta.className} | اليوم: ${meta.dayName} (${meta.date}) | تاريخ التوليد: ${getFastArabicDateString()}`
    );

    worksheet.addRow([]);

    const headers = [
      'رقم الهوية',
      'اسم الطالب',
      ...periods.map((period) => `الحصة ${period}`),
      'حاضر',
      'غائب',
      'منقطع',
    ];

    const header = worksheet.addRow(headers);
    header.height = 24;
    applyHeaderStyle(header, totalColumns);

    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const values: Array<string | number> = [
        String(item.nationalId ?? ''),
        item.studentName ?? '',
      ];
      const styles: Array<Partial<ExcelJS.Style> | undefined> = [
        STYLES.idCell10,
        STYLES.nameCell10,
      ];

      for (const period of periods) {
        const preset = getStatusStyle(item.periods[period]);
        values.push(preset.label);
        styles.push(preset.cellStyle9);
      }

      values.push(item.presentCount, item.absentCount, item.discontinuedCount);
      const totalStyle = index % 2 ? STYLES.totalBold10Zebra : STYLES.totalBold10;
      styles.push(totalStyle, totalStyle, totalStyle);

      const row = worksheet.addRow(values);
      row.height = 20;
      setRowStyles(row, styles);
      await yieldAfterRow(index);
    }

    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 28;
    for (let column = 3; column <= 2 + periods.length; column++) {
      worksheet.getColumn(column).width = 12;
    }
    for (let column = 3 + periods.length; column <= totalColumns; column++) {
      worksheet.getColumn(column).width = 10;
    }

    if (data.length) {
      worksheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + data.length, column: totalColumns },
      };
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(
      buffer,
      `Mowathib_Daily_Attendance_${meta.academicYear}_${meta.className}_${meta.date}.xlsx`
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
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 5 }],
    });

    addTitleAndMeta(
      worksheet,
      lastColumn,
      `${getSchoolName(meta.schoolName)} — تقرير الحضور والغياب الأسبوعي (الأسبوع ${meta.weekNumber})`,
      `العام الدراسي: ${meta.academicYear} | الشعبة: ${meta.className} | الفترة: ${meta.weekRange} | عدد الطلاب: ${attendances.length}`
    );

    worksheet.mergeCells('A4:A5');
    worksheet.getCell('A4').value = 'رقم الهوية';
    worksheet.mergeCells('B4:B5');
    worksheet.getCell('B4').value = 'اسم الطالب';

    const firstHeader = worksheet.getRow(4);
    const secondHeader = worksheet.getRow(5);
    firstHeader.height = 22;
    secondHeader.height = 20;

    for (const day of dayHeaders) {
      worksheet.mergeCells(4, day.startCol, 4, day.endCol);
      const cell = worksheet.getCell(4, day.startCol);
      cell.value = day.name;
      cell.style = STYLES.headerGray11;

      for (let period = 1; period <= day.periodCount; period++) {
        const periodCell = secondHeader.getCell(day.startCol + period - 1);
        periodCell.value = `ح ${period}`;
        periodCell.style = STYLES.periodHeader9;
      }
    }

    worksheet.getCell('A4').style = STYLES.headerGray11;
    worksheet.getCell('B4').style = STYLES.headerGray11;

    for (let index = 0; index < attendances.length; index++) {
      const item = attendances[index];
      const values: Array<string | number> = [
        String(item.enrollment.student?.nationalId ?? ''),
        item.enrollment.studentName ?? '',
      ];
      const styles: Array<Partial<ExcelJS.Style> | undefined> = [
        STYLES.idCellDefault,
        STYLES.nameCellBoldOnly,
      ];

      for (const slot of flatSlots) {
        const preset = getStatusStyle(getWeeklySlotStatus(item, slot));
        values.push(preset.label);
        styles.push(preset.cellStyle85);
      }

      const row = worksheet.addRow(values);
      row.height = 20;
      setRowStyles(row, styles);
      await yieldAfterRow(index);
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
      `Mowathib_Weekly_Attendance_${meta.academicYear}_Week-${meta.weekNumber}_${meta.className}.xlsx`
    );
  },

  // ---------------------------------------------------------------------------
  // 5.3 MONTHLY ATTENDANCE
  // ---------------------------------------------------------------------------

  async exportMonthlyReport(
    _summaryData: MonthlyStudentSummaryRow[],
    _detailedAbsences: MonthlyDetailedAbsenceRow[],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: number | string | undefined;
      month: string;
      weeks: MonthlyAttendanceWeekData[];
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

    if (!meta.weeks?.length) {
      throw new Error('لا توجد بيانات للأسابيع المحددة. لم تصل بيانات الأسابيع إلى التصدير.');
    }

    const selectedWeeks = meta.weeks
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

    if (!selectedWeeks.length) {
      throw new Error('لا توجد أسابيع دراسية تتقاطع تواريخها مع الشهر المحدد.');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

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
          views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 5 }],
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
        `${getSchoolName(meta.schoolName)} — تقرير الحضور والغياب الأسبوعي (الأسبوع ${weekNumber})`,
        `العام الدراسي: ${meta.academicYear} | الشعبة: ${meta.className ?? '—'} | الفترة: ${startDate} - ${endDate} | عدد الطلاب: ${attendances.length}`
      );
      worksheet.getRow(3).height = 10;

      worksheet.mergeCells('A4:A5');
      worksheet.getCell('A4').value = 'رقم الهوية';
      worksheet.mergeCells('B4:B5');
      worksheet.getCell('B4').value = 'اسم الطالب';

      const firstHeader = worksheet.getRow(4);
      const secondHeader = worksheet.getRow(5);
      firstHeader.height = 22;
      secondHeader.height = 20;

      for (const day of dayHeaders) {
        worksheet.mergeCells(4, day.startCol, 4, day.endCol);
        const dayCell = worksheet.getCell(4, day.startCol);
        dayCell.value = day.name;
        dayCell.style = STYLES.headerGray11;

        for (let period = 1; period <= day.periodCount; period++) {
          const cell = secondHeader.getCell(day.startCol + period - 1);
          cell.value = `ح ${period}`;
          cell.style = STYLES.periodHeader9;
        }
      }

      worksheet.getCell('A4').style = STYLES.headerGray11;
      worksheet.getCell('B4').style = STYLES.headerGray11;

      for (let studentIndex = 0; studentIndex < attendances.length; studentIndex++) {
        const item = attendances[studentIndex];
        const values: Array<string | number> = [
          String(item.enrollment.student?.nationalId ?? ''),
          item.enrollment.studentName ?? '',
        ];
        const styles: Array<Partial<ExcelJS.Style> | undefined> = [
          STYLES.idCellDefault,
          STYLES.nameCell10,
        ];

        for (const slot of flatSlots) {
          const preset = getStatusStyle(getWeeklySlotStatus(item, slot));
          values.push(preset.label);
          styles.push(preset.cellStyle85);
        }

        const row = worksheet.addRow(values);
        row.height = 20;
        setRowStyles(row, styles);
        await yieldAfterRow(studentIndex);
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
    const safeClassName = String(meta.className ?? 'AllClasses').replace(/[\\/:*?"<>|]/g, '-');
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
      `العام الدراسي: ${meta.academicYear} | الشعبة: ${meta.className} | اليوم: ${meta.dayName} | إجمالي حالات الغياب: ${records.length}`,
      STYLES.titleAbsent14
    );

    const header = worksheet.addRow([
      'رقم الهوية', 'اسم الطالب', 'الشعبة', 'التاريخ', 'اليوم', 'رقم الحصة',
    ]);
    header.height = 24;
    applyHeaderStyle(header, 6);

    for (let index = 0; index < records.length; index++) {
      const item = records[index];
      const centerStyle = index % 2 ? STYLES.centerZebra : STYLES.centerDefault;
      const row = worksheet.addRow([
        String(item.nationalId ?? ''),
        item.studentName,
        item.className,
        item.date,
        item.dayName,
        `الحصة ${item.periodNumber}`,
      ]);
      row.height = 20;
      setRowStyles(row, [
        STYLES.idCellDefault,
        STYLES.nameCellBoldOnly,
        centerStyle,
        centerStyle,
        centerStyle,
        centerStyle,
      ]);
      await yieldAfterRow(index);
    }

    [16, 28, 14, 14, 14, 14].forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    if (records.length) {
      worksheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3 + records.length, column: 6 },
      };
    }

    const buffer = await writeWorkbookFast(workbook);
    saveExcelFile(buffer, `Mowathib_Daily_Absence_${meta.academicYear}_${meta.className}_${meta.date}.xlsx`);
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
          String(enrollment.student?.nationalId ?? ''),
          enrollment.studentName ?? '',
        ];
        const styles: Array<Partial<ExcelJS.Style> | undefined> = [
          STYLES.idCellStage9,
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
        item.classItem.className,
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
      await yieldAfterRow(index);
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
      const requestedName = String(item.classItem.className ?? `شعبة ${classIndex + 1}`);
      const sheetName = getUniqueWorksheetName(workbook, requestedName, `Class ${classIndex + 1}`);
      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 5 }],
      });

      worksheet.pageSetup = {
        orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      };

      addTitleAndMeta(
        worksheet,
        classLastColumn,
        `${schoolName} — سجل الحضور والغياب الأسبوعي: ${item.classItem.className} (${stageData.stageName})`,
        `العام الدراسي: ${stageData.academicYear} | الأسبوع ${stageData.weekNumber} (${stageData.weekRange}) | عدد الطلاب: ${item.studentCount} | العريف: ${item.representativeName || 'غير مسند'}`,
        STYLES.title13
      );

      worksheet.mergeCells('A4:A5');
      worksheet.getCell('A4').value = 'رقم الهوية';
      worksheet.mergeCells('B4:B5');
      worksheet.getCell('B4').value = 'اسم الطالب';

      const top = worksheet.getRow(4);
      const bottom = worksheet.getRow(5);
      top.height = 22;
      bottom.height = 20;

      for (const day of dayHeaders) {
        worksheet.mergeCells(4, day.startCol, 4, day.endCol);
        const dayCell = worksheet.getCell(4, day.startCol);
        dayCell.value = day.name;
        dayCell.style = STYLES.headerGray11;
        for (let period = 1; period <= day.periodCount; period++) {
          const cell = bottom.getCell(day.startCol + period - 1);
          cell.value = period;
          cell.style = STYLES.periodHeaderAlt9;
        }
      }

      for (const address of ['A4', 'B4']) {
        worksheet.getCell(address).style = STYLES.headerGray10;
      }

      worksheet.mergeCells('AJ4:AJ5');
      worksheet.getCell('AJ4').value = 'حاضر';
      worksheet.mergeCells('AK4:AK5');
      worksheet.getCell('AK4').value = 'غائب';
      worksheet.mergeCells('AL4:AL5');
      worksheet.getCell('AL4').value = 'النسبة %';

      for (const address of ['AJ4', 'AK4', 'AL4']) {
        worksheet.getCell(address).style = STYLES.headerGray10;
      }

      for (let studentIndex = 0; studentIndex < item.studentRows.length; studentIndex++) {
        const student = item.studentRows[studentIndex];
        const zebra = studentIndex % 2 === 1;
        student.styles[0] = zebra ? STYLES.idCellStage9Zebra : STYLES.idCellStage9;
        student.styles[1] = zebra ? STYLES.nameCellStage10Zebra : STYLES.nameCellStage10;
        student.styles[2 + slotCount] = zebra ? STYLES.stageColPresentZebra : STYLES.stageColPresent;
        student.styles[3 + slotCount] = zebra ? STYLES.stageColAbsentZebra : STYLES.stageColAbsent;
        student.styles[4 + slotCount] = zebra ? STYLES.stageColRateZebra : STYLES.stageColRate;

        const row = worksheet.addRow(student.values);
        row.height = 20;
        setRowStyles(row, student.styles);
        await yieldAfterRow(studentIndex);
      }

      const totalValues: Array<string | number> = [
        'المجموع الإجمالي', `${item.studentCount} طالب`,
        ...Array.from({ length: slotCount }, () => '—'),
        item.present,
        item.absent,
        `${item.attendanceRate.toFixed(1)}%`,
      ];

      const totalRowClass = worksheet.addRow(totalValues);
      totalRowClass.height = 24;
      for (let column = 1; column <= classLastColumn; column++) {
        totalRowClass.getCell(column).style = STYLES.summaryFooter10;
      }

      worksheet.getColumn(1).width = 15;
      worksheet.getColumn(2).width = 28;
      for (let column = 3; column <= 2 + slotCount; column++) {
        worksheet.getColumn(column).width = 4.2;
      }
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
      const absentByEnrollment = new Map<number, number[]>();
      for (const record of classData.records) {
        if (record.status !== 'Absent') continue;
        const periods = absentByEnrollment.get(record.enrollmentId) ?? [];
        periods.push(record.periodNumber);
        absentByEnrollment.set(record.enrollmentId, periods);
      }

      const totalStudents = classData.enrollments.length;
      const absentStudents = absentByEnrollment.size;
      const rate = totalStudents
        ? ((totalStudents - absentStudents) / totalStudents) * 100
        : 100;

      return {
        classData,
        className: String(classData.classItem.className ?? classData.classItem.classId),
        totalStudents,
        absentStudents,
        rate,
        absentByEnrollment,
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
      await yieldAfterRow(index);
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

      const absentStudents: Array<{
        enrollment: ClassEnrollment;
        periods: number[];
      }> = [];

      for (const enrollment of item.classData.enrollments) {
        const periods = item.absentByEnrollment.get(enrollment.enrollmentId);
        if (periods?.length) {
          periods.sort((a, b) => a - b);
          absentStudents.push({ enrollment, periods });
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
          'م', 'رقم الهوية الوطنية', 'اسم الطالب الغائب', 'الحصص التي غاب بها', 'إجمالي الحصص',
        ]);
        classHeader.height = 22;
        applyHeaderStyle(classHeader, 5, STYLES.headerRed10);

        for (let index = 0; index < absentStudents.length; index++) {
          const item = absentStudents[index];
          const zebra = index % 2 === 1;
          const center = zebra ? STYLES.centerZebra : STYLES.centerDefault;
          const right = zebra ? STYLES.rightZebra : STYLES.rightDefault;
          const enrollment = item.enrollment;
          const row = worksheet.addRow([
            index + 1,
            String(enrollment.student?.nationalId ?? ''),
            enrollment.studentName || enrollment.student?.fullName || '',
            item.periods.map((period) => `الحصة ${period}`).join('، '),
            item.periods.length,
          ]);
          row.height = 20;
          setRowStyles(row, [center, center, right, center, center]);
          await yieldAfterRow(index);
        }
      }

      [6, 18, 28, 30, 14].forEach((width, index) => {
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

      // Preserve the existing report rule: absent periods are deducted
      // from the class's scheduled weekly periods.
      const totalExpected = classData.enrollments.length * TOTAL_WEEKLY_PERIODS;
      const rate = totalExpected > 0
        ? ((totalExpected - absentSlots) / totalExpected) * 100
        : 100;

      return {
        classData,
        className: String(classData.classItem.className ?? classData.classItem.classId),
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
      'م', 'الشعبة', 'العريف المسؤول', 'إجمالي الطلاب', 'إجمالي حصص الغياب', 'نسبة الحضور',
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
      await yieldAfterRow(index);
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
        'م', 'رقم الهوية', 'اسم الطالب', 'الأحد', 'الاثنين', 'الثلاثاء',
        'الأربعاء', 'الخميس', 'إجمالي الغياب',
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
          studentIndex + 1,
          String(enrollment.student?.nationalId ?? ''),
          enrollment.studentName || enrollment.student?.fullName || '',
          ...dailyCounts.map((count) => count ? `${count} حصة` : '—'),
          totalAbsent,
        ]);
        row.height = 20;
        setRowStyles(row, [
          center, center, right, center, center, center, center, center,
          totalAbsent ? STYLES.absentAlertCell : center,
        ]);
        await yieldAfterRow(studentIndex);
      }

      [6, 16, 28, 12, 12, 12, 12, 12, 14].forEach((width, index) => {
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
      const className = String(classData.classItem.className ?? classData.classItem.classId);
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
      await yieldAfterRow(index);
    }

    [6, 16, 24, 16, 18, 16].forEach((width, index) => {
      summary.getColumn(index + 1).width = width;
    });

    for (let classIndex = 0; classIndex < params.classesData.length; classIndex++) {
      await yieldToUI();
      const classData = params.classesData[classIndex];
      const className = String(classData.classItem.className ?? classData.classItem.classId);
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
        'م', 'رقم الهوية', 'اسم الطالب', 'الحصص المتوقعة', 'حضور', 'غياب', 'نسبة الحضور',
      ]);
      classHeader.height = 22;
      applyHeaderStyle(classHeader, 7, STYLES.headerTeal10);

      for (let studentIndex = 0; studentIndex < classData.monthlySummary.length; studentIndex++) {
        const student = classData.monthlySummary[studentIndex];
        const zebra = studentIndex % 2 === 1;
        const center = zebra ? STYLES.centerZebra : STYLES.centerDefault;
        const right = zebra ? STYLES.rightZebra : STYLES.rightDefault;
        const row = worksheet.addRow([
          studentIndex + 1,
          String(student.nationalId ?? ''),
          student.studentName,
          student.totalExpected,
          student.presentCount,
          student.absentCount,
          `${student.attendanceRate.toFixed(1)}%`,
        ]);
        row.height = 20;
        setRowStyles(row, [
          center, center, right, center, center,
          student.absentCount > 0 ? STYLES.absentAlertCell : center,
          center,
        ]);
        await yieldAfterRow(studentIndex);
      }

      [6, 16, 28, 14, 12, 12, 14].forEach((width, index) => {
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
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 2 }],
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

    configureIdentityColumns(worksheet, 2 + TOTAL_WEEKLY_PERIODS, 5.8);
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
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 2 }],
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
        await yieldAfterRow(classIndex);
      }

      configureIdentityColumns(worksheet, 2 + TOTAL_WEEKLY_PERIODS, 5.8);
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

    const classLabel = String(params.classNumber || params.className || 'class');
    const schoolName = getSchoolName();
    const sheetName = getUniqueWorksheetName(
      workbook,
      `شهري 5 أسابيع شعبة ${classLabel}`,
      'تحضير شهري'
    );

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 2 }],
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

    configureIdentityColumns(worksheet, 2 + TOTAL_WEEKLY_PERIODS, 5.8);
    const buffer = await writeWorkbookFast(workbook);
    const safeClass = sanitizeFilename(classLabel).replace(/\.xlsx$/i, '');
    saveExcelFile(
      buffer,
      `Mowathib_Monthly_5Weeks_Class${safeClass}_RefWeek${params.referenceWeekNumber}.xlsx`
    );
  },
};
