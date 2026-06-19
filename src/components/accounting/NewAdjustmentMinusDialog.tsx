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
import { InlineTypeSelector } from '@/components/accounting/InlineTypeSelector';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { ConsignmentPicker } from '@/components/accounting/ConsignmentPicker';

interface NewAdjustmentMinusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchType?: (type: TransactionType) => void;
}

export function NewAdjustmentMinusDialog({ open, onOpenChange, onSwitchType }: NewAdjustmentMinusDialogProps) {
  const { data: accounts = [] } = useActiveAccounts();
  const createTransaction = useCreateTransaction();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'), amount: '', account_id: '', reference_no: '', note: '', consignment_id: null as string | null,
  });

  const resetForm = () => {
    setFormData({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', account_id: '', reference_no: '', note: '', consignment_id: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransaction.mutateAsync({
        date: formData.date, transaction_type: 'ADJUSTMENT_MINUS' as TransactionType, amount: parseFloat(formData.amount),
        account_id: formData.account_id || null,
        reference_no: formData.reference_no || null,
        note: formData.note || null, description: formData.note || 'Balance Adjustment (-)',
        consignment_id: formData.consignment_id,
      });
      toast.success('Adjustment (-) created successfully');
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to create adjustment: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Adjustment (-)</DialogTitle>
            <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
              <ShieldCheck className="w-3 h-3" /> Owner Only
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Decrease account balance for adjustments/corrections</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <InlineTypeSelector
            currentType={'ADJUSTMENT_MINUS' as TransactionType}
            allowedTypes={['EXPENSE', 'PAYMENT_OUT', 'SALES_OUT', 'ADJUSTMENT_MINUS' as TransactionType]}
            onSelect={(type) => { if (type !== 'ADJUSTMENT_MINUS' && onSwitchType) onSwitchType(type); }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Date *</Label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Amount *</Label><Input type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Account *</Label>
              <Select value={formData.account_id} onValueChange={v => setFormData({ ...formData, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Reference</Label><Input placeholder="Reference number" value={formData.reference_no} onChange={e => setFormData({ ...formData, reference_no: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Consignment (Optional)</Label><ConsignmentPicker value={formData.consignment_id} onValueChange={v => setFormData({ ...formData, consignment_id: v })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Reason / Remark *</Label><Textarea placeholder="Reason for adjustment..." value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={2} required /></div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={createTransaction.isPending} className="flex-1">{createTransaction.isPending ? 'Saving...' : 'Save Adjustment (-)'}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
