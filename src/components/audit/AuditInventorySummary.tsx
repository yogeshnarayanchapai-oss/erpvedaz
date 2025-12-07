import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowUp, ArrowDown, Warehouse } from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuditFilters } from '@/hooks/useAuditDashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditInventorySummaryProps {
  filters: AuditFilters;
}

export function AuditInventorySummary({ filters }: AuditInventorySummaryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-inventory-summary', filters],
    queryFn: async () => {
      const { startDate, endDate } = filters;

      // Get current stock value
      const { data: inventory } = await supabase
        .from('product_inventory')
        .select('current_stock, products(cost_price, name)')
        .gt('current_stock', 0);

      const stockValue = inventory?.reduce((sum, inv) => {
        const costPrice = (inv.products as any)?.cost_price || 0;
        return sum + ((inv.current_stock || 0) * costPrice);
      }, 0) || 0;

      const totalItems = inventory?.reduce((sum, inv) => sum + (inv.current_stock || 0), 0) || 0;
      const productCount = inventory?.length || 0;

      // Get stock IN movements
      const { data: stockIn } = await supabase
        .from('stock_movements')
        .select('qty, unit_cost')
        .eq('movement_type', 'IN')
        .gte('movement_date', startDate || '2020-01-01')
        .lte('movement_date', endDate || new Date().toISOString().split('T')[0]);

      const totalIn = stockIn?.reduce((sum, m) => sum + (m.qty || 0), 0) || 0;
      const totalInValue = stockIn?.reduce((sum, m) => sum + ((m.qty || 0) * (m.unit_cost || 0)), 0) || 0;

      // Get stock OUT movements
      const { data: stockOut } = await supabase
        .from('stock_movements')
        .select('qty, unit_cost')
        .eq('movement_type', 'OUT')
        .gte('movement_date', startDate || '2020-01-01')
        .lte('movement_date', endDate || new Date().toISOString().split('T')[0]);

      const totalOut = stockOut?.reduce((sum, m) => sum + (m.qty || 0), 0) || 0;
      const totalOutValue = stockOut?.reduce((sum, m) => sum + ((m.qty || 0) * (m.unit_cost || 0)), 0) || 0;

      return {
        stockValue,
        totalItems,
        productCount,
        totalIn,
        totalInValue,
        totalOut,
        totalOutValue,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventory Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-info" />
          Inventory Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-info/10">
            <div className="flex items-center gap-2 text-info">
              <Warehouse className="w-4 h-4" />
              <span className="text-sm">Stock Value</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatNPR(data?.stockValue || 0)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-xl font-bold mt-1">{(data?.totalItems || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{data?.productCount || 0} products</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="flex items-center gap-2 text-success">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm font-medium">Stock IN</span>
            </div>
            <p className="font-semibold">{(data?.totalIn || 0).toLocaleString()} units</p>
            <p className="text-sm text-muted-foreground">{formatNPR(data?.totalInValue || 0)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-destructive">
              <ArrowDown className="w-4 h-4" />
              <span className="text-sm font-medium">Stock OUT</span>
            </div>
            <p className="font-semibold">{(data?.totalOut || 0).toLocaleString()} units</p>
            <p className="text-sm text-muted-foreground">{formatNPR(data?.totalOutValue || 0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
