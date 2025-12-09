import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { format } from 'date-fns';
import { ArrowLeft, ShieldAlert, Upload } from 'lucide-react';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { SearchablePartySelect } from '@/components/accounting/SearchablePartySelect';
import { SearchableCategorySelect } from '@/components/accounting/SearchableCategorySelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportTransactionsDialog } from '@/components/accounting/ImportTransactionsDialog';

export default function NewExpense() {
  const navigate = useNavigate();
  const { data: accounts = [] } = useActiveAccounts();
  const createTransaction = useCreateTransaction();
  const { canEdit } = useAccountingEditAccess();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    account_id: '',
    category_id: '',
    party_id: '',
    reference_no: '',
    note: '',
  });

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
      is_cleared: false,
      created_by: null,
      from_account_id: null,
      to_account_id: null,
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
              You don't have permission to create expenses. Only OWNER and ACCOUNTANT roles can create transactions.
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Expense</h1>
            <p className="text-muted-foreground">Record money paid out</p>
          </div>
        </div>
        <ImportTransactionsDialog 
          type="expense" 
          trigger={
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Expenses
            </Button>
          }
        />
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
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
              <Label htmlFor="account">Pay from Account *</Label>
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
              <Label htmlFor="category">Category *</Label>
              <SearchableCategorySelect
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                nature="expense"
                placeholder="Select expense category..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="party">Party (Optional)</Label>
              <SearchablePartySelect
                value={formData.party_id}
                onValueChange={(value) => setFormData({ ...formData, party_id: value })}
                placeholder="Select or add party..."
              />
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

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createTransaction.isPending}>
                {createTransaction.isPending ? 'Saving...' : 'Save Expense'}
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
