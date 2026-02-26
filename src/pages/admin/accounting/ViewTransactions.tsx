import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTransactions, Transaction, useDeleteTransaction, TransactionType, useUpdateApprovalStatus, useApprovalHistory, ApprovalStatus } from '@/hooks/useTransactions';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { EditTransactionDialog } from '@/components/accounting/EditTransactionDialog';
import { NewDepositDialog } from '@/components/accounting/NewDepositDialog';
import { NewExpenseDialog } from '@/components/accounting/NewExpenseDialog';
import { NewTransferDialog } from '@/components/accounting/NewTransferDialog';
import { NewPaymentInDialog } from '@/components/accounting/NewPaymentInDialog';
import { NewPaymentOutDialog } from '@/components/accounting/NewPaymentOutDialog';
import { NewSalesInDialog } from '@/components/accounting/NewSalesInDialog';
import { NewSalesOutDialog } from '@/components/accounting/NewSalesOutDialog';
import { NewAdjustmentPlusDialog } from '@/components/accounting/NewAdjustmentPlusDialog';
import { NewAdjustmentMinusDialog } from '@/components/accounting/NewAdjustmentMinusDialog';
import { TransactionTypeSelector } from '@/components/accounting/TransactionTypeSelector';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, subDays, startOfDay } from 'date-fns';
import { Download, Search, Pencil, Trash2, Plus, ArrowLeftRight, MoreHorizontal, Eye, CheckCircle, Clock, History } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function ViewTransactions() {
  const queryClient = useQueryClient();
  const [datePreset, setDatePreset] = useState<string>('today');
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'all',
    accountId: '',
    partyId: '',
    categoryId: '',
    search: '',
  });

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    switch (preset) {
      case 'today':
        setFilters(f => ({ ...f, startDate: format(today, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') }));
        break;
      case 'yesterday': {
        const y = subDays(today, 1);
        setFilters(f => ({ ...f, startDate: format(y, 'yyyy-MM-dd'), endDate: format(y, 'yyyy-MM-dd') }));
        break;
      }
      case '30days':
        setFilters(f => ({ ...f, startDate: format(subDays(today, 29), 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') }));
        break;
      case 'custom':
        break;
    }
  };
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [historyTxId, setHistoryTxId] = useState<string | null>(null);
  
  // Button dialog states
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  // Individual type dialogs
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentInDialogOpen, setPaymentInDialogOpen] = useState(false);
  const [paymentOutDialogOpen, setPaymentOutDialogOpen] = useState(false);
  const [salesInDialogOpen, setSalesInDialogOpen] = useState(false);
  const [salesOutDialogOpen, setSalesOutDialogOpen] = useState(false);
  const [adjustPlusDialogOpen, setAdjustPlusDialogOpen] = useState(false);
  const [adjustMinusDialogOpen, setAdjustMinusDialogOpen] = useState(false);

  // When search is active, bypass date filter
  const effectiveFilters = filters.search
    ? { ...filters, startDate: undefined, endDate: undefined }
    : filters;
  const { data: transactions = [], isLoading } = useTransactions(effectiveFilters as any);
  const { data: accounts = [] } = useActiveAccounts();
  const { data: categories = [] } = useTransactionCategories();
  const { data: parties = [] } = usePartiesWithBalances();
  const { canEdit } = useAccountingEditAccess();
  const deleteTransaction = useDeleteTransaction();
  const updateApproval = useUpdateApprovalStatus();
  const { data: approvalHistory = [] } = useApprovalHistory(historyTxId || undefined);
  
  const canDelete = canEdit;

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

  const handleTypeSelected = (type: TransactionType) => {
    switch (type) {
      case 'INCOME': setDepositDialogOpen(true); break;
      case 'EXPENSE': setExpenseDialogOpen(true); break;
      case 'PAYMENT_IN': setPaymentInDialogOpen(true); break;
      case 'PAYMENT_OUT': setPaymentOutDialogOpen(true); break;
      case 'SALES_IN': setSalesInDialogOpen(true); break;
      case 'SALES_OUT': setSalesOutDialogOpen(true); break;
      case 'ADJUSTMENT_PLUS' as TransactionType: setAdjustPlusDialogOpen(true); break;
      case 'ADJUSTMENT_MINUS' as TransactionType: setAdjustMinusDialogOpen(true); break;
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', selectedIds);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      toast.success(`${selectedIds.length} transactions deleted`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportCSV = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredTransactions.filter(t => selectedIds.includes(t.id))
      : filteredTransactions;
      
    const headers = ['Code', 'Date', 'Type', 'Account', 'Category', 'Party', 'Amount', 'Reference', 'Note'];
    const rows = dataToExport.map(t => {
      let accountName = 'N/A';
      if (t.transaction_type === 'TRANSFER') {
        const fromName = t.from_account?.name || '';
        const toName = t.to_account?.name || '';
        accountName = fromName && toName ? `${fromName} → ${toName}` : fromName || toName || 'N/A';
      } else {
        accountName = t.account?.name || 'N/A';
      }
      
      return [
        t.transaction_code || '',
        t.date,
        t.transaction_type,
        accountName,
        t.transaction_categories?.name || 'N/A',
        t.parties?.name || 'N/A',
        t.amount.toString(),
        t.reference_no || '',
        t.note || '',
      ];
    });

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
      case 'INCOME': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'EXPENSE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'TRANSFER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'SALES_OUT': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'SALES_IN': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'PAYMENT_IN': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'PAYMENT_OUT': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'ADJUSTMENT_PLUS': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'ADJUSTMENT_MINUS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME': return 'Income';
      case 'EXPENSE': return 'Expense';
      case 'TRANSFER': return 'Transfer';
      case 'SALES_OUT': return 'Sales Out';
      case 'SALES_IN': return 'Sales In';
      case 'PAYMENT_IN': return 'Payment In';
      case 'PAYMENT_OUT': return 'Payment Out';
      case 'ADJUSTMENT_PLUS': return 'Adjust (+)';
      case 'ADJUSTMENT_MINUS': return 'Adjust (-)';
      default: return type;
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">View Transactions</h1>
          <p className="text-muted-foreground">All accounting transactions</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setDepositDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              New Deposit
            </Button>
            <Button onClick={() => setExpenseDialogOpen(true)} variant="destructive">
              <Plus className="w-4 h-4 mr-2" />
              New Expense
            </Button>
            <Button onClick={() => setTransferDialogOpen(true)} variant="outline">
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Transfer
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={datePreset} onValueChange={handleDatePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {datePreset === 'custom' && (
              <>
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="SALES_OUT">Sales Out</SelectItem>
                  <SelectItem value="SALES_IN">Sales In</SelectItem>
                  <SelectItem value="PAYMENT_IN">Payment In</SelectItem>
                  <SelectItem value="PAYMENT_OUT">Payment Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              <Select value={filters.accountId} onValueChange={(value) => setFilters({ ...filters, accountId: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={filters.categoryId} onValueChange={(value) => setFilters({ ...filters, categoryId: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="party">Party</Label>
              <Select value={filters.partyId} onValueChange={(value) => setFilters({ ...filters, partyId: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Parties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
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
          <div className="flex items-center justify-between">
            <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Export ({selectedIds.length})
                  </Button>
                  {canDelete && (
                    <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete ({selectedIds.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {selectedIds.length} Transactions?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the selected transactions and recalculate account balances.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete All'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              )}
              {!selectedIds.length && (
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {canDelete && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Transaction Type</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                
                <TableHead>Remark</TableHead>
                {canEdit && <TableHead className="w-24">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={canDelete ? 11 : 9} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canDelete ? 11 : 9} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  {canDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(transaction.id)}
                        onCheckedChange={() => toggleSelect(transaction.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm font-medium">{transaction.transaction_code || '-'}</TableCell>
                  <TableCell>{format(new Date(transaction.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge className={`${getTypeColor(transaction.transaction_type)} inline-flex items-center gap-1.5`}>
                      {transaction.approval_status === 'APPROVED' ? (
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      ) : transaction.approval_status === 'PENDING' ? (
                        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                      ) : null}
                      {getTypeLabel(transaction.transaction_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.transaction_type === 'TRANSFER'
                      ? `${transaction.from_account?.name || 'N/A'} → ${transaction.to_account?.name || 'N/A'}`
                      : transaction.account?.name || 'N/A'}
                  </TableCell>
                  <TableCell>{transaction.transaction_categories?.name || '-'}</TableCell>
                  <TableCell>{transaction.parties?.name || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    NPR {transaction.amount.toLocaleString()}
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.note || '-'}
                  </TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingTransaction(transaction)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {/* Approve/Pending toggle for stock_movement transactions */}
                          {canEdit && transaction.approval_status === 'PENDING' && (
                            <DropdownMenuItem onClick={() => updateApproval.mutate({ id: transaction.id, status: 'APPROVED' })}>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          {canEdit && transaction.approval_status === 'APPROVED' && (
                            <DropdownMenuItem onClick={() => updateApproval.mutate({ id: transaction.id, status: 'PENDING' })}>
                              <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                              Set Pending
                            </DropdownMenuItem>
                          )}
                          
                          {canEdit && (
                            <DropdownMenuItem onClick={() => setEditingTransaction(transaction)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem 
                              onClick={() => setDeleteConfirmId(transaction.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Dialogs */}
      <EditTransactionDialog
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      />
      
      <NewDepositDialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen} onSwitchType={(type) => { setDepositDialogOpen(false); handleTypeSelected(type); }} />
      <NewExpenseDialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} onSwitchType={(type) => { setExpenseDialogOpen(false); handleTypeSelected(type); }} />
      <NewTransferDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} />
      <NewPaymentInDialog open={paymentInDialogOpen} onOpenChange={setPaymentInDialogOpen} onSwitchType={(type) => { setPaymentInDialogOpen(false); handleTypeSelected(type); }} />
      <NewPaymentOutDialog open={paymentOutDialogOpen} onOpenChange={setPaymentOutDialogOpen} onSwitchType={(type) => { setPaymentOutDialogOpen(false); handleTypeSelected(type); }} />
      <NewSalesInDialog open={salesInDialogOpen} onOpenChange={setSalesInDialogOpen} onSwitchType={(type) => { setSalesInDialogOpen(false); handleTypeSelected(type); }} />
      <NewSalesOutDialog open={salesOutDialogOpen} onOpenChange={setSalesOutDialogOpen} onSwitchType={(type) => { setSalesOutDialogOpen(false); handleTypeSelected(type); }} />
      <NewAdjustmentPlusDialog open={adjustPlusDialogOpen} onOpenChange={setAdjustPlusDialogOpen} onSwitchType={(type) => { setAdjustPlusDialogOpen(false); handleTypeSelected(type); }} />
      <NewAdjustmentMinusDialog open={adjustMinusDialogOpen} onOpenChange={setAdjustMinusDialogOpen} onSwitchType={(type) => { setAdjustMinusDialogOpen(false); handleTypeSelected(type); }} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteTransaction.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewingTransaction} onOpenChange={(open) => !open && setViewingTransaction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Transaction Code</Label>
                  <p className="font-mono font-medium">{viewingTransaction.transaction_code || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Date</Label>
                  <p className="font-medium">{format(new Date(viewingTransaction.date), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Transaction Type</Label>
                  <div className="mt-1">
                    <Badge className={getTypeColor(viewingTransaction.transaction_type)}>
                      {getTypeLabel(viewingTransaction.transaction_type)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Amount</Label>
                  <p className="font-bold text-lg">NPR {viewingTransaction.amount.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Account</Label>
                <p className="font-medium">
                  {viewingTransaction.transaction_type === 'TRANSFER'
                    ? `${viewingTransaction.from_account?.name || 'N/A'} → ${viewingTransaction.to_account?.name || 'N/A'}`
                    : viewingTransaction.account?.name || 'N/A'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <p className="font-medium">{viewingTransaction.transaction_categories?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Party</Label>
                  <p className="font-medium">{viewingTransaction.parties?.name || '-'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Reference No</Label>
                <p className="font-medium">{viewingTransaction.reference_no || '-'}</p>
              </div>

              {viewingTransaction.note && (
                <div>
                  <Label className="text-muted-foreground text-xs">Remark</Label>
                  <div className="mt-1 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm">{viewingTransaction.note}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval History Dialog */}
      <Dialog open={!!historyTxId} onOpenChange={(open) => !open && setHistoryTxId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Approval History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {approvalHistory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No history yet</p>
            )}
            {approvalHistory.map((h: any) => (
              <div key={h.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{h.from_status}</Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge className={h.to_status === 'APPROVED' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}>
                      {h.to_status}
                    </Badge>
                  </div>
                  {h.note && <p className="text-xs text-muted-foreground mt-1">{h.note}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(h.changed_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
