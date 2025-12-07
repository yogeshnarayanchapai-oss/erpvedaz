import { useState } from 'react';
import { useOrders, useUpdateOrderStatus, Order } from '@/hooks/useOrders';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Truck, CheckCircle, Clock, Download, Search, MapPin, History, XCircle, Phone, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { OrderHistoryTimeline } from '@/components/logistics/OrderHistoryTimeline';
import { toast } from 'sonner';

const orderStatusColors: Record<string, string> = {
  CONFIRMED: 'bg-info/10 text-info border-info/20',
  SENT_FOR_DELIVERY: 'bg-primary/10 text-primary border-primary/20',
  LOCATION_CNR: 'bg-warning/10 text-warning border-warning/20',
  DELIVERED: 'bg-success/10 text-success border-success/20',
  PENDING: 'bg-muted/50 text-muted-foreground border-muted/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
  REDIRECT: 'bg-orange-100 text-orange-700 border-orange-200',
};

const INSIDE_VALLEY_STATUSES = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SENT_FOR_DELIVERY', label: 'Sent For Delivery' },
  { value: 'LOCATION_CNR', label: 'Location CNR' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const insideValleyStatusLabels: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  SENT_FOR_DELIVERY: 'Sent For Delivery',
  LOCATION_CNR: 'Location CNR',
  DELIVERED: 'Delivered',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
  REDIRECT: 'Redirect',
};

const insideDeliveryStatusLabels: Record<string, string> = {
  PENDING: 'Pending',
  DELIVERED: 'Delivered',
  REACHED_CNR: 'Reached - CNR',
  CUSTOMER_CANCELLED: 'Customer Cancelled',
};

const insideDeliveryStatusColors: Record<string, string> = {
  PENDING: 'bg-muted/50 text-muted-foreground border-muted/20',
  DELIVERED: 'bg-success/10 text-success border-success/20',
  REACHED_CNR: 'bg-warning/10 text-warning border-warning/20',
  CUSTOMER_CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  PAID: 'bg-success/10 text-success border-success/20',
  COD: 'bg-info/10 text-info border-info/20',
};

