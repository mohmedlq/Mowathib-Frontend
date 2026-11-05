import { useState } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { FileSpreadsheet, Printer, Download } from 'lucide-react';

export interface ReportExportMenuProps {
  onExportExcel: () => Promise<void>;
  onPrint: () => void;
  isLoading?: boolean;
}

export function ReportExportMenu({ onExportExcel, onPrint, isLoading = false }: ReportExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExcel = async () => {
    setIsExporting(true);
    try {
      await onExportExcel();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={<Printer className="w-4 h-4 text-[#5F6B73]" />}
        onClick={onPrint}
        className="font-medium"
      >
        طباعة التقرير
      </Button>

      <Button
        type="button"
        variant="primary"
        size="sm"
        icon={<FileSpreadsheet className="w-4 h-4 text-emerald-300" />}
        onClick={handleExcel}
        isLoading={isExporting || isLoading}
        className="font-medium"
      >
        <span>تصدير Excel (.xlsx)</span>
        <Download className="w-3.5 h-3.5 mr-1 text-white/70" />
      </Button>
    </div>
  );
}

