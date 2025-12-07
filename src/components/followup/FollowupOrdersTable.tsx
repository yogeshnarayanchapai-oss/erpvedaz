import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eye, RotateCcw, Package } from 'lucide-react';
import { useFollowupOrders, useRedirectOrder } from '@/hooks/useFollowupOrders';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FollowupOrdersTableProps {
  dateFrom: string;
  dateTo: string;
}

export function FollowupOrdersTable({ dateFrom, dateTo }: FollowupOrdersTableProps) {
  const { user, profile } = useAuth();
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [redirectRemark, setRedirectRemark] = useState('');

  // Fetch all orders for date range, filter client-side for realtime to work properly
  const { data: allOrders = [], isLoading } = useFollowupOrders({
    dateFrom,
    dateTo,
  });

  // Client-side filtering
  const orders = useMemo(() => {
    return allOrders.filter((order) => {
      const matchesDelivery = deliveryFilter === 'all' || order.delivery_location === deliveryFilter;
      const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
      return matchesDelivery && matchesStatus;
    });
  }, [allOrders, deliveryFilter, statusFilter]);

  const redirectOrder = useRedirectOrder();

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Follow-up Orders
            </CardTitle>
            <div className="flex items-center gap-2">
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
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REDIRECT">Redirect</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Client</TableHead>
                  <TableHead className="table-header">Contact</TableHead>
                  <TableHead className="table-header">Product</TableHead>
                  <TableHead className="table-header">Delivery</TableHead>
                  <TableHead className="table-header">Branch</TableHead>
                  <TableHead className="table-header">Staff</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header">Remark</TableHead>
                  <TableHead className="table-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {orders.map((order) => {
                  // Get client name and contact from leads or customers (handle both object and array responses)
                  const leadsData = Array.isArray(order.leads) ? order.leads[0] : order.leads;
                  const customersData = Array.isArray((order as any).customers) ? (order as any).customers[0] : (order as any).customers;
                  const clientName = leadsData?.client_name || customersData?.customer_name || '-';
                  const contactNumber = leadsData?.contact_number || customersData?.phone_number || '-';
                  
                  return (
                  <TableRow key={order.id}>
                    <TableCell className="text-muted-foreground">
                      {order.order_date ? format(new Date(order.order_date), 'dd MMM') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {clientName}
                    </TableCell>
                    <TableCell>{contactNumber}</TableCell>
                    <TableCell>{(order.products as any)?.name || '-'}</TableCell>
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
                    <TableCell className="max-w-[200px] truncate">
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
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No orders found'}
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
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{(() => {
                    const leadsData = Array.isArray(selectedOrder.leads) ? selectedOrder.leads[0] : selectedOrder.leads;
                    const customersData = Array.isArray((selectedOrder as any).customers) ? (selectedOrder as any).customers[0] : (selectedOrder as any).customers;
                    return leadsData?.client_name || customersData?.customer_name || '-';
                  })()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="font-medium">{(() => {
                    const leadsData = Array.isArray(selectedOrder.leads) ? selectedOrder.leads[0] : selectedOrder.leads;
                    const customersData = Array.isArray((selectedOrder as any).customers) ? (selectedOrder as any).customers[0] : (selectedOrder as any).customers;
                    return leadsData?.contact_number || customersData?.phone_number || '-';
                  })()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-medium">{(selectedOrder.products as any)?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">Rs. {selectedOrder.amount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery</p>
                  {getDeliveryBadge(selectedOrder.delivery_location)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.order_status)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{(() => {
                    const leadsData = Array.isArray(selectedOrder.leads) ? selectedOrder.leads[0] : selectedOrder.leads;
                    return selectedOrder.full_address || leadsData?.full_address || '-';
                  })()}</p>
                </div>
              </div>

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

              {selectedOrder.delivery_location === 'INSIDE_VALLEY' && selectedOrder.order_status !== 'REDIRECT' && (
                <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                  Inside Valley orders cannot be redirected
                </div>
              )}

              {selectedOrder.order_status === 'REDIRECT' && (
                <div className="p-4 bg-destructive/10 rounded-lg text-center text-destructive">
                  This order has already been redirected
                  {(selectedOrder.redirected_by as any)?.name && (
                    <span className="block text-sm mt-1">
                      by {(selectedOrder.redirected_by as any).name}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
