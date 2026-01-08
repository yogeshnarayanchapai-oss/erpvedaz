declare module 'ad-bs-date-conversion' {
  export function ADToBS(ad: string): string;
  export function BSToAD(bs: string): string;
  export function findLastDayOfMonthOfAdDate(year: number, month: number): number;
  export function findLastDayOfMonthOfBsDate(year: number, month: number): number;
}
