
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
  type AttendanceStatus,
  type ClassItem,
  type ClassEnrollment,
  type AttendanceRecord,
} from '../../../shared/types';

import { ATTENDANCE_STATUS_ARABIC } from '../../../shared/types';
import { calculateDateForDay } from '../../../shared/utils/date';

export interface MonthlyAttendanceWeekData {
  weekNumber?: number;
  startDate: string;
  endDate: string;
  attendances: StudentWeeklyAttendance[];
}

export function saveExcelFile(buffer: any, filename: string) {
  try {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    if (typeof window !== 'undefined' && window.document) {
      const nav = window.navigator as any;
      if (nav && nav.msSaveOrOpenBlob) {
        nav.msSaveOrOpenBlob(blob, filename);
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.setAttribute('download', filename);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 1000);
      return;
    }
  } catch (err) {
    console.warn('Direct link download fallback to saveAs:', err);
  }

  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}

// Theme colors
const COLORS = {
  headerBg: 'FF245B63',
  headerText: 'FFFFFFFF',
  subheaderBg: 'FFEEF2F3',
  subheaderText: 'FF17252B',
  border: 'FFDCE3E6',
  zebraBg: 'FFFAFCFD',

  presentBg: 'FFE8F5EC',
  presentText: 'FF176B3A',

  absentBg: 'FFFDECEC',
  absentText: 'FFA61B1B',

  unmarkedBg: 'FFF1F3F5',
  unmarkedText: 'FF59636E',

  discontinuedBg: 'FFFFF4DA',
  discontinuedText: 'FF855500',
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

function getStatusStyle(status: AttendanceStatus) {
  switch (status) {
    case 'Present':
      return {
        fill: COLORS.presentBg,
        fontColor: COLORS.presentText,
        label: ATTENDANCE_STATUS_ARABIC.Present,
      };

    case 'Absent':
      return {
        fill: COLORS.absentBg,
        fontColor: COLORS.absentText,
        label: ATTENDANCE_STATUS_ARABIC.Absent,
      };

    case 'Discontinued':
      return {
        fill: COLORS.discontinuedBg,
        fontColor: COLORS.discontinuedText,
        label: ATTENDANCE_STATUS_ARABIC.Discontinued,
      };

    case 'Unmarked':
    default:
      return {
        fill: COLORS.unmarkedBg,
        fontColor: COLORS.unmarkedText,
        label: ATTENDANCE_STATUS_ARABIC.Unmarked,
      };
  }
}

export const excelExportService = {

  // ==========================================
  // 1. DAILY ATTENDANCE EXCEL EXPORT
  // ==========================================

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

    const sheetName = meta.isAbsenceOnly
      ? 'تقرير الغياب اليومي'
      : 'التقرير اليومي';

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [
        {
          rightToLeft: true,
          state: 'frozen',
          xSplit: 2,
          ySplit: 5,
        },
      ],
    });

    const dayObj = SCHOOL_DAYS.find(
      (d) => d.nameAr === meta.dayName || d.dayNumber === (meta as any).dayNumber
    );
    const dayNum = dayObj?.dayNumber ?? 1;
    const dayPeriods = getPeriodsForDay(dayNum);
    const periodsCount = dayPeriods.length;
    const totalCols = 2 + periodsCount + 3;

    // Title
    worksheet.mergeCells(1, 1, 1, totalCols);

    const titleCell = worksheet.getCell('A1');

    titleCell.value =
      `${meta.schoolName || schoolSettingsService.getSchoolName()} — ` +
      `${meta.isAbsenceOnly ? 'تقرير الغياب اليومي' : 'تقرير الحضور اليومي'}`;

    titleCell.font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: COLORS.headerText },
    };

    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg },
    };

    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.getRow(1).height = 30;

    // Metadata
    worksheet.mergeCells(2, 1, 2, totalCols);

    const metaCell = worksheet.getCell('A2');

    metaCell.value =
      `العام الدراسي: ${meta.academicYear} | ` +
      `الشعبة: ${meta.className} | ` +
      `اليوم: ${meta.dayName} (${meta.date}) | ` +
      `تاريخ التوليد: ${new Date().toLocaleDateString('ar-SA')}`;

    metaCell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: 'FF5F6B73' },
    };

    metaCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.subheaderBg },
    };

    metaCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.getRow(2).height = 20;

    worksheet.addRow([]);

    // Table Headers
    const headers = [
      'رقم الهوية',
      'اسم الطالب',
      ...dayPeriods.map((p) => `الحصة ${p}`),
      'حاضر',
      'غائب',
      'منقطع',
    ];

    const headerRow = worksheet.addRow(headers);

    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: COLORS.subheaderText },
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8EB' },
      };

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      cell.border = BORDER_THIN;
    });

    // Data Rows
    data.forEach((row, idx) => {

      const rowValues = [
        row.nationalId,
        row.studentName,
        ...dayPeriods.map((p) => getStatusStyle(row.periods[p]).label),
        row.presentCount,
        row.absentCount,
        row.discontinuedCount,
      ];

      const r = worksheet.addRow(rowValues);

      r.height = 20;

      const idCell = r.getCell(1);

      idCell.numFmt = '@';
      idCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      idCell.font = { name: 'Arial', size: 10 };
      idCell.border = BORDER_THIN;

      const nameCell = r.getCell(2);

      nameCell.alignment = {
        horizontal: 'right',
        vertical: 'middle',
      };

      nameCell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
      };

      nameCell.border = BORDER_THIN;

      // Period styling
      for (let pIdx = 1; pIdx <= periodsCount; pIdx++) {
        const pNum = dayPeriods[pIdx - 1];
        const cell = r.getCell(pIdx + 2);
        const style = getStatusStyle(row.periods[pNum]);

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: style.fill },
        };

        cell.font = {
          name: 'Arial',
          size: 9,
          bold: true,
          color: { argb: style.fontColor },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = BORDER_THIN;
      }

      // Totals
      for (let c = 2 + periodsCount + 1; c <= totalCols; c++) {

        const cell = r.getCell(c);

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.font = {
          name: 'Arial',
          size: 10,
          bold: true,
        };

        cell.border = BORDER_THIN;

        if (idx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.zebraBg },
          };
        }
      }
    });

    // Column Widths
    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 28;

    for (let i = 3; i <= 2 + periodsCount; i++) {
      worksheet.getColumn(i).width = 12;
    }

    for (let i = 2 + periodsCount + 1; i <= totalCols; i++) {
      worksheet.getColumn(i).width = 10;
    }

    // Auto Filter
    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + data.length, column: totalCols },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    const filename =
      `Mowathib_Daily_Attendance_${meta.academicYear}_${meta.className}_${meta.date}.xlsx`;

    saveExcelFile(buffer, filename);
  },

  // ==========================================
  // 2. WEEKLY ATTENDANCE EXCEL EXPORT
  // ==========================================

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

    const worksheet = workbook.addWorksheet('التقرير الأسبوعي', {
      views: [
        {
          rightToLeft: true,
          state: 'frozen',
          xSplit: 2,
          ySplit: 5,
        },
      ],
    });

    // Main Title
    worksheet.mergeCells(1, 1, 1, 35);

    const titleCell = worksheet.getCell('A1');

    titleCell.value =
      `${meta.schoolName || schoolSettingsService.getSchoolName()} — ` +
      `تقرير الحضور والغياب الأسبوعي (الأسبوع ${meta.weekNumber})`;

    titleCell.font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: COLORS.headerText },
    };

    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg },
    };

    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.getRow(1).height = 30;

    // Metadata
    worksheet.mergeCells(2, 1, 2, 35);

    const metaCell = worksheet.getCell('A2');

    metaCell.value =
      `العام الدراسي: ${meta.academicYear} | ` +
      `الشعبة: ${meta.className} | ` +
      `الفترة: ${meta.weekRange} | ` +
      `عدد الطلاب: ${attendances.length}`;

    metaCell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: 'FF5F6B73' },
    };

    metaCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.subheaderBg },
    };

    metaCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.getRow(2).height = 20;

    // Student Identity Headers
    worksheet.mergeCells('A4:A5');
    worksheet.getCell('A4').value = 'رقم الهوية';

    worksheet.mergeCells('B4:B5');
    worksheet.getCell('B4').value = 'اسم الطالب';

    let currentStartCol = 3;
    const dayHeaders = SCHOOL_DAYS.map((day) => {
      const count = getPeriodsCountForDay(day.dayNumber);
      const startCol = currentStartCol;
      const endCol = currentStartCol + count - 1;
      currentStartCol += count;
      return {
        name: day.nameAr,
        startCol,
        endCol,
        periodCount: count,
      };
    });

    // Day Headers
    dayHeaders.forEach((dh) => {

      worksheet.mergeCells(4, dh.startCol, 4, dh.endCol);

      const cell = worksheet.getCell(4, dh.startCol);

      cell.value = dh.name;

      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: COLORS.subheaderText },
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8EB' },
      };

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      cell.border = BORDER_THIN;
    });

    worksheet.getRow(4).height = 22;
    worksheet.getRow(5).height = 20;

    // Period Numbers
    const r5 = worksheet.getRow(5);

    dayHeaders.forEach((dh) => {

      for (let p = 1; p <= dh.periodCount; p++) {

        const col = dh.startCol + (p - 1);
        const cell = r5.getCell(col);

        cell.value = `ح ${p}`;

        cell.font = {
          name: 'Arial',
          size: 9,
          bold: true,
          color: { argb: 'FF5F6B73' },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F3F5' },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = BORDER_THIN;
      }
    });

    // Format Identity Headers
    ['A4', 'B4'].forEach((pos) => {

      const c = worksheet.getCell(pos);

      c.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: COLORS.subheaderText },
      };

      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8EB' },
      };

      c.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      c.border = BORDER_THIN;
    });

    // Student Data
    attendances.forEach((item) => {

      const rowArr: (string | number)[] = [
        item.enrollment.student?.nationalId || '',
        item.enrollment.studentName || '',
      ];

      SCHOOL_DAYS.forEach((day) => {

        getPeriodsForDay(day.dayNumber).forEach((p) => {

          const slot = item.slots[day.dayNumber]?.[p];
          const st = slot ? slot.status : 'Unmarked';

          rowArr.push(getStatusStyle(st).label);
        });
      });

      const r = worksheet.addRow(rowArr);

      r.height = 20;

      // Identity Columns
      const idCell = r.getCell(1);

      idCell.numFmt = '@';

      idCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      idCell.border = BORDER_THIN;

      const nameCell = r.getCell(2);

      nameCell.alignment = {
        horizontal: 'right',
        vertical: 'middle',
      };

      nameCell.font = { bold: true };
      nameCell.border = BORDER_THIN;

      // Status Colors
      let colIdx = 3;

      SCHOOL_DAYS.forEach((day) => {

        getPeriodsForDay(day.dayNumber).forEach((p) => {

          const cell = r.getCell(colIdx);
          const slot = item.slots[day.dayNumber]?.[p];
          const st = slot ? slot.status : 'Unmarked';

          const style = getStatusStyle(st);

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: style.fill },
          };

          cell.font = {
            name: 'Arial',
            size: 8.5,
            bold: true,
            color: { argb: style.fontColor },
          };

          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
          };

          cell.border = BORDER_THIN;

          colIdx++;
        });
      });
    });

    // Column Widths
    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 28;

    for (let i = 3; i <= 35; i++) {
      worksheet.getColumn(i).width = 7.5;
    }

    // Auto Filter
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5 + attendances.length, column: 35 },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    const filename =
      `Mowathib_Weekly_Attendance_${meta.academicYear}_Week-${meta.weekNumber}_${meta.className}.xlsx`;

    saveExcelFile(buffer, filename);
  },

  // ==========================================
  // 3. MONTHLY ATTENDANCE EXCEL EXPORT
  // One workbook with one weekly-style sheet per actual week
  // ==========================================

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

    // Validate selected month
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(meta.month);

    if (!monthMatch) {
      throw new Error('صيغة الشهر غير صحيحة. استخدم YYYY-MM.');
    }

    const year = Number(monthMatch[1]);
    const monthNumber = Number(monthMatch[2]);

    if (monthNumber < 1 || monthNumber > 12) {
      throw new Error('الشهر المحدد غير صحيح.');
    }

    const monthStart = `${meta.month}-01`;

    const lastDay = new Date(
      Date.UTC(year, monthNumber, 0)
    ).getUTCDate();

    const monthEnd =
      `${meta.month}-${String(lastDay).padStart(2, '0')}`;

    // Normalize and validate dates
    const normalizeDate = (
      value: string,
      label: string
    ): string => {

      const date = String(value ?? '').trim().slice(0, 10);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`${label} غير صالح: ${value}`);
      }

      const parsed = new Date(`${date}T00:00:00.000Z`);

      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date
      ) {
        throw new Error(`${label} غير صالح: ${value}`);
      }

      return date;
    };

    if (!meta.weeks?.length) {
      throw new Error(
        'لا توجد بيانات للأسابيع المحددة. لم تصل بيانات الأسابيع إلى التصدير.'
      );
    }

    // Select actual weeks that overlap the chosen month
    const selectedWeeks = meta.weeks
      .map((week) => {

        const startDate = normalizeDate(
          week.startDate,
          'تاريخ بداية الأسبوع'
        );

        const endDate = normalizeDate(
          week.endDate,
          'تاريخ نهاية الأسبوع'
        );

        if (startDate > endDate) {
          throw new Error(
            `نطاق الأسبوع غير صحيح: ${startDate} - ${endDate}`
          );
        }

        const hasSchoolDayInMonth = SCHOOL_DAYS.some((day) => {

          const schoolDate = normalizeDate(
            calculateDateForDay(startDate, day.dayNumber),
            'تاريخ اليوم الدراسي'
          );

          return (
            schoolDate >= startDate &&
            schoolDate <= endDate &&
            schoolDate >= monthStart &&
            schoolDate <= monthEnd
          );
        });

        return {
          week,
          startDate,
          endDate,
          hasSchoolDayInMonth,
        };
      })
      .filter((item) => item.hasSchoolDayInMonth)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    if (!selectedWeeks.length) {
      throw new Error(
        'لا توجد أسابيع دراسية تتقاطع تواريخها مع الشهر المحدد.'
      );
    }

    // Create one workbook
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const schoolName =
      meta.schoolName || schoolSettingsService.getSchoolName();

    const lastColumn = 2 + TOTAL_WEEKLY_PERIODS;

    // Create one weekly-style worksheet per actual attendance week
    selectedWeeks.forEach(({ week, startDate, endDate }, index) => {

      const attendances = week.attendances ?? [];

      const actualWeekNumber = week.weekNumber ?? index + 1;

      const worksheet = workbook.addWorksheet(
        `الأسبوع ${index + 1}`,
        {
          views: [
            {
              rightToLeft: true,
              state: 'frozen',
              xSplit: 2,
              ySplit: 5,
            },
          ],
        }
      );

      // A4 Landscape Print Setup
      worksheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
      };

      worksheet.pageSetup.printArea =
        `A1:${worksheet.getColumn(lastColumn).letter}${5 + attendances.length}`;

      // ==========================================
      // TITLE
      // ==========================================

      worksheet.mergeCells(1, 1, 1, lastColumn);

      const titleCell = worksheet.getCell(1, 1);

      titleCell.value =
        `${schoolName} — تقرير الحضور والغياب الأسبوعي (الأسبوع ${actualWeekNumber})`;

      titleCell.font = {
        name: 'Arial',
        size: 14,
        bold: true,
        color: { argb: COLORS.headerText },
      };

      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg },
      };

      titleCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      worksheet.getRow(1).height = 30;

      // ==========================================
      // METADATA
      // ==========================================

      worksheet.mergeCells(2, 1, 2, lastColumn);

      const metaCell = worksheet.getCell(2, 1);

      metaCell.value =
        `العام الدراسي: ${meta.academicYear}` +
        ` | الشعبة: ${meta.className ?? '—'}` +
        ` | الفترة: ${startDate} - ${endDate}` +
        ` | عدد الطلاب: ${attendances.length}`;

      metaCell.font = {
        name: 'Arial',
        size: 10,
        color: { argb: 'FF5F6B73' },
      };

      metaCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.subheaderBg },
      };

      metaCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      worksheet.getRow(2).height = 20;
      worksheet.getRow(3).height = 10;

      // ==========================================
      // STUDENT IDENTITY HEADERS
      // ==========================================

      worksheet.mergeCells('A4:A5');
      worksheet.getCell('A4').value = 'رقم الهوية';

      worksheet.mergeCells('B4:B5');
      worksheet.getCell('B4').value = 'اسم الطالب';

      // ==========================================
      // DAY HEADERS
      // ==========================================

      let currentStartCol = 3;
      const dayHeaders = SCHOOL_DAYS.map((day) => {
        const count = getPeriodsCountForDay(day.dayNumber);
        const startCol = currentStartCol;
        const endCol = currentStartCol + count - 1;
        currentStartCol += count;
        return {
          name: day.nameAr,
          startCol,
          endCol,
          periodCount: count,
        };
      });

      dayHeaders.forEach((dayHeader) => {

        worksheet.mergeCells(
          4,
          dayHeader.startCol,
          4,
          dayHeader.endCol
        );

        const cell = worksheet.getCell(4, dayHeader.startCol);

        cell.value = dayHeader.name;

        cell.font = {
          name: 'Arial',
          size: 11,
          bold: true,
          color: { argb: COLORS.subheaderText },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8EB' },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = BORDER_THIN;
      });

      worksheet.getRow(4).height = 22;
      worksheet.getRow(5).height = 20;

      // ==========================================
      // PERIOD NUMBERS
      // ==========================================

      dayHeaders.forEach((dayHeader) => {

        for (
          let periodIndex = 1;
          periodIndex <= dayHeader.periodCount;
          periodIndex++
        ) {

          const cell = worksheet.getCell(
            5,
            dayHeader.startCol + (periodIndex - 1)
          );

          cell.value = `ح ${periodIndex}`;

          cell.font = {
            name: 'Arial',
            size: 9,
            bold: true,
            color: { argb: 'FF5F6B73' },
          };

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F3F5' },
          };

          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
          };

          cell.border = BORDER_THIN;
        }
      });

      // Style Identity Headers
      ['A4', 'B4'].forEach((address) => {

        const cell = worksheet.getCell(address);

        cell.font = {
          name: 'Arial',
          size: 11,
          bold: true,
          color: { argb: COLORS.subheaderText },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8EB' },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = BORDER_THIN;
      });

      // ==========================================
      // STUDENT ATTENDANCE DATA
      // Same attendance cells as weekly report
      // ==========================================

      attendances.forEach((item) => {

        const rowValues: (string | number)[] = [
          item.enrollment.student?.nationalId || '',
          item.enrollment.studentName || '',
        ];

        const statuses: AttendanceStatus[] = [];

        SCHOOL_DAYS.forEach((day) => {

          getPeriodsForDay(day.dayNumber).forEach((period) => {

            const slot = item.slots[day.dayNumber]?.[period];

            const status: AttendanceStatus =
              slot?.status ?? 'Unmarked';

            statuses.push(status);

            rowValues.push(getStatusStyle(status).label);
          });
        });

        const row = worksheet.addRow(rowValues);

        row.height = 20;

        // National ID
        const idCell = row.getCell(1);

        idCell.numFmt = '@';

        idCell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        idCell.border = BORDER_THIN;

        // Student Name
        const nameCell = row.getCell(2);

        nameCell.alignment = {
          horizontal: 'right',
          vertical: 'middle',
        };

        nameCell.font = {
          name: 'Arial',
          size: 10,
          bold: true,
        };

        nameCell.border = BORDER_THIN;

        // Attendance Status Styling
        statuses.forEach((status, statusIndex) => {

          const cell = row.getCell(statusIndex + 3);

          const style = getStatusStyle(status);

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: style.fill },
          };

          cell.font = {
            name: 'Arial',
            size: 8.5,
            bold: true,
            color: { argb: style.fontColor },
          };

          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
          };

          cell.border = BORDER_THIN;
        });
      });

      // ==========================================
      // COLUMN WIDTHS
      // ==========================================

      worksheet.getColumn(1).width = 16;
      worksheet.getColumn(2).width = 28;

      for (
        let column = 3;
        column <= lastColumn;
        column++
      ) {
        worksheet.getColumn(column).width = 7.5;
      }

      // ==========================================
      // AUTO FILTER
      // ==========================================

      if (attendances.length > 0) {

        worksheet.autoFilter = {
          from: { row: 5, column: 1 },
          to: {
            row: 5 + attendances.length,
            column: lastColumn,
          },
        };
      }
    });

    // ==========================================
    // DOWNLOAD ONE MONTHLY WORKBOOK
    // ==========================================

    const buffer = await workbook.xlsx.writeBuffer();

    const safeClassName = String(
      meta.className ?? 'AllClasses'
    ).replace(/[\\/:*?"<>|]/g, '-');

    const filename =
      `Mowathib_Monthly_Attendance_${meta.academicYear}_${meta.month}_${safeClassName}.xlsx`;

    saveExcelFile(buffer, filename);
  },

  // ==========================================
  // 4. DAILY ABSENCE ONLY EXCEL EXPORT
  // ==========================================

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

    const worksheet = workbook.addWorksheet(
      'سجل الغياب اليومي',
      {
        views: [
          {
            rightToLeft: true,
            state: 'frozen',
            xSplit: 2,
            ySplit: 4,
          },
        ],
      }
    );

    worksheet.mergeCells('A1:F1');

    const title = worksheet.getCell('A1');

    title.value =
      `${meta.schoolName || schoolSettingsService.getSchoolName()} — ` +
      `سجل الغياب اليومي (${meta.date})`;

    title.font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: COLORS.headerText },
    };

    title.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.absentText },
    };

    title.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.getRow(1).height = 30;

    worksheet.mergeCells('A2:F2');

    const metaCell = worksheet.getCell('A2');

    metaCell.value =
      `العام الدراسي: ${meta.academicYear} | ` +
      `الشعبة: ${meta.className} | ` +
      `اليوم: ${meta.dayName} | ` +
      `إجمالي حالات الغياب: ${records.length}`;

    metaCell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: 'FF5F6B73' },
    };

    metaCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.subheaderBg },
    };

    metaCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.getRow(2).height = 20;

    const headers = [
      'رقم الهوية',
      'اسم الطالب',
      'الشعبة',
      'التاريخ',
      'اليوم',
      'رقم الحصة',
    ];

    const hRow = worksheet.addRow(headers);

    hRow.height = 24;

    hRow.eachCell((c) => {

      c.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: COLORS.subheaderText },
      };

      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8EB' },
      };

      c.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      c.border = BORDER_THIN;
    });

    records.forEach((row, idx) => {

      const r = worksheet.addRow([
        row.nationalId,
        row.studentName,
        row.className,
        row.date,
        row.dayName,
        `الحصة ${row.periodNumber}`,
      ]);

      r.height = 20;

      r.getCell(1).numFmt = '@';

      r.getCell(1).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      r.getCell(1).border = BORDER_THIN;

      r.getCell(2).alignment = {
        horizontal: 'right',
        vertical: 'middle',
      };

      r.getCell(2).font = { bold: true };
      r.getCell(2).border = BORDER_THIN;

      for (let c = 3; c <= 6; c++) {

        const cell = r.getCell(c);

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = BORDER_THIN;

        if (idx % 2 === 1) {

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.zebraBg },
          };
        }
      }
    });

    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 28;
    worksheet.getColumn(3).width = 14;
    worksheet.getColumn(4).width = 14;
    worksheet.getColumn(5).width = 14;
    worksheet.getColumn(6).width = 14;

    worksheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + records.length, column: 6 },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    const filename =
      `Mowathib_Daily_Absence_${meta.academicYear}_${meta.className}_${meta.date}.xlsx`;

    saveExcelFile(buffer, filename);
  },

  // ==========================================
  // 5. BATCH ATTENDANCE REPORT FOR ENTIRE STAGE
  // ==========================================

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

    const activeSchoolName =
      stageData.schoolName || schoolSettingsService.getSchoolName();

    // ==========================================
    // SHEET 1: STAGE SUMMARY
    // ==========================================

    const summarySheet = workbook.addWorksheet(
      'ملخص المرحلة',
      {
        views: [
          {
            rightToLeft: true,
            state: 'frozen',
            xSplit: 0,
            ySplit: 6,
          },
        ],
      }
    );

    summarySheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    // Title
    summarySheet.mergeCells('A1:H1');

    const titleCell = summarySheet.getCell('A1');

    titleCell.value =
      `${activeSchoolName} — التقرير الشامل لحضور وغياب ${stageData.stageName}`;

    titleCell.font = {
      name: 'Arial',
      size: 15,
      bold: true,
      color: { argb: COLORS.headerText },
    };

    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg },
    };

    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getRow(1).height = 32;

    // Metadata
    summarySheet.mergeCells('A2:H2');

    const metaCell = summarySheet.getCell('A2');

    metaCell.value =
      `العام الدراسي: ${stageData.academicYear} | ` +
      `الأسبوع الدراسي: الأسبوع ${stageData.weekNumber} (${stageData.weekRange}) | ` +
      `عدد الشعب المشمولة: ${stageData.classesData.length} شعبة | ` +
      `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}`;

    metaCell.font = {
      name: 'Arial',
      size: 10,
      color: { argb: 'FF5F6B73' },
    };

    metaCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.subheaderBg },
    };

    metaCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getRow(2).height = 22;

    summarySheet.getRow(3).height = 10;

    // Stage Statistics
    let stageTotalStudents = 0;
    let stageTotalPresent = 0;
    let stageTotalAbsent = 0;
    let stageTotalDiscontinued = 0;

    const classSummaries = stageData.classesData.map((c) => {

      const studentCount = c.enrollments.length;

      stageTotalStudents += studentCount;

      let classPresent = 0;
      let classAbsent = 0;
      let classDiscontinued = 0;

      c.enrollments.forEach((en) => {

        SCHOOL_DAYS.forEach((day) => {

          getPeriodsForDay(day.dayNumber).forEach((p) => {

            const match = c.records.find(
              (r) =>
                r.enrollmentId === en.enrollmentId &&
                r.dayNumber === day.dayNumber &&
                r.periodNumber === p
            );

            if (match) {

              if (match.status === 'Present') {
                classPresent++;
              } else if (match.status === 'Absent') {
                classAbsent++;
              } else if (match.status === 'Discontinued') {
                classDiscontinued++;
              }
            }
          });
        });
      });

      stageTotalPresent += classPresent;
      stageTotalAbsent += classAbsent;
      stageTotalDiscontinued += classDiscontinued;

      const totalRecorded = classPresent + classAbsent;

      const attendanceRate =
        totalRecorded > 0
          ? (classPresent / totalRecorded) * 100
          : 0;

      const absenceRate =
        totalRecorded > 0
          ? (classAbsent / totalRecorded) * 100
          : 0;

      return {
        classItem: c.classItem,
        representativeName: c.representativeName,
        studentCount,
        present: classPresent,
        absent: classAbsent,
        discontinued: classDiscontinued,
        attendanceRate,
        absenceRate,
      };
    });

    const totalStageRecorded =
      stageTotalPresent + stageTotalAbsent;

    const stageAttendanceRate =
      totalStageRecorded > 0
        ? (stageTotalPresent / totalStageRecorded) * 100
        : 0;

    const stageAbsenceRate =
      totalStageRecorded > 0
        ? (stageTotalAbsent / totalStageRecorded) * 100
        : 0;

    // ==========================================
    // KPI BLOCKS
    // ==========================================

    // Total Students
    summarySheet.mergeCells('A4:B4');
    summarySheet.getCell('A4').value = 'إجمالي طلاب المرحلة';

    summarySheet.getCell('A4').font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FF5F6B73' },
    };

    summarySheet.getCell('A4').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getCell('A4').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F7F8' },
    };

    summarySheet.mergeCells('A5:B5');

    summarySheet.getCell('A5').value =
      `${stageTotalStudents} طالب`;

    summarySheet.getCell('A5').font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: 'FF17252B' },
    };

    summarySheet.getCell('A5').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getCell('A5').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F7F8' },
    };

    // Total Present
    summarySheet.mergeCells('C4:D4');

    summarySheet.getCell('C4').value =
      'إجمالي الحضور المسجل';

    summarySheet.getCell('C4').font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FF176B3A' },
    };

    summarySheet.getCell('C4').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getCell('C4').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5EC' },
    };

    summarySheet.mergeCells('C5:D5');

    summarySheet.getCell('C5').value =
      `${stageTotalPresent} حصة`;

    summarySheet.getCell('C5').font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: 'FF176B3A' },
    };

    summarySheet.getCell('C5').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getCell('C5').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5EC' },
    };

    // Total Absence
    summarySheet.mergeCells('E4:F4');

    summarySheet.getCell('E4').value =
      'إجمالي الغياب المسجل';

    summarySheet.getCell('E4').font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FFA61B1B' },
    };

    summarySheet.getCell('E4').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getCell('E4').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFDECEC' },
    };

    summarySheet.mergeCells('E5:F5');

    summarySheet.getCell('E5').value =
      `${stageTotalAbsent} حصة`;

    summarySheet.getCell('E5').font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: 'FFA61B1B' },
    };

    summarySheet.getCell('E5').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getCell('E5').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFDECEC' },
    };

    // Stage Attendance Rate
    summarySheet.mergeCells('G4:H4');

    summarySheet.getCell('G4').value =
      'النسبة العامة لحضور المرحلة';

    summarySheet.getCell('G4').font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FF245B63' },
    };

    summarySheet.getCell('G4').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getCell('G4').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F1F1' },
    };

    summarySheet.mergeCells('G5:H5');

    summarySheet.getCell('G5').value =
      `${stageAttendanceRate.toFixed(1)}%`;

    summarySheet.getCell('G5').font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: 'FF245B63' },
    };

    summarySheet.getCell('G5').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    summarySheet.getCell('G5').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F1F1' },
    };

    // KPI Borders
    for (let r = 4; r <= 5; r++) {

      for (let c = 1; c <= 8; c++) {
        summarySheet.getCell(r, c).border = BORDER_THIN;
      }
    }

    summarySheet.getRow(4).height = 18;
    summarySheet.getRow(5).height = 24;

    // ==========================================
    // CLASS COMPARISON TABLE
    // ==========================================

    const tableHeaders = [
      'م',
      'الشعبة / الفصل',
      'عدد الطلاب المقيدين',
      'إجمالي الحضور (حصة)',
      'إجمالي الغياب (حصة)',
      'نسبة الحضور',
      'نسبة الغياب',
      'عريف الصف المعتمد',
    ];

    const headerRow = summarySheet.addRow(tableHeaders);

    headerRow.height = 26;

    headerRow.eachCell((c) => {

      c.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: COLORS.headerText },
      };

      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg },
      };

      c.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      c.border = BORDER_THIN;
    });

    // Class Rows
    classSummaries.forEach((cs, idx) => {

      const row = summarySheet.addRow([
        idx + 1,
        cs.classItem.className,
        cs.studentCount,
        cs.present,
        cs.absent,
        `${cs.attendanceRate.toFixed(1)}%`,
        `${cs.absenceRate.toFixed(1)}%`,
        cs.representativeName || 'غير مسند',
      ]);

      row.height = 22;

      row.eachCell((cell, colNum) => {

        cell.font = {
          name: 'Arial',
          size: 10,
          color: { argb: 'FF17252B' },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = BORDER_THIN;

        if (colNum === 2) {

          cell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FF245B63' },
          };

        } else if (colNum === 6) {

          cell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FF176B3A' },
          };

        } else if (colNum === 7) {

          cell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FFA61B1B' },
          };
        }

        if (idx % 2 === 1) {

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.zebraBg },
          };
        }
      });
    });

    // Grand Total
    const totalRow = summarySheet.addRow([
      'الإجمالي العام للمرحلة',
      `${classSummaries.length} شعبة`,
      stageTotalStudents,
      stageTotalPresent,
      stageTotalAbsent,
      `${stageAttendanceRate.toFixed(1)}%`,
      `${stageAbsenceRate.toFixed(1)}%`,
      '—',
    ]);

    totalRow.height = 26;

    totalRow.eachCell((cell) => {

      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: COLORS.subheaderText },
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE4EBED' },
      };

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      cell.border = BORDER_THIN;
    });

    // Summary Column Widths
    summarySheet.getColumn(1).width = 6;
    summarySheet.getColumn(2).width = 20;
    summarySheet.getColumn(3).width = 20;
    summarySheet.getColumn(4).width = 22;
    summarySheet.getColumn(5).width = 22;
    summarySheet.getColumn(6).width = 16;
    summarySheet.getColumn(7).width = 16;
    summarySheet.getColumn(8).width = 24;

    summarySheet.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: 6 + classSummaries.length, column: 8 },
    };

    // ==========================================
    // INDIVIDUAL CLASS WORKSHEETS
    // ==========================================

    stageData.classesData.forEach((classData) => {

      const safeSheetName =
        classData.classItem.className.toString()
          .replace(/[\\/?*\[\]:]/g, '-')
          .substring(0, 30);

      const classSheet = workbook.addWorksheet(safeSheetName, {
        views: [
          {
            rightToLeft: true,
            state: 'frozen',
            xSplit: 2,
            ySplit: 5,
          },
        ],
      });

      classSheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      // Header Title
      classSheet.mergeCells('A1:AN1');

      const cTitle = classSheet.getCell('A1');

      cTitle.value =
        `${activeSchoolName} — سجل الحضور والغياب الأسبوعي: ` +
        `${classData.classItem.className} (${stageData.stageName})`;

      cTitle.font = {
        name: 'Arial',
        size: 13,
        bold: true,
        color: { argb: COLORS.headerText },
      };

      cTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg },
      };

      cTitle.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      classSheet.getRow(1).height = 30;

      // Metadata
      classSheet.mergeCells('A2:AN2');

      const cMeta = classSheet.getCell('A2');

      cMeta.value =
        `العام الدراسي: ${stageData.academicYear} | ` +
        `الأسبوع ${stageData.weekNumber} (${stageData.weekRange}) | ` +
        `عدد الطلاب: ${classData.enrollments.length} طالب | ` +
        `العريف: ${classData.representativeName || 'غير مسند'}`;

      cMeta.font = {
        name: 'Arial',
        size: 10,
        color: { argb: 'FF5F6B73' },
      };

      cMeta.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.subheaderBg },
      };

      cMeta.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      classSheet.getRow(2).height = 20;

      // Day Headers
      classSheet.mergeCells('A4:A5');
      classSheet.getCell('A4').value = 'رقم الهوية';

      classSheet.mergeCells('B4:B5');
      classSheet.getCell('B4').value = 'اسم الطالب';

      const dayColumnRanges = [
        { name: 'الأحد', startCol: 3, endCol: 9, count: 7 },
        { name: 'الاثنين', startCol: 10, endCol: 16, count: 7 },
        { name: 'الثلاثاء', startCol: 17, endCol: 23, count: 7 },
        { name: 'الأربعاء', startCol: 24, endCol: 29, count: 6 },
        { name: 'الخميس', startCol: 30, endCol: 35, count: 6 },
      ];

      dayColumnRanges.forEach((dh) => {

        classSheet.mergeCells(
          4,
          dh.startCol,
          4,
          dh.endCol
        );

        const cell = classSheet.getCell(4, dh.startCol);

        cell.value = dh.name;

        cell.font = {
          name: 'Arial',
          size: 11,
          bold: true,
          color: { argb: COLORS.subheaderText },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8EB' },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = BORDER_THIN;
      });

      // Totals Headers
      classSheet.mergeCells('AJ4:AJ5');
      classSheet.getCell('AJ4').value = 'حاضر';

      classSheet.mergeCells('AK4:AK5');
      classSheet.getCell('AK4').value = 'غائب';

      classSheet.mergeCells('AL4:AL5');
      classSheet.getCell('AL4').value = 'النسبة %';

      ['A4', 'B4', 'AJ4', 'AK4', 'AL4'].forEach((addr) => {

        const c = classSheet.getCell(addr);

        c.font = {
          name: 'Arial',
          size: 10,
          bold: true,
          color: { argb: COLORS.subheaderText },
        };

        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8EB' },
        };

        c.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        c.border = BORDER_THIN;
      });

      classSheet.getRow(4).height = 22;

      // Period Numbers
      classSheet.getRow(5).height = 20;

      dayColumnRanges.forEach((dh) => {

        for (let p = 1; p <= dh.count; p++) {

          const colIndex = dh.startCol + p - 1;

          const pCell = classSheet.getCell(5, colIndex);

          pCell.value = p;

          pCell.font = {
            name: 'Arial',
            size: 9,
            bold: true,
            color: { argb: 'FF5F6B73' },
          };

          pCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F7F8' },
          };

          pCell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
          };

          pCell.border = BORDER_THIN;
        }
      });

      // Student Data
      let classTotalPresentPeriods = 0;
      let classTotalAbsentPeriods = 0;

      classData.enrollments.forEach((en, eIdx) => {

        const rowValues: (string | number)[] = [
          en.student?.nationalId || '',
          en.studentName || '',
        ];

        let studentPresent = 0;
        let studentAbsent = 0;

        SCHOOL_DAYS.forEach((day) => {

          getPeriodsForDay(day.dayNumber).forEach((p) => {

            const match = classData.records.find(
              (r) =>
                r.enrollmentId === en.enrollmentId &&
                r.dayNumber === day.dayNumber &&
                r.periodNumber === p
            );

            if (match) {

              if (match.status === 'Present') {

                rowValues.push('ح');
                studentPresent++;

              } else if (match.status === 'Absent') {

                rowValues.push('غ');
                studentAbsent++;

              } else if (match.status === 'Discontinued') {

                rowValues.push('م');

              } else {

                rowValues.push('-');
              }

            } else {

              rowValues.push('-');
            }
          });
        });

        classTotalPresentPeriods += studentPresent;
        classTotalAbsentPeriods += studentAbsent;

        const totalStudentRecorded =
          studentPresent + studentAbsent;

        const studentRate =
          totalStudentRecorded > 0
            ? (studentPresent / totalStudentRecorded) * 100
            : 0;

        rowValues.push(studentPresent);
        rowValues.push(studentAbsent);
        rowValues.push(`${studentRate.toFixed(0)}%`);

        const sRow = classSheet.addRow(rowValues);

        sRow.height = 20;

        // Student Cell Styling
        sRow.eachCell((cell, colNum) => {

          cell.border = BORDER_THIN;

          cell.alignment = {
            vertical: 'middle',
            horizontal: colNum === 2 ? 'right' : 'center',
          };

          if (colNum === 1) {

            cell.font = {
              name: 'Arial',
              size: 9,
              color: { argb: 'FF5F6B73' },
            };

          } else if (colNum === 2) {

            cell.font = {
              name: 'Arial',
              size: 10,
              bold: true,
              color: { argb: 'FF17252B' },
            };

          } else if (colNum >= 3 && colNum <= 35) {

            const val = cell.value?.toString();

            if (val === 'ح') {

              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.presentBg },
              };

              cell.font = {
                name: 'Arial',
                size: 9,
                bold: true,
                color: { argb: COLORS.presentText },
              };

            } else if (val === 'غ') {

              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.absentBg },
              };

              cell.font = {
                name: 'Arial',
                size: 9,
                bold: true,
                color: { argb: COLORS.absentText },
              };

            } else if (val === 'م') {

              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.discontinuedBg },
              };

              cell.font = {
                name: 'Arial',
                size: 9,
                bold: true,
                color: { argb: COLORS.discontinuedText },
              };

            } else {

              cell.font = {
                name: 'Arial',
                size: 9,
                color: { argb: 'FF89949A' },
              };
            }

          } else if (colNum === 36) {

            cell.font = {
              name: 'Arial',
              size: 10,
              bold: true,
              color: { argb: 'FF176B3A' },
            };

          } else if (colNum === 37) {

            cell.font = {
              name: 'Arial',
              size: 10,
              bold: true,
              color: { argb: 'FFA61B1B' },
            };

          } else if (colNum === 38) {

            cell.font = {
              name: 'Arial',
              size: 10,
              bold: true,
              color: { argb: 'FF245B63' },
            };
          }

          if (
            eIdx % 2 === 1 &&
            (colNum <= 2 || colNum >= 36)
          ) {

            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: COLORS.zebraBg },
            };
          }
        });
      });

      // Class Total Row
      const classRecordedTotal =
        classTotalPresentPeriods + classTotalAbsentPeriods;

      const classFinalRate =
        classRecordedTotal > 0
          ? (classTotalPresentPeriods / classRecordedTotal) * 100
          : 0;

      const classSummaryValues: (string | number)[] = [
        'المجموع الإجمالي',
        `${classData.enrollments.length} طالب`,
      ];

      for (let i = 0; i < TOTAL_WEEKLY_PERIODS; i++) {
        classSummaryValues.push('—');
      }

      classSummaryValues.push(classTotalPresentPeriods);
      classSummaryValues.push(classTotalAbsentPeriods);
      classSummaryValues.push(`${classFinalRate.toFixed(1)}%`);

      const classBottomRow = classSheet.addRow(classSummaryValues);

      classBottomRow.height = 24;

      classBottomRow.eachCell((cell) => {

        cell.font = {
          name: 'Arial',
          size: 10,
          bold: true,
          color: { argb: COLORS.subheaderText },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8EFF0' },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = BORDER_THIN;
      });

      // Column Widths
      classSheet.getColumn(1).width = 15;
      classSheet.getColumn(2).width = 28;

      for (let c = 3; c <= 35; c++) {
        classSheet.getColumn(c).width = 4.2;
      }

      classSheet.getColumn(36).width = 12;
      classSheet.getColumn(37).width = 12;
      classSheet.getColumn(38).width = 12;

      classSheet.autoFilter = {
        from: { row: 5, column: 1 },
        to: {
          row: 5 + classData.enrollments.length,
          column: 38,
        },
      };
    });

    // Download Stage Report
    const buffer = await workbook.xlsx.writeBuffer();

    const stageSanitized =
      stageData.stageName.replace(/\s+/g, '_');

    const filename =
      `Mowathib_${stageSanitized}_Week_${stageData.weekNumber}_${stageData.academicYear}.xlsx`;

    saveExcelFile(buffer, filename);
  },

  // ==========================================
  // 5. STAGE DAILY ABSENCE REPORT (CONSOLIDATED WORKBOOK)
  // ==========================================
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
    const schoolName = params.schoolName || schoolSettingsService.getSchoolName();

    // 1. Stage Summary Sheet
    const summarySheet = workbook.addWorksheet('ملخص المرحلة', {
      views: [{ rightToLeft: true }],
    });

    summarySheet.mergeCells('A1:F1');
    const sTitle = summarySheet.getCell('A1');
    sTitle.value = `${schoolName} — كشف الغياب اليومي المجمع لـ ${params.stageName}`;
    sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } };
    sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    summarySheet.mergeCells('A2:F2');
    const sMeta = summarySheet.getCell('A2');
    sMeta.value = `العام الدراسي: ${params.academicYear} | اليوم: ${params.dayName} (${params.date}) | تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')}`;
    sMeta.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
    sMeta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
    sMeta.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(2).height = 22;

    // Calculate Stage Totals
    let stageTotalStudents = 0;
    let stageTotalAbsentStudents = 0;
    const classRows: Array<{
      className: string;
      repName: string;
      totalStudents: number;
      absentStudents: number;
      rate: number;
    }> = [];

    params.classesData.forEach((cd) => {
      const totalStudents = cd.enrollments.length;
      stageTotalStudents += totalStudents;

      const absentEnrollmentIds = new Set(
        cd.records.filter((r) => r.status === 'Absent').map((r) => r.enrollmentId)
      );
      const absentCount = absentEnrollmentIds.size;
      stageTotalAbsentStudents += absentCount;

      const rate = totalStudents > 0 ? ((totalStudents - absentCount) / totalStudents) * 100 : 100;

      classRows.push({
        className: String(cd.classItem.className || cd.classItem.classId),
        repName: cd.representativeName || '—',
        totalStudents,
        absentStudents: absentCount,
        rate,
      });
    });

    const stageAttendanceRate =
      stageTotalStudents > 0
        ? ((stageTotalStudents - stageTotalAbsentStudents) / stageTotalStudents) * 100
        : 100;

    summarySheet.addRow([]);
    const kpiRow = summarySheet.addRow([
      'إجمالي طلاب المرحلة',
      stageTotalStudents,
      'إجمالي الغائبين',
      stageTotalAbsentStudents,
      'نسبة الحضور العامة',
      `${stageAttendanceRate.toFixed(1)}%`,
    ]);
    kpiRow.height = 24;
    kpiRow.eachCell((cell, col) => {
      cell.border = BORDER_THIN;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (col % 2 === 1) {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
      } else {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.headerBg } };
      }
    });

    summarySheet.addRow([]);

    const headers = ['م', 'الشعبة', 'العريف المسؤول', 'إجمالي الطلاب', 'عدد الطلاب الغائبين', 'نسبة الحضور'];
    const hRow = summarySheet.addRow(headers);
    hRow.height = 24;
    hRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;
    });

    classRows.forEach((r, idx) => {
      const row = summarySheet.addRow([
        idx + 1,
        `شعبة ${r.className}`,
        r.repName,
        r.totalStudents,
        r.absentStudents,
        `${r.rate.toFixed(1)}%`,
      ]);
      row.height = 20;
      row.eachCell((cell, col) => {
        cell.border = BORDER_THIN;
        cell.alignment = { vertical: 'middle', horizontal: col === 2 || col === 3 ? 'right' : 'center' };
        if (col === 5 && r.absentStudents > 0) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.absentText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } };
        } else if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
        }
      });
    });

    const tRow = summarySheet.addRow([
      'الإجمالي',
      `${params.classesData.length} شعب`,
      '—',
      stageTotalStudents,
      stageTotalAbsentStudents,
      `${stageAttendanceRate.toFixed(1)}%`,
    ]);
    tRow.height = 24;
    tRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EFF0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;
    });

    summarySheet.getColumn(1).width = 6;
    summarySheet.getColumn(2).width = 16;
    summarySheet.getColumn(3).width = 24;
    summarySheet.getColumn(4).width = 16;
    summarySheet.getColumn(5).width = 18;
    summarySheet.getColumn(6).width = 16;

    // 2. Class Worksheets
    params.classesData.forEach((cd) => {
      const cname = String(cd.classItem.className || cd.classItem.classId);
      const classSheet = workbook.addWorksheet(`شعبة ${cname}`, {
        views: [{ rightToLeft: true }],
      });

      classSheet.mergeCells('A1:E1');
      const csTitle = classSheet.getCell('A1');
      csTitle.value = `${schoolName} — كشف غياب شعبة ${cname} (${params.dayName} ${params.date})`;
      csTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.headerText } };
      csTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      csTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      classSheet.getRow(1).height = 28;

      classSheet.mergeCells('A2:E2');
      const csMeta = classSheet.getCell('A2');
      csMeta.value = `العريف المسؤول: ${cd.representativeName || 'غير معين'} | إجمالي طلاب الشعبة: ${cd.enrollments.length} طالب`;
      csMeta.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
      csMeta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
      csMeta.alignment = { horizontal: 'center', vertical: 'middle' };
      classSheet.getRow(2).height = 20;

      const absentMap: Array<{
        enrollmentId: number;
        nationalId: string;
        studentName: string;
        absentPeriods: number[];
      }> = [];

      cd.enrollments.forEach((en) => {
        const studentAbsences = cd.records
          .filter((r) => r.enrollmentId === en.enrollmentId && r.status === 'Absent')
          .map((r) => r.periodNumber)
          .sort((a, b) => a - b);

        if (studentAbsences.length > 0) {
          absentMap.push({
            enrollmentId: en.enrollmentId,
            nationalId: en.student?.nationalId || '',
            studentName: en.studentName || en.student?.fullName || '',
            absentPeriods: studentAbsences,
          });
        }
      });

      if (absentMap.length === 0) {
        classSheet.addRow([]);
        classSheet.mergeCells('A4:E4');
        const noteCell = classSheet.getCell('A4');
        noteCell.value = '✓ لا توجد أي حالات غياب مسجلة لهذه الشعبة اليوم (نسبة انضباط 100%)';
        noteCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF176B3A' } };
        noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.presentBg } };
        noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
        classSheet.getRow(4).height = 32;
      } else {
        classSheet.addRow([]);
        const cHeaders = ['م', 'رقم الهوية الوطنية', 'اسم الطالب الغائب', 'الحصص التي غاب بها', 'إجمالي الحصص'];
        const chRow = classSheet.addRow(cHeaders);
        chRow.height = 22;
        chRow.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA61B1B' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = BORDER_THIN;
        });

        absentMap.forEach((s, idx) => {
          const row = classSheet.addRow([
            idx + 1,
            s.nationalId,
            s.studentName,
            s.absentPeriods.map((p) => `الحصة ${p}`).join('، '),
            s.absentPeriods.length,
          ]);
          row.height = 20;
          row.eachCell((cell, col) => {
            cell.border = BORDER_THIN;
            cell.alignment = { vertical: 'middle', horizontal: col === 3 ? 'right' : 'center' };
            if (idx % 2 === 1) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
            }
          });
        });
      }

      classSheet.getColumn(1).width = 6;
      classSheet.getColumn(2).width = 18;
      classSheet.getColumn(3).width = 28;
      classSheet.getColumn(4).width = 30;
      classSheet.getColumn(5).width = 14;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const stageSanitized = params.stageName.replace(/\s+/g, '_');
    saveExcelFile(buffer, `Mowathib_Daily_Absence_${stageSanitized}_${params.date}.xlsx`);
  },

  // ==========================================
  // 6. STAGE WEEKLY ABSENCE REPORT (CONSOLIDATED WORKBOOK)
  // ==========================================
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
    const schoolName = params.schoolName || schoolSettingsService.getSchoolName();

    const summarySheet = workbook.addWorksheet('ملخص الأسبوع', {
      views: [{ rightToLeft: true }],
    });

    summarySheet.mergeCells('A1:F1');
    const sTitle = summarySheet.getCell('A1');
    sTitle.value = `${schoolName} — كشف الغياب الأسبوعي المجمع لـ ${params.stageName}`;
    sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } };
    sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    summarySheet.mergeCells('A2:F2');
    const sMeta = summarySheet.getCell('A2');
    sMeta.value = `العام الدراسي: ${params.academicYear} | الأسبوع: ${params.weekNumber} (${params.weekRange}) | تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')}`;
    sMeta.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
    sMeta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
    sMeta.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(2).height = 22;

    summarySheet.addRow([]);

    const headers = ['م', 'الشعبة', 'العريف المسؤول', 'إجمالي الطلاب', 'إجمالي حصص الغياب', 'نسبة الحضور'];
    const hRow = summarySheet.addRow(headers);
    hRow.height = 24;
    hRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;
    });

    params.classesData.forEach((cd, idx) => {
      const cname = String(cd.classItem.className || cd.classItem.classId);
      const totalStudents = cd.enrollments.length;
      const absentSlots = cd.records.filter((r) => r.status === 'Absent').length;
      const totalExpected = totalStudents * TOTAL_WEEKLY_PERIODS;
      const rate = totalExpected > 0 ? ((totalExpected - absentSlots) / totalExpected) * 100 : 100;

      const row = summarySheet.addRow([
        idx + 1,
        `شعبة ${cname}`,
        cd.representativeName || '—',
        totalStudents,
        absentSlots,
        `${rate.toFixed(1)}%`,
      ]);
      row.height = 20;
      row.eachCell((cell, col) => {
        cell.border = BORDER_THIN;
        cell.alignment = { vertical: 'middle', horizontal: col === 2 || col === 3 ? 'right' : 'center' };
        if (col === 5 && absentSlots > 0) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.absentText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } };
        } else if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
        }
      });
    });

    summarySheet.getColumn(1).width = 6;
    summarySheet.getColumn(2).width = 16;
    summarySheet.getColumn(3).width = 24;
    summarySheet.getColumn(4).width = 16;
    summarySheet.getColumn(5).width = 18;
    summarySheet.getColumn(6).width = 16;

    params.classesData.forEach((cd) => {
      const cname = String(cd.classItem.className || cd.classItem.classId);
      const classSheet = workbook.addWorksheet(`شعبة ${cname}`, {
        views: [{ rightToLeft: true }],
      });

      classSheet.mergeCells('A1:I1');
      const csTitle = classSheet.getCell('A1');
      csTitle.value = `${schoolName} — غياب شعبة ${cname} (الأسبوع ${params.weekNumber})`;
      csTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.headerText } };
      csTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      csTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      classSheet.getRow(1).height = 28;

      const cHeaders = ['م', 'رقم الهوية', 'اسم الطالب', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'إجمالي الغياب'];
      const chRow = classSheet.addRow(cHeaders);
      chRow.height = 22;
      chRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
      });

      cd.enrollments.forEach((en, idx) => {
        const dayAbsences: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalStudentAbsent = 0;

        cd.records.forEach((r) => {
          if (r.enrollmentId === en.enrollmentId && r.status === 'Absent') {
            dayAbsences[r.dayNumber] = (dayAbsences[r.dayNumber] || 0) + 1;
            totalStudentAbsent++;
          }
        });

        const row = classSheet.addRow([
          idx + 1,
          en.student?.nationalId || '',
          en.studentName || en.student?.fullName || '',
          dayAbsences[1] > 0 ? `${dayAbsences[1]} حصة` : '—',
          dayAbsences[2] > 0 ? `${dayAbsences[2]} حصة` : '—',
          dayAbsences[3] > 0 ? `${dayAbsences[3]} حصة` : '—',
          dayAbsences[4] > 0 ? `${dayAbsences[4]} حصة` : '—',
          dayAbsences[5] > 0 ? `${dayAbsences[5]} حصة` : '—',
          totalStudentAbsent,
        ]);
        row.height = 20;
        row.eachCell((cell, col) => {
          cell.border = BORDER_THIN;
          cell.alignment = { vertical: 'middle', horizontal: col === 3 ? 'right' : 'center' };
          if (col === 9 && totalStudentAbsent > 0) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.absentText } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } };
          } else if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
          }
        });
      });

      classSheet.getColumn(1).width = 6;
      classSheet.getColumn(2).width = 16;
      classSheet.getColumn(3).width = 28;
      for (let c = 4; c <= 8; c++) classSheet.getColumn(c).width = 12;
      classSheet.getColumn(9).width = 14;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const stageSanitized = params.stageName.replace(/\s+/g, '_');
    saveExcelFile(buffer, `Mowathib_Weekly_Absence_${stageSanitized}_Week_${params.weekNumber}.xlsx`);
  },

  // ==========================================
  // 7. STAGE MONTHLY ABSENCE REPORT (CONSOLIDATED WORKBOOK)
  // ==========================================
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
    const schoolName = params.schoolName || schoolSettingsService.getSchoolName();

    const summarySheet = workbook.addWorksheet('ملخص الشهر', {
      views: [{ rightToLeft: true }],
    });

    summarySheet.mergeCells('A1:F1');
    const sTitle = summarySheet.getCell('A1');
    sTitle.value = `${schoolName} — كشف الغياب الشهري المجمع لـ ${params.stageName} (${params.monthStr})`;
    sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } };
    sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    summarySheet.addRow([]);

    const headers = ['م', 'الشعبة', 'العريف المسؤول', 'إجمالي الطلاب', 'إجمالي حصص الغياب', 'نسبة الحضور'];
    const hRow = summarySheet.addRow(headers);
    hRow.height = 24;
    hRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;
    });

    params.classesData.forEach((cd, idx) => {
      const cname = String(cd.classItem.className || cd.classItem.classId);
      const totalStudents = cd.enrollments.length;
      const totalAbsents = cd.monthlySummary.reduce((acc, s) => acc + s.absentCount, 0);
      const avgRate =
        cd.monthlySummary.length > 0
          ? cd.monthlySummary.reduce((acc, s) => acc + s.attendanceRate, 0) / cd.monthlySummary.length
          : 100;

      const row = summarySheet.addRow([
        idx + 1,
        `شعبة ${cname}`,
        cd.representativeName || '—',
        totalStudents,
        totalAbsents,
        `${avgRate.toFixed(1)}%`,
      ]);
      row.height = 20;
      row.eachCell((cell, col) => {
        cell.border = BORDER_THIN;
        cell.alignment = { vertical: 'middle', horizontal: col === 2 || col === 3 ? 'right' : 'center' };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
        }
      });
    });

    summarySheet.getColumn(1).width = 6;
    summarySheet.getColumn(2).width = 16;
    summarySheet.getColumn(3).width = 24;
    summarySheet.getColumn(4).width = 16;
    summarySheet.getColumn(5).width = 18;
    summarySheet.getColumn(6).width = 16;

    params.classesData.forEach((cd) => {
      const cname = String(cd.classItem.className || cd.classItem.classId);
      const classSheet = workbook.addWorksheet(`شعبة ${cname}`, {
        views: [{ rightToLeft: true }],
      });

      classSheet.mergeCells('A1:G1');
      const csTitle = classSheet.getCell('A1');
      csTitle.value = `${schoolName} — غياب شعبة ${cname} (${params.monthStr})`;
      csTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.headerText } };
      csTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      csTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      classSheet.getRow(1).height = 28;

      const cHeaders = ['م', 'رقم الهوية', 'اسم الطالب', 'الحصص المتوقعة', 'حضور', 'غياب', 'نسبة الحضور'];
      const chRow = classSheet.addRow(cHeaders);
      chRow.height = 22;
      chRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
      });

      cd.monthlySummary.forEach((s, idx) => {
        const row = classSheet.addRow([
          idx + 1,
          s.nationalId,
          s.studentName,
          s.totalExpected,
          s.presentCount,
          s.absentCount,
          `${s.attendanceRate.toFixed(1)}%`,
        ]);
        row.height = 20;
        row.eachCell((cell, col) => {
          cell.border = BORDER_THIN;
          cell.alignment = { vertical: 'middle', horizontal: col === 3 ? 'right' : 'center' };
          if (col === 6 && s.absentCount > 0) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.absentText } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } };
          } else if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
          }
        });
      });

      classSheet.getColumn(1).width = 6;
      classSheet.getColumn(2).width = 16;
      classSheet.getColumn(3).width = 28;
      classSheet.getColumn(4).width = 14;
      classSheet.getColumn(5).width = 12;
      classSheet.getColumn(6).width = 12;
      classSheet.getColumn(7).width = 14;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const stageSanitized = params.stageName.replace(/\s+/g, '_');
    saveExcelFile(buffer, `Mowathib_Monthly_Absence_${stageSanitized}_${params.monthStr}.xlsx`);
  },

  // ==========================================
  // COMPLETE GRADE-LEVEL WEEKLY PREPARATION EXPORT (Stacked Tables)
  // ==========================================

  async exportGradeWeeklyPreparation(params: {
    gradeName: string;
    weekNumber: number;
    weekRange: string;
    academicYear?: string;
    classesData: Array<{
      classItem: ClassItem;
      className: string;
      classNumber?: number;
      attendances: StudentWeeklyAttendance[];
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(params.gradeName, {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 2 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    let currentRow = 1;
    for (const classData of params.classesData) {
      currentRow = appendClassWeeklyPreparationToWorksheet(
        worksheet,
        currentRow,
        classData,
        {
          weekNumber: params.weekNumber,
          weekRange: params.weekRange,
          academicYear: params.academicYear,
        }
      );
      currentRow += 2; // Spacer between class tables
    }

    // Set Column Widths
    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 26;
    for (let c = 3; c <= 35; c++) {
      worksheet.getColumn(c).width = 5.8;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const sanitizedGrade = params.gradeName.replace(/\s+/g, '_');
    saveExcelFile(buffer, `Mowathib_Weekly_${sanitizedGrade}_Week${params.weekNumber}.xlsx`);
  },

  // ==========================================
  // ALL 3 GRADES WEEKLY PREPARATION IN ONE WORKBOOK (3 Worksheets)
  // ==========================================

  async exportAllGradesWeeklyPreparation(params: {
    weekNumber: number;
    weekRange: string;
    academicYear?: string;
    gradesData: Array<{
      gradeName: string;
      classesData: Array<{
        classItem: ClassItem;
        className: string;
        classNumber?: number;
        attendances: StudentWeeklyAttendance[];
      }>;
    }>;
  }): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    for (const grade of params.gradesData) {
      const worksheet = workbook.addWorksheet(grade.gradeName, {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 2 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      let currentRow = 1;
      for (const classData of grade.classesData) {
        currentRow = appendClassWeeklyPreparationToWorksheet(
          worksheet,
          currentRow,
          classData,
          {
            weekNumber: params.weekNumber,
            weekRange: params.weekRange,
            academicYear: params.academicYear,
          }
        );
        currentRow += 2; // Spacer between class tables
      }

      // Column Widths
      worksheet.getColumn(1).width = 16;
      worksheet.getColumn(2).width = 26;
      for (let c = 3; c <= 35; c++) {
        worksheet.getColumn(c).width = 5.8;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveExcelFile(buffer, `Mowathib_Weekly_Preparation_All_Grades_Week${params.weekNumber}.xlsx`);
  },

  // ==========================================
  // FIVE CONSECUTIVE WEEKS MONTHLY PREPARATION EXPORT
  // ==========================================

  async exportFiveWeeksMonthlyPreparation(params: {
    className: string;
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

    const sheetTitle = `شهري 5 أسابيع شعبة ${params.classNumber || params.className}`;
    const worksheet = workbook.addWorksheet(sheetTitle.slice(0, 31), {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 2 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    let currentRow = 1;
    for (const weekData of params.weeksData) {
      currentRow = appendClassWeeklyPreparationToWorksheet(
        worksheet,
        currentRow,
        {
          className: params.className,
          classNumber: params.classNumber,
          attendances: weekData.attendances,
        },
        {
          weekNumber: weekData.weekNumber,
          weekRange: weekData.weekRange,
          academicYear: params.academicYear,
        }
      );
      currentRow += 3; // Prominent spacer between consecutive weekly tables
    }

    // Column Widths
    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 26;
    for (let c = 3; c <= 35; c++) {
      worksheet.getColumn(c).width = 5.8;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveExcelFile(
      buffer,
      `Mowathib_Monthly_5Weeks_Class${params.classNumber || params.className}_RefWeek${params.referenceWeekNumber}.xlsx`
    );
  },
};

// =============================================================================
// Helper: Append a single class's weekly preparation table to any worksheet
// =============================================================================

function appendClassWeeklyPreparationToWorksheet(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  classData: {
    className: string;
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
  const totalCols = 35; // 2 identity cols + 33 periods (7+7+7+6+6)

  // 1. Class Header Banner
  worksheet.mergeCells(startRow, 1, startRow, totalCols);
  const titleCell = worksheet.getCell(startRow, 1);
  titleCell.value = `${classData.className.startsWith('شعبة') ? classData.className : `شعبة ${classData.className}`} — كشف التحضير الأسبوعي (الأسبوع ${meta.weekNumber})`;
  titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLORS.headerText } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(startRow).height = 26;

  // 2. Class Metadata Row
  worksheet.mergeCells(startRow + 1, 1, startRow + 1, totalCols);
  const metaCell = worksheet.getCell(startRow + 1, 1);
  metaCell.value = `المدرسة: ${meta.schoolName || schoolSettingsService.getSchoolName()} | الفترة: ${meta.weekRange} | عدد الطلاب: ${classData.attendances.length} | العام الدراسي: ${meta.academicYear || '1446-1447هـ'}`;
  metaCell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF5F6B73' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(startRow + 1).height = 19;

  // 3. Grid Table Headers (Row startRow + 3 & startRow + 4)
  const hRow1 = startRow + 3;
  const hRow2 = startRow + 4;

  // Identity Headers
  worksheet.mergeCells(hRow1, 1, hRow2, 1);
  const idH = worksheet.getCell(hRow1, 1);
  idH.value = 'رقم الهوية';
  idH.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
  idH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
  idH.alignment = { horizontal: 'center', vertical: 'middle' };
  idH.border = BORDER_THIN;

  worksheet.mergeCells(hRow1, 2, hRow2, 2);
  const nameH = worksheet.getCell(hRow1, 2);
  nameH.value = 'اسم الطالب';
  nameH.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
  nameH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
  nameH.alignment = { horizontal: 'center', vertical: 'middle' };
  nameH.border = BORDER_THIN;

  // Calculate day headers columns
  let currentStartCol = 3;
  const dayHeaders = SCHOOL_DAYS.map((day) => {
    const count = getPeriodsCountForDay(day.dayNumber);
    const startCol = currentStartCol;
    const endCol = currentStartCol + count - 1;
    currentStartCol += count;
    return {
      name: day.nameAr,
      startCol,
      endCol,
      periodCount: count,
    };
  });

  // Day Name Cells
  dayHeaders.forEach((dh) => {
    worksheet.mergeCells(hRow1, dh.startCol, hRow1, dh.endCol);
    const cell = worksheet.getCell(hRow1, dh.startCol);
    cell.value = dh.name;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_THIN;
  });

  worksheet.getRow(hRow1).height = 22;
  worksheet.getRow(hRow2).height = 19;

  // Period Numbers
  dayHeaders.forEach((dh) => {
    for (let p = 1; p <= dh.periodCount; p++) {
      const col = dh.startCol + (p - 1);
      const cell = worksheet.getCell(hRow2, col);
      cell.value = `ح ${p}`;
      cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF5F6B73' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;
    }
  });

  // 4. Data Rows
  let curRow = hRow2 + 1;
  classData.attendances.forEach((item) => {
    const r = worksheet.getRow(curRow);
    r.height = 19;

    const idCell = r.getCell(1);
    idCell.value = item.enrollment.student?.nationalId || '—';
    idCell.numFmt = '@';
    idCell.font = { name: 'Arial', size: 9 };
    idCell.alignment = { horizontal: 'center', vertical: 'middle' };
    idCell.border = BORDER_THIN;

    const nameCell = r.getCell(2);
    nameCell.value = item.enrollment.studentName || 'طالب';
    nameCell.font = { name: 'Arial', size: 9.5, bold: true };
    nameCell.alignment = { horizontal: 'right', vertical: 'middle' };
    nameCell.border = BORDER_THIN;

    let colIdx = 3;
    SCHOOL_DAYS.forEach((day) => {
      getPeriodsForDay(day.dayNumber).forEach((p) => {
        const cell = r.getCell(colIdx);
        const slot = item.slots[day.dayNumber]?.[p];
        const st = slot ? slot.status : 'Unmarked';
        const style = getStatusStyle(st);

        cell.value = style.label;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
        cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: style.fontColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;

        colIdx++;
      });
    });

    curRow++;
  });

  return curRow;
}
