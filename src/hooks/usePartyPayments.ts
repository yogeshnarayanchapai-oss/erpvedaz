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
      const paymentData = {
        ...payment,
        store_id: storeId,
        // Set bank_account_id to null if method is CASH or OTHER, or if not provided
        bank_account_id: payment.method === 'BANK' && payment.bank_account_id ? payment.bank_account_id : null,
      };
      
      const { data, error } = await supabase
        .from('party_payments')
        .insert(paymentData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-payments'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}
