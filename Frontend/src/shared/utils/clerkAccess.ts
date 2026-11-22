import type { ClassItem, Student } from '../types';

export const CLERK_ACCESS_OPTIONS = [
  'جميع الشعب',
  'الصف الثالث ثانوي فقط',
  'الصف الثاني ثانوي فقط',
  'الصف الاول ثانوي فقط',
] as const;

export type ClerkAccessType = typeof CLERK_ACCESS_OPTIONS[number];

/**
 * Checks if a class number or ID matches the clerk's access scope:
 * - 101 to 110: الصف الأول ثانوي (Grade 1)
 * - 201 to 210: الصف الثاني ثانوي (Grade 2)
 * - 301 to 310: الصف الثالث ثانوي (Grade 3)
 * - "جميع الشعب": All sections
 */
export function isClassAllowedForClerk(classNumberOrId: number, access?: string | null): boolean {
  if (!access || access.includes('جميع')) return true;

  const num = Number(classNumberOrId);
  if (!Number.isFinite(num)) return true;

  if (access.includes('الاول') || access.includes('الأول')) {
    return num >= 101 && num <= 110;
  }
  if (access.includes('الثاني')) {
    return num >= 201 && num <= 210;
  }
  if (access.includes('الثالث')) {
    return num >= 301 && num <= 310;
  }
  return true;
}

/**
 * Filters a list of classes according to the clerk's access restrictions.
 */
export function filterClassesForClerk(classes: ClassItem[], access?: string | null): ClassItem[] {
  if (!access || access.includes('جميع')) return classes;
  return classes.filter((c) => {
    const rawNum = Number(c.classNumber ?? c.className ?? c.classId);
    const num = Number.isFinite(rawNum) ? rawNum : c.classId;
    return isClassAllowedForClerk(num, access);
  });
}

/**
 * Filters a list of students according to the clerk's access restrictions.
 */
export function filterStudentsForClerk(students: Student[], access?: string | null): Student[] {
  if (!access || access.includes('جميع')) return students;
  return students.filter((s) => {
    const rawNum = s.classNumber || (s.className ? parseInt(s.className.replace(/\D/g, ''), 10) : null);
    if (!rawNum) return false;
    return isClassAllowedForClerk(rawNum, access);
  });
}
