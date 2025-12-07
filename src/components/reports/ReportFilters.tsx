import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportDateRange {
  from: Date;
  to: Date;
}

interface ReportFiltersProps {
  value: ReportDateRange;
  onChange: (range: ReportDateRange) => void;
}

export function ReportFilters({ value, onChange }: ReportFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();

  const presets = [
    { label: 'Today', from: startOfDay(today), to: endOfDay(today) },
    { label: 'Last 7 Days', from: startOfDay(subDays(today, 6)), to: endOfDay(today) },
    { label: 'Last 30 Days', from: startOfDay(subDays(today, 29)), to: endOfDay(today) },
  ];

  const isPresetActive = (preset: typeof presets[0]) => {
    return (
      format(value.from, 'yyyy-MM-dd') === format(preset.from, 'yyyy-MM-dd') &&
      format(value.to, 'yyyy-MM-dd') === format(preset.to, 'yyyy-MM-dd')
    );
  };

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onChange({ from: startOfDay(range.from), to: endOfDay(range.to) });
      setIsOpen(false);
    } else if (range?.from) {
      onChange({ from: startOfDay(range.from), to: endOfDay(range.from) });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant={isPresetActive(preset) ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange({ from: preset.from, to: preset.to })}
        >
          {preset.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'justify-start text-left font-normal',
              !presets.some(isPresetActive) && 'border-primary'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value.from, 'MMM dd')} - {format(value.to, 'MMM dd, yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value.from}
            selected={{ from: value.from, to: value.to }}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
