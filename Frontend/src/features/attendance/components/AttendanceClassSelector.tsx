import type { ClassItem } from '../../../shared/types';

export interface AttendanceClassSelectorProps {
  classes: ClassItem[];
  selectedClassId: number;
  onSelectClass: (classId: number) => void;
  className?: string;
  allowAllOption?: boolean;
}

export function AttendanceClassSelector({
  classes,
  selectedClassId,
  onSelectClass,
  className,
  allowAllOption = false,
}: AttendanceClassSelectorProps) {
  // Helper to reliably extract class number
  const getClassNum = (c: ClassItem) => {
    const val = Number(c.classNumber ?? c.className ?? c.classId);
    return Number.isFinite(val) ? val : c.classId;
  };

  // Group by grade: Grade 1 (100s), Grade 2 (200s), Grade 3 (300s)
  const grade1 = classes.filter((c) => getClassNum(c) >= 101 && getClassNum(c) <= 110);
  const grade2 = classes.filter((c) => getClassNum(c) >= 201 && getClassNum(c) <= 210);
  const grade3 = classes.filter((c) => getClassNum(c) >= 301 && getClassNum(c) <= 310);
  const others = classes.filter((c) => {
    const num = getClassNum(c);
    return !(num >= 101 && num <= 110) && !(num >= 201 && num <= 210) && !(num >= 301 && num <= 310);
  });

  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-[#17252B] dark:text-[#F0F4F6] mb-1.5 select-none">
        الشعبة / الفصل:
      </label>
      <select
        value={selectedClassId}
        onChange={(e) => onSelectClass(Number(e.target.value))}
        className="w-full h-10 px-3 bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6] text-xs font-medium rounded-lg border border-[#DCE3E6] dark:border-[#28373D] focus:border-[#245B63] dark:focus:border-[#388B96] focus:ring-1 focus:ring-[#245B63] outline-none cursor-pointer transition-colors"
      >

        {grade1.length > 0 && (
          <optgroup label="الصف الأول الثانوي (101 - 109)" className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
            {grade1.map((c) => (
              <option key={c.classId} value={c.classId} className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
                 {c.className} — الصف الأول الثانوي
              </option>
            ))}
          </optgroup>
        )}

        {grade2.length > 0 && (
          <optgroup label="الصف الثاني الثانوي (201 - 210)" className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
            {grade2.map((c) => (
              <option key={c.classId} value={c.classId} className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
                 {c.className} — الصف الثاني الثانوي
              </option>
            ))}
          </optgroup>
        )}

        {grade3.length > 0 && (
          <optgroup label="الصف الثالث الثانوي (301 - 309)" className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
            {grade3.map((c) => (
              <option key={c.classId} value={c.classId} className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
                 {c.className} — الصف الثالث الثانوي
              </option>
            ))}
          </optgroup>
        )}

        {others.length > 0 && (
          <optgroup label="شعب أخرى" className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
            {others.map((c) => (
              <option key={c.classId} value={c.classId} className="bg-white dark:bg-[#182226] text-[#17252B] dark:text-[#F0F4F6]">
                شعبة {c.className}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
