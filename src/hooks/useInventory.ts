import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface ProductInventory {
  id: string;
  product_id: string;
  warehouse_id: string;
  opening_stock: number;
  current_stock: number;
  reorder_level: number;
  reorder_required: boolean;
  drawer_number: string | null;
  created_at: string;
  updated_at: string;
  products?: { id: string; name: string; cost_price: number | null; sell_price: number | null; store_id?: string | null };
  warehouses?: { id: string; name: string; code: string };
}

export function useInventory(warehouseId?: string, productSearch?: string, reorderOnly?: boolean) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['inventory', warehouseId, productSearch, reorderOnly, storeId],
    queryFn: async () => {
      let query = supabase
        .from('product_inventory')
        .select(`
          *,
          products:product_id(id, name, cost_price, sell_price, store_id),
          warehouses:warehouse_id(id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (warehouseId && warehouseId !== 'all') {
        query = query.eq('warehouse_id', warehouseId);
      }
      if (reorderOnly) {
        query = query.eq('reorder_required', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = data as ProductInventory[];
      
      // Filter by store_id via product relation
      if (storeId) {
        result = result.filter((inv) => inv.products?.store_id === storeId);
      }

      if (productSearch) {
        const search = productSearch.toLowerCase();
        result = result.filter((inv) =>
          inv.products?.name?.toLowerCase().includes(search)
        );
      }
      
      // Sort by current stock descending (highest stock first)
      result.sort((a, b) => (b.current_stock || 0) - (a.current_stock || 0));
      
      return result;
    },
    enabled: !!storeId,
  });
}

export function useInventorySummary() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['inventory', 'summary', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_inventory')
        .select(`
          current_stock,
          products:product_id(cost_price, store_id)
        `);
      if (error) throw error;

      const items = data as { current_stock: number; products: { cost_price: number | null; store_id: string | null } | null }[];
      
      // Filter by store
      const filteredItems = storeId 
        ? items.filter(i => i.products?.store_id === storeId)
        : items;

      const totalProducts = new Set(filteredItems.map((i) => i.products)).size;
      const totalStock = filteredItems.reduce((sum, i) => sum + (i.current_stock || 0), 0);
      const stockValue = filteredItems.reduce(
        (sum, i) => sum + (i.current_stock || 0) * (i.products?.cost_price || 0),
        0
      );

      return { totalProducts, totalStock, stockValue };
    },
    enabled: !!storeId,
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ProductInventory> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_inventory')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory updated');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { product_id: string; warehouse_id: string; opening_stock?: number; current_stock?: number; reorder_level?: number; reorder_required?: boolean; drawer_number?: string }) => {
      const { data, error } = await supabase
        .from('product_inventory')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory record created');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}
