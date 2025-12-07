import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface OfficeExpense {
  id: string;
  date: string;
  category: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

interface UseOfficeExpensesParams {
  dateFrom?: string;
  dateTo?: string;
  year?: number;
  month?: number;
}

export function useOfficeExpenses(params: UseOfficeExpensesParams = {}) {
  return useQuery({
    queryKey: ['office_expenses', params],
    queryFn: async () => {
      let query = supabase
        .from('office_expenses')
        .select('*')
        .order('date', { ascending: false });

      if (params.dateFrom) {
        query = query.gte('date', params.dateFrom);
      }
      if (params.dateTo) {
        query = query.lte('date', params.dateTo);
      }
      if (params.year) {
        const startDate = `${params.year}-01-01`;
        const endDate = `${params.year}-12-31`;
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OfficeExpense[];
    },
  });
}

export function useCreateOfficeExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<OfficeExpense, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('office_expenses')
        .insert(expense)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office_expenses'] });
      toast({ title: 'Success', description: 'Expense added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteOfficeExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('office_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office_expenses'] });
      toast({ title: 'Success', description: 'Expense deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
