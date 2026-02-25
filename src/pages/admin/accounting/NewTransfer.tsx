import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';

export default function NewTransfer() {
  const navigate = useNavigate();
  const { data: accounts = [] } = useActiveAccounts();
  const createTransaction = useCreateTransaction();
  const { canEdit } = useAccountingEditAccess();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    from_account_id: '',
    to_account_id: '',
    reference_no: '',
    note: '',
    is_cleared: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.from_account_id === formData.to_account_id) {
      alert('Cannot transfer to the same account');
      return;
    }

    const fromAccount = accounts.find(a => a.id === formData.from_account_id);
    const toAccount = accounts.find(a => a.id === formData.to_account_id);
    
    await createTransaction.mutateAsync({
      date: formData.date,
      transaction_type: 'TRANSFER',
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
      created_by: null,
      order_id: null,
    });

    navigate('/admin/accounting/transactions');
  };

  if (!canEdit) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">View Only Access</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to create transfers. Only OWNER and ACCOUNTANT roles can create transactions.
            </p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Transfer</h1>
          <p className="text-muted-foreground">Move money between accounts</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent>
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
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
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
              <Label htmlFor="note">Notes</Label>
              <Textarea
                id="note"
                placeholder="Additional notes..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="is_cleared" className="font-medium">Mark as Cleared</Label>
                <p className="text-sm text-muted-foreground">
                  Cleared transfers immediately update account balances
                </p>
              </div>
              <Switch
                id="is_cleared"
                checked={formData.is_cleared}
                onCheckedChange={(checked) => setFormData({ ...formData, is_cleared: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createTransaction.isPending}>
                {createTransaction.isPending ? 'Transferring...' : 'Complete Transfer'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
