import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TransactionCategory {
  id: string;
  name: string;
  nature: 'income' | 'expense';
  is_system: boolean;
  created_at: string;
}

export function useTransactionCategories(nature?: 'income' | 'expense') {
  return useQuery({
    queryKey: ['transaction-categories', nature],
    queryFn: async () => {
      let query = supabase
        .from('transaction_categories')
        .select('*')
        .order('name');

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
  
  return useMutation({
    mutationFn: async (category: Omit<TransactionCategory, 'id' | 'created_at' | 'is_system'>) => {
      const { data, error } = await supabase
        .from('transaction_categories')
        .insert({ ...category, is_system: false })
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
