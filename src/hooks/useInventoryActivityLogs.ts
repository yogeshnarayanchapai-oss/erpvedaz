import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface InventoryActivityLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  product_name: string | null;
  warehouse_name: string | null;
  movement_type: string | null;
  qty: number | null;
  amount: number | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  performed_by: string | null;
  performer_name: string | null;
  store_id: string | null;
  performed_at: string;
  created_at: string;
}

interface Filters {
  startDate?: string;
  endDate?: string;
  actionType?: string;
}

export function useInventoryActivityLogs(filters: Filters = {}) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['inventory_activity_logs', storeId, filters],
    queryFn: async () => {
      let query = supabase
        .from('inventory_activity_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(500);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (filters.startDate) {
        query = query.gte('performed_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('performed_at', filters.endDate + 'T23:59:59');
      }
      if (filters.actionType && filters.actionType !== 'all') {
        query = query.eq('action_type', filters.actionType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InventoryActivityLog[];
    },
    enabled: !!storeId,
  });
}
