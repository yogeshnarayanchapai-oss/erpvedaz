import { useOrderStatusHistory } from '@/hooks/useOrderHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowRight, User } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-info/10 text-info border-info/20',
  PACKED: 'bg-warning/10 text-warning border-warning/20',
  DISPATCHED: 'bg-primary/10 text-primary border-primary/20',
  DELIVERED: 'bg-success/10 text-success border-success/20',
  RETURNED: 'bg-destructive/10 text-destructive border-destructive/20',
  SENT_FOR_DELIVERY: 'bg-primary/10 text-primary border-primary/20',
  LOCATION_CNR: 'bg-warning/10 text-warning border-warning/20',
  PENDING: 'bg-muted/50 text-muted-foreground border-muted/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  SENT_FOR_DELIVERY: 'Sent For Delivery',
  LOCATION_CNR: 'Location CNR',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
};

interface OrderHistoryTimelineProps {
  orderId: string | null;
  orderInfo?: {
    clientName: string;
    orderDate: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderHistoryTimeline({ orderId, orderInfo, open, onOpenChange }: OrderHistoryTimelineProps) {
  const { data: history = [], isLoading } = useOrderStatusHistory(orderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Order Status History
          </DialogTitle>
          {orderInfo && (
            <p className="text-sm text-muted-foreground">
              {orderInfo.clientName} • {format(new Date(orderInfo.orderDate), 'dd MMM yyyy')}
            </p>
          )}
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No status changes recorded yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

              <div className="space-y-4">
                {history.map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-4 pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                      index === 0 ? 'bg-primary border-primary' : 'bg-background border-muted-foreground'
                    }`} />

                    <div className="flex-1 bg-muted/30 rounded-lg p-3 space-y-2">
                      {/* Status change */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.previous_status && (
                          <>
                            <Badge variant="outline" className={statusColors[entry.previous_status] || ''}>
                              {statusLabels[entry.previous_status] || entry.previous_status}
                            </Badge>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </>
                        )}
                        <Badge variant="outline" className={statusColors[entry.new_status] || ''}>
                          {statusLabels[entry.new_status] || entry.new_status}
                        </Badge>
                      </div>

                      {/* Timestamp and user */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(entry.changed_at), 'dd MMM yyyy, HH:mm')}</span>
                        {entry.changer_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {entry.changer_name}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground italic">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
