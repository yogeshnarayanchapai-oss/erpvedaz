import { useState, useMemo } from 'react';
import { useOrders, useUpdateOrderStatus, Order } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Truck, CheckCircle, Clock, Download, Search, MapPin, Globe, History, Upload, FileDown } from 'lucide-react';
import { exportOrdersToCourierFormat } from '@/services/courierExportService';
import { format } from 'date-fns';
import { OrderHistoryTimeline } from '@/components/logistics/OrderHistoryTimeline';
import { getOrderStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { FormattedDate } from '@/components/FormattedDate';
import { ImportOrdersDialog } from '@/components/orders/ImportOrdersDialog';
import { useAuth } from '@/contexts/AuthContext';

// Inside Valley specific status options
const INSIDE_VALLEY_STATUSES = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SENT_FOR_DELIVERY', label: 'Sent For Delivery' },
  { value: 'LOCATION_CNR', label: 'Location CNR' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// Outside Valley status options
const OUTSIDE_VALLEY_STATUSES = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURNED', label: 'Returned' },
];

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-[hsl(25,95%,53%)]/10 text-[hsl(25,95%,53%)] border-[hsl(25,95%,53%)]/20',
  PAID: 'bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%)]/20',
  COD: 'bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,60%)] border-[hsl(217,91%,60%)]/20',
};

type DeliveryTab = 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY';

