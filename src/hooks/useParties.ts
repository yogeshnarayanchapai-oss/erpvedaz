import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface Party {
  id: string;
  name: string;
  party_type: 'SUPPLIER' | 'WHOLESALER' | 'BOTH';
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_balance: number;
  opening_balance_type: 'RECEIVABLE' | 'PAYABLE' | null;
  remarks: string | null;
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendingTransaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string | null;
  note: string | null;
  transaction_code: string | null;
  account_id: string | null;
  account_name: string | null;
}

export interface PartyWithBalances extends Party {
  total_receivable: number;
  total_payable: number;
  total_received: number;
  total_paid: number;
  net_receivable: number;
  net_payable: number;
  current_balance: number;
  pending_receivable_transactions: PendingTransaction[];
  pending_payable_transactions: PendingTransaction[];
  pending_receivable_amount: number;
  pending_payable_amount: number;
}

export function useParties(partyType?: 'SUPPLIER' | 'WHOLESALER' | 'BOTH') {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['parties', storeId, partyType],
    queryFn: async () => {
      let query = supabase
        .from('parties')
        .select('*')
        .order('name');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (partyType) {
        query = query.or(`party_type.eq.${partyType},party_type.eq.BOTH`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Party[];
    },
    enabled: !!storeId,
  });
}

export function usePartiesWithBalances(partyType?: 'SUPPLIER' | 'WHOLESALER' | 'BOTH') {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['parties-balances', storeId, partyType],
    queryFn: async () => {
      let query = supabase
        .from('parties')
        .select('*')
        .order('name');

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (partyType) {
        query = query.or(`party_type.eq.${partyType},party_type.eq.BOTH`);
      }

      const { data: parties, error } = await query;
      if (error) throw error;

      if (!parties || parties.length === 0) return [];

      // Fetch transactions and payments for all parties
      const partyIds = parties.map(p => p.id);

      const [{ data: transactions }, { data: payments }, { data: pendingTxns }] = await Promise.all([
        supabase
          .from('party_transactions')
          .select('party_id, direction, amount')
          .in('party_id', partyIds),
        supabase
          .from('party_payments')
          .select('party_id, payment_type, amount')
          .in('party_id', partyIds),
        // Fetch pending transactions from transactions table where party_id is set
        supabase
          .from('transactions')
          .select('id, date, type, amount, description, note, transaction_code, party_id, account_id, accounts:account_id(name)')
          .in('party_id', partyIds)
          .eq('is_cleared', false),
      ]);

      // Calculate balances for each party
      const partiesWithBalances: PartyWithBalances[] = parties.map(party => {
        const typedParty = party as Party;
        const partyTransactions = transactions?.filter(t => t.party_id === party.id) || [];
        const partyPayments = payments?.filter(p => p.party_id === party.id) || [];
        const partyPendingTxns = pendingTxns?.filter(t => t.party_id === party.id) || [];

        const total_receivable = partyTransactions
          .filter(t => t.direction === 'RECEIVABLE')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const total_payable = partyTransactions
          .filter(t => t.direction === 'PAYABLE')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const total_received = partyPayments
          .filter(p => p.payment_type === 'RECEIVED')
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const total_paid = partyPayments
          .filter(p => p.payment_type === 'PAID')
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const net_receivable = total_receivable - total_received;
        const net_payable = total_payable - total_paid;

        // Pending transactions from manual entries
        const pending_receivable_transactions: PendingTransaction[] = partyPendingTxns
          .filter(t => t.type === 'income')
          .map(t => ({
            id: t.id,
            date: t.date,
            type: t.type,
            amount: t.amount,
            description: t.description,
            note: t.note,
            transaction_code: t.transaction_code,
            account_id: t.account_id,
            account_name: (t.accounts as any)?.name || null,
          }));

        const pending_payable_transactions: PendingTransaction[] = partyPendingTxns
          .filter(t => t.type === 'expense')
          .map(t => ({
            id: t.id,
            date: t.date,
            type: t.type,
            amount: t.amount,
            description: t.description,
            note: t.note,
            transaction_code: t.transaction_code,
            account_id: t.account_id,
            account_name: (t.accounts as any)?.name || null,
          }));

        const pending_receivable_amount = pending_receivable_transactions.reduce((sum, t) => sum + t.amount, 0);
        const pending_payable_amount = pending_payable_transactions.reduce((sum, t) => sum + t.amount, 0);

        // Current balance calculation
        let current_balance = 0;
        if (typedParty.opening_balance_type === 'RECEIVABLE') {
          current_balance = typedParty.opening_balance + net_receivable - net_payable;
        } else if (typedParty.opening_balance_type === 'PAYABLE') {
          current_balance = -typedParty.opening_balance + net_receivable - net_payable;
        } else {
          current_balance = net_receivable - net_payable;
        }

        return {
          ...typedParty,
          total_receivable,
          total_payable,
          total_received,
          total_paid,
          net_receivable,
          net_payable,
          current_balance,
          pending_receivable_transactions,
          pending_payable_transactions,
          pending_receivable_amount,
          pending_payable_amount,
        };
      });

      return partiesWithBalances;
    },
    enabled: !!storeId,
  });
}

export function useCreateParty() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (party: Omit<Party, 'id' | 'created_at' | 'updated_at' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('parties')
        .insert({ ...party, store_id: storeId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      toast.success('Party created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create party: ${error.message}`);
    },
  });
}

export function useUpdateParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...party }: Partial<Party> & { id: string }) => {
      const { data, error } = await supabase
        .from('parties')
        .update(party)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      toast.success('Party updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update party: ${error.message}`);
    },
  });
}

export function useDeleteParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      toast.success('Party deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete party: ${error.message}`);
    },
  });
}
