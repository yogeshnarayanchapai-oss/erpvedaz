import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  created_at: string;
  accounts?: { id: string; name: string };
}

export function usePartyPayments(partyId: string) {
  return useQuery({
    queryKey: ['party-payments', partyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('party_payments')
        .select(`
          *,
          accounts:bank_account_id(id, name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as PartyPayment[];
    },
    enabled: !!partyId,
  });
}

export function useCreatePartyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Omit<PartyPayment, 'id' | 'created_at' | 'accounts'>) => {
      // Ensure bank_account_id is null if method is CASH (not bank)
      const paymentData = {
        ...payment,
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
