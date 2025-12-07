import { useDateMode } from '@/contexts/DateModeContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export function DateModeToggle() {
  const { dateMode, setDateMode } = useDateMode();

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={dateMode} onValueChange={(v) => setDateMode(v as 'AD' | 'BS' | 'AD+BS')}>
        <SelectTrigger className="w-[100px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AD">AD</SelectItem>
          <SelectItem value="BS">BS</SelectItem>
          <SelectItem value="AD+BS">AD+BS</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
