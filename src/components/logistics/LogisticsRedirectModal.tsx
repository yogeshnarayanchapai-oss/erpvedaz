import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BranchSelect } from '@/components/BranchSelect';
import { useLogisticsRedirectOrder, useLogisticsMarkDelivered, useLogisticsMarkReturned } from '@/hooks/useLogisticsPortalOrders';
import { useCallingStaff } from '@/hooks/useStaff';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RotateCcw, CheckCircle, Package, MapPin, Phone, User, Undo2 } from 'lucide-react';

const REDIRECT_REASONS = [
  'Customer Not Ordered',
  'Customer Already Received Product',
  'Customer Cancelled',
  'Wrong Address',
  'Phone Switched Off / Unreachable',
  'Customer Not Available',
  'Other',
];

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
  const markReturned = useLogisticsMarkReturned();
  const { data: callingStaff = [] } = useCallingStaff();

  const [newBranch, setNewBranch] = useState('');
  const [newDeliveryLocation, setNewDeliveryLocation] = useState('');
  const [newCourier, setNewCourier] = useState('');
  const [remark, setRemark] = useState('');
  const [remarkOther, setRemarkOther] = useState('');
  const [attributedStaffId, setAttributedStaffId] = useState<string>('');

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      setNewBranch(order.destination_branch || '');
      setNewDeliveryLocation(order.delivery_location || '');
      setNewCourier(order.courier_provider || '');
      setRemark('');
      setRemarkOther('');
      setAttributedStaffId(order.sales_person_id || order.created_by_staff_id || '');
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

  const canRedirect = !['DELIVERED', 'CANCELLED', 'REDIRECT', 'REDIRECTED', 'RETURNED'].includes(order.order_status || '');
  const canMarkDelivered = !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.order_status || '');
  const canMarkReturned = !['CANCELLED', 'RETURNED'].includes(order.order_status || '');

  const finalRemark = remark === 'Other' ? remarkOther.trim() : remark;

  const handleRedirect = async () => {
    if (!finalRemark) {
      toast.error('Please select or enter a remark for redirect');
      return;
    }
    if (!attributedStaffId) {
      toast.error('Please select the calling staff whose order is being redirected');
      return;
    }

    try {
      await redirectOrder.mutateAsync({
        orderId: order.id,
        branch: newBranch !== order.destination_branch ? newBranch : undefined,
        deliveryLocation: newDeliveryLocation !== order.delivery_location ? newDeliveryLocation : undefined,
        courier: newCourier !== order.courier_provider ? newCourier : undefined,
        remark: finalRemark,
        userId,
        userName,
        attributedStaffId,
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

  const handleMarkReturned = async () => {
    if (!confirm('Are you sure you want to mark this order as RETURNED (RTO)?')) return;
    try {
      await markReturned.mutateAsync({
        orderId: order.id,
        userId,
        userName,
      });
      toast.success('Order marked as returned (RTO)');
      onClose();
    } catch (error) {
      toast.error('Failed to mark order as returned');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4" />
            Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 space-y-3">
          {/* Order Info - 3 columns compact */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 p-3 bg-muted/50 rounded-lg text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground">Date</p>
              <p className="font-medium text-xs">{order.order_date ? format(new Date(order.order_date), 'dd MMM yyyy HH:mm') : '-'}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Status</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {order.order_status?.replace('_', ' ') || 'Unknown'}
              </Badge>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Amount</p>
              <p className="font-semibold text-xs">Rs. {totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><User className="w-2.5 h-2.5" /> Client</p>
              <p className="font-medium text-xs">{clientName}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> Contact</p>
              <p className="font-medium text-xs">{contactNumber}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Delivery</p>
              <p className="font-medium text-xs">{order.delivery_location?.replace('_', ' ') || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Address</p>
              <p className="font-medium text-xs truncate">{address}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Products</p>
              <p className="font-medium text-xs truncate">{productDisplay}</p>
            </div>
          </div>

          {/* Existing Remark - inline */}
          {order.delivery_notes && (
            <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <span className="text-yellow-700 font-medium">Remark: </span>
              <span className="text-yellow-800">{order.delivery_notes}</span>
            </div>
          )}

          {/* Redirect Form - 2 columns */}
          {canRedirect && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Redirect Options</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Branch/Area</Label>
                    <BranchSelect
                      value=""
                      customValue={newBranch || undefined}
                      onChange={(branchId, branch, customName) => {
                        setNewBranch(branch?.branch_name || customName || '');
                      }}
                      placeholder="Type or select..."
                      allowCustom={true}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Delivery Type</Label>
                    <Select value={newDeliveryLocation} onValueChange={setNewDeliveryLocation}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                        <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Courier</Label>
                    <Select value={newCourier} onValueChange={setNewCourier}>
                      <SelectTrigger className="h-9">
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
                  <div className="col-span-2">
                    <Label className="text-xs">Remark <span className="text-destructive">*</span></Label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {[
                        'Customer Not Ordered',
                        'Customer Already Received Product',
                        'Customer Cancelled',
                      ].map((reason) => (
                        <Button
                          key={reason}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => setRemark(reason)}
                        >
                          {reason}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="Redirect reason... (or pick above)"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      rows={1}
                      className="min-h-[36px] resize-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer - all buttons in one row */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {canMarkReturned && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkReturned}
              disabled={markReturned.isPending}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1" />
              RTO
            </Button>
          )}
          {canMarkDelivered && (
            <Button
              size="sm"
              onClick={handleMarkDelivered}
              disabled={markDelivered.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Delivered
            </Button>
          )}
          {canRedirect && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRedirect}
              disabled={redirectOrder.isPending || !remark.trim()}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Redirect
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
