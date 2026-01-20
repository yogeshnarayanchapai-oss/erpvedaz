import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AvailableStockResult {
  productId: string;
  warehouseId: string;
  currentStock: number;
  productName?: string;
  warehouseName?: string;
}

export function useAvailableStock(productId?: string, warehouseId?: string) {
  return useQuery({
    queryKey: ['available_stock', productId, warehouseId],
    queryFn: async (): Promise<AvailableStockResult | null> => {
      if (!productId || !warehouseId) return null;

      const { data, error } = await supabase
        .from('product_inventory')
        .select(`
          current_stock,
          products:product_id(name),
          warehouses:warehouse_id(name)
        `)
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // No inventory record exists - treat as 0 stock
        return {
          productId,
          warehouseId,
          currentStock: 0,
        };
      }

      return {
        productId,
        warehouseId,
        currentStock: data.current_stock || 0,
        productName: (data.products as any)?.name,
        warehouseName: (data.warehouses as any)?.name,
      };
    },
    enabled: !!productId && !!warehouseId,
    staleTime: 5000, // Refresh every 5 seconds to get latest stock
  });
}
