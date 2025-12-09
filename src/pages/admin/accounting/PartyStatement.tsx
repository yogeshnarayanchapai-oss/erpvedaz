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
import { FileSpreadsheet, ArrowLeft, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AddPartyDialog } from '@/components/accounting/AddPartyDialog';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
  const [partyTypeFilter, setPartyTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: parties = [], isLoading: partiesLoading } = usePartiesWithBalances();
  const { data: products = [] } = useProducts();
  const { data: statement = [], isLoading: statementLoading } = usePartyStatement(
    selectedPartyId,
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      productId: selectedProduct || undefined,
    }
  );

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  const filteredParties = useMemo(() => {
    return parties.filter(party => {
      const matchesType = !partyTypeFilter || partyTypeFilter === 'all' || party.party_type === partyTypeFilter || party.party_type === 'BOTH';
      const matchesSearch = !searchTerm || 
        party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        party.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [parties, partyTypeFilter, searchTerm]);

  const summaryStats = useMemo(() => {
    const totalReceivable = parties.reduce((sum, p) => sum + Math.max(0, p.current_balance), 0);
    const totalPayable = parties.reduce((sum, p) => sum + Math.abs(Math.min(0, p.current_balance)), 0);
    return { totalReceivable, totalPayable, partyCount: parties.length };
  }, [parties]);

  const statementSummary = useMemo(() => {
    const totalDebit = statement.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = statement.reduce((sum, entry) => sum + entry.credit, 0);
    const balance = statement.length > 0 ? statement[statement.length - 1].balance : 0;
    return { totalDebit, totalCredit, balance };
  }, [statement]);

  const toggleSelectAll = () => {
    if (selectedIds.length === statement.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(statement.map(e => e.id));
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
      // Separate IDs by type (exclude opening-balance which can't be deleted)
      const deletableIds = selectedIds.filter(id => id !== 'opening-balance');
      const transactionIds: string[] = [];
      const paymentIds: string[] = [];
      
      statement.forEach(entry => {
        if (deletableIds.includes(entry.id)) {
          if (entry.type === 'TRANSACTION') {
            transactionIds.push(entry.id);
          } else if (entry.type === 'PAYMENT') {
            paymentIds.push(entry.id);
          }
        }
      });

      // Delete from party_transactions
      if (transactionIds.length > 0) {
        const { error: transError } = await supabase
          .from('party_transactions')
          .delete()
          .in('id', transactionIds);
        if (transError) throw transError;
      }

      // Delete from party_payments
      if (paymentIds.length > 0) {
        const { error: payError } = await supabase
          .from('party_payments')
          .delete()
          .in('id', paymentIds);
        if (payError) throw payError;
      }
      
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['party-payments'] });
      toast.success(`${deletableIds.length} entries deleted`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSingleDelete = async (entry: typeof statement[0]) => {
    if (entry.id === 'opening-balance') {
      toast.error('Cannot delete opening balance');
      return;
    }
    try {
      if (entry.type === 'TRANSACTION') {
        const { error } = await supabase.from('party_transactions').delete().eq('id', entry.id);
        if (error) throw error;
      } else if (entry.type === 'PAYMENT') {
        const { error } = await supabase.from('party_payments').delete().eq('id', entry.id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['party-payments'] });
      toast.success('Entry deleted');
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const exportToCSV = () => {
    if (!selectedParty) return;
    const headers = ['Date', 'Particulars', 'Qty', 'Rate', 'Debit', 'Credit', 'Balance', 'Remarks'];
    const rows = statement.map(entry => [
      entry.date, entry.particulars, entry.qty || '', entry.rate || '',
      entry.debit.toFixed(2), entry.credit.toFixed(2), entry.balance.toFixed(2), entry.remarks || '',
    ]);
    const csvContent = [
      [`Party Statement - ${selectedParty.name}`],
      [`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [], headers, ...rows, [],
      ['Summary'], ['Total Debit', statementSummary.totalDebit.toFixed(2)],
      ['Total Credit', statementSummary.totalCredit.toFixed(2)],
      ['Current Balance', statementSummary.balance.toFixed(2)],
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

  if (selectedPartyId && selectedParty) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedPartyId(''); setSelectedIds([]); }}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to All Parties
          </Button>
          {isOwner && selectedIds.length > 0 && (
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedIds.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedIds.length} Entries?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the selected ledger entries. This action cannot be undone.
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
        </div>
        <div>
          <h1 className="text-2xl font-bold">{selectedParty.name}</h1>
          <p className="text-muted-foreground">{selectedParty.party_type} • {selectedParty.phone || 'No phone'}</p>
        </div>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger><SelectValue placeholder="All products" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); setSelectedProduct(''); }} className="w-full">Clear</Button>
              </div>
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
            <CardContent><Button variant="outline" size="sm" onClick={exportToCSV} className="w-full"><FileSpreadsheet className="w-4 h-4 mr-2" />CSV</Button></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Transaction Ledger</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {isOwner && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length === statement.length && statement.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead><TableHead>Particulars</TableHead><TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Remarks</TableHead>
                  {isOwner && <TableHead className="w-16">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementLoading && <TableRow><TableCell colSpan={isOwner ? 11 : 8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
                {!statementLoading && statement.length === 0 && <TableRow><TableCell colSpan={isOwner ? 11 : 8} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>}
                {statement.map((entry) => (
                  <TableRow key={entry.id}>
                    {isOwner && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onCheckedChange={() => toggleSelect(entry.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{entry.particulars}</TableCell>
                    <TableCell className="text-right">{entry.qty || '-'}</TableCell>
                    <TableCell className="text-right">{entry.rate ? `₹${entry.rate.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right text-red-600">{entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right text-green-600">{entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{entry.balance.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.remarks || '-'}</TableCell>
                    {isOwner && entry.id !== 'opening-balance' && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this ledger entry. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleSingleDelete(entry)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                    {isOwner && entry.id === 'opening-balance' && <TableCell>-</TableCell>}
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
        <div>
          <h1 className="text-2xl font-bold">Party Statement</h1>
          <p className="text-muted-foreground">View all party balances and statements</p>
        </div>
        {canEdit && <AddPartyDialog />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Parties</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold">{summaryStats.partyCount}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Receivable</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-green-600">₹{summaryStats.totalReceivable.toLocaleString()}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Payable</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-red-600">₹{summaryStats.totalPayable.toLocaleString()}</span></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Party Type</Label>
              <Select value={partyTypeFilter} onValueChange={setPartyTypeFilter}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  <SelectItem value="WHOLESALER">Wholesaler</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setSearchTerm(''); setPartyTypeFilter(''); }} className="w-full">Clear</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All Parties</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party Name</TableHead><TableHead>Type</TableHead><TableHead>Phone</TableHead>
                <TableHead className="text-right">Receivable</TableHead><TableHead className="text-right">Payable</TableHead>
                <TableHead className="text-right">Balance</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partiesLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
              {!partiesLoading && filteredParties.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No parties found</TableCell></TableRow>}
              {filteredParties.map((party) => (
                <TableRow key={party.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPartyId(party.id)}>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell><Badge variant="outline">{party.party_type}</Badge></TableCell>
                  <TableCell>{party.phone || '-'}</TableCell>
                  <TableCell className="text-right text-green-600">{party.current_balance > 0 ? `₹${party.current_balance.toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right text-red-600">{party.current_balance < 0 ? `₹${Math.abs(party.current_balance).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className={`text-right font-medium ${party.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(party.current_balance).toLocaleString()}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPartyId(party.id); }}><Eye className="w-4 h-4 mr-1" />View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}