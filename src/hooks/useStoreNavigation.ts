import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Hook for store-aware navigation
 * Automatically prefixes paths with the current store slug
 */
export function useStoreNavigation() {
  const navigate = useNavigate();
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const location = useLocation();

  // Get the current store slug from URL
  const currentStoreSlug = useMemo(() => {
    if (storeSlug) return storeSlug;
    
    // Try to extract from pathname
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const knownRootPaths = [
        'auth', 'setup', 'admin', 'leads', 'calling', 'followup',
        'logistics', 'hr', 'manager', 'marketing', 'hrm', 'training',
        'my-hr', 'settings', 'orders', 'storefront', 'inventory', 'accounting'
      ];
      if (!knownRootPaths.includes(pathParts[0])) {
        return pathParts[0];
      }
    }
    return null;
  }, [storeSlug, location.pathname]);

  /**
   * Navigate to a path within the current store
   * @param path - The path to navigate to (without store prefix)
   */
  const navigateTo = useCallback((path: string) => {
    if (!currentStoreSlug) {
      // If no store context, navigate to path directly
      navigate(path);
      return;
    }
    
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    navigate(`/${currentStoreSlug}${normalizedPath}`);
  }, [navigate, currentStoreSlug]);

  /**
   * Get the full path with store prefix
   * @param path - The path (without store prefix)
   */
  const getStorePath = useCallback((path: string): string => {
    if (!currentStoreSlug) {
      return path.startsWith('/') ? path : `/${path}`;
    }
    
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `/${currentStoreSlug}${normalizedPath}`;
  }, [currentStoreSlug]);

  /**
   * Check if a path matches the current location (store-aware)
   */
  const isActive = useCallback((path: string): boolean => {
    const fullPath = getStorePath(path);
    return location.pathname === fullPath || location.pathname.startsWith(fullPath + '/');
  }, [getStorePath, location.pathname]);

  return {
    navigateTo,
    getStorePath,
    isActive,
    storeSlug: currentStoreSlug,
    navigate, // Original navigate for absolute paths
  };
}

/**
 * Get store slug from current path (for use outside components)
 */
export function getStoreSlugFromPathname(pathname: string): string | null {
  const pathParts = pathname.split('/').filter(Boolean);
  
  if (pathParts.length === 0) return null;
  
  const knownRootPaths = [
    'auth', 'setup', 'admin', 'leads', 'calling', 'followup',
    'logistics', 'hr', 'manager', 'marketing', 'hrm', 'training',
    'my-hr', 'settings', 'orders', 'storefront', 'inventory', 'accounting',
    'logistics-portal'
  ];
  
  if (!knownRootPaths.includes(pathParts[0])) {
    return pathParts[0];
  }
  
  return null;
}
