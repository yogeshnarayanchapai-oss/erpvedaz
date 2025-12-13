import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface DailyPLMetrics {
  unitsSold: number;
  grossSales: number;
  totalExpense: number; // from transactions where category is "office management"
  adsSpend: number; // from ads table
  rtoPercent: number; // from rto_settings
}

// Get Units Sold and Gross Sales from stock_movements
export function useStockMovementMetrics(startDate: string, endDate: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['stock-movement-metrics', storeId, startDate, endDate],
    queryFn: async () => {
      // Get OUT movements (sales) for the date range
      const { data, error } = await supabase
        .from('stock_movements')
        .select('qty, total_value, products:product_id(store_id)')
        .eq('movement_type', 'OUT')
        .gte('movement_date', startDate)
        .lte('movement_date', endDate);

      if (error) throw error;

      // Filter by store
      const filtered = data?.filter((m: any) => m.products?.store_id === storeId) || [];

      let unitsSold = 0;
      let grossSales = 0;

      filtered.forEach((m: any) => {
        unitsSold += m.qty || 0;
        grossSales += m.total_value || 0;
      });

      return { unitsSold, grossSales };
    },
    enabled: !!storeId && !!startDate && !!endDate,
  });
}

// Get Total Expense from transactions where category is "office management"
export function useOfficeManagementExpense(startDate: string, endDate: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['office-management-expense', storeId, startDate, endDate],
    queryFn: async () => {
      // First get the category ID for "office management"
      const { data: categories, error: catError } = await supabase
        .from('transaction_categories')
        .select('id')
        .ilike('name', '%office management%');

      if (catError) throw catError;

      if (!categories?.length) {
        return { totalExpense: 0 };
      }

      const categoryIds = categories.map(c => c.id);

      // Get transactions with these categories
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('store_id', storeId)
        .eq('type', 'expense')
        .in('category_id', categoryIds)
        .gte('date', startDate)
        .lte('date', endDate);

      if (txError) throw txError;

      const totalExpense = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      return { totalExpense };
    },
    enabled: !!storeId && !!startDate && !!endDate,
  });
}

// Get Ads Spend from ads table
export function useAdsSpendMetrics(startDate: string, endDate: string) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['ads-spend-metrics', storeId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('amount_spent')
        .eq('store_id', storeId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const adsSpend = data?.reduce((sum, ad) => sum + (ad.amount_spent || 0), 0) || 0;

      return { adsSpend };
    },
    enabled: !!storeId && !!startDate && !!endDate,
  });
}
