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
      const { data: transactions } = await supabase
        .from('transactions')
        .select('party_id, transaction_type, amount')
        .in('party_id', partyIds);

      const partiesWithBalances: PartyWithBalances[] = parties.map(party => {
        const typedParty = party as Party;
        const partyTxns = transactions?.filter(t => t.party_id === party.id) || [];
        const transaction_count = partyTxns.length;

        // Use same debit/credit logic as usePartyStatement:
        // Credit (receivable): SALES_OUT, INCOME, PAYMENT_OUT
        // Debit (payable/paid): PAYMENT_IN, SALES_IN, EXPENSE
        let totalCredit = 0;
        let totalDebit = 0;

        partyTxns.forEach(t => {
          const txType = (t as any).transaction_type || '';
          switch (txType) {
            case 'SALES_OUT':
            case 'INCOME':
            case 'PAYMENT_OUT':
              totalCredit += t.amount || 0;
              break;
            case 'PAYMENT_IN':
            case 'SALES_IN':
            case 'EXPENSE':
              totalDebit += t.amount || 0;
              break;
          }
        });

        // Opening balance
        let openingCredit = 0;
        let openingDebit = 0;
        if (typedParty.opening_balance > 0) {
          if (typedParty.opening_balance_type === 'RECEIVABLE') {
            openingCredit = typedParty.opening_balance;
          } else if (typedParty.opening_balance_type === 'PAYABLE') {
            openingDebit = typedParty.opening_balance;
          }
        }

        const netBalance = (openingCredit + totalCredit) - (openingDebit + totalDebit);
        // Positive = receivable, Negative = payable
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
