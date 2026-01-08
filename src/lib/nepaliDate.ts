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
const AD_REFERENCE = new Date(2023, 3, 14); // April 14, 2023

function getDaysInBSMonth(year: number, month: number): number {
  const yearData = BS_YEAR_DATA[year];
  if (yearData) {
    return yearData[month - 1];
  }
  // Default days if year data not available
  const defaultDays = [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31];
  return defaultDays[month - 1];
}

function getTotalDaysFromBSDate(year: number, month: number, day: number): number {
  let totalDays = 0;
  
  // Add days for years from reference
  for (let y = BS_REFERENCE.year; y < year; y++) {
    for (let m = 1; m <= 12; m++) {
      totalDays += getDaysInBSMonth(y, m);
    }
  }
  
  // Add days for months in current year
  for (let m = 1; m < month; m++) {
    totalDays += getDaysInBSMonth(year, m);
  }
  
  // Add days
  totalDays += day - 1;
  
  return totalDays;
}

export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  const daysDiff = getTotalDaysFromBSDate(bsYear, bsMonth, bsDay);
  const adDate = new Date(AD_REFERENCE);
  adDate.setDate(adDate.getDate() + daysDiff);
  return adDate;
}

export function adToBS(adDate: Date): { year: number; month: number; day: number } {
  // Calculate days from reference
  const daysDiff = Math.floor((adDate.getTime() - AD_REFERENCE.getTime()) / (1000 * 60 * 60 * 24));
  
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
  return adToBS(new Date());
}

export function getBSYearRange(): number[] {
  const current = getCurrentBSDate();
  const years: number[] = [];
  for (let y = current.year - 5; y <= current.year + 5; y++) {
    years.push(y);
  }
  return years;
}