export default function LogisticsOrders() {
  const { profile } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<DeliveryTab>('INSIDE_VALLEY');
  const [includeNotSent, setIncludeNotSent] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: orders = [], isLoading } = useOrders({
    dateFrom,
    dateTo,
    deliveryLocation: activeTab,
    sentToLogistics: includeNotSent ? undefined : true,
  });
  const { data: products = [] } = useProducts();
  const updateOrderStatus = useUpdateOrderStatus();

  // Global search for logistic_order_id across all orders
  const { data: globalSearchOrders = [] } = useOrders({
    dateFrom: '2020-01-01',
    dateTo: format(new Date(), 'yyyy-MM-dd'),
  });

  // Filter orders by search - with global logistic_order_id search
  const filteredOrders = useMemo(() => {
    // If searching and search term looks like a logistic ID, search globally
    if (search && search.trim().length > 0) {
      const searchLower = search.toLowerCase();
      const globalMatches = globalSearchOrders.filter((order) =>
        order.logistic_order_id?.toLowerCase().includes(searchLower)
      );
      if (globalMatches.length > 0) {
        return globalMatches;
      }
    }

    return orders.filter(o => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        o.leads?.client_name?.toLowerCase().includes(searchLower) ||
        o.leads?.contact_number?.includes(search) ||
        o.products?.name?.toLowerCase().includes(searchLower) ||
        o.shipping_partner?.toLowerCase().includes(searchLower) ||
        o.partner_order_id?.toLowerCase().includes(searchLower) ||
        o.logistic_order_id?.toLowerCase().includes(searchLower)
      );
    });
  }, [orders, globalSearchOrders, search]);

  // Stats calculations - different for Inside vs Outside Valley
  const isInsideValley = activeTab === 'INSIDE_VALLEY';
  
  // Inside Valley stats
  const confirmedOrders = filteredOrders.filter(o => o.order_status === 'CONFIRMED');
  const sentForDeliveryOrders = filteredOrders.filter(o => o.order_status === 'SENT_FOR_DELIVERY');
  const locationCnrOrders = filteredOrders.filter(o => o.order_status === 'LOCATION_CNR');
  const deliveredOrders = filteredOrders.filter(o => o.order_status === 'DELIVERED');
  const pendingStatusOrders = filteredOrders.filter(o => o.order_status === 'PENDING');
  const cancelledOrders = filteredOrders.filter(o => o.order_status === 'CANCELLED');
  
  // Outside Valley stats
  const packedOrders = filteredOrders.filter(o => o.order_status === 'PACKED');
  const dispatchedOrders = filteredOrders.filter(o => o.order_status === 'DISPATCHED');
  const returnedOrders = filteredOrders.filter(o => o.order_status === 'RETURNED');
  
  // General pending (not delivered/returned/cancelled)
  const pendingOrders = filteredOrders.filter(o => 
    o.order_status !== 'DELIVERED' && o.order_status !== 'RETURNED' && o.order_status !== 'CANCELLED'
  );

  // Delivery rate calculation
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
    await updateOrderStatus.mutateAsync({
      orderId,
      paymentStatus: status as any,
    });
  };

  const handlePartnerFieldChange = async (
    orderId: string, 
    field: 'shippingPartner' | 'partnerOrderId' | 'partnerStatus', 
    value: string
  ) => {
    await updateOrderStatus.mutateAsync({
      orderId,
      [field]: value,
    });
  };

  const handleDeliveryNotesChange = async (orderId: string, notes: string) => {
    await updateOrderStatus.mutateAsync({
      orderId,
      deliveryNotes: notes,
    });
  };

  const exportCSV = () => {
    const isOutsideValley = activeTab === 'OUTSIDE_VALLEY';
    
    const headers = isOutsideValley 
      ? ['Order Date', 'Client', 'Contact', 'Product', 'Qty', 'Amount', 'Branch', 'Address', 'Shipping Partner', 'Partner Order ID', 'Partner Status', 'Status', 'Payment']
      : ['Order Date', 'Client', 'Contact', 'Product', 'Qty', 'Amount', 'Branch', 'Address', 'Notes', 'Status', 'Payment'];
    
    const rows = filteredOrders.map(o => {
      const baseRow = [
        format(new Date(o.order_date), 'yyyy-MM-dd'),
        o.leads?.client_name || '',
        o.leads?.contact_number || '',
        o.products?.name || '',
        o.quantity,
        o.amount || '',
        o.branches?.branch_name || o.destination_branch || '',
        o.full_address || '',
      ];
      
      if (isOutsideValley) {
        return [
          ...baseRow,
          o.shipping_partner || '',
          o.partner_order_id || '',
          o.partner_status || '',
          o.order_status,
          o.payment_status,
        ];
      }
      
      return [...baseRow, o.delivery_notes || '', o.order_status, o.payment_status];
    });

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${activeTab.toLowerCase()}-${dateFrom}-to-${dateTo}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">Track and manage order fulfillment</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportDialogOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={() => exportOrdersToCourierFormat(filteredOrders, `courier_orders_${activeTab.toLowerCase()}_${dateFrom}_to_${dateTo}.xlsx`)} 
            variant="outline"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Courier Excel
          </Button>
        </div>
      </div>

      <ImportOrdersDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        portalType="LOGISTICS"
      />

      {/* Tabs for Inside/Outside Valley */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeliveryTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="INSIDE_VALLEY" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Inside Valley
          </TabsTrigger>
          <TabsTrigger value="OUTSIDE_VALLEY" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Outside Valley
          </TabsTrigger>
        </TabsList>

        {/* Stats - Different for Inside vs Outside Valley */}
        {isInsideValley ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
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
              icon={<Clock className="w-5 h-5" />}
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
              value={pendingStatusOrders.length}
              icon={<Clock className="w-5 h-5" />}
              variant="default"
            />
            <StatCard
              title="Cancelled"
              value={cancelledOrders.length}
              icon={<Clock className="w-5 h-5" />}
              variant="destructive"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <StatCard
              title="Confirmed"
              value={confirmedOrders.length}
              icon={<CheckCircle className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              title="Packed"
              value={packedOrders.length}
              icon={<Package className="w-5 h-5" />}
              variant="warning"
            />
            <StatCard
              title="Dispatched"
              value={dispatchedOrders.length}
              icon={<Truck className="w-5 h-5" />}
              variant="primary"
            />
            <StatCard
              title="Delivered"
              value={deliveredOrders.length}
              icon={<CheckCircle className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              title="Returned"
              value={returnedOrders.length}
              icon={<Clock className="w-5 h-5" />}
              variant="destructive"
            />
          </div>
        )}

        {/* Filters */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">To:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="includeNotSent" 
                  checked={includeNotSent}
                  onCheckedChange={(checked) => setIncludeNotSent(!!checked)}
                />
                <label htmlFor="includeNotSent" className="text-sm text-muted-foreground cursor-pointer">
                  Include not sent
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inside Valley Tab Content */}
        <TabsContent value="INSIDE_VALLEY" className="mt-6">
          <InsideValleyTable 
            orders={filteredOrders}
            isLoading={isLoading}
            onStatusChange={handleStatusChange}
            onPaymentChange={handlePaymentChange}
            onDeliveryNotesChange={handleDeliveryNotesChange}
            totalOrders={totalOrders}
            deliveredCount={deliveredOrders.length}
            pendingCount={pendingOrders.length}
            deliveryRate={deliveryRate}
          />
        </TabsContent>

        {/* Outside Valley Tab Content */}
        <TabsContent value="OUTSIDE_VALLEY" className="mt-6">
          <OutsideValleyTable 
            orders={filteredOrders}
            isLoading={isLoading}
            onStatusChange={handleStatusChange}
            onPaymentChange={handlePaymentChange}
            onPartnerFieldChange={handlePartnerFieldChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Inside Valley Table Component
function InsideValleyTable({
  orders,
  isLoading,
  onStatusChange,
  onPaymentChange,
  onDeliveryNotesChange,
  totalOrders,
  deliveredCount,
  pendingCount,
  deliveryRate,
}: {
  orders: Order[];
  isLoading: boolean;
  onStatusChange: (orderId: string, status: string) => void;
  onPaymentChange: (orderId: string, status: string) => void;
  onDeliveryNotesChange: (orderId: string, notes: string) => void;
  totalOrders: number;
  deliveredCount: number;
  pendingCount: number;
  deliveryRate: string;
}) {
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const [historyOrderInfo, setHistoryOrderInfo] = useState<{ clientName: string; orderDate: string } | undefined>();

  const openHistory = (order: Order) => {
    setHistoryOrderId(order.id);
    setHistoryOrderInfo({
      clientName: order.leads?.client_name || 'Unknown',
      orderDate: order.order_date,
    });
  };

  return (
    <>
      <OrderHistoryTimeline
        orderId={historyOrderId}
        orderInfo={historyOrderInfo}
        open={!!historyOrderId}
        onOpenChange={(open) => !open && setHistoryOrderId(null)}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Inside Valley Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Client</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Product</TableHead>
                  <TableHead className="table-header">Qty</TableHead>
                  <TableHead className="table-header">Amount</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Notes</TableHead>
                  <TableHead className="table-header">Order Status</TableHead>
                  <TableHead className="table-header">Payment</TableHead>
                  <TableHead className="table-header w-[60px]">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-muted-foreground">
                    <FormattedDate date={order.order_date} />
                  </TableCell>
                  <TableCell className="font-medium">{order.leads?.client_name || '-'}</TableCell>
                  <TableCell>{order.leads?.contact_number || '-'}</TableCell>
                  <TableCell>{order.products?.name || '-'}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>₹{order.amount?.toFixed(0) || '-'}</TableCell>
                  <TableCell>{order.branches?.branch_name || order.destination_branch || '-'}</TableCell>
                  <TableCell>
                    <Input
                      className="w-32 h-8 text-sm"
                      placeholder="Add notes..."
                      defaultValue={order.delivery_notes || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (order.delivery_notes || '')) {
                          onDeliveryNotesChange(order.id, e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.order_status}
                      onValueChange={(v) => onStatusChange(order.id, v)}
                    >
                      <SelectTrigger className="w-44">
                        <Badge variant="outline" className={getOrderStatusBadgeClass(order.order_status)}>
                          {formatStatusLabel(order.order_status)}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {INSIDE_VALLEY_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.payment_status}
                      onValueChange={(v) => onPaymentChange(order.id, v)}
                    >
                      <SelectTrigger className="w-28">
                        <Badge variant="outline" className={paymentStatusColors[order.payment_status]}>
                          {order.payment_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="COD">COD</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openHistory(order)}
                      className="h-8 w-8 p-0"
                      title="View History"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No orders found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Orders</span>
            <span className="text-lg font-semibold">{totalOrders}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Delivered</span>
            <span className="text-lg font-semibold text-success">{deliveredCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Pending</span>
            <span className="text-lg font-semibold text-warning">{pendingCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Delivery Rate</span>
            <span className="text-lg font-semibold text-primary">{deliveryRate}%</span>
          </div>
        </div>
      </CardFooter>
    </Card>
    </>
  );
}

// Outside Valley Table Component
function OutsideValleyTable({
  orders,
  isLoading,
  onStatusChange,
  onPaymentChange,
  onPartnerFieldChange,
}: {
  orders: Order[];
  isLoading: boolean;
  onStatusChange: (orderId: string, status: string) => void;
  onPaymentChange: (orderId: string, status: string) => void;
  onPartnerFieldChange: (orderId: string, field: 'shippingPartner' | 'partnerOrderId' | 'partnerStatus', value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Outside Valley Orders ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="table-header">Date</TableHead>
                <TableHead className="table-header">Client</TableHead>
                <TableHead className="table-header">Contact</TableHead>
                <TableHead className="table-header">Product</TableHead>
                <TableHead className="table-header">Qty</TableHead>
                <TableHead className="table-header">Amount</TableHead>
                <TableHead className="table-header">Branch</TableHead>
                <TableHead className="table-header">Shipping Partner</TableHead>
                <TableHead className="table-header">Partner ID</TableHead>
                <TableHead className="table-header">Partner Status</TableHead>
                <TableHead className="table-header">Order Status</TableHead>
                <TableHead className="table-header">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-muted-foreground">
                    <FormattedDate date={order.order_date} />
                  </TableCell>
                  <TableCell className="font-medium">{order.leads?.client_name || '-'}</TableCell>
                  <TableCell>{order.leads?.contact_number || '-'}</TableCell>
                  <TableCell>{order.products?.name || '-'}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>₹{order.amount?.toFixed(0) || '-'}</TableCell>
                  <TableCell>{order.branches?.branch_name || order.destination_branch || '-'}</TableCell>
                  <TableCell>
                    <Input
                      className="w-28 h-8 text-sm"
                      placeholder="Partner"
                      defaultValue={order.shipping_partner || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (order.shipping_partner || '')) {
                          onPartnerFieldChange(order.id, 'shippingPartner', e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-28 h-8 text-sm"
                      placeholder="Order ID"
                      defaultValue={order.partner_order_id || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (order.partner_order_id || '')) {
                          onPartnerFieldChange(order.id, 'partnerOrderId', e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-28 h-8 text-sm"
                      placeholder="Status"
                      defaultValue={order.partner_status || ''}
                      onBlur={(e) => {
                        if (e.target.value !== (order.partner_status || '')) {
                          onPartnerFieldChange(order.id, 'partnerStatus', e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.order_status}
                      onValueChange={(v) => onStatusChange(order.id, v)}
                    >
                      <SelectTrigger className="w-32">
                        <Badge variant="outline" className={getOrderStatusBadgeClass(order.order_status)}>
                          {formatStatusLabel(order.order_status)}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {OUTSIDE_VALLEY_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.payment_status}
                      onValueChange={(v) => onPaymentChange(order.id, v)}
                    >
                      <SelectTrigger className="w-28">
                        <Badge variant="outline" className={paymentStatusColors[order.payment_status]}>
                          {order.payment_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="COD">COD</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
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
    </Card>
  );
}