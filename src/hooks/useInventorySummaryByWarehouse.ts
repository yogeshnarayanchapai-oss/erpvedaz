import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface WarehouseStockSummary {
  product_id: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  opening_stock: number;
  total_in: number;
  total_out: number;
  current_stock: number;
  reorder_level: number;
  reorder_required: boolean;
  stock_value: number;
  cost_price: number;
  last_movement_date: string | null;
  drawer_number: string | null;
}

export function useInventorySummaryByWarehouse(
  warehouseId?: string,
  startDate?: string,
  endDate?: string
) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['inventory_summary_warehouse', warehouseId, startDate, endDate, storeId],
    queryFn: async () => {
      // Get inventory records with store filtering via products
      let inventoryQuery = supabase
        .from('product_inventory')
        .select(`
          *,
          products:product_id(id, name, cost_price, store_id, is_active),
          warehouses:warehouse_id(id, name, store_id)
        `);

      if (warehouseId && warehouseId !== 'all') {
        inventoryQuery = inventoryQuery.eq('warehouse_id', warehouseId);
      }

      const { data: inventoryData, error: invErr } = await inventoryQuery;
      if (invErr) throw invErr;

      // Filter by store_id and only active products
      const filteredInventory = (inventoryData || []).filter((inv: any) => {
        // Exclude inactive (deleted) products
        if (inv.products?.is_active === false) return false;
        // Filter by store
        if (storeId) {
          return inv.products?.store_id === storeId || inv.warehouses?.store_id === storeId;
        }
        return true;
      });

      // Get stock movements grouped by product/warehouse - filter by store via product
      let movementsQuery = supabase
        .from('stock_movements')
        .select('product_id, warehouse_id, movement_type, qty, movement_date, products!inner(store_id)')
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (warehouseId && warehouseId !== 'all') {
        movementsQuery = movementsQuery.eq('warehouse_id', warehouseId);
      }
      if (startDate) {
        movementsQuery = movementsQuery.gte('movement_date', startDate);
      }
      if (endDate) {
        movementsQuery = movementsQuery.lte('movement_date', endDate);
      }
      // Filter by store_id via the products table
      if (storeId) {
        movementsQuery = movementsQuery.eq('products.store_id', storeId);
      }

      const { data: movementsData, error: movErr } = await movementsQuery;
      if (movErr) throw movErr;

      // Calculate In/Out per product+warehouse
      const movementTotals: Record<
        string,
        { total_in: number; total_out: number; last_date: string | null }
      > = {};

      movementsData?.forEach((m: any) => {
        const key = `${m.product_id}_${m.warehouse_id}`;
        if (!movementTotals[key]) {
          movementTotals[key] = { total_in: 0, total_out: 0, last_date: null };
        }

        // IN types: stock increases
        const isIn = ['IN', 'TRANSFER_IN', 'RTO_IN'].includes(m.movement_type);
        // OUT types: stock decreases (includes TRANSFER which decreases from source, 
        // WHOLESALE_OUT for wholesale sales)
        const isOut = ['OUT', 'TRANSFER_OUT', 'TRANSFER', 'ADJUSTMENT', 'RTO_OUT', 'WHOLESALE_OUT'].includes(m.movement_type);

        if (isIn) movementTotals[key].total_in += m.qty || 0;
        if (isOut) movementTotals[key].total_out += m.qty || 0;

        if (
          !movementTotals[key].last_date ||
          m.movement_date > movementTotals[key].last_date
        ) {
          movementTotals[key].last_date = m.movement_date;
        }
      });

      // Build summary
      const summary: WarehouseStockSummary[] = (filteredInventory || []).map((inv: any) => {
        const key = `${inv.product_id}_${inv.warehouse_id}`;
        const movements = movementTotals[key] || { total_in: 0, total_out: 0, last_date: null };
        const costPrice = inv.products?.cost_price || 0;

        return {
          product_id: inv.product_id,
          product_name: inv.products?.name || 'Unknown',
          warehouse_id: inv.warehouse_id,
          warehouse_name: inv.warehouses?.name || 'Unknown',
          opening_stock: inv.opening_stock || 0,
          total_in: movements.total_in,
          total_out: movements.total_out,
          current_stock: inv.current_stock || 0,
          reorder_level: inv.reorder_level || 0,
          reorder_required: inv.reorder_required || false,
          stock_value: (inv.current_stock || 0) * costPrice,
          cost_price: costPrice,
          last_movement_date: movements.last_date,
          drawer_number: inv.drawer_number,
        };
      }).sort((a, b) => b.current_stock - a.current_stock);

      // Calculate totals
      const totals = summary.reduce(
        (acc, item) => ({
          totalProducts: acc.totalProducts + 1,
          totalStock: acc.totalStock + item.current_stock,
          totalValue: acc.totalValue + item.stock_value,
          totalIn: acc.totalIn + item.total_in,
          totalOut: acc.totalOut + item.total_out,
        }),
        { totalProducts: 0, totalStock: 0, totalValue: 0, totalIn: 0, totalOut: 0 }
      );

      return { items: summary, totals };
    },
    enabled: !!storeId,
  });
}
