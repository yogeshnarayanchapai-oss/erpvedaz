import { useState } from 'react';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { useCreatePartyPayment } from '@/hooks/usePartyPayments';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { usePendingReceivables, usePendingPartyReceivables, useMarkTransactionsCleared, Transaction } from '@/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, TrendingUp, Download, Search, CheckCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { formatNPR } from '@/lib/currency';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { CreateReceivablePayableDialog } from '@/components/accounting/CreateReceivablePayableDialog';

export default function Receivables() {
  const navigate = useNavigate();
  const { data: allParties = [], isLoading } = usePartiesWithBalances();
  const { data: accounts = [] } = useActiveAccounts();
  // Pending receivables WITHOUT party (for Pending Income tab)
  const { data: pendingReceivables = [], isLoading: loadingPending } = usePendingReceivables();
  // Pending receivables WITH party (for Party Receivables tab)
  const { data: pendingPartyReceivables = [], isLoading: loadingPartyPending } = usePendingPartyReceivables();
  const createPayment = useCreatePartyPayment();
  const markCleared = useMarkTransactionsCleared();
  const { canEdit } = useAccountingEditAccess();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentData, setPaymentData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    method: 'CASH' as 'CASH' | 'BANK' | 'OTHER',
    bank_account_id: '',
    reference: '',
    note: '',
  });
  const [clearAccountId, setClearAccountId] = useState('');

  // Filter parties with positive net_receivable (they owe us money)
  const partiesWithReceivables = allParties.filter(p => p.net_receivable > 0);

  // Apply search filter
  const filteredParties = partiesWithReceivables.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  // Calculate totals - Party Receivables include both party balances AND pending party receivables
  const totalPartyReceivable = partiesWithReceivables.reduce((sum, p) => sum + p.total_receivable, 0);
  const totalPartyPending = pendingPartyReceivables.reduce((sum, t) => sum + t.amount, 0);
  const totalReceivable = totalPartyReceivable + totalPartyPending;
  const totalReceived = partiesWithReceivables.reduce((sum, p) => sum + p.total_received, 0);
  const totalOutstanding = partiesWithReceivables.reduce((sum, p) => sum + p.net_receivable, 0) + totalPartyPending;
  // Pending Income only shows party-less entries
  const totalPendingIncome = pendingReceivables.reduce((sum, t) => sum + t.amount, 0);
  const partyCount = partiesWithReceivables.length + (pendingPartyReceivables.length > 0 ? new Set(pendingPartyReceivables.map(t => t.party_id)).size : 0);

  const openPaymentDialog = (party: any) => {
    setSelectedParty(party);
    setPaymentData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: party.net_receivable.toString(),
      method: 'CASH',
      bank_account_id: '',
      reference: '',
      note: '',
    });
    setPaymentDialogOpen(true);
  };

  const openClearDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setClearAccountId(transaction.account_id || '');
    setClearDialogOpen(true);
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;

    await createPayment.mutateAsync({
      party_id: selectedParty.id,
      date: paymentData.date,
      amount: parseFloat(paymentData.amount),
      payment_type: 'RECEIVED',
      method: paymentData.method,
      bank_account_id: paymentData.method === 'BANK' && paymentData.bank_account_id ? paymentData.bank_account_id : null,
      reference: paymentData.reference || null,
      note: paymentData.note || null,
    });

    setPaymentDialogOpen(false);
    setSelectedParty(null);
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

  const exportToCSV = () => {
    const headers = ['Party Name', 'Phone', 'Type', 'Total Receivable', 'Total Received', 'Outstanding'];
    const rows = filteredParties.map(p => [
      p.name,
      p.phone || '',
      p.party_type,
      p.total_receivable,
      p.total_received,
      p.net_receivable,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receivables-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Receivables</h1>
          <p className="text-muted-foreground">Manage payments from customers & wholesalers</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Receivable
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-2xl font-bold">{formatNPR(totalReceivable)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">From {partyCount} parties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{formatNPR(totalReceived)}</span>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{pendingReceivables.length}</Badge>
              <span className="text-2xl font-bold text-amber-600">{formatNPR(totalPendingIncome)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="parties" className="w-full">
        <TabsList>
          <TabsTrigger value="parties">Party Receivables</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Income
            {pendingReceivables.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingReceivables.length}</Badge>
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

          {/* Parties Table */}
          <Card>
            <CardHeader>
              <CardTitle>Parties with Receivables</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total Receivable</TableHead>
                    <TableHead className="text-right">Total Received</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                  {!isLoading && filteredParties.length === 0 && pendingPartyReceivables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No parties with outstanding receivables found.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredParties.map((party) => (
                    <TableRow key={party.id}>
                      <TableCell className="font-medium">{party.name}</TableCell>
                      <TableCell>{party.phone || '-'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {party.party_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatNPR(party.total_receivable)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatNPR(party.total_received)}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">{formatNPR(party.net_receivable)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/accounting/party-statement?party=${party.id}`)}
                            title="View Statement"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openPaymentDialog(party)}
                            >
                              Receive Payment
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pending Party Receivables Table */}
          {pendingPartyReceivables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pending Party Receivables
                  <Badge variant="secondary">{pendingPartyReceivables.length}</Badge>
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
                    {loadingPartyPending && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    )}
                    {pendingPartyReceivables.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{format(new Date(t.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-mono text-sm">{t.transaction_code}</TableCell>
                        <TableCell className="font-medium">{t.parties?.name || '-'}</TableCell>
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
                              Mark Received
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
              <CardTitle>Pending Income Transactions (No Party)</CardTitle>
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
                  {!loadingPending && pendingReceivables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No pending income transactions without party.
                      </TableCell>
                    </TableRow>
                  )}
                  {pendingReceivables.map((t) => (
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
                            Mark Received
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

      {/* Receive Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Payment from {selectedParty?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReceivePayment} className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm text-muted-foreground">Outstanding Amount</Label>
              <p className="text-xl font-bold text-red-600">{formatNPR(selectedParty?.net_receivable || 0)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                  required
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
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={paymentData.method} onValueChange={(value: any) => setPaymentData({ ...paymentData, method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK">Bank</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentData.method === 'BANK' && (
              <div className="space-y-2">
                <Label htmlFor="bank">Bank Account</Label>
                <Select value={paymentData.bank_account_id} onValueChange={(value) => setPaymentData({ ...paymentData, bank_account_id: value })}>
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
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="Transaction ref, check number, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={paymentData.note}
                onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clear Transaction Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Received</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm text-muted-foreground">Transaction</Label>
              <p className="font-medium">{selectedTransaction?.transaction_code}</p>
              <p className="text-xl font-bold text-green-600">{formatNPR(selectedTransaction?.amount || 0)}</p>
            </div>

            <div className="space-y-2">
              <Label>Receive in Account *</Label>
              <Select value={clearAccountId} onValueChange={setClearAccountId}>
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

            <Button 
              onClick={handleClearTransaction} 
              className="w-full" 
              disabled={markCleared.isPending || !clearAccountId}
            >
              {markCleared.isPending ? 'Processing...' : 'Mark as Received & Clear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Receivable Dialog */}
      <CreateReceivablePayableDialog
        type="receivable"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
