import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateAuditEntry } from '@/hooks/useAuditDashboard';
import { format } from 'date-fns';

interface AuditManualEntryFormProps {
  open: boolean;
  onClose: () => void;
}

const categories = [
  { value: 'sales', label: 'Sales' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'expense', label: 'Expense' },
  { value: 'other', label: 'Other' },
];

export function AuditManualEntryForm({ open, onClose }: AuditManualEntryFormProps) {
  const [formData, setFormData] = useState({
    category: '',
    sub_category: '',
    description: '',
    amount: '',
    quantity: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    include_in_audit: true,
  });

  const createEntry = useCreateAuditEntry();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createEntry.mutateAsync({
      category: formData.category,
      sub_category: formData.sub_category || undefined,
      description: formData.description,
      amount: parseFloat(formData.amount) || 0,
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
      date: formData.date,
      notes: formData.notes || undefined,
      include_in_audit: formData.include_in_audit,
    });
    
    onClose();
    setFormData({
      category: '',
      sub_category: '',
      description: '',
      amount: '',
      quantity: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      include_in_audit: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Manual Audit Entry</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Sub-Category</Label>
              <Input
                value={formData.sub_category}
                onChange={(e) => setFormData(prev => ({ ...prev, sub_category: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Entry description"
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Include in Audit</Label>
            <Switch
              checked={formData.include_in_audit}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_in_audit: checked }))}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
