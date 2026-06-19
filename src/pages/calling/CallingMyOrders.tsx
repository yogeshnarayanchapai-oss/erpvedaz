import { useState, useMemo, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Search, Download, Eye, MessageCircle, Edit, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { StatCard } from '@/components/dashboard/StatCard';
import { useOrders, Order } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { FormattedDate } from '@/components/FormattedDate';
import { toast } from 'sonner';
import { AdminEditOrderSheet } from '@/components/orders/AdminEditOrderSheet';
import { useOrderCopyTemplate } from '@/hooks/useOrderCopyTemplate';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

const orderStatusColors: Record<string, string> = {
  CONFIRMED: 'bg-success/10 text-success border-success/20',
  PACKED: 'bg-info/10 text-info border-info/20',
  DISPATCHED: 'bg-primary/10 text-primary border-primary/20',
  DELIVERED: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  RETURNED: 'bg-destructive/10 text-destructive border-destructive/20',
  REDIRECT: 'bg-warning/10 text-warning border-warning/20',
  CANCELLED: 'bg-muted text-muted-foreground border-muted-foreground/20',
  PENDING: 'bg-secondary/50 text-secondary-foreground border-secondary/20',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  PAID: 'bg-success/10 text-success border-success/20',
  COD: 'bg-info/10 text-info border-info/20',
};

export default function CallingMyOrders() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { generateOrderCopy } = useOrderCopyTemplate();
  const today = new Date();

  // Read status filter from URL
  const urlStatus = searchParams.get('status');

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({
    from: urlStatus ? startOfDay(subDays(today, 30)) : startOfDay(today),
    to: endOfDay(today),
  });

  // Filter states - initialize from URL if present
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(urlStatus || 'all');
  const [selectedDelivery, setSelectedDelivery] = useState<string>('all');
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  // Edit order state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Fetch products for filter
  const { data: products = [] } = useProducts();

  // Sync status filter with URL params when URL changes
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setSelectedStatus(status);
    }
  }, [searchParams]);

  // Determine if search is active (global search mode)
  const isSearchActive = search.trim().length > 0;

  const dateFrom = isSearchActive ? '2020-01-01' : format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = isSearchActive ? format(new Date(), 'yyyy-MM-dd') : format(dateRange.to, 'yyyy-MM-dd');

  const { data: orders = [], isLoading } = useOrders({
    salesPersonId: profile?.id,
    dateFrom,
    dateTo,
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = selectedStatus === 'all' || order.order_status === selectedStatus;
      const matchesDelivery = selectedDelivery === 'all' || order.delivery_location === selectedDelivery;
      
      // Delivery status filter (only applies for Inside Valley)
      const matchesDeliveryStatus = selectedDeliveryStatus === 'all' || 
        (selectedDelivery === 'INSIDE_VALLEY' && order.inside_delivery_status === selectedDeliveryStatus);
      
      // Product filter
      const orderItems = (order as any).order_items || [];
      const orderProductIds = orderItems.length > 0 
        ? orderItems.map((item: any) => item.product_id)
        : [order.product_id];
      const matchesProduct = selectedProduct === 'all' || orderProductIds.includes(selectedProduct);
      
      // Check for reference ID search
      const matchesRefId = isReferenceIdSearch(search) && matchesReferenceId(order.leads?.reference_id, search);
      
      const matchesSearch =
        !search ||
        matchesRefId ||
        order.leads?.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        order.leads?.contact_number?.includes(search) ||
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.logistic_order_id?.toLowerCase().includes(search.toLowerCase());
      
      return matchesStatus && matchesDelivery && matchesDeliveryStatus && matchesProduct && matchesSearch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, selectedStatus, selectedDelivery, selectedDeliveryStatus, selectedProduct, search]);

  // Helper to calculate order total from order_items or fallback
  const getOrderTotal = (order: any) => {
    const orderItems = order.order_items || [];
    if (orderItems.length > 0) {
      return orderItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
    }
    return order.amount || 0;
  };

  // Calculate stats
  const totalOrders = filteredOrders.length;
  const insideValleyOrders = filteredOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length;
  const outsideValleyOrders = filteredOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length;
  const totalAmount = filteredOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  
  // Performance stats
  const deliveredCount = filteredOrders.filter(o => o.order_status === 'DELIVERED').length;
  const insideDelivered = filteredOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY' && o.order_status === 'DELIVERED').length;
  const insidePending = filteredOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY' && o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED').length;
  const outsideDelivered = filteredOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY' && o.order_status === 'DELIVERED').length;
  const outsidePending = filteredOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY' && o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED').length;
  const deliverySuccessRate = totalOrders > 0 ? ((deliveredCount / totalOrders) * 100).toFixed(1) : '0.0';

  const getDeliveryLocationLabel = (location: string | null) => {
    if (location === 'INSIDE_VALLEY') return 'Inside Valley';
    if (location === 'OUTSIDE_VALLEY') return 'Outside Valley';
    return '';
  };

  const handleReset = () => {
    setSearch('');
    setSelectedStatus('all');
    setSelectedDelivery('all');
    setSelectedDeliveryStatus('all');
    setSelectedProduct('all');
    setDateRange({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    });
  };

  const handleInsideValleyClick = () => {
    setSelectedDelivery('INSIDE_VALLEY');
    toast.info('Filtered to Inside Valley orders');
  };

  const exportCSV = () => {
    const headers = ['Date', 'Client', 'Contact', 'Products', 'Qty', 'Amount', 'Payment', 'Delivery', 'Branch', 'Status', 'Order By'];
    const rows = filteredOrders.map((order) => {
      // Handle multi-product orders
      const orderItemsList = (order as any).order_items || [];
      const productDisplay = orderItemsList.length > 0 
        ? orderItemsList.map((item: any) => `(${item.quantity || 1}) ${item.product_name}`).join(', ')
        : `(${order.quantity || 1}) ${order.products?.name || '-'}`;
      const totalQty = orderItemsList.length > 0
        ? orderItemsList.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        : order.quantity || 1;
      const totalAmount = orderItemsList.length > 0
        ? orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
        : (order.amount || 0);
      const orderBy = (order as any).created_by_staff?.name || order.sales_person?.name || '-';
      
      return [
        order.order_date ? format(new Date(order.order_date), 'yyyy-MM-dd HH:mm') : '',
        order.leads?.client_name || '',
        order.leads?.contact_number || '',
        productDisplay,
        totalQty,
        totalAmount,
        order.is_cod ? 'COD' : 'Online',
        getDeliveryLocationLabel(order.delivery_location),
        order.destination_branch || '',
        order.order_status || '',
        orderBy,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_orders_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Orders exported to CSV');
  };

  // Copy order details using dynamic template
  const handleCopyOrder = (order: any) => {
    const customerName = order.leads?.client_name || '';
    const customerPhone = order.leads?.contact_number || '';
    const fullAddress = order.leads?.full_address || order.destination_branch || '';
    
    // Get product details
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
    
    // Use dynamic template
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Orders you have confirmed</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={totalOrders}
          icon={<Package className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Inside Valley"
          value={insideValleyOrders}
          icon={<Package className="h-5 w-5" />}
          variant="info"
          onClick={handleInsideValleyClick}
          className="cursor-pointer"
        />
        <StatCard
          title="Outside Valley"
          value={outsideValleyOrders}
          icon={<Package className="h-5 w-5" />}
          variant="primary"
        />
        <StatCard
          title="Total Amount"
          value={`₹${totalAmount.toLocaleString()}`}
          icon={<Package className="h-5 w-5" />}
          variant="success"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, reference, order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Date Range Filter */}
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            
            {/* Location Filter */}
            <Select value={selectedDelivery} onValueChange={(value) => {
              setSelectedDelivery(value);
              // Reset delivery status when changing location
              if (value !== 'INSIDE_VALLEY') {
                setSelectedDeliveryStatus('all');
              }
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Order Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PACKED">Packed</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="REDIRECT">Redirect</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="RETURNED">RTO</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Delivery Status Filter - Only shown when Inside Valley is selected */}
            {selectedDelivery === 'INSIDE_VALLEY' && (
              <Select value={selectedDeliveryStatus} onValueChange={setSelectedDeliveryStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Delivery Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Delivery Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="REACHED_CNR">Reached CNR</SelectItem>
                  <SelectItem value="CUSTOMER_CANCELLED">Customer Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* Product Filter */}
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
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
            
            {/* Clear Button */}
            <Button variant="outline" onClick={handleReset}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Orders ({filteredOrders.length})
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
                  <TableHead className="table-header">Products</TableHead>
                  <TableHead className="table-header text-right">Amount</TableHead>
                  <TableHead className="table-header">Payment</TableHead>
                  <TableHead className="table-header">Delivery</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Remark</TableHead>
                  <TableHead className="table-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Loading orders...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const orderItemsList = (order as any).order_items || [];
                    const productDisplay = orderItemsList.length > 0 
                      ? orderItemsList.map((item: any) => `(${item.quantity || 1}) ${item.product_name}`).join(', ')
                      : `(${order.quantity || 1}) ${order.products?.name || '-'}`;
                    const totalAmount = orderItemsList.length > 0
                      ? orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
                      : (order.amount || 0);
                      
                    return (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell>
                        <FormattedDate date={order.order_date} />
                      </TableCell>
                      <TableCell
                        className="font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => navigate(`/calling/orders/${order.id}`)}
                      >
                        {order.leads?.client_name || '-'}
                      </TableCell>
                      <TableCell>{order.leads?.contact_number || '-'}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="line-clamp-2">{productDisplay}</span>
                      </TableCell>
                      <TableCell className="text-right">Rs. {totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={paymentStatusColors[order.is_cod ? 'COD' : 'PAID']}>
                          {order.is_cod ? 'COD' : 'Online'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={order.delivery_location === 'INSIDE_VALLEY' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'}
                        >
                          {getDeliveryLocationLabel(order.delivery_location) || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.destination_branch || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={orderStatusColors[order.order_status || 'CONFIRMED']}
                        >
                          {order.order_status}
                        </Badge>
                      </TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const phone = order.leads?.contact_number;
                              if (phone) {
                                window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
                              }
                            }}
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>My Performance (Orders)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Orders Confirmed</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Inside Valley</p>
              <div className="space-y-1">
                <p className="text-sm">Delivered: <span className="font-bold text-success">{insideDelivered}</span></p>
                <p className="text-sm">Pending: <span className="font-bold text-warning">{insidePending}</span></p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Outside Valley</p>
              <div className="space-y-1">
                <p className="text-sm">Delivered: <span className="font-bold text-success">{outsideDelivered}</span></p>
                <p className="text-sm">Pending: <span className="font-bold text-warning">{outsidePending}</span></p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold text-success">₹{totalAmount.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-muted-foreground">Delivery Success Rate</p>
              <p className="text-xl font-bold">{deliverySuccessRate}%</p>
            </div>
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
