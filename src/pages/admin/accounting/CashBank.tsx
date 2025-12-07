import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBanks, useCreateBank, useCashLedger, useCreateCashEntry } from '@/hooks/useAccounting';
import { Plus, Wallet, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function CashBank() {
  const [bankDialog, setBankDialog] = useState(false);
  const [cashEntryDialog, setCashEntryDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    branch_name: '',
    ifsc_code: '',
    opening_balance: 0,
  });

  const [cashForm, setCashForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'IN',
    amount: 0,
    description: '',
  });

  const { data: banks } = useBanks();
  const { data: cashLedger } = useCashLedger(dateRange.startDate, dateRange.endDate);
  const createBank = useCreateBank();
  const createCashEntry = useCreateCashEntry();

  const handleAddBank = () => {
    createBank.mutate(bankForm, {
      onSuccess: () => {
        setBankDialog(false);
        setBankForm({
          bank_name: '',
          account_number: '',
          account_holder: '',
          branch_name: '',
          ifsc_code: '',
          opening_balance: 0,
        });
      },
    });
  };

  const handleAddCashEntry = () => {
    createCashEntry.mutate(cashForm, {
      onSuccess: () => {
        setCashEntryDialog(false);
        setCashForm({
          transaction_date: new Date().toISOString().split('T')[0],
          transaction_type: 'IN',
          amount: 0,
          description: '',
        });
      },
    });
  };

  const totalBankBalance = banks?.reduce((sum, bank) => sum + Number(bank.current_balance), 0) || 0;
  const cashIn = cashLedger?.filter(e => e.transaction_type === 'IN').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const cashOut = cashLedger?.filter(e => e.transaction_type === 'OUT').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const cashBalance = cashIn - cashOut;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cash & Bank Management</h1>
          <p className="text-muted-foreground">Track cash and bank transactions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bankDialog} onOpenChange={setBankDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Bank Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Bank Name *</Label>
                  <Input value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} />
                </div>
                <div>
                  <Label>Account Holder</Label>
                  <Input value={bankForm.account_holder} onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })} />
                </div>
                <div>
                  <Label>Branch Name</Label>
                  <Input value={bankForm.branch_name} onChange={(e) => setBankForm({ ...bankForm, branch_name: e.target.value })} />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input value={bankForm.ifsc_code} onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value })} />
                </div>
                <div>
                  <Label>Opening Balance</Label>
                  <Input type="number" value={bankForm.opening_balance} onChange={(e) => setBankForm({ ...bankForm, opening_balance: Number(e.target.value) })} />
                </div>
              </div>
              <Button onClick={handleAddBank} className="w-full">Add Bank Account</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={cashEntryDialog} onOpenChange={setCashEntryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline"><Wallet className="h-4 w-4 mr-2" /> Add Cash Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Cash Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Transaction Type</Label>
                  <Select value={cashForm.transaction_type} onValueChange={(v) => setCashForm({ ...cashForm, transaction_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Cash In</SelectItem>
                      <SelectItem value="OUT">Cash Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input type="number" value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={cashForm.transaction_date} onChange={(e) => setCashForm({ ...cashForm, transaction_date: e.target.value })} />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea value={cashForm.description} onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleAddCashEntry} className="w-full">Add Entry</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            <Wallet className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">NPR {cashBalance.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
            <CreditCard className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">NPR {totalBankBalance.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Period Cash In</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">NPR {cashIn.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Period Cash Out</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">NPR {cashOut.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {banks?.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-semibold">{bank.bank_name}</div>
                    <div className="text-sm text-muted-foreground">{bank.account_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">NPR {Number(bank.current_balance).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {!banks?.length && (
                <div className="text-center text-muted-foreground py-8">No bank accounts added yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Cash Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cashLedger?.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold">{entry.description}</div>
                    <div className="text-sm text-muted-foreground">{format(new Date(entry.transaction_date), 'MMM dd, yyyy')}</div>
                  </div>
                  <div className={`font-bold ${entry.transaction_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.transaction_type === 'IN' ? '+' : '-'} NPR {Number(entry.amount).toLocaleString()}
                  </div>
                </div>
              ))}
              {!cashLedger?.length && (
                <div className="text-center text-muted-foreground py-8">No cash transactions yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
