import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { format } from 'date-fns';

interface CreateReceivablePayableDialogProps {
  type: 'receivable' | 'payable';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateReceivablePayableDialog({ type, open, onOpenChange }: CreateReceivablePayableDialogProps) {
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    description: '',
    party_id: '',
    category_id: '',
    account_id: '',
    reference_no: '',
    note: '',
    is_cleared: false,
  });

  const { data: accounts = [] } = useActiveAccounts();
  const { data: categories = [] } = useTransactionCategories();
  const { data: parties = [] } = usePartiesWithBalances();
  const createTransaction = useCreateTransaction();

  const transactionType = type === 'receivable' ? 'income' : 'expense';
  const filteredCategories = categories.filter(c => c.nature === transactionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTransaction.mutateAsync({
      date: formData.date,
      transaction_type: transactionType === 'income' ? 'INCOME' : 'EXPENSE',
      amount: parseFloat(formData.amount) || 0,
      description: formData.description || (type === 'receivable' ? 'Custom Receivable' : 'Custom Payable'),
      party_id: formData.party_id || null,
      category_id: formData.category_id || null,
      account_id: formData.account_id || null,
      from_account_id: null,
      to_account_id: null,
      order_id: null,
      reference_no: formData.reference_no || null,
      note: formData.note || null,
      currency: 'NPR',
      created_by: null,
    });

    // Reset form
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      description: '',
      party_id: '',
      category_id: '',
      account_id: '',
      reference_no: '',
      note: '',
      is_cleared: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'receivable' ? 'Create Receivable (Income)' : 'Create Payable (Expense)'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NPR) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={type === 'receivable' ? 'e.g., Sales invoice pending' : 'e.g., Supplier bill pending'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="party">Party</Label>
            <Select value={formData.party_id} onValueChange={(value) => setFormData({ ...formData, party_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select party (optional)" />
              </SelectTrigger>
              <SelectContent>
                {parties.map(party => (
                  <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">Bank/Account</Label>
            <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select account (optional)" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference No.</Label>
            <Input
              id="reference"
              value={formData.reference_no}
              onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
              placeholder="Invoice/Bill number (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label htmlFor="cleared">Mark as Cleared</Label>
              <p className="text-xs text-muted-foreground">
                {formData.is_cleared 
                  ? 'Will affect account balance immediately' 
                  : 'Will remain pending until cleared'}
              </p>
            </div>
            <Switch
              id="cleared"
              checked={formData.is_cleared}
              onCheckedChange={(checked) => setFormData({ ...formData, is_cleared: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}