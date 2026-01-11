import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

interface NewTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTransferDialog({ open, onOpenChange }: NewTransferDialogProps) {
  const { data: accounts = [] } = useActiveAccounts();
  const createTransaction = useCreateTransaction();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    from_account_id: '',
    to_account_id: '',
    reference_no: '',
    note: '',
    is_cleared: true,
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      from_account_id: '',
      to_account_id: '',
      reference_no: '',
      note: '',
      is_cleared: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.from_account_id === formData.to_account_id) {
      toast.error('Cannot transfer to the same account');
      return;
    }

    const fromAccount = accounts.find(a => a.id === formData.from_account_id);
    const toAccount = accounts.find(a => a.id === formData.to_account_id);
    
    try {
      await createTransaction.mutateAsync({
        date: formData.date,
        type: 'transfer',
        amount: parseFloat(formData.amount),
        currency: 'NPR',
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        account_id: null,
        category_id: null,
        party_id: null,
        reference_no: formData.reference_no || null,
        note: formData.note || null,
        description: formData.note || `Transfer from ${fromAccount?.name || 'Unknown'} to ${toAccount?.name || 'Unknown'}`,
        is_cleared: formData.is_cleared,
        created_by: null,
        order_id: null,
      });

      toast.success('Transfer completed successfully');
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to create transfer: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Transfer</DialogTitle>
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
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
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
            <Label htmlFor="from">From Account *</Label>
            <Select value={formData.from_account_id} onValueChange={(value) => setFormData({ ...formData, from_account_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {account.currency} {account.current_balance.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To Account *</Label>
            <Select value={formData.to_account_id} onValueChange={(value) => setFormData({ ...formData, to_account_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {account.currency} {account.current_balance.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              placeholder="Reference number"
              value={formData.reference_no}
              onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Remark</Label>
            <Textarea
              id="note"
              placeholder="Optional remark..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_cleared" className="font-medium text-sm">Mark as Cleared</Label>
              <p className="text-xs text-muted-foreground">
                Cleared transfers immediately update account balances
              </p>
            </div>
            <Switch
              id="is_cleared"
              checked={formData.is_cleared}
              onCheckedChange={(checked) => setFormData({ ...formData, is_cleared: checked })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createTransaction.isPending} className="flex-1">
              {createTransaction.isPending ? 'Transferring...' : 'Complete Transfer'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
