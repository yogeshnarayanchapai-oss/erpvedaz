// Nepali (Bikram Samvat) Date Conversion Utilities
// BS dates are typically 56 years and 8-9 months ahead of AD dates

const BS_MONTHS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const BS_MONTHS_SHORT = [
  'Bai', 'Jes', 'Ash', 'Shr', 'Bhd', 'Asw',
  'Kar', 'Man', 'Pou', 'Mag', 'Fal', 'Cha'
];

// Days in each month for BS years (2000-2090)
// This is a simplified version - a full implementation would need all year data
const BS_YEAR_DATA: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2083: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2085: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
};

// Reference date: 2080-01-01 BS = 2023-04-14 AD
const BS_REFERENCE = { year: 2080, month: 1, day: 1 };

// IMPORTANT: do date math using UTC date-only values to avoid DST/timezone off-by-one bugs.
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const AD_REFERENCE_UTC_MS = Date.UTC(2023, 3, 14); // April 14, 2023 (UTC midnight)

function toUtcDateOnlyMs(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function fromUtcDateOnlyMs(ms: number): Date {
  const d = new Date(ms);
  // Return a local Date at midnight for the computed UTC Y/M/D
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  const daysDiff = getTotalDaysFromBSDate(bsYear, bsMonth, bsDay);
  return fromUtcDateOnlyMs(AD_REFERENCE_UTC_MS + daysDiff * MS_PER_DAY);
}

export function adToBS(adDate: Date): { year: number; month: number; day: number } {
  // Convert the given Date to a date-only UTC timestamp to avoid timezone/DST drift
  const daysDiff = Math.round((toUtcDateOnlyMs(adDate) - AD_REFERENCE_UTC_MS) / MS_PER_DAY);

  let bsYear = BS_REFERENCE.year;
  let bsMonth = BS_REFERENCE.month;
  let bsDay = BS_REFERENCE.day + daysDiff;

  // Handle negative days (dates before reference)
  while (bsDay < 1) {
    bsMonth--;
    if (bsMonth < 1) {
      bsMonth = 12;
      bsYear--;
    }
    bsDay += getDaysInBSMonth(bsYear, bsMonth);
  }

  // Handle overflow days
  while (bsDay > getDaysInBSMonth(bsYear, bsMonth)) {
    bsDay -= getDaysInBSMonth(bsYear, bsMonth);
    bsMonth++;
    if (bsMonth > 12) {
      bsMonth = 1;
      bsYear++;
    }
  }

  return { year: bsYear, month: bsMonth, day: bsDay };
}

// Helper to parse YYYY-MM-DD as local date (not UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatBSDate(adDate: Date | string, format: 'full' | 'short' | 'numeric' = 'full'): string {
  // Parse string dates as local dates to avoid timezone shift
  const date = typeof adDate === 'string' ? parseLocalDate(adDate) : adDate;
  const bs = adToBS(date);
  
  switch (format) {
    case 'full':
      return `${bs.day} ${BS_MONTHS[bs.month - 1]} ${bs.year}`;
    case 'short':
      return `${bs.day} ${BS_MONTHS_SHORT[bs.month - 1]} ${bs.year}`;
    case 'numeric':
      return `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
    default:
      return `${bs.day} ${BS_MONTHS[bs.month - 1]} ${bs.year}`;
  }
}

export function formatDateWithMode(
  adDate: Date | string, 
  mode: 'AD' | 'BS' | 'AD+BS' = 'AD'
): string {
  // Parse string dates as local dates to avoid timezone shift
  const date = typeof adDate === 'string' ? parseLocalDate(adDate) : adDate;
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
}

export function getBSMonthName(month: number): string {
  return BS_MONTHS[month - 1] || '';
}

export function getBSMonths(): { value: number; label: string }[] {
  return BS_MONTHS.map((name, index) => ({ value: index + 1, label: name }));
}

export function getCurrentBSDate(): { year: number; month: number; day: number } {
  // Always compute "today" in Nepal (Asia/Kathmandu) to avoid device timezone issues
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
  return adToBS(new Date(y, m - 1, d));
}

export function getBSYearRange(): number[] {
  const current = getCurrentBSDate();
  const years: number[] = [];
  for (let y = current.year - 5; y <= current.year + 5; y++) {
    years.push(y);
  }
  return years;
}
