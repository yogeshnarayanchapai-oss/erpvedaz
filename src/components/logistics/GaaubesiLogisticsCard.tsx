import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Truck, ExternalLink, RefreshCw, Copy, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface GaaubesiLogisticsCardProps {
  order: {
    id: string;
    courier_provider?: string | null;
    courier_awb?: string | null;
    logistic_tracking_status?: string | null;
    logistic_tracking_substatus?: string | null;
    logistic_tracking_last_update?: string | null;
    cod_status?: string | null;
    is_cod?: boolean;
    amount?: number;
    quantity?: number;
  };
}

const statusColors: Record<string, string> = {
  'Pending Pickup': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Picked Up': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'In Transit': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Out for Delivery': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Delivered': 'bg-green-500/10 text-green-600 border-green-500/20',
  'RTO': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Returned': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Cancelled': 'bg-muted text-muted-foreground border-muted-foreground/20',
};

export function GaaubesiLogisticsCard({ order }: GaaubesiLogisticsCardProps) {
  const [isTracking, setIsTracking] = useState(false);
  const queryClient = useQueryClient();

  if (order.courier_provider !== 'GAAUBESI') {
    return null;
  }

  const handleCopyAwb = () => {
    if (order.courier_awb) {
      navigator.clipboard.writeText(order.courier_awb);
      toast.success('AWB copied to clipboard');
    }
  };

  const handleTrackNow = async () => {
    if (!order.courier_awb) {
      toast.error('No tracking number available');
      return;
    }

    setIsTracking(true);
    try {
      const { data, error } = await supabase.functions.invoke('courier-gaaubesi-track', {
        body: { 
          trackingId: order.courier_awb,
          logisticsOrderId: null, // Will be looked up by the function
        },
      });

      if (error) throw error;

      if (data?.tracking) {
        toast.success(`Status: ${data.tracking.status}`);
        // Refresh order data
        queryClient.invalidateQueries({ queryKey: ['order-detail', order.id] });
      } else {
        toast.info('Tracking info retrieved');
      }
    } catch (err: any) {
      console.error('Track error:', err);
      toast.error('Failed to get tracking info');
    } finally {
      setIsTracking(false);
    }
  };

  const statusColor = statusColors[order.logistic_tracking_status || ''] || 'bg-muted text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-purple-500" />
          Gaaubesi Logistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Courier & AWB */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-muted-foreground text-xs">Partner</Label>
            <p className="font-medium">Gaaubesi Logistics</p>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
            GAAUBESI
          </Badge>
        </div>

        {order.courier_awb && (
          <div>
            <Label className="text-muted-foreground text-xs">Tracking / AWB</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                {order.courier_awb}
              </code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyAwb}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Status */}
        <div>
          <Label className="text-muted-foreground text-xs">Tracking Status</Label>
          <div className="mt-1">
            <Badge className={statusColor}>
              {order.logistic_tracking_status || 'CREATED'}
            </Badge>
          </div>
          {order.logistic_tracking_substatus && (
            <p className="text-sm text-muted-foreground mt-1">
              {order.logistic_tracking_substatus}
            </p>
          )}
        </div>

        {/* Last Update */}
        {order.logistic_tracking_last_update && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {format(new Date(order.logistic_tracking_last_update), 'dd MMM yyyy, HH:mm')}
          </div>
        )}

        {/* COD Status */}
        {order.is_cod && (
          <div>
            <Label className="text-muted-foreground text-xs">COD Status</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={order.cod_status === 'Collected' ? 'default' : 'outline'}>
                {order.cod_status || 'Pending'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Rs. {(order.amount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Track Now Button */}
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleTrackNow}
          disabled={isTracking || !order.courier_awb}
        >
          {isTracking ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          Track Now
        </Button>
      </CardContent>
    </Card>
  );
}
