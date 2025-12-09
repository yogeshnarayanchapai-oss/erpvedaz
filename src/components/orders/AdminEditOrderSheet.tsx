import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Trash2, Save, Package } from 'lucide-react';
import { BranchSelect } from '@/components/BranchSelect';
import { useProducts } from '@/hooks/useProducts';
import { SearchableProductSelect } from '@/components/orders/SearchableProductSelect';
import { Order, useAdminUpdateOrder } from '@/hooks/useOrders';

const ORDER_STATUS_OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'REDIRECT', label: 'Redirect' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'PENDING', label: 'Pending' },
];

const DELIVERY_LOCATION_OPTIONS = [
  { value: 'INSIDE_VALLEY', label: 'Inside Valley' },
  { value: 'OUTSIDE_VALLEY', label: 'Outside Valley' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'COD', label: 'COD' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
];

export interface OrderItemLine {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface AdminEditOrderFormData {
  client_name: string;
  contact_number: string;
  alt_phone: string;
  full_address: string;
  destination_branch: string;
  branch_id: string;
  delivery_location: string;
  order_status: string;
  payment_status: string;
  delivery_notes: string;
  order_date: string;
  logistic_order_id: string;
  orderItems: OrderItemLine[];
}

interface AdminEditOrderSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminEditOrderSheet({
  order,
  open,
  onOpenChange,
  onSuccess,
}: AdminEditOrderSheetProps) {
  const { data: products = [] } = useProducts();
  const updateOrder = useAdminUpdateOrder();

  const [formData, setFormData] = useState<AdminEditOrderFormData>({
    client_name: '',
    contact_number: '',
    alt_phone: '',
    full_address: '',
    destination_branch: '',
    branch_id: '',
    delivery_location: '',
    order_status: 'CONFIRMED',
    payment_status: 'COD',
    delivery_notes: '',
    order_date: '',
    logistic_order_id: '',
    orderItems: [],
  });

  // Initialize form when order changes
  useEffect(() => {
    if (order) {
      const orderItems = (order as any).order_items || [];
      const initialItems: OrderItemLine[] = orderItems.length > 0
        ? orderItems.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            product_id: item.product_id || '',
            product_name: item.product_name || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            discount: item.discount || 0,
          }))
        : [{
            id: crypto.randomUUID(),
            product_id: order.product_id || '',
            product_name: order.products?.name || '',
            quantity: order.quantity || 1,
            unit_price: (order.amount || 0) / (order.quantity || 1),
            discount: 0,
          }];

      setFormData({
        client_name: order.leads?.client_name || '',
        contact_number: order.leads?.contact_number || '',
        alt_phone: order.leads?.alt_phone || '',
        full_address: order.full_address || order.leads?.full_address || '',
        destination_branch: order.destination_branch || '',
        branch_id: order.branch_id || '',
        delivery_location: order.delivery_location || '',
        order_status: order.order_status || 'CONFIRMED',
        payment_status: order.payment_status || 'COD',
        delivery_notes: order.delivery_notes || '',
        order_date: order.order_date?.split('T')[0] || '',
        logistic_order_id: (order as any).logistic_order_id || '',
        orderItems: initialItems,
      });
    }
  }, [order]);

  const handleFormChange = (updates: Partial<AdminEditOrderFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Multi-product handlers
  const addProductLine = () => {
    const newItem: OrderItemLine = {
      id: crypto.randomUUID(),
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
    };
    handleFormChange({
      orderItems: [...formData.orderItems, newItem],
    });
  };

  const removeProductLine = (id: string) => {
    if (formData.orderItems.length <= 1) return;
    handleFormChange({
      orderItems: formData.orderItems.filter(item => item.id !== id),
    });
  };

  const updateProductLine = (id: string, updates: Partial<OrderItemLine>) => {
    handleFormChange({
      orderItems: formData.orderItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const handleProductSelect = (id: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateProductLine(id, {
        product_id: productId,
        product_name: product.name,
        unit_price: product.sell_price || 0,
      });
    }
  };

  const getLineTotal = (item: OrderItemLine) => {
    const subtotal = item.quantity * item.unit_price;
    return Math.max(0, subtotal - (item.discount || 0));
  };

  const grandTotal = formData.orderItems.reduce(
    (sum, item) => sum + getLineTotal(item), 0
  );

  const handleSave = async () => {
    if (!order) return;
    
    // Validate at least one product with valid data
    const validItems = formData.orderItems.filter(item => 
      item.product_id && item.quantity > 0 && item.unit_price >= 0
    );
    
    if (validItems.length === 0) {
      return;
    }

    try {
      await updateOrder.mutateAsync({
        orderId: order.id,
        leadId: order.lead_id || undefined,
        clientName: formData.client_name,
        contactNumber: formData.contact_number,
        altPhone: formData.alt_phone || undefined,
        fullAddress: formData.full_address || undefined,
        destinationBranch: formData.destination_branch || undefined,
        branchId: formData.branch_id || undefined,
        deliveryLocation: formData.delivery_location as 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY' | undefined,
        orderStatus: formData.order_status as any,
        paymentStatus: formData.payment_status as any,
        deliveryNotes: formData.delivery_notes || undefined,
        orderDate: formData.order_date || undefined,
        logisticOrderId: formData.logistic_order_id || undefined,
        items: validItems.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount,
        })),
        grandTotal,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  if (!order) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Edit Order
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 mt-6">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => handleFormChange({ client_name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input
                value={formData.contact_number}
                onChange={(e) => handleFormChange({ contact_number: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Phone</Label>
              <Input
                value={formData.alt_phone}
                onChange={(e) => handleFormChange({ alt_phone: e.target.value })}
                placeholder="Alternative phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Location</Label>
              <Select 
                value={formData.delivery_location} 
                onValueChange={(v) => handleFormChange({ delivery_location: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery type" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_LOCATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Full Address</Label>
            <Textarea
              value={formData.full_address}
              onChange={(e) => handleFormChange({ full_address: e.target.value })}
              placeholder="Full delivery address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Destination Branch</Label>
            <BranchSelect
              value={formData.branch_id}
              customValue={!formData.branch_id && formData.destination_branch ? formData.destination_branch : undefined}
              onChange={(branchId, branch, customName) => {
                handleFormChange({ 
                  branch_id: branchId || '',
                  destination_branch: branch?.branch_name || customName || ''
                });
              }}
              placeholder="Type or select branch..."
              showDetails={!!formData.branch_id}
              allowCustom={true}
            />
          </div>

          {/* Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) => handleFormChange({ order_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Order Status</Label>
              <Select 
                value={formData.order_status} 
                onValueChange={(v) => handleFormChange({ order_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select 
                value={formData.payment_status} 
                onValueChange={(v) => handleFormChange({ payment_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logistic Order ID</Label>
              <Input
                value={formData.logistic_order_id}
                onChange={(e) => handleFormChange({ logistic_order_id: e.target.value })}
                placeholder="Enter logistic order ID..."
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Notes / Remark</Label>
              <Textarea
                value={formData.delivery_notes}
                onChange={(e) => handleFormChange({ delivery_notes: e.target.value })}
                placeholder="Add notes..."
                rows={2}
              />
            </div>
          </div>

          {/* Products Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Order Products</h4>
              <Button type="button" variant="outline" size="sm" onClick={addProductLine}>
                <Plus className="w-4 h-4 mr-1" />
                Add Product
              </Button>
            </div>

            {/* Product Lines */}
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Product</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Discount</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1"></div>
              </div>

              {formData.orderItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <SearchableProductSelect
                      products={products}
                      value={item.product_id}
                      onSelect={(productId) => handleProductSelect(item.id, productId)}
                      className="h-9 w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateProductLine(item.id, { quantity: parseInt(e.target.value) || 1 })}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateProductLine(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      value={item.discount || 0}
                      onChange={(e) => updateProductLine(item.id, { discount: parseFloat(e.target.value) || 0 })}
                      className="h-9"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1 text-sm font-medium">
                    Rs. {getLineTotal(item).toLocaleString()}
                  </div>
                  <div className="col-span-1">
                    {formData.orderItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProductLine(item.id)}
                        className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Grand Total */}
              <div className="flex justify-between items-center pt-3 border-t font-semibold">
                <span>Grand Total</span>
                <span className="text-lg">Rs. {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={updateOrder.isPending}
              className="min-w-[120px]"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateOrder.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
