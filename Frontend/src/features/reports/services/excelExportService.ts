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
  SCHOOL_PERIODS,
  type AttendanceStatus,
  type ClassItem,
  type ClassEnrollment,
  type AttendanceRecord,
} from '../../../shared/types';
import { ATTENDANCE_STATUS_ARABIC } from '../../../shared/types';

// Theme color ARGB tokens
const COLORS = {
  headerBg: 'FF245B63',
  headerText: 'FFFFFFFF',
  subheaderBg: 'FFEEF2F3',
  subheaderText: 'FF17252B',
  border: 'FFDCE3E6',
  zebraBg: 'FFFAFCFD',
  // Status Colors
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
      return { fill: COLORS.presentBg, fontColor: COLORS.presentText, label: ATTENDANCE_STATUS_ARABIC.Present };
    case 'Absent':
      return { fill: COLORS.absentBg, fontColor: COLORS.absentText, label: ATTENDANCE_STATUS_ARABIC.Absent };
    case 'Discontinued':
      return { fill: COLORS.discontinuedBg, fontColor: COLORS.discontinuedText, label: ATTENDANCE_STATUS_ARABIC.Discontinued };
    case 'Unmarked':
    default:
      return { fill: COLORS.unmarkedBg, fontColor: COLORS.unmarkedText, label: ATTENDANCE_STATUS_ARABIC.Unmarked };
  }
}

