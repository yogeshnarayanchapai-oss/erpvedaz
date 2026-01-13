import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';
import { toast } from 'sonner';

export interface CostSettings {
  id: string;
  store_id: string | null;
  rto_percent: number;
  usd_rate: number;
  delivery_charge_per_order: number;
  rto_charge_per_unit: number;
  redirect_charge_per_unit: number;
  office_cost_per_order: number;
  redirect_percent: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

// Default values
export const DEFAULT_COST_SETTINGS: Omit<CostSettings, 'id' | 'store_id' | 'created_at' | 'updated_at' | 'updated_by'> = {
  rto_percent: 10,
  usd_rate: 150,
  delivery_charge_per_order: 250,
  rto_charge_per_unit: 200,
  redirect_charge_per_unit: 50,
  office_cost_per_order: 50,
  redirect_percent: 20,
};

// Fetch cost settings for current store
export function useCostSettings() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['cost-settings', storeId],
    queryFn: async () => {
      if (!storeId) return null;

      const { data, error } = await supabase
        .from('cost_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (error) throw error;

      // Return data with defaults if not found
      if (!data) {
        return {
          ...DEFAULT_COST_SETTINGS,
          id: '',
          store_id: storeId,
          created_at: '',
          updated_at: '',
          updated_by: null,
        } as CostSettings;
      }

      return data as CostSettings;
    },
    enabled: !!storeId,
  });
}

// Update/Insert cost settings
export function useUpdateCostSettings() {
  const storeId = useCurrentStoreId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<CostSettings, 'id' | 'store_id' | 'created_at' | 'updated_at'>>) => {
      if (!storeId) throw new Error('No store selected');

      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('cost_settings')
        .upsert({
          store_id: storeId,
          ...settings,
          updated_by: user?.user?.id || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'store_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-settings'] });
      queryClient.invalidateQueries({ queryKey: ['daily-record-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['product_daybook_by_range'] });
      toast.success('Cost settings saved successfully');
    },
    onError: (error) => {
      console.error('Error saving cost settings:', error);
      toast.error('Failed to save cost settings');
    },
  });
}
