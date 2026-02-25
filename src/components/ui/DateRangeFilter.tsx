import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Custom', value: 'custom' },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<string>('today');

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    const today = new Date();
    
    switch (newPreset) {
      case 'all':
        onChange({ from: new Date('2020-01-01'), to: endOfDay(new Date('2099-12-31')) });
        break;
      case 'today':
        onChange({ from: startOfDay(today), to: endOfDay(today) });
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        onChange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case '7days':
        onChange({ from: startOfDay(subDays(today, 6)), to: endOfDay(today) });
        break;
      case '30days':
        onChange({ from: startOfDay(subDays(today, 29)), to: endOfDay(today) });
        break;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[240px] justify-start text-left font-normal',
                !value && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value?.from ? (
                value.to ? (
                  <>
                    {format(value.from, 'MMM d')} - {format(value.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  format(value.from, 'MMM d, yyyy')
                )
              ) : (
                <span>Pick dates</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={{ from: value?.from, to: value?.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onChange({ from: startOfDay(range.from), to: endOfDay(range.to) });
                } else if (range?.from) {
                  onChange({ from: startOfDay(range.from), to: endOfDay(range.from) });
                }
              }}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
