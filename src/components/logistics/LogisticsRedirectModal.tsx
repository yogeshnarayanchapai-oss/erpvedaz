import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BranchSelect } from '@/components/BranchSelect';
import { useLogisticsRedirectOrder, useLogisticsMarkDelivered } from '@/hooks/useLogisticsPortalOrders';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RotateCcw, CheckCircle, Package, MapPin, Phone, User } from 'lucide-react';

interface LogisticsRedirectModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const COURIERS = [
  { value: 'NCM', label: 'NCM Courier' },
  { value: 'GAAUBESI', label: 'Gaaubesi Logistics' },
  { value: 'PATHAO', label: 'Pathao' },
  { value: 'SELF', label: 'Self Delivery' },
  { value: 'OTHER', label: 'Other' },
];

export function LogisticsRedirectModal({
  order,
  isOpen,
  onClose,
  userId,
  userName,
}: LogisticsRedirectModalProps) {
  const redirectOrder = useLogisticsRedirectOrder();
  const markDelivered = useLogisticsMarkDelivered();

  const [newBranch, setNewBranch] = useState('');
  const [newDeliveryLocation, setNewDeliveryLocation] = useState('');
  const [newCourier, setNewCourier] = useState('');
  const [remark, setRemark] = useState('');

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      setNewBranch(order.destination_branch || '');
      setNewDeliveryLocation(order.delivery_location || '');
      setNewCourier(order.courier_provider || '');
      setRemark('');
    }
  }, [order]);

  if (!order) return null;

  const orderItems = (order as any).order_items || [];
  const productDisplay = orderItems.length > 0 
    ? orderItems.map((item: any) => `${item.product_name} x${item.quantity}`).join(', ')
    : `${(order.products as any)?.name || '-'} x${order.quantity || 1}`;
  const totalAmount = orderItems.length > 0
    ? orderItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
    : order.amount || 0;

  const clientName = (order.leads as any)?.client_name || (order as any).customers?.customer_name || '-';
  const contactNumber = (order.leads as any)?.contact_number || (order as any).customers?.phone_number || '-';
  const address = (order.leads as any)?.full_address || order.delivery_address || '-';

  const canRedirect = !['DELIVERED', 'CANCELLED', 'REDIRECT', 'REDIRECTED'].includes(order.order_status || '');
  const canMarkDelivered = !['DELIVERED', 'CANCELLED'].includes(order.order_status || '');

  const handleRedirect = async () => {
    if (!remark.trim()) {
      toast.error('Please add a remark for redirect');
      return;
    }

    try {
      await redirectOrder.mutateAsync({
        orderId: order.id,
        branch: newBranch !== order.destination_branch ? newBranch : undefined,
        deliveryLocation: newDeliveryLocation !== order.delivery_location ? newDeliveryLocation : undefined,
        courier: newCourier !== order.courier_provider ? newCourier : undefined,
        remark,
        userId,
        userName,
      });
      toast.success('Order redirected successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to redirect order');
    }
  };

  const handleMarkDelivered = async () => {
    try {
      await markDelivered.mutateAsync({
        orderId: order.id,
        userId,
      });
      toast.success('Order marked as delivered');
      onClose();
    } catch (error) {
      toast.error('Failed to mark order as delivered');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Order Date</p>
              <p className="font-medium">{order.order_date ? format(new Date(order.order_date), 'dd MMM yyyy HH:mm') : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className="mt-1">
                {order.order_status?.replace('_', ' ') || 'Unknown'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Client
              </p>
              <p className="font-medium">{clientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Contact
              </p>
              <p className="font-medium">{contactNumber}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Address
              </p>
              <p className="font-medium">{address}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="font-medium">{productDisplay}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-medium">Rs. {totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="font-medium">{order.delivery_location?.replace('_', ' ') || '-'}</p>
            </div>
          </div>

          {/* Existing Remark */}
          {order.delivery_notes && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 font-medium">Existing Remark</p>
              <p className="text-sm text-yellow-800 mt-1">{order.delivery_notes}</p>
            </div>
          )}

          <Separator />

          {/* Redirect Form */}
          {canRedirect && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Redirect Options</h4>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="branch">Change Branch/Area</Label>
                  <BranchSelect
                    value=""
                    customValue={newBranch || undefined}
                    onChange={(branchId, branch, customName) => {
                      setNewBranch(branch?.branch_name || customName || '');
                    }}
                    placeholder="Type or select branch..."
                    allowCustom={true}
                  />
                </div>

                <div>
                  <Label htmlFor="deliveryLocation">Change Delivery Type</Label>
                  <Select value={newDeliveryLocation} onValueChange={setNewDeliveryLocation}>
                    <SelectTrigger id="deliveryLocation">
                      <SelectValue placeholder="Select delivery type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                      <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="courier">Select Courier</Label>
                  <Select value={newCourier} onValueChange={setNewCourier}>
                    <SelectTrigger id="courier">
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      {COURIERS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="remark">Remark <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="remark"
                    placeholder="Add redirect reason/notes..."
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canMarkDelivered && (
            <Button
              variant="default"
              onClick={handleMarkDelivered}
              disabled={markDelivered.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Delivered
            </Button>
          )}
          {canRedirect && (
            <Button
              variant="destructive"
              onClick={handleRedirect}
              disabled={redirectOrder.isPending || !remark.trim()}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Redirect Order
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
