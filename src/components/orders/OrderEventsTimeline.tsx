import { useOrderEvents, formatOrderEventDescription } from '@/hooks/useOrderEvents';
import { format } from 'date-fns';
import { 
  CheckCircle, XCircle, Package, Truck, CreditCard, 
  MessageSquare, Clock, FileText, User, AlertCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OrderEventsTimelineProps {
  orderId: string;
}

const eventIcons: Record<string, React.ReactNode> = {
  order_created: <FileText className="h-4 w-4" />,
  status_changed: <Clock className="h-4 w-4" />,
  payment_received: <CreditCard className="h-4 w-4" />,
  note_added: <MessageSquare className="h-4 w-4" />,
  courier_assigned: <Truck className="h-4 w-4" />,
  sales_recorded: <CheckCircle className="h-4 w-4 text-green-500" />,
  sales_reversed: <AlertCircle className="h-4 w-4 text-orange-500" />,
  order_cancelled: <XCircle className="h-4 w-4 text-red-500" />,
  field_updated: <Package className="h-4 w-4" />,
};

const eventColors: Record<string, string> = {
  order_created: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  status_changed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  payment_received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  note_added: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  courier_assigned: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  sales_recorded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  sales_reversed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  order_cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  field_updated: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
};

export function OrderEventsTimeline({ orderId }: OrderEventsTimelineProps) {
  const { data: events, isLoading } = useOrderEvents(orderId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Events ({events.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="relative flex gap-4 pl-10">
                {/* Timeline dot */}
                <div className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border">
                  {eventIcons[event.event_type] || <Clock className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant="secondary" 
                      className={eventColors[event.event_type] || 'bg-gray-100'}
                    >
                      {event.event_type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  
                  <p className="text-sm mt-1">
                    {formatOrderEventDescription(event)}
                  </p>

                  {event.profiles && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{event.profiles.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
