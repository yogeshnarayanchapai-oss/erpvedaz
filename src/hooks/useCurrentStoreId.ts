import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useStoreId as useStoreRouteId } from '@/components/layout/StoreRouteWrapper';

/**
 * Hook to get the current store ID for filtering queries.
 * Uses multiple sources for reliability:
 * 1. StoreRouteWrapper context (for store-path routes like /vedaz/...)
 * 2. CurrentStoreContext (for owner dashboard or fallback)
 * Returns null if no store is selected yet.
 */
export function useCurrentStoreId(): string | null {
  // First try the store route context (from URL path like /vedaz/...)
  const storeRouteId = useStoreRouteId();
  
  // Then try the global current store context
  const { currentStore } = useCurrentStore();
  
  // Prefer store route context as it's more direct for store-specific routes
  return storeRouteId ?? currentStore?.id ?? null;
}

/**
 * Hook to check if we have a valid store context.
 * Useful for determining if we should fetch store-specific data.
 */
export function useHasStoreContext(): boolean {
  const storeRouteId = useStoreRouteId();
  const { currentStore, isLoading } = useCurrentStore();
  return !isLoading && (storeRouteId !== null || currentStore !== null);
}
