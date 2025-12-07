import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string | null;
  is_active: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Warehouse[];
    },
  });
}

export function useActiveWarehouses() {
  return useQuery({
    queryKey: ['warehouses', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Warehouse[];
    },
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; code: string; location?: string; is_active?: boolean; remarks?: string }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert(input)
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
