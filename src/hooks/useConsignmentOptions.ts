import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface ConsignmentOption {
  id: string;
  consignment_code: string;
  product_name: string | null;
  is_completed: boolean;
  customer_name: string | null;
}

export function useConsignmentOptions() {
  const storeId = useCurrentStoreId();
  return useQuery({
    queryKey: ['consignment-options', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('consignments')
        .select(`id, consignment_code, product_name, is_completed,
                 customer:parties!consignments_customer_party_id_fkey(name)`)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .range(0, 9999);
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        id: r.id,
        consignment_code: r.consignment_code,
        product_name: r.product_name ?? null,
        is_completed: !!r.is_completed,
        customer_name: r.customer?.name ?? null,
      })) as ConsignmentOption[];
    },
  });
}
