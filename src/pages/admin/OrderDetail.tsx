import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Printer, Package, User, MapPin, CreditCard, Truck, 
  Copy, Phone, Edit, FileDown, Clock, CheckCircle2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { OrderCommentsSection } from '@/components/orders/OrderCommentsSection';
import { OrderHistoryTimeline } from '@/components/orders/OrderHistoryTimeline';
import { UpdateOrderStatusModal } from '@/components/orders/UpdateOrderStatusModal';
import { AssignCourierModal } from '@/components/orders/AssignCourierModal';
import { PrintInvoiceView } from '@/components/orders/PrintInvoiceView';
import { CopyOrderButton } from '@/components/orders/CopyOrderButton';
import { GaaubesiLogisticsCard } from '@/components/logistics/GaaubesiLogisticsCard';
import { useOrderHistory, exportOrderHistoryToCSV, OrderHistoryEvent } from '@/hooks/useOrderHistory';
import { useOrderItems } from '@/hooks/useOrderItems';

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orderItems = [] } = useOrderItems(orderId);

  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [assignCourierModalOpen, setAssignCourierModalOpen] = useState(false);
  const [printViewOpen, setPrintViewOpen] = useState(false);

    const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          leads:lead_id(
            client_name,
            contact_number,
            alt_phone,
            full_address,
            reference_id
          ),
          products:product_id(name),
          sales_person:sales_person_id(name),
          created_by_staff:created_by_staff_id(name),
          branches:branch_id(branch_name, district, province)
        `)
        .eq('id', orderId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const { data: orderHistory = [] } = useOrderHistory(orderId || '');

  const handleCallCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handlePrintInvoice = () => {
    setPrintViewOpen(true);
  };

  const handleExportHistory = () => {
    if (orderHistory.length === 0) {
      toast.info('No history to export');
      return;
    }
    exportOrderHistoryToCSV(orderHistory, orderId || '');
    toast.success('History exported to CSV');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Order not found</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const subtotal = order.amount || 0;
  const orderNumber = order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'PACKED':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'DISPATCHED':
      case 'SENT_FOR_DELIVERY':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'DELIVERED':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'RETURNED':
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  // Print view
  if (printViewOpen) {
    return (
      <div>
        <div className="p-4 no-print flex items-center gap-4">
          <Button variant="ghost" onClick={() => setPrintViewOpen(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order
          </Button>
        </div>
        <PrintInvoiceView order={order} orderItems={orderItems} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold">
                Order {orderNumber}
              </h1>
              {order.leads?.reference_id && (
                <Badge variant="outline" className="text-base font-mono bg-primary/10 text-primary border-primary/30">
                  Lead #{order.leads.reference_id}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getStatusColor(order.order_status)}>
              {order.order_status}
            </Badge>
            <Badge variant={order.is_cod ? 'outline' : 'default'}>
              {order.is_cod ? 'COD' : 'Online'}
            </Badge>
            {order.shipping_partner && (
              <Badge variant="secondary">
                <Truck className="h-3 w-3 mr-1" />
                {order.shipping_partner}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <CopyOrderButton
            customerName={order.leads?.client_name || 'N/A'}
            phone={order.leads?.contact_number || 'N/A'}
            address={order.full_address || order.leads?.full_address || 'N/A'}
            orderItems={orderItems.length > 0 ? orderItems : [{ product_name: order.products?.name || 'Product', quantity: order.quantity || 1 }]}
            totalAmount={order.amount || 0}
            paymentMethod={order.is_cod ? 'COD' : 'PAID'}
            orderBy={(order.created_by_staff as any)?.name || (order.sales_person as any)?.name || 'N/A'}
            deliveryLocation={order.delivery_location}
            branch={order.destination_branch || order.branches?.branch_name}
            size="sm"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setUpdateStatusModalOpen(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Update Status
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setAssignCourierModalOpen(true)}
          >
            <Truck className="h-4 w-4 mr-2" />
            Assign Courier
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportHistory}>
            <FileDown className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium text-lg">{order.leads?.client_name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.leads?.contact_number || 'N/A'}</p>
                      {order.leads?.contact_number && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCallCustomer(order.leads.contact_number)}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {order.leads?.alt_phone && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{order.leads.alt_phone}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCallCustomer(order.leads.alt_phone!)}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Delivery Address
                  </Label>
                  <p className="mt-1 text-sm">
                    {order.full_address || order.leads?.full_address || 'N/A'}
                  </p>
                </div>
                
                {order.branches && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Destination Branch</Label>
                      <p className="font-medium">{order.branches.branch_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">City / Area</Label>
                      <p className="font-medium">
                        {order.branches.district}
                        {order.branches.province && `, ${order.branches.province}`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.length > 0 ? (
                      orderItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product_name}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            Rs. {item.unit_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {item.discount ? `-Rs. ${item.discount.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            Rs. {item.total_price.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell className="font-medium">
                          {order.products?.name || 'Product'}
                        </TableCell>
                        <TableCell className="text-right">{order.quantity}</TableCell>
                        <TableCell className="text-right">
                          Rs. {(order.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right font-bold">
                          Rs. {subtotal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>Rs. {(orderItems.length > 0 ? orderItems.reduce((sum, item) => sum + item.total_price, 0) : subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Payment Method:
                    </span>
                    <Badge variant={order.is_cod ? 'outline' : 'default'}>
                      {order.is_cod ? 'Cash on Delivery' : 'Online Payment'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <OrderCommentsSection orderId={order.id} />
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Order Journey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2, active: true },
                    { status: 'PACKED', label: 'Packed', icon: Package, active: ['PACKED', 'DISPATCHED', 'SENT_FOR_DELIVERY', 'DELIVERED'].includes(order.order_status) },
                    { status: 'DISPATCHED', label: 'Dispatched', icon: Truck, active: ['DISPATCHED', 'SENT_FOR_DELIVERY', 'DELIVERED'].includes(order.order_status) },
                    { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, active: order.order_status === 'DELIVERED' },
                  ].map((step, index) => (
                    <div key={step.status} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${step.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gaaubesi Logistics Card - Enhanced */}
            {order.courier_provider === 'GAAUBESI' && (
              <GaaubesiLogisticsCard order={order} />
            )}

            {/* Courier Information - Other Couriers */}
            {(order.shipping_partner || order.courier_provider) && order.courier_provider !== 'GAAUBESI' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Courier Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Courier Partner</Label>
                    <p className="font-medium">{order.courier_provider || order.shipping_partner}</p>
                  </div>
                  {(order.partner_order_id || order.courier_tracking_code) && (
                    <div>
                      <Label className="text-muted-foreground">AWB / Tracking</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm">{order.courier_tracking_code || order.partner_order_id}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(order.courier_tracking_code || order.partner_order_id!);
                            toast.success('Tracking code copied');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {order.partner_status && (
                    <div>
                      <Label className="text-muted-foreground">Courier Status</Label>
                      <Badge variant="outline">{order.partner_status}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Notes */}
            {order.delivery_notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.delivery_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Order History */}
        <OrderHistoryTimeline orderId={order.id} />
      </div>

      {/* Modals */}
      <UpdateOrderStatusModal
        open={updateStatusModalOpen}
        onOpenChange={setUpdateStatusModalOpen}
        orderId={order.id}
        currentOrderStatus={order.order_status}
        currentPaymentStatus={order.payment_status}
      />

      <AssignCourierModal
        open={assignCourierModalOpen}
        onOpenChange={setAssignCourierModalOpen}
        orderId={order.id}
        codAmount={order.is_cod ? subtotal : 0}
      />
    </div>
  );
}
