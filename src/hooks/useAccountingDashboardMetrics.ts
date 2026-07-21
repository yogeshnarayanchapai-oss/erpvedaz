import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface AccountBalance {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  currency: string;
}

export interface DashboardMetrics {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalAssetItems: number;
  totalIncome: number;
  totalExpense: number;
  profitLoss: number;
  receivableOutstanding: number;
  payableOutstanding: number;
  assetAccounts: AccountBalance[];
  liabilityAccounts: AccountBalance[];
}

const ASSET_TYPES = ['cash', 'bank', 'savings', 'investment', 'receivable', 'asset'];
const LIABILITY_TYPES = ['credit_card', 'loan', 'payable', 'liability'];
const ASSET_CATEGORY_NAMES = ['asset', 'assets', 'assests'];

async function fetchAllPaged<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) { console.error('paged fetch failed', error); break; }
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export function useAccountingDashboardMetrics(startDate: string, endDate: string) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['dashboard-metrics', storeId, startDate, endDate, 'v3'],
    queryFn: async () => {
      // Get all active accounts
      let accountsQuery = supabase
        .from('accounts')
        .select('id, name, type, current_balance, currency')
        .eq('is_active', true);
      if (storeId) accountsQuery = accountsQuery.eq('store_id', storeId);
      const { data: accounts } = await accountsQuery;
      
      const assetAccounts: AccountBalance[] = [];
      const liabilityAccounts: AccountBalance[] = [];
      
      accounts?.forEach(acc => {
        const accountType = acc.type?.toLowerCase() || '';
        if (LIABILITY_TYPES.some(t => accountType.includes(t))) {
          liabilityAccounts.push(acc as AccountBalance);
        } else {
          assetAccounts.push(acc as AccountBalance);
        }
      });
      
      const totalAccountBalance = assetAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      const liabilityAccountTotal = liabilityAccounts.reduce((sum, acc) => sum + Math.abs(acc.current_balance || 0), 0);

      // Asset items from transactions
      let categoryQuery = supabase
        .from('transaction_categories')
        .select('id, name')
        .eq('nature', 'expense');
      if (storeId) categoryQuery = categoryQuery.or(`store_id.is.null,store_id.eq.${storeId}`);
      const { data: categories } = await categoryQuery;
      
      const assetCategoryIds = categories
        ?.filter(cat => ASSET_CATEGORY_NAMES.some(name => 
          cat.name.toLowerCase().includes(name.toLowerCase())
        ))
        .map(cat => cat.id) || [];

      let totalAssetItems = 0;
      if (assetCategoryIds.length > 0) {
        const assetTransactions = await fetchAllPaged<{ amount: number }>((from, to) => {
          let q = supabase
            .from('transactions')
            .select('amount')
            .in('category_id', assetCategoryIds)
            .range(from, to);
          if (storeId) q = q.eq('store_id', storeId);
          return q;
        });
        totalAssetItems = assetTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      }
      const totalAssets = totalAssetItems + totalAccountBalance;

      // Income for period — INCOME + SALES_IN + PAYMENT_IN
      const incomeData = await fetchAllPaged<{ amount: number }>((from, to) => {
        let q = supabase
          .from('transactions')
          .select('amount')
          .in('transaction_type', ['INCOME', 'SALES_IN', 'PAYMENT_IN'])
          .gte('date', startDate)
          .lte('date', endDate)
          .range(from, to);
        if (storeId) q = q.eq('store_id', storeId);
        return q;
      });
      const totalIncome = incomeData.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Expense for period — EXPENSE + SALES_OUT + PAYMENT_OUT
      const expenseData = await fetchAllPaged<{ amount: number }>((from, to) => {
        let q = supabase
          .from('transactions')
          .select('amount')
          .in('transaction_type', ['EXPENSE', 'SALES_OUT', 'PAYMENT_OUT'])
          .gte('date', startDate)
          .lte('date', endDate)
          .range(from, to);
        if (storeId) q = q.eq('store_id', storeId);
        return q;
      });
      const totalExpense = expenseData.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Receivable / Payable — mirror usePartiesWithBalances exactly so the
      // dashboard cards match the Party Statement "All Parties" table.
      let partiesQuery = supabase
        .from('parties')
        .select('id, opening_balance, opening_balance_type');
      if (storeId) partiesQuery = partiesQuery.eq('store_id', storeId);
      const { data: parties } = await partiesQuery;

      let receivableOutstanding = 0;
      let payableOutstanding = 0;

      if (parties && parties.length > 0) {
        await Promise.all(parties.map(async (party: any) => {
          const partyTxns = await fetchAllPaged<{ transaction_type: string | null; type: string | null; amount: number | string | null }>((from, to) =>
            supabase
              .from('transactions')
              .select('transaction_type, type, amount')
              .eq('party_id', party.id)
              .range(from, to)
          );

          let totalDebit = 0;
          let totalCredit = 0;
          partyTxns.forEach((t: any) => {
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
              default:
                if (t.type === 'expense') totalDebit += amt;
                else if (t.type === 'income') totalCredit += amt;
            }
          });

          let openingDebit = 0;
          let openingCredit = 0;
          const ob = Number(party.opening_balance) || 0;
          if (ob > 0) {
            if (party.opening_balance_type === 'RECEIVABLE') openingDebit = ob;
            else if (party.opening_balance_type === 'PAYABLE') openingCredit = ob;
          }

          const netBalance = (openingDebit + totalDebit) - (openingCredit + totalCredit);
          if (netBalance > 0) receivableOutstanding += netBalance;
          else if (netBalance < 0) payableOutstanding += -netBalance;
        }));
      }

      const totalLiabilitiesCalc = (payableOutstanding - receivableOutstanding) + liabilityAccountTotal;
      const netWorth = totalAssets - liabilityAccountTotal + (receivableOutstanding - payableOutstanding);

      return {
        netWorth,
        totalAssets,
        totalLiabilities: totalLiabilitiesCalc,
        totalAssetItems,
        totalIncome,
        totalExpense,
        profitLoss: totalIncome - totalExpense,
        receivableOutstanding,
        payableOutstanding,
        assetAccounts,
        liabilityAccounts,
      } as DashboardMetrics;
    },
    enabled: !!storeId,
  });
}


