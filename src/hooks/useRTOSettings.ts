import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface RTOSetting {
  id: string;
  store_id: string | null;
  year_month: string;
  rto_percent: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useRTOSettings() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['rto-settings', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rto_settings')
        .select('*')
        .eq('store_id', storeId)
        .order('year_month', { ascending: false });

      if (error) throw error;
      return data as RTOSetting[];
    },
    enabled: !!storeId,
  });
}

export function useRTOSettingForMonth(yearMonth: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['rto-setting', storeId, yearMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rto_settings')
        .select('*')
        .eq('store_id', storeId)
        .eq('year_month', yearMonth)
        .maybeSingle();

      if (error) throw error;
      return data as RTOSetting | null;
    },
    enabled: !!storeId && !!yearMonth,
  });
}

export function useUpsertRTOSetting() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async ({ yearMonth, rtoPercent }: { yearMonth: string; rtoPercent: number }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { data, error } = await supabase
        .from('rto_settings')
        .upsert(
          {
            store_id: storeId,
            year_month: yearMonth,
            rto_percent: rtoPercent,
            created_by: userId,
          },
          { onConflict: 'store_id,year_month' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rto-settings'] });
      queryClient.invalidateQueries({ queryKey: ['rto-setting'] });
      toast.success('RTO setting saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save RTO setting: ${error.message}`);
    },
  });
}
