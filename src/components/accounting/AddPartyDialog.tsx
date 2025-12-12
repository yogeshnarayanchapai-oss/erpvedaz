import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateParty } from '@/hooks/useParties';
import { Plus } from 'lucide-react';

interface AddPartyDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddPartyDialog({ trigger, onSuccess }: AddPartyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createParty = useCreateParty();

  const [formData, setFormData] = useState({
    name: '',
    party_type: 'SUPPLIER' as 'SUPPLIER' | 'CUSTOMER' | 'BOTH',
    phone: '',
    email: '',
    address: '',
    opening_balance: 0,
    opening_balance_type: null as 'RECEIVABLE' | 'PAYABLE' | null,
    remarks: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createParty.mutateAsync({
      name: formData.name.trim(),
      party_type: formData.party_type,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      opening_balance: formData.opening_balance || 0,
      opening_balance_type: formData.opening_balance > 0 ? formData.opening_balance_type : null,
      remarks: formData.remarks || null,
    });

    setFormData({
      name: '',
      party_type: 'SUPPLIER',
      phone: '',
      email: '',
      address: '',
      opening_balance: 0,
      opening_balance_type: null,
      remarks: '',
    });
    setIsOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Party
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Party</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Party Name *</Label>
            <Input
              id="name"
              placeholder="Enter party name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Party Type *</Label>
            <Select
              value={formData.party_type}
              onValueChange={(value: 'SUPPLIER' | 'CUSTOMER' | 'BOTH') =>
                setFormData({ ...formData, party_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPPLIER">Supplier</SelectItem>
                <SelectItem value="CUSTOMER">Customer</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opening_balance">Opening Balance</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.opening_balance || ''}
                onChange={(e) =>
                  setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Balance Type</Label>
              <Select
                value={formData.opening_balance_type || 'none'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    opening_balance_type: value === 'none' ? null : (value as 'RECEIVABLE' | 'PAYABLE'),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="RECEIVABLE">Receivable</SelectItem>
                  <SelectItem value="PAYABLE">Payable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Additional notes..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={createParty.isPending || !formData.name.trim()}>
              {createParty.isPending ? 'Adding...' : 'Add Party'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
