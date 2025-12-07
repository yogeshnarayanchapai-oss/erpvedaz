import { useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { useMessageLogs, useMessageChannels } from '@/hooks/useMessaging';
import type { MessageStatus } from '@/lib/messaging/types';
import { CheckCircle, XCircle, Clock, MessageSquare, Phone } from 'lucide-react';

const STATUS_OPTIONS: MessageStatus[] = ['PENDING', 'SENT', 'FAILED'];
const statusConfig: Record<MessageStatus, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' }> = {
  PENDING: { icon: <Clock className="w-3 h-3" />, variant: 'secondary' },
  SENT: { icon: <CheckCircle className="w-3 h-3" />, variant: 'default' },
  FAILED: { icon: <XCircle className="w-3 h-3" />, variant: 'destructive' },
};

export default function AdminMessagingLogs() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfDay(today), to: endOfDay(today) });
  const [statusFilter, setStatusFilter] = useState<MessageStatus | ''>('');
  const [channelFilter, setChannelFilter] = useState<string>('');

  const { data: channels } = useMessageChannels();
  const { data: logs, isLoading } = useMessageLogs({ status: statusFilter || undefined, channel_id: channelFilter || undefined, dateFrom: dateRange.from.toISOString(), dateTo: dateRange.to.toISOString(), limit: 200 });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Message Logs</h1><p className="text-muted-foreground">View history of all sent and pending messages</p></div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-64"><Label className="text-xs text-muted-foreground">Date Range</Label><DateRangeFilter value={dateRange} onChange={setDateRange} /></div>
            <div className="w-48"><Label className="text-xs text-muted-foreground">Status</Label><Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v as MessageStatus)}><SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="w-48"><Label className="text-xs text-muted-foreground">Channel</Label><Select value={channelFilter || 'all'} onValueChange={(v) => setChannelFilter(v === 'all' ? '' : v)}><SelectTrigger><SelectValue placeholder="All channels" /></SelectTrigger><SelectContent><SelectItem value="all">All Channels</SelectItem>{channels?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Logs</CardTitle><CardDescription>Recent message delivery logs</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading logs...</p> : !logs?.length ? <p className="text-muted-foreground">No message logs found.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date/Time</TableHead><TableHead>Recipient</TableHead><TableHead>Channel</TableHead><TableHead>Event</TableHead><TableHead>Status</TableHead><TableHead className="max-w-xs">Preview</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const channel = log.channel as { name: string; type: string } | undefined;
                    const template = log.template as { code: string } | undefined;
                    const rule = log.rule as { event_name: string } | undefined;
                    const config = statusConfig[log.status];
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell className="font-mono text-sm">{log.recipient_phone}</TableCell>
                        <TableCell>{channel && <Badge variant="outline" className="gap-1">{channel.type === 'SMS' ? <Phone className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}{channel.name}</Badge>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{rule?.event_name?.replace(/_/g, ' ') || template?.code || '-'}</TableCell>
                        <TableCell><Badge variant={config.variant} className="gap-1">{config.icon}{log.status}</Badge></TableCell>
                        <TableCell className="max-w-xs"><p className="truncate text-sm text-muted-foreground" title={log.payload_preview}>{log.payload_preview.substring(0, 60)}...</p>{log.error_message && <p className="text-xs text-destructive truncate">{log.error_message}</p>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
