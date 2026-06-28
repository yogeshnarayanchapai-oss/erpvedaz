import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'SALES_MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  is_active: boolean;
  daily_target: number | null;
}

export const ALL_ROLES: AppRole[] = ['OWNER', 'ADMIN', 'LEADS', 'CALLING', 'FOLLOWUP', 'LOGISTICS', 'MARKETING', 'MANAGER', 'SALES_MANAGER', 'HR', 'ACCOUNTANT', 'WAREHOUSE'];

export function useStaff(role?: AppRole, includeInactive = false, overrideStoreId?: string, includeOwnerRole = false) {
  const contextStoreId = useCurrentStoreId();
  const storeId = overrideStoreId || contextStoreId;
  const { profile } = useAuth();
  const isOwner = profile?.role === 'OWNER';

  return useQuery({
    queryKey: ['staff', role, includeInactive, storeId, isOwner, includeOwnerRole],
    queryFn: async () => {
      // If storeId exists, filter by store (even for OWNER)
      if (storeId) {
        // Get user IDs that have access to this store, including store_role
        let storeAccessQuery = supabase
          .from('user_store_access')
          .select('user_id, store_role')
          .eq('store_id', storeId);
        
        // Only filter by is_active if we're not including inactive users
        if (!includeInactive) {
          storeAccessQuery = storeAccessQuery.eq('is_active', true);
        }
        
        const { data: storeUsers, error: storeError } = await storeAccessQuery;

        if (storeError) throw storeError;

        if (!storeUsers || storeUsers.length === 0) {
          return [];
        }

        // If role filter is specified, filter by store_role first
        let filteredUserIds: string[];
        if (role) {
          // Use store_role for filtering when available
          filteredUserIds = storeUsers
            .filter(u => u.store_role === role)
            .map(u => u.user_id);
          
          // If no store_role matches, also check profiles.role for users without store_role
          const usersWithoutStoreRole = storeUsers
            .filter(u => !u.store_role)
            .map(u => u.user_id);
          
          if (usersWithoutStoreRole.length > 0) {
            const { data: profilesWithRole } = await supabase
              .from('profiles')
              .select('id')
              .in('id', usersWithoutStoreRole)
              .eq('role', role);
            
            if (profilesWithRole) {
              filteredUserIds = [...filteredUserIds, ...profilesWithRole.map(p => p.id)];
            }
          }
        } else {
          filteredUserIds = storeUsers.map(u => u.user_id);
        }

        if (filteredUserIds.length === 0) {
          return [];
        }

        let query = supabase
          .from('profiles')
          .select('*')
          .in('id', filteredUserIds)
          .order('name');

        // Only exclude OWNER role if not explicitly including them
        if (!includeOwnerRole) {
          query = query.neq('role', 'OWNER');
        }

        if (!includeInactive) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as StaffMember[];
      }

      // OWNER without store context sees all users
      if (isOwner) {
        let query = supabase
          .from('profiles')
          .select('*')
          .order('name');

        if (!includeInactive) {
          query = query.eq('is_active', true);
        }

        if (role) {
          query = query.eq('role', role);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as StaffMember[];
      }

      // No store context and not OWNER
      return [];
    },
    enabled: isOwner || !!storeId,
  });
}

export function useCallingStaff() {
  return useStaff('CALLING');
}

export function useFollowupStaff() {
  return useStaff('FOLLOWUP');
}

export function useHRStaff() {
  return useStaff('HR');
}

export function useManagerStaff() {
  return useStaff('MANAGER');
}

export function useMarketingStaff() {
  return useStaff('MARKETING');
}
