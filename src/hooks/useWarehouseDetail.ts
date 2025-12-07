import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WarehouseDetailStats {
  totalCurrentStock: number;
  stockValue: number;
  lowStockProducts: number;
  unitsSoldLast30Days: number;
}

export function useWarehouseById(warehouseId: string) {
  return useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', warehouseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!warehouseId,
  });
}

export function useWarehouseStats(warehouseId: string) {
  return useQuery({
    queryKey: ['warehouse_stats', warehouseId],
    queryFn: async () => {
      // Get inventory for this warehouse
      const { data: inventory, error: invErr } = await supabase
        .from('product_inventory')
        .select(`
          current_stock,
          reorder_level,
          products:product_id(cost_price)
        `)
        .eq('warehouse_id', warehouseId);

      if (invErr) throw invErr;

      let totalCurrentStock = 0;
      let stockValue = 0;
      let lowStockProducts = 0;

      inventory?.forEach((item: any) => {
        totalCurrentStock += item.current_stock || 0;
        const costPrice = item.products?.cost_price || 0;
        stockValue += (item.current_stock || 0) * costPrice;
        if ((item.current_stock || 0) <= (item.reorder_level || 0)) {
          lowStockProducts++;
        }
      });

      // Get units sold in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: movements, error: movErr } = await supabase
        .from('stock_movements')
        .select('qty')
        .eq('warehouse_id', warehouseId)
        .eq('movement_type', 'OUT')
        .gte('movement_date', thirtyDaysStr);

      if (movErr) throw movErr;

      const unitsSoldLast30Days = movements?.reduce((sum, m) => sum + (m.qty || 0), 0) || 0;

      return {
        totalCurrentStock,
        stockValue,
        lowStockProducts,
        unitsSoldLast30Days,
      } as WarehouseDetailStats;
    },
    enabled: !!warehouseId,
  });
}

export function useWarehouseInventory(warehouseId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['warehouse_inventory', warehouseId, startDate, endDate],
    queryFn: async () => {
      // Get inventory records for this warehouse
      const { data: inventoryData, error: invErr } = await supabase
        .from('product_inventory')
        .select(`
          *,
          products:product_id(id, name, cost_price)
        `)
        .eq('warehouse_id', warehouseId);

      if (invErr) throw invErr;

      // Get stock movements grouped by product for this warehouse
      let movementsQuery = supabase
        .from('stock_movements')
        .select('product_id, movement_type, qty, movement_date')
        .eq('warehouse_id', warehouseId);

      if (startDate) {
        movementsQuery = movementsQuery.gte('movement_date', startDate);
      }
      if (endDate) {
        movementsQuery = movementsQuery.lte('movement_date', endDate);
      }

      const { data: movementsData, error: movErr } = await movementsQuery;
      if (movErr) throw movErr;

      // Calculate In/Out per product
      const movementTotals: Record<string, { total_in: number; total_out: number }> = {};

      movementsData?.forEach((m: any) => {
        const pid = m.product_id;
        if (!movementTotals[pid]) {
          movementTotals[pid] = { total_in: 0, total_out: 0 };
        }

        const isIn = ['IN', 'TRANSFER_IN', 'RTO_IN'].includes(m.movement_type);
        const isOut = ['OUT', 'TRANSFER_OUT', 'ADJUSTMENT', 'RTO_OUT'].includes(m.movement_type);

        if (isIn) movementTotals[pid].total_in += m.qty || 0;
        if (isOut) movementTotals[pid].total_out += m.qty || 0;
      });

      // Build summary
      const summary = (inventoryData || []).map((inv: any) => {
        const movements = movementTotals[inv.product_id] || { total_in: 0, total_out: 0 };
        const costPrice = inv.products?.cost_price || 0;

        return {
          product_id: inv.product_id,
          product_name: inv.products?.name || 'Unknown',
          opening_stock: inv.opening_stock || 0,
          total_in: movements.total_in,
          total_out: movements.total_out,
          current_stock: inv.current_stock || 0,
          reorder_level: inv.reorder_level || 0,
          reorder_required: inv.reorder_required || false,
          stock_value: (inv.current_stock || 0) * costPrice,
          cost_price: costPrice,
          drawer_number: inv.drawer_number,
        };
      });

      return summary;
    },
    enabled: !!warehouseId,
  });
}

export function useWarehouseMovements(warehouseId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['warehouse_movements', warehouseId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products:product_id(name)
        `)
        .eq('warehouse_id', warehouseId)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('movement_date', startDate);
      }
      if (endDate) {
        query = query.lte('movement_date', endDate);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!warehouseId,
  });
}
