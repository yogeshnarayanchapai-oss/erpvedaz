import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface Branch {
  id: string;
  code: string | null;
  branch_name: string;
  arrival_time: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  district: string | null;
  province: string | null;
  base_charge: number | null;
  area_covered: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  store_id: string | null;
}

export interface CreateBranchInput {
  branch_name: string;
  code?: string;
  arrival_time?: string;
  contact_name?: string;
  contact_phone?: string;
  district?: string;
  province?: string;
  base_charge?: number;
  area_covered?: string;
  is_active?: boolean;
}

export interface UpdateBranchInput extends Partial<CreateBranchInput> {
  id: string;
}

export function useBranches(options?: { includeInactive?: boolean }) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['branches', options, storeId],
    queryFn: async () => {
      let query = supabase
        .from('branches')
        .select('*')
        .order('branch_name', { ascending: true });

      if (!options?.includeInactive) {
        query = query.eq('is_active', true);
      }

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Branch[];
    },
    enabled: !!storeId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const { data, error } = await supabase
        .from('branches')
        .insert({
          ...input,
          is_active: input.is_active ?? true,
          store_id: storeId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create branch: ${error.message}`);
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBranchInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update branch: ${error.message}`);
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete branch: ${error.message}`);
    },
  });
}
