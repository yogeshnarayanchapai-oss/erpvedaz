import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { EditTransactionDialog } from '@/components/accounting/EditTransactionDialog';
import { format, subDays } from 'date-fns';
import { Download, Search, Pencil } from 'lucide-react';

export default function ViewTransactions() {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'all',
    accountId: '',
    partyId: '',
    categoryId: '',
    search: '',
  });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useTransactions(filters);
  const { data: accounts = [] } = useActiveAccounts();
  const { data: categories = [] } = useTransactionCategories();
  const { data: parties = [] } = usePartiesWithBalances();
  const { canEdit } = useAccountingEditAccess();

  const filteredTransactions = transactions.filter(t => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      t.transaction_code?.toLowerCase().includes(searchLower) ||
      t.reference_no?.toLowerCase().includes(searchLower) ||
      t.note?.toLowerCase().includes(searchLower) ||
      t.parties?.name.toLowerCase().includes(searchLower)
    );
  });

  const exportCSV = () => {
    const headers = ['Code', 'Date', 'Type', 'Account', 'Category', 'Party', 'Amount', 'Reference', 'Cleared', 'Note'];
    const rows = filteredTransactions.map(t => [
      t.transaction_code || '',
      t.date,
      t.type,
      t.from_account?.name || t.to_account?.name || 'N/A',
      t.transaction_categories?.name || 'N/A',
      t.parties?.name || 'N/A',
      t.amount.toString(),
      t.reference_no || '',
      t.is_cleared ? 'Yes' : 'No',
      t.note || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
      case 'invoice_receipt':
        return 'bg-green-100 text-green-800';
      case 'expense':
      case 'bill_payment':
        return 'bg-red-100 text-red-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">View Transactions</h1>
          <p className="text-muted-foreground">All accounting transactions</p>
        </div>
        <Button onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="invoice_receipt">Invoice Receipt</SelectItem>
                  <SelectItem value="bill_payment">Bill Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              <Select value={filters.accountId} onValueChange={(value) => setFilters({ ...filters, accountId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={filters.categoryId} onValueChange={(value) => setFilters({ ...filters, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="party">Party</Label>
              <Select value={filters.partyId} onValueChange={(value) => setFilters({ ...filters, partyId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Parties" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map(party => (
                    <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search reference, note, party..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Cleared</TableHead>
                {canEdit && <TableHead className="w-16">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 10 : 9} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 10 : 9} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm font-medium">{transaction.transaction_code || '-'}</TableCell>
                  <TableCell>{format(new Date(transaction.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(transaction.type)}>
                      {transaction.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.type === 'transfer'
                      ? `${transaction.from_account?.name} → ${transaction.to_account?.name}`
                      : transaction.from_account?.name || transaction.to_account?.name || 'N/A'}
                  </TableCell>
                  <TableCell>{transaction.transaction_categories?.name || '-'}</TableCell>
                  <TableCell>{transaction.parties?.name || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    NPR {transaction.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.reference_no || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.is_cleared ? 'default' : 'secondary'}>
                      {transaction.is_cleared ? 'Cleared' : 'Pending'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTransaction(transaction)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditTransactionDialog
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      />
    </div>
  );
}
