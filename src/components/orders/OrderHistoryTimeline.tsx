import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import { format } from 'date-fns';

interface OrderHistoryTimelineProps {
  orderId: string;
}

export function OrderHistoryTimeline({ orderId }: OrderHistoryTimelineProps) {
  const { data: history, isLoading } = useOrderHistory(orderId);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'STATUS_CHANGE':
        return '🔄';
      case 'PAYMENT_CHANGE':
        return '💳';
      case 'COURIER_UPDATE':
        return '🚚';
      case 'LEAD_CONVERTED':
        return '✅';
      default:
        return '📝';
    }
  };

  const formatChangedAt = (createdAt: string | null) => {
    if (!createdAt) return 'N/A';
    return format(new Date(createdAt), 'MMM dd, yyyy HH:mm');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Order History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading history...</p>
        ) : !history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history available</p>
        ) : (
          <div className="space-y-4">
            {history.map((event, index) => (
              <div
                key={event.id}
                className={`flex gap-4 pb-4 ${
                  index !== history.length - 1 ? 'border-l-2 border-border ml-3' : ''
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center -ml-5">
                  <span className="text-lg">{getEventIcon(event.event_type)}</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatChangedAt(event.created_at)}
                    </span>
                  </div>
                  <p className="text-sm">{event.description}</p>
                  {event.profiles && (
                    <p className="text-xs text-muted-foreground">
                      by {event.profiles.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
