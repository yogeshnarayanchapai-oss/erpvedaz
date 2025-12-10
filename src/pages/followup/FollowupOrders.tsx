import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, RotateCcw, Package, Search, MapPin, Globe, RefreshCw, Upload, Download } from 'lucide-react';
import { useFollowupOrders, useRedirectOrder } from '@/hooks/useFollowupOrders';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ImportOrdersDialog } from '@/components/orders/ImportOrdersDialog';
import { matchesReferenceId, isReferenceIdSearch } from '@/lib/referenceIdSearch';

export default function FollowupOrders() {
  const { user, profile } = useAuth();
  const today = new Date();
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  
  // Calculate date range based on view mode
  const dateFrom = viewMode === 'today' 
    ? format(startOfDay(today), 'yyyy-MM-dd')
    : format(subDays(today, 365), 'yyyy-MM-dd'); // Last year for "all"
  const dateTo = format(endOfDay(today), 'yyyy-MM-dd');

  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [redirectRemark, setRedirectRemark] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Fetch all today's orders (no server-side filtering for delivery/status)
  // Enable sound notifications for new orders
  const { data: orders = [], isLoading, isFetching } = useFollowupOrders({
    dateFrom,
    dateTo,
  }, true);

  const redirectOrder = useRedirectOrder();

  // Calculate stats from all orders (before filters)
  const stats = useMemo(() => {
    const total = orders.length;
    const inside = orders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length;
    const outside = orders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length;
    const redirected = orders.filter(o => o.order_status === 'REDIRECT').length;
    return { total, inside, outside, redirected };
  }, [orders]);

  // Filter orders client-side
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesDelivery = deliveryFilter === 'all' || order.delivery_location === deliveryFilter;
      const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
      
      // Check for reference ID search
      const matchesRefId = isReferenceIdSearch(search) && matchesReferenceId((order.leads as any)?.reference_id, search);
      
      const matchesSearch = !search || 
        matchesRefId ||
        (order.leads as any)?.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        (order.leads as any)?.contact_number?.includes(search) ||
        order.destination_branch?.toLowerCase().includes(search.toLowerCase());
      return matchesDelivery && matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, deliveryFilter, statusFilter, search]);

  const getDeliveryBadge = (location: string | null) => {
    if (location === 'INSIDE_VALLEY') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Inside Valley</Badge>;
    }
    if (location === 'OUTSIDE_VALLEY') {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Outside Valley</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    const statusStyles: Record<string, string> = {
      CONFIRMED: 'bg-green-50 text-green-700 border-green-200',
      REDIRECT: 'bg-red-50 text-red-700 border-red-200',
      CANCELLED: 'bg-gray-50 text-gray-700 border-gray-200',
      PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
      FOLLOW_UP: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      CALL_NOT_RECEIVED: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return (
      <Badge variant="outline" className={statusStyles[status || ''] || ''}>
        {status?.replace('_', ' ') || 'Unknown'}
      </Badge>
    );
  };

  const canRedirect = (order: any) => {
    return order.delivery_location === 'OUTSIDE_VALLEY' && order.order_status !== 'REDIRECT';
  };

  const handleOpenEdit = (order: any) => {
    setSelectedOrder(order);
    setRedirectRemark(order.delivery_notes || '');
    setIsEditOpen(true);
  };

  const handleRedirect = async () => {
    if (!selectedOrder || !user || !profile) return;

    try {
      await redirectOrder.mutateAsync({
        orderId: selectedOrder.id,
        remark: redirectRemark,
        userId: user.id,
        userName: profile.name,
      });
      toast.success('Order redirected successfully');
      setIsEditOpen(false);
      setSelectedOrder(null);
      setRedirectRemark('');
    } catch (error) {
      toast.error('Failed to redirect order');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {viewMode === 'today' ? "Today's Orders" : "All Orders"}
          </h1>
          <p className="text-muted-foreground">
            {viewMode === 'today' ? "View and redirect today's orders" : "View all orders"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'today' | 'all')}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="all">All Orders</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setImportDialogOpen(true)} variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          {isFetching && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Updating...</span>
            </div>
          )}
        </div>
      </div>

      <ImportOrdersDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        portalType="FOLLOWUP"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inside Valley</p>
                <p className="text-2xl font-bold">{stats.inside}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Globe className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outside Valley</p>
                <p className="text-2xl font-bold">{stats.outside}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <RotateCcw className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Redirected</p>
                <p className="text-2xl font-bold">{stats.redirected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Orders - {format(today, 'dd MMM yyyy')}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Live updates enabled)
              </span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search client, phone, branch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Delivery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deliveries</SelectItem>
                  <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                  <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                  <SelectItem value="CALL_NOT_RECEIVED">CNR</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REDIRECT">Redirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Date & Time</TableHead>
                  <TableHead className="table-header">Client</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Products</TableHead>
                  <TableHead className="table-header">Amount</TableHead>
                  <TableHead className="table-header">Delivery</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Staff</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Remark</TableHead>
                  <TableHead className="table-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const orderItemsList = (order as any).order_items || [];
                  const productDisplay = orderItemsList.length > 0 
                    ? orderItemsList.map((item: any) => `${item.product_name} x${item.quantity}`).join(', ')
                    : `${(order.products as any)?.name || '-'} x${order.quantity || 1}`;
                  const totalAmount = orderItemsList.length > 0
                    ? orderItemsList.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
                    : order.amount || 0;
                  
                  // Get client name and contact from leads or customers
                  const clientName = (order.leads as any)?.client_name || (order as any).customers?.customer_name || '-';
                  const contactNumber = (order.leads as any)?.contact_number || (order as any).customers?.phone_number || '-';
                  
                  return (
                  <TableRow key={order.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {order.order_date ? format(new Date(order.order_date), 'dd MMM HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {clientName}
                    </TableCell>
                    <TableCell>{contactNumber}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="line-clamp-2">{productDisplay}</span>
                    </TableCell>
                    <TableCell>Rs. {totalAmount.toLocaleString()}</TableCell>
                    <TableCell>{getDeliveryBadge(order.delivery_location)}</TableCell>
                    <TableCell>{order.destination_branch || '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const confirmedBy = Array.isArray((order as any).confirmed_by_profile) 
                          ? (order as any).confirmed_by_profile[0] 
                          : (order as any).confirmed_by_profile;
                        const salesPerson = Array.isArray(order.profiles) 
                          ? (order.profiles as any)[0] 
                          : order.profiles;
                        return confirmedBy?.name || salesPerson?.name || '-';
                      })()}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.order_status)}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {order.delivery_notes || '-'}
                      {order.redirected_by_user_id && (order.redirected_by as any)?.name && (
                        <span className="block text-xs text-destructive mt-1">
                          Redirected by: {(order.redirected_by as any).name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(order)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canRedirect(order) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(order)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Redirect Order"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No orders found for today'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Redirect Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          {selectedOrder && (() => {
            const dialogOrderItems = (selectedOrder as any).order_items || [];
            const dialogProductDisplay = dialogOrderItems.length > 0 
              ? dialogOrderItems.map((item: any) => `${item.product_name} x${item.quantity}`).join(', ')
              : `${(selectedOrder.products as any)?.name || '-'} x${selectedOrder.quantity || 1}`;
            const dialogTotalAmount = dialogOrderItems.length > 0
              ? dialogOrderItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
              : selectedOrder.amount || 0;
            
            return (
            <div className="space-y-6">
              {/* Read-only fields */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{(selectedOrder.leads as any)?.client_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="font-medium">{(selectedOrder.leads as any)?.contact_number || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="font-medium">{dialogProductDisplay}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">Rs. {dialogTotalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery</p>
                  {getDeliveryBadge(selectedOrder.delivery_location)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Branch</p>
                  <p className="font-medium">{selectedOrder.destination_branch || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calling Staff</p>
                  <p className="font-medium">
                    {(() => {
                      const confirmedBy = Array.isArray((selectedOrder as any).confirmed_by_profile) 
                        ? (selectedOrder as any).confirmed_by_profile[0] 
                        : (selectedOrder as any).confirmed_by_profile;
                      const salesPerson = Array.isArray(selectedOrder.profiles) 
                        ? (selectedOrder.profiles as any)[0] 
                        : selectedOrder.profiles;
                      return confirmedBy?.name || salesPerson?.name || '-';
                    })()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  {getStatusBadge(selectedOrder.order_status)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{selectedOrder.full_address || (selectedOrder.leads as any)?.full_address || '-'}</p>
                </div>
              </div>

              {/* Redirect action for Outside Valley only */}
              {canRedirect(selectedOrder) && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Redirect Remark</Label>
                    <Textarea
                      placeholder="Add reason for redirecting this order..."
                      value={redirectRemark}
                      onChange={(e) => setRedirectRemark(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleRedirect}
                    className="w-full bg-destructive hover:bg-destructive/90"
                    disabled={redirectOrder.isPending}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Mark as Redirect
                  </Button>
                </div>
              )}

              {/* Message for Inside Valley orders */}
              {selectedOrder.delivery_location === 'INSIDE_VALLEY' && selectedOrder.order_status !== 'REDIRECT' && (
                <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                  <MapPin className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  Inside Valley orders cannot be redirected from this portal
                </div>
              )}

              {/* Already redirected message */}
              {selectedOrder.order_status === 'REDIRECT' && (
                <div className="p-4 bg-destructive/10 rounded-lg text-center text-destructive">
                  <RotateCcw className="w-6 h-6 mx-auto mb-2" />
                  This order has already been redirected
                  {(selectedOrder.redirected_by as any)?.name && (
                    <span className="block text-sm mt-1">
                      by {(selectedOrder.redirected_by as any).name}
                    </span>
                  )}
                </div>
              )}
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
