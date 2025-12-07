import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, Truck } from 'lucide-react';
import { format } from 'date-fns';

interface TimelineEvent {
  status: string;
  timestamp: string;
  note?: string;
  completed: boolean;
}

interface OrderStatusTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

const statusIcons: Record<string, any> = {
  PENDING_PICKUP: Clock,
  PICKED_UP: Truck,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: Check,
  RETURNED: X,
  RTO: X,
  CANCELLED: X,
};

export function OrderStatusTimeline({ events, currentStatus }: OrderStatusTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => {
            const Icon = statusIcons[event.status] || Clock;
            const isLast = index === events.length - 1;

            return (
              <div
                key={index}
                className={`flex gap-4 ${!isLast ? 'pb-4 border-l-2 border-border ml-4' : ''}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center -ml-5 ${
                  event.completed ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={event.completed ? 'default' : 'outline'}>
                      {event.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  {event.note && (
                    <p className="text-sm text-muted-foreground">{event.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
