import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Users, FileText } from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuditFilters } from '@/hooks/useAuditDashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditPurchaseSummaryProps {
  filters: AuditFilters;
}

export function AuditPurchaseSummary({ filters }: AuditPurchaseSummaryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-purchase-summary', filters],
    queryFn: async () => {
      const { startDate, endDate } = filters;

      // Get stock IN movements (purchases)
      const { data: purchases } = await supabase
        .from('stock_movements')
        .select('qty, unit_cost, party_id, parties(name)')
        .eq('movement_type', 'IN')
        .gte('movement_date', startDate || '2020-01-01')
        .lte('movement_date', endDate || new Date().toISOString().split('T')[0]);

      const totalPurchase = purchases?.reduce((sum, p) => sum + ((p.qty || 0) * (p.unit_cost || 0)), 0) || 0;
      const purchaseCount = purchases?.length || 0;
      const totalQty = purchases?.reduce((sum, p) => sum + (p.qty || 0), 0) || 0;

      // Get unique vendors
      const vendors = new Set(purchases?.map(p => p.party_id).filter(Boolean));
      const vendorCount = vendors.size;

      // Get bills from accounting
      const { data: bills } = await supabase
        .from('accounting_bills')
        .select('total_amount, paid_amount, outstanding_amount, status')
        .gte('bill_date', startDate || '2020-01-01')
        .lte('bill_date', endDate || new Date().toISOString().split('T')[0]);

      const totalBilled = bills?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const totalPaid = bills?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;
      const billCount = bills?.length || 0;

      return {
        totalPurchase,
        purchaseCount,
        totalQty,
        vendorCount,
        totalBilled,
        totalPaid,
        billCount,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Purchase Summary
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
          <ShoppingCart className="w-5 h-5 text-primary" />
          Purchase Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <p className="text-sm text-muted-foreground">Total Purchase</p>
            <p className="text-xl font-bold mt-1">{formatNPR(data?.totalPurchase || 0)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Qty</p>
            <p className="text-xl font-bold mt-1">{(data?.totalQty || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{data?.purchaseCount} transactions</p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Active Vendors</span>
            </div>
            <span className="font-medium">{data?.vendorCount || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Bills</span>
            </div>
            <span className="font-medium">{data?.billCount || 0}</span>
          </div>
        </div>

        {(data?.totalBilled || 0) > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">Bills Status</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total Billed</span>
                <span>{formatNPR(data?.totalBilled || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-success">
                <span>Paid</span>
                <span>{formatNPR(data?.totalPaid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-warning">
                <span>Outstanding</span>
                <span>{formatNPR((data?.totalBilled || 0) - (data?.totalPaid || 0))}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
