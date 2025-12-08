// Utility functions for subdomain-based store routing

const LOVABLE_DOMAINS = [
  'lovable.dev',
  'lovable.app',
  'localhost',
];

/**
 * Extract store subdomain from current hostname
 * E.g., kakre.lovable.dev -> kakre
 * Returns null if on main domain or localhost
 */
export function getStoreSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  // Check if it's localhost (development)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check URL params for store subdomain in dev mode
    const params = new URLSearchParams(window.location.search);
    return params.get('store') || null;
  }
  
  // Check for Lovable domains
  for (const lovableDomain of LOVABLE_DOMAINS) {
    if (hostname.endsWith(`.${lovableDomain}`)) {
      const subdomain = hostname.replace(`.${lovableDomain}`, '');
      // Ignore if it's the main project subdomain (e.g., project-id.lovable.dev)
      // Only return if it looks like a store slug (shorter, readable names)
      if (subdomain && !subdomain.includes('-') && subdomain.length < 30) {
        return subdomain;
      }
      // Also handle store subdomains like: storename-projectid.lovable.dev
      const parts = subdomain.split('-');
      if (parts.length > 1) {
        // First part could be the store slug
        return parts[0];
      }
      return null;
    }
  }
  
  // Check for techlaya.com subdomain
  if (hostname.endsWith('.techlaya.com')) {
    return hostname.replace('.techlaya.com', '');
  }
  
  // For custom domains, return null (will be handled separately via store_domains table)
  return null;
}

/**
 * Check if current hostname matches a store's subdomain
 */
export function isStoreSubdomain(storeSlug: string): boolean {
  const currentSubdomain = getStoreSubdomain();
  return currentSubdomain === storeSlug;
}

/**
 * Get the store URL for a given store slug
 */
export function getStoreUrl(storeSlug: string): string {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${window.location.origin}?store=${storeSlug}`;
  }
  
  // For production, use techlaya.com subdomain
  return `https://${storeSlug}.techlaya.com`;
}
