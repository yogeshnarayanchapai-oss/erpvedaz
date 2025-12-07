import { useFollowupLogs } from '@/hooks/useFollowupLogs';
import { format } from 'date-fns';
import { Clock, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface FollowupHistorySectionProps {
  leadId: string;
}

export function FollowupHistorySection({ leadId }: FollowupHistorySectionProps) {
  const { data: logs = [], isLoading } = useFollowupLogs(leadId);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading history...</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No follow-up history yet.</div>
    );
  }

  return (
    <ScrollArea className="h-[200px]">
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {log.old_status && log.new_status && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {log.old_status.replace('_', ' ')}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className="text-xs">
                      {log.new_status.replace('_', ' ')}
                    </Badge>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(log.created_at), 'dd MMM HH:mm')}
              </div>
            </div>
            
            {log.profiles?.name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                {log.profiles.name}
              </div>
            )}
            
            {log.note && (
              <p className="text-muted-foreground mt-1">{log.note}</p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
