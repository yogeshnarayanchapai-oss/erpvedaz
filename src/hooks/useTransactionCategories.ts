import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface TransactionCategory {
  id: string;
  name: string;
  nature: 'income' | 'expense';
  is_system: boolean;
  store_id: string | null;
  created_at: string;
}

export function useTransactionCategories(nature?: 'income' | 'expense') {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['transaction-categories', storeId, nature],
    queryFn: async () => {
      let query = supabase
        .from('transaction_categories')
        .select('*')
        .order('name');

      // Show system categories (store_id is null) OR categories for current store
      if (storeId) {
        query = query.or(`store_id.is.null,store_id.eq.${storeId}`);
      }

      if (nature) {
        query = query.eq('nature', nature);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as TransactionCategory[];
    },
  });
}

export function useCreateTransactionCategory() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (category: Omit<TransactionCategory, 'id' | 'created_at' | 'is_system' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('transaction_categories')
        .insert({ ...category, is_system: false, store_id: storeId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useDeleteTransactionCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transaction_categories')
        .delete()
        .eq('id', id)
        .eq('is_system', false); // Prevent deletion of system categories
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}
