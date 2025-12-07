import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchSelect } from '@/components/BranchSelect';
import { useProducts } from '@/hooks/useProducts';
import { useCustomerInsight } from '@/hooks/useCustomerInsight';
import { CustomerInsightCard } from '@/components/customers/CustomerInsightCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const { profile } = useAuth();
  const { data: products = [] } = useProducts();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    client_name: '',
    contact_number: '',
    alt_phone: '',
    product_id: '',
    destination_branch: '',
    branch_id: '',
    full_address: '',
    delivery_location: '',
    order_status: 'NEW', // Default status
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer insight check using hook
  const { data: customerInsight, isLoading: insightLoading } = useCustomerInsight(form.contact_number, open);

  // Order status options for Add Lead
  const ORDER_STATUS_OPTIONS = [
    { value: 'NEW', label: 'New (Pending)' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'FOLLOW_UP', label: 'Follow Up' },
    { value: 'CALL_NOT_RECEIVED', label: 'CNR' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const resetForm = () => {
    setForm({
      client_name: '',
      contact_number: '',
      alt_phone: '',
      product_id: '',
      destination_branch: '',
      branch_id: '',
      full_address: '',
      delivery_location: '',
      order_status: 'NEW',
    });
  };

  const handleSubmit = async () => {
    if (!form.client_name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!form.contact_number.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!form.product_id) {
      toast.error('Product is required');
      return;
    }
    
    // If status is CONFIRMED, delivery_location is required
    if (form.order_status === 'CONFIRMED' && !form.delivery_location) {
      toast.error('Delivery location is required for confirmed orders');
      return;
    }

    setIsSubmitting(true);
    try {
      // First create the lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert({
          client_name: form.client_name.trim(),
          contact_number: form.contact_number.trim(),
          alt_phone: form.alt_phone.trim() || null,
          product_id: form.product_id,
          destination_branch: form.destination_branch || null,
          branch_id: form.branch_id || null,
          full_address: form.full_address.trim() || null,
          od_vd: form.delivery_location || null,
          source: 'Direct Call',
          remark: 'Customer called directly',
          lead_bucket: 'NEW',
          status: form.order_status as any,
          assigned_to_user_id: profile?.id,
          created_by_user_id: profile?.id,
          current_team: 'CALLING',
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // If status is CONFIRMED, also create an order
      if (form.order_status === 'CONFIRMED' && leadData) {
        const product = products.find(p => p.id === form.product_id);
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            lead_id: leadData.id,
            product_id: form.product_id,
            quantity: 1,
            amount: product?.sell_price || 0,
            destination_branch: form.destination_branch || null,
            branch_id: form.branch_id || null,
            full_address: form.full_address.trim() || null,
            delivery_location: form.delivery_location as 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY',
            order_status: 'CONFIRMED',
            sales_person_id: profile?.id,
            is_cod: true,
          });
        
        if (orderError) throw orderError;
        
        // Update lead with order_id
        await supabase
          .from('leads')
          .update({ order_id: leadData.id })
          .eq('id', leadData.id);
      }

      toast.success(form.order_status === 'CONFIRMED' 
        ? 'Lead created and order confirmed!' 
        : 'Lead created successfully');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to add lead: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForm();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">Customer Name *</Label>
            <Input
              id="client_name"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder="Enter customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_number">Phone Number *</Label>
            <Input
              id="contact_number"
              value={form.contact_number}
              onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
              placeholder="Enter phone number"
            />
            <CustomerInsightCard 
              insight={customerInsight} 
              isLoading={insightLoading} 
              phone={form.contact_number} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alt_phone">Alternate Phone</Label>
            <Input
              id="alt_phone"
              value={form.alt_phone}
              onChange={(e) => setForm({ ...form, alt_phone: e.target.value })}
              placeholder="Enter alternate phone (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product">Product *</Label>
            <Select value={form.product_id} onValueChange={(value) => setForm({ ...form, product_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.filter(p => p.is_active).map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Destination Branch</Label>
            <BranchSelect
              value={form.branch_id}
              onChange={(branchId, branch) => setForm({ 
                ...form, 
                branch_id: branchId || '',
                destination_branch: branch?.branch_name || '' 
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_address">Full Address</Label>
            <Textarea
              id="full_address"
              value={form.full_address}
              onChange={(e) => setForm({ ...form, full_address: e.target.value })}
              placeholder="Enter full delivery address"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_location">Delivery Location {form.order_status === 'CONFIRMED' && '*'}</Label>
            <Select value={form.delivery_location} onValueChange={(value) => setForm({ ...form, delivery_location: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select location type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order_status">Order Status</Label>
            <Select value={form.order_status} onValueChange={(value) => setForm({ ...form, order_status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.order_status === 'CONFIRMED' && (
              <p className="text-xs text-muted-foreground">
                Setting status to Confirmed will also create an order automatically.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Adding...' : 'Add Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}