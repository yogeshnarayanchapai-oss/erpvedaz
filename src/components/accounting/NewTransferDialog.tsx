import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    date: format(new Date(), 'yyyy-MM-dd'), amount: '', from_account_id: '', to_account_id: '', reference_no: '', note: '',
  });

  const resetForm = () => {
    setFormData({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', from_account_id: '', to_account_id: '', reference_no: '', note: '' });
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
        date: formData.date, transaction_type: 'TRANSFER', amount: parseFloat(formData.amount),
        from_account_id: formData.from_account_id, to_account_id: formData.to_account_id,
        account_id: null, reference_no: formData.reference_no || null, note: formData.note || null,
        description: formData.note || `Transfer from ${fromAccount?.name || 'Unknown'} to ${toAccount?.name || 'Unknown'}`,
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
        <DialogHeader><DialogTitle>New Transfer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Date *</Label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Amount *</Label><Input type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">From Account *</Label>
              <Select value={formData.from_account_id} onValueChange={v => setFormData({ ...formData, from_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Source account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency} {a.current_balance.toLocaleString()})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><ArrowRight className="h-3 w-3" /> To Account *</Label>
              <Select value={formData.to_account_id} onValueChange={v => setFormData({ ...formData, to_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Destination account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency} {a.current_balance.toLocaleString()})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Reference</Label><Input placeholder="Reference number" value={formData.reference_no} onChange={e => setFormData({ ...formData, reference_no: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Remark</Label><Textarea placeholder="Optional remark..." value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={createTransaction.isPending} className="flex-1">{createTransaction.isPending ? 'Transferring...' : 'Complete Transfer'}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
