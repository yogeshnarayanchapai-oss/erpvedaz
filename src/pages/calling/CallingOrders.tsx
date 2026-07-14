import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, useUpdateOrderStatus, useUpdateInsideDeliveryStatus, InsideDeliveryStatus, canEditDeliveryStatus } from '@/hooks/useOrders';
import { useOrderCopyTemplate } from '@/hooks/useOrderCopyTemplate';
import { useProducts } from '@/hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Eye, Edit, Copy, MapPin } from 'lucide-react';
import { useClientPagination } from '@/hooks/useClientPagination';
import { DataPagination } from '@/components/ui/data-pagination';
import { exportOrdersToCourierFormat } from '@/services/courierExportService';
import { format, subDays } from 'date-fns';

import { AdminEditOrderSheet } from '@/components/orders/AdminEditOrderSheet';
import { ExportDropdown } from '@/components/filters/ExportDropdown';
import { OrderFiltersCard, DatePreset, DeliveryFilter, OrderStatusFilter, InsideDeliveryStatusFilter } from '@/components/filters/OrderFiltersCard';
import { Order } from '@/hooks/useOrders';
import { toast } from 'sonner';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

const INSIDE_DELIVERY_STATUS_OPTIONS: { value: InsideDeliveryStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'REACHED_CNR', label: 'Reached - CNR' },
  { value: 'CUSTOMER_CANCELLED', label: 'Customer Cancelled' },
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
  const { generateOrderCopy } = useOrderCopyTemplate();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Get URL params
  const deliveryParam = searchParams.get('delivery');
  const locationParam = searchParams.get('location');
  const statusParam = searchParams.get('status');
  const ivStatusParam = searchParams.get('ivStatus');
  
  // Unified search query (global search)
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDateFrom, setCustomDateFrom] = useState(todayStr);
  const [customDateTo, setCustomDateTo] = useState(todayStr);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>(() => {
    if (locationParam === 'INSIDE_VALLEY') return 'INSIDE_VALLEY';
    if (locationParam === 'OUTSIDE_VALLEY') return 'OUTSIDE_VALLEY';
    if (deliveryParam === 'inside-valley') return 'INSIDE_VALLEY';
    if (deliveryParam === 'outside-valley') return 'OUTSIDE_VALLEY';
    return 'ALL';
  });
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>(() => {
    if (statusParam && ['CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'REDIRECT', 'CANCELLED'].includes(statusParam)) {
      return statusParam as OrderStatusFilter;
    }
    return 'ALL';
  });
  const [insideDeliveryStatusFilter, setInsideDeliveryStatusFilter] = useState<InsideDeliveryStatusFilter>(() => {
    if (ivStatusParam && ['PENDING', 'DELIVERED', 'REACHED_CNR', 'CUSTOMER_CANCELLED'].includes(ivStatusParam)) {
      return ivStatusParam as InsideDeliveryStatusFilter;
    }
    return 'ALL';
  });
  const [productFilter, setProductFilter] = useState<string>('all');
  
  // Modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Clear URL params after applying
  useEffect(() => {
    if (deliveryParam || locationParam || statusParam || ivStatusParam) {
      setSearchParams({}, { replace: true });
    }
  }, [deliveryParam, setSearchParams]);
  
  const updateOrderStatus = useUpdateOrderStatus();
  const updateInsideDelivery = useUpdateInsideDeliveryStatus();
  
  // Check if search is active - for global search behavior
  const isSearchActive = searchQuery.trim().length > 0;
  
  const dateRange = useMemo(() => {
    // When search is active, fetch ALL orders (global search)
    if (isSearchActive) {
      return { from: '2020-01-01', to: todayStr };
    }
    
    if (datePreset === 'today') return { from: todayStr, to: todayStr };
    if (datePreset === 'yesterday') {
      const y = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      return { from: y, to: y };
    }
    if (datePreset === 'last30') return { from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: todayStr };
    return { from: customDateFrom, to: customDateTo };
  }, [datePreset, todayStr, customDateFrom, customDateTo, isSearchActive]);

  const { data: products = [] } = useProducts();

  const { data: allOrders = [], isLoading } = useOrders({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    // When searching globally, don't restrict by sales person so any order can be found
    salesPersonId: isSearchActive ? undefined : profile?.id,
    deliveryLocation: deliveryFilter === 'ALL' ? undefined : deliveryFilter,
    search: isSearchActive ? searchQuery.trim() : undefined,
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
    
    // Text search (global)
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      const isRefIdSearch = isReferenceIdSearch(search);
      
      filtered = filtered.filter(o => {
        if (isRefIdSearch && matchesReferenceId(o.leads?.reference_id, search)) {
          return true;
        }
        return (
          (o.leads?.client_name?.toLowerCase().includes(search)) ||
          (o.leads?.contact_number?.includes(search)) ||
          (o.id.toLowerCase().includes(search)) ||
          (o.products?.name?.toLowerCase().includes(search)) ||
          (o.leads?.reference_id?.toLowerCase().includes(search))
        );
      });
    }
    
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allOrders, statusFilter, productFilter, deliveryFilter, insideDeliveryStatusFilter, searchQuery]);

  // Pagination - 100 per page
  const callingOrdersPaginationKey = `${statusFilter}|${productFilter}|${deliveryFilter}|${insideDeliveryStatusFilter}|${searchQuery}|${orders.length}`;
  const {
    pagedRows: pagedCallingOrders,
    page: callingPage,
    setPage: setCallingPage,
    totalPages: callingTotalPages,
    total: callingTotal,
    from: callingFrom,
    to: callingTo,
  } = useClientPagination(orders, 100, callingOrdersPaginationKey);
  
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

  const handleInsideDeliveryUpdate = async (orderId: string, status: InsideDeliveryStatus, remark?: string) => {
    await updateInsideDelivery.mutateAsync({ orderId, insideDeliveryStatus: status, insideDeliveryRemark: remark });
  };

  const getDeliveryLocationLabel = (location: string | null) => {
    if (location === 'INSIDE_VALLEY') return 'Inside Valley';
    if (location === 'OUTSIDE_VALLEY') return 'Outside Valley';
    return '';
  };

  const exportCSV = () => {
    const headers = ['Order Date', 'Client', 'Contact', 'Product', 'Qty', 'Amount', 'Payment', 'Delivery Location', 'Branch', 'Address', 'Status', 'Delivery Update', 'Remarks'];
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
      o.delivery_notes || '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-orders-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
  };

  const exportPDF = () => {
    import('jspdf').then(({ jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const headers = ['Date', 'Client', 'Contact', 'Product', 'Qty', 'Amount', 'Location', 'Branch', 'Status', 'Remarks'];
        const rows = orders.map(o => [
          format(new Date(o.order_date), 'yyyy-MM-dd'),
          o.leads?.client_name || '',
          o.leads?.contact_number || '',
          o.products?.name || '',
          o.quantity,
          `NPR ${(o.amount || 0).toLocaleString()}`,
          getDeliveryLocationLabel(o.delivery_location),
          o.destination_branch || '',
          o.order_status,
          o.delivery_notes || '',
        ]);
        doc.setFontSize(14);
        doc.text(`Orders Report (${dateRange.from} to ${dateRange.to})`, 14, 15);
        doc.setFontSize(9);
        doc.text(`Total: ${orders.length} orders | Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 22);
        (doc as any).autoTable({
          head: [headers], body: rows, startY: 27,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], fontSize: 7, fontStyle: 'bold' },
          columnStyles: { 4: { cellWidth: 12, halign: 'center' }, 5: { cellWidth: 22, halign: 'right' }, 9: { cellWidth: 40 } },
        });
        doc.save(`my-orders-${dateRange.from}-to-${dateRange.to}.pdf`);
        toast.success('PDF exported successfully');
      });
    });
  };

  // Copy order details using dynamic template from Data Tools
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
      // Format with quantity: "Hair Oil (2)" or "Hair Oil (2), Face Cream"
      productName = orderItemsList.map((item: any) => `${item.product_name}${item.quantity > 1 ? ` (${item.quantity})` : ''}`).join(', ');
      productPrice = orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      productQuantity = orderItemsList.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    } else {
      // Format with quantity for single product
      const qty = order.quantity || 1;
      productName = `${order.products?.name || ''}${qty > 1 ? ` (${qty})` : ''}`;
      productPrice = (order.amount || 0) * qty;
      productQuantity = qty;
    }

    const deliveryLocation = order.delivery_location === 'INSIDE_VALLEY' ? 'Inside Valley' : 'Outside Valley';
    const paymentMethod = order.is_cod ? 'COD' : 'Online';
    const orderBy = order.created_by_staff?.name || order.sales_person?.name || '';
    
    // Use dynamic template from Data Tools
    const copyText = generateOrderCopy({
      customerName,
      phone: customerPhone,
      products: productName,
      address: fullAddress,
      amount: productPrice,
      quantity: productQuantity,
      branch: order.destination_branch || '',
      deliveryLocation,
      paymentMethod,
      orderBy,
    });
    
    navigator.clipboard.writeText(copyText).then(() => {
      toast.success('Order details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy order details');
    });
  };

  // Clear all filters
  const handleReset = () => {
    setSearchQuery('');
    setDatePreset('today');
    setCustomDateFrom(todayStr);
    setCustomDateTo(todayStr);
    setDeliveryFilter('ALL');
    setStatusFilter('ALL');
    setInsideDeliveryStatusFilter('ALL');
    setProductFilter('all');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Orders you have confirmed</p>
        </div>
      </div>

      {/* Filters */}
      <OrderFiltersCard
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customDateFrom={customDateFrom}
        onCustomDateFromChange={setCustomDateFrom}
        customDateTo={customDateTo}
        onCustomDateToChange={setCustomDateTo}
        deliveryFilter={deliveryFilter}
        onDeliveryFilterChange={setDeliveryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        insideDeliveryStatusFilter={insideDeliveryStatusFilter}
        onInsideDeliveryStatusFilterChange={setInsideDeliveryStatusFilter}
        productFilter={productFilter}
        onProductFilterChange={setProductFilter}
        products={products}
        onReset={handleReset}
      />

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Orders ({orders.length})
            </CardTitle>
            <ExportDropdown
              onExportCSV={exportCSV}
              onExportCourier={() => exportOrdersToCourierFormat(orders, `courier_orders_${dateRange.from}_to_${dateRange.to}.xlsx`)}
            />
          </div>
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
                  <TableHead className="table-header">Amount</TableHead>
                  <TableHead className="table-header">Payment</TableHead>
                  <TableHead className="table-header">Delivery</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Remark</TableHead>
                  {showInsideDeliveryColumn && (
                    <TableHead className="table-header">Delivery Update</TableHead>
                  )}
                  <TableHead className="table-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedCallingOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.confirmed_at || order.created_at || order.order_date), 'dd MMM HH:mm')}
                    </TableCell>
                    <TableCell 
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/calling/orders/${order.id}`)}
                    >
                      {order.leads?.client_name || '-'}
                    </TableCell>
                    <TableCell>{order.leads?.contact_number || '-'}</TableCell>
                    <TableCell>
                      {order.products?.name 
                        ? `(${order.quantity || 1}) ${order.products.name}` 
                        : '-'}
                    </TableCell>
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
                    <TableCell className="max-w-[180px] truncate" title={order.delivery_notes || (order as any).leads?.remark || ''}>
                      {order.delivery_notes || (order as any).leads?.remark || '-'}
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
                            <Textarea
                              key={`remark-${order.id}-${order.inside_delivery_remark || ''}`}
                              className="w-32 min-h-[28px] text-xs resize-y py-1 px-2"
                              rows={1}
                              placeholder="Remark..."
                              defaultValue={order.inside_delivery_remark || ''}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  const val = (e.target as HTMLTextAreaElement).value;
                                  if (val !== (order.inside_delivery_remark || '')) {
                                    handleInsideDeliveryUpdate(order.id, (order.inside_delivery_status || 'PENDING') as InsideDeliveryStatus, val);
                                  }
                                  (e.target as HTMLTextAreaElement).blur();
                                }
                              }}
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
          <DataPagination
            page={callingPage}
            totalPages={callingTotalPages}
            total={callingTotal}
            from={callingFrom}
            to={callingTo}
            onPageChange={setCallingPage}
            itemLabel="orders"
          />
          </div>
        </CardContent>
      </Card>
      {/* Edit Order Sheet */}
      <AdminEditOrderSheet
        order={editingOrder}
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
      />
    </div>
  );
}
