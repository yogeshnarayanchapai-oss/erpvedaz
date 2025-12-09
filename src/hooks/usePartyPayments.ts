import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface PartyPayment {
  id: string;
  party_id: string;
  date: string;
  amount: number;
  payment_type: 'RECEIVED' | 'PAID';
  method: 'CASH' | 'BANK' | 'OTHER';
  bank_account_id: string | null;
  reference: string | null;
  note: string | null;
  store_id: string | null;
  created_at: string;
  accounts?: { id: string; name: string };
}

export function usePartyPayments(partyId: string) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['party-payments', storeId, partyId],
    queryFn: async () => {
      let query = supabase
        .from('party_payments')
        .select(`
          *,
          accounts:bank_account_id(id, name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PartyPayment[];
    },
    enabled: !!partyId && !!storeId,
  });
}

export function useCreatePartyPayment() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (payment: Omit<PartyPayment, 'id' | 'created_at' | 'accounts' | 'store_id'>) => {
      // Ensure bank_account_id is null if method is CASH (not bank)
      const accountId = payment.method === 'BANK' && payment.bank_account_id ? payment.bank_account_id : null;
      
      const paymentData = {
        ...payment,
        store_id: storeId,
        bank_account_id: accountId,
      };
      
      const { data: paymentResult, error: paymentError } = await supabase
        .from('party_payments')
        .insert(paymentData)
        .select()
        .single();
      if (paymentError) throw paymentError;

      // Get party name for transaction description
      const { data: party } = await supabase
        .from('parties')
        .select('name')
        .eq('id', payment.party_id)
        .single();
      
      const partyName = party?.name || 'Party';
      const isReceived = payment.payment_type === 'RECEIVED';
      const transactionType = isReceived ? 'income' : 'expense';
      const description = isReceived 
        ? `Payment received from ${partyName}` 
        : `Payment made to ${partyName}`;

      // Create corresponding transaction entry (marked as cleared since payment is recorded)
      const { data: transactionResult, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          date: payment.date,
          type: transactionType,
          amount: payment.amount,
          account_id: accountId,
          party_id: payment.party_id,
          description: description,
          note: payment.note,
          reference_no: payment.reference,
          is_cleared: true,
          store_id: storeId,
          currency: 'NPR',
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Failed to create transaction:', transactionError);
      }

      // Update account balance if an account was selected
      if (accountId) {
        const { data: account } = await supabase
          .from('accounts')
          .select('current_balance')
          .eq('id', accountId)
          .single();
        
        if (account) {
          const newBalance = isReceived 
            ? account.current_balance + payment.amount 
            : account.current_balance - payment.amount;
          
          await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', accountId);
        }
      }
      
      return paymentResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-payments'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}