export const excelExportService = {
  // 1. DAILY ATTENDANCE EXCEL EXPORT
  async exportDailyAttendance(
    data: DailyAttendanceRow[],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: string;
      dayName: string;
      date: string;
      isAbsenceOnly?: boolean;
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const sheetName = meta.isAbsenceOnly ? 'تقرير الغياب اليومي' : 'التقرير اليومي';
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 5 }],
    });

    // 1. Title Block
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${meta.schoolName || schoolSettingsService.getSchoolName()} — ${meta.isAbsenceOnly ? 'تقرير الغياب اليومي' : 'تقرير الحضور اليومي'}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // 2. Metadata row
    worksheet.mergeCells('A2:L2');
    const metaCell = worksheet.getCell('A2');
    metaCell.value = `العام الدراسي: ${meta.academicYear}  |  الشعبة: ${meta.className}  |  اليوم: ${meta.dayName} (${meta.date})  |  تاريخ التوليد: ${new Date().toLocaleDateString('ar-SA')}`;
    metaCell.font = { name: 'Arial', size: 10, color: { argb: 'FF5F6B73' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]); // Blank spacer

    // 3. Table Header
    const headers = [
      'رقم الهوية',
      'اسم الطالب',
      'الحصة 1',
      'الحصة 2',
      'الحصة 3',
      'الحصة 4',
      'الحصة 5',
      'الحصة 6',
      'الحصة 7',
      'حاضر',
      'غائب',
      'منقطع',
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.subheaderText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;
    });

    // 4. Data Rows
    data.forEach((row, idx) => {
      const rowValues = [
        row.nationalId,
        row.studentName,
        getStatusStyle(row.periods[1]).label,
        getStatusStyle(row.periods[2]).label,
        getStatusStyle(row.periods[3]).label,
        getStatusStyle(row.periods[4]).label,
        getStatusStyle(row.periods[5]).label,
        getStatusStyle(row.periods[6]).label,
        getStatusStyle(row.periods[7]).label,
        row.presentCount,
        row.absentCount,
        row.discontinuedCount,
      ];

      const r = worksheet.addRow(rowValues);
      r.height = 20;

      // Identity columns styling
      const idCell = r.getCell(1);
      idCell.numFmt = '@';
      idCell.alignment = { horizontal: 'center', vertical: 'middle' };
      idCell.font = { name: 'Arial', size: 10 };
      idCell.border = BORDER_THIN;

      const nameCell = r.getCell(2);
      nameCell.alignment = { horizontal: 'right', vertical: 'middle' };
      nameCell.font = { name: 'Arial', size: 10, bold: true };
      nameCell.border = BORDER_THIN;

      // Periods 1-7 cell background color mapping
      for (let p = 1; p <= 7; p++) {
        const cell = r.getCell(p + 2);
        const style = getStatusStyle(row.periods[p]);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: style.fontColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
      }

      // Totals columns
      for (let c = 10; c <= 12; c++) {
        const cell = r.getCell(c);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.border = BORDER_THIN;
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
        }
      }
    });

    // Column widths
    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 28;
    for (let i = 3; i <= 9; i++) worksheet.getColumn(i).width = 12;
    worksheet.getColumn(10).width = 10;
    worksheet.getColumn(11).width = 10;
    worksheet.getColumn(12).width = 10;

    // Enable auto filter
    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + data.length, column: 12 },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Mowathib_Daily_Attendance_${meta.academicYear}_${meta.className}_${meta.date}.xlsx`;
    saveAs(new Blob([buffer]), filename);
  },

  // 2. WEEKLY ATTENDANCE EXCEL EXPORT (Grouped Day Headers)
  async exportWeeklyAttendance(
    attendances: StudentWeeklyAttendance[],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: string;
      weekNumber: number;
      weekRange: string;
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('التقرير الأسبوعي', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 5 }],
    });

    // 1. Main Title
    worksheet.mergeCells('A1:AK1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${meta.schoolName || schoolSettingsService.getSchoolName()} — تقرير الحضور والغياب الأسبوعي (الأسبوع ${meta.weekNumber})`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // 2. Metadata row
    worksheet.mergeCells('A2:AK2');
    const metaCell = worksheet.getCell('A2');
    metaCell.value = `العام الدراسي: ${meta.academicYear}  |  الشعبة: ${meta.className}  |  الفترة: ${meta.weekRange}  |  عدد الطلاب: ${attendances.length}`;
    metaCell.font = { name: 'Arial', size: 10, color: { argb: 'FF5F6B73' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    // 3. Merged Day Headers (Row 4)
    // A4:B4 merged for Student Identity
    worksheet.mergeCells('A4:A5');
    worksheet.getCell('A4').value = 'رقم الهوية';
    worksheet.mergeCells('B4:B5');
    worksheet.getCell('B4').value = 'اسم الطالب';

    const dayHeaders = [
      { name: 'الأحد', startCol: 3, endCol: 9 },
      { name: 'الاثنين', startCol: 10, endCol: 16 },
      { name: 'الثلاثاء', startCol: 17, endCol: 23 },
      { name: 'الأربعاء', startCol: 24, endCol: 30 },
      { name: 'الخميس', startCol: 31, endCol: 37 },
    ];

    dayHeaders.forEach((dh) => {
      worksheet.mergeCells(4, dh.startCol, 4, dh.endCol);
      const cell = worksheet.getCell(4, dh.startCol);
      cell.value = dh.name;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.subheaderText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;
    });

    worksheet.getRow(4).height = 22;

    // Row 5: Period Numbers 1 through 7 under each day
    worksheet.getRow(5).height = 20;
    const r5 = worksheet.getRow(5);
    dayHeaders.forEach((dh) => {
      for (let p = 1; p <= 7; p++) {
        const col = dh.startCol + (p - 1);
        const cell = r5.getCell(col);
        cell.value = `ح ${p}`;
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF5F6B73' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
      }
    });

    // Format A4, B4
    ['A4', 'B4'].forEach((pos) => {
      const c = worksheet.getCell(pos);
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.subheaderText } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = BORDER_THIN;
    });

    // 4. Data Rows (One student per row, 35 period status cells)
    attendances.forEach((item) => {
      const rowArr: (string | number)[] = [
        item.enrollment.student?.nationalId || '',
        item.enrollment.studentName || '',
      ];

      // 5 days x 7 periods = 35 cells
      SCHOOL_DAYS.forEach((day) => {
        SCHOOL_PERIODS.forEach((p) => {
          const slot = item.slots[day.dayNumber]?.[p];
          const st = slot ? slot.status : 'Unmarked';
          rowArr.push(getStatusStyle(st).label);
        });
      });

      const r = worksheet.addRow(rowArr);
      r.height = 20;

      // Identity columns
      const idCell = r.getCell(1);
      idCell.numFmt = '@';
      idCell.alignment = { horizontal: 'center', vertical: 'middle' };
      idCell.border = BORDER_THIN;

      const nameCell = r.getCell(2);
      nameCell.alignment = { horizontal: 'right', vertical: 'middle' };
      nameCell.font = { bold: true };
      nameCell.border = BORDER_THIN;

      // Color 35 period cells
      let colIdx = 3;
      SCHOOL_DAYS.forEach((day) => {
        SCHOOL_PERIODS.forEach((p) => {
          const cell = r.getCell(colIdx);
          const slot = item.slots[day.dayNumber]?.[p];
          const st = slot ? slot.status : 'Unmarked';
          const style = getStatusStyle(st);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: style.fontColor } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = BORDER_THIN;
          colIdx++;
        });
      });
    });

    // Set widths
    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 28;
    for (let i = 3; i <= 37; i++) worksheet.getColumn(i).width = 7.5;

    // Auto filter
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5 + attendances.length, column: 37 },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Mowathib_Weekly_Attendance_${meta.academicYear}_Week-${meta.weekNumber}_${meta.className}.xlsx`;
    saveAs(new Blob([buffer]), filename);
  },

  // 3. MONTHLY ATTENDANCE EXCEL EXPORT (Summary + Detailed Absence)
  async exportMonthlyReport(
    summaryData: MonthlyStudentSummaryRow[],
    detailedAbsences: MonthlyDetailedAbsenceRow[],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: string;
      month: string;
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    // Worksheet 1: ملخص الحضور الشهري
    const summarySheet = workbook.addWorksheet('ملخص الحضور الشهري', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
    });

    summarySheet.mergeCells('A1:I1');
    const title1 = summarySheet.getCell('A1');
    title1.value = `${meta.schoolName || schoolSettingsService.getSchoolName()} — ملخص الحضور والغياب الشهري (${meta.month})`;
    title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } };
    title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    title1.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    summarySheet.mergeCells('A2:I2');
    const meta1 = summarySheet.getCell('A2');
    meta1.value = `العام الدراسي: ${meta.academicYear}  |  الشعبة: ${meta.className}  |  الشهر: ${meta.month}`;
    meta1.font = { name: 'Arial', size: 10, color: { argb: 'FF5F6B73' } };
    meta1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
    meta1.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(2).height = 20;

    const summaryHeaders = [
      'رقم الهوية',
      'اسم الطالب',
      'الشعبة',
      'الحصص المتوقعة',
      'إجمالي الحضور',
      'إجمالي الغياب',
      'حالات الانقطاع',
      'غير محدد',
      'نسبة الحضور',
    ];

    const hRow1 = summarySheet.addRow(summaryHeaders);
    hRow1.height = 24;
    hRow1.eachCell((c) => {
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.subheaderText } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = BORDER_THIN;
    });

    summaryData.forEach((row, idx) => {
      const r = summarySheet.addRow([
        row.nationalId,
        row.studentName,
        row.className,
        row.totalExpected,
        row.presentCount,
        row.absentCount,
        row.discontinuedCount,
        row.unmarkedCount,
        `${row.attendanceRate.toFixed(1)}%`,
      ]);
      r.height = 20;

      r.getCell(1).numFmt = '@';
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(1).border = BORDER_THIN;

      r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(2).font = { bold: true };
      r.getCell(2).border = BORDER_THIN;

      for (let c = 3; c <= 9; c++) {
        const cell = r.getCell(c);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
        }
      }
    });

    summarySheet.getColumn(1).width = 16;
    summarySheet.getColumn(2).width = 28;
    summarySheet.getColumn(3).width = 14;
    for (let c = 4; c <= 9; c++) summarySheet.getColumn(c).width = 14;

    summarySheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + summaryData.length, column: 9 },
    };

    // Worksheet 2: تفاصيل الغياب الشهري
    const absenceSheet = workbook.addWorksheet('تفاصيل الغياب الشهري', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
    });

    absenceSheet.mergeCells('A1:F1');
    const title2 = absenceSheet.getCell('A1');
    title2.value = `${meta.schoolName || 'مدرسة التميز الثانوية'} — سجل الغياب التفصيلي (${meta.month})`;
    title2.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } };
    title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentText } };
    title2.alignment = { horizontal: 'center', vertical: 'middle' };
    absenceSheet.getRow(1).height = 30;

    absenceSheet.mergeCells('A2:F2');
    const meta2 = absenceSheet.getCell('A2');
    meta2.value = `العام الدراسي: ${meta.academicYear}  |  الشعبة: ${meta.className}  |  إجمالي سجلات الغياب: ${detailedAbsences.length}`;
    meta2.font = { name: 'Arial', size: 10, color: { argb: 'FF5F6B73' } };
    meta2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
    meta2.alignment = { horizontal: 'center', vertical: 'middle' };
    absenceSheet.getRow(2).height = 20;

    const absenceHeaders = ['رقم الهوية', 'اسم الطالب', 'الشعبة', 'التاريخ', 'اليوم', 'رقم الحصة'];
    const hRow2 = absenceSheet.addRow(absenceHeaders);
    hRow2.height = 24;
    hRow2.eachCell((c) => {
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.subheaderText } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = BORDER_THIN;
    });

    detailedAbsences.forEach((row, idx) => {
      const r = absenceSheet.addRow([
        row.nationalId,
        row.studentName,
        row.className,
        row.date,
        row.dayName,
        `الحصة ${row.periodNumber}`,
      ]);
      r.height = 20;

      r.getCell(1).numFmt = '@';
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(1).border = BORDER_THIN;

      r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(2).font = { bold: true };
      r.getCell(2).border = BORDER_THIN;

      for (let c = 3; c <= 6; c++) {
        const cell = r.getCell(c);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
        }
      }
    });

    absenceSheet.getColumn(1).width = 16;
    absenceSheet.getColumn(2).width = 28;
    absenceSheet.getColumn(3).width = 14;
    absenceSheet.getColumn(4).width = 14;
    absenceSheet.getColumn(5).width = 14;
    absenceSheet.getColumn(6).width = 14;

    absenceSheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + detailedAbsences.length, column: 6 },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Mowathib_Monthly_Report_${meta.academicYear}_${meta.month}_${meta.className}.xlsx`;
    saveAs(new Blob([buffer]), filename);
  },

  // 4. DAILY ABSENCE ONLY EXCEL EXPORT
  async exportDailyAbsence(
    records: DailyAbsenceRecord[],
    meta: {
      schoolName?: string;
      academicYear: string;
      className: string;
      date: string;
      dayName: string;
    }
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mowathib System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('سجل الغياب اليومي', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 4 }],
    });

    worksheet.mergeCells('A1:F1');
    const title = worksheet.getCell('A1');
    title.value = `${meta.schoolName || schoolSettingsService.getSchoolName()} — سجل الغياب اليومي (${meta.date})`;
    title.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.headerText } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentText } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells('A2:F2');
    const metaCell = worksheet.getCell('A2');
    metaCell.value = `العام الدراسي: ${meta.academicYear}  |  الشعبة: ${meta.className}  |  اليوم: ${meta.dayName}  |  إجمالي حالات الغياب: ${records.length}`;
    metaCell.font = { name: 'Arial', size: 10, color: { argb: 'FF5F6B73' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    const headers = ['رقم الهوية', 'اسم الطالب', 'الشعبة', 'التاريخ', 'اليوم', 'رقم الحصة'];
    const hRow = worksheet.addRow(headers);
    hRow.height = 24;
    hRow.eachCell((c) => {
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.subheaderText } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
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
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(1).border = BORDER_THIN;

      r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(2).font = { bold: true };
      r.getCell(2).border = BORDER_THIN;

      for (let c = 3; c <= 6; c++) {
        const cell = r.getCell(c);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
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
    const filename = `Mowathib_Daily_Absence_${meta.academicYear}_${meta.className}_${meta.date}.xlsx`;
    saveAs(new Blob([buffer]), filename);
  },

  // 5. BATCH ATTENDANCE REPORT EXPORT FOR ENTIRE ACADEMIC STAGE (ONE WORKBOOK)
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

    const activeSchoolName = stageData.schoolName || schoolSettingsService.getSchoolName();

    // =========================================================================
    // SHEET 1: ملخص المرحلة (Stage Summary & Class Comparison)
    // =========================================================================
    const summarySheet = workbook.addWorksheet('ملخص المرحلة', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 6 }],
    });
    summarySheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    // 1. Title
    summarySheet.mergeCells('A1:H1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `${activeSchoolName} — التقرير الشامل لحضور وغياب ${stageData.stageName}`;
    titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: COLORS.headerText } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 32;

    // 2. Metadata
    summarySheet.mergeCells('A2:H2');
    const metaCell = summarySheet.getCell('A2');
    metaCell.value = `العام الدراسي: ${stageData.academicYear}   |   الأسبوع الدراسي: الأسبوع ${stageData.weekNumber} (${stageData.weekRange})   |   عدد الشعب المشمولة: ${stageData.classesData.length} شعبة   |   تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}`;
    metaCell.font = { name: 'Arial', size: 10, color: { argb: 'FF5F6B73' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(2).height = 22;

    // Blank row 3
    summarySheet.getRow(3).height = 10;

    // Compute Stage Summary Statistics
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
          SCHOOL_PERIODS.forEach((p) => {
            const match = c.records.find(
              (r) =>
                r.enrollmentId === en.enrollmentId &&
                r.dayNumber === day.dayNumber &&
                r.periodNumber === p
            );
            if (match) {
              if (match.status === 'Present') classPresent++;
              else if (match.status === 'Absent') classAbsent++;
              else if (match.status === 'Discontinued') classDiscontinued++;
            }
          });
        });
      });

      stageTotalPresent += classPresent;
      stageTotalAbsent += classAbsent;
      stageTotalDiscontinued += classDiscontinued;

      const totalRecorded = classPresent + classAbsent;
      const attendanceRate = totalRecorded > 0 ? (classPresent / totalRecorded) * 100 : 0;
      const absenceRate = totalRecorded > 0 ? (classAbsent / totalRecorded) * 100 : 0;

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

    const totalStageRecorded = stageTotalPresent + stageTotalAbsent;
    const stageAttendanceRate = totalStageRecorded > 0 ? (stageTotalPresent / totalStageRecorded) * 100 : 0;
    const stageAbsenceRate = totalStageRecorded > 0 ? (stageTotalAbsent / totalStageRecorded) * 100 : 0;

    // 3. Stage KPI Stat Blocks (Row 4 & 5)
    // Block 1: Total Enrolled Students (A4:B5)
    summarySheet.mergeCells('A4:B4');
    summarySheet.getCell('A4').value = 'إجمالي طلاب المرحلة';
    summarySheet.getCell('A4').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF5F6B73' } };
    summarySheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7F8' } };
    summarySheet.mergeCells('A5:B5');
    summarySheet.getCell('A5').value = `${stageTotalStudents} طالب`;
    summarySheet.getCell('A5').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF17252B' } };
    summarySheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7F8' } };

    // Block 2: Total Recorded Present (C4:D4 & C5:D5)
    summarySheet.mergeCells('C4:D4');
    summarySheet.getCell('C4').value = 'إجمالي الحضور المسجل';
    summarySheet.getCell('C4').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF176B3A' } };
    summarySheet.getCell('C4').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5EC' } };
    summarySheet.mergeCells('C5:D5');
    summarySheet.getCell('C5').value = `${stageTotalPresent} حصة`;
    summarySheet.getCell('C5').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF176B3A' } };
    summarySheet.getCell('C5').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getCell('C5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5EC' } };

    // Block 3: Total Recorded Absence (E4:F4 & E5:F5)
    summarySheet.mergeCells('E4:F4');
    summarySheet.getCell('E4').value = 'إجمالي الغياب المسجل';
    summarySheet.getCell('E4').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFA61B1B' } };
    summarySheet.getCell('E4').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getCell('E4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDECEC' } };
    summarySheet.mergeCells('E5:F5');
    summarySheet.getCell('E5').value = `${stageTotalAbsent} حصة`;
    summarySheet.getCell('E5').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFA61B1B' } };
    summarySheet.getCell('E5').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDECEC' } };

    // Block 4: Stage Attendance Rate (G4:H4 & G5:H5)
    summarySheet.mergeCells('G4:H4');
    summarySheet.getCell('G4').value = 'النسبة العامة لحضور المرحلة';
    summarySheet.getCell('G4').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF245B63' } };
    summarySheet.getCell('G4').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getCell('G4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F1F1' } };
    summarySheet.mergeCells('G5:H5');
    summarySheet.getCell('G5').value = `${stageAttendanceRate.toFixed(1)}%`;
    summarySheet.getCell('G5').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF245B63' } };
    summarySheet.getCell('G5').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F1F1' } };

    // Add borders to KPI blocks
    for (let r = 4; r <= 5; r++) {
      for (let c = 1; c <= 8; c++) {
        summarySheet.getCell(r, c).border = BORDER_THIN;
      }
    }
    summarySheet.getRow(4).height = 18;
    summarySheet.getRow(5).height = 24;

    // 4. Comparison Table Headers (Row 7)
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
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.headerText } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = BORDER_THIN;
    });

    // 5. Comparison Table Rows for each class
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
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF17252B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;

        if (colNum === 2) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF245B63' } };
        } else if (colNum === 6) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF176B3A' } };
        } else if (colNum === 7) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFA61B1B' } };
        }

        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
        }
      });
    });

    // 6. Total Summary Row
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
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.subheaderText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4EBED' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = BORDER_THIN;
    });

    // Set Column Widths for Summary Sheet
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

    // =========================================================================
    // ADDITIONAL SHEETS: Individual Class Attendance Worksheets (One per class)
    // =========================================================================
    stageData.classesData.forEach((classData) => {
      // Excel worksheet names must be <= 31 chars and avoid : \ / ? * [ ]
      const safeSheetName = classData.classItem.className
        .replace(/[\\/?*[\]:]/g, '-')
        .substring(0, 30);

      const classSheet = workbook.addWorksheet(safeSheetName, {
        views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 5 }],
      });

      classSheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      // 1. Header Title
      classSheet.mergeCells('A1:AN1');
      const cTitle = classSheet.getCell('A1');
      cTitle.value = `${activeSchoolName} — سجل الحضور والغياب الأسبوعي: ${classData.classItem.className} (${stageData.stageName})`;
      cTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: COLORS.headerText } };
      cTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      cTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      classSheet.getRow(1).height = 30;

      // 2. Metadata
      classSheet.mergeCells('A2:AN2');
      const cMeta = classSheet.getCell('A2');
      cMeta.value = `العام الدراسي: ${stageData.academicYear}  |  الأسبوع ${stageData.weekNumber} (${stageData.weekRange})  |  عدد الطلاب: ${classData.enrollments.length} طالب  |  العريف: ${classData.representativeName || 'غير مسند'}`;
      cMeta.font = { name: 'Arial', size: 10, color: { argb: 'FF5F6B73' } };
      cMeta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheaderBg } };
      cMeta.alignment = { horizontal: 'center', vertical: 'middle' };
      classSheet.getRow(2).height = 20;

      // 3. Merged Day Headers (Row 4)
      classSheet.mergeCells('A4:A5');
      classSheet.getCell('A4').value = 'رقم الهوية';
      classSheet.mergeCells('B4:B5');
      classSheet.getCell('B4').value = 'اسم الطالب';

      const dayColumnRanges = [
        { name: 'الأحد', startCol: 3, endCol: 9 },
        { name: 'الاثنين', startCol: 10, endCol: 16 },
        { name: 'الثلاثاء', startCol: 17, endCol: 23 },
        { name: 'الأربعاء', startCol: 24, endCol: 30 },
        { name: 'الخميس', startCol: 31, endCol: 37 },
      ];

      dayColumnRanges.forEach((dh) => {
        classSheet.mergeCells(4, dh.startCol, 4, dh.endCol);
        const cell = classSheet.getCell(4, dh.startCol);
        cell.value = dh.name;
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.subheaderText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
      });

      // Totals columns headers (Row 4-5)
      classSheet.mergeCells('AL4:AL5');
      classSheet.getCell('AL4').value = 'حاضر';
      classSheet.mergeCells('AM4:AM5');
      classSheet.getCell('AM4').value = 'غائب';
      classSheet.mergeCells('AN4:AN5');
      classSheet.getCell('AN4').value = 'النسبة %';

      ['A4', 'B4', 'AL4', 'AM4', 'AN4'].forEach((addr) => {
        const c = classSheet.getCell(addr);
        c.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8EB' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = BORDER_THIN;
      });
      classSheet.getRow(4).height = 22;

      // Row 5: Period Numbers 1 through 7 under each day
      classSheet.getRow(5).height = 20;
      dayColumnRanges.forEach((dh) => {
        for (let p = 1; p <= 7; p++) {
          const colIndex = dh.startCol + p - 1;
          const pCell = classSheet.getCell(5, colIndex);
          pCell.value = p;
          pCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF5F6B73' } };
          pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7F8' } };
          pCell.alignment = { horizontal: 'center', vertical: 'middle' };
          pCell.border = BORDER_THIN;
        }
      });

      // 4. Data Rows for Students in this Class
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
          SCHOOL_PERIODS.forEach((p) => {
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

        const totalStudentRecorded = studentPresent + studentAbsent;
        const studentRate = totalStudentRecorded > 0 ? (studentPresent / totalStudentRecorded) * 100 : 0;

        rowValues.push(studentPresent);
        rowValues.push(studentAbsent);
        rowValues.push(`${studentRate.toFixed(0)}%`);

        const sRow = classSheet.addRow(rowValues);
        sRow.height = 20;

        // Styling student cells
        sRow.eachCell((cell, colNum) => {
          cell.border = BORDER_THIN;
          cell.alignment = { vertical: 'middle', horizontal: colNum === 2 ? 'right' : 'center' };

          if (colNum === 1) {
            cell.font = { name: 'Arial', size: 9, color: { argb: 'FF5F6B73' } };
          } else if (colNum === 2) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF17252B' } };
          } else if (colNum >= 3 && colNum <= 37) {
            const val = cell.value?.toString();
            if (val === 'ح') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.presentBg } };
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.presentText } };
            } else if (val === 'غ') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.absentBg } };
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.absentText } };
            } else if (val === 'م') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.discontinuedBg } };
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.discontinuedText } };
            } else {
              cell.font = { name: 'Arial', size: 9, color: { argb: 'FF89949A' } };
            }
          } else if (colNum === 38) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF176B3A' } };
          } else if (colNum === 39) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFA61B1B' } };
          } else if (colNum === 40) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF245B63' } };
          }

          if (eIdx % 2 === 1 && (colNum <= 2 || colNum >= 38)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraBg } };
          }
        });
      });

      // Bottom Class Total Row
      const classRecordedTotal = classTotalPresentPeriods + classTotalAbsentPeriods;
      const classFinalRate = classRecordedTotal > 0 ? (classTotalPresentPeriods / classRecordedTotal) * 100 : 0;

      const classSummaryValues: (string | number)[] = [
        'المجموع الإجمالي',
        `${classData.enrollments.length} طالب`,
      ];
      for (let i = 0; i < 35; i++) {
        classSummaryValues.push('—');
      }
      classSummaryValues.push(classTotalPresentPeriods);
      classSummaryValues.push(classTotalAbsentPeriods);
      classSummaryValues.push(`${classFinalRate.toFixed(1)}%`);

      const classBottomRow = classSheet.addRow(classSummaryValues);
      classBottomRow.height = 24;
      classBottomRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.subheaderText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EFF0' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_THIN;
      });

      // Column widths
      classSheet.getColumn(1).width = 15;
      classSheet.getColumn(2).width = 28;
      for (let c = 3; c <= 37; c++) {
        classSheet.getColumn(c).width = 4.2;
      }
      classSheet.getColumn(38).width = 12;
      classSheet.getColumn(39).width = 12;
      classSheet.getColumn(40).width = 12;

      classSheet.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: 5 + classData.enrollments.length, column: 40 },
      };
    });

    // Write file and download
    const buffer = await workbook.xlsx.writeBuffer();
    const stageSanitized = stageData.stageName.replace(/\s+/g, '_');
    const filename = `Mowathib_${stageSanitized}_Week_${stageData.weekNumber}_${stageData.academicYear}.xlsx`;
    saveAs(new Blob([buffer]), filename);
  },
};

