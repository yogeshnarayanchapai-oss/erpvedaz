import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WholesalePLSummary {
  total_units: number;
  wholesale_revenue: number;
  wholesale_product_cost: number;
  wholesale_profit: number;
}

export function useWholesalePLSummary(startDate: string, endDate: string, warehouseId?: string) {
  return useQuery({
    queryKey: ['wholesale_pl_summary', startDate, endDate, warehouseId],
    queryFn: async () => {
      // Get wholesale movements (OUT with WHOLESALE reason/category, exclude deleted)
      let query = supabase
        .from('stock_movements')
        .select('qty, total_cost, total_value, movement_type, movement_reason, sale_category')
        .eq('movement_type', 'OUT')
        .eq('sale_category', 'WHOLESALE')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .gte('movement_date', startDate)
        .lte('movement_date', endDate);

      if (warehouseId && warehouseId !== 'all') {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data: movements, error } = await query;
      if (error) throw error;

      let total_units = 0;
      let wholesale_revenue = 0;
      let wholesale_product_cost = 0;

      // Sum up all wholesale movements
      movements?.forEach((m) => {
        total_units += m.qty || 0;
        wholesale_revenue += m.total_value || 0;
        wholesale_product_cost += m.total_cost || 0;
      });

      const wholesale_profit = wholesale_revenue - wholesale_product_cost;

      return {
        total_units,
        wholesale_revenue,
        wholesale_product_cost,
        wholesale_profit,
      } as WholesalePLSummary;
    },
    enabled: !!startDate && !!endDate,
  });
}
