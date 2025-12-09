import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'transfer' | 'invoice_receipt' | 'bill_payment';
  amount: number;
  currency: string;
  from_account_id: string | null;
  to_account_id: string | null;
  account_id: string | null;
  category_id: string | null;
  party_id: string | null;
  order_id: string | null;
  reference_no: string | null;
  note: string | null;
  description: string | null;
  is_cleared: boolean;
  created_by: string | null;
  store_id: string | null;
  transaction_code: string | null;
  created_at: string;
  updated_at: string;
  from_account?: { id: string; name: string } | null;
  to_account?: { id: string; name: string } | null;
  transaction_categories?: { id: string; name: string } | null;
  parties?: { id: string; name: string } | null;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  accountId?: string;
  partyId?: string;
  categoryId?: string;
  isCleared?: boolean;
  search?: string;
}

export function useTransactions(filters?: TransactionFilters) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['transactions', storeId, filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          from_account:from_account_id(id, name),
          to_account:to_account_id(id, name),
          transaction_categories:category_id(id, name),
          parties:party_id(id, name)
        `)
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
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters?.accountId) {
        query = query.or(`account_id.eq.${filters.accountId},from_account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`);
      }
      if (filters?.partyId) {
        query = query.eq('party_id', filters.partyId);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.isCleared !== undefined) {
        query = query.eq('is_cleared', filters.isCleared);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as any as Transaction[];
    },
    enabled: !!storeId,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'accounts' | 'from_account' | 'to_account' | 'transaction_categories' | 'parties' | 'store_id' | 'transaction_code'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, store_id: storeId })
        .select()
        .single();
      
      if (error) throw error;

      // Log activity for new transaction
      const typeLabel = transaction.type === 'income' ? 'Deposit' : transaction.type === 'expense' ? 'Expense' : 'Transfer';
      await supabase.from('accounting_activity_logs').insert({
        entity_type: 'transaction',
        entity_id: data.id,
        action_type: 'CREATE',
        description: `New ${typeLabel} ${data.transaction_code} created - Rs. ${transaction.amount.toLocaleString()}`,
        amount: transaction.amount,
        store_id: storeId,
        performed_by: (await supabase.auth.getUser()).data.user?.id || null,
      });

      // Update account balances
      if (transaction.type === 'income' && transaction.account_id) {
        const { data: account } = await supabase.from('accounts').select('current_balance').eq('id', transaction.account_id).single();
        if (account) {
          await supabase.from('accounts').update({ current_balance: account.current_balance + transaction.amount }).eq('id', transaction.account_id);
        }
      } else if (transaction.type === 'expense' && transaction.account_id) {
        const { data: account } = await supabase.from('accounts').select('current_balance').eq('id', transaction.account_id).single();
        if (account) {
          await supabase.from('accounts').update({ current_balance: account.current_balance - transaction.amount }).eq('id', transaction.account_id);
        }
      } else if (transaction.type === 'transfer' && transaction.from_account_id && transaction.to_account_id) {
        const { data: fromAccount } = await supabase.from('accounts').select('current_balance').eq('id', transaction.from_account_id).single();
        const { data: toAccount } = await supabase.from('accounts').select('current_balance').eq('id', transaction.to_account_id).single();
        if (fromAccount && toAccount) {
          await supabase.from('accounts').update({ current_balance: fromAccount.current_balance - transaction.amount }).eq('id', transaction.from_account_id);
          await supabase.from('accounts').update({ current_balance: toAccount.current_balance + transaction.amount }).eq('id', transaction.to_account_id);
        }
      }

      // Create party payment to update receivables/payables when party is selected
      if (transaction.party_id) {
        const paymentType = transaction.type === 'income' ? 'RECEIVED' : 'PAID';
        const method = transaction.account_id ? 'BANK' : 'CASH';
        
        await supabase.from('party_payments').insert({
          party_id: transaction.party_id,
          date: transaction.date,
          amount: transaction.amount,
          payment_type: paymentType,
          method: method,
          bank_account_id: method === 'BANK' ? transaction.account_id : null,
          reference: transaction.reference_no,
          note: transaction.note || transaction.description,
          store_id: storeId,
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-payments'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-activity-logs'] });
      toast.success('Transaction created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create transaction: ${error.message}`);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      // Get old transaction for logging
      const { data: oldData } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Log activity for edited transaction
      if (oldData) {
        const typeLabel = data.type === 'income' ? 'Deposit' : data.type === 'expense' ? 'Expense' : 'Transfer';
        await supabase.from('accounting_activity_logs').insert({
          entity_type: 'transaction',
          entity_id: data.id,
          action_type: 'UPDATE',
          description: `${typeLabel} ${data.transaction_code} edited`,
          amount: data.amount,
          store_id: data.store_id,
          performed_by: (await supabase.auth.getUser()).data.user?.id || null,
          old_values: oldData,
          new_values: data,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-activity-logs'] });
      toast.success('Transaction updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update transaction: ${error.message}`);
    },
  });
}

export function useMarkTransactionsCleared() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('transactions')
        .update({ is_cleared: true })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transactions marked as cleared');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark transactions: ${error.message}`);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      toast.success('Transaction deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete transaction: ${error.message}`);
    },
  });
}
