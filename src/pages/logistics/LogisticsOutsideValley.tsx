import { useState, useEffect } from 'react';
import { useOrders, useUpdateOrderStatus, Order } from '@/hooks/useOrders';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Truck, CheckCircle, Clock, Search, Globe, History, XCircle, RotateCcw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { OrderHistoryTimeline } from '@/components/logistics/OrderHistoryTimeline';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

const orderStatusColors: Record<string, string> = {
  PENDING: 'bg-muted/50 text-muted-foreground border-muted/20',
  CONFIRMED: 'bg-info/10 text-info border-info/20',
  DISPATCHED: 'bg-primary/10 text-primary border-primary/20',
  DELIVERED: 'bg-success/10 text-success border-success/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
  RETURNED: 'bg-destructive/10 text-destructive border-destructive/20',
  REDIRECT: 'bg-orange-100 text-orange-700 border-orange-200',
};

const OUTSIDE_VALLEY_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REDIRECT: 'Redirect',
};

// Removed hardcoded logistics partners - now using generic text input

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  PAID: 'bg-success/10 text-success border-success/20',
  COD: 'bg-info/10 text-info border-info/20',
};

type DateTab = 'today' | 'yesterday' | 'last7days' | 'custom';
type StatusFilter = 'ALL' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED' | 'REDIRECT';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'CONFIRMED', label: 'Confirmed (Ready to Export)' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'REDIRECT', label: 'Redirected' },
];

