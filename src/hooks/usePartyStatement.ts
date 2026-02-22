import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartyStatementEntry {
  date: string;
  type: 'TRANSACTION' | 'PAYMENT' | 'PENDING';
  particulars: string;
  qty: number | null;
  rate: number | null;
  debit: number;
  credit: number;
  balance: number;
  remarks: string | null;
  id: string;
  transaction_code?: string;
  is_pending?: boolean;
  is_settled?: boolean;
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

      // Fetch transactions (including settled ones)
      let transQuery = supabase
        .from('party_transactions')
        .select(`
          *,
          products:product_id(name),
          warehouses:warehouse_id(name),
          transaction_code
        `)
        .eq('party_id', partyId);

      if (filters?.startDate) {
        transQuery = transQuery.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        transQuery = transQuery.lte('date', filters.endDate);
      }
      if (filters?.productId) {
        transQuery = transQuery.eq('product_id', filters.productId);
      }

      const { data: transactions, error: transError } = await transQuery;
      if (transError) throw transError;

      // Fetch payments
      let payQuery = supabase
        .from('party_payments')
        .select(`
          *,
          accounts:bank_account_id(id, name)
        `)
        .eq('party_id', partyId);

      if (filters?.startDate) {
        payQuery = payQuery.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        payQuery = payQuery.lte('date', filters.endDate);
      }

      const { data: payments, error: payError } = await payQuery;
      if (payError) throw payError;

      // Fetch all transactions from transactions table (both pending and cleared with party_id)
      let partyTransactionsQuery = supabase
        .from('transactions')
        .select(`
          *,
          categories:category_id(name)
        `)
        .eq('party_id', partyId);

      if (filters?.startDate) {
        partyTransactionsQuery = partyTransactionsQuery.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        partyTransactionsQuery = partyTransactionsQuery.lte('date', filters.endDate);
      }

      const { data: partyManualTransactions, error: partyTransError } = await partyTransactionsQuery;
      if (partyTransError) throw partyTransError;

      // Fetch account names for cleared transactions
      const accountIds = (partyManualTransactions || [])
        .filter(t => t.is_cleared && t.account_id)
        .map(t => t.account_id);
      
      let accountsMap: Record<string, string> = {};
      if (accountIds.length > 0) {
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, name')
          .in('id', accountIds);
        
        accountsData?.forEach(a => {
          accountsMap[a.id] = a.name;
        });
      }

      // Combine and sort entries
      const entries: PartyStatementEntry[] = [];

      // Add opening balance entry
      if (party && party.opening_balance > 0) {
        entries.push({
          date: party.created_at.split('T')[0],
          type: 'TRANSACTION' as const,
          particulars: 'Opening Balance',
          qty: null,
          rate: null,
          // Credit = receivable (party owes us), Debit = payable (we owe party)
          debit: party.opening_balance_type === 'PAYABLE' ? party.opening_balance : 0,
          credit: party.opening_balance_type === 'RECEIVABLE' ? party.opening_balance : 0,
          balance: 0,
          remarks: 'Opening Balance',
          id: 'opening-balance',
        });
      }

      // Add transactions from party_transactions (including settled)
      transactions?.forEach(t => {
        const productName = t.products?.name || 'Unknown Product';
        const warehouseName = t.warehouses?.name || '';
        
        entries.push({
          date: t.date,
          type: 'TRANSACTION' as const,
          particulars: `${t.source} - ${productName}${warehouseName ? ` (${warehouseName})` : ''}`,
          qty: t.qty,
          rate: t.rate,
          // Credit = receivable (party owes us), Debit = payable (we owe party)
          debit: t.direction === 'PAYABLE' ? t.amount : 0,
          credit: t.direction === 'RECEIVABLE' ? t.amount : 0,
          balance: 0,
          remarks: t.remarks,
          id: t.id,
          transaction_code: t.transaction_code,
          is_settled: t.is_settled === true,
        });
      });

      // Add payments
      payments?.forEach(p => {
        const accountName = p.accounts?.name || '';
        const methodStr = p.method === 'BANK' && accountName ? `${p.method} (${accountName})` : p.method;
        
        entries.push({
          date: p.date,
          type: 'PAYMENT' as const,
          particulars: `Payment ${p.payment_type === 'RECEIVED' ? 'Received' : 'Paid'} - ${methodStr}`,
          qty: null,
          rate: null,
          debit: p.payment_type === 'PAID' ? p.amount : 0,
          credit: p.payment_type === 'RECEIVED' ? p.amount : 0,
          balance: 0,
          remarks: p.note,
          id: p.id,
        });
      });

      // Add manual transactions from transactions table (both pending and cleared)
      // EXCLUDE transactions auto-created from party_payments to avoid duplicates
      partyManualTransactions?.forEach(t => {
        const desc = t.description || '';
        // Skip transactions that were auto-created from party_payments trigger
        if (desc.startsWith('Payment received from') || desc.startsWith('Payment made to')) {
          return;
        }
        
        const categoryName = t.categories?.name || '';
        const accountName = t.account_id ? accountsMap[t.account_id] || '' : '';
        const isIncome = t.type === 'income';
        const isPending = !t.is_cleared;
        
        entries.push({
          date: t.date,
          type: 'PENDING' as const,
          particulars: isPending 
            ? `[Pending] ${t.description}${categoryName ? ` - ${categoryName}` : ''}`
            : `${t.description}${categoryName ? ` - ${categoryName}` : ''}${accountName ? ` (${accountName})` : ''}`,
          qty: null,
          rate: null,
          // Income (received) = Credit, Expense (paid) = Debit
          debit: !isIncome ? t.amount : 0,
          credit: isIncome ? t.amount : 0,
          balance: 0,
          remarks: t.note,
          id: t.id,
          transaction_code: t.transaction_code,
          is_pending: isPending,
          is_settled: !isPending, // Cleared = settled
        });
      });

      // Sort by date ascending first for running balance calculation
      entries.sort((a, b) => {
        // Opening balance always at top (first entry chronologically)
        if (a.id === 'opening-balance') return -1;
        if (b.id === 'opening-balance') return 1;
        
        // Sort by date ascending
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        
        // Same date: sort by transaction_code ascending
        const getCodeNum = (code?: string) => {
          if (!code) return 0;
          const match = code.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        
        return getCodeNum(a.transaction_code) - getCodeNum(b.transaction_code);
      });

      // Calculate running balance chronologically
      // Only cleared (non-pending) transactions affect the running balance
      let runningBalance = 0;
      entries.forEach(entry => {
        const isPending = entry.is_pending === true || (entry.type === 'TRANSACTION' && entry.is_settled === false);
        if (!isPending) {
          // Credit = receivable (party owes us), Debit = payable (we owe party)
          runningBalance += entry.credit - entry.debit;
        }
        entry.balance = runningBalance;
      });

      // Now reverse to show newest first in display (but balance is correctly calculated)
      entries.reverse();

      return entries;
    },
    enabled: !!partyId,
  });
}