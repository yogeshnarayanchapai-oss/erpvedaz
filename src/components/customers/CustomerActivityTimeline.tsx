import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCustomerActivity } from '@/hooks/useCustomerActivity';
import { formatDistanceToNow } from 'date-fns';
import { Package, Truck, XCircle, RotateCcw, Phone, MessageSquare, StickyNote } from 'lucide-react';

interface CustomerActivityTimelineProps {
  customerId: string;
}

export function CustomerActivityTimeline({ customerId }: CustomerActivityTimelineProps) {
  const { data: activities, isLoading } = useCustomerActivity(customerId);

  const getActivityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ORDER': return <Package className="w-4 h-4" />;
      case 'DELIVERY': return <Truck className="w-4 h-4" />;
      case 'CANCELLATION': return <XCircle className="w-4 h-4" />;
      case 'RTO': return <RotateCcw className="w-4 h-4" />;
      case 'CALL': return <Phone className="w-4 h-4" />;
      case 'FOLLOWUP': return <MessageSquare className="w-4 h-4" />;
      case 'NOTE': return <StickyNote className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ORDER': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
      case 'DELIVERY': return 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20';
      case 'CANCELLATION': return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
      case 'RTO': return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20';
      case 'CALL': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
      case 'FOLLOWUP': return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
      ) : !activities || activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No activity yet</div>
      ) : (
        <div className="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative pl-10">
              <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-2 flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="border rounded-lg p-4 bg-background hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <Badge variant="outline" className={getActivityColor(activity.activity_type)}>
                    {activity.activity_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {activity.created_at && formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mb-1">{activity.description}</p>
                {activity.profiles?.name && (
                  <p className="text-xs text-muted-foreground">
                    by {activity.profiles.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
