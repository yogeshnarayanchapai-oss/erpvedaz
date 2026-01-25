import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateMode } from '@/contexts/DateModeContext';
import { formatBSDate, getBSYears, getBSMonths, getDaysInBSMonth, bsToAd, adToBS } from '@/lib/nepaliDate';
import { Label } from '@/components/ui/label';

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

// BS Date Picker Component
function BSDatePicker({ 
  value, 
  onChange, 
  label 
}: { 
  value: Date; 
  onChange: (date: Date) => void; 
  label: string;
}) {
  const bs = adToBS(value);
  const [year, setYear] = useState(bs.year);
  const [month, setMonth] = useState(bs.month);
  const [day, setDay] = useState(bs.day);

  const years = getBSYears();
  const months = getBSMonths();
  const daysInMonth = useMemo(() => getDaysInBSMonth(year, month), [year, month]);
  const days = useMemo(() => 
    Array.from({ length: daysInMonth }, (_, i) => i + 1), 
    [daysInMonth]
  );

  const handleChange = (newYear: number, newMonth: number, newDay: number) => {
    // Adjust day if it exceeds the days in the new month
    const maxDays = getDaysInBSMonth(newYear, newMonth);
    const adjustedDay = Math.min(newDay, maxDays);
    
    setYear(newYear);
    setMonth(newMonth);
    setDay(adjustedDay);
    
    const adDate = bsToAd(newYear, newMonth, adjustedDay);
    onChange(adDate);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs text-muted-foreground whitespace-nowrap">{label}:</Label>
      <div className="flex gap-1">
        <Select 
          value={year.toString()} 
          onValueChange={(v) => handleChange(parseInt(v), month, day)}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y.value} value={y.value.toString()}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select 
          value={month.toString()} 
          onValueChange={(v) => handleChange(year, parseInt(v), day)}
        >
          <SelectTrigger className="w-[90px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select 
          value={day.toString()} 
          onValueChange={(v) => handleChange(year, month, parseInt(v))}
        >
          <SelectTrigger className="w-[60px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>('today');
  const [showCustom, setShowCustom] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const { dateMode } = useDateMode();

  const handlePresetClick = (preset: PresetKey) => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    switch (preset) {
      case 'today':
        setActivePreset('today');
        setShowCustom(false);
        onChange({ from: startOfDay(today), to: endOfDay(today) });
        break;
      case 'yesterday':
        setActivePreset('yesterday');
        setShowCustom(false);
        onChange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case '7days':
        setActivePreset('7days');
        setShowCustom(false);
        onChange({ from: startOfDay(subDays(today, 6)), to: endOfDay(today) });
        break;
      case '30days':
        setActivePreset('30days');
        setShowCustom(false);
        onChange({ from: startOfDay(subDays(today, 29)), to: endOfDay(today) });
        break;
      case 'custom':
        setActivePreset('custom');
        setShowCustom(true);
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

  // If custom mode, show From-To date pickers
  if (showCustom) {
    // Use BS date pickers if dateMode is BS
    if (dateMode === 'BS') {
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <BSDatePicker 
            value={value.from} 
            onChange={(date) => {
              const newFrom = startOfDay(date);
              const newTo = newFrom > value.to ? endOfDay(date) : value.to;
              onChange({ from: newFrom, to: newTo });
            }}
            label="From"
          />
          <BSDatePicker 
            value={value.to} 
            onChange={(date) => {
              const newTo = endOfDay(date);
              const newFrom = newTo < value.from ? startOfDay(date) : value.from;
              onChange({ from: newFrom, to: newTo });
            }}
            label="To"
          />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs"
            onClick={() => {
              setShowCustom(false);
              handlePresetClick('today');
            }}
          >
            Reset
          </Button>
        </div>
      );
    }

    // AD mode - show calendar pickers
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* From Date */}
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">From:</Label>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2 text-xs font-medium min-w-[100px] justify-between"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="truncate">{formatDateDisplay(value.from)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100] bg-popover" align="start" sideOffset={4}>
              <Calendar
                mode="single"
                selected={value.from}
                onSelect={(date) => {
                  if (date) {
                    const newFrom = startOfDay(date);
                    // Ensure from is not after to
                    const newTo = newFrom > value.to ? endOfDay(date) : value.to;
                    onChange({ from: newFrom, to: newTo });
                    setFromOpen(false);
                  }
                }}
                initialFocus
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* To Date */}
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">To:</Label>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2 text-xs font-medium min-w-[100px] justify-between"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="truncate">{formatDateDisplay(value.to)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100] bg-popover" align="start" sideOffset={4}>
              <Calendar
                mode="single"
                selected={value.to}
                onSelect={(date) => {
                  if (date) {
                    const newTo = endOfDay(date);
                    // Ensure to is not before from
                    const newFrom = newTo < value.from ? startOfDay(date) : value.from;
                    onChange({ from: newFrom, to: newTo });
                    setToOpen(false);
                  }
                }}
                initialFocus
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Back to presets button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-xs"
          onClick={() => {
            setShowCustom(false);
            handlePresetClick('today');
          }}
        >
          Reset
        </Button>
      </div>
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
