import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductROI {
  product_id: string;
  product_name: string;
  revenue: number;
  ads_cost: number;
  roi_multiple: number;
  roi_percent: number;
}

interface UseProductROIParams {
  dateFrom: string;
  dateTo: string;
  warehouseId?: string;
}

export function useProductROI(params: UseProductROIParams) {
  return useQuery({
    queryKey: ['product-roi', params],
    queryFn: async () => {
      // Get ads spend by product for the date range
      const { data: adsData, error: adsError } = await supabase
        .from('ads')
        .select('product_id, amount_spent')
        .gte('date', params.dateFrom)
        .lte('date', params.dateTo);
      
      if (adsError) throw adsError;

      // Get sales revenue by product from stock movements (OUT type = sales, exclude deleted)
      let movementsQuery = supabase
        .from('stock_movements')
        .select('product_id, total_value')
        .eq('movement_type', 'OUT')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .gte('movement_date', params.dateFrom)
        .lte('movement_date', params.dateTo);

      if (params.warehouseId && params.warehouseId !== 'all') {
        movementsQuery = movementsQuery.eq('warehouse_id', params.warehouseId);
      }

      const { data: salesData, error: salesError } = await movementsQuery;
      if (salesError) throw salesError;

      // Get all products for names
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true);
      
      if (productsError) throw productsError;

      // Aggregate by product
      const productMap = new Map<string, { revenue: number; adsCost: number; name: string }>();

      // Initialize with all products
      products?.forEach(p => {
        productMap.set(p.id, { revenue: 0, adsCost: 0, name: p.name });
      });

      // Sum sales revenue by product
      salesData?.forEach(s => {
        if (s.product_id) {
          const existing = productMap.get(s.product_id) || { revenue: 0, adsCost: 0, name: 'Unknown' };
          existing.revenue += s.total_value || 0;
          productMap.set(s.product_id, existing);
        }
      });

      // Sum ads cost by product
      adsData?.forEach(a => {
        if (a.product_id) {
          const existing = productMap.get(a.product_id) || { revenue: 0, adsCost: 0, name: 'Unknown' };
          existing.adsCost += a.amount_spent || 0;
          productMap.set(a.product_id, existing);
        }
      });

      // Calculate ROI for each product
      const results: ProductROI[] = [];
      productMap.forEach((data, productId) => {
        const roiMultiple = data.adsCost > 0 ? data.revenue / data.adsCost : 0;
        const roiPercent = data.adsCost > 0 ? ((data.revenue - data.adsCost) / data.adsCost) * 100 : 0;

        results.push({
          product_id: productId,
          product_name: data.name,
          revenue: data.revenue,
          ads_cost: data.adsCost,
          roi_multiple: roiMultiple,
          roi_percent: roiPercent,
        });
      });

      // Calculate overall ROI
      const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);
      const totalAdsCost = results.reduce((sum, r) => sum + r.ads_cost, 0);
      const overallRoiMultiple = totalAdsCost > 0 ? totalRevenue / totalAdsCost : 0;
      const overallRoiPercent = totalAdsCost > 0 ? ((totalRevenue - totalAdsCost) / totalAdsCost) * 100 : 0;

      return {
        products: results.filter(r => r.revenue > 0 || r.ads_cost > 0), // Only show products with activity
        overall: {
          totalRevenue,
          totalAdsCost,
          roiMultiple: overallRoiMultiple,
          roiPercent: overallRoiPercent,
        },
      };
    },
    enabled: !!params.dateFrom && !!params.dateTo,
  });
}
