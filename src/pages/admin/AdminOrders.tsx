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
import { useClientPagination } from '@/hooks/useClientPagination';
import { DataPagination } from '@/components/ui/data-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SendToCourierModal } from '@/components/orders/SendToCourierModal';
import { BulkPrintView } from '@/components/orders/BulkPrintView';
import { BulkStatusUpdateModal } from '@/components/orders/BulkStatusUpdateModal';
import { AdminEditOrderSheet } from '@/components/orders/AdminEditOrderSheet';
import { OrderFiltersCard, DatePreset, DeliveryFilter, OrderStatusFilter, InsideDeliveryStatusFilter } from '@/components/filters/OrderFiltersCard';
import { ShoppingCart, Download, FileSpreadsheet, FileText, ClipboardList, CheckCircle, Pencil, Trash2, MoreHorizontal, Eye, ChevronDown, Printer } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormattedDate } from '@/components/FormattedDate';
import { toast } from 'sonner';
import { exportOrdersToCourierFormat } from '@/services/courierExportService';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

interface DateRange {
  from: Date;
  to: Date;
}

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
  
  // Date preset state using shared DatePreset type
  const [datePreset, setDatePreset] = useState<DatePreset>(() => {
    if (initialFromParam || initialToParam) {
      const todayStr = format(today, 'yyyy-MM-dd');
      if (initialFromParam === todayStr && initialToParam === todayStr) return 'today';
      return 'custom';
    }
    return 'today';
  });

  const todayStr = format(today, 'yyyy-MM-dd');
  const [customDateFrom, setCustomDateFrom] = useState(todayStr);
  const [customDateTo, setCustomDateTo] = useState(todayStr);

  // Date range computed from preset and custom dates
  const dateRange = useMemo(() => {
    if (datePreset === 'today') return { from: startOfDay(today), to: endOfDay(today) };
    if (datePreset === 'yesterday') return { from: startOfDay(subDays(today, 1)), to: endOfDay(subDays(today, 1)) };
    if (datePreset === 'last30') return { from: startOfDay(subDays(today, 30)), to: endOfDay(today) };
    return { from: startOfDay(new Date(customDateFrom)), to: endOfDay(new Date(customDateTo)) };
  }, [datePreset, today, customDateFrom, customDateTo]);

  // Initialize from URL params
  useEffect(() => {
    if (initialFromParam && initialToParam) {
      setCustomDateFrom(initialFromParam);
      setCustomDateTo(initialToParam);
    }
  }, [initialFromParam, initialToParam]);
  
  const [selectedStatus, setSelectedStatus] = useState<OrderStatusFilter>(() => {
    if (initialStatusParam && ['CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'REDIRECT', 'CANCELLED'].includes(initialStatusParam)) {
      return initialStatusParam as OrderStatusFilter;
    }
    return 'ALL';
  });
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryFilter>('ALL');
  const [selectedInsideDeliveryStatus, setSelectedInsideDeliveryStatus] = useState<InsideDeliveryStatusFilter>('ALL');
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
      const matchesStatus = selectedStatus === 'ALL' || order.order_status === selectedStatus;
      const matchesDelivery = selectedDelivery === 'ALL' || order.delivery_location === selectedDelivery;
      const matchesProduct = selectedProduct === 'all' || order.product_id === selectedProduct;
      const matchesSalesPerson = selectedSalesPerson === 'all' || order.sales_person_id === selectedSalesPerson;
      // Order date filter
      const orderDateStr = order.order_date ? format(new Date(order.order_date), 'yyyy-MM-dd') : null;
      const matchesOrderDate = selectedOrderDate === 'all' || orderDateStr === selectedOrderDate;
      // Inside Valley delivery status filter
      const insideDeliveryStatusVal = (order as any).inside_delivery_status || 'PENDING';
      const matchesInsideDeliveryStatus = selectedInsideDeliveryStatus === 'ALL' || 
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

  // Pagination - 100 per page
  const ordersPaginationKey = `${selectedStatus}|${selectedDelivery}|${selectedInsideDeliveryStatus}|${selectedOrderDate}|${selectedProduct}|${selectedSalesPerson}|${showDuplicatesOnly}|${search}|${filteredOrders.length}`;
  const {
    pagedRows: pagedOrders,
    page: ordersPage,
    setPage: setOrdersPage,
    totalPages: ordersTotalPages,
    total: ordersTotal,
    from: ordersFrom,
    to: ordersTo,
  } = useClientPagination(filteredOrders, 100, ordersPaginationKey);

  // Count duplicates - check both order and linked lead is_duplicate
  const duplicateOrderCount = orders.filter((o: any) => o.is_duplicate === true || o.leads?.is_duplicate === true).length;

  // Order Summary - grouped by product for CONFIRMED orders
  const orderSummary = useMemo(() => {
    // Determine which status to filter for summary
    // If status filter is set to a specific status, use that; otherwise default to CONFIRMED
    const summaryStatus = selectedStatus !== 'ALL' ? selectedStatus : 'CONFIRMED';
    
    // Filter orders for summary (same filters as main table but with specific status)
    const summaryOrders = orders.filter((order) => {
      const matchesStatus = order.order_status === summaryStatus;
      const matchesDelivery = selectedDelivery === 'ALL' || order.delivery_location === selectedDelivery;
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

  const exportPDF = () => {
    exportOrdersToPDF(filteredOrders, `orders_${dateFrom}_to_${dateTo}.pdf`);
  };

  const handleExportSelectedPDF = () => {
    const selected = getSelectedOrders();
    exportOrdersToPDF(selected, `selected_orders_${format(new Date(), 'yyyyMMdd')}.pdf`);
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

  const getOrderExportRows = (orders: typeof filteredOrders) => {
    return orders.map((order) => {
      const confirmedByName = (order as any).confirmed_by_profile?.name || (order as any).created_by_staff?.name || order.sales_person?.name || '-';
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
      const remark = order.delivery_notes || (order.leads as any)?.remark || '';
      
      return {
        date: order.order_date ? format(new Date(order.order_date), 'yyyy-MM-dd') : '',
        client: order.leads?.client_name || '',
        contact: order.leads?.contact_number || '',
        products: productDisplay,
        qty: totalQty,
        amount: totalAmount,
        location: getDeliveryLocationLabel(order.delivery_location),
        branch: order.destination_branch || '',
        address: order.full_address || '',
        status: order.order_status || '',
        payment: order.payment_status || '',
        confirmedBy: confirmedByName,
        remark: remark,
      };
    });
  };

  const exportOrdersToCSV = (orders: typeof filteredOrders, filename: string) => {
    const headers = ['Date', 'Client', 'Contact', 'Products', 'Qty', 'Amount', 'Delivery Location', 'Branch', 'Address', 'Order Status', 'Payment', 'Confirmed By', 'Remarks'];
    const rows = getOrderExportRows(orders).map(r => [
      r.date, r.client, r.contact, r.products, r.qty, r.amount, r.location, r.branch, r.address, r.status, r.payment, r.confirmedBy, r.remark
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDispatchSummaryPDF = (scope: 'OVD' | 'VD' | 'ALL') => {
    const summaryStatus = selectedStatus !== 'ALL' ? selectedStatus : 'CONFIRMED';
    const scopeLabel = scope === 'OVD' ? 'OVD (Outside Valley)' : scope === 'VD' ? 'VD (Inside Valley)' : 'All';
    const titleLabel = scope === 'OVD' ? 'OVD Dispatch Summary' : scope === 'VD' ? 'VD Dispatch Summary' : 'All Dispatch Summary';

    const scopedOrders = orders.filter((order) => {
      const matchesStatus = order.order_status === summaryStatus;
      const matchesScope =
        scope === 'ALL' ||
        (scope === 'OVD' && order.delivery_location === 'OUTSIDE_VALLEY') ||
        (scope === 'VD' && order.delivery_location === 'INSIDE_VALLEY');
      const matchesProduct = selectedProduct === 'all' || order.product_id === selectedProduct;
      const matchesSalesPerson = selectedSalesPerson === 'all' || order.sales_person_id === selectedSalesPerson;
      return matchesStatus && matchesScope && matchesProduct && matchesSalesPerson;
    });

    if (scopedOrders.length === 0) {
      toast.error(`No ${scopeLabel} orders found for current filters`);
      return;
    }

    // Group by the full PACKAGE (combination of all products in one order)
    type PackageItem = { productName: string; qty: number };
    type Row = { packageLabel: string; items: PackageItem[]; orderCount: number; totalPieces: number };
    const groupMap = new Map<string, Row>();

    scopedOrders.forEach((order) => {
      const orderItemsList = Array.isArray((order as any).order_items) ? (order as any).order_items : [];

      // Build the package (one row per order, combining all items)
      const itemMap = new Map<string, number>();
      if (orderItemsList.length > 0) {
        orderItemsList.forEach((item: any) => {
          const name = item.product_name || 'Unknown Product';
          const qty = Number(item.quantity) || 1;
          itemMap.set(name, (itemMap.get(name) || 0) + qty);
        });
      } else {
        const name = order.products?.name || 'Unknown Product';
        const qty = Number(order.quantity) || 1;
        itemMap.set(name, (itemMap.get(name) || 0) + qty);
      }

      // Sort items inside the package alphabetically so identical combos collapse to the same key
      const items: PackageItem[] = Array.from(itemMap.entries())
        .map(([productName, qty]) => ({ productName, qty }))
        .sort((a, b) => a.productName.localeCompare(b.productName));

      const packageLabel = items.map((i) => `${i.productName} (${i.qty} pcs)`).join(' + ');
      const piecesInPackage = items.reduce((s, i) => s + i.qty, 0);
      const key = items.map((i) => `${i.productName}__${i.qty}`).join('||');

      const existing = groupMap.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalPieces += piecesInPackage;
      } else {
        groupMap.set(key, { packageLabel, items, orderCount: 1, totalPieces: piecesInPackage });
      }
    });

    // Sort: single-product packages first, then by package label
    const rows = Array.from(groupMap.values()).sort((a, b) => {
      if (a.items.length !== b.items.length) return a.items.length - b.items.length;
      return a.packageLabel.localeCompare(b.packageLabel);
    });

    const totalOrders = rows.reduce((s, r) => s + r.orderCount, 0);
    const totalPieces = rows.reduce((s, r) => s + r.totalPieces, 0);

    Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([{ jsPDF }, autoTableMod]) => {
      const autoTable = (autoTableMod as any).default || (autoTableMod as any);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFontSize(16);
      doc.text(titleLabel, 14, 16);
      doc.setFontSize(10);
      doc.text(`Scope: ${scopeLabel}  |  Status: ${summaryStatus}`, 14, 23);
      doc.text(`Date: ${dateFrom} to ${dateTo}  |  Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 29);

      const body = rows.map((r) => [
        r.packageLabel,
        `${r.orderCount} order${r.orderCount > 1 ? 's' : ''}`,
        `${r.totalPieces} pcs`,
      ]);

      autoTable(doc, {
        head: [['Package (Products + Qty per Order)', 'Orders', 'Total Pieces']],
        body,
        startY: 35,
        styles: { fontSize: 10, cellPadding: 3, valign: 'middle' },
        headStyles: { fillColor: [41, 128, 185], fontSize: 11, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
        },
        foot: [[
          { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
          { content: `${totalOrders} orders`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [230, 230, 230] } },
          { content: `${totalPieces} pcs`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [230, 230, 230] } },
        ]],
      });

      const fileSlug = scope === 'OVD' ? 'ovd' : scope === 'VD' ? 'vd' : 'all';
      doc.save(`${fileSlug}-dispatch-summary-${dateFrom}-to-${dateTo}.pdf`);
      toast.success(`${titleLabel} PDF downloaded`);
    }).catch((err) => {
      console.error('PDF export failed', err);
      toast.error('Failed to generate PDF');
    });
  };

  const exportOrdersToPDF = (orders: typeof filteredOrders, filename: string) => {
    Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([{ jsPDF }, autoTableMod]) => {
      const autoTable = (autoTableMod as any).default || (autoTableMod as any);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const headers = ['Date', 'Client', 'Contact', 'Products', 'Qty', 'Amount', 'Location', 'Branch', 'Status', 'Remarks'];
      const rows = getOrderExportRows(orders).map(r => [
        r.date, r.client, r.contact, r.products, r.qty, `NPR ${Number(r.amount).toLocaleString()}`, r.location, r.branch, r.status, r.remark
      ]);

      doc.setFontSize(14);
      doc.text(`Orders Report (${dateFrom} to ${dateTo})`, 14, 15);
      doc.setFontSize(9);
      doc.text(`Total: ${orders.length} orders | Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 22);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 27,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], fontSize: 7, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 20 },
          4: { cellWidth: 12, halign: 'center' },
          5: { cellWidth: 22, halign: 'right' },
          9: { cellWidth: 40 },
        },
        didDrawPage: () => {
          doc.setFontSize(7);
          doc.text(`Page ${doc.getNumberOfPages()}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 8);
        },
      });

      doc.save(filename);
      toast.success('PDF exported successfully');
    }).catch((err) => {
      console.error('PDF export failed', err);
      toast.error('Failed to generate PDF');
    });
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

      {/* Filters - Using shared OrderFiltersCard component */}
      <OrderFiltersCard
        searchQuery={search}
        onSearchChange={setSearch}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customDateFrom={customDateFrom}
        onCustomDateFromChange={setCustomDateFrom}
        customDateTo={customDateTo}
        onCustomDateToChange={setCustomDateTo}
        deliveryFilter={selectedDelivery}
        onDeliveryFilterChange={setSelectedDelivery}
        statusFilter={selectedStatus}
        onStatusFilterChange={setSelectedStatus}
        insideDeliveryStatusFilter={selectedInsideDeliveryStatus}
        onInsideDeliveryStatusFilterChange={setSelectedInsideDeliveryStatus}
        productFilter={selectedProduct}
        onProductFilterChange={setSelectedProduct}
        products={products}
        onReset={() => {
          setSearch('');
          setDatePreset('today');
          setCustomDateFrom(todayStr);
          setCustomDateTo(todayStr);
          setSelectedStatus('ALL');
          setSelectedDelivery('ALL');
          setSelectedInsideDeliveryStatus('ALL');
          setSelectedProduct('all');
          setSelectedSalesPerson('all');
        }}
        showStaffFilter={true}
        staffFilter={selectedSalesPerson}
        onStaffFilterChange={setSelectedSalesPerson}
        staff={staff}
      />

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
              {datePreset === 'today' ? "Today's Orders" : 'Orders'}
              {ordersTotal > 0 ? ` (${ordersFrom}–${ordersTo} of ${ordersTotal})` : ' (0)'}
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
                    <DropdownMenuItem onClick={handleExportSelectedPDF}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export PDF
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
            {pagedOrders.map((order) => {
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
                {pagedOrders.map((order) => {
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
          <DataPagination
            page={ordersPage}
            totalPages={ordersTotalPages}
            total={ordersTotal}
            from={ordersFrom}
            to={ordersTo}
            onPageChange={setOrdersPage}
            itemLabel="orders"
          />
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