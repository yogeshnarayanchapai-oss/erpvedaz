import { useState, useRef } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const presetLabels: Record<PresetKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7days': 'Last 7 Days',
  '30days': 'Last 30 Days',
  custom: 'Custom Range',
};

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>('today');
  const [showCalendar, setShowCalendar] = useState(false);
  const { dateMode } = useDateMode();

  const handlePresetClick = (preset: PresetKey) => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    switch (preset) {
      case 'today':
        setActivePreset('today');
        onChange({ from: startOfDay(today), to: endOfDay(today) });
        break;
      case 'yesterday':
        setActivePreset('yesterday');
        onChange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case '7days':
        setActivePreset('7days');
        onChange({ from: startOfDay(subDays(today, 6)), to: endOfDay(today) });
        break;
      case '30days':
        setActivePreset('30days');
        onChange({ from: startOfDay(subDays(today, 29)), to: endOfDay(today) });
        break;
      case 'custom':
        // Open calendar picker
        setTimeout(() => setShowCalendar(true), 100);
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

  const getDisplayLabel = () => {
    if (activePreset === 'custom') {
      return `${formatDateDisplay(value.from)} – ${formatDateDisplay(value.to)}`;
    }
    return presetLabels[activePreset];
  };

  // If calendar is open, show the calendar popover
  if (showCalendar) {
    return (
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 text-xs font-medium min-w-[120px] justify-between"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="truncate max-w-[180px]">{getDisplayLabel()}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100] bg-popover" align="start" sideOffset={4}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={{ from: value?.from, to: value?.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onChange({ from: startOfDay(range.from), to: endOfDay(range.to) });
                setActivePreset('custom');
                setShowCalendar(false);
              } else if (range?.from) {
                onChange({ from: startOfDay(range.from), to: endOfDay(range.from) });
              }
            }}
            numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2}
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-2 text-xs font-medium min-w-[120px] justify-between"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="truncate max-w-[180px]">{getDisplayLabel()}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-popover z-[100]">
        <DropdownMenuItem 
          onClick={() => handlePresetClick('today')}
          className={cn(activePreset === 'today' && 'bg-accent')}
        >
          Today
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handlePresetClick('yesterday')}
          className={cn(activePreset === 'yesterday' && 'bg-accent')}
        >
          Yesterday
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handlePresetClick('7days')}
          className={cn(activePreset === '7days' && 'bg-accent')}
        >
          Last 7 Days
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handlePresetClick('30days')}
          className={cn(activePreset === '30days' && 'bg-accent')}
        >
          Last 30 Days
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handlePresetClick('custom')}
          className={cn(activePreset === 'custom' && 'bg-accent')}
        >
          Custom Range...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
