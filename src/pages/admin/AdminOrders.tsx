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
import { SendToCourierModal } from '@/components/orders/SendToCourierModal';
import { BulkPrintView } from '@/components/orders/BulkPrintView';
import { BulkStatusUpdateModal } from '@/components/orders/BulkStatusUpdateModal';
import { AdminEditOrderSheet } from '@/components/orders/AdminEditOrderSheet';
import { ShoppingCart, Search, Download, FileSpreadsheet, ClipboardList, CheckCircle, Pencil, Trash2, MoreHorizontal, Eye, ChevronDown, Printer, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  
  // Date preset state: 'today', 'all', 'custom'
  const [datePreset, setDatePreset] = useState<'today' | 'all' | 'custom'>(() => {
    if (initialFromParam || initialToParam) {
      const todayStr = format(today, 'yyyy-MM-dd');
      if (initialFromParam === todayStr && initialToParam === todayStr) return 'today';
      return 'custom';
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

  // Update date range when preset changes
  const handleDatePresetChange = (preset: 'today' | 'all' | 'custom') => {
    setDatePreset(preset);
    if (preset === 'today') {
      setDateRange({ from: startOfDay(today), to: endOfDay(today) });
    } else if (preset === 'all') {
      // Set a very wide range for 'all'
      setDateRange({ from: startOfDay(new Date('2020-01-01')), to: endOfDay(today) });
    }
    // 'custom' keeps the current dateRange and shows the DateRangeFilter
  };
  
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusParam || 'all');
  const [selectedDelivery, setSelectedDelivery] = useState<string>('all');
  const [selectedInsideDeliveryStatus, setSelectedInsideDeliveryStatus] = useState<string>('all');
  const [selectedOrderDate, setSelectedOrderDate] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('all');
  const [search, setSearch] = useState('');
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

  // When searching, fetch all orders (ignore date filter)
  const isSearching = search.trim().length > 0;
  const queryDateFrom = isSearching ? '2020-01-01' : dateFrom;
  const queryDateTo = isSearching ? format(new Date(), 'yyyy-MM-dd') : dateTo;

  const { data: orders = [], isLoading, isFetched } = useOrders({ dateFrom: queryDateFrom, dateTo: queryDateTo });
  const { data: products = [] } = useProducts();
  const { data: staff = [] } = useStaff();

  // Mark section as seen when data loads (for badge clearing)
  useAutoMarkSeen('all_orders', isFetched && !isLoading);

  // Duplicate filter state
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Get unique order dates from fetched orders for the filter
  const uniqueOrderDates = useMemo(() => {
    const dates = [...new Set(orders.map(o => o.order_date ? format(new Date(o.order_date), 'yyyy-MM-dd') : null).filter(Boolean))];
    return dates.sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = selectedStatus === 'all' || order.order_status === selectedStatus;
      const matchesDelivery = selectedDelivery === 'all' || order.delivery_location === selectedDelivery;
      const matchesProduct = selectedProduct === 'all' || order.product_id === selectedProduct;
      const matchesSalesPerson = selectedSalesPerson === 'all' || order.sales_person_id === selectedSalesPerson;
      // Order date filter
      const orderDateStr = order.order_date ? format(new Date(order.order_date), 'yyyy-MM-dd') : null;
      const matchesOrderDate = selectedOrderDate === 'all' || orderDateStr === selectedOrderDate;
      // Inside Valley delivery status filter
      const insideDeliveryStatusVal = (order as any).inside_delivery_status || 'PENDING';
      const matchesInsideDeliveryStatus = selectedInsideDeliveryStatus === 'all' || 
        (selectedDelivery === 'INSIDE_VALLEY' && insideDeliveryStatusVal === selectedInsideDeliveryStatus);
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
      return matchesStatus && matchesDelivery && matchesProduct && matchesSalesPerson && matchesDuplicate && matchesSearch && matchesInsideDeliveryStatus && matchesOrderDate;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, selectedStatus, selectedDelivery, selectedInsideDeliveryStatus, selectedOrderDate, selectedProduct, selectedSalesPerson, showDuplicatesOnly, search]);

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
        const amount = order.amount || 0;
        
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
      const orderItemsList = Array.isArray((order as any).order_items) ? (order as any).order_items : [];
      const productDisplay = orderItemsList.length > 0 
        ? orderItemsList.map((item: any) => {
            const qty = item.quantity ?? 1;
            return qty > 0 ? `(${qty}) ${item.product_name}` : item.product_name;
          }).join(', ')
        : (() => {
            const qty = order.quantity ?? 1;
            const baseName = order.products?.name || '-';
            return qty > 0 ? `(${qty}) ${baseName}` : baseName;
          })();
      const totalQty = orderItemsList.length > 0
        ? orderItemsList.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        : order.quantity || 1;
      const totalAmount = orderItemsList.length > 0
        ? orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
        : (order.amount || 0);
      
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
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Orders</h1>
            <p className="text-sm text-muted-foreground">View and manage all orders</p>
          </div>
          {duplicateOrderCount > 0 && (
            <Button 
              variant={showDuplicatesOnly ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
              className="gap-1 bg-orange-500/10 border-orange-500/30 text-orange-600 hover:bg-orange-500/20 hover:text-orange-700 text-xs"
            >
              Duplicates ({duplicateOrderCount})
            </Button>
          )}
        </div>
      </div>


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

      {/* Filters - Single row responsive layout */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={datePreset} onValueChange={(v) => handleDatePresetChange(v as 'today' | 'all' | 'custom')}>
              <SelectTrigger className="w-[110px] h-9 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {datePreset === 'custom' && (
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            )}
            <div className="relative flex-1 min-w-[150px] max-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[120px] shrink-0 h-9 text-xs">
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
              </SelectContent>
            </Select>
            <Select value={selectedDelivery} onValueChange={(val) => {
              setSelectedDelivery(val);
              if (val !== 'INSIDE_VALLEY') setSelectedInsideDeliveryStatus('all');
            }}>
              <SelectTrigger className="w-[120px] shrink-0 h-9 text-xs">
                <SelectValue placeholder="Delivery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery</SelectItem>
                <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
              </SelectContent>
            </Select>
            {selectedDelivery === 'INSIDE_VALLEY' && (
              <Select value={selectedInsideDeliveryStatus} onValueChange={setSelectedInsideDeliveryStatus}>
                <SelectTrigger className="w-[120px] shrink-0 h-9 text-xs">
                  <SelectValue placeholder="Delivery Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="REACHED_CNR">Reached - CNR</SelectItem>
                  <SelectItem value="CUSTOMER_CANCELLED">Customer Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[120px] shrink-0 h-9 text-xs">
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
              <SelectTrigger className="w-[120px] shrink-0 h-9 text-xs">
                <SelectValue placeholder="Staff" />
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
            {(search || datePreset !== 'today' || selectedStatus !== 'all' || selectedDelivery !== 'all' || selectedProduct !== 'all' || selectedSalesPerson !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearch('');
                  setDatePreset('today');
                  setDateRange({ from: startOfDay(today), to: endOfDay(today) });
                  setSelectedStatus('all');
                  setSelectedDelivery('all');
                  setSelectedInsideDeliveryStatus('all');
                  setSelectedProduct('all');
                  setSelectedSalesPerson('all');
                }}
                className="h-9 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
        <CardHeader className="pb-2 md:pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              {datePreset === 'today' ? "Today's Orders" : 'Orders'} ({filteredOrders.length})
              {selectedOrders.size > 0 && (
                <Badge variant="secondary" className="ml-2">{selectedOrders.size} selected</Badge>
              )}
            </CardTitle>
            {selectedOrders.size > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportSelected}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCourierFormat}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Courier Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {/* Mobile card view */}
          <div className="md:hidden space-y-2 p-4 pt-0">
            {filteredOrders.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">
                {isLoading ? 'Loading...' : 'No orders found'}
              </p>
            )}
            {filteredOrders.map((order) => {
              const orderItemsList = Array.isArray((order as any).order_items) ? (order as any).order_items : [];
              const productDisplay = orderItemsList.length > 0 
                ? orderItemsList.map((item: any) => {
                    const qty = item.quantity ?? 1;
                    return qty > 0 ? `(${qty}) ${item.product_name}` : item.product_name;
                  }).join(', ')
                : (() => {
                    const qty = order.quantity ?? 1;
                    const baseName = order.products?.name || '-';
                    return qty > 0 ? `(${qty}) ${baseName}` : baseName;
                  })();
              const totalAmount = orderItemsList.length > 0
                ? orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
                : (order.amount || 0);
              const confirmedByName = (order as any).confirmed_by_profile?.name || (order as any).created_by_staff?.name || order.sales_person?.name || '-';
              const mobileInsideDeliveryStatus = (order as any).inside_delivery_status || 'PENDING';
              
              return (
                <Card 
                  key={order.id} 
                  className="p-3 cursor-pointer active:bg-muted/50"
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{order.leads?.client_name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{order.leads?.contact_number || '-'}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${orderStatusColors[order.order_status || 'CONFIRMED']} shrink-0 text-xs`}
                    >
                      {order.order_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{productDisplay}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-muted-foreground">Amount</span>
                      <p className="font-medium">Rs. {totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date</span>
                      <p className="font-medium"><FormattedDate date={order.order_date} /></p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">By</span>
                      <p className="font-medium truncate">{confirmedByName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline" className={order.delivery_location === 'INSIDE_VALLEY' ? 'bg-success/10 text-success text-xs' : 'bg-info/10 text-info text-xs'}>
                        {order.delivery_location === 'INSIDE_VALLEY' ? 'IV' : 'OV'}
                      </Badge>
                      {order.delivery_location === 'INSIDE_VALLEY' && (
                        <Badge 
                          variant="outline" 
                          className={`${insideDeliveryStatusColors[mobileInsideDeliveryStatus] || 'bg-muted/50 text-muted-foreground'} text-xs`}
                        >
                          {insideDeliveryStatusLabels[mobileInsideDeliveryStatus] || mobileInsideDeliveryStatus}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`${paymentStatusColors[order.payment_status || 'COD']} text-xs`}>
                        {order.payment_status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingOrder(order);
                          setEditSheetOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
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
                  <TableHead className="table-header">Delivery Status</TableHead>
                  <TableHead className="table-header">Payment</TableHead>
                  <TableHead className="table-header">Confirmed By</TableHead>
                  <TableHead className="table-header w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const orderItemsList = Array.isArray((order as any).order_items) ? (order as any).order_items : [];
                  const productDisplay = orderItemsList.length > 0 
                    ? orderItemsList.map((item: any) => {
                        const qty = item.quantity ?? 1;
                        return qty > 0 ? `(${qty}) ${item.product_name}` : item.product_name;
                      }).join(', ')
                    : (() => {
                        const qty = order.quantity ?? 1;
                        const baseName = order.products?.name || '-';
                        return qty > 0 ? `(${qty}) ${baseName}` : baseName;
                      })();
                  const totalAmount = orderItemsList.length > 0
                    ? orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
                    : (order.amount || 0);
                  const insideDeliveryStatus = (order as any).inside_delivery_status || 'PENDING';
                  
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {order.delivery_location === 'INSIDE_VALLEY' ? (
                        (effectiveRole === 'ADMIN' || effectiveRole === 'OWNER') ? (
                          <Select 
                            value={insideDeliveryStatus} 
                            onValueChange={async (val) => {
                              try {
                                const { error } = await supabase
                                  .from('orders')
                                  .update({ inside_delivery_status: val })
                                  .eq('id', order.id);
                                if (error) throw error;
                                toast.success('Delivery status updated');
                                queryClient.invalidateQueries({ queryKey: ['orders'] });
                              } catch (error: any) {
                                toast.error(`Failed to update: ${error.message}`);
                              }
                            }}
                          >
                            <SelectTrigger className={`w-[140px] h-8 text-xs ${insideDeliveryStatusColors[insideDeliveryStatus] || ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="REACHED_CNR">Reached - CNR</SelectItem>
                              <SelectItem value="CUSTOMER_CANCELLED">Customer Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className={insideDeliveryStatusColors[insideDeliveryStatus] || 'bg-muted/50 text-muted-foreground'}
                          >
                            {insideDeliveryStatusLabels[insideDeliveryStatus] || insideDeliveryStatus}
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={paymentStatusColors[order.payment_status || 'COD']}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/orders/${order.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingOrder(order);
                            setEditSheetOpen(true);
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setDeletingOrderId(order.id);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No orders found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Courier Modal */}
      <SendToCourierModal
        open={courierModalOpen}
        onOpenChange={setCourierModalOpen}
        orders={getSelectedOrders()}
        onSubmit={() => setSelectedOrders(new Set())}
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
      <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => {
        setDeleteConfirmOpen(open);
        if (!open) setDeletingOrderId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingOrderId ? 'Order' : 'Orders'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingOrderId 
                ? 'This will delete this order. This action cannot be undone.'
                : `Are you sure you want to delete ${selectedOrders.size} order(s)? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingOrderId) {
                  handleDeleteOrder(deletingOrderId);
                  setDeleteConfirmOpen(false);
                } else {
                  confirmBulkDelete();
                }
              }}
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