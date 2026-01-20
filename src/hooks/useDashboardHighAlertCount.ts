import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

const HIGH_ALERT_DAYS_KEY = 'high_alert_days';

export function useDashboardHighAlertCount() {
  const storeId = useCurrentStoreId();
  
  // Get high alert days from localStorage
  const highAlertDays = typeof window !== 'undefined' 
    ? parseInt(localStorage.getItem(HIGH_ALERT_DAYS_KEY) || '0') || null 
    : null;

  return useQuery({
    queryKey: ['dashboard_high_alert_count', storeId, highAlertDays],
    queryFn: async (): Promise<number> => {
      if (!highAlertDays || highAlertDays < 1 || !storeId) {
        return 0;
      }

      // 1. Get current stock for all product-warehouse combos
      const { data: stockData, error: stockError } = await supabase
        .from('product_inventory')
        .select('product_id, warehouse_id, current_stock, products!inner(store_id)')
        .eq('products.store_id', storeId);

      if (stockError) throw stockError;

      if (!stockData || stockData.length === 0) return 0;

      // Build current stock map
      const currentStockMap = new Map<string, number>();
      stockData.forEach((s: any) => {
        const key = `${s.product_id}_${s.warehouse_id}`;
        currentStockMap.set(key, s.current_stock || 0);
      });

      // 2. Get OUT movements for past X days
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
      let highAlertCount = 0;
      currentStockMap.forEach((currentStock, key) => {
        const totalOut = outTotals[key] || 0;
        const avgOutPerDay = totalOut / highAlertDays;
        
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
