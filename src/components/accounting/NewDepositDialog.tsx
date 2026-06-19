import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction, TransactionType } from '@/hooks/useTransactions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SearchablePartySelect } from '@/components/accounting/SearchablePartySelect';
import { SearchableCategorySelect } from '@/components/accounting/SearchableCategorySelect';
import { InlineTypeSelector } from '@/components/accounting/InlineTypeSelector';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { ConsignmentPicker } from '@/components/accounting/ConsignmentPicker';

interface NewDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchType?: (type: TransactionType) => void;
}

export function NewDepositDialog({ open, onOpenChange, onSwitchType }: NewDepositDialogProps) {
  const { data: accounts = [] } = useActiveAccounts();
  const createTransaction = useCreateTransaction();
  const { effectiveRole } = useEffectiveRole();
  const isOwner = effectiveRole === 'OWNER';
  const depositAllowedTypes: TransactionType[] = isOwner 
    ? ['INCOME', 'PAYMENT_IN', 'SALES_IN', 'ADJUSTMENT_PLUS' as TransactionType] 
    : ['INCOME', 'PAYMENT_IN', 'SALES_IN'];

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'), amount: '', account_id: '', category_id: '', party_id: '', reference_no: '', note: '',
  });

  const resetForm = () => {
    setFormData({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', account_id: '', category_id: '', party_id: '', reference_no: '', note: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransaction.mutateAsync({
        date: formData.date, transaction_type: 'INCOME', amount: parseFloat(formData.amount),
        account_id: formData.account_id || null, category_id: formData.category_id || null,
        party_id: formData.party_id || null, reference_no: formData.reference_no || null,
        note: formData.note || null, description: formData.note || 'Deposit',
      });
      toast.success('Income created successfully');
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to create income: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Income</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <InlineTypeSelector
            currentType="INCOME"
            allowedTypes={depositAllowedTypes}
            onSelect={(type) => { if (type !== 'INCOME' && onSwitchType) onSwitchType(type); }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Date *</Label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Amount *</Label><Input type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Receive in Account *</Label>
              <Select value={formData.account_id} onValueChange={v => setFormData({ ...formData, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Category *</Label><SearchableCategorySelect value={formData.category_id} onValueChange={v => setFormData({ ...formData, category_id: v })} nature="income" placeholder="Select category..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Party (Optional)</Label><SearchablePartySelect value={formData.party_id} onValueChange={v => setFormData({ ...formData, party_id: v })} placeholder="Select party..." /></div>
            <div className="space-y-1.5"><Label className="text-xs">Reference</Label><Input placeholder="Reference number" value={formData.reference_no} onChange={e => setFormData({ ...formData, reference_no: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Remark</Label><Textarea placeholder="Optional remark..." value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={2} /></div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={createTransaction.isPending} className="flex-1">{createTransaction.isPending ? 'Saving...' : 'Save Income'}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
