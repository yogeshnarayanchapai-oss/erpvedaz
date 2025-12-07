import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GaaubesiStatsCardProps {
  dateFrom?: string;
  dateTo?: string;
}

export function GaaubesiStatsCard({ dateFrom, dateTo }: GaaubesiStatsCardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['gaaubesi-stats', dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('logistics_orders')
        .select('delivery_status, cod_amount, cod_collected')
        .eq('courier', 'GAAUBESI');

      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = data?.length || 0;
      const delivered = data?.filter(o => o.delivery_status === 'DELIVERED').length || 0;
      const inTransit = data?.filter(o => ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP'].includes(o.delivery_status || '')).length || 0;
      const pending = data?.filter(o => o.delivery_status === 'PENDING_PICKUP').length || 0;
      const rto = data?.filter(o => ['RTO', 'RETURNED_TO_SELLER', 'RETURNED'].includes(o.delivery_status || '')).length || 0;

      const codCollected = data?.filter(o => o.cod_collected).reduce((sum, o) => sum + (o.cod_amount || 0), 0) || 0;
      const codPending = data?.filter(o => !o.cod_collected && o.cod_amount).reduce((sum, o) => sum + (o.cod_amount || 0), 0) || 0;

      return {
        total,
        delivered,
        inTransit,
        pending,
        rto,
        deliveredPct: total > 0 ? Math.round((delivered / total) * 100) : 0,
        inTransitPct: total > 0 ? Math.round((inTransit / total) * 100) : 0,
        rtoPct: total > 0 ? Math.round((rto / total) * 100) : 0,
        codCollected,
        codPending,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-500" />
            Gaaubesi Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-purple-500" />
          Gaaubesi Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Package className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 mx-auto text-green-600" />
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.delivered}</p>
              <p className="text-xs text-muted-foreground">{stats.deliveredPct}% Delivered</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 mx-auto text-blue-600" />
              <p className="text-2xl font-bold mt-1 text-blue-600">{stats.inTransit}</p>
              <p className="text-xs text-muted-foreground">{stats.inTransitPct}% In Transit</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-500/10">
              <RotateCcw className="h-5 w-5 mx-auto text-red-600" />
              <p className="text-2xl font-bold mt-1 text-red-600">{stats.rto}</p>
              <p className="text-xs text-muted-foreground">{stats.rtoPct}% RTO</p>
            </div>
          </div>

          {/* COD Summary */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">COD Collected</p>
              <p className="font-semibold text-green-600">Rs. {stats.codCollected.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">COD Pending</p>
              <p className="font-semibold text-orange-600">Rs. {stats.codPending.toLocaleString()}</p>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Delivered</span>
                <span>{stats.deliveredPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${stats.deliveredPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>RTO Rate</span>
                <span>{stats.rtoPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${stats.rtoPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
