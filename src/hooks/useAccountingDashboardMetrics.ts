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
  totalAssetItems: number; // Asset items from transactions
  totalIncome: number;
  totalExpense: number;
  profitLoss: number;
  receivableOutstanding: number;
  payableOutstanding: number;
  assetAccounts: AccountBalance[];
  liabilityAccounts: AccountBalance[];
}

// Account types that are considered assets
const ASSET_TYPES = ['cash', 'bank', 'savings', 'investment', 'receivable', 'asset'];
// Account types that are considered liabilities
const LIABILITY_TYPES = ['credit_card', 'loan', 'payable', 'liability'];
// Asset category names to look for (case-insensitive)
const ASSET_CATEGORY_NAMES = ['asset', 'assets', 'assests'];

export function useAccountingDashboardMetrics(startDate: string, endDate: string) {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['dashboard-metrics', storeId, startDate, endDate],
    queryFn: async () => {
      // Get all active accounts with their balances
      let accountsQuery = supabase
        .from('accounts')
        .select('id, name, type, current_balance, currency')
        .eq('is_active', true);
      
      if (storeId) {
        accountsQuery = accountsQuery.eq('store_id', storeId);
      }
      
      const { data: accounts } = await accountsQuery;
      
      // Separate assets and liabilities based on account type
      const assetAccounts: AccountBalance[] = [];
      const liabilityAccounts: AccountBalance[] = [];
      
      accounts?.forEach(acc => {
        const accountType = acc.type?.toLowerCase() || '';
        const balance = acc.current_balance || 0;
        
        if (LIABILITY_TYPES.some(t => accountType.includes(t))) {
          liabilityAccounts.push(acc as AccountBalance);
        } else {
          // Default to asset if not explicitly a liability
          assetAccounts.push(acc as AccountBalance);
        }
      });
      
      const totalAccountBalance = assetAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + Math.abs(acc.current_balance || 0), 0);

      // Get asset items from transactions (transactions with asset category)
      let categoryQuery = supabase
        .from('transaction_categories')
        .select('id, name')
        .eq('nature', 'expense');
      
      if (storeId) {
        categoryQuery = categoryQuery.or(`store_id.is.null,store_id.eq.${storeId}`);
      }

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

        if (storeId) {
          assetTxQuery = assetTxQuery.eq('store_id', storeId);
        }

        const { data: assetTransactions } = await assetTxQuery;
        totalAssetItems = assetTransactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      }

      // Net Worth = Asset Items (Saman) + Account Balances - Liabilities
      const totalAssets = totalAssetItems + totalAccountBalance;
      const netWorth = totalAssets - totalLiabilities;

      // Get income for period from transactions table
      let incomeQuery = supabase
        .from('transactions')
        .select('amount')
        .in('type', ['income', 'invoice_receipt'])
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (storeId) {
        incomeQuery = incomeQuery.eq('store_id', storeId);
      }
      
      const { data: incomeData } = await incomeQuery;
      const totalIncome = incomeData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Get expenses for period from transactions table
      let expenseQuery = supabase
        .from('transactions')
        .select('amount')
        .in('type', ['expense', 'bill_payment'])
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (storeId) {
        expenseQuery = expenseQuery.eq('store_id', storeId);
      }
      
      const { data: expenseData } = await expenseQuery;
      const totalExpense = expenseData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Get receivables and payables from party transactions and payments
      let partyTxQuery = supabase.from('party_transactions').select('party_id, direction, amount');
      let partyPayQuery = supabase.from('party_payments').select('party_id, payment_type, amount');
      
      if (storeId) {
        partyTxQuery = partyTxQuery.eq('store_id', storeId);
        partyPayQuery = partyPayQuery.eq('store_id', storeId);
      }
      
      const [{ data: transactions }, { data: payments }] = await Promise.all([
        partyTxQuery,
        partyPayQuery,
      ]);

      // Calculate totals per party
      const partyBalances = new Map<string, { receivable: number; payable: number; received: number; paid: number }>();
      
      transactions?.forEach(tx => {
        const current = partyBalances.get(tx.party_id) || { receivable: 0, payable: 0, received: 0, paid: 0 };
        if (tx.direction === 'RECEIVABLE') {
          current.receivable += tx.amount || 0;
        } else if (tx.direction === 'PAYABLE') {
          current.payable += tx.amount || 0;
        }
        partyBalances.set(tx.party_id, current);
      });

      payments?.forEach(payment => {
        const current = partyBalances.get(payment.party_id) || { receivable: 0, payable: 0, received: 0, paid: 0 };
        if (payment.payment_type === 'RECEIVED') {
          current.received += payment.amount || 0;
        } else if (payment.payment_type === 'PAID') {
          current.paid += payment.amount || 0;
        }
        partyBalances.set(payment.party_id, current);
      });
      
      let receivableOutstanding = 0;
      let payableOutstanding = 0;
      
      partyBalances.forEach(balance => {
        const netReceivable = balance.receivable - balance.received;
        const netPayable = balance.payable - balance.paid;
        
        if (netReceivable > 0) {
          receivableOutstanding += netReceivable;
        }
        if (netPayable > 0) {
          payableOutstanding += netPayable;
        }
      });

      return {
        netWorth,
        totalAssets,
        totalLiabilities,
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
      // Get last 12 months of data
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = format(startOfMonth(date), 'yyyy-MM-dd');
        const end = format(endOfMonth(date), 'yyyy-MM-dd');
        
        let txQuery = supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', start)
          .lte('date', end);
        
        if (storeId) {
          txQuery = txQuery.eq('store_id', storeId);
        }
        
        const { data: transactions } = await txQuery;
        
        const income = transactions?.filter(t => ['income', 'invoice_receipt'].includes(t.type))
          .reduce((sum, t) => sum + t.amount, 0) || 0;
        const expense = transactions?.filter(t => ['expense', 'bill_payment'].includes(t.type))
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
        .select(`
          amount,
          transaction_categories:category_id(name)
        `)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data } = await query;
      
      const categoryTotals = new Map<string, number>();
      data?.forEach(t => {
        const categoryName = t.transaction_categories?.name || 'Uncategorized';
        categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + t.amount);
      });
      
      return Array.from(categoryTotals.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // Top 10 categories
    },
    enabled: !!storeId,
  });
}
