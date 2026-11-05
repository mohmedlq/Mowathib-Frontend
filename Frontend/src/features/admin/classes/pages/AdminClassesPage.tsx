import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schoolDataService } from '../../../../shared/services/schoolDataService';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, CalendarCheck, Search } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';

export function AdminClassesPage() {
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState<number>(0); // 0 = all
  const [search, setSearch] = useState('');

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolDataService.getClasses(),
  });

  const { data: reps = [] } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => schoolDataService.getRepresentatives(),
  });

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (selectedGrade === 1 && !(c.classId >= 101 && c.classId <= 110)) return false;
      if (selectedGrade === 2 && !(c.classId >= 201 && c.classId <= 210)) return false;
      if (selectedGrade === 3 && !(c.classId >= 301 && c.classId <= 310)) return false;
      if (search.trim() && !c.className.includes(search) && !c.classId.toString().includes(search)) return false;
      return true;
    });
  }, [classes, selectedGrade, search]);

  const getGradeName = (classId: number) => {
    if (classId >= 101 && classId <= 110) return 'الأول الثانوي';
    if (classId >= 201 && classId <= 210) return 'الثاني الثانوي';
    if (classId >= 301 && classId <= 310) return 'الثالث الثانوي';
    return 'شعبة دراسية';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1F1] text-[#245B63] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#17252B]">إدارة الفصول والشعب الدراسية</h1>
              <p className="text-xs text-[#5F6B73] mt-0.5">
                استعراض الشعب الدراسية الـ 30، بطاقات الاستئذان المخصصة، والعرفاء المعتمدين
              </p>
            </div>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1 bg-[#E8F1F1] text-[#245B63] rounded-lg border border-[#CDE0E2] self-start sm:self-auto font-mono">
          إجمالي: {classes.length} شعبة معتمدة
        </span>
      </div>

      {/* Grade Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DCE3E6] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedGrade(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 0
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            جميع المراحل ({classes.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 1
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الأول الثانوي (101-110)
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 2
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الثاني الثانوي (201-210)
          </button>
          <button
            type="button"
            onClick={() => setSelectedGrade(3)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedGrade === 3
                ? 'bg-[#245B63] text-white shadow-xs'
                : 'bg-[#F5F7F8] text-[#5F6B73] hover:text-[#17252B]'
            }`}
          >
            الثالث الثانوي (301-310)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم أو اسم الشعبة..."
            className="w-full h-9.5 pr-9 pl-3 text-xs bg-[#F5F7F8] border border-[#DCE3E6] rounded-lg focus:bg-white focus:border-[#245B63] focus:ring-1 focus:ring-[#245B63] outline-none transition-all placeholder:text-[#89949A]"
          />
          <Search className="w-4 h-4 text-[#89949A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-xs text-[#5F6B73]">جاري تحميل الشعب الدراسية...</div>
        ) : filteredClasses.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-[#89949A] bg-white rounded-xl border border-[#DCE3E6]">
            لا توجد شعب مطابقة لخيارات الفرز الحالية
          </div>
        ) : (
          filteredClasses.map((c) => {
            const mainRep = reps.find((r) => r.username === `${c.classId}_1` || (r.className === c.className && r.role === 'Representative'));
            const depRep = reps.find((r) => r.username === `${c.classId}_2` || (r.className === c.className && r.role === 'Deputy'));

            return (
              <div
                key={c.classId}
                className="bg-white rounded-xl border border-[#DCE3E6] p-5 shadow-xs flex flex-col justify-between hover:border-[#245B63] hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#EEF2F3] pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#17252B] font-mono">{c.className}</span>
                      <span className="text-[10px] text-[#5F6B73] px-2 py-0.5 rounded bg-[#F5F7F8] border border-[#EEF2F3] font-medium">
                        {getGradeName(c.classId)}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#E8F1F1] text-[#245B63] font-bold">
                      رمز: {c.classId}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[#5F6B73] py-1 border-b border-[#FAFCFD]">
                      <span>رصيد بطاقات الاستئذان:</span>
                      <span className="font-mono font-bold text-[#17252B] bg-[#FFF4DA] text-[#855500] px-2 py-0.5 rounded border border-[#EDD38C]">
                        {c.totalCards} بطاقات
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#5F6B73] py-1 border-b border-[#FAFCFD]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#245B63]"></span>
                        <span>العريف الأساسي:</span>
                      </span>
                      <span className="font-medium text-[#17252B] truncate max-w-[140px]">
                        {mainRep?.studentName || `${c.classId}_1`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#5F6B73] py-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#89949A]"></span>
                        <span>النائب:</span>
                      </span>
                      <span className="font-medium text-[#17252B] truncate max-w-[140px]">
                        {depRep?.studentName || `${c.classId}_2`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#EEF2F3] flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    onClick={() => navigate(`/admin/attendance?classId=${c.classId}`)}
                    icon={<CalendarCheck className="w-3.5 h-3.5 text-[#245B63]" />}
                  >
                    رصد الحضور
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    onClick={() => navigate(`/admin/students?classId=${c.classId}`)}
                    icon={<Users className="w-3.5 h-3.5" />}
                  >
                    الطلاب
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AdminClassesPage;
