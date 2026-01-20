// Nepali (Bikram Samvat) Date Conversion Utilities
// Using nepali-date-converter library for accurate conversion

import NepaliDate from 'nepali-date-converter';

const BS_MONTHS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const BS_MONTHS_SHORT = [
  'Bai', 'Jes', 'Ash', 'Shr', 'Bhd', 'Asw',
  'Kar', 'Man', 'Pou', 'Mag', 'Fal', 'Cha'
];

export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  try {
    // nepali-date-converter uses 0-indexed months
    const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
    return nepaliDate.toJsDate();
  } catch {
    // Fallback: return approximate AD date (BS is ~56.7 years ahead)
    return new Date(bsYear - 57, bsMonth - 1, bsDay);
  }
}

export function adToBS(adDate: Date): { year: number; month: number; day: number } {
  try {
    const nepaliDate = new NepaliDate(adDate);
    const bs = nepaliDate.getBS();
    // getBS returns 0-indexed month, convert to 1-indexed
    return { year: bs.year, month: bs.month + 1, day: bs.date };
  } catch {
    // Fallback: approximate BS date (BS is ~56.7 years ahead)
    return { 
      year: adDate.getFullYear() + 57, 
      month: adDate.getMonth() + 1, 
      day: adDate.getDate() 
    };
  }
}

// Helper to parse YYYY-MM-DD as local date (not UTC)
function parseLocalDate(dateStr: string): Date {
  // Handle various date formats
  const normalized = dateStr.trim();
  
  // Try YYYY-MM-DD format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Try ISO format (YYYY-MM-DDTHH:MM:SS...)
  if (normalized.includes('T')) {
    const datePart = normalized.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Fallback to Date constructor
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Ultimate fallback - return current date
  return new Date();
}

export function formatBSDate(adDate: Date | string, formatType: 'full' | 'short' | 'numeric' = 'full'): string {
  try {
    // Validate input
    if (!adDate) return '-';
    
    // Parse string dates as local dates to avoid timezone shift
    const date = typeof adDate === 'string' ? parseLocalDate(adDate) : adDate;
    
    // Check for invalid date
    if (isNaN(date.getTime())) return '-';
    
    const bs = adToBS(date);
    
    // Validate BS month is in range
    const monthName = BS_MONTHS[bs.month - 1] || 'Unknown';
    const monthShort = BS_MONTHS_SHORT[bs.month - 1] || 'Unk';
    
    switch (formatType) {
      case 'full':
        return `${bs.day} ${monthName} ${bs.year}`;
      case 'short':
        return `${bs.day} ${monthShort} ${bs.year}`;
      case 'numeric':
        return `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
      default:
        return `${bs.day} ${monthName} ${bs.year}`;
    }
  } catch {
    return '-';
  }
}

export function formatDateWithMode(
  adDate: Date | string, 
  mode: 'AD' | 'BS' | 'AD+BS' = 'AD'
): string {
  try {
    // Validate input
    if (!adDate) return '-';
    
    // Parse string dates as local dates to avoid timezone shift
    const date = typeof adDate === 'string' ? parseLocalDate(adDate) : adDate;
    
    // Check for invalid date
    if (isNaN(date.getTime())) return '-';
    
    const adFormatted = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    switch (mode) {
      case 'AD':
        return adFormatted;
      case 'BS':
        return formatBSDate(date, 'short');
      case 'AD+BS':
        return `${adFormatted} (${formatBSDate(date, 'short')})`;
      default:
        return adFormatted;
    }
  } catch {
    return '-';
  }
}

export function getBSMonthName(month: number): string {
  return BS_MONTHS[month - 1] || '';
}

export function getBSMonths(): { value: number; label: string }[] {
  return BS_MONTHS.map((name, index) => ({ value: index + 1, label: name }));
}

export function getCurrentBSDate(): { year: number; month: number; day: number } {
  try {
    // Get current date in Nepal timezone
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kathmandu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const y = Number(parts.find(p => p.type === 'year')?.value);
    const m = Number(parts.find(p => p.type === 'month')?.value);
    const d = Number(parts.find(p => p.type === 'day')?.value);

    // Create an AD date-only object (local midnight) for conversion
    const nepaliDate = new NepaliDate(new Date(y, m - 1, d));
    const bs = nepaliDate.getBS();
    return { year: bs.year, month: bs.month + 1, day: bs.date };
  } catch {
    // Fallback using direct constructor
    const nepaliDate = new NepaliDate();
    const bs = nepaliDate.getBS();
    return { year: bs.year, month: bs.month + 1, day: bs.date };
  }
}

export function getBSYearRange(): number[] {
  const current = getCurrentBSDate();
  const years: number[] = [];
  for (let y = current.year - 5; y <= current.year + 5; y++) {
    years.push(y);
  }
  return years;
}

export function getDaysInBSMonth(year: number, month: number): number {
  try {
    // Create a date for the first of next month and subtract one day
    // to get the last day of the current month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    // Get the first day of next month and subtract 1 day
    const firstOfNextMonth = new NepaliDate(nextYear, nextMonth - 1, 1);
    const jsDate = firstOfNextMonth.toJsDate();
    jsDate.setDate(jsDate.getDate() - 1);
    
    // Convert back to get the last day
    const lastDay = new NepaliDate(jsDate);
    return lastDay.getDate();
  } catch {
    // Fallback to common defaults
    return month <= 6 ? 31 : 30;
  }
}

// Get BS month date range in AD dates
export function getBSMonthRange(bsYear: number, bsMonth: number): { start: Date; end: Date } {
  try {
    const daysInMonth = getDaysInBSMonth(bsYear, bsMonth);
    const startDate = bsToAd(bsYear, bsMonth, 1);
    const endDate = bsToAd(bsYear, bsMonth, daysInMonth);
    return { start: startDate, end: endDate };
  } catch {
    // Fallback
    const now = new Date();
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
  }
}

// Get current BS month range in AD dates
export function getCurrentBSMonthRange(): { start: Date; end: Date } {
  const currentBS = getCurrentBSDate();
  return getBSMonthRange(currentBS.year, currentBS.month);
}

// Get previous BS month range in AD dates
export function getPreviousBSMonthRange(): { start: Date; end: Date } {
  const currentBS = getCurrentBSDate();
  let prevMonth = currentBS.month - 1;
  let prevYear = currentBS.year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return getBSMonthRange(prevYear, prevMonth);
}
