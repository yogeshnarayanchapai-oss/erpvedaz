import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerActivity {
  id: string;
  customer_id: string;
  activity_type: string;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  created_by: string | null;
  created_at: string | null;
  profiles?: {
    name: string;
  } | null;
}

export function useCustomerActivity(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-activity', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_activity_log')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names separately
      const userIds = [...new Set(data.map(a => a.created_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        return data.map(activity => ({
          ...activity,
          profiles: profiles?.find(p => p.id === activity.created_by) || null,
        })) as CustomerActivity[];
      }

      return data as CustomerActivity[];
    },
    enabled: !!customerId,
  });
}
