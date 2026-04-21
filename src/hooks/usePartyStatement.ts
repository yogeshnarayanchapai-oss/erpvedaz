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
  stock_quantity?: number | null;
  stock_rate?: number | null;
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

      // Carry-forward: total of all transactions BEFORE the filter window so the
      // running balance always reflects the party's true total balance, not just
      // the filtered slice.
      let carryForward = 0;
      if (filters?.startDate) {
        const { data: priorTx } = await supabase
          .from('transactions')
          .select('amount, transaction_type, type')
          .eq('party_id', partyId)
          .lt('date', filters.startDate);
        (priorTx || []).forEach((t: any) => {
          const txType = t.transaction_type || '';
          let d = 0, c = 0;
          switch (txType) {
            case 'EXPENSE':
            case 'PAYMENT_OUT':
            case 'SALES_OUT':
              d = t.amount; break;
            case 'INCOME':
            case 'PAYMENT_IN':
            case 'SALES_IN':
              c = t.amount; break;
            default:
              if (t.type === 'expense') d = t.amount;
              else c = t.amount;
          }
          carryForward += d - c;
        });
        if (party && party.opening_balance > 0) {
          carryForward += party.opening_balance_type === 'RECEIVABLE'
            ? party.opening_balance
            : -party.opening_balance;
        }
      }

      // Collect stock movement reference IDs
      const stockRefIds = (transactions || [])
        .filter(t => t.reference_type === 'stock_movement' && t.reference_id)
        .map(t => t.reference_id as string);

      // Fetch stock movement quantities
      let stockQuantities: Record<string, number> = {};
      let stockRates: Record<string, number | null> = {};
      if (stockRefIds.length > 0) {
        const { data: stockMovements } = await supabase
          .from('stock_movements')
          .select('id, qty, unit_price')
          .in('id', stockRefIds);
        if (stockMovements) {
          stockMovements.forEach(sm => {
            stockQuantities[sm.id] = sm.qty;
            stockRates[sm.id] = sm.unit_price;
          });
        }
      }

      const entries: PartyStatementEntry[] = [];

      // Add opening balance entry
      if (party && party.opening_balance > 0) {
        entries.push({
          date: party.created_at.split('T')[0],
          type: 'TRANSACTION',
          particulars: 'Opening Balance',
          qty: null,
          rate: null,
          debit: party.opening_balance_type === 'RECEIVABLE' ? party.opening_balance : 0,
          credit: party.opening_balance_type === 'PAYABLE' ? party.opening_balance : 0,
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

        switch (txType) {
          case 'EXPENSE':
            debit = t.amount;
            if (categoryName) particulars += ` - ${categoryName}`;
            break;
          case 'PAYMENT_OUT':
            debit = t.amount;
            if (accountName) particulars += ` (${accountName})`;
            break;
          case 'SALES_OUT':
            debit = t.amount;
            break;
          case 'INCOME':
            credit = t.amount;
            if (categoryName) particulars += ` - ${categoryName}`;
            break;
          case 'PAYMENT_IN':
            credit = t.amount;
            if (accountName) particulars += ` (${accountName})`;
            break;
          case 'SALES_IN':
            credit = t.amount;
            break;
          default:
            if (t.type === 'expense') debit = t.amount;
            else credit = t.amount;
        }

        // Get stock quantity if from stock movement
        const stockQty = t.reference_type === 'stock_movement' && t.reference_id
          ? stockQuantities[t.reference_id] || null
          : null;
        const stockRate = t.reference_type === 'stock_movement' && t.reference_id
          ? stockRates[t.reference_id] || null
          : null;

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
          stock_quantity: stockQty,
          stock_rate: stockRate,
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

      // Calculate running balance: Debit - Credit (DR = Receivable, CR = Payable)
      // > 0 = Net Receivable, < 0 = Net Payable
      let runningBalance = 0;
      entries.forEach(entry => {
        runningBalance += entry.debit - entry.credit;
        entry.balance = runningBalance;
      });

      // Reverse for display (newest first)
      entries.reverse();

      return entries;
    },
    enabled: !!partyId,
  });
}
