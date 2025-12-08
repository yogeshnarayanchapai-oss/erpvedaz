import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  is_active: boolean;
  daily_target: number | null;
}

export const ALL_ROLES: AppRole[] = ['OWNER', 'ADMIN', 'LEADS', 'CALLING', 'FOLLOWUP', 'LOGISTICS', 'MARKETING', 'MANAGER', 'HR'];

export function useStaff(role?: AppRole, includeInactive = false) {
  const storeId = useCurrentStoreId();
  const { profile } = useAuth();
  const isOwner = profile?.role === 'OWNER';

  return useQuery({
    queryKey: ['staff', role, includeInactive, storeId, isOwner],
    queryFn: async () => {
      // OWNER sees all users across all stores
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

      // Non-OWNER: filter by current store
      if (!storeId) {
        return [];
      }

      // Get user IDs that have access to this store
      const { data: storeUsers, error: storeError } = await supabase
        .from('user_store_access')
        .select('user_id')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (storeError) throw storeError;

      if (!storeUsers || storeUsers.length === 0) {
        return [];
      }

      const userIds = storeUsers.map(u => u.user_id);

      let query = supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .neq('role', 'OWNER') // Never show OWNER in store-specific views
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
