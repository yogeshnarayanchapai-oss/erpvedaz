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
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
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
  date: string;
  followup_preset: string;
  followup_date: string;
  followup_time: string;
  followup_reason: string;
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
  const { currentStore } = useCurrentStore();
  const { data: customerInsight, isLoading: insightLoading } = useCustomerInsight(lead?.contact_number || '', currentStore?.id, !!lead);
  
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
      <SheetContent className="sm:max-w-3xl overflow-hidden p-4">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            Edit Lead - {lead.client_name}
            {isTransferredLead && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">TRF</Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                <AlertTriangle className="w-3 h-3 mr-0.5" />
                Overdue
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-3 mt-2">
          {/* Info bar - compact single row */}
          <div className="flex items-center gap-4 p-2 bg-muted/50 rounded-lg text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Phone:</span>
              <button onClick={() => onCall(lead, lead.contact_number)} className="text-primary hover:underline text-xs font-medium">
                {lead.contact_number}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Product:</span>
              <span className="text-xs">{lead.products?.name || '-'}</span>
            </div>
            {lead.next_followup_at && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs">Follow-up:</span>
                <span className={`text-xs ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                  {format(new Date(lead.next_followup_at), 'dd MMM HH:mm')}
                </span>
              </div>
            )}
            {/* Call & WhatsApp inline */}
            <div className="flex gap-1 ml-auto">
              <Button variant="outline" size="sm" onClick={() => onCall(lead, lead.contact_number)} className="h-7 px-2 text-xs">
                <Phone className="w-3 h-3 mr-1" />
                Call
              </Button>
              <Button variant="outline" size="sm" onClick={() => onWhatsApp(lead)} className="h-7 px-2 text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                WA
              </Button>
            </div>
          </div>
          
          {/* Customer Insight - compact */}
          <CustomerInsightCard 
            insight={customerInsight} 
            isLoading={insightLoading} 
            phone={lead.contact_number} 
          />

          {/* Main form - 4 columns */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Lead Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => onFormChange({ ...formData, date: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Order Status</Label>
              <Select value={formData.status} onValueChange={(v) => onFormChange({ ...formData, status: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Alt Phone</Label>
              <Input
                value={formData.alt_phone}
                onChange={(e) => onFormChange({ ...formData, alt_phone: e.target.value })}
                placeholder="Alt phone"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Branch</Label>
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
                placeholder="Select branch..."
                showDetails={false}
                allowCustom={true}
              />
            </div>
          </div>

          {/* Address & Remark - 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Full Address</Label>
              <Input
                value={formData.full_address}
                onChange={(e) => onFormChange({ ...formData, full_address: e.target.value })}
                placeholder="Enter full address"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remark</Label>
              <Input
                value={formData.remark}
                onChange={(e) => onFormChange({ ...formData, remark: e.target.value })}
                placeholder="Add notes..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Follow-up Section - compact inline */}
          {formData.status === 'FOLLOW_UP' && (
            <div className="border-t pt-2 space-y-2">
              <h4 className="font-medium text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Schedule Follow-Up
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">When</Label>
                  <Select value={formData.followup_preset} onValueChange={handleFollowupPresetChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOWUP_PRESETS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.followup_preset === 'custom' ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={formData.followup_date} onChange={(e) => onFormChange({ ...formData, followup_date: e.target.value })} min={format(new Date(), 'yyyy-MM-dd')} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time</Label>
                      <Input type="time" value={formData.followup_time} onChange={(e) => onFormChange({ ...formData, followup_time: e.target.value })} className="h-8 text-xs" />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 flex items-end pb-1">
                    {formData.followup_preset && (
                      <p className="text-xs text-muted-foreground">→ {formData.followup_date} {formData.followup_time}</p>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Reason</Label>
                  <Input
                    value={formData.followup_reason}
                    onChange={(e) => onFormChange({ ...formData, followup_reason: e.target.value })}
                    placeholder="Follow-up reason"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {/* Follow-up History inline */}
              {lead.status === 'FOLLOW_UP' && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground flex items-center gap-1">
                    <History className="w-3 h-3" /> View History
                  </summary>
                  <div className="mt-1">
                    <FollowupHistorySection leadId={lead.id} />
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Confirmed Order Details - compact */}
          {formData.status === 'CONFIRMED' && (
            <div className="border-t pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-xs flex items-center gap-1">
                  {lead.order_id ? 'Edit Order Products' : 'Order Products'}
                  {lead.order_id && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                      <CheckCircle className="w-2.5 h-2.5 mr-0.5" />Existing
                    </Badge>
                  )}
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={addProductLine} className="h-6 text-[10px] px-2">
                  <Plus className="w-3 h-3 mr-0.5" /> Add
                </Button>
              </div>

              {/* Product Lines - compact */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground">
                  <div className="col-span-4">Product</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Price</div>
                  <div className="col-span-2">Disc</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1"></div>
                </div>
                {(formData.orderItems || []).map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-4">
                      <SearchableProductSelect products={products} value={item.product_id} onSelect={(productId) => handleProductSelect(item.id, productId)} className="h-7 w-full text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" value={item.quantity} onChange={(e) => updateProductLine(item.id, { quantity: parseInt(e.target.value) || 1 })} className="h-7 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" value={item.unit_price} onChange={(e) => updateProductLine(item.id, { unit_price: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" value={item.discount || 0} onChange={(e) => updateProductLine(item.id, { discount: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" placeholder="0" />
                    </div>
                    <div className="col-span-1 text-[11px] font-medium">₹{getLineTotal(item).toLocaleString()}</div>
                    <div className="col-span-1">
                      {(formData.orderItems || []).length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeProductLine(item.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-4">
                    {/* Payment & Location inline */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer text-xs">
                        <input type="radio" name="payment_type" checked={formData.is_cod === true} onChange={() => onFormChange({ ...formData, is_cod: true })} className="w-3 h-3" />
                        COD
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer text-xs">
                        <input type="radio" name="payment_type" checked={formData.is_cod === false} onChange={() => onFormChange({ ...formData, is_cod: false })} className="w-3 h-3" />
                        Online
                      </label>
                    </div>
                    <Select value={formData.delivery_location} onValueChange={(v) => onFormChange({ ...formData, delivery_location: v })}>
                      <SelectTrigger className="h-7 text-xs w-[140px]">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_LOCATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-right">
                    {totalDiscount > 0 && <span className="text-[10px] text-destructive mr-2">-₹{totalDiscount.toLocaleString()}</span>}
                    <span className="text-xs text-muted-foreground mr-1">Total:</span>
                    <span className="text-sm font-bold">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Follow-up History (non-followup status) */}
          {lead.status === 'FOLLOW_UP' && formData.status !== 'FOLLOW_UP' && (
            <details className="text-xs border-t pt-2">
              <summary className="cursor-pointer text-muted-foreground flex items-center gap-1">
                <History className="w-3 h-3" /> Follow-Up History
              </summary>
              <div className="mt-1">
                <FollowupHistorySection leadId={lead.id} />
              </div>
            </details>
          )}

          {/* Action buttons - single row */}
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={onSave} className="flex-1 h-8 text-xs" disabled={isSaving}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
