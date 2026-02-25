import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartyStatementEntry {
  date: string;
  type: 'TRANSACTION';
  particulars: string;
  qty: number | null;
  rate: number | null;
  debit: number;
  credit: number;
  balance: number;
  remarks: string | null;
  id: string;
  transaction_code?: string;
  transaction_type?: string;
}

export function usePartyStatement(partyId: string, filters?: { startDate?: string; endDate?: string; productId?: string }) {
  return useQuery({
    queryKey: ['party-statement', partyId, filters],
    queryFn: async () => {
      if (!partyId) return [];

      // Fetch party details for opening balance
      const { data: party } = await supabase
        .from('parties')
        .select('*')
        .eq('id', partyId)
        .single();

      // Fetch ALL transactions with this party_id
      let query = supabase
        .from('transactions')
        .select(`
          *,
          account:account_id(id, name),
          categories:category_id(name)
        `)
        .eq('party_id', partyId);

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

      const entries: PartyStatementEntry[] = [];

      // Add opening balance entry
      if (party && party.opening_balance > 0) {
        entries.push({
          date: party.created_at.split('T')[0],
          type: 'TRANSACTION',
          particulars: 'Opening Balance',
          qty: null,
          rate: null,
          debit: party.opening_balance_type === 'PAYABLE' ? party.opening_balance : 0,
          credit: party.opening_balance_type === 'RECEIVABLE' ? party.opening_balance : 0,
          balance: 0,
          remarks: 'Opening Balance',
          id: 'opening-balance',
        });
      }

      // Map transactions to ledger entries with debit/credit logic
      transactions?.forEach(t => {
        const txType = (t as any).transaction_type || '';
        const accountName = (t as any).account?.name || '';
        const categoryName = (t as any).categories?.name || '';
        
        let debit = 0;
        let credit = 0;
        let particulars = t.description || txType;

        // Debit/Credit mapping per spec:
        // SALES_OUT → Credit (they owe us)
        // PAYMENT_IN → Debit (they paid us, reduces what they owe)
        // SALES_IN → Debit (we owe them / purchase)
        // PAYMENT_OUT → Credit (we paid them, reduces what we owe)
        // INCOME with party → Credit
        // EXPENSE with party → Debit
        switch (txType) {
          case 'SALES_OUT':
            credit = t.amount;
            break;
          case 'PAYMENT_IN':
            debit = t.amount;
            if (accountName) particulars += ` (${accountName})`;
            break;
          case 'SALES_IN':
            debit = t.amount;
            break;
          case 'PAYMENT_OUT':
            credit = t.amount;
            if (accountName) particulars += ` (${accountName})`;
            break;
          case 'INCOME':
            credit = t.amount;
            if (categoryName) particulars += ` - ${categoryName}`;
            break;
          case 'EXPENSE':
            debit = t.amount;
            if (categoryName) particulars += ` - ${categoryName}`;
            break;
          default:
            // Fallback for legacy data
            if (t.type === 'income') credit = t.amount;
            else debit = t.amount;
        }

        entries.push({
          date: t.date,
          type: 'TRANSACTION',
          particulars,
          qty: null,
          rate: null,
          debit,
          credit,
          balance: 0,
          remarks: t.note,
          id: t.id,
          transaction_code: t.transaction_code,
          transaction_type: txType,
        });
      });

      // Sort by date ascending then transaction_code for running balance
      entries.sort((a, b) => {
        if (a.id === 'opening-balance') return -1;
        if (b.id === 'opening-balance') return 1;
        
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        
        const getCodeNum = (code?: string) => {
          if (!code) return 0;
          const match = code.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        return getCodeNum(a.transaction_code) - getCodeNum(b.transaction_code);
      });

      // Calculate running balance: Credit - Debit
      // > 0 = Receivable (party owes us), < 0 = Payable (we owe party)
      let runningBalance = 0;
      entries.forEach(entry => {
        runningBalance += entry.credit - entry.debit;
        entry.balance = runningBalance;
      });

      // Reverse for display (newest first)
      entries.reverse();

      return entries;
    },
    enabled: !!partyId,
  });
}
