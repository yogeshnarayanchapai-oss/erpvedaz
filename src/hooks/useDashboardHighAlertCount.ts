import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export function useDashboardHighAlertCount() {
  const storeId = useCurrentStoreId();

  // Fetch high alert days from database (store-wise)
  const { data: highAlertDays } = useQuery({
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
    staleTime: 60000,
  });

  return useQuery({
    queryKey: ['dashboard_high_alert_count', storeId, highAlertDays],
    queryFn: async (): Promise<number> => {
      if (!highAlertDays || highAlertDays < 1 || !storeId) {
        return 0;
      }

      // 1. Get current stock for all product-warehouse combos from product_inventory
      // Filter by store via products table and only include active products
      const { data: stockData, error: stockError } = await supabase
        .from('product_inventory')
        .select('product_id, warehouse_id, current_stock, products!inner(store_id, is_active)')
        .eq('products.store_id', storeId)
        .eq('products.is_active', true);

      if (stockError) throw stockError;

      if (!stockData || stockData.length === 0) return 0;

      // Build current stock map
      const currentStockMap = new Map<string, number>();
      stockData.forEach((s: any) => {
        const key = `${s.product_id}_${s.warehouse_id}`;
        currentStockMap.set(key, s.current_stock || 0);
      });

      // 2. Get ONLY OUT movements for past X days (not transfers, adjustments, wholesale etc.)
      const today = new Date();
      const startDate = format(subDays(today, highAlertDays - 1), 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');

      const { data: movements, error: movError } = await supabase
        .from('stock_movements')
        .select('product_id, warehouse_id, movement_type, qty, products!inner(store_id)')
        .eq('products.store_id', storeId)
        .eq('movement_type', 'OUT')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .gte('movement_date', startDate)
        .lte('movement_date', endDate);

      if (movError) throw movError;

      // Calculate OUT totals per product-warehouse
      const outTotals: Record<string, number> = {};
      movements?.forEach((m: any) => {
        const key = `${m.product_id}_${m.warehouse_id}`;
        if (!outTotals[key]) outTotals[key] = 0;
        outTotals[key] += m.qty || 0;
      });

      // 3. Count high alert items
      // Products with avgOutPerDay < 1 are NOT included in High Alert
      let highAlertCount = 0;
      currentStockMap.forEach((currentStock, key) => {
        const totalOut = outTotals[key] || 0;
        const avgOutPerDay = totalOut / highAlertDays;
        
        // Only count if avgOutPerDay >= 1
        if (avgOutPerDay >= 1) {
          const daysCover = currentStock / avgOutPerDay;
          if (daysCover < highAlertDays) {
            highAlertCount++;
          }
        }
      });

      return highAlertCount;
    },
    enabled: !!storeId && !!highAlertDays && highAlertDays > 0,
    staleTime: 60000, // 1 minute
  });
}
