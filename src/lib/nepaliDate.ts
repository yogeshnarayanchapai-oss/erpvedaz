// Nepali (Bikram Samvat) Date Conversion Utilities
// BS dates are typically 56 years and 8-9 months ahead of AD dates

import { ADToBS as _ADToBS, BSToAD as _BSToAD } from 'ad-bs-date-conversion';

// Suppress alerts from the library by temporarily overriding window.alert
function suppressAlert<T>(fn: () => T): T {
  if (typeof window !== 'undefined') {
    const originalAlert = window.alert;
    window.alert = () => {}; // Suppress alert
    try {
      return fn();
    } finally {
      window.alert = originalAlert;
    }
  }
  return fn();
}

// Wrapped ADToBS that suppresses alerts and handles null
function safeADToBS(date: string): string | null {
  return suppressAlert(() => _ADToBS(date));
}

// Wrapped BSToAD that suppresses alerts and handles null
function safeBSToAD(date: string): string | null {
  return suppressAlert(() => _BSToAD(date));
}

const BS_MONTHS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const BS_MONTHS_SHORT = [
  'Bai', 'Jes', 'Ash', 'Shr', 'Bhd', 'Asw',
  'Kar', 'Man', 'Pou', 'Mag', 'Fal', 'Cha'
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseYmd(input: string): { year: number; month: number; day: number } {
  const normalized = input.trim().replace(/\//g, '-');
  const [y, m, d] = normalized.split('-').map((v) => Number(v));
  if (!y || !m || !d) {
    throw new Error(`Invalid date string: ${input}`);
  }
  return { year: y, month: m, day: d };
}

export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  try {
    const adStr = safeBSToAD(toYmd(bsYear, bsMonth, bsDay));
    if (!adStr) {
      // Fallback: return approximate AD date (BS is ~56.7 years ahead)
      return new Date(bsYear - 57, bsMonth - 1, bsDay);
    }
    const ad = parseYmd(adStr);
    // Create a local date-only object to avoid timezone shift
    return new Date(ad.year, ad.month - 1, ad.day);
  } catch {
    // Fallback: return approximate AD date (BS is ~56.7 years ahead)
    return new Date(bsYear - 57, bsMonth - 1, bsDay);
  }
}

export function adToBS(adDate: Date): { year: number; month: number; day: number } {
  try {
    // Convert using AD date-only (local) parts to avoid timezone drift
    const adStr = toYmd(adDate.getFullYear(), adDate.getMonth() + 1, adDate.getDate());
    const bsStr = safeADToBS(adStr);
    if (!bsStr) {
      // Fallback: approximate BS date (BS is ~56.7 years ahead)
      return { 
        year: adDate.getFullYear() + 57, 
        month: adDate.getMonth() + 1, 
        day: adDate.getDate() 
      };
    }
    const bs = parseYmd(bsStr);
    return { year: bs.year, month: bs.month, day: bs.day };
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
