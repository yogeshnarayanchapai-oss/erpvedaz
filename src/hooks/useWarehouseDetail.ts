import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface WarehouseDetailStats {
  totalCurrentStock: number;
  stockValue: number;
  lowStockProducts: number;
  unitsSoldLast30Days: number;
}

export function useWarehouseById(warehouseId: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['warehouse', warehouseId, storeId],
    queryFn: async () => {
      let query = supabase
        .from('warehouses')
        .select('*')
        .eq('id', warehouseId);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!warehouseId && !!storeId,
  });
}

export function useWarehouseStats(warehouseId: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['warehouse_stats', warehouseId, storeId],
    queryFn: async () => {
      // Get inventory for this warehouse with store filtering
      const { data: inventory, error: invErr } = await supabase
        .from('product_inventory')
        .select(`
          current_stock,
          reorder_level,
          products:product_id(cost_price, store_id)
        `)
        .eq('warehouse_id', warehouseId);

      if (invErr) throw invErr;

      // Filter by store
      const filteredInventory = storeId
        ? (inventory || []).filter((item: any) => item.products?.store_id === storeId)
        : inventory;

      let totalCurrentStock = 0;
      let stockValue = 0;
      let lowStockProducts = 0;

      filteredInventory?.forEach((item: any) => {
        totalCurrentStock += item.current_stock || 0;
        const costPrice = item.products?.cost_price || 0;
        stockValue += (item.current_stock || 0) * costPrice;
        if ((item.current_stock || 0) <= (item.reorder_level || 0)) {
          lowStockProducts++;
        }
      });

      // Get units sold in last 30 days - filter by warehouse (which is already store-scoped)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: movements, error: movErr } = await supabase
        .from('stock_movements')
        .select('qty, products:product_id(store_id)')
        .eq('warehouse_id', warehouseId)
        .eq('movement_type', 'OUT')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .gte('movement_date', thirtyDaysStr);

      if (movErr) throw movErr;

      // Filter by store via product
      const filteredMovements = storeId
        ? (movements || []).filter((m: any) => m.products?.store_id === storeId)
        : movements;

      const unitsSoldLast30Days = filteredMovements?.reduce((sum: number, m: any) => sum + (m.qty || 0), 0) || 0;

      return {
        totalCurrentStock,
        stockValue,
        lowStockProducts,
        unitsSoldLast30Days,
      } as WarehouseDetailStats;
    },
    enabled: !!warehouseId && !!storeId,
  });
}

export function useWarehouseInventory(warehouseId: string, startDate?: string, endDate?: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['warehouse_inventory', warehouseId, startDate, endDate, storeId],
    queryFn: async () => {
      // Get inventory records for this warehouse
      const { data: inventoryData, error: invErr } = await supabase
        .from('product_inventory')
        .select(`
          *,
          products:product_id(id, name, cost_price, store_id)
        `)
        .eq('warehouse_id', warehouseId);

      if (invErr) throw invErr;

      // Filter by store
      const filteredInventory = storeId
        ? (inventoryData || []).filter((inv: any) => inv.products?.store_id === storeId)
        : inventoryData;

      // Get stock movements grouped by product for this warehouse
      let movementsQuery = supabase
        .from('stock_movements')
        .select('product_id, movement_type, qty, movement_date, products:product_id(store_id)')
        .eq('warehouse_id', warehouseId)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (startDate) {
        movementsQuery = movementsQuery.gte('movement_date', startDate);
      }
      if (endDate) {
        movementsQuery = movementsQuery.lte('movement_date', endDate);
      }

      const { data: movementsData, error: movErr } = await movementsQuery;
      if (movErr) throw movErr;

      // Filter movements by store via product
      const filteredMovements = storeId
        ? (movementsData || []).filter((m: any) => m.products?.store_id === storeId)
        : movementsData;

      // Calculate In/Out per product
      const movementTotals: Record<string, { total_in: number; total_out: number }> = {};

      (filteredMovements || []).forEach((m: any) => {
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
      const summary = (filteredInventory || []).map((inv: any) => {
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
    enabled: !!warehouseId && !!storeId,
  });
}

export function useWarehouseMovements(warehouseId: string, startDate?: string, endDate?: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['warehouse_movements', warehouseId, startDate, endDate, storeId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products:product_id(name, store_id)
        `)
        .eq('warehouse_id', warehouseId)
        .or('is_deleted.is.null,is_deleted.eq.false')
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

      // Filter by store via product
      const filteredData = storeId
        ? (data || []).filter((m: any) => m.products?.store_id === storeId)
        : data;

      return filteredData;
    },
    enabled: !!warehouseId && !!storeId,
  });
}
