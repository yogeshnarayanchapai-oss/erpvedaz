import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export type DateRange = {
  startDate: string;
  endDate: string;
  label: string;
};

interface DateQuickFiltersProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function getPresetRanges(): { label: string; getRange: () => DateRange }[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  return [
    {
      label: 'Today',
      getRange: () => ({ startDate: today, endDate: today, label: 'Today' }),
    },
    {
      label: 'Last 7 Days',
      getRange: () => ({
        startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
        endDate: today,
        label: 'Last 7 Days',
      }),
    },
    {
      label: 'Last 30 Days',
      getRange: () => ({
        startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
        endDate: today,
        label: 'Last 30 Days',
      }),
    },
    {
      label: 'This Month',
      getRange: () => ({
        startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        endDate: today,
        label: 'This Month',
      }),
    },
  ];
}

export default function DateQuickFilters({ value, onChange }: DateQuickFiltersProps) {
  const presets = getPresetRanges();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant={value.label === preset.label ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(preset.getRange())}
        >
          {preset.label}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={value.label === 'Custom' ? 'default' : 'outline'} size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            Custom
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={value.startDate}
                onChange={(e) =>
                  onChange({ ...value, startDate: e.target.value, label: 'Custom' })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={value.endDate}
                onChange={(e) =>
                  onChange({ ...value, endDate: e.target.value, label: 'Custom' })
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
