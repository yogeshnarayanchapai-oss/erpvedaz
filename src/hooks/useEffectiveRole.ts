import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'SALES_MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE' | 'STAFF';

/**
 * Returns the effective role for the current user based on the current store context.
 * 
 * Priority:
 * 1. OWNER role is always OWNER (global)
 * 2. For non-OWNER users, uses store_role from user_store_access for current store
 * 3. Falls back to global profile.role if no store-specific role
 */
export function useEffectiveRole(): { effectiveRole: AppRole; isStoreSpecific: boolean } {
  const { profile } = useAuth();
  const { currentStore } = useCurrentStore();
  
  return useMemo(() => {
    const globalRole = (profile?.role || 'CALLING') as AppRole;
    
    // OWNER always uses global OWNER role
    if (globalRole === 'OWNER') {
      return { effectiveRole: 'OWNER', isStoreSpecific: false };
    }
    
    // Check if current store has a store-specific role
    const storeRole = currentStore?.store_role as AppRole | undefined;
    
    if (storeRole) {
      return { effectiveRole: storeRole, isStoreSpecific: true };
    }
    
    // Fall back to global role
    return { effectiveRole: globalRole, isStoreSpecific: false };
  }, [profile?.role, currentStore?.store_role]);
}
