import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useIsModuleStoreWise } from '@/hooks/useModuleStoreSettings';

export interface Ad {
  id: string;
  product_id: string | null;
  date: string;
  platform: string;
  amount_spent: number;
  amount_usd: number | null;
  dollar_rate: number | null;
  target_orders: number | null;
  created_at: string | null;
  store_id: string | null;
  product?: { name: string } | null;
  store?: { name: string } | null;
}

interface UseAdsParams {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
}

const DEFAULT_USD_RATE = 133.5;

export function useDefaultUsdRate() {
  return useQuery({
    queryKey: ['default-usd-rate'],
    queryFn: async () => {
      const { data } = await supabase
        .from('company_info')
        .select('other_details')
        .limit(1)
        .maybeSingle();
      
      if (data?.other_details) {
        try {
          const details = JSON.parse(data.other_details);
          if (details.default_usd_rate) {
            return details.default_usd_rate;
          }
        } catch {
          // Ignore parse errors
        }
      }
      return DEFAULT_USD_RATE;
    },
  });
}

export function useUpdateDefaultUsdRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: number) => {
      const { data: existing } = await supabase
        .from('company_info')
        .select('id, other_details')
        .limit(1)
        .maybeSingle();

      let otherDetails: any = {};
      if (existing?.other_details) {
        try {
          otherDetails = JSON.parse(existing.other_details);
        } catch {
          // Ignore parse errors
        }
      }
      otherDetails.default_usd_rate = rate;

      if (existing) {
        const { error } = await supabase
          .from('company_info')
          .update({ other_details: JSON.stringify(otherDetails) })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_info')
          .insert({ 
            company_name: 'Company',
            other_details: JSON.stringify(otherDetails) 
          });
        if (error) throw error;
      }
      return rate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-usd-rate'] });
      toast.success('Default USD rate updated');
    },
    onError: (error) => {
      toast.error(`Failed to update rate: ${error.message}`);
    },
  });
}

export function useAds(params: UseAdsParams = {}) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['ads', params, storeId],
    queryFn: async () => {
      let query = supabase
        .from('ads')
        .select('*, product:products(name), store:stores(name)')
        .order('date', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (params.dateFrom) {
        query = query.gte('date', params.dateFrom);
      }
      if (params.dateTo) {
        query = query.lte('date', params.dateTo);
      }
      if (params.productId) {
        query = query.eq('product_id', params.productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ad[];
    },
    enabled: !!storeId,
  });
}

export interface CreateAdInput {
  product_id: string | null;
  date: string;
  platform: string;
  amount_usd: number;
  dollar_rate: number;
  amount_spent: number;
  target_orders: number | null;
}

export function useCreateAd() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: CreateAdInput) => {
      const { data, error } = await supabase
        .from('ads')
        .insert({ ...input, store_id: storeId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-analytics'] });
      toast.success('Ad spend record created');
    },
    onError: (error) => {
      toast.error(`Failed to create ad: ${error.message}`);
    },
  });
}

export function useUpdateAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateAdInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('ads')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-analytics'] });
      toast.success('Ad spend record updated');
    },
    onError: (error) => {
      toast.error(`Failed to update ad: ${error.message}`);
    },
  });
}

export function useDeleteAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-analytics'] });
      toast.success('Ad spend record deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete ad: ${error.message}`);
    },
  });
}
