import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, useUpdateOrderStatus, useUpdateInsideDeliveryStatus, InsideDeliveryStatus, canEditDeliveryStatus } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Calendar, Filter, MapPin, Eye, Download, Upload, Edit, Copy } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ImportOrdersDialog } from '@/components/orders/ImportOrdersDialog';
import { WhatsAppButton } from '@/components/messaging/WhatsAppButton';
import { AdvancedSearchBar, SearchFilters } from '@/components/calling/AdvancedSearchBar';
import { InsideValleyStatsModal } from '@/components/calling/InsideValleyStatsModal';
import { AdminEditOrderSheet } from '@/components/orders/AdminEditOrderSheet';
import { Order } from '@/hooks/useOrders';
import { toast } from 'sonner';

type DatePreset = 'today' | 'last7' | 'last30' | 'custom';
type DeliveryFilter = 'ALL' | 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY';
type OrderStatusFilter = 'ALL' | 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'REDIRECT' | 'CANCELLED';
type InsideDeliveryStatusFilter = 'ALL' | 'PENDING' | 'DELIVERED' | 'REACHED_CNR' | 'CUSTOMER_CANCELLED';

const ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'REDIRECT', label: 'Redirect' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const INSIDE_DELIVERY_STATUS_OPTIONS: { value: InsideDeliveryStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'REACHED_CNR', label: 'Reached - CNR' },
  { value: 'CUSTOMER_CANCELLED', label: 'Customer Cancelled' },
];

const INSIDE_DELIVERY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Delivery Status' },
  { value: 'PENDING', label: 'Pending Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'REACHED_CNR', label: 'Location Not Reached' },
  { value: 'CUSTOMER_CANCELLED', label: 'Customer Not Available' },
];

