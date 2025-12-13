import { useState, useMemo, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useOrders, Order } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useStaff } from '@/hooks/useStaff';
import { useAutoMarkSeen } from '@/hooks/useViewState';
import { useBulkDeleteOrders } from '@/hooks/useBulkDeleteOrders';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OrderBulkActions } from '@/components/orders/OrderBulkActions';
import { SendToCourierModal } from '@/components/orders/SendToCourierModal';
import { SubmitToCourierModal } from '@/components/orders/SubmitToCourierModal';
import { BulkPrintView } from '@/components/orders/BulkPrintView';
import { BulkStatusUpdateModal } from '@/components/orders/BulkStatusUpdateModal';
import { AdminEditOrderSheet } from '@/components/orders/AdminEditOrderSheet';
import { ShoppingCart, Search, Download, FileSpreadsheet, ClipboardList, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';
import { toast } from 'sonner';
import { exportOrdersToCourierFormat } from '@/services/courierExportService';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

interface OrderSummaryItem {
  productId: string;
  productName: string;
  confirmedQty: number;
  totalAmount: number;
}

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

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { effectiveRole } = useEffectiveRole();
  const today = new Date();
  
  const isAdmin = effectiveRole === 'OWNER'; // OWNER displays as "Admin"
  
  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [submitCourierModalOpen, setSubmitCourierModalOpen] = useState(false);
  const [printViewOpen, setPrintViewOpen] = useState(false);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  
  // Edit order state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const bulkDeleteOrders = useBulkDeleteOrders();
  
  // Single order delete function
  const handleDeleteOrder = async (orderId: string) => {
    setDeletingOrderId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ is_deleted: true })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Order deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (error: any) {
      toast.error(`Failed to delete order: ${error.message}`);
    } finally {
      setDeletingOrderId(null);
    }
  };
  
  // Read initial values from URL params
  const initialFromParam = searchParams.get('from');
  const initialToParam = searchParams.get('to');
  const initialStatusParam = searchParams.get('status');
  
  // Tab state: 'today' or 'all'
  const [activeTab, setActiveTab] = useState<'today' | 'all'>(() => {
    // If URL params have a date range that's not today, show 'all'
    if (initialFromParam || initialToParam) {
      const todayStr = format(today, 'yyyy-MM-dd');
      if (initialFromParam !== todayStr || initialToParam !== todayStr) {
        return 'all';
      }
    }
    return 'today';
  });

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (initialFromParam && initialToParam) {
      return {
        from: startOfDay(new Date(initialFromParam)),
        to: endOfDay(new Date(initialToParam)),
      };
    }
    return {
      from: startOfDay(today),
      to: endOfDay(today),
    };
  });
  
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusParam || 'all');
  const [selectedDelivery, setSelectedDelivery] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Update date range when tab changes
  useEffect(() => {
    if (activeTab === 'today') {
      setDateRange({
        from: startOfDay(today),
        to: endOfDay(today),
      });
    } else {
      // For 'all' tab, show last 30 days by default if not set from URL
      if (!initialFromParam && !initialToParam) {
        setDateRange({
          from: startOfDay(subDays(today, 30)),
          to: endOfDay(today),
        });
      }
    }
  }, [activeTab]);

  // Clear URL params after reading
  useEffect(() => {
    if (searchParams.toString()) {
      // Clear after a short delay to let state initialize
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: orders = [], isLoading, isFetched } = useOrders({ dateFrom, dateTo });
  const { data: products = [] } = useProducts();
  const { data: staff = [] } = useStaff();

  // Mark section as seen when data loads (for badge clearing)
  useAutoMarkSeen('all_orders', isFetched && !isLoading);

  // Duplicate filter state
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = selectedStatus === 'all' || order.order_status === selectedStatus;
      const matchesDelivery = selectedDelivery === 'all' || order.delivery_location === selectedDelivery;
      const matchesProduct = selectedProduct === 'all' || order.product_id === selectedProduct;
      const matchesSalesPerson = selectedSalesPerson === 'all' || order.sales_person_id === selectedSalesPerson;
      // Check for duplicate - either order is_duplicate or linked lead is_duplicate
      const orderIsDuplicate = (order as any).is_duplicate === true || (order.leads as any)?.is_duplicate === true;
      const matchesDuplicate = !showDuplicatesOnly || orderIsDuplicate;
      // Check for reference ID search
      const matchesRefId = isReferenceIdSearch(search) && matchesReferenceId(order.leads?.reference_id, search);
      
      const matchesSearch =
        !search ||
        matchesRefId ||
        order.leads?.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        order.leads?.contact_number?.includes(search) ||
        order.logistic_order_id?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesDelivery && matchesProduct && matchesSalesPerson && matchesDuplicate && matchesSearch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, selectedStatus, selectedDelivery, selectedProduct, selectedSalesPerson, showDuplicatesOnly, search]);

  // Count duplicates - check both order and linked lead is_duplicate
  const duplicateOrderCount = orders.filter((o: any) => o.is_duplicate === true || o.leads?.is_duplicate === true).length;

  // Order Summary - grouped by product for CONFIRMED orders
  const orderSummary = useMemo(() => {
    // Determine which status to filter for summary
    // If status filter is set to a specific status, use that; otherwise default to CONFIRMED
    const summaryStatus = selectedStatus !== 'all' ? selectedStatus : 'CONFIRMED';
    
    // Filter orders for summary (same filters as main table but with specific status)
    const summaryOrders = orders.filter((order) => {
      const matchesStatus = order.order_status === summaryStatus;
      const matchesDelivery = selectedDelivery === 'all' || order.delivery_location === selectedDelivery;
      const matchesProduct = selectedProduct === 'all' || order.product_id === selectedProduct;
      const matchesSalesPerson = selectedSalesPerson === 'all' || order.sales_person_id === selectedSalesPerson;
      const matchesSearch =
        !search ||
        order.leads?.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        order.leads?.contact_number?.includes(search);
      return matchesStatus && matchesDelivery && matchesProduct && matchesSalesPerson && matchesSearch;
    });

    // Group by product - now supports multi-product orders via order_items
    const productMap = new Map<string, OrderSummaryItem>();
    
    summaryOrders.forEach((order) => {
      const orderItemsList = (order as any).order_items || [];
      
      if (orderItemsList.length > 0) {
        // Multi-product order: aggregate each item
        orderItemsList.forEach((item: any) => {
          const productId = item.product_id || 'unknown';
          const productName = item.product_name || 'Unknown Product';
          const qty = item.quantity || 1;
          const amount = item.total_price || 0;
          
          if (productMap.has(productId)) {
            const existing = productMap.get(productId)!;
            existing.confirmedQty += qty;
            existing.totalAmount += amount;
          } else {
            productMap.set(productId, {
              productId,
              productName,
              confirmedQty: qty,
              totalAmount: amount,
            });
          }
        });
      } else {
        // Legacy single-product order
        const productId = order.product_id || 'unknown';
        const productName = order.products?.name || 'Unknown Product';
        const qty = order.quantity || 1;
        const amount = (order.amount || 0) * qty;
        
        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.confirmedQty += qty;
          existing.totalAmount += amount;
        } else {
          productMap.set(productId, {
            productId,
            productName,
            confirmedQty: qty,
            totalAmount: amount,
          });
        }
      }
    });

    const items = Array.from(productMap.values()).sort((a, b) => b.confirmedQty - a.confirmedQty);
    const totalQty = items.reduce((sum, item) => sum + item.confirmedQty, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
    
    return {
      items,
      totalQty,
      totalAmount,
      status: summaryStatus,
      orderCount: summaryOrders.length,
    };
  }, [orders, selectedStatus, selectedDelivery, selectedProduct, selectedSalesPerson, search]);

  const getDeliveryLocationLabel = (location: string | null) => {
    if (location === 'INSIDE_VALLEY') return 'Inside Valley';
    if (location === 'OUTSIDE_VALLEY') return 'Outside Valley';
    return '';
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const getSelectedOrders = () => {
    return filteredOrders.filter(o => selectedOrders.has(o.id));
  };

  const handlePrint = () => {
    const selected = getSelectedOrders();
    if (selected.length === 0) {
      toast.error('Please select at least one order to print');
      return;
    }
    setPrintViewOpen(true);
  };

  const handleExportSelected = () => {
    const selected = getSelectedOrders();
    exportOrdersToCSV(selected, `selected_orders_${format(new Date(), 'yyyyMMdd')}.csv`);
  };

  const handleExportCourierFormat = () => {
    const selected = getSelectedOrders();
    exportOrdersToCourierFormat(selected, `courier_orders_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleSubmitToCourier = () => {
    const selected = getSelectedOrders();
    if (selected.length === 0) {
      toast.error('Please select at least one order to submit to courier');
      return;
    }
    setSubmitCourierModalOpen(true);
  };

  const handleCourierSubmitComplete = () => {
    setSelectedOrders(new Set());
  };

  const handleBulkDelete = () => {
    const selected = getSelectedOrders();
    if (selected.length === 0) {
      toast.error('Please select at least one order to delete');
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    const orderIds = Array.from(selectedOrders);
    await bulkDeleteOrders.mutateAsync(orderIds);
    setSelectedOrders(new Set());
    setDeleteConfirmOpen(false);
  };

  const exportCSV = () => {
    exportOrdersToCSV(filteredOrders, `orders_${dateFrom}_to_${dateTo}.csv`);
  };

  const exportSummaryCSV = () => {
    if (orderSummary.items.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['Product', 'Confirmed Qty', 'Total Amount (NPR)'];
    const rows = orderSummary.items.map((item) => [
      item.productName,
      item.confirmedQty,
      item.totalAmount,
    ]);
    rows.push(['Total', orderSummary.totalQty, orderSummary.totalAmount]);
    
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order_summary_${orderSummary.status}_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Summary exported successfully');
  };

  const exportOrdersToCSV = (orders: typeof filteredOrders, filename: string) => {
    const headers = ['Date', 'Client', 'Contact', 'Products', 'Qty', 'Amount', 'Delivery Location', 'Branch', 'Address', 'Order Status', 'Payment', 'Confirmed By'];
    const rows = orders.map((order) => {
      // Get staff name - prefer confirmed_by_profile, then created_by_staff, then sales_person
      const confirmedByName = (order as any).confirmed_by_profile?.name || (order as any).created_by_staff?.name || order.sales_person?.name || '-';
      
      // Handle multi-product orders
      const orderItemsList = (order as any).order_items || [];
      const productDisplay = orderItemsList.length > 0 
        ? orderItemsList.map((item: any) => `${item.product_name}${item.quantity > 1 ? ` (${item.quantity})` : ''}`).join(', ')
        : `${order.products?.name || '-'}${order.quantity && order.quantity > 1 ? ` (${order.quantity})` : ''}`;
      const totalQty = orderItemsList.length > 0
        ? orderItemsList.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        : order.quantity || 1;
      const totalAmount = orderItemsList.length > 0
        ? orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
        : (order.amount || 0) * (order.quantity || 1);
      
      return [
        order.order_date ? format(new Date(order.order_date), 'yyyy-MM-dd') : '',
        order.leads?.client_name || '',
        order.leads?.contact_number || '',
        productDisplay,
        totalQty,
        totalAmount,
        getDeliveryLocationLabel(order.delivery_location),
        order.destination_branch || '',
        order.full_address || '',
        order.order_status || '',
        order.payment_status || '',
        confirmedByName,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Orders</h1>
            <p className="text-muted-foreground">View and manage all orders</p>
          </div>
          {duplicateOrderCount > 0 && (
            <Button 
              variant={showDuplicatesOnly ? 'default' : 'outline'} 
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
              className="gap-2 bg-orange-500/10 border-orange-500/30 text-orange-600 hover:bg-orange-500/20 hover:text-orange-700"
            >
              Double Orders ({duplicateOrderCount})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'all')}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="all">All Orders</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {activeTab === 'all' && (
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            )}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PACKED">Packed</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
                <SelectItem value="REDIRECT">Redirect</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDelivery} onValueChange={setSelectedDelivery}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Delivery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deliveries</SelectItem>
                <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[180px]">
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
            <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sales Person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by client or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedOrders.size > 0 && (
        <OrderBulkActions
          selectedCount={selectedOrders.size}
          onPrint={handlePrint}
          onDelete={handleBulkDelete}
          onExport={handleExportSelected}
          onExportCourier={handleExportCourierFormat}
          onSubmitToCourier={handleSubmitToCourier}
        />
      )}

      {/* Order Summary Card */}
      {orderSummary.items.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="w-5 h-5 text-primary" />
                Order Summary ({orderSummary.status} Orders)
              </CardTitle>
              <Button onClick={exportSummaryCSV} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Summary
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {orderSummary.orderCount} orders grouped by product
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold text-right">Confirmed Qty</TableHead>
                    <TableHead className="font-semibold text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderSummary.items.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">{item.confirmedQty}</TableCell>
                      <TableCell className="text-right">NPR {item.totalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/30">
                    <TableCell className="font-bold text-primary">Total</TableCell>
                    <TableCell className="text-right font-bold text-primary">{orderSummary.totalQty}</TableCell>
                    <TableCell className="text-right font-bold text-primary">NPR {orderSummary.totalAmount.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No orders message for summary */}
      {orderSummary.items.length === 0 && filteredOrders.length === 0 && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            No orders found for current filters.
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {activeTab === 'today' ? "Today's Orders" : 'Orders'} ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header w-[50px]">
                    <Checkbox
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all orders"
                    />
                  </TableHead>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Client</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Products</TableHead>
                  <TableHead className="table-header text-right">Amount</TableHead>
                  <TableHead className="table-header">Delivery</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Order Status</TableHead>
                  <TableHead className="table-header">Payment</TableHead>
                  <TableHead className="table-header">Confirmed By</TableHead>
                  <TableHead className="table-header w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const orderItemsList = (order as any).order_items || [];
                  const productDisplay = orderItemsList.length > 0 
                    ? orderItemsList.map((item: any) => `${item.product_name}${item.quantity > 1 ? ` (${item.quantity})` : ''}`).join(', ')
                    : `${order.products?.name || '-'}${order.quantity && order.quantity > 1 ? ` (${order.quantity})` : ''}`;
                  const totalAmount = orderItemsList.length > 0
                    ? orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
                    : (order.amount || 0) * (order.quantity || 1);
                  
                  return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                        aria-label={`Select order ${order.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <FormattedDate date={order.order_date} />
                    </TableCell>
                    <TableCell 
                      className="font-medium text-primary hover:underline"
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      {order.leads?.client_name || '-'}
                    </TableCell>
                    <TableCell>{order.leads?.contact_number || '-'}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="line-clamp-2">{productDisplay}</span>
                    </TableCell>
                    <TableCell className="text-right">Rs. {totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={order.delivery_location === 'INSIDE_VALLEY' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'}>
                        {getDeliveryLocationLabel(order.delivery_location) || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.destination_branch || '-'}</TableCell>
                    <TableCell 
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      <Badge 
                        variant="outline" 
                        className={`${orderStatusColors[order.order_status || 'CONFIRMED']} cursor-pointer hover:opacity-80`}
                      >
                        {order.order_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={paymentStatusColors[order.payment_status || 'COD']}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Show who confirmed/created the order - prefer confirmed_by_profile, then created_by_staff, then sales_person */}
                      {(() => {
                        const confirmedByName = (order as any).confirmed_by_profile?.name || (order as any).created_by_staff?.name || order.sales_person?.name;
                        if (confirmedByName) {
                          return (
                            <span className="text-sm font-medium text-foreground">
                              {confirmedByName}
                            </span>
                          );
                        }
                        return <span className="text-muted-foreground">—</span>;
                      })()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingOrder(order);
                            setEditSheetOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                          title="Edit Order"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deletingOrderId === order.id}
                                title="Delete Order"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the order for {order.leads?.client_name || 'this customer'}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
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
      </Card>

      {/* Old Courier Modal (keep for backwards compatibility) */}
      <SendToCourierModal
        open={courierModalOpen}
        onOpenChange={setCourierModalOpen}
        orders={getSelectedOrders()}
        onSubmit={handleCourierSubmitComplete}
      />

      {/* New Submit to Courier Modal */}
      <SubmitToCourierModal
        open={submitCourierModalOpen}
        onOpenChange={setSubmitCourierModalOpen}
        selectedOrderIds={Array.from(selectedOrders)}
        onSuccess={handleCourierSubmitComplete}
      />

      {/* Bulk Print View */}
      {printViewOpen && (
        <div className="fixed inset-0 bg-background z-50 overflow-auto">
          <BulkPrintView orders={getSelectedOrders()} />
          <button
            onClick={() => setPrintViewOpen(false)}
            className="no-print fixed top-4 right-4 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          >
            Close
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedOrders.size} order(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteOrders.isPending}
            >
              {bulkDeleteOrders.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Edit Order Sheet */}
      <AdminEditOrderSheet
        order={editingOrder}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSuccess={() => setEditingOrder(null)}
      />
    </div>
  );
}