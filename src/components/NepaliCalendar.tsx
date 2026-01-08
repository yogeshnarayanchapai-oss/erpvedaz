import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  getCurrentBSDate, 
  getBSMonthName, 
  bsToAd, 
  adToBS,
  getBSYearRange 
} from '@/lib/nepaliDate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Days in each month for BS years
const BS_YEAR_DATA: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2083: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2085: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
};

const BS_WEEKDAYS = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];
const BS_WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export interface CalendarEvent {
  date: string; // AD date in YYYY-MM-DD format
  title: string;
  type?: 'holiday' | 'event' | 'attendance' | 'leave';
  color?: string;
}

interface NepaliCalendarProps {
  events?: CalendarEvent[];
  onDateClick?: (bsDate: { year: number; month: number; day: number }, adDate: Date) => void;
  selectedDate?: Date;
  className?: string;
}

export function NepaliCalendar({ events = [], onDateClick, selectedDate, className }: NepaliCalendarProps) {
  const currentBS = getCurrentBSDate();
  const [viewYear, setViewYear] = useState(currentBS.year);
  const [viewMonth, setViewMonth] = useState(currentBS.month);

  // Parse YYYY-MM-DD string as local date (not UTC) to avoid timezone shift
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

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

  // Map events to BS dates for this month
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach(event => {
      try {
        // Use local date parsing to avoid timezone shift
        const eventDate = parseLocalDate(event.date);
        const bs = adToBS(eventDate);
        if (bs.year === viewYear && bs.month === viewMonth) {
          if (!map[bs.day]) map[bs.day] = [];
          map[bs.day].push(event);
        }
      } catch (e) {
        // Invalid date
      }
    });
    return map;
  }, [events, viewYear, viewMonth]);

  const selectedBS = selectedDate ? adToBS(selectedDate) : null;

  const handleDayClick = (day: number) => {
    const adDate = bsToAd(viewYear, viewMonth, day);
    onDateClick?.({ year: viewYear, month: viewMonth, day }, adDate);
  };

  const isToday = (day: number) => {
    return viewYear === currentBS.year && viewMonth === currentBS.month && day === currentBS.day;
  };

  const isSelected = (day: number) => {
    return selectedBS && viewYear === selectedBS.year && viewMonth === selectedBS.month && day === selectedBS.day;
  };

  const getEventTypeColor = (type?: string) => {
    switch (type) {
      case 'holiday': return 'bg-destructive/20 text-destructive';
      case 'event': return 'bg-primary/20 text-primary';
      case 'attendance': return 'bg-success/20 text-success';
      case 'leave': return 'bg-warning/20 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Select value={viewMonth.toString()} onValueChange={(v) => setViewMonth(parseInt(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>{getBSMonthName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={viewYear.toString()} onValueChange={(v) => setViewYear(parseInt(v))}>
              <SelectTrigger className="w-[90px]">
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
        <CardTitle className="text-center text-lg font-bold">
          {getBSMonthName(viewMonth)} {viewYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {BS_WEEKDAYS_EN.map((day, i) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{BS_WEEKDAYS[i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dayEvents = eventsByDay[day] || [];
            const hasHoliday = dayEvents.some(e => e.type === 'holiday');
            
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "aspect-square p-1 rounded-lg flex flex-col items-center justify-start text-sm transition-colors relative",
                  "hover:bg-accent hover:text-accent-foreground",
                  isToday(day) && "ring-2 ring-primary",
                  isSelected(day) && "bg-primary text-primary-foreground",
                  hasHoliday && !isSelected(day) && "bg-destructive/10 text-destructive",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
              >
                <span className={cn(
                  "font-medium",
                  isToday(day) && !isSelected(day) && "text-primary"
                )}>
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          event.type === 'holiday' ? 'bg-destructive' : 
                          event.type === 'event' ? 'bg-primary' :
                          event.type === 'attendance' ? 'bg-success' :
                          event.type === 'leave' ? 'bg-warning' : 'bg-muted-foreground'
                        )}
                        title={event.title}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Holiday</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Event</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">Present</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-muted-foreground">Leave</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
