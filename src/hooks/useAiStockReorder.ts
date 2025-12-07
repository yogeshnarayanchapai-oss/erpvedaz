import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AiStockReorderParams {
  storeId: string | undefined;
  warehouseId?: string;
  lookbackDays?: number;
}

interface ReorderSuggestion {
  product_id: string;
  product_name: string;
  category: string;
  warehouse_id: string;
  warehouse_name: string;
  current_stock: number;
  reorder_level: number;
  total_sales_qty: number;
  avg_daily_sales: number;
  days_of_cover: number;
  base_cost: number;
  selling_price: number;
  urgency: 'URGENT' | 'LOW' | 'OK' | 'OVERSTOCKED';
  suggested_reorder_qty: number;
  short_note: string;
}

interface AiStockReorderResponse {
  summary: {
    total_products: number;
    urgent: number;
    low: number;
    ok: number;
    overstocked: number;
    lookback_days: number;
  };
  results: ReorderSuggestion[];
  error?: string;
}

export function useAiStockReorder({ storeId, warehouseId, lookbackDays = 30 }: AiStockReorderParams) {
  return useQuery({
    queryKey: ['ai-stock-reorder', storeId, warehouseId, lookbackDays],
    queryFn: async () => {
      if (!storeId) {
        throw new Error('Store ID is required');
      }

      const { data, error } = await supabase.functions.invoke('ai-stock-reorder', {
        body: {
          storeId,
          warehouseId,
          lookbackDays,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to get AI reorder suggestions');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as AiStockReorderResponse;
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
