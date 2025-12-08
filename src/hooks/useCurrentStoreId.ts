import { useCurrentStore } from '@/contexts/CurrentStoreContext';

/**
 * Hook to get the current store ID for filtering queries.
 * Staff see their assigned store from user_store_access table.
 * OWNER can switch between stores.
 * Returns null if no store is selected yet.
 */
export function useCurrentStoreId(): string | null {
  const { currentStore } = useCurrentStore();
  return currentStore?.id ?? null;
}

/**
 * Hook to check if we have a valid store context.
 * Useful for determining if we should fetch store-specific data.
 */
export function useHasStoreContext(): boolean {
  const { currentStore, isLoading } = useCurrentStore();
  return !isLoading && currentStore !== null;
}
