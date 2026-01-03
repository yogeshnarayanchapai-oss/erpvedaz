import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { SearchablePartySelect } from '@/components/accounting/SearchablePartySelect';
import { SearchableCategorySelect } from '@/components/accounting/SearchableCategorySelect';
import { format } from 'date-fns';
import { Minus } from 'lucide-react';

export function NewExpenseDialog() {
  const [open, setOpen] = useState(false);
  const { data: accounts = [] } = useActiveAccounts();
  const createTransaction = useCreateTransaction();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    account_id: '',
    category_id: '',
    party_id: '',
    reference_no: '',
    note: '',
    is_cleared: false,
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      account_id: '',
      category_id: '',
      party_id: '',
      reference_no: '',
      note: '',
      is_cleared: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTransaction.mutateAsync({
      date: formData.date,
      type: 'expense',
      amount: parseFloat(formData.amount),
      currency: 'NPR',
      account_id: formData.account_id || null,
      category_id: formData.category_id || null,
      party_id: formData.party_id || null,
      reference_no: formData.reference_no || null,
      note: formData.note || null,
      description: formData.note || 'Expense',
      is_cleared: formData.is_cleared,
      created_by: null,
      from_account_id: null,
      to_account_id: null,
      order_id: null,
    });

    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Minus className="w-4 h-4 mr-2" />
          New Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date *</Label>
              <Input
                id="expense-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount *</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pay from Account *</Label>
            <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <SearchableCategorySelect
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              nature="expense"
              placeholder="Select expense category..."
            />
          </div>

          <div className="space-y-2">
            <Label>Party (Optional)</Label>
            <SearchablePartySelect
              value={formData.party_id}
              onValueChange={(value) => setFormData({ ...formData, party_id: value })}
              placeholder="Select or add party..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-reference">Reference</Label>
            <Input
              id="expense-reference"
              placeholder="Reference number"
              value={formData.reference_no}
              onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-note">Notes</Label>
            <Textarea
              id="expense-note"
              placeholder="Additional notes..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div>
              <Label className="font-medium">Mark as Cleared</Label>
              <p className="text-xs text-muted-foreground">
                {formData.is_cleared 
                  ? 'Amount will be deducted from account balance immediately' 
                  : 'Will appear as Pending in Payables'}
              </p>
            </div>
            <Switch
              checked={formData.is_cleared}
              onCheckedChange={(checked) => setFormData({ ...formData, is_cleared: checked })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createTransaction.isPending} className="flex-1">
              {createTransaction.isPending ? 'Saving...' : 'Save Expense'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
