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

export function useAccountingDashboardMetrics(startDate: string, endDate: string) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['dashboard-metrics', storeId, startDate, endDate],
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
        let assetTxQuery = supabase
          .from('transactions')
          .select('amount')
          .in('category_id', assetCategoryIds);
        if (storeId) assetTxQuery = assetTxQuery.eq('store_id', storeId);
        const { data: assetTransactions } = await assetTxQuery;
        totalAssetItems = assetTransactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      }
      const totalAssets = totalAssetItems + totalAccountBalance;

      // Income for period using transaction_type
      let incomeQuery = supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('transaction_type', 'INCOME')
        .gte('date', startDate)
        .lte('date', endDate);
      if (storeId) incomeQuery = incomeQuery.eq('store_id', storeId);
      const { data: incomeData } = await incomeQuery;
      const totalIncome = incomeData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Expense for period using transaction_type
      let expenseQuery = supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('transaction_type', 'EXPENSE')
        .gte('date', startDate)
        .lte('date', endDate);
      if (storeId) expenseQuery = expenseQuery.eq('store_id', storeId);
      const { data: expenseData } = await expenseQuery;
      const totalExpense = expenseData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Receivable/Payable: compute per-party balance from transactions where party_id IS NOT NULL
      let partyTxQuery = supabase
        .from('transactions')
        .select('party_id, transaction_type, amount');
      if (storeId) partyTxQuery = partyTxQuery.eq('store_id', storeId);
      partyTxQuery = partyTxQuery.not('party_id', 'is', null);
      const { data: partyTxns } = await partyTxQuery;

      // Calculate per-party balance
      const partyBalances = new Map<string, number>();
      partyTxns?.forEach(tx => {
        const pid = tx.party_id as string;
        const current = partyBalances.get(pid) || 0;
        const txType = (tx as any).transaction_type || '';
        let creditAmount = 0;
        let debitAmount = 0;

        switch (txType) {
          case 'SALES_OUT': creditAmount = tx.amount; break;
          case 'PAYMENT_IN': debitAmount = tx.amount; break;
          case 'SALES_IN': debitAmount = tx.amount; break;
          case 'PAYMENT_OUT': creditAmount = tx.amount; break;
          case 'INCOME': creditAmount = tx.amount; break;
          case 'EXPENSE': debitAmount = tx.amount; break;
        }
        partyBalances.set(pid, current + creditAmount - debitAmount);
      });

      let receivableOutstanding = 0;
      let payableOutstanding = 0;
      partyBalances.forEach(balance => {
        if (balance > 0) receivableOutstanding += balance;
        else payableOutstanding += Math.abs(balance);
      });

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
