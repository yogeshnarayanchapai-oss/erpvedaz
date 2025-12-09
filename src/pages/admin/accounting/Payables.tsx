import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useCreatePartyPayment } from '@/hooks/usePartyPayments';
import { usePendingPayables, useMarkTransactionsCleared, Transaction } from '@/hooks/useTransactions';
import { format } from 'date-fns';
import { DollarSign, FileText, Download, Search, TrendingDown, CheckCircle, Plus } from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { useNavigate } from 'react-router-dom';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { CreateReceivablePayableDialog } from '@/components/accounting/CreateReceivablePayableDialog';

export default function Payables() {
  const navigate = useNavigate();
  const { data: allParties = [], isLoading } = usePartiesWithBalances();
  const { data: accounts = [] } = useActiveAccounts();
  const createPayment = useCreatePartyPayment();
  const { canEdit } = useAccountingEditAccess();
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    date: string;
    amount: string;
    method: 'CASH' | 'BANK' | 'OTHER';
    bank_account_id: string;
    reference: string;
    note: string;
  }>({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    method: 'CASH',
    bank_account_id: '',
    reference: '',
    note: '',
  });

  // Filter parties with positive net_payable (we owe them money)
  const partiesWithPayables = allParties.filter(p => p.net_payable > 0);

  // Apply search filter
  const filteredParties = partiesWithPayables.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  const totalPayable = partiesWithPayables.reduce((sum, p) => sum + p.total_payable, 0);
  const totalPaid = partiesWithPayables.reduce((sum, p) => sum + p.total_paid, 0);
  const totalOutstanding = partiesWithPayables.reduce((sum, p) => sum + p.net_payable, 0);

  const handlePayment = async () => {
    if (!selectedParty) return;

    await createPayment.mutateAsync({
      party_id: selectedParty,
      date: paymentData.date,
      amount: parseFloat(paymentData.amount),
      payment_type: 'PAID',
      method: paymentData.method,
      bank_account_id: paymentData.method === 'BANK' && paymentData.bank_account_id ? paymentData.bank_account_id : null,
      reference: paymentData.reference || null,
      note: paymentData.note || null,
    });

    setSelectedParty('');
    setPaymentData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      method: 'CASH',
      bank_account_id: '',
      reference: '',
      note: '',
    });
  };

  const exportToCSV = () => {
    const headers = ['Party Name', 'Phone', 'Type', 'Total Payable', 'Total Paid', 'Outstanding'];
    const rows = filteredParties.map(p => [
      p.name,
      p.phone || '',
      p.party_type,
      p.total_payable,
      p.total_paid,
      p.net_payable,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payables-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payables (Suppliers)</h1>
          <p className="text-muted-foreground">Track amounts you owe to suppliers</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Payable
            </Button>
          )}
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-500" />
              <span className="text-2xl font-bold">{formatNPR(totalPayable)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">To {partiesWithPayables.length} suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{formatNPR(totalPaid)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{formatNPR(totalOutstanding)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parties with Payables</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total Payable</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredParties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No payables found
                  </TableCell>
                </TableRow>
              )}
              {filteredParties.map((party) => (
                <TableRow key={party.id}>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell>{party.phone || '—'}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      {party.party_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNPR(party.total_payable)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatNPR(party.total_paid)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {formatNPR(party.net_payable)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/admin/accounting/party-statement?party=${party.id}`)}
                        title="View Statement"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedParty(party.id);
                                setPaymentData(prev => ({
                                  ...prev,
                                  amount: party.net_payable.toString(),
                                }));
                              }}
                            >
                              Pay Supplier
                            </Button>
                          </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Pay {party.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <Label className="text-sm text-muted-foreground">Outstanding Amount</Label>
                            <p className="text-xl font-bold text-red-600">{formatNPR(party.net_payable)}</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Input
                              id="date"
                              type="date"
                              value={paymentData.date}
                              onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="amount">Amount *</Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              value={paymentData.amount}
                              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="method">Payment Method *</Label>
                            <Select
                              value={paymentData.method}
                              onValueChange={(value: any) => setPaymentData({ ...paymentData, method: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="BANK">Bank Transfer</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {paymentData.method === 'BANK' && (
                            <div className="space-y-2">
                              <Label htmlFor="bank">Bank Account</Label>
                              <Select
                                value={paymentData.bank_account_id}
                                onValueChange={(value) => setPaymentData({ ...paymentData, bank_account_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select bank account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.filter(a => a.type === 'bank').map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.name} {account.account_number && `- ${account.account_number}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="reference">Reference (Cheque No., UTR, etc.)</Label>
                            <Input
                              id="reference"
                              value={paymentData.reference}
                              onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="note">Notes</Label>
                            <Textarea
                              id="note"
                              value={paymentData.note}
                              onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <Button onClick={handlePayment} disabled={createPayment.isPending} className="w-full">
                            {createPayment.isPending ? 'Processing...' : 'Record Payment'}
                          </Button>
                        </div>
                        </DialogContent>
                      </Dialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Payable Dialog */}
      <CreateReceivablePayableDialog
        type="payable"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
