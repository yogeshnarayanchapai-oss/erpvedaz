import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface AddLeadDropdownProps {
  onAddLead: () => void;
  onImport: () => void;
}

export function AddLeadDropdown({ onAddLead, onImport }: AddLeadDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs md:text-sm">
          <Plus className="w-3 h-3 md:w-4 md:h-4" />
          Add
          <ChevronDown className="w-3 h-3 md:w-4 md:h-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onAddLead}>
          <Plus className="w-4 h-4 mr-2" />
          Add Leads
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Import Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
