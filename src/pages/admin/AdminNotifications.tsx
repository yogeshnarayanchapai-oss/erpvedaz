import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Calendar, Filter, CheckCircle, ExternalLink } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Notification } from '@/hooks/useNotifications';

type DatePreset = 'today' | 'last7' | 'last30' | 'custom';

const NOTIFICATION_TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'LEAD_TRANSFER', label: 'Lead Transfer' },
  { value: 'ORDER_CONFIRMED', label: 'Order Confirmed' },
  { value: 'ORDER_REDIRECTED', label: 'Order Redirected' },
  { value: 'DELIVERY_UPDATED', label: 'Delivery Updated' },
  { value: 'LEAD_CNR', label: 'Lead CNR' },
  { value: 'LEAD_FOLLOWUP', label: 'Lead Follow-up' },
  { value: 'LEAD_CANCELLED', label: 'Lead Cancelled' },
  { value: 'LOGISTICS_EXPORTED', label: 'Logistics Export' },
  // HRM notification types
  { value: 'DOCUMENT_UPLOADED', label: 'Document Uploaded' },
  { value: 'DOCUMENT_APPROVED', label: 'Document Approved' },
  { value: 'DOCUMENT_REJECTED', label: 'Document Rejected' },
  { value: 'LEAVE_REQUEST', label: 'Leave Request' },
  { value: 'LEAVE_APPROVED', label: 'Leave Approved' },
  { value: 'LEAVE_REJECTED', label: 'Leave Rejected' },
  { value: 'LEAVE_STATUS', label: 'Leave Status' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'PAYROLL_CREATED', label: 'Payroll Created' },
  { value: 'PAYROLL_PAID', label: 'Payroll Paid' },
  { value: 'LEAVE_QUOTA_UPDATED', label: 'Leave Quota Updated' },
  { value: 'ASSET_ASSIGNED', label: 'Asset Assigned' },
  { value: 'NOTICE_PUBLISHED', label: 'Notice Published' },
];

const PORTAL_OPTIONS = [
  { value: 'ALL', label: 'All Portals' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CALLING', label: 'Calling' },
  { value: 'FOLLOWUP', label: 'Follow-up' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'LEADS', label: 'Leads' },
  { value: 'HRM', label: 'HRM' },
];

const typeColors: Record<string, string> = {
  LEAD_TRANSFER: 'bg-blue-100 text-blue-700 border-blue-200',
  ORDER_CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
  ORDER_REDIRECTED: 'bg-orange-100 text-orange-700 border-orange-200',
  DELIVERY_UPDATED: 'bg-purple-100 text-purple-700 border-purple-200',
  LEAD_CNR: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LEAD_FOLLOWUP: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  LEAD_CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  LOGISTICS_EXPORTED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  // HRM colors
  DOCUMENT_UPLOADED: 'bg-teal-100 text-teal-700 border-teal-200',
  DOCUMENT_APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DOCUMENT_REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
  LEAVE_REQUEST: 'bg-amber-100 text-amber-700 border-amber-200',
  LEAVE_APPROVED: 'bg-green-100 text-green-700 border-green-200',
  LEAVE_REJECTED: 'bg-red-100 text-red-700 border-red-200',
  LEAVE_STATUS: 'bg-sky-100 text-sky-700 border-sky-200',
  ATTENDANCE: 'bg-violet-100 text-violet-700 border-violet-200',
  PAYROLL_CREATED: 'bg-lime-100 text-lime-700 border-lime-200',
  PAYROLL_PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  LEAVE_QUOTA_UPDATED: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  ASSET_ASSIGNED: 'bg-slate-100 text-slate-700 border-slate-200',
  NOTICE_PUBLISHED: 'bg-pink-100 text-pink-700 border-pink-200',
};

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('last7');
  const [customDateFrom, setCustomDateFrom] = useState(today);
  const [customDateTo, setCustomDateTo] = useState(today);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [portalFilter, setPortalFilter] = useState('ALL');
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dateRange = useMemo(() => {
    if (datePreset === 'today') return { from: today, to: today };
    if (datePreset === 'last7') return { from: subDays(new Date(), 7).toISOString().split('T')[0], to: today };
    if (datePreset === 'last30') return { from: subDays(new Date(), 30).toISOString().split('T')[0], to: today };
    return { from: customDateFrom, to: customDateTo };
  }, [datePreset, today, customDateFrom, customDateTo]);

  // Fetch all notifications (admin sees everything)
  const { data: allNotifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as Notification[];
    },
  });

  // Apply filters
  const notifications = useMemo(() => {
    let filtered = allNotifications;

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    if (portalFilter !== 'ALL') {
      filtered = filtered.filter(n => n.portal === portalFilter);
    }

    if (readFilter === 'UNREAD') {
      filtered = filtered.filter(n => !n.read_at);
    } else if (readFilter === 'READ') {
      filtered = filtered.filter(n => n.read_at);
    }

    return filtered;
  }, [allNotifications, typeFilter, portalFilter, readFilter]);

  // Mark selected as read
  const markAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedIds(new Set());
      toast.success('Marked as read');
    },
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleRowClick = (notification: Notification) => {
    if (notification.link_path) {
      navigate(notification.link_path);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notification Center
          </h1>
          <p className="text-muted-foreground">Track all system activities and events</p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            onClick={() => markAsReadMutation.mutate(Array.from(selectedIds))}
            disabled={markAsReadMutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark {selectedIds.size} as Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7">Last 7 days</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-36"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-36"
                />
              </div>
            )}

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={portalFilter} onValueChange={setPortalFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Portal" />
              </SelectTrigger>
              <SelectContent>
                {PORTAL_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={readFilter} onValueChange={(v) => setReadFilter(v as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="UNREAD">Unread</SelectItem>
                <SelectItem value="READ">Read</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-semibold">{notifications.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Unread: </span>
                <span className="font-semibold text-primary">{unreadCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={notifications.length > 0 && selectedIds.size === notifications.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow
                    key={notification.id}
                    className={`cursor-pointer ${!notification.read_at ? 'bg-primary/5' : ''}`}
                    onClick={() => handleRowClick(notification)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(notification.id)}
                        onCheckedChange={() => toggleSelection(notification.id)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {format(new Date(notification.created_at), 'dd MMM HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${typeColors[notification.type] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {notification.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-medium ${!notification.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {notification.message}
                    </TableCell>
                    <TableCell className="text-sm">
                      {notification.actor_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {notification.portal || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {notification.read_at ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Read
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Unread
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {notification.link_path && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {notifications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No notifications found for this period'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