export function useNetWorthOverTime() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['net-worth-over-time', storeId],
    queryFn: async () => {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = format(startOfMonth(date), 'yyyy-MM-dd');
        const end = format(endOfMonth(date), 'yyyy-MM-dd');
        
        let txQuery = supabase
          .from('transactions')
          .select('amount, transaction_type')
          .gte('date', start)
          .lte('date', end);
        if (storeId) txQuery = txQuery.eq('store_id', storeId);
        const { data: transactions } = await txQuery;
        
        const income = transactions?.filter(t => ['INCOME', 'SALES_OUT', 'PAYMENT_IN'].includes((t as any).transaction_type || ''))
          .reduce((sum, t) => sum + t.amount, 0) || 0;
        const expense = transactions?.filter(t => ['EXPENSE', 'SALES_IN', 'PAYMENT_OUT'].includes((t as any).transaction_type || ''))
          .reduce((sum, t) => sum + t.amount, 0) || 0;
        
        months.push({
          month: format(date, 'MMM'),
          value: income - expense,
        });
      }
      return months;
    },
    enabled: !!storeId,
  });
}

export function useExpenseByCategory(startDate: string, endDate: string) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['expense-by-category', storeId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`amount, transaction_categories:category_id(name)`)
        .eq('transaction_type', 'EXPENSE')
        .gte('date', startDate)
        .lte('date', endDate);
      if (storeId) query = query.eq('store_id', storeId);
      const { data } = await query;
      
      const categoryTotals = new Map<string, number>();
      data?.forEach(t => {
        const categoryName = (t as any).transaction_categories?.name || 'Uncategorized';
        categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + t.amount);
      });
      
      return Array.from(categoryTotals.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    },
    enabled: !!storeId,
  });
}
