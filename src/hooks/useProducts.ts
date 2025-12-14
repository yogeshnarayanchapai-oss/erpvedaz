import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface Product {
  id: string;
  name: string;
  target_per_day: number | null;
  cost_price: number | null;
  sell_price: number | null;
  wholesale_price: number | null;
  delivery_cost: number | null;
  is_active: boolean;
  created_at: string;
  store_id: string | null;
}

export function useProducts() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Filter by store_id if available
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!storeId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: Partial<Omit<Product, 'id' | 'created_at' | 'is_active'>> & { name: string }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...input,
          store_id: storeId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if product has inventory with stock > 0
      const { data: inventoryData, error: invError } = await supabase
        .from('product_inventory')
        .select('id, current_stock')
        .eq('product_id', id);

      if (invError) throw invError;

      // Check if any inventory has stock > 0
      const hasStock = inventoryData?.some(inv => (inv.current_stock || 0) > 0);
      if (hasStock) {
        throw new Error('Cannot delete product with existing inventory stock. Please clear stock first.');
      }

      // Delete related inventory records (where stock is 0)
      if (inventoryData && inventoryData.length > 0) {
        const { error: deleteInvError } = await supabase
          .from('product_inventory')
          .delete()
          .eq('product_id', id);

        if (deleteInvError) throw deleteInvError;
      }

      // Soft delete the product
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_summary_warehouse'] });
      toast.success('Product deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });
}
