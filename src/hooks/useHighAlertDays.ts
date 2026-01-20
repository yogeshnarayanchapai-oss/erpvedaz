import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { toast } from '@/hooks/use-toast';

export function useHighAlertDays() {
  const storeId = useCurrentStoreId();
  const queryClient = useQueryClient();

  const { data: highAlertDays, isLoading } = useQuery({
    queryKey: ['high-alert-days', storeId],
    queryFn: async (): Promise<number | null> => {
      if (!storeId) return null;

      const { data, error } = await supabase
        .from('cost_settings')
        .select('high_alert_days')
        .eq('store_id', storeId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching high alert days:', error);
        return null;
      }

      return data?.high_alert_days ?? null;
    },
    enabled: !!storeId,
    staleTime: 60000, // 1 minute
  });

  const updateHighAlertDays = useMutation({
    mutationFn: async (days: number) => {
      if (!storeId) throw new Error('No store selected');

      // Check if cost_settings exists for this store
      const { data: existing } = await supabase
        .from('cost_settings')
        .select('id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('cost_settings')
          .update({ high_alert_days: days })
          .eq('store_id', storeId);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('cost_settings')
          .insert({ store_id: storeId, high_alert_days: days });

        if (error) throw error;
      }
    },
    onSuccess: (_, days) => {
      queryClient.invalidateQueries({ queryKey: ['high-alert-days', storeId] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_high_alert_count'] });
      toast({ title: `High Alert set to ${days} days` });
    },
    onError: (error) => {
      console.error('Error updating high alert days:', error);
      toast({ 
        title: 'Error updating High Alert days', 
        variant: 'destructive' 
      });
    },
  });

  return {
    highAlertDays,
    isLoading,
    updateHighAlertDays: updateHighAlertDays.mutate,
    isUpdating: updateHighAlertDays.isPending,
  };
}