export default function LogisticsOutsideValley() {
  const today = new Date().toISOString().split('T')[0];
  const [dateTab, setDateTab] = useState<DateTab>('today');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [includeNotSent, setIncludeNotSent] = useState(false);
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const [historyOrderInfo, setHistoryOrderInfo] = useState<{ clientName: string; orderDate: string } | undefined>();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [customPartnerName, setCustomPartnerName] = useState('');

  const handleDateTabChange = (tab: DateTab) => {
    setDateTab(tab);
    const now = new Date();
    switch (tab) {
      case 'today':
        setDateFrom(today);
        setDateTo(today);
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1).toISOString().split('T')[0];
        setDateFrom(yesterday);
        setDateTo(yesterday);
        break;
      case 'last7days':
        setDateFrom(subDays(now, 6).toISOString().split('T')[0]);
        setDateTo(today);
        break;
      case 'custom':
        break;
    }
  };

  const { data: orders = [], isLoading, refetch } = useOrders({
    dateFrom,
    dateTo,
    deliveryLocation: 'OUTSIDE_VALLEY',
    sentToLogistics: includeNotSent ? undefined : true,
  });
  const updateOrderStatus = useUpdateOrderStatus();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('outside-valley-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredOrders = orders.filter(o => {
    // Status filter
    if (statusFilter !== 'ALL' && o.order_status !== statusFilter) return false;
    
    // Search filter
    if (!search) return true;
    
    // Check for reference ID search
    if (isReferenceIdSearch(search) && matchesReferenceId(o.leads?.reference_id, search)) {
      return true;
    }
    
    const searchLower = search.toLowerCase();
    return (
      o.leads?.client_name?.toLowerCase().includes(searchLower) ||
      o.leads?.contact_number?.includes(search) ||
      o.leads?.full_address?.toLowerCase().includes(searchLower) ||
      o.destination_branch?.toLowerCase().includes(searchLower) ||
      o.products?.name?.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Stats calculations - using specific status rules for Outside Valley
  // CONFIRMED = sent to logistics but not yet exported to any partner
  const confirmedOrders = filteredOrders.filter(o => o.order_status === 'CONFIRMED');
  // DISPATCHED = exported/sent to external logistics partner
  const dispatchedOrders = filteredOrders.filter(o => o.order_status === 'DISPATCHED');
  const deliveredOrders = filteredOrders.filter(o => o.order_status === 'DELIVERED');
  const cancelledOrders = filteredOrders.filter(o => o.order_status === 'CANCELLED');
  const returnedOrders = filteredOrders.filter(o => o.order_status === 'RETURNED');
  const redirectedOrders = filteredOrders.filter(o => o.order_status === 'REDIRECT');
  // Pending = not delivered, not cancelled, not redirected (includes confirmed + dispatched)
  const pendingCount = filteredOrders.filter(o => 
    o.order_status !== 'DELIVERED' && o.order_status !== 'RETURNED' && o.order_status !== 'CANCELLED' && o.order_status !== 'REDIRECT'
  ).length;

  const totalOrders = filteredOrders.length;
  const deliveryRate = totalOrders > 0 ? ((deliveredOrders.length / totalOrders) * 100).toFixed(1) : '0';

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus.mutateAsync({
      orderId,
      orderStatus: status as any,
      notifyOwner: true,
    });
  };

  const handlePaymentChange = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: status as any })
      .eq('id', orderId);
    if (error) {
      toast.error('Failed to update payment status');
    } else {
      toast.success('Payment status updated');
      refetch();
    }
  };

  const handleNotesChange = async (orderId: string, notes: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ delivery_notes: notes })
      .eq('id', orderId);
    if (error) {
      toast.error('Failed to update notes');
    } else {
      refetch();
    }
  };

  const openHistory = (order: Order) => {
    setHistoryOrderId(order.id);
    setHistoryOrderInfo({
      clientName: order.leads?.client_name || 'Unknown',
      orderDate: order.order_date,
    });
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const exportOrdersToCSV = (ordersToExport: Order[], filename: string) => {
    // CSV format for logistics providers
    const headers = [
      'S.N',
      'Source Branch',
      'Destination Branch',
      'Customer Name',
      'Full Address',
      'Municipality',
      'Phone Number',
      'Alt Phone Number',
      'Package Access',
      'COD',
      'Delivery Instruction',
      'Order Description',
      'Vendor Reference ID',
      'Logistics Partner'
    ];
    
    const rows = ordersToExport.map((o, index) => [
      index + 1, // S.N - auto-increment starting from 1
      'HEAD OFFICE', // Source Branch - default to HEAD OFFICE
      o.branches?.branch_name || o.destination_branch || '', // Destination Branch
      o.leads?.client_name || '', // Customer Name
      o.leads?.full_address || o.full_address || '', // Full Address
      '', // Municipality - leave blank if not available
      o.leads?.contact_number || '', // Phone Number
      o.leads?.alt_phone || '', // Alt Phone Number
      "Can't Open", // Package Access - default value
      o.amount || 0, // COD - order amount
      o.leads?.assigned_user?.name || o.delivery_notes || '', // Delivery Instruction - Calling Staff or delivery notes
      o.products?.name || '', // Order Description - product name
      o.id, // Vendor Reference ID - internal order_id
      o.shipping_partner || '' // Logistics Partner
    ]);
    
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleExportToLogistics = async () => {
    if (selectedOrders.size === 0) {
      toast.warning('Please select at least one order.');
      return;
    }

    // Filter out REDIRECT orders - only CONFIRMED orders can be exported
    const selectedOrdersList = filteredOrders.filter(o => selectedOrders.has(o.id));
    const confirmedOrders = selectedOrdersList.filter(o => o.order_status === 'CONFIRMED');
    const redirectedCount = selectedOrdersList.filter(o => o.order_status === 'REDIRECT').length;

    if (confirmedOrders.length === 0) {
      toast.error('No confirmed orders selected. Redirected orders cannot be exported.');
      return;
    }

    if (redirectedCount > 0) {
      toast.info(`${redirectedCount} redirected order(s) were skipped. Only confirmed orders will be exported.`);
    }

    const partnerName = customPartnerName.trim() || 'Others';
    setIsBulkUpdating(true);
    const orderIds = confirmedOrders.map(o => o.id);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          shipping_partner: partnerName,
          sent_to_logistics: true,
          order_status: 'DISPATCHED' as any, // Set to DISPATCHED when exported to logistics partner
        })
        .in('id', orderIds);

      if (error) throw error;

      // Generate filename based on partner name
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filename = `vakari-${partnerName.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;

      exportOrdersToCSV(confirmedOrders, filename);
      toast.success(`${confirmedOrders.length} order(s) sent to ${partnerName} and exported`);
      setSelectedOrders(new Set());
      setShowPartnerDialog(false);
      setCustomPartnerName('');
      refetch();
    } catch (error: any) {
      toast.error(`Failed to update orders: ${error.message}`);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const openExportDialog = () => {
    if (selectedOrders.size === 0) {
      toast.warning('Please select at least one order.');
      return;
    }
    
    // Check if any confirmed orders are selected
    const selectedOrdersList = filteredOrders.filter(o => selectedOrders.has(o.id));
    const confirmedCount = selectedOrdersList.filter(o => o.order_status === 'CONFIRMED').length;
    
    if (confirmedCount === 0) {
      toast.error('No confirmed orders selected. Redirected orders cannot be exported.');
      return;
    }
    
    setShowPartnerDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <OrderHistoryTimeline
        orderId={historyOrderId}
        orderInfo={historyOrderInfo}
        open={!!historyOrderId}
        onOpenChange={(open) => !open && setHistoryOrderId(null)}
      />

      {/* Custom Partner Dialog */}
      <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Choose Logistics Partner</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="partnerName">Partner Name</Label>
            <Input
              id="partnerName"
              placeholder="Enter logistics partner name..."
              value={customPartnerName}
              onChange={(e) => setCustomPartnerName(e.target.value)}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {selectedOrders.size} order(s) will be exported
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPartnerDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExportToLogistics}
              disabled={isBulkUpdating}
            >
              <Truck className="w-4 h-4 mr-2" />
              Export & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            Outside Valley Orders
          </h1>
          <p className="text-muted-foreground">Manage deliveries outside the valley</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard 
          title="Confirmed" 
          value={confirmedOrders.length} 
          icon={<CheckCircle className="w-5 h-5" />} 
          variant="info" 
        />
        <StatCard 
          title="Dispatched" 
          value={dispatchedOrders.length} 
          icon={<Truck className="w-5 h-5" />} 
          variant="primary" 
        />
        <StatCard 
          title="Redirected" 
          value={redirectedOrders.length} 
          icon={<RotateCcw className="w-5 h-5" />} 
          variant="warning" 
        />
        <StatCard 
          title="Pending" 
          value={pendingCount} 
          icon={<Clock className="w-5 h-5" />} 
          variant="default" 
        />
        <StatCard 
          title="Delivered" 
          value={deliveredOrders.length} 
          icon={<CheckCircle className="w-5 h-5" />} 
          variant="success" 
        />
        <StatCard 
          title="Cancelled" 
          value={cancelledOrders.length} 
          icon={<XCircle className="w-5 h-5" />} 
          variant="destructive" 
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Quick Date Tabs */}
            <div className="flex gap-2 flex-wrap">
              <Button variant={dateTab === 'today' ? 'default' : 'outline'} size="sm" onClick={() => handleDateTabChange('today')}>
                Today
              </Button>
              <Button variant={dateTab === 'yesterday' ? 'default' : 'outline'} size="sm" onClick={() => handleDateTabChange('yesterday')}>
                Yesterday
              </Button>
              <Button variant={dateTab === 'last7days' ? 'default' : 'outline'} size="sm" onClick={() => handleDateTabChange('last7days')}>
                Last 7 Days
              </Button>
              <Button variant={dateTab === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => handleDateTabChange('custom')}>
                Custom
              </Button>
              <div className="border-l mx-2" />
              <Button 
                variant={statusFilter === 'CONFIRMED' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? 'ALL' : 'CONFIRMED')}
                className={statusFilter === 'CONFIRMED' ? 'bg-info text-info-foreground hover:bg-info/90' : ''}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Confirmed Only
              </Button>
              <Button 
                variant={statusFilter === 'REDIRECT' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setStatusFilter(statusFilter === 'REDIRECT' ? 'ALL' : 'REDIRECT')}
                className={statusFilter === 'REDIRECT' ? 'bg-orange-500 text-white hover:bg-orange-600' : ''}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Redirected Only
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              {dateTab === 'custom' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">From:</span>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">To:</span>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                  </div>
                </>
              )}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search client, contact, product, branch or address..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Checkbox id="includeNotSent" checked={includeNotSent} onCheckedChange={(checked) => setIncludeNotSent(!!checked)} />
                <label htmlFor="includeNotSent" className="text-sm text-muted-foreground cursor-pointer">Include not sent</label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Orders ({filteredOrders.length})
              {selectedOrders.size > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({selectedOrders.size} selected)
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={selectedOrders.size === 0 || isBulkUpdating}
                onClick={openExportDialog}
              >
                <Truck className="w-4 h-4 mr-1" />
                Export to Logistics
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header w-[40px]">
                    <Checkbox 
                      checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                      onCheckedChange={toggleAllOrders}
                    />
                  </TableHead>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Client Name</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Alt Phone</TableHead>
                  <TableHead className="table-header">Product</TableHead>
                  <TableHead className="table-header">Amount</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Full Address</TableHead>
                  <TableHead className="table-header">Calling Staff</TableHead>
                  <TableHead className="table-header">Notes</TableHead>
                  <TableHead className="table-header">Order Status</TableHead>
                  <TableHead className="table-header">Logistics Partner</TableHead>
                  <TableHead className="table-header">Payment</TableHead>
                  <TableHead className="table-header w-[60px]">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className={selectedOrders.has(order.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.order_date), 'dd MMM')}
                    </TableCell>
                    <TableCell className="font-medium">{order.leads?.client_name || '-'}</TableCell>
                    <TableCell>{order.leads?.contact_number || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{order.leads?.alt_phone || '-'}</TableCell>
                    <TableCell>
                      {order.products?.name 
                        ? `(${order.quantity || 1}) ${order.products.name}` 
                        : '-'}
                    </TableCell>
                    <TableCell className="font-medium">₹{order.amount?.toFixed(0) || '-'}</TableCell>
                    <TableCell>{order.branches?.branch_name || order.destination_branch || '-'}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={order.leads?.full_address || order.full_address || ''}>
                      {order.leads?.full_address || order.full_address || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.leads?.assigned_user?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-28 h-8 text-sm"
                        placeholder="Add notes..."
                        defaultValue={order.delivery_notes || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (order.delivery_notes || '')) {
                            handleNotesChange(order.id, e.target.value);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={order.order_status || ''} onValueChange={(v) => handleStatusChange(order.id, v)}>
                        <SelectTrigger className={`w-32 h-8 text-xs ${orderStatusColors[order.order_status || ''] || ''}`}>
                          <SelectValue>{statusLabels[order.order_status || ''] || order.order_status}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {OUTSIDE_VALLEY_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        {order.shipping_partner ? (
                          <>
                            <Truck className="w-3 h-3 text-muted-foreground" />
                            {order.shipping_partner}
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select value={order.payment_status || ''} onValueChange={(v) => handlePaymentChange(order.id, v)}>
                        <SelectTrigger className={`w-24 h-8 text-xs ${paymentStatusColors[order.payment_status || ''] || ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COD">COD</SelectItem>
                          <SelectItem value="PAID">Prepaid</SelectItem>
                          <SelectItem value="PENDING">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openHistory(order)}>
                        <History className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No orders found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <div className="flex justify-between w-full text-sm text-muted-foreground">
            <span>Total: {totalOrders} orders</span>
            <span>Delivered: {deliveredOrders.length} | Pending: {pendingCount} | Returned: {returnedOrders.length}</span>
            <span className="font-medium">Delivery Rate: {deliveryRate}%</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
