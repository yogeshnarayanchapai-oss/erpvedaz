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
import { SearchablePartySelect } from './SearchablePartySelect';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function NewSalesOutDialog({ open, onOpenChange }: Props) {
  const { data: accounts = [] } = useActiveAccounts();
  const createTransaction = useCreateTransaction();
  const [isCash, setIsCash] = useState(false);
  const [formData, setFormData] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', account_id: '', party_id: '', note: '' });

  const resetForm = () => { setFormData({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', account_id: '', party_id: '', note: '' }); setIsCash(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCash && !formData.account_id) { toast.error('Account required for cash sale'); return; }
    try {
      await createTransaction.mutateAsync({
        date: formData.date,
        transaction_type: 'SALES_OUT',
        amount: parseFloat(formData.amount),
        account_id: isCash ? formData.account_id : null,
        party_id: formData.party_id || null,
        note: formData.note || null,
        description: formData.note || 'Sale (Sales Out)',
      });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Sales Out (Wholesale Sale)</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required /></div>
          </div>
          <div className="space-y-2"><Label>Party (Optional)</Label><SearchablePartySelect value={formData.party_id} onValueChange={v => setFormData({ ...formData, party_id: v })} placeholder="Select customer..." /></div>
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div>
              <Label className="font-medium text-sm">Cash Sale</Label>
              <p className="text-xs text-muted-foreground">{isCash ? 'Will add to account balance' : 'Credit entry (no account affected)'}</p>
            </div>
            <Switch checked={isCash} onCheckedChange={setIsCash} />
          </div>
          {isCash && (
            <div className="space-y-2">
              <Label>Receive in Account *</Label>
              <Select value={formData.account_id} onValueChange={v => setFormData({ ...formData, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2"><Label>Remark</Label><Textarea placeholder="Optional remark..." value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} rows={2} /></div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createTransaction.isPending} className="flex-1">{createTransaction.isPending ? 'Saving...' : 'Save Sales Out'}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
