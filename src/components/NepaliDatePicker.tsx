import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  getCurrentBSDate, 
  getBSMonthName, 
  bsToAd, 
  adToBS,
  getBSYearRange,
  formatBSDate
} from '@/lib/nepaliDate';

const BS_YEAR_DATA: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2083: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2085: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
};

const BS_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInBSMonth(year: number, month: number): number {
  const yearData = BS_YEAR_DATA[year];
  if (yearData) return yearData[month - 1];
  const defaultDays = [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31];
  return defaultDays[month - 1];
}

function getFirstDayOfBSMonth(year: number, month: number): number {
  const adDate = bsToAd(year, month, 1);
  return adDate.getDay();
}

interface NepaliDatePickerProps {
  value?: string; // AD date in YYYY-MM-DD format
  onChange: (adDate: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NepaliDatePicker({ 
  value, 
  onChange, 
  placeholder = 'Select date (BS)',
  className,
  disabled 
}: NepaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  const currentBS = getCurrentBSDate();
  
  // Parse YYYY-MM-DD string as local date (not UTC) to avoid timezone shift
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Initialize view based on value or current date
  const getInitialView = () => {
    if (value) {
      try {
        const bs = adToBS(parseLocalDate(value));
        return { year: bs.year, month: bs.month };
      } catch {
        return { year: currentBS.year, month: currentBS.month };
      }
    }
    return { year: currentBS.year, month: currentBS.month };
  };

  const [viewYear, setViewYear] = useState(getInitialView().year);
  const [viewMonth, setViewMonth] = useState(getInitialView().month);

  // Update view when value changes
  useEffect(() => {
    if (value) {
      try {
        const bs = adToBS(parseLocalDate(value));
        setViewYear(bs.year);
        setViewMonth(bs.month);
      } catch {
        // Invalid date, keep current view
      }
    }
  }, [value]);

  const daysInMonth = getDaysInBSMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfBSMonth(viewYear, viewMonth);
  const yearOptions = getBSYearRange();

  const navigateMonth = (delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const handleDayClick = (day: number) => {
    const adDate = bsToAd(viewYear, viewMonth, day);
    // Use local date formatting to avoid timezone shift (toISOString uses UTC which can shift by -1 day)
    const year = adDate.getFullYear();
    const month = String(adDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(adDate.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${dayStr}`;
    onChange(formatted);
    setOpen(false);
  };

  const isToday = (day: number) => {
    return viewYear === currentBS.year && viewMonth === currentBS.month && day === currentBS.day;
  };

  const selectedBS = value ? adToBS(parseLocalDate(value)) : null;
  const isSelected = (day: number) => {
    return selectedBS && viewYear === selectedBS.year && viewMonth === selectedBS.month && day === selectedBS.day;
  };

  // Format display value using local date parsing
  const displayValue = value ? (() => {
    const bs = adToBS(parseLocalDate(value));
    return `${bs.day} ${getBSMonthName(bs.month)} ${bs.year}`;
  })() : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="p-3">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Select value={viewMonth.toString()} onValueChange={(v) => setViewMonth(parseInt(v))}>
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={m.toString()}>{getBSMonthName(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={viewYear.toString()} onValueChange={(v) => setViewYear(parseInt(v))}>
                <SelectTrigger className="w-[80px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {BS_WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground p-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "w-8 h-8 text-sm rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                  isToday(day) && "ring-1 ring-primary",
                  isSelected(day) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Footer showing AD equivalent */}
          {value && (
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
              AD: {parseLocalDate(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
