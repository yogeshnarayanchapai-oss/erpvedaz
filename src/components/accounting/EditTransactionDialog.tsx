import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpdateTransaction, Transaction } from '@/hooks/useTransactions';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { useCreateActivityLog } from '@/hooks/useAccountingActivityLogs';
import { toast } from 'sonner';

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({ transaction, open, onOpenChange }: EditTransactionDialogProps) {
  const [formData, setFormData] = useState({
    date: '',
    amount: 0,
    account_id: '',
    category_id: '',
    party_id: '',
    reference_no: '',
    note: '',
    is_cleared: false,
  });

  const { data: accounts = [] } = useActiveAccounts();
  const { data: categories = [] } = useTransactionCategories();
  const { data: parties = [] } = usePartiesWithBalances();
  const updateTransaction = useUpdateTransaction();
  const createActivityLog = useCreateActivityLog();

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date,
        amount: transaction.amount,
        account_id: transaction.account_id || '',
        category_id: transaction.category_id || '',
        party_id: transaction.party_id || '',
        reference_no: transaction.reference_no || '',
        note: transaction.note || '',
        is_cleared: transaction.is_cleared,
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    const oldValues = {
      date: transaction.date,
      amount: transaction.amount,
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      party_id: transaction.party_id,
      reference_no: transaction.reference_no,
      note: transaction.note,
      is_cleared: transaction.is_cleared,
    };

    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        date: formData.date,
        amount: formData.amount,
        account_id: formData.account_id || null,
        category_id: formData.category_id || null,
        party_id: formData.party_id || null,
        reference_no: formData.reference_no || null,
        note: formData.note || null,
        is_cleared: formData.is_cleared,
      });

      // Log the edit activity
      await createActivityLog.mutateAsync({
        action_type: 'EDIT',
        entity_type: 'TRANSACTION',
        entity_id: transaction.id,
        description: `Edited ${transaction.type} transaction of NPR ${transaction.amount}`,
        old_values: oldValues,
        new_values: formData,
        amount: formData.amount,
      });

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const filteredCategories = categories.filter(c => {
    if (transaction?.type === 'income') return c.nature === 'income';
    if (transaction?.type === 'expense') return c.nature === 'expense';
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Date and Amount in grid on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-sm">Amount (NPR)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                required
                className="h-10"
              />
            </div>
          </div>

          {/* Account and Category in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="account" className="text-sm">Bank/Account</Label>
              <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm">Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Party and Reference in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="party" className="text-sm">Party</Label>
              <Select value={formData.party_id} onValueChange={(value) => setFormData({ ...formData, party_id: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select party" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map(party => (
                    <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reference" className="text-sm">Reference No.</Label>
              <Input
                id="reference"
                value={formData.reference_no}
                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                placeholder="Optional"
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-sm">Remark</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Optional remark"
              rows={2}
              className="min-h-[60px]"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label htmlFor="cleared" className="text-sm">Mark as Cleared</Label>
            <Switch
              id="cleared"
              checked={formData.is_cleared}
              onCheckedChange={(checked) => setFormData({ ...formData, is_cleared: checked })}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={updateTransaction.isPending} className="w-full sm:w-auto">
              {updateTransaction.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
