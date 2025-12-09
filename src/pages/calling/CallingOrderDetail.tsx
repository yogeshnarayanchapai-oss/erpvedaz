import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, MapPin, CreditCard, Truck, MessageSquarePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useOrderDetail } from '@/hooks/useOrders';
import { useOrderItems } from '@/hooks/useOrderItems';
import { useOrderComments, useAddOrderComment } from '@/hooks/useOrderComments';
import { OrderHistoryTimeline } from '@/components/orders/OrderHistoryTimeline';
import { CopyOrderButton } from '@/components/orders/CopyOrderButton';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

export default function CallingOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrderDetail(orderId!);
  const { data: orderItems = [] } = useOrderItems(orderId);
  const { data: comments = [] } = useOrderComments(orderId!);
  const addCommentMutation = useAddOrderComment();
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    try {
      await addCommentMutation.mutateAsync({ orderId: orderId!, commentText: newComment });
      setNewComment('');
    } catch (error) {
      // Error is already handled by the mutation hook
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
        <Button onClick={() => navigate('/calling/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Orders
        </Button>
      </div>
    );
  }

  const orderItemsTotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
  const subtotal = orderItems.length > 0 ? orderItemsTotal : (order.amount || 0) * (order.quantity || 1);
  const deliveryCharge = 0;
  const total = subtotal + deliveryCharge;

  const customerName = order.leads?.client_name || order.customers?.customer_name || 'N/A';
  const customerPhone = order.leads?.contact_number || order.customers?.phone_number || 'N/A';
  const customerEmail = order.customers?.email || 'N/A';
  const customerAddress = order.full_address || order.leads?.full_address || order.customers?.full_address || 'N/A';
  const customerCity = order.customers?.city || order.branches?.district || 'N/A';

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/calling/orders')}
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
      </div>
      </div>

      {/* Status Pills Row */}
      <div className="flex items-center gap-3">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Multi-product support */}
              {orderItems.length > 0 ? (
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Rs. {item.unit_price.toLocaleString()} × {item.quantity}
                          {item.discount > 0 && <span className="text-green-600 ml-2">(-Rs. {item.discount})</span>}
                        </p>
                      </div>
                      <p className="font-bold">Rs. {item.total_price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
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

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sub-total</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Charge</span>
                  <span>Rs. {deliveryCharge.toLocaleString()}</span>
                </div>
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
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Delivery Type</p>
                <p className="font-medium">
                  {order.delivery_location === 'INSIDE_VALLEY' ? 'Inside Valley' : 'Outside Valley'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-medium">{order.destination_branch || 'N/A'}</p>
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs - Comments & Order Journey */}
      <Card>
        <Tabs defaultValue="comments">
          <TabsList className="ml-6">
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="journey">Order Journey</TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="comments" className="p-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment (e.g., customer le next week laune bhaneko)..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={addCommentMutation.isPending || !newComment.trim()}
                  size="sm"
                >
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Add the first comment above.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium">
                          {comment.profiles?.name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="journey" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <div>
                  <p className="font-medium">Order Confirmed</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              {order.order_status === 'PACKED' && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-info"></div>
                  <div>
                    <p className="font-medium">Packed</p>
                    <p className="text-sm text-muted-foreground">Ready for dispatch</p>
                  </div>
                </div>
              )}
              
              {(order.order_status === 'DISPATCHED' || order.order_status === 'DELIVERED') && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div>
                    <p className="font-medium">Dispatched</p>
                    <p className="text-sm text-muted-foreground">Out for delivery</p>
                  </div>
                </div>
              )}
              
              {order.order_status === 'DELIVERED' && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-chart-2"></div>
                  <div>
                    <p className="font-medium">Delivered</p>
                    <p className="text-sm text-muted-foreground">Order completed successfully</p>
                  </div>
                </div>
              )}
              
              {order.order_status === 'CANCELLED' && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  <div>
                    <p className="font-medium">Cancelled</p>
                    <p className="text-sm text-muted-foreground">Order was cancelled</p>
                  </div>
                </div>
              )}
              
              {order.order_status === 'RETURNED' && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive"></div>
                  <div>
                    <p className="font-medium">Returned (RTO)</p>
                    <p className="text-sm text-muted-foreground">Order returned to origin</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-6">
            <OrderHistoryTimeline orderId={order.id} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
