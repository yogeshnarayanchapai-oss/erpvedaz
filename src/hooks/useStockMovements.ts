import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

type StockMovementType = Database['public']['Enums']['stock_movement_type'];

export interface StockMovement {
  id: string;
  product_id: string;
  warehouse_id: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  movement_date: string;
  movement_type: StockMovementType;
  movement_reason: string | null;
  movement_source: string | null;
  party_id: string | null;
  is_sale: boolean | null;
  sale_category: string | null;
  source: string | null;
  reference_type: string | null;
  reference_id: string | null;
  qty: number;
  unit_cost: number | null;
  unit_price: number | null;
  total_cost: number | null;
  total_value: number | null;
  remark: string | null;
  reference_order_count: number | null;
  is_deleted: boolean | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  products?: { id: string; name: string; wholesale_price?: number; store_id?: string | null };
  warehouses?: { id: string; name: string; code: string };
  from_warehouse?: { id: string; name: string; code: string };
  to_warehouse?: { id: string; name: string; code: string };
  parties?: { id: string; name: string };
}

interface MovementFilters {
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
  productId?: string;
  movementType?: StockMovementType;
  movementReason?: string;
  saleCategory?: 'RETAIL' | 'WHOLESALE';
  storeId?: string;
  includeDeleted?: boolean; // For activity log - show all including deleted
}

export function useStockMovements(filters: MovementFilters = {}) {
  const currentStoreId = useCurrentStoreId();
  const storeId = filters.storeId || currentStoreId;

  return useQuery({
    queryKey: ['stock_movements', filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products:product_id(id, name, wholesale_price, store_id),
          warehouses!warehouse_id(id, name, code),
          from_warehouse:warehouses!from_warehouse_id(id, name, code),
          to_warehouse:warehouses!to_warehouse_id(id, name, code),
          parties:party_id(id, name)
        `)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter out deleted movements unless includeDeleted is true (for activity log)
      if (!filters.includeDeleted) {
        query = query.or('is_deleted.is.null,is_deleted.eq.false');
      }

      if (filters.startDate) {
        query = query.gte('movement_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('movement_date', filters.endDate);
      }
      if (filters.warehouseId && filters.warehouseId !== 'all') {
        query = query.eq('warehouse_id', filters.warehouseId);
      }
      if (filters.productId && filters.productId !== 'all') {
        query = query.eq('product_id', filters.productId);
      }
      if (filters.movementType && filters.movementType !== ('all' as any)) {
        query = query.eq('movement_type', filters.movementType);
      }
      if (filters.movementReason) {
        query = query.eq('movement_reason', filters.movementReason);
      }
      if (filters.saleCategory) {
        query = query.eq('sale_category', filters.saleCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let result = data as StockMovement[];
      
      // Filter by store_id via product relation
      if (storeId) {
        result = result.filter((sm) => sm.products?.store_id === storeId);
      }
      
      return result;
    },
    enabled: !!storeId,
  });
}

interface CreateStockMovementInput {
  product_id: string;
  warehouse_id: string;
  from_warehouse_id?: string | null;
  to_warehouse_id?: string | null;
  movement_date: string;
  movement_type: StockMovementType;
  movement_reason?: string | null;
  movement_source?: string | null;
  party_id?: string | null;
  is_sale?: boolean | null;
  sale_category?: string | null;
  source?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  qty: number;
  unit_cost?: number | null;
  unit_price?: number | null;
  remark?: string | null;
  reference_order_count?: number | null;
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStockMovementInput) => {
      // Insert stock movement
      // Note: Party transactions (payables/receivables) are created automatically 
      // by the database trigger 'create_party_transaction_from_stock_movement'
      // Do NOT create them manually here to avoid duplicates
      const { data: movement, error: movementError } = await supabase
        .from('stock_movements')
        .insert(input as any)
        .select()
        .single();
      if (movementError) throw movementError;

      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['daily_pl'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Movement recorded');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

export function useUpdateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<StockMovement> & { id: string }) => {
      const updateData: any = { ...input };
      delete updateData.products;
      delete updateData.warehouses;
      delete updateData.total_cost;
      delete updateData.total_value;
      
      const { data, error } = await supabase
        .from('stock_movements')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['daily_pl'] });
      toast.success('Movement updated');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

export function useDeleteStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - mark as deleted instead of removing
      const { error } = await supabase
        .from('stock_movements')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_summary_warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['daily_pl'] });
      toast.success('Movement deleted');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}
