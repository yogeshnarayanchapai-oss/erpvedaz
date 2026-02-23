import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';
import { useIsModuleStoreWise } from './useModuleStoreSettings';

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
  account?: { id: string; name: string } | null;
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
          account:account_id(id, name),
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
        description: `New ${typeLabel} ${data.transaction_code} created - Rs. ${transaction.amount.toLocaleString()} (${transaction.is_cleared ? 'Cleared' : 'Pending'})`,
        amount: transaction.amount,
        store_id: storeId,
        performed_by: (await supabase.auth.getUser()).data.user?.id || null,
      });

      // Account balance is handled by database trigger - only affects balance when is_cleared = true
      
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
      queryClient.invalidateQueries({ queryKey: ['pending-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-party-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-party-payables'] });
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
      queryClient.invalidateQueries({ queryKey: ['pending-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-party-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-party-payables'] });
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
    mutationFn: async ({ ids, accountId }: { ids: string[]; accountId?: string }) => {
      // If accountId provided, update the transaction account and mark as cleared
      if (accountId) {
        const { error } = await supabase
          .from('transactions')
          .update({ is_cleared: true, account_id: accountId })
          .in('id', ids);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .update({ is_cleared: true })
          .in('id', ids);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payables'] });
      toast.success('Transactions marked as cleared');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark transactions: ${error.message}`);
    },
  });
}

// Pending receivables WITHOUT party (for Pending Income tab)
export function usePendingReceivables() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['pending-receivables', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          from_account:from_account_id(id, name),
          to_account:to_account_id(id, name),
          transaction_categories:category_id(id, name),
          parties:party_id(id, name)
        `)
        .eq('type', 'income')
        .eq('is_cleared', false)
        .eq('store_id', storeId)
        .is('party_id', null)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as any as Transaction[];
    },
    enabled: !!storeId,
  });
}

// Pending receivables WITH party (for Party Receivables tab)
export function usePendingPartyReceivables() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['pending-party-receivables', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          from_account:from_account_id(id, name),
          to_account:to_account_id(id, name),
          transaction_categories:category_id(id, name),
          parties:party_id(id, name)
        `)
        .eq('type', 'income')
        .eq('is_cleared', false)
        .eq('store_id', storeId)
        .not('party_id', 'is', null)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as any as Transaction[];
    },
    enabled: !!storeId,
  });
}

// Pending payables WITHOUT party (for Pending Expenses tab)
export function usePendingPayables() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['pending-payables', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          from_account:from_account_id(id, name),
          to_account:to_account_id(id, name),
          transaction_categories:category_id(id, name),
          parties:party_id(id, name)
        `)
        .eq('type', 'expense')
        .eq('is_cleared', false)
        .eq('store_id', storeId)
        .is('party_id', null)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as any as Transaction[];
    },
    enabled: !!storeId,
  });
}

// Pending payables WITH party (for Party Payables tab)
export function usePendingPartyPayables() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['pending-party-payables', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          from_account:from_account_id(id, name),
          to_account:to_account_id(id, name),
          transaction_categories:category_id(id, name),
          parties:party_id(id, name)
        `)
        .eq('type', 'expense')
        .eq('is_cleared', false)
        .eq('store_id', storeId)
        .not('party_id', 'is', null)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as any as Transaction[];
    },
    enabled: !!storeId,
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First get the transaction so we can clean up any linked records and log activity
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('transaction_code, amount, party_id, date, account_id, description, type, store_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const transactionCode = transaction?.transaction_code as string | undefined;

      // Delete from transactions table
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log activity for deleted transaction
      if (transaction) {
        const typeLabel = transaction.type === 'income' ? 'Deposit' : transaction.type === 'expense' ? 'Expense' : 'Transfer';
        await supabase.from('accounting_activity_logs').insert({
          entity_type: 'transaction',
          entity_id: id,
          action_type: 'DELETE',
          description: `${typeLabel} ${transactionCode || ''} deleted - Rs. ${(transaction.amount || 0).toLocaleString()}`,
          amount: transaction.amount,
          store_id: transaction.store_id || storeId,
          performed_by: (await supabase.auth.getUser()).data.user?.id || null,
          old_values: transaction,
        });
      }

      // Also delete linked party_transaction if transaction_code exists
      if (transactionCode) {
        const { error: partyDeleteError } = await supabase
          .from('party_transactions')
          .delete()
          .eq('transaction_code', transactionCode);

        if (partyDeleteError) {
          console.warn('Failed to delete linked party_transaction:', partyDeleteError);
        }
      }

      // If this transaction came from a party payment, also delete matching party_payments
      if (
        transaction &&
        transaction.party_id &&
        transaction.account_id &&
        transaction.amount &&
        transaction.date &&
        transaction.description
      ) {
        const desc = transaction.description as string;
        const isPaymentReceived = desc.startsWith('Payment received from');
        const isPaymentMade = desc.startsWith('Payment made to');

        if (isPaymentReceived || isPaymentMade) {
          const paymentType = isPaymentReceived ? 'RECEIVED' : 'PAID';

          const { data: payments, error: paymentsError } = await supabase
            .from('party_payments')
            .select('id')
            .eq('party_id', transaction.party_id)
            .eq('bank_account_id', transaction.account_id)
            .eq('amount', transaction.amount)
            .eq('payment_type', paymentType)
            .eq('date', transaction.date);

          if (paymentsError) {
            console.warn('Failed to load linked party_payments for deletion:', paymentsError);
          } else if (payments && payments.length > 0) {
            const ids = payments.map((p: any) => p.id as string);
            const { error: deletePaymentsError } = await supabase
              .from('party_payments')
              .delete()
              .in('id', ids);

            if (deletePaymentsError) {
              console.warn('Failed to delete linked party_payments:', deletePaymentsError);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['pending-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-party-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['pending-party-payables'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      toast.success('Transaction deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete transaction: ${error.message}`);
    },
  });
}