export default function LogisticsInsideValley() {
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState('');
  const [includeNotSent, setIncludeNotSent] = useState(false);
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const [historyOrderInfo, setHistoryOrderInfo] = useState<{ clientName: string; orderDate: string } | undefined>();

  const { data: orders = [], isLoading } = useOrders({
    dateFrom,
    dateTo,
    deliveryLocation: 'INSIDE_VALLEY',
    sentToLogistics: includeNotSent ? undefined : true,
  });
  const updateOrderStatus = useUpdateOrderStatus();

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      o.leads?.client_name?.toLowerCase().includes(searchLower) ||
      o.leads?.contact_number?.includes(search) ||
      o.products?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Stats calculations
  const confirmedOrders = filteredOrders.filter(o => o.order_status === 'CONFIRMED');
  const sentForDeliveryOrders = filteredOrders.filter(o => o.order_status === 'SENT_FOR_DELIVERY');
  const locationCnrOrders = filteredOrders.filter(o => o.order_status === 'LOCATION_CNR');
  const deliveredOrders = filteredOrders.filter(o => o.order_status === 'DELIVERED');
  const pendingOrders = filteredOrders.filter(o => o.order_status === 'PENDING');
  const cancelledOrders = filteredOrders.filter(o => o.order_status === 'CANCELLED');
  const redirectedOrders = filteredOrders.filter(o => o.order_status === 'REDIRECT');

  const totalOrders = filteredOrders.length;
  const deliveryRate = totalOrders > 0 ? ((deliveredOrders.length / totalOrders) * 100).toFixed(1) : '0';
  const pendingCount = filteredOrders.filter(o => 
    o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED' && o.order_status !== 'REDIRECT'
  ).length;

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus.mutateAsync({ orderId, orderStatus: status as any });
  };

  const handlePaymentChange = async (orderId: string, status: string) => {
    await updateOrderStatus.mutateAsync({ orderId, paymentStatus: status as any });
  };

  const handleNotesChange = async (orderId: string, notes: string) => {
    await updateOrderStatus.mutateAsync({ orderId, deliveryNotes: notes });
  };

  const openHistory = (order: Order) => {
    setHistoryOrderId(order.id);
    setHistoryOrderInfo({
      clientName: order.leads?.client_name || 'Unknown',
      orderDate: order.order_date,
    });
  };

  const exportToLogistics = () => {
    // Only export CONFIRMED orders - exclude REDIRECT orders
    const exportableOrders = filteredOrders.filter(o => o.order_status === 'CONFIRMED');
    const redirectedCount = filteredOrders.filter(o => o.order_status === 'REDIRECT').length;
    
    if (exportableOrders.length === 0) {
      toast.error('No confirmed orders to export. Redirected orders cannot be exported.');
      return;
    }
    
    if (redirectedCount > 0) {
      toast.info(`${redirectedCount} redirected order(s) were skipped. Only confirmed orders will be exported.`);
    }
    
    const headers = ['Date', 'Client Name', 'Contact Number', 'Product', 'Quantity', 'Amount', 'Branch', 'Notes', 'Order Status', 'Payment Status'];
    const rows = exportableOrders.map(o => [
      format(new Date(o.order_date), 'yyyy-MM-dd'),
      o.leads?.client_name || '',
      o.leads?.contact_number || '',
      o.products?.name || '',
      o.quantity,
      o.amount || '',
      o.branches?.branch_name || o.destination_branch || '',
      o.delivery_notes || '',
      insideValleyStatusLabels[o.order_status || ''] || o.order_status,
      o.payment_status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vakari-inside-valley-logistics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast.success(`${exportableOrders.length} confirmed order(s) exported successfully`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <OrderHistoryTimeline
        orderId={historyOrderId}
        orderInfo={historyOrderInfo}
        open={!!historyOrderId}
        onOpenChange={(open) => !open && setHistoryOrderId(null)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Inside Valley Orders
          </h1>
          <p className="text-muted-foreground">Manage deliveries within the valley</p>
        </div>
        <Button onClick={exportToLogistics} className="bg-primary hover:bg-primary/90">
          <Truck className="w-4 h-4 mr-2" />
          Export to Logistic
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <StatCard 
          title="Confirmed" 
          value={confirmedOrders.length} 
          icon={<CheckCircle className="w-5 h-5" />} 
          variant="info" 
        />
        <StatCard 
          title="Sent For Delivery" 
          value={sentForDeliveryOrders.length} 
          icon={<Truck className="w-5 h-5" />} 
          variant="primary" 
        />
        <StatCard 
          title="Location CNR" 
          value={locationCnrOrders.length} 
          icon={<Phone className="w-5 h-5" />} 
          variant="warning" 
        />
        <StatCard 
          title="Redirected" 
          value={redirectedOrders.length} 
          icon={<RotateCcw className="w-5 h-5" />} 
          variant="warning" 
        />
        <StatCard 
          title="Delivered" 
          value={deliveredOrders.length} 
          icon={<CheckCircle className="w-5 h-5" />} 
          variant="success" 
        />
        <StatCard 
          title="Pending" 
          value={pendingOrders.length} 
          icon={<Clock className="w-5 h-5" />} 
          variant="default" 
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
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search client, contact, or product..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="includeNotSent" checked={includeNotSent} onCheckedChange={(checked) => setIncludeNotSent(!!checked)} />
              <label htmlFor="includeNotSent" className="text-sm text-muted-foreground cursor-pointer">Include not sent</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Client Name</TableHead>
                  <TableHead className="table-header">Contact Number</TableHead>
                  <TableHead className="table-header">Product</TableHead>
                  <TableHead className="table-header">Qty</TableHead>
                  <TableHead className="table-header">Amount</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Notes</TableHead>
                  <TableHead className="table-header">Calling Update</TableHead>
                  <TableHead className="table-header">Order Status</TableHead>
                  <TableHead className="table-header">Payment</TableHead>
                  <TableHead className="table-header w-[60px]">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.order_date), 'dd MMM')}
                    </TableCell>
                    <TableCell className="font-medium">{order.leads?.client_name || '-'}</TableCell>
                    <TableCell>{order.leads?.contact_number || '-'}</TableCell>
                    <TableCell>{order.products?.name || '-'}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell className="font-medium">₹{order.amount?.toFixed(0) || '-'}</TableCell>
                    <TableCell>{order.branches?.branch_name || order.destination_branch || '-'}</TableCell>
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
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${insideDeliveryStatusColors[order.inside_delivery_status || 'PENDING']}`}
                        >
                          {insideDeliveryStatusLabels[order.inside_delivery_status || 'PENDING']}
                        </Badge>
                        {order.inside_delivery_remark && (
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={order.inside_delivery_remark}>
                            {order.inside_delivery_remark}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={order.order_status || ''} onValueChange={(v) => handleStatusChange(order.id, v)}>
                        <SelectTrigger className={`w-36 h-8 text-xs ${orderStatusColors[order.order_status || ''] || ''}`}>
                          <SelectValue>{insideValleyStatusLabels[order.order_status || ''] || order.order_status}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {INSIDE_VALLEY_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={order.payment_status || ''} onValueChange={(v) => handlePaymentChange(order.id, v)}>
                        <SelectTrigger className={`w-24 h-8 text-xs ${paymentStatusColors[order.payment_status || ''] || ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="PAID">Paid</SelectItem>
                          <SelectItem value="COD">COD</SelectItem>
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
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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
            <span>Delivered: {deliveredOrders.length} | Pending: {pendingCount}</span>
            <span className="font-medium">Delivery Rate: {deliveryRate}%</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
