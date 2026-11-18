import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export interface PaginationControlsProps {
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  itemLabel?: string;
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  pageNumber,
  totalPages,
  totalCount,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  isLoading = false,
  itemLabel = 'سجل',
  className = '',
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const hasPrevious = pageNumber > 1;
  const hasNext = pageNumber < safeTotalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#182226] border-t border-[#DCE3E6] dark:border-[#28373D] text-xs text-[#5F6B73] dark:text-[#9BAAB1] transition-colors select-none ${className}`}
    >
      {/* Left: Summary text & page size selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="font-medium">
          صفحة <strong className="text-[#17252B] dark:text-[#F0F4F6] font-mono">{pageNumber}</strong> من{' '}
          <strong className="text-[#17252B] dark:text-[#F0F4F6] font-mono">{safeTotalPages}</strong>
          {' '}&bull;{' '}
          إجمالي <strong className="text-[#245B63] dark:text-[#388B96] font-mono font-bold">{totalCount}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-[11px] text-[#89949A] dark:text-[#6E7F87]">لكل صفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="h-7 px-2 text-xs bg-[#F5F7F8] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] text-[#17252B] dark:text-[#F0F4F6] rounded-md outline-none cursor-pointer hover:border-[#245B63] dark:hover:border-[#388B96] transition-colors"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={!hasPrevious || isLoading}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer ${
            hasPrevious && !isLoading
              ? 'bg-[#F5F7F8] dark:bg-[#151E22] text-[#17252B] dark:text-[#F0F4F6] border border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#E8F1F1] dark:hover:bg-[#19383E] hover:text-[#245B63] dark:hover:text-[#388B96]'
              : 'bg-[#F5F7F8]/50 dark:bg-[#151E22]/50 text-[#89949A]/50 dark:text-[#6E7F87]/50 border border-transparent cursor-not-allowed'
          }`}
          title="الانتقال إلى الصفحة السابقة"
        >
          <ChevronRight className="w-4 h-4" />
          <span>السابق</span>
        </button>

        {/* Page indicator pill */}
        <span className="px-3 py-1 bg-[#F5F7F8] dark:bg-[#151E22] border border-[#DCE3E6] dark:border-[#28373D] text-[#245B63] dark:text-[#388B96] font-mono font-bold rounded-lg text-xs">
          {pageNumber} / {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={!hasNext || isLoading}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all text-xs cursor-pointer ${
            hasNext && !isLoading
              ? 'bg-[#F5F7F8] dark:bg-[#151E22] text-[#17252B] dark:text-[#F0F4F6] border border-[#DCE3E6] dark:border-[#28373D] hover:bg-[#E8F1F1] dark:hover:bg-[#19383E] hover:text-[#245B63] dark:hover:text-[#388B96]'
              : 'bg-[#F5F7F8]/50 dark:bg-[#151E22]/50 text-[#89949A]/50 dark:text-[#6E7F87]/50 border border-transparent cursor-not-allowed'
          }`}
          title="الانتقال إلى الصفحة التالية"
        >
          <span>التالي</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
