import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface Party {
  id: string;
  name: string;
  party_type: 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_balance: number;
  opening_balance_type: 'RECEIVABLE' | 'PAYABLE' | 'BOTH' | null;
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
  transaction_count: number;
}

export function useParties(partyType?: 'SUPPLIER' | 'CUSTOMER' | 'BOTH') {
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

export function usePartiesWithBalances(partyType?: 'SUPPLIER' | 'CUSTOMER' | 'BOTH') {
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

      const partyIds = parties.map(p => p.id);

      // Fetch all transactions linked to these parties (new 7-type model)
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('party_id, transaction_type, amount')
        .in('party_id', partyIds)
        .limit(5000);
      
      if (txError) console.error('Failed to fetch party transactions:', txError);

      const partiesWithBalances: PartyWithBalances[] = parties.map(party => {
        const typedParty = party as Party;
        const partyTxns = transactions?.filter(t => t.party_id === party.id) || [];
        const transaction_count = partyTxns.length;

        // DR/CR logic:
        // DR (we gave/spent) = EXPENSE, PAYMENT_OUT, SALES_OUT → Receivable (they owe us)
        // CR (we received) = INCOME, PAYMENT_IN, SALES_IN → Payable (we owe them)
        let totalDebit = 0;
        let totalCredit = 0;

        partyTxns.forEach(t => {
          const txType = t.transaction_type || '';
          const amt = Number(t.amount) || 0;
          switch (txType) {
            case 'EXPENSE':
            case 'PAYMENT_OUT':
            case 'SALES_OUT':
              totalDebit += amt;
              break;
            case 'INCOME':
            case 'PAYMENT_IN':
            case 'SALES_IN':
              totalCredit += amt;
              break;
          }
        });

        // Opening balance
        let openingDebit = 0;
        let openingCredit = 0;
        if (typedParty.opening_balance > 0) {
          if (typedParty.opening_balance_type === 'RECEIVABLE') {
            openingDebit = typedParty.opening_balance;
          } else if (typedParty.opening_balance_type === 'PAYABLE') {
            openingCredit = typedParty.opening_balance;
          }
        }

        // Balance = Receivable - Payable. Positive = Net Receivable, Negative = Net Payable
        const totalReceivable = openingDebit + totalDebit;
        const totalPayable = openingCredit + totalCredit;
        const netBalance = totalReceivable - totalPayable;
        const net_receivable = Math.max(0, netBalance);
        const net_payable = Math.max(0, -netBalance);

        return {
          ...typedParty,
          total_receivable: totalCredit,
          total_payable: totalDebit,
          total_received: 0,
          total_paid: 0,
          net_receivable,
          net_payable,
          current_balance: netBalance,
          pending_receivable_transactions: [],
          pending_payable_transactions: [],
          pending_receivable_amount: 0,
          pending_payable_amount: 0,
          transaction_count,
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
