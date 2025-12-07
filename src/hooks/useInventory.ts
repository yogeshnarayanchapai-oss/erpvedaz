import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  products?: { id: string; name: string; cost_price: number | null; sell_price: number | null };
  warehouses?: { id: string; name: string; code: string };
}

export function useInventory(warehouseId?: string, productSearch?: string, reorderOnly?: boolean) {
  return useQuery({
    queryKey: ['inventory', warehouseId, productSearch, reorderOnly],
    queryFn: async () => {
      let query = supabase
        .from('product_inventory')
        .select(`
          *,
          products:product_id(id, name, cost_price, sell_price),
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
      if (productSearch) {
        const search = productSearch.toLowerCase();
        result = result.filter((inv) =>
          inv.products?.name?.toLowerCase().includes(search)
        );
      }
      return result;
    },
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_inventory')
        .select(`
          current_stock,
          products:product_id(cost_price)
        `);
      if (error) throw error;

      const items = data as { current_stock: number; products: { cost_price: number | null } | null }[];
      const totalProducts = new Set(items.map((i) => i.products)).size;
      const totalStock = items.reduce((sum, i) => sum + (i.current_stock || 0), 0);
      const stockValue = items.reduce(
        (sum, i) => sum + (i.current_stock || 0) * (i.products?.cost_price || 0),
        0
      );

      return { totalProducts, totalStock, stockValue };
    },
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
