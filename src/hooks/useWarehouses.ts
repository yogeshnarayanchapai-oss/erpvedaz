import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useIsModuleStoreWise } from '@/hooks/useModuleStoreSettings';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string | null;
  is_active: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  store_id: string | null;
}

export function useWarehouses() {
  const storeId = useCurrentStoreId();
  const filterByStore = useIsModuleStoreWise('inventory');

  return useQuery({
    queryKey: ['warehouses', storeId, filterByStore],
    queryFn: async () => {
      let query = supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (filterByStore && storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: !!storeId,
  });
}

export function useActiveWarehouses() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['warehouses', 'active', storeId],
    queryFn: async () => {
      let query = supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: !!storeId,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: { name: string; code: string; location?: string; is_active?: boolean; remarks?: string }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert({ ...input, store_id: storeId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Warehouse> & { id: string }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}
