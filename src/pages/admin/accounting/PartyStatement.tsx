import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePartiesWithBalances } from '@/hooks/useParties';
import { usePartyStatement } from '@/hooks/usePartyStatement';
import { useProducts } from '@/hooks/useProducts';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileSpreadsheet, ArrowLeft, Eye, Trash2, EyeOff, FileText, Plus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AddPartyDialog } from '@/components/accounting/AddPartyDialog';
import { TransactionTypeSelector } from '@/components/accounting/TransactionTypeSelector';
import { NewDepositDialog } from '@/components/accounting/NewDepositDialog';
import { NewExpenseDialog } from '@/components/accounting/NewExpenseDialog';
import { NewPaymentInDialog } from '@/components/accounting/NewPaymentInDialog';
import { NewPaymentOutDialog } from '@/components/accounting/NewPaymentOutDialog';
import { NewSalesInDialog } from '@/components/accounting/NewSalesInDialog';
import { NewSalesOutDialog } from '@/components/accounting/NewSalesOutDialog';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PartyStatement() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const partyIdFromUrl = searchParams.get('party');
  const { canEdit } = useAccountingEditAccess();
  const { effectiveRole } = useEffectiveRole();
  const isOwner = effectiveRole === 'OWNER';

  const [selectedPartyId, setSelectedPartyId] = useState(partyIdFromUrl || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [statementSearch, setStatementSearch] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroBalance, setHideZeroBalance] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [selectedTxType, setSelectedTxType] = useState<string | null>(null);

  const txDialogOpen = selectedTxType !== null;
  const closeTxDialog = () => setSelectedTxType(null);

  const handleTypeSelected = (type: string) => {
    setTypeSelectorOpen(false);
    setSelectedTxType(type);
  };

  const { data: parties = [], isLoading: partiesLoading } = usePartiesWithBalances();
  const { data: products = [] } = useProducts();
  const { data: statement = [], isLoading: statementLoading } = usePartyStatement(
    selectedPartyId,
    { startDate: startDate || undefined, endDate: endDate || undefined, productId: selectedProduct || undefined }
  );

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  const filteredParties = useMemo(() => {
    return parties.filter(party => {
      const matchesType = !partyTypeFilter || partyTypeFilter === 'all' || party.party_type === partyTypeFilter || party.party_type === 'BOTH';
      const matchesSearch = !searchTerm || party.name.toLowerCase().includes(searchTerm.toLowerCase()) || party.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBalance = !balanceFilter || balanceFilter === 'all' ||
        (balanceFilter === 'receivable' && party.net_receivable > 0) ||
        (balanceFilter === 'payable' && party.net_payable > 0);
      const hasBalance = party.net_receivable > 0 || party.net_payable > 0;
      const matchesZeroBalance = !hideZeroBalance || hasBalance;
      return matchesType && matchesSearch && matchesBalance && matchesZeroBalance;
    });
  }, [parties, partyTypeFilter, searchTerm, balanceFilter, hideZeroBalance]);

  const summaryStats = useMemo(() => {
    const totalReceivable = parties.reduce((sum, p) => sum + p.net_receivable, 0);
    const totalPayable = parties.reduce((sum, p) => sum + p.net_payable, 0);
    return { totalReceivable, totalPayable, totalBalance: totalReceivable - totalPayable, partyCount: parties.length };
  }, [parties]);

  const statementSummary = useMemo(() => {
    const allEntries = statement.filter(e => e.id !== 'opening-balance');
    const totalDebit = allEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = allEntries.reduce((sum, e) => sum + e.credit, 0);
    const balance = statement.length > 0 ? statement[0].balance : 0; // newest first, so first = final balance
    return { totalDebit, totalCredit, balance };
  }, [statement]);

  const filteredStatement = useMemo(() => {
    if (!statementSearch.trim()) return statement;
    const search = statementSearch.toLowerCase();
    return statement.filter(e => e.particulars?.toLowerCase().includes(search) || e.remarks?.toLowerCase().includes(search));
  }, [statement, statementSearch]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStatement.filter(e => e.id !== 'opening-balance').length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStatement.filter(e => e.id !== 'opening-balance').map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const deletableIds = selectedIds.filter(id => id !== 'opening-balance');
      const { error } = await supabase.from('transactions').delete().in('id', deletableIds);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(`${deletableIds.length} entries deleted`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSingleDelete = async (entryId: string) => {
    if (entryId === 'opening-balance') { toast.error('Cannot delete opening balance'); return; }
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', entryId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Entry deleted');
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const exportToCSV = () => {
    if (!selectedParty) return;
    const dataToExport = selectedIds.length > 0 ? filteredStatement.filter(e => selectedIds.includes(e.id)) : filteredStatement;
    const headers = ['Date', 'Code', 'Particulars', 'Qty', 'Rate', 'Debit', 'Credit', 'Balance', 'Remarks'];
    const rows = dataToExport.map(entry => [
      entry.date, entry.transaction_code || '', entry.particulars, entry.qty || '', entry.rate || '',
      entry.debit.toFixed(2), entry.credit.toFixed(2), entry.balance.toFixed(2), entry.remarks || '',
    ]);
    const csvContent = [
      [`Party Statement - ${selectedParty.name}`],
      [`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [], headers, ...rows, [],
      ['Summary'], ['Total Debit', statementSummary.totalDebit.toFixed(2)],
      ['Total Credit', statementSummary.totalCredit.toFixed(2)],
      ['Balance', statementSummary.balance.toFixed(2)],
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `party-statement-${selectedParty.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Statement exported');
  };

  const generatePDF = () => {
    if (!selectedParty) return;
    const dataToExport = selectedIds.length > 0 ? filteredStatement.filter(e => selectedIds.includes(e.id)) : filteredStatement;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Party Statement - ${selectedParty.name}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
    doc.text(`Phone: ${selectedParty.phone || 'N/A'}  |  Type: ${selectedParty.party_type}`, 14, 34);

    const tableData = dataToExport.map(e => [
      e.date, e.transaction_code || '', e.particulars,
      e.debit > 0 ? `Rs ${e.debit.toLocaleString()}` : '-',
      e.credit > 0 ? `Rs ${e.credit.toLocaleString()}` : '-',
      `Rs ${e.balance.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Code', 'Particulars', 'Debit', 'Credit', 'Balance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total Debit: Rs ${statementSummary.totalDebit.toLocaleString()}`, 14, finalY);
    doc.text(`Total Credit: Rs ${statementSummary.totalCredit.toLocaleString()}`, 14, finalY + 6);
    doc.text(`Balance: Rs ${Math.abs(statementSummary.balance).toLocaleString()} (${statementSummary.balance >= 0 ? 'Receivable' : 'Payable'})`, 14, finalY + 12);

    doc.save(`party-statement-${selectedParty.name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF generated');
  };

  if (selectedPartyId && selectedParty) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedPartyId(''); setSelectedIds([]); }}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to All Parties
          </Button>
          <div className="flex items-center gap-2">
            {canEdit && <Button size="sm" onClick={() => setTypeSelectorOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Transaction</Button>}
            {selectedIds.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportToCSV}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel ({selectedIds.length})</Button>
                <Button variant="outline" size="sm" onClick={generatePDF}><FileText className="w-4 h-4 mr-2" />PDF ({selectedIds.length})</Button>
              </>
            )}
            {isOwner && selectedIds.length > 0 && (
              <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-2" />Delete ({selectedIds.length})</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete {selectedIds.length} Entries?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the selected entries.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? 'Deleting...' : 'Delete All'}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{selectedParty.name}</h1>
          <p className="text-muted-foreground">{selectedParty.party_type} • {selectedParty.phone || 'No phone'}</p>
        </div>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2"><Label>Search</Label><Input placeholder="Search particulars/remarks..." value={statementSearch} onChange={e => setStatementSearch(e.target.value)} /></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger><SelectValue placeholder="All products" /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end"><Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); setSelectedProduct(''); setStatementSearch(''); }} className="w-full">Clear</Button></div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Debit</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold text-red-600">₹{statementSummary.totalDebit.toLocaleString()}</span></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Credit</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold text-green-600">₹{statementSummary.totalCredit.toLocaleString()}</span></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Balance</CardTitle></CardHeader>
            <CardContent>
              <span className={`text-2xl font-bold ${statementSummary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(statementSummary.balance).toLocaleString()}</span>
              <Badge variant="outline" className="ml-2">{statementSummary.balance >= 0 ? 'Receivable' : 'Payable'}</Badge>
            </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Export</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV} className="flex-1"><FileSpreadsheet className="w-4 h-4 mr-1" />CSV</Button>
                <Button variant="outline" size="sm" onClick={generatePDF} className="flex-1"><FileText className="w-4 h-4 mr-1" />PDF</Button>
              </div>
            </CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Transaction Ledger</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.length === filteredStatement.filter(e => e.id !== 'opening-balance').length && filteredStatement.length > 1} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Remarks</TableHead>
                  {isOwner && <TableHead className="w-16">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementLoading && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
                {!statementLoading && filteredStatement.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>}
                {filteredStatement.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {entry.id !== 'opening-balance' ? (
                        <Checkbox checked={selectedIds.includes(entry.id)} onCheckedChange={() => toggleSelect(entry.id)} />
                      ) : null}
                    </TableCell>
                    <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.transaction_code || '-'}</TableCell>
                    <TableCell>
                      {entry.particulars}
                      {entry.transaction_type && <Badge variant="outline" className="ml-2 text-xs">{entry.transaction_type.replace('_', ' ')}</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-red-600">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-right text-green-600">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(entry.balance).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.remarks || '-'}</TableCell>
                    {isOwner && (
                      <TableCell>
                        {entry.id !== 'opening-balance' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete Entry?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this ledger entry.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleSingleDelete(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Party Statement</h1><p className="text-muted-foreground">View all party balances and statements</p></div>
        <div className="flex items-center gap-2">
          {canEdit && <Button onClick={() => setTypeSelectorOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Transaction</Button>}
          {canEdit && <AddPartyDialog />}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Parties</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold">{summaryStats.partyCount}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receivable</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold text-green-600">₹{summaryStats.totalReceivable.toLocaleString()}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Payable</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold text-red-600">₹{summaryStats.totalPayable.toLocaleString()}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Balance</CardTitle></CardHeader><CardContent>
          <span className={`text-2xl font-bold ${summaryStats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(summaryStats.totalBalance).toLocaleString()}</span>
          <Badge variant="outline" className="ml-2">{summaryStats.totalBalance >= 0 ? 'Net Receivable' : 'Net Payable'}</Badge>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Search</Label><Input placeholder="Search by name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="space-y-2"><Label>Balance Type</Label><Select value={balanceFilter} onValueChange={setBalanceFilter}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="receivable">Receivable</SelectItem><SelectItem value="payable">Payable</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Party Type</Label><Select value={partyTypeFilter} onValueChange={setPartyTypeFilter}><SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="SUPPLIER">Supplier</SelectItem><SelectItem value="CUSTOMER">Customer</SelectItem><SelectItem value="BOTH">Both</SelectItem></SelectContent></Select></div>
            <div className="flex items-end"><Button variant="outline" onClick={() => { setSearchTerm(''); setPartyTypeFilter(''); setBalanceFilter(''); }} className="w-full">Clear</Button></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Parties</CardTitle>
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" /><Label htmlFor="hide-zero-balance" className="text-sm font-normal cursor-pointer">Hide Zero Balance</Label>
            <Switch id="hide-zero-balance" checked={hideZeroBalance} onCheckedChange={setHideZeroBalance} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Party Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Receivable</TableHead><TableHead className="text-right">Payable</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {partiesLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
              {!partiesLoading && filteredParties.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No parties found</TableCell></TableRow>}
              {filteredParties.map(party => {
                const partyBalance = party.net_receivable - party.net_payable;
                return (
                  <TableRow key={party.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPartyId(party.id)}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell><Badge variant="outline">{party.party_type}</Badge></TableCell>
                    <TableCell className="text-right text-green-600">{party.net_receivable > 0 ? `₹${party.net_receivable.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-right text-red-600">{party.net_payable > 0 ? `₹${party.net_payable.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${partyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(partyBalance).toLocaleString()}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelectedPartyId(party.id); }}><Eye className="w-4 h-4 mr-1" />View</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Type Selector */}
      <TransactionTypeSelector
        open={typeSelectorOpen}
        onOpenChange={setTypeSelectorOpen}
        onSelect={handleTypeSelected}
      />

      {/* Transaction Dialogs */}
      <NewDepositDialog open={selectedTxType === 'INCOME'} onOpenChange={open => !open && closeTxDialog()} onChangeType={() => { closeTxDialog(); setTypeSelectorOpen(true); }} />
      <NewExpenseDialog open={selectedTxType === 'EXPENSE'} onOpenChange={open => !open && closeTxDialog()} onChangeType={() => { closeTxDialog(); setTypeSelectorOpen(true); }} />
      <NewPaymentInDialog open={selectedTxType === 'PAYMENT_IN'} onOpenChange={open => !open && closeTxDialog()} onChangeType={() => { closeTxDialog(); setTypeSelectorOpen(true); }} />
      <NewPaymentOutDialog open={selectedTxType === 'PAYMENT_OUT'} onOpenChange={open => !open && closeTxDialog()} onChangeType={() => { closeTxDialog(); setTypeSelectorOpen(true); }} />
      <NewSalesInDialog open={selectedTxType === 'SALES_IN'} onOpenChange={open => !open && closeTxDialog()} onChangeType={() => { closeTxDialog(); setTypeSelectorOpen(true); }} />
      <NewSalesOutDialog open={selectedTxType === 'SALES_OUT'} onOpenChange={open => !open && closeTxDialog()} onChangeType={() => { closeTxDialog(); setTypeSelectorOpen(true); }} />
    </div>
  );
}
