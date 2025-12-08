// Utility functions for path-based store routing
// Example: erp.techlaya.com/vedaz -> store slug = vedaz

/**
 * Get the base domain for store URLs
 * Uses the current hostname for production, localhost for dev
 */
export function getBaseDomain(): string {
  const hostname = window.location.hostname;
  
  // For local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.location.origin;
  }
  
  // For production - use the current origin (e.g., https://erp.techlaya.com)
  return window.location.origin;
}

/**
 * Extract store slug from URL path
 * E.g., erp.techlaya.com/vedaz -> vedaz
 * Returns null if on root or no store path
 */
export function getStoreSlugFromPath(): string | null {
  const pathname = window.location.pathname;
  
  // Check URL params for store in dev mode
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const params = new URLSearchParams(window.location.search);
    return params.get('store') || null;
  }
  
  // Get the first path segment after root
  // e.g., /vedaz/admin/dashboard -> vedaz
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Check if first path is a store slug (not a known route)
  const knownRootPaths = [
    'admin', 'auth', 'setup', 'leads', 'calling', 'followup', 
    'logistics', 'hr', 'manager', 'marketing', 'hrm', 'training',
    'my-hr', 'settings', 'orders', 'storefront'
  ];
  
  if (pathParts.length > 0 && !knownRootPaths.includes(pathParts[0])) {
    return pathParts[0];
  }
  
  return null;
}

/**
 * Check if current path matches a store's slug
 */
export function isStorePath(storeSlug: string): boolean {
  const currentSlug = getStoreSlugFromPath();
  return currentSlug === storeSlug;
}

/**
 * Get the store URL for a given store slug
 * Returns: baseDomain/storeSlug (e.g., https://erp.techlaya.com/vedaz)
 */
export function getStoreUrl(storeSlug: string): string {
  const baseDomain = getBaseDomain();
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${baseDomain}?store=${storeSlug}`;
  }
  
  // For production, use path-based routing
  // e.g., erp.techlaya.com/vedaz
  return `${baseDomain}/${storeSlug}`;
}

/**
 * Get display URL for store (without protocol)
 * Returns: domain/storeSlug (e.g., erp.techlaya.com/vedaz)
 */
export function getStoreDisplayUrl(storeSlug: string): string {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${window.location.host}?store=${storeSlug}`;
  }
  
  return `${window.location.host}/${storeSlug}`;
}

/**
 * Get the base path prefix for the current store
 * Returns empty string if no store slug in path
 */
export function getStoreBasePath(): string {
  const storeSlug = getStoreSlugFromPath();
  return storeSlug ? `/${storeSlug}` : '';
}

/**
 * Legacy function for backward compatibility
 */
export function getStoreSubdomain(): string | null {
  return getStoreSlugFromPath();
}
