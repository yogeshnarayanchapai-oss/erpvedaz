import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Package, User, MapPin, CreditCard, Truck, ChevronLeft, ChevronRight, Download, RefreshCw, XCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrderDetail } from '@/hooks/useOrders';
import { useOrderItems } from '@/hooks/useOrderItems';
import { useQueryClient } from '@tanstack/react-query';
import { OrderCommentsSection } from '@/components/orders/OrderCommentsSection';
import { OrderHistoryTimeline } from '@/components/orders/OrderHistoryTimeline';
import { OrderEventsTimeline } from '@/components/orders/OrderEventsTimeline';
import { UpdateOrderStatusModal } from '@/components/orders/UpdateOrderStatusModal';
import { AssignCourierModal } from '@/components/orders/AssignCourierModal';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';
import { PrintInvoiceView } from '@/components/orders/PrintInvoiceView';
import { CopyOrderButton } from '@/components/orders/CopyOrderButton';
import { handleOrderStatusChange } from '@/services/orderStatusService';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportOrderHistoryToCSV } from '@/services/orderService';

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

export default function AdminOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useOrderDetail(orderId!);
  const { data: orderItems = [] } = useOrderItems(orderId);
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [assignCourierOpen, setAssignCourierOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  const handleCancelOrder = async (reason: string) => {
    if (!orderId) return;
    setIsCancelling(true);
    try {
      const result = await handleOrderStatusChange(orderId, 'CANCELLED', { cancellationReason: reason });
      if (result.success) {
        toast.success('Order cancelled successfully');
        if (result.salesRecordCreated) {
          toast.info('Sales reversal record created');
        }
        queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-events', orderId] });
        setCancelModalOpen(false);
      } else {
        toast.error(result.error || 'Failed to cancel order');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => window.print(), 100);
  };

  const handleExportHistory = async () => {
    try {
      const csv = await exportOrderHistoryToCSV(orderId!);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order?.order_number || orderId}-history.csv`;
      a.click();
      toast.success('Order history exported successfully');
    } catch (error) {
      toast.error('Failed to export order history');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Order not found</p>
        <Button onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const subtotal = order.amount || 0;
  const deliveryCharge = 0;
  const discount = 0;
  const total = subtotal + deliveryCharge - discount;

  const customerName = order.leads?.client_name || order.customers?.customer_name || 'N/A';
  const customerPhone = order.leads?.contact_number || order.customers?.phone_number || 'N/A';
  const customerEmail = order.customers?.email || 'N/A';
  const customerAddress = order.full_address || order.leads?.full_address || order.customers?.full_address || 'N/A';
  const customerCity = order.customers?.city || order.branches?.district || 'N/A';

  // Show print view if requested
  if (showPrintView) {
    return <PrintInvoiceView order={order} orderItems={orderItems} />;
  }

  return (
    <div className="space-y-6 p-6 print:p-0 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/orders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                Order #{order.order_number}
              </h1>
              {order.leads?.reference_id && (
                <Badge variant="outline" className="text-base font-mono bg-primary/10 text-primary border-primary/30">
                  Lead #{order.leads.reference_id}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>Created: {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setUpdateStatusOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Status
          </Button>
          <Button variant="outline" onClick={() => setAssignCourierOpen(true)}>
            <Truck className="h-4 w-4 mr-2" />
            Assign Courier
          </Button>
          {order.order_status !== 'CANCELLED' && (
            <Button variant="destructive" onClick={() => setCancelModalOpen(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Order
            </Button>
          )}
          <CopyOrderButton
            customerName={customerName}
            phone={customerPhone}
            address={customerAddress}
            orderItems={orderItems.length > 0 ? orderItems : [{ product_name: order.products?.name || 'Product', quantity: order.quantity || 1 }]}
            totalAmount={order.amount || 0}
            paymentMethod={order.payment_status || 'COD'}
            orderBy={(order as any).created_by_staff?.name || (order as any).sales_person?.name || 'N/A'}
            deliveryLocation={order.delivery_location}
            branch={order.destination_branch || order.branches?.branch_name}
          />
          <Button variant="outline" size="icon" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportHistory}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Pills Row */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <Badge 
          variant="outline" 
          className={orderStatusColors[order.order_status || 'CONFIRMED']}
          style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
        >
          {order.order_status || 'PENDING'}
        </Badge>
        <Badge 
          variant="outline" 
          className={paymentStatusColors[order.payment_status || 'COD']}
          style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
        >
          {order.payment_status || 'UNPAID'}
        </Badge>
        <Badge variant={order.is_cod ? 'secondary' : 'default'}>
          {order.is_cod ? 'COD' : 'Online Payment'}
        </Badge>
        {/* Counted in Sales indicator */}
        <Badge 
          variant="outline"
          className={order.is_counted_in_sales 
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' 
            : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
          }
        >
          {order.is_counted_in_sales ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Counted in Sales</>
          ) : (
            'Not in Sales'
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items - Multi-product support */}
              <div className="space-y-3">
                {orderItems.length > 0 ? (
                  orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Rs. {item.unit_price.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold">Rs. {item.total_price.toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium">{order.products?.name || 'Product'}</p>
                      <p className="text-sm text-muted-foreground">
                        Rs. {order.amount?.toLocaleString()} × {order.quantity}
                      </p>
                    </div>
                    <p className="font-bold">Rs. {subtotal.toLocaleString()}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sub-total</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Charge</span>
                  <span>Rs. {deliveryCharge.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-Rs. {discount.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              <Badge variant={order.is_cod ? 'outline' : 'default'} className="mt-2">
                <CreditCard className="h-3 w-3 mr-1" />
                {order.is_cod ? 'Cash on Delivery' : 'Online Payment'}
              </Badge>
            </CardContent>
          </Card>

          {/* Courier Information */}
          {order.courier_provider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Courier Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{order.courier_provider}</p>
                </div>
                {order.courier_tracking_code && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Code</p>
                    <p className="font-medium font-mono">{order.courier_tracking_code}</p>
                  </div>
                )}
                {order.courier_submitted_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted On</p>
                    <p className="font-medium">
                      {format(new Date(order.courier_submitted_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Customer Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{customerPhone}</p>
                {order.leads?.alt_phone && (
                  <p className="text-sm text-muted-foreground">{order.leads.alt_phone}</p>
                )}
              </div>
              {customerEmail !== 'N/A' && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customerEmail}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </p>
                <p className="font-medium mt-1">{customerAddress}</p>
                <p className="text-sm text-muted-foreground mt-1">{customerCity}</p>
              </div>
              {order.delivery_notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Order Note</p>
                    <p className="text-sm mt-1">{order.delivery_notes}</p>
                  </div>
                </>
              )}
              {order.customer_id && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/admin/customers/${order.customer_id}`)}
                  >
                    View Customer Profile
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs - Comments, Events & History */}
      <Card className="print:hidden">
        <Tabs defaultValue="events">
          <TabsList className="ml-6">
            <TabsTrigger value="events">Order Events</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="history">Status History</TabsTrigger>
          </TabsList>
          <TabsContent value="events" className="p-6">
            <OrderEventsTimeline orderId={order.id} />
          </TabsContent>
          <TabsContent value="comments" className="p-6">
            <OrderCommentsSection orderId={order.id} />
          </TabsContent>
          <TabsContent value="history" className="p-6">
            <OrderHistoryTimeline orderId={order.id} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Modals */}
      <UpdateOrderStatusModal
        open={updateStatusOpen}
        onOpenChange={setUpdateStatusOpen}
        orderId={order.id}
        currentOrderStatus={order.order_status}
        currentPaymentStatus={order.payment_status}
      />
      <AssignCourierModal
        open={assignCourierOpen}
        onOpenChange={setAssignCourierOpen}
        orderId={order.id}
        codAmount={total}
      />
      <CancelOrderModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        isCountedInSales={order.is_counted_in_sales || false}
        orderAmount={order.amount || 0}
        onConfirm={handleCancelOrder}
        isLoading={isCancelling}
      />
    </div>
  );
}
