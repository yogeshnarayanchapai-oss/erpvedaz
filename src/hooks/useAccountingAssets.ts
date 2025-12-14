import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';

export interface AccountingAsset {
  id: string;
  date: string;
  description: string;
  amount: number;
  category_id: string;
  category_name: string;
  account_id: string | null;
  account_name: string | null;
  reference_no: string | null;
  is_cleared: boolean;
  created_at: string;
}

// Asset category names to look for (case-insensitive)
const ASSET_CATEGORY_NAMES = ['asset', 'assets', 'assests'];

export function useAccountingAssets() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-assets', storeId],
    queryFn: async () => {
      // First get asset category IDs
      let categoryQuery = supabase
        .from('transaction_categories')
        .select('id, name')
        .eq('nature', 'expense');
      
      if (storeId) {
        categoryQuery = categoryQuery.or(`store_id.is.null,store_id.eq.${storeId}`);
      }

      const { data: categories } = await categoryQuery;
      
      // Find asset categories (case-insensitive match)
      const assetCategoryIds = categories
        ?.filter(cat => ASSET_CATEGORY_NAMES.some(name => 
          cat.name.toLowerCase().includes(name.toLowerCase())
        ))
        .map(cat => cat.id) || [];

      if (assetCategoryIds.length === 0) {
        return [];
      }

      // Get all transactions with asset categories
      let txQuery = supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          category_id,
          account_id,
          reference_no,
          is_cleared,
          created_at,
          transaction_categories:category_id(name)
        `)
        .in('category_id', assetCategoryIds)
        .order('date', { ascending: false });

      if (storeId) {
        txQuery = txQuery.eq('store_id', storeId);
      }

      const { data: transactions, error } = await txQuery;

      if (error) throw error;

      return (transactions || []).map(tx => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category_id: tx.category_id,
        category_name: tx.transaction_categories?.name || 'Unknown',
        account_id: tx.account_id,
        account_name: null, // Account name lookup skipped due to relationship complexity
        reference_no: tx.reference_no,
        is_cleared: tx.is_cleared,
        created_at: tx.created_at,
      })) as AccountingAsset[];
    },
    enabled: !!storeId,
  });
}

export function useAccountingAssetTotal() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['accounting-asset-total', storeId],
    queryFn: async () => {
      // First get asset category IDs
      let categoryQuery = supabase
        .from('transaction_categories')
        .select('id, name')
        .eq('nature', 'expense');
      
      if (storeId) {
        categoryQuery = categoryQuery.or(`store_id.is.null,store_id.eq.${storeId}`);
      }

      const { data: categories } = await categoryQuery;
      
      // Find asset categories
      const assetCategoryIds = categories
        ?.filter(cat => ASSET_CATEGORY_NAMES.some(name => 
          cat.name.toLowerCase().includes(name.toLowerCase())
        ))
        .map(cat => cat.id) || [];

      if (assetCategoryIds.length === 0) {
        return 0;
      }

      // Get sum of asset transactions
      let txQuery = supabase
        .from('transactions')
        .select('amount')
        .in('category_id', assetCategoryIds);

      if (storeId) {
        txQuery = txQuery.eq('store_id', storeId);
      }

      const { data: transactions } = await txQuery;

      return transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    },
    enabled: !!storeId,
  });
}
