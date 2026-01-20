import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ExternalLink, Activity, Filter } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Lead and Order related notification types
const SALES_ACTIVITY_TYPES = [
  'LEAD_TRANSFER',
  'ORDER_CONFIRMED',
  'ORDER_REDIRECTED',
  'DELIVERY_UPDATED',
  'LEAD_CNR',
  'LEAD_FOLLOWUP',
  'LEAD_CANCELLED',
  'LOGISTICS_EXPORTED',
  'ORDER_EDITED',
  'LEAD_DUPLICATE',
];

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Activities' },
  { value: 'LEAD_TRANSFER', label: 'Lead Transfer' },
  { value: 'ORDER_CONFIRMED', label: 'Order Confirmed' },
  { value: 'ORDER_REDIRECTED', label: 'Order Redirected' },
  { value: 'DELIVERY_UPDATED', label: 'Delivery Updated' },
  { value: 'LEAD_CNR', label: 'Lead CNR' },
  { value: 'LEAD_FOLLOWUP', label: 'Lead Follow-up' },
  { value: 'LEAD_CANCELLED', label: 'Lead Cancelled' },
  { value: 'LOGISTICS_EXPORTED', label: 'Logistics Export' },
  { value: 'ORDER_EDITED', label: 'Order Edited' },
  { value: 'LEAD_DUPLICATE', label: 'Duplicate Lead' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
];

const typeColors: Record<string, string> = {
  LEAD_TRANSFER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ORDER_CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ORDER_REDIRECTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DELIVERY_UPDATED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  LEAD_CNR: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  LEAD_FOLLOWUP: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  LEAD_CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LOGISTICS_EXPORTED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  ORDER_EDITED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  LEAD_DUPLICATE: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
};

export default function SalesActivityLog() {
  const { currentStore } = useCurrentStore();
  const navigate = useNavigate();
  
  const [datePreset, setDatePreset] = useState('7days');
  const [activityType, setActivityType] = useState('ALL');

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case '7days':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case '90days':
        return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
      default:
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    }
  }, [datePreset]);

  // Fetch sales activities from notifications table
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['sales-activity-log', currentStore?.id, dateRange, activityType],
    queryFn: async () => {
      if (!currentStore?.id) return [];

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('store_id', currentStore.id)
        .in('type', SALES_ACTIVITY_TYPES)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (activityType !== 'ALL') {
        query = query.eq('type', activityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Deduplicate by grouping similar notifications (same type, title, message within same minute)
      const seen = new Map<string, any>();
      return (data || []).filter((item: any) => {
        const minuteKey = format(new Date(item.created_at), 'yyyy-MM-dd HH:mm');
        const key = `${item.type}-${item.title}-${minuteKey}`;
        if (seen.has(key)) return false;
        seen.set(key, true);
        return true;
      });
    },
    enabled: !!currentStore?.id,
  });

  const handleRowClick = (linkPath: string | null) => {
    if (linkPath) {
      navigate(linkPath);
    }
  };

  const getTypeLabel = (type: string) => {
    const option = ACTIVITY_TYPE_OPTIONS.find(o => o.value === type);
    return option?.label || type.replace(/_/g, ' ');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Sales Activity Log</h1>
            <p className="text-muted-foreground">Track all lead and order activities</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-[180px]">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Activity type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPE_OPTIONS.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-50" />
              <p>No activities found for the selected period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Date/Time</TableHead>
                  <TableHead className="w-[150px]">Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[350px]">Details</TableHead>
                  <TableHead className="w-[120px]">Actor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity: any) => (
                  <TableRow 
                    key={activity.id}
                    className={activity.link_path ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => handleRowClick(activity.link_path)}
                  >
                    <TableCell className="font-mono text-xs">
                      {format(new Date(activity.created_at), 'MMM dd, yyyy')}
                      <br />
                      <span className="text-muted-foreground">
                        {format(new Date(activity.created_at), 'hh:mm a')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={typeColors[activity.type] || 'bg-gray-100 text-gray-800'}
                      >
                        {getTypeLabel(activity.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{activity.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {activity.message}
                    </TableCell>
                    <TableCell className="text-sm">
                      {activity.actor_name || '-'}
                    </TableCell>
                    <TableCell>
                      {activity.link_path && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground text-center">
        Showing {activities.length} activities
      </div>
    </div>
  );
}
