import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchSelect } from '@/components/BranchSelect';
import { useProducts } from '@/hooks/useProducts';
import { useStaff } from '@/hooks/useStaff';
import { useCustomerInsight } from '@/hooks/useCustomerInsight';
import { CustomerInsightCard } from '@/components/customers/CustomerInsightCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface AdminAddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminAddLeadDialog({ open, onOpenChange }: AdminAddLeadDialogProps) {
  const { profile } = useAuth();
  const { data: products = [] } = useProducts();
  const { data: callingStaff = [] } = useStaff('CALLING');
  const { data: followupStaff = [] } = useStaff('FOLLOWUP');
  const queryClient = useQueryClient();
  
  const allAssignableStaff = [...callingStaff, ...followupStaff];
  
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    client_name: '',
    contact_number: '',
    alt_phone: '',
    product_id: '',
    branch_id: '',
    destination_branch: '',
    full_address: '',
    status: 'NEW',
    assigned_to_user_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer insight check using hook
  const { data: customerInsight, isLoading: insightLoading } = useCustomerInsight(form.contact_number, open);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      client_name: '',
      contact_number: '',
      alt_phone: '',
      product_id: '',
      branch_id: '',
      destination_branch: '',
      full_address: '',
      status: 'NEW',
      assigned_to_user_id: '',
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

    setIsSubmitting(true);
    try {
      const leadData: any = {
        date: form.date,
        client_name: form.client_name.trim(),
        contact_number: form.contact_number.trim(),
        alt_phone: form.alt_phone.trim() || null,
        product_id: form.product_id,
        branch_id: form.branch_id || null,
        destination_branch: form.destination_branch || null,
        full_address: form.full_address.trim() || null,
        status: form.status as any,
        created_by_user_id: profile?.id,
        lead_bucket: 'NEW',
        current_team: 'LEADS',
        pool_status: 'IN_POOL',
      };

      // If assigned to someone, set assignment fields
      if (form.assigned_to_user_id && form.assigned_to_user_id !== '__NONE__') {
        leadData.assigned_to_user_id = form.assigned_to_user_id;
        leadData.assigned_at = new Date().toISOString();
        leadData.pool_status = 'ASSIGNED';
        
        // Determine current_team based on assigned staff's role
        const assignedStaff = allAssignableStaff.find(s => s.id === form.assigned_to_user_id);
        if (assignedStaff) {
          leadData.current_team = assignedStaff.role as 'CALLING' | 'FOLLOWUP' | 'LEADS';
        }
      }

      const { error } = await supabase
        .from('leads')
        .insert(leadData);

      if (error) throw error;

      toast.success('Lead created successfully');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

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
            <Label>Branch</Label>
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
            <Label htmlFor="status">Status *</Label>
            <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="CALL_NOT_RECEIVED">CNR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To (Optional)</Label>
            <Select value={form.assigned_to_user_id} onValueChange={(value) => setForm({ ...form, assigned_to_user_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff or leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">Unassigned (Pool)</SelectItem>
                {allAssignableStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
