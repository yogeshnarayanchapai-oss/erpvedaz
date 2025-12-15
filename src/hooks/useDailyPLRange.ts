import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface PLSummary {
  total_units_sold: number;
  gross_sales_value: number;
  product_cost: number;
  rto_units: number;
  rto_value: number;
  actual_sales: number;
}

export interface WarehousePLBreakdown {
  warehouse_id: string;
  warehouse_name: string;
  units_sold: number;
  gross_sales: number;
  product_cost: number;
  profit: number;
}

export interface DailyTrend {
  date: string;
  gross_sales: number;
  actual_profit: number;
  ads_spent: number;
}

export function usePLSummaryByRange(startDate: string, endDate: string, warehouseId?: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['pl_summary_range', storeId, startDate, endDate, warehouseId],
    queryFn: async () => {
      // Get all OUT movements (sales) for the date range
      // Filter by products that belong to current store
      let salesQuery = supabase
        .from('stock_movements')
        .select('qty, total_cost, total_value, warehouse_id, warehouses:warehouse_id(id, name), products:product_id(store_id)')
        .eq('movement_type', 'OUT')
        .gte('movement_date', startDate)
        .lte('movement_date', endDate)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (warehouseId && warehouseId !== 'all') {
        salesQuery = salesQuery.eq('warehouse_id', warehouseId);
      }

      const { data: salesMovements, error: salesErr } = await salesQuery;
      if (salesErr) throw salesErr;

      // Filter by store through products relationship
      const storeFilteredSales = salesMovements?.filter((m: any) => m.products?.store_id === storeId) || [];

      // Get RTO movements
      let rtoQuery = supabase
        .from('stock_movements')
        .select('qty, total_cost, total_value, warehouse_id, products:product_id(store_id)')
        .in('movement_type', ['RTO_IN', 'RTO_OUT'])
        .gte('movement_date', startDate)
        .lte('movement_date', endDate)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (warehouseId && warehouseId !== 'all') {
        rtoQuery = rtoQuery.eq('warehouse_id', warehouseId);
      }

      const { data: rtoMovements, error: rtoErr } = await rtoQuery;
      if (rtoErr) throw rtoErr;

      // Filter RTO movements by store
      const storeFilteredRTO = rtoMovements?.filter((m: any) => m.products?.store_id === storeId) || [];

      // Calculate totals
      let total_units_sold = 0;
      let gross_sales_value = 0;
      let product_cost = 0;

      const warehouseBreakdown: Record<string, WarehousePLBreakdown> = {};

      storeFilteredSales.forEach((m: any) => {
        total_units_sold += m.qty || 0;
        gross_sales_value += m.total_value || 0;
        product_cost += m.total_cost || 0;

        const wId = m.warehouse_id;
        const wName = m.warehouses?.name || 'Unknown';
        if (!warehouseBreakdown[wId]) {
          warehouseBreakdown[wId] = {
            warehouse_id: wId,
            warehouse_name: wName,
            units_sold: 0,
            gross_sales: 0,
            product_cost: 0,
            profit: 0,
          };
        }
        warehouseBreakdown[wId].units_sold += m.qty || 0;
        warehouseBreakdown[wId].gross_sales += m.total_value || 0;
        warehouseBreakdown[wId].product_cost += m.total_cost || 0;
        warehouseBreakdown[wId].profit =
          warehouseBreakdown[wId].gross_sales - warehouseBreakdown[wId].product_cost;
      });

      let rto_units = 0;
      let rto_value = 0;
      storeFilteredRTO.forEach((m: any) => {
        rto_units += m.qty || 0;
        rto_value += m.total_value || 0;
      });

      const actual_sales = gross_sales_value - rto_value;

      return {
        summary: {
          total_units_sold,
          gross_sales_value,
          product_cost,
          rto_units,
          rto_value,
          actual_sales,
        } as PLSummary,
        warehouseBreakdown: Object.values(warehouseBreakdown),
      };
    },
    enabled: !!storeId && !!startDate && !!endDate,
  });
}

export function useDailyPLTrend(days: number = 30) {
  return useQuery({
    queryKey: ['pl_trend', days],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Get daily_pl records for trend
      const { data: plRecords, error: plErr } = await supabase
        .from('daily_pl')
        .select('date, gross_sales_value, actual_profit, ads_spent_npr')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      if (plErr) throw plErr;

      // Also get sales by date from movements for dates without PL records
      const { data: salesByDate, error: salesErr } = await supabase
        .from('stock_movements')
        .select('movement_date, total_value, total_cost')
        .eq('movement_type', 'OUT')
        .gte('movement_date', startStr)
        .lte('movement_date', endStr);

      if (salesErr) throw salesErr;

      // Group sales by date
      const salesMap: Record<string, { gross: number; cost: number }> = {};
      salesByDate?.forEach((s: any) => {
        if (!salesMap[s.movement_date]) {
          salesMap[s.movement_date] = { gross: 0, cost: 0 };
        }
        salesMap[s.movement_date].gross += s.total_value || 0;
        salesMap[s.movement_date].cost += s.total_cost || 0;
      });

      // Merge PL records with sales data
      const plMap: Record<string, DailyTrend> = {};
      plRecords?.forEach((p: any) => {
        plMap[p.date] = {
          date: p.date,
          gross_sales: p.gross_sales_value || 0,
          actual_profit: p.actual_profit || 0,
          ads_spent: p.ads_spent_npr || 0,
        };
      });

      // Fill in dates that have sales but no PL record
      Object.keys(salesMap).forEach((date) => {
        if (!plMap[date]) {
          const sales = salesMap[date];
          plMap[date] = {
            date,
            gross_sales: sales.gross,
            actual_profit: sales.gross - sales.cost,
            ads_spent: 0,
          };
        }
      });

      return Object.values(plMap).sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}

export function useAITargetSuggestions(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['ai_targets', startDate, endDate],
    queryFn: async () => {
      // Get last 7 days of data for AI suggestions
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      const { data: recentPL, error } = await supabase
        .from('daily_pl')
        .select('actual_profit, total_units_sold')
        .gte('date', sevenDaysStr)
        .lte('date', todayStr);

      if (error) throw error;

      if (!recentPL?.length) {
        return { suggestedProfit: 0, suggestedOrders: 0 };
      }

      const avgProfit =
        recentPL.reduce((sum, p) => sum + (p.actual_profit || 0), 0) / recentPL.length;
      const avgOrders =
        recentPL.reduce((sum, p) => sum + (p.total_units_sold || 0), 0) / recentPL.length;

      return {
        suggestedProfit: Math.round(avgProfit * 1.1), // 10% growth target
        suggestedOrders: Math.round(avgOrders * 1.2), // 20% growth target
      };
    },
  });
}
