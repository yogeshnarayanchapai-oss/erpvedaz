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
import { useDateMode } from '@/contexts/DateModeContext';
import { formatBSDate } from '@/lib/nepaliDate';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DashboardDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = 'today' | 'yesterday' | '7days' | '30days' | 'custom';

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>('today');
  const { dateMode } = useDateMode();

  const handlePresetClick = (preset: PresetKey) => {
    setActivePreset(preset);
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    switch (preset) {
      case 'today':
        onChange({ from: startOfDay(today), to: endOfDay(today) });
        break;
      case 'yesterday':
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

  const formatDateDisplay = (date: Date) => {
    if (dateMode === 'BS') {
      return formatBSDate(date, 'short');
    } else if (dateMode === 'AD+BS') {
      return `${format(date, 'MMM d')} (${formatBSDate(date, 'short')})`;
    }
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
      {/* Preset buttons - scrollable on mobile */}
      <div className="flex w-full sm:w-auto overflow-x-auto scrollbar-hide rounded-lg border border-border bg-muted/30 p-1">
        <Button
          variant={activePreset === 'today' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handlePresetClick('today')}
          className="h-7 px-2 sm:px-3 text-xs shrink-0"
        >
          Today
        </Button>
        <Button
          variant={activePreset === 'yesterday' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handlePresetClick('yesterday')}
          className="h-7 px-2 sm:px-3 text-xs shrink-0"
        >
          Yesterday
        </Button>
        <Button
          variant={activePreset === '7days' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handlePresetClick('7days')}
          className="h-7 px-2 sm:px-3 text-xs shrink-0"
        >
          7D
        </Button>
        <Button
          variant={activePreset === '30days' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handlePresetClick('30days')}
          className="h-7 px-2 sm:px-3 text-xs shrink-0"
        >
          30D
        </Button>
        <Button
          variant={activePreset === 'custom' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActivePreset('custom')}
          className="h-7 px-2 sm:px-3 text-xs shrink-0"
        >
          Custom
        </Button>
      </div>

      {activePreset === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 justify-start text-left font-normal w-full sm:w-auto',
                !value && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {value?.from ? (
                  value.to ? (
                    <>
                      {formatDateDisplay(value.from)} – {formatDateDisplay(value.to)}
                    </>
                  ) : (
                    formatDateDisplay(value.from)
                  )
                ) : (
                  <span>Pick dates</span>
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
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
              numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
