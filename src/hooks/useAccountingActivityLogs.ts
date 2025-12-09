import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface ActivityLog {
  id: string;
  store_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  amount: number | null;
  performed_by: string | null;
  performed_at: string;
  created_at: string;
  performer_name?: string | null;
}

export function useAccountingActivityLogs(filters?: { startDate?: string; endDate?: string; actionType?: string }) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['accounting-activity-logs', storeId, filters],
    queryFn: async () => {
      let query = supabase
        .from('accounting_activity_logs')
        .select('*')
        .order('performed_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (filters?.startDate) {
        query = query.gte('performed_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('performed_at', filters.endDate + 'T23:59:59');
      }
      if (filters?.actionType && filters.actionType !== 'all') {
        query = query.eq('action_type', filters.actionType);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      
      // Fetch performer names separately
      const logs = data || [];
      const performerIds = [...new Set(logs.map(l => l.performed_by).filter(Boolean))] as string[];
      
      let performerMap: Record<string, string> = {};
      if (performerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', performerIds);
        
        performerMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }
      
      return logs.map(log => ({
        ...log,
        performer_name: log.performed_by ? performerMap[log.performed_by] || null : null,
      })) as ActivityLog[];
    },
    enabled: !!storeId,
  });
}

export function useCreateActivityLog() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (log: {
      action_type: string;
      entity_type: string;
      entity_id?: string;
      description: string;
      old_values?: Record<string, any>;
      new_values?: Record<string, any>;
      amount?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('accounting_activity_logs')
        .insert({
          ...log,
          store_id: storeId,
          performed_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-activity-logs'] });
    },
  });
}
