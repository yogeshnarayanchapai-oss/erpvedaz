import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['staff', role, includeInactive],
    queryFn: async () => {
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
    },
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
