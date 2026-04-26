import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'SALES_IN' | 'SALES_OUT' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'TRANSFER' | 'ADJUSTMENT_PLUS' | 'ADJUSTMENT_MINUS';

export type ApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED';

export interface Transaction {
  id: string;
  date: string;
  type: string; // legacy field
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  from_account_id: string | null;
  to_account_id: string | null;
  account_id: string | null;
  category_id: string | null;
  party_id: string | null;
  order_id: string | null;
  reference_no: string | null;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  description: string | null;
  is_cleared: boolean;
  created_by: string | null;
  store_id: string | null;
  transaction_code: string | null;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
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
  type?: string; // now filters on transaction_type
  accountId?: string;
  partyId?: string;
  categoryId?: string;
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
        query = query.eq('transaction_type', filters.type);
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
    mutationFn: async (transaction: {
      date: string;
      transaction_type: TransactionType;
      amount: number;
      currency?: string;
      account_id?: string | null;
      from_account_id?: string | null;
      to_account_id?: string | null;
      category_id?: string | null;
      party_id?: string | null;
      order_id?: string | null;
      reference_no?: string | null;
      note?: string | null;
      description?: string | null;
      created_by?: string | null;
    }) => {
      // ===== Insufficient funds check for outflow transactions =====
      // Outflow types deduct money from the source account. Block when
      // the account balance is negative or less than the requested amount.
      const outflowFromAccount: TransactionType[] = ['EXPENSE', 'PAYMENT_OUT', 'SALES_IN', 'ADJUSTMENT_MINUS'];
      const isOutflow = outflowFromAccount.includes(transaction.transaction_type);
      const sourceAccountId = transaction.transaction_type === 'TRANSFER'
        ? transaction.from_account_id
        : (isOutflow ? transaction.account_id : null);

      if (sourceAccountId && transaction.amount > 0) {
        const { data: acct, error: acctErr } = await supabase
          .from('accounts')
          .select('id, name, current_balance')
          .eq('id', sourceAccountId)
          .single();
        if (acctErr) throw acctErr;
        const balance = Number(acct?.current_balance ?? 0);
        if (balance <= 0 || balance < transaction.amount) {
          throw new Error(
            `Your account "${acct?.name ?? ''}" has insufficient funds (Available: NPR ${Math.round(balance).toLocaleString()})`
          );
        }
      }

      // Map transaction_type to legacy type field
      const legacyType = transaction.transaction_type === 'TRANSFER' ? 'transfer' 
        : ['INCOME', 'SALES_OUT', 'PAYMENT_IN', 'ADJUSTMENT_PLUS'].includes(transaction.transaction_type) ? 'income' 
        : 'expense';

      const { data, error } = await supabase
        .from('transactions')
        .insert({ 
          ...transaction, 
          type: legacyType,
          currency: transaction.currency || 'NPR',
          is_cleared: true, // always posted immediately
          store_id: storeId 
        } as any)
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      const typeLabel = transaction.transaction_type;
      await supabase.from('accounting_activity_logs').insert({
        entity_type: 'transaction',
        entity_id: data.id,
        action_type: 'CREATE',
        description: `New ${typeLabel} ${(data as any).transaction_code} created - Rs. ${transaction.amount.toLocaleString()}`,
        amount: transaction.amount,
        store_id: storeId,
        performed_by: (await supabase.auth.getUser()).data.user?.id || null,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
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
      const { data: oldData } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('transactions')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      if (oldData) {
        const typeLabel = (data as any).transaction_type || (data as any).type;
        await supabase.from('accounting_activity_logs').insert({
          entity_type: 'transaction',
          entity_id: data.id,
          action_type: 'UPDATE',
          description: `${typeLabel} ${(data as any).transaction_code} edited`,
          amount: (data as any).amount,
          store_id: (data as any).store_id,
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
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      toast.success('Transaction updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update transaction: ${error.message}`);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log activity
      if (transaction) {
        const typeLabel = (transaction as any).transaction_type || (transaction as any).type;
        await supabase.from('accounting_activity_logs').insert({
          entity_type: 'transaction',
          entity_id: id,
          action_type: 'DELETE',
          description: `${typeLabel} ${(transaction as any).transaction_code || ''} deleted - Rs. ${((transaction as any).amount || 0).toLocaleString()}`,
          amount: (transaction as any).amount,
          store_id: (transaction as any).store_id || storeId,
          performed_by: (await supabase.auth.getUser()).data.user?.id || null,
          old_values: transaction,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      toast.success('Transaction deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete transaction: ${error.message}`);
    },
  });
}

export function useUpdateApprovalStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: ApprovalStatus; note?: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      
      // Get current status for history
      const { data: current } = await supabase
        .from('transactions')
        .select('approval_status')
        .eq('id', id)
        .single();
      
      const fromStatus = (current as any)?.approval_status || 'NONE';
      
      // Update transaction
      const updateData: any = { approval_status: status };
      if (status === 'APPROVED') {
        updateData.approved_by = userId;
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.approved_by = null;
        updateData.approved_at = null;
      }
      
      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
      
      // Log history
      await supabase.from('transaction_approval_history').insert({
        transaction_id: id,
        from_status: fromStatus,
        to_status: status,
        changed_by: userId,
        note: note || null,
      });
      
      return { id, status };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movement-approvals'] });
      toast.success(vars.status === 'APPROVED' ? 'Transaction approved' : 'Transaction set to pending');
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });
}

export function useApprovalHistory(transactionId?: string) {
  return useQuery({
    queryKey: ['approval-history', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_approval_history')
        .select('*')
        .eq('transaction_id', transactionId!)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!transactionId,
  });
}
