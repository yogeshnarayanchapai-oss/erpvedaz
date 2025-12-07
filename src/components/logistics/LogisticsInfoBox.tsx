import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  ExternalLink,
  AlertCircle,
  Banknote,
} from 'lucide-react';
import { format } from 'date-fns';
import { LogisticsOrder, LogisticsDeliveryStatus } from '@/hooks/useLogistics';

interface LogisticsInfoBoxProps {
  logisticsOrder: LogisticsOrder | null;
  showHeader?: boolean;
}

const STATUS_CONFIG: Record<LogisticsDeliveryStatus, { color: string; icon: typeof CheckCircle }> = {
  PENDING_PICKUP: { color: 'bg-muted text-muted-foreground', icon: Clock },
  PICKED_UP: { color: 'bg-blue-500/10 text-blue-500', icon: Package },
  IN_TRANSIT: { color: 'bg-yellow-500/10 text-yellow-500', icon: Truck },
  OUT_FOR_DELIVERY: { color: 'bg-orange-500/10 text-orange-500', icon: MapPin },
  DELIVERED: { color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  CANCELED: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
  RTO: { color: 'bg-red-500/10 text-red-500', icon: AlertCircle },
  RETURNED_TO_SELLER: { color: 'bg-red-500/10 text-red-500', icon: AlertCircle },
};

const COURIER_URLS: Record<string, string> = {
  NCM: 'https://ncm.com.np/track/',
  GBL: 'https://gbllogistics.com.np/tracking/',
  PATHAO: 'https://merchant.pathao.com/orders/',
};

export function LogisticsInfoBox({ logisticsOrder, showHeader = true }: LogisticsInfoBoxProps) {
  if (!logisticsOrder) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Not sent to logistics yet</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[logisticsOrder.delivery_status];
  const StatusIcon = statusConfig.icon;

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTrackingUrl = () => {
    const baseUrl = COURIER_URLS[logisticsOrder.courier];
    if (!baseUrl || !logisticsOrder.tracking_id) return null;
    return `${baseUrl}${logisticsOrder.tracking_id}`;
  };

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Logistics Information
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showHeader ? 'pt-0' : 'pt-6'}>
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {formatStatus(logisticsOrder.delivery_status)}
            </Badge>
            <Badge variant="outline">{logisticsOrder.courier}</Badge>
          </div>

          {/* Tracking Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tracking ID</p>
              <p className="font-mono font-medium">{logisticsOrder.tracking_id || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Parcel Code</p>
              <p className="font-mono font-medium">{logisticsOrder.parcel_code || '-'}</p>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sent At</p>
              <p>{logisticsOrder.created_at ? format(new Date(logisticsOrder.created_at), 'dd MMM yyyy HH:mm') : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pickup Date</p>
              <p>{logisticsOrder.pickup_date ? format(new Date(logisticsOrder.pickup_date), 'dd MMM yyyy') : '-'}</p>
            </div>
            {logisticsOrder.actual_delivery && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Delivered On</p>
                <p className="text-green-500 font-medium">
                  {format(new Date(logisticsOrder.actual_delivery), 'dd MMM yyyy HH:mm')}
                </p>
              </div>
            )}
          </div>

          {/* COD Info */}
          {logisticsOrder.cod_amount && logisticsOrder.cod_amount > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">COD Amount</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{logisticsOrder.cod_amount.toLocaleString()}</p>
                  <Badge variant={logisticsOrder.cod_collected ? 'default' : 'secondary'} className="text-xs">
                    {logisticsOrder.cod_collected ? 'Collected' : 'Pending'}
                  </Badge>
                </div>
              </div>
            </>
          )}

          {/* Courier Status */}
          {logisticsOrder.courier_status && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground">Courier Status</p>
                <p className="font-medium">{logisticsOrder.courier_status}</p>
                {logisticsOrder.status_updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Updated: {format(new Date(logisticsOrder.status_updated_at), 'dd MMM HH:mm')}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Error */}
          {logisticsOrder.last_error && (
            <div className="p-3 bg-destructive/10 rounded-lg text-sm">
              <p className="text-destructive font-medium flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Error
              </p>
              <p className="text-destructive/80">{logisticsOrder.last_error}</p>
            </div>
          )}

          {/* Track Button */}
          {getTrackingUrl() && (
            <Button variant="outline" className="w-full" asChild>
              <a href={getTrackingUrl()!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Track on {logisticsOrder.courier} Portal
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
