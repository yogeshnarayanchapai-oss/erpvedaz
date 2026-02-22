import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface PartyTransaction {
  id: string;
  party_id: string;
  date: string;
  product_id: string | null;
  warehouse_id: string | null;
  qty: number | null;
  rate: number | null;
  amount: number;
  direction: 'RECEIVABLE' | 'PAYABLE';
  source: 'STOCK_IN' | 'WHOLESALE_OUT' | 'ADJUSTMENT' | 'INCOME' | 'EXPENSE' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'SALE_IN' | 'SALE_OUT';
  reference: string | null;
  remarks: string | null;
  created_at: string;
  products?: { id: string; name: string };
  warehouses?: { id: string; name: string };
}

export function usePartyTransactions(partyId: string, filters?: { startDate?: string; endDate?: string; productId?: string }) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['party-transactions', storeId, partyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('party_transactions')
        .select(`
          *,
          products:product_id(id, name),
          warehouses:warehouse_id(id, name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PartyTransaction[];
    },
    enabled: !!partyId && !!storeId,
  });
}

export function useCreatePartyTransaction() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (transaction: Omit<PartyTransaction, 'id' | 'created_at' | 'products' | 'warehouses'>) => {
      const { data, error } = await supabase
        .from('party_transactions')
        .insert({ ...transaction, store_id: storeId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      toast.success('Transaction recorded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create transaction: ${error.message}`);
    },
  });
}

export function useDeletePartyTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactionId: string) => {
      // First get the transaction to find its transaction_code
      const { data: partyTrans, error: fetchError } = await supabase
        .from('party_transactions')
        .select('transaction_code')
        .eq('id', transactionId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      const transactionCode = partyTrans?.transaction_code;
      
      // Delete from party_transactions table
      const { error } = await supabase
        .from('party_transactions')
        .delete()
        .eq('id', transactionId);
      if (error) throw error;
      
      // Also delete linked transaction from transactions table if transaction_code exists
      if (transactionCode) {
        const { error: transDeleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('transaction_code', transactionCode);
        
        if (transDeleteError) {
          console.warn('Failed to delete linked transaction:', transDeleteError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pending-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payables'] });
      toast.success('Transaction deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete transaction: ${error.message}`);
    },
  });
}