const insideDeliveryStatusColors: Record<string, string> = {
  PENDING: 'bg-muted/50 text-muted-foreground border-muted/20',
  DELIVERED: 'bg-success/10 text-success border-success/20',
  REACHED_CNR: 'bg-warning/10 text-warning border-warning/20',
  CUSTOMER_CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function CallingOrders() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Get URL params
  const deliveryParam = searchParams.get('delivery');
  
  // Tab state: 'today' or 'all'
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
  
  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDateFrom, setCustomDateFrom] = useState(todayStr);
  const [customDateTo, setCustomDateTo] = useState(todayStr);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>(() => {
    if (deliveryParam === 'inside-valley') return 'INSIDE_VALLEY';
    if (deliveryParam === 'outside-valley') return 'OUTSIDE_VALLEY';
    return 'ALL';
  });
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [insideDeliveryStatusFilter, setInsideDeliveryStatusFilter] = useState<InsideDeliveryStatusFilter>('ALL');
  const [productFilter, setProductFilter] = useState<string>('all');
  
  // Advanced search filters
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});
  
  // Modal state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Clear URL params after applying
  useEffect(() => {
    if (deliveryParam) {
      setSearchParams({}, { replace: true });
    }
  }, [deliveryParam, setSearchParams]);
  
  const updateOrderStatus = useUpdateOrderStatus();
  const updateInsideDelivery = useUpdateInsideDeliveryStatus();
  
  const dateRange = useMemo(() => {
    // For Today tab, use today's date
    if (activeTab === 'today') {
      return { from: todayStr, to: todayStr };
    }
    
    // If advanced filters have dates, use those
    if (advancedFilters.fromDate || advancedFilters.toDate) {
      return {
        from: advancedFilters.fromDate || '2020-01-01',
        to: advancedFilters.toDate || todayStr,
      };
    }
    if (datePreset === 'today') return { from: todayStr, to: todayStr };
    if (datePreset === 'last7') return { from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: todayStr };
    if (datePreset === 'last30') return { from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: todayStr };
    return { from: customDateFrom, to: customDateTo };
  }, [activeTab, datePreset, todayStr, customDateFrom, customDateTo, advancedFilters]);

  const { data: products = [] } = useProducts();

  const { data: allOrders = [], isLoading } = useOrders({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    salesPersonId: profile?.id,
    deliveryLocation: deliveryFilter === 'ALL' ? undefined : deliveryFilter,
  });
  
  // Filter orders by status, inside delivery status, product, and search
  const orders = useMemo(() => {
    let filtered = allOrders;
    
    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }
    
    // Product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(o => o.product_id === productFilter);
    }
    
    // Inside Valley Delivery Status filter
    if (deliveryFilter === 'INSIDE_VALLEY' && insideDeliveryStatusFilter !== 'ALL') {
      filtered = filtered.filter(o => {
        const status = o.inside_delivery_status || 'PENDING';
        return status === insideDeliveryStatusFilter;
      });
    }
    
    // Advanced search - text search
    if (advancedFilters.searchText) {
      const search = advancedFilters.searchText.toLowerCase();
      filtered = filtered.filter(o =>
        (o.leads?.client_name?.toLowerCase().includes(search)) ||
        (o.leads?.contact_number?.includes(search)) ||
        (o.id.toLowerCase().includes(search)) ||
        (o.products?.name?.toLowerCase().includes(search))
      );
    }
    
    // Advanced search - reference ID (using order id as reference)
    if (advancedFilters.referenceId) {
      const refSearch = advancedFilters.referenceId.toLowerCase();
      filtered = filtered.filter(o => o.id.toLowerCase().includes(refSearch));
    }
    
    return filtered;
  }, [allOrders, statusFilter, productFilter, deliveryFilter, insideDeliveryStatusFilter, advancedFilters]);
  
  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Show Inside Valley delivery column
  const showInsideDeliveryColumn = deliveryFilter === 'INSIDE_VALLEY';

  const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const insideValleyCount = allOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length;
  const outsideValleyCount = allOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length;

  const handleInsideDeliveryUpdate = async (orderId: string, status: InsideDeliveryStatus, remark?: string) => {
    await updateInsideDelivery.mutateAsync({ orderId, insideDeliveryStatus: status, insideDeliveryRemark: remark });
  };

  const getDeliveryLocationLabel = (location: string | null) => {
    if (location === 'INSIDE_VALLEY') return 'Inside Valley';
    if (location === 'OUTSIDE_VALLEY') return 'Outside Valley';
    return '';
  };

  const exportCSV = () => {
    const headers = ['Order Date', 'Client', 'Contact', 'Product', 'Qty', 'Amount', 'Payment', 'Delivery Location', 'Branch', 'Address', 'Status', 'Delivery Update'];
    const rows = orders.map(o => [
      format(new Date(o.order_date), 'yyyy-MM-dd HH:mm'),
      o.leads?.client_name || '',
      o.leads?.contact_number || '',
      o.products?.name || '',
      o.quantity,
      o.amount || '',
      o.is_cod ? 'COD' : 'Online',
      getDeliveryLocationLabel(o.delivery_location),
      o.destination_branch || '',
      o.full_address || '',
      o.order_status,
      o.inside_delivery_status || 'PENDING',
    ]);

    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-orders-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
  };

  // Copy order details in specific format
  const handleCopyOrder = (order: any) => {
    const customerName = order.leads?.client_name || '';
    const customerPhone = order.leads?.contact_number || '';
    const fullAddress = order.full_address || order.destination_branch || '';
    
    // Get product details from order items or fallback
    const orderItemsList = order.order_items || [];
    let productName = '';
    let productPrice = 0;
    let productQuantity = 0;
    
    if (orderItemsList.length > 0) {
      productName = orderItemsList.map((item: any) => item.product_name).join(', ');
      productPrice = orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      productQuantity = orderItemsList.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    } else {
      productName = order.products?.name || '';
      productPrice = (order.amount || 0) * (order.quantity || 1);
      productQuantity = order.quantity || 1;
    }
    
    // Format: %customer name% %customer phone number% %product name% %full address% %product price% %product quantity% Vedaz01
    const copyText = `${customerName} ${customerPhone} ${productName} ${fullAddress} ${productPrice} ${productQuantity} Vedaz01`;
    
    navigator.clipboard.writeText(copyText).then(() => {
      toast.success('Order details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy order details');
    });
  };

  // Inside Valley delivery stats
  const insideValleyOrders = allOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY');
  const ivDelivered = insideValleyOrders.filter(o => o.inside_delivery_status === 'DELIVERED').length;
  const ivPending = insideValleyOrders.filter(o => !o.inside_delivery_status || o.inside_delivery_status === 'PENDING').length;

  // Handle clickable summary cards
  const handleInsideValleyClick = () => {
    setDeliveryFilter('INSIDE_VALLEY');
    setStatusFilter('ALL');
  };

  const handleOutsideValleyClick = () => {
    setDeliveryFilter('OUTSIDE_VALLEY');
    setStatusFilter('ALL');
  };

  // Advanced search handlers
  const handleAdvancedSearch = (filters: SearchFilters) => {
    setAdvancedFilters(filters);
    if (filters.fromDate || filters.toDate) {
      setDatePreset('custom');
      if (filters.fromDate) setCustomDateFrom(filters.fromDate);
      if (filters.toDate) setCustomDateTo(filters.toDate);
    }
  };

  const handleAdvancedReset = () => {
    setAdvancedFilters({});
    setDatePreset('today');
    setCustomDateFrom(todayStr);
    setCustomDateTo(todayStr);
    setDeliveryFilter('ALL');
    setStatusFilter('ALL');
    setInsideDeliveryStatusFilter('ALL');
    setProductFilter('all');
    setActiveTab('today');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Orders you have confirmed</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'all')}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="all">All Orders</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setImportDialogOpen(true)} variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={exportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <ImportOrdersDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        portalType="CALLING"
      />

      {/* Summary Cards - Clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="cursor-default">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-bold">{allOrders.length}</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-blue-400 transition-colors"
          onClick={handleInsideValleyClick}
        >
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Inside Valley
            </div>
            <div className="text-2xl font-bold text-blue-600">{insideValleyCount}</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-orange-400 transition-colors"
          onClick={handleOutsideValleyClick}
        >
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Outside Valley
            </div>
            <div className="text-2xl font-bold text-orange-600">{outsideValleyCount}</div>
          </CardContent>
        </Card>
        <Card className="cursor-default">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Amount</div>
            <div className="text-2xl font-bold text-success">₹{totalAmount.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* View Inside Valley Stats Link */}
      {insideValleyCount > 0 && (
        <button 
          onClick={() => setStatsModalOpen(true)}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
        >
          <Eye className="w-4 h-4" />
          View delivered vs pending for Inside Valley
        </button>
      )}

      {/* Advanced Search Bar */}
      <AdvancedSearchBar
        onApply={handleAdvancedSearch}
        onReset={handleAdvancedReset}
        onExport={exportCSV}
        searchPlaceholder="Search Order, Phone, Name"
        referencePlaceholder="Search Reference Id"
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground mb-3">Additional filters</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
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
            </div>
            
            <Select value={deliveryFilter} onValueChange={(v) => {
              setDeliveryFilter(v as DeliveryFilter);
              if (v !== 'INSIDE_VALLEY') {
                setInsideDeliveryStatusFilter('ALL');
              }
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Delivery Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Locations</SelectItem>
                <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatusFilter)}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Inside Valley Delivery Status Filter - only show when Inside Valley is selected */}
            {deliveryFilter === 'INSIDE_VALLEY' && (
              <Select value={insideDeliveryStatusFilter} onValueChange={(v) => setInsideDeliveryStatusFilter(v as InsideDeliveryStatusFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Delivery Status" />
                </SelectTrigger>
                <SelectContent>
                  {INSIDE_DELIVERY_FILTER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Product Filter */}
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Orders ({orders.length})
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
                  <TableHead className="table-header">Payment</TableHead>
                  <TableHead className="table-header">Delivery</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  {showInsideDeliveryColumn && (
                    <TableHead className="table-header">Delivery Update</TableHead>
                  )}
                  <TableHead className="table-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.order_date), 'dd MMM HH:mm')}
                    </TableCell>
                    <TableCell 
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/calling/orders/${order.id}`)}
                    >
                      {order.leads?.client_name || '-'}
                    </TableCell>
                    <TableCell>{order.leads?.contact_number || '-'}</TableCell>
                    <TableCell>{order.products?.name || '-'}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell className="font-medium">₹{order.amount?.toFixed(0) || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={order.is_cod ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                        {order.is_cod ? 'COD' : 'Online'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.delivery_location || ''}
                        onValueChange={(v) => updateOrderStatus.mutate({
                          orderId: order.id,
                          deliveryLocation: v as 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY',
                        })}
                        disabled={order.sent_to_logistics}
                      >
                        <SelectTrigger className={`w-28 h-7 text-xs ${
                          !order.delivery_location 
                            ? 'border-destructive/50' 
                            : order.delivery_location === 'INSIDE_VALLEY'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-orange-200 bg-orange-50 text-orange-700'
                        }`}>
                          {!order.delivery_location && <MapPin className="w-3 h-3 mr-1 text-destructive" />}
                          <SelectValue placeholder="Set..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                          <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{order.branches?.branch_name || order.destination_branch || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          order.order_status === 'REDIRECT' 
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : order.order_status === 'CANCELLED'
                              ? 'bg-muted text-muted-foreground border-muted'
                              : order.order_status === 'DELIVERED'
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-info/10 text-info border-info/20'
                        }
                      >
                        {order.order_status}
                      </Badge>
                    </TableCell>
                    {showInsideDeliveryColumn && (
                      <TableCell>
                        {canEditDeliveryStatus(
                          { called_by_role: (order as any).called_by_role, assigned_to_user_id: (order as any).assigned_to_user_id },
                          profile?.id,
                          profile?.role
                        ) ? (
                          <div className="flex flex-col gap-1">
                            <Select 
                              value={order.inside_delivery_status || 'PENDING'} 
                              onValueChange={(v) => handleInsideDeliveryUpdate(order.id, v as InsideDeliveryStatus, order.inside_delivery_remark || undefined)}
                            >
                              <SelectTrigger className={`w-32 h-7 text-xs ${insideDeliveryStatusColors[order.inside_delivery_status || 'PENDING']}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INSIDE_DELIVERY_STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              className="w-32 h-6 text-xs"
                              placeholder="Remark..."
                              defaultValue={order.inside_delivery_remark || ''}
                              onBlur={(e) => {
                                if (e.target.value !== (order.inside_delivery_remark || '')) {
                                  handleInsideDeliveryUpdate(order.id, (order.inside_delivery_status || 'PENDING') as InsideDeliveryStatus, e.target.value);
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge 
                              variant="outline" 
                              className={`w-fit text-xs ${insideDeliveryStatusColors[order.inside_delivery_status || 'PENDING']}`}
                            >
                              {INSIDE_DELIVERY_STATUS_OPTIONS.find(opt => opt.value === (order.inside_delivery_status || 'PENDING'))?.label || 'Pending'}
                            </Badge>
                            {order.inside_delivery_remark && (
                              <span className="text-xs text-muted-foreground truncate max-w-32" title={order.inside_delivery_remark}>
                                {order.inside_delivery_remark}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/calling/orders/${order.id}`)}
                          title="View Order"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingOrder(order)}
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyOrder(order)}
                          title="Copy Order"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {order.leads?.contact_number && (
                          <WhatsAppButton
                            phone={order.leads.contact_number}
                            customerName={order.leads.client_name || undefined}
                            productName={order.products?.name || undefined}
                            amount={order.amount || undefined}
                            orderId={order.id}
                            variant="ghost"
                            size="icon"
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showInsideDeliveryColumn ? 12 : 11} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No orders found for this period'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inside Valley Stats Modal */}
      <InsideValleyStatsModal
        open={statsModalOpen}
        onOpenChange={setStatsModalOpen}
        delivered={ivDelivered}
        pending={ivPending}
        dateRange={dateRange}
      />

      {/* Edit Order Sheet */}
      <AdminEditOrderSheet
        order={editingOrder}
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
      />
    </div>
  );
}
