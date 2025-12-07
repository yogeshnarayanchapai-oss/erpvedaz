/**
 * Format amount to NPR currency
 * @param amount - Amount to format
 * @returns Formatted string like "Rs 1,23,456"
 */
export function formatNPR(amount: number): string {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('NPR', 'Rs');
}

/**
 * Format amount to NPR currency with decimals
 * @param amount - Amount to format
 * @returns Formatted string like "Rs 1,23,456.78"
 */
export function formatNPRWithDecimals(amount: number): string {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace('NPR', 'Rs');
}
