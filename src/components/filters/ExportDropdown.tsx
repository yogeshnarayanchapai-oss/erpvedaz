import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface ExportDropdownProps {
  onExportCSV: () => void;
  onExportCourier?: () => void;
  showCourierExport?: boolean;
}

export function ExportDropdown({ onExportCSV, onExportCourier, showCourierExport = true }: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </DropdownMenuItem>
        {showCourierExport && onExportCourier && (
          <DropdownMenuItem onClick={onExportCourier}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Courier Excel
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
