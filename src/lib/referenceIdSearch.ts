/**
 * Normalize a reference ID search input to match stored format.
 * Handles formats like "#00135", "00135", "135", or "#135"
 * Returns a 4-digit padded string for exact matching.
 */
export function normalizeReferenceId(input: string): string {
  if (!input) return '';
  
  // Remove # prefix if present
  let cleaned = input.replace(/^#/, '').trim();
  
  // Remove leading zeros and parse as number
  const num = parseInt(cleaned, 10);
  
  // If not a valid number, return original cleaned string
  if (isNaN(num)) return cleaned;
  
  // Return as 4-digit padded string (matching DB format)
  return num.toString().padStart(4, '0');
}

/**
 * Check if a search string looks like a Reference ID search.
 * Returns true for formats like "#135", "#00135", or just numbers.
 */
export function isReferenceIdSearch(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  
  // Starts with # followed by digits
  if (/^#\d+$/.test(trimmed)) return true;
  
  // Pure numeric string (could be reference ID)
  // Only treat as ref ID if it's 1-6 digits
  if (/^\d{1,6}$/.test(trimmed)) return true;
  
  return false;
}

/**
 * Match a lead/order reference ID against a search term.
 * Handles both full format (#00135) and partial (135).
 */
export function matchesReferenceId(referenceId: string | null | undefined, searchTerm: string): boolean {
  if (!referenceId || !searchTerm) return false;
  
  const normalizedSearch = normalizeReferenceId(searchTerm);
  const normalizedRefId = normalizeReferenceId(referenceId);
  
  // Exact match after normalization
  return normalizedRefId === normalizedSearch;
}
