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
import { usePendingPayables, useMarkTransactionsCleared } from '@/hooks/useTransactions';
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
  // Pending payables WITHOUT party (for Pending Expenses tab)
  const { data: pendingPayables = [], isLoading: loadingPending } = usePendingPayables();
  const createPayment = useCreatePartyPayment();
  const markCleared = useMarkTransactionsCleared();
  const { canEdit } = useAccountingEditAccess();
  
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<{ id: string; account_id: string | null; transaction_code: string | null; amount: number } | null>(null);
  const [clearAccountId, setClearAccountId] = useState('');
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

  // Filter parties with positive net_payable OR pending payable transactions
  const partiesWithPayables = allParties.filter(p => p.net_payable > 0 || p.pending_payable_amount > 0);

  // Apply search filter
  const filteredParties = partiesWithPayables.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  // Calculate totals - Party Payables include both party balances AND pending party payables
  const totalPartyPayable = partiesWithPayables.reduce((sum, p) => sum + p.total_payable, 0);
  const totalPartyPending = partiesWithPayables.reduce((sum, p) => sum + p.pending_payable_amount, 0);
  const totalPayable = totalPartyPayable + totalPartyPending;
  const totalPaid = partiesWithPayables.reduce((sum, p) => sum + p.total_paid, 0);
  const totalOutstanding = partiesWithPayables.reduce((sum, p) => sum + p.net_payable + p.pending_payable_amount, 0);
  // Pending Expenses only shows party-less entries
  const totalPendingExpense = pendingPayables.reduce((sum, t) => sum + t.amount, 0);
  const partyCount = partiesWithPayables.length;
  
  // Flatten pending payable transactions from all parties for display
  const allPendingPartyPayables = filteredParties.flatMap(p => 
    p.pending_payable_transactions.map(t => ({ ...t, partyName: p.name }))
  );

  const openClearDialog = (transaction: { id: string; account_id: string | null; transaction_code: string | null; amount: number }) => {
    setSelectedTransaction(transaction);
    setClearAccountId(transaction.account_id || '');
    setClearDialogOpen(true);
  };

  const handleClearTransaction = async () => {
    if (!selectedTransaction || !clearAccountId) return;
    
    await markCleared.mutateAsync({ 
      ids: [selectedTransaction.id], 
      accountId: clearAccountId 
    });
    
    setClearDialogOpen(false);
    setSelectedTransaction(null);
  };

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-500" />
              <span className="text-2xl font-bold">{formatNPR(totalPayable)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">To {partyCount} suppliers</p>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{pendingPayables.length}</Badge>
              <span className="text-2xl font-bold text-amber-600">{formatNPR(totalPendingExpense)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="parties" className="w-full">
        <TabsList>
          <TabsTrigger value="parties">Party Payables</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Expenses
            {pendingPayables.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingPayables.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parties" className="space-y-4">
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
                        {formatNPR(party.total_payable + party.pending_payable_amount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatNPR(party.total_paid)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatNPR(party.net_payable + party.pending_payable_amount)}
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

          {/* Pending Party Payables Table */}
          {allPendingPartyPayables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pending Party Payables
                  <Badge variant="secondary">{allPendingPartyPayables.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPendingPartyPayables.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{format(new Date(t.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-mono text-sm">{t.transaction_code}</TableCell>
                        <TableCell className="font-medium">{t.partyName}</TableCell>
                        <TableCell>{t.description || t.note || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-amber-600">{formatNPR(t.amount)}</TableCell>
                        <TableCell>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openClearDialog(t)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Expense Transactions (No Party)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPending && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loadingPending && pendingPayables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No pending expense transactions without party.
                      </TableCell>
                    </TableRow>
                  )}
                  {pendingPayables.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-mono text-sm">{t.transaction_code}</TableCell>
                      <TableCell>{t.description || t.note || '-'}</TableCell>
                      <TableCell>{t.from_account?.name || t.to_account?.name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatNPR(t.amount)}</TableCell>
                      <TableCell>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openClearDialog(t)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mark as Paid Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the account from which this payment was made:
            </p>
            
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm text-muted-foreground">Amount</Label>
              <p className="text-xl font-bold">{formatNPR(selectedTransaction?.amount || 0)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clearAccount">Payment Account *</Label>
              <Select value={clearAccountId} onValueChange={setClearAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {formatNPR(account.current_balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleClearTransaction} disabled={!clearAccountId || markCleared.isPending} className="flex-1">
                {markCleared.isPending ? 'Processing...' : 'Confirm Payment'}
              </Button>
              <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payable Dialog */}
      <CreateReceivablePayableDialog
        type="payable"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}