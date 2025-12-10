import { Lead } from '@/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Phone, MessageSquare, Clock, AlertTriangle, Plus, Trash2, History, CheckCircle } from 'lucide-react';
import { BranchSelect } from '@/components/BranchSelect';
import { Badge } from '@/components/ui/badge';
import { FollowupHistorySection } from './FollowupHistorySection';
import { CustomerInsightCard } from '@/components/customers/CustomerInsightCard';
import { useCustomerInsight } from '@/hooks/useCustomerInsight';
import { addHours, addDays, format } from 'date-fns';
import { useProducts } from '@/hooks/useProducts';
import { SearchableProductSelect } from '@/components/orders/SearchableProductSelect';

const ORDER_STATUS_OPTIONS = [
  { value: 'NEW', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REDIRECT', label: 'Redirect' },
  { value: 'CALL_NOT_RECEIVED', label: 'CNR' },
];

const DELIVERY_LOCATION_OPTIONS = [
  { value: 'INSIDE_VALLEY', label: 'Inside Valley' },
  { value: 'OUTSIDE_VALLEY', label: 'Outside Valley' },
];

const FOLLOWUP_PRESETS = [
  { value: '1h', label: '1 Hour Later', hours: 1 },
  { value: '3h', label: '3 Hours Later', hours: 3 },
  { value: '1d', label: '1 Day Later', days: 1 },
  { value: '3d', label: '3 Days Later', days: 3 },
  { value: 'custom', label: 'Custom Date & Time', hours: 0 },
];

export interface OrderItemLine {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

export interface EditLeadFormData {
  destination_branch: string;
  branch_id: string;
  full_address: string;
  alt_phone: string;
  remark: string;
  status: string;
  quantity: string;
  amount: string;
  delivery_location: string;
  is_cod: boolean;
  // Lead date field
  date: string;
  // Follow-up fields
  followup_preset: string;
  followup_date: string;
  followup_time: string;
  followup_reason: string;
  // Multi-product order items
  orderItems: OrderItemLine[];
}

interface EditLeadSheetProps {
  lead: Lead | null;
  formData: EditLeadFormData;
  onFormChange: (data: EditLeadFormData) => void;
  onSave: () => void;
  onClose: () => void;
  onCall: (lead: Lead, phone: string) => void;
  onWhatsApp: (lead: Lead) => void;
  isSaving: boolean;
}

export function EditLeadSheet({
  lead,
  formData,
  onFormChange,
  onSave,
  onClose,
  onCall,
  onWhatsApp,
  isSaving,
}: EditLeadSheetProps) {
  const { data: products = [] } = useProducts();
  const { data: customerInsight, isLoading: insightLoading } = useCustomerInsight(lead?.contact_number || '', !!lead);
  
  if (!lead) return null;

  const handleFollowupPresetChange = (preset: string) => {
    onFormChange({ ...formData, followup_preset: preset });
    
    if (preset !== 'custom') {
      const presetOption = FOLLOWUP_PRESETS.find(p => p.value === preset);
      if (presetOption) {
        let newDate = new Date();
        if (presetOption.hours) {
          newDate = addHours(newDate, presetOption.hours);
        }
        if (presetOption.days) {
          newDate = addDays(newDate, presetOption.days);
        }
        onFormChange({
          ...formData,
          followup_preset: preset,
          followup_date: format(newDate, 'yyyy-MM-dd'),
          followup_time: format(newDate, 'HH:mm'),
        });
      }
    }
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
    onFormChange({
      ...formData,
      orderItems: [...(formData.orderItems || []), newItem],
    });
  };

  const removeProductLine = (id: string) => {
    const items = formData.orderItems || [];
    if (items.length <= 1) return;
    onFormChange({
      ...formData,
      orderItems: items.filter(item => item.id !== id),
    });
  };

  const updateProductLine = (id: string, updates: Partial<OrderItemLine>) => {
    const items = formData.orderItems || [];
    onFormChange({
      ...formData,
      orderItems: items.map(item => item.id === id ? { ...item, ...updates } : item),
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

  const grandTotal = (formData.orderItems || []).reduce(
    (sum, item) => sum + getLineTotal(item), 0
  );

  const totalDiscount = (formData.orderItems || []).reduce(
    (sum, item) => sum + (item.discount || 0), 0
  );

  const isOverdue = lead.status === 'FOLLOW_UP' &&
    lead.next_followup_at && 
    new Date(lead.next_followup_at) < new Date() &&
    !lead.followup_completed;

  const isTransferredLead = lead.tag === 'TRF';

  return (
    <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Edit Lead - {lead.client_name}
            {isTransferredLead && (
              <Badge variant="secondary" className="text-xs">
                Transferred Lead
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 mt-6">
          {/* Info bar with phone and product */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Phone:</span>
              <button onClick={() => onCall(lead, lead.contact_number)} className="text-primary hover:underline">
                {lead.contact_number}
              </button>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Inquiry Product:</span>
              <span>{lead.products?.name || '-'}</span>
            </div>
            {lead.next_followup_at && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Follow-up Scheduled:</span>
                <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                  {format(new Date(lead.next_followup_at), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
            )}
          </div>
          
          {/* Customer Insight Card */}
          <CustomerInsightCard 
            insight={customerInsight} 
            isLoading={insightLoading} 
            phone={lead.contact_number} 
          />
          
          {/* Call & WhatsApp buttons - full width */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onCall(lead, lead.contact_number)} className="flex-1">
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" onClick={() => onWhatsApp(lead)} className="flex-1">
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          {/* Two-column layout for desktop, single column for mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lead Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => onFormChange({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Order Status</Label>
                <Select value={formData.status} onValueChange={(v) => onFormChange({ ...formData, status: v })}>
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
                <Label>Destination Branch</Label>
                <BranchSelect
                  value={formData.branch_id}
                  customValue={!formData.branch_id && formData.destination_branch ? formData.destination_branch : undefined}
                  onChange={(branchId, branch, customName) => {
                    onFormChange({ 
                      ...formData, 
                      branch_id: branchId || '',
                      destination_branch: branch?.branch_name || customName || ''
                    });
                  }}
                  placeholder="Type or select branch..."
                  showDetails={!!formData.branch_id}
                  allowCustom={true}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Address</Label>
                <Textarea
                  value={formData.full_address}
                  onChange={(e) => onFormChange({ ...formData, full_address: e.target.value })}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Alt Phone Number</Label>
                <Input
                  value={formData.alt_phone}
                  onChange={(e) => onFormChange({ ...formData, alt_phone: e.target.value })}
                  placeholder="Alternative phone"
                />
              </div>

              <div className="space-y-2">
                <Label>Remark</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => onFormChange({ ...formData, remark: e.target.value })}
                  placeholder="Add notes..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Follow-up Section - Show when status is FOLLOW_UP */}
          {formData.status === 'FOLLOW_UP' && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Schedule Follow-Up
              </h4>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Follow-up Time</Label>
                  <Select 
                    value={formData.followup_preset} 
                    onValueChange={handleFollowupPresetChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select when to follow up" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOWUP_PRESETS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.followup_preset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.followup_date}
                        onChange={(e) => onFormChange({ ...formData, followup_date: e.target.value })}
                        min={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={formData.followup_time}
                        onChange={(e) => onFormChange({ ...formData, followup_time: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {(formData.followup_preset && formData.followup_preset !== 'custom') && (
                  <p className="text-sm text-muted-foreground">
                    Scheduled for: {formData.followup_date} at {formData.followup_time}
                  </p>
                )}

                <div className="space-y-2">
                  <Label>Follow-up Reason</Label>
                  <Textarea
                    value={formData.followup_reason}
                    onChange={(e) => onFormChange({ ...formData, followup_reason: e.target.value })}
                    placeholder="Why does this lead need follow-up?"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Confirmed Order Details - Show for all confirmed orders (new or existing) */}
          {formData.status === 'CONFIRMED' && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {lead.order_id ? 'Edit Order Products' : 'Order Products'}
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={addProductLine}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>

              {lead.order_id && (
                <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Order exists - changes will update the existing order
                </div>
              )}

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

                {(formData.orderItems || []).map((item) => (
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
                      {(formData.orderItems || []).length > 1 && (
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
                <div className="flex flex-col items-end pt-2 border-t gap-1">
                  {totalDiscount > 0 && (
                    <div className="text-right text-sm text-muted-foreground">
                      Total Discount: <span className="text-destructive">-Rs. {totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground mr-4">Grand Total:</span>
                    <span className="text-lg font-bold">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_type"
                      checked={formData.is_cod === true}
                      onChange={() => onFormChange({ ...formData, is_cod: true })}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Cash on Delivery (COD)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_type"
                      checked={formData.is_cod === false}
                      onChange={() => onFormChange({ ...formData, is_cod: false })}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Online Payment</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Location</Label>
                <Select 
                  value={formData.delivery_location} 
                  onValueChange={(v) => onFormChange({ ...formData, delivery_location: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_LOCATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Follow-up History Section */}
          {lead.status === 'FOLLOW_UP' && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <History className="w-4 h-4" />
                Follow-Up History
              </h4>
              <FollowupHistorySection leadId={lead.id} />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={onSave} className="flex-1" disabled={isSaving}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
