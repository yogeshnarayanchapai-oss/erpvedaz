import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUpdateTransaction, Transaction } from '@/hooks/useTransactions';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { useCreateActivityLog } from '@/hooks/useAccountingActivityLogs';
import { ConsignmentPicker } from '@/components/accounting/ConsignmentPicker';
import { SearchablePartySelect } from '@/components/accounting/SearchablePartySelect';

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
    consignment_ids: [] as string[],
  });

  const { data: accounts = [] } = useActiveAccounts();
  const { data: categories = [] } = useTransactionCategories();
  const updateTransaction = useUpdateTransaction();
  const createActivityLog = useCreateActivityLog();

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date,
        amount: transaction.amount,
        account_id: transaction.account_id || '',
        category_id: transaction.category_id || '',
        party_id: transaction.party_id || 'none',
        reference_no: transaction.reference_no || '',
        note: transaction.note || '',
        consignment_ids: ((transaction as any).consignment_ids as string[] | null) ?? ((transaction as any).consignment_id ? [(transaction as any).consignment_id] : []),
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        date: formData.date,
        amount: formData.amount,
        account_id: formData.account_id || null,
        category_id: formData.category_id || null,
        party_id: formData.party_id === 'none' ? null : formData.party_id || null,
        reference_no: formData.reference_no || null,
        note: formData.note || null,
        consignment_id: formData.consignment_ids[0] ?? null,
        consignment_ids: formData.consignment_ids,
      } as any);

      await createActivityLog.mutateAsync({
        action_type: 'EDIT',
        entity_type: 'TRANSACTION',
        entity_id: transaction.id,
        description: `Edited ${transaction.transaction_type || transaction.type} transaction of NPR ${transaction.amount}`,
        old_values: transaction,
        new_values: formData,
        amount: formData.amount,
      });

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const txType = transaction?.transaction_type || transaction?.type || '';
  const filteredCategories = categories.filter(c => {
    if (['INCOME', 'SALES_OUT', 'PAYMENT_IN'].includes(txType)) return c.nature === 'income';
    if (['EXPENSE', 'SALES_IN', 'PAYMENT_OUT'].includes(txType)) return c.nature === 'expense';
    return true;
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'INCOME': return 'bg-green-100 text-green-800';
      case 'EXPENSE': return 'bg-red-100 text-red-800';
      case 'TRANSFER': return 'bg-blue-100 text-blue-800';
      case 'SALES_OUT': return 'bg-blue-100 text-blue-800';
      case 'SALES_IN': return 'bg-orange-100 text-orange-800';
      case 'PAYMENT_IN': return 'bg-emerald-100 text-emerald-800';
      case 'PAYMENT_OUT': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Transaction
            <Badge className={getTypeBadgeColor(txType)}>{txType.replace('_', ' ')}</Badge>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-sm">Date</Label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required className="h-10" /></div>
            <div className="space-y-1.5"><Label className="text-sm">Amount (NPR)</Label><Input type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required className="h-10" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Bank/Account</Label>
              <Select value={formData.account_id} onValueChange={v => setFormData({ ...formData, account_id: v })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Category</Label>
              <Select value={formData.category_id} onValueChange={v => setFormData({ ...formData, category_id: v })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{filteredCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Party</Label>
              <SearchablePartySelect
                value={formData.party_id}
                onValueChange={v => setFormData({ ...formData, party_id: v })}
                placeholder="Select party"
                showAddButton={false}
              />
            </div>
            <div className="space-y-1.5"><Label className="text-sm">Reference No.</Label><Input value={formData.reference_no} onChange={e => setFormData({ ...formData, reference_no: e.target.value })} placeholder="Optional" className="h-10" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-sm">Consignment (Optional)</Label><ConsignmentPicker value={formData.consignment_id} onValueChange={v => setFormData({ ...formData, consignment_id: v })} /></div>
          <div className="space-y-1.5"><Label className="text-sm">Remark</Label><Textarea value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Optional remark" rows={2} className="min-h-[60px]" /></div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={updateTransaction.isPending} className="w-full sm:w-auto">{updateTransaction.isPending ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
