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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileSpreadsheet, ArrowLeft, Eye, Trash2, CheckCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAccounts } from '@/hooks/useAccounts';
import { AddPartyDialog } from '@/components/accounting/AddPartyDialog';
import { AddPartyTransactionDialog } from '@/components/accounting/AddPartyTransactionDialog';
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
  const [balanceFilter, setBalanceFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPayDialogOpen, setBulkPayDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedPendingEntry, setSelectedPendingEntry] = useState<typeof statement[0] | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [bulkPayAmount, setBulkPayAmount] = useState<string>('');
  const [isClearing, setIsClearing] = useState(false);

  const { data: accounts = [] } = useAccounts();

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
      
      // Balance filter logic
      const partyReceivable = Math.max(0, party.net_receivable + party.pending_receivable_amount);
      const partyPayable = Math.max(0, party.net_payable + party.pending_payable_amount);
      const matchesBalance = !balanceFilter || balanceFilter === 'all' ||
        (balanceFilter === 'receivable' && partyReceivable > 0) ||
        (balanceFilter === 'payable' && partyPayable > 0);
      
      return matchesType && matchesSearch && matchesBalance;
    });
  }, [parties, partyTypeFilter, searchTerm, balanceFilter]);

  const summaryStats = useMemo(() => {
    // Receivable = unsettled receivables (net_receivable), Payable = unsettled payables (net_payable)
    // Balance = Receivable - Payable (from unsettled transactions)
    const totalReceivable = parties.reduce((sum, p) => sum + Math.max(0, p.net_receivable + p.pending_receivable_amount), 0);
    const totalPayable = parties.reduce((sum, p) => sum + Math.max(0, p.net_payable + p.pending_payable_amount), 0);
    const totalBalance = totalReceivable - totalPayable;
    return { totalReceivable, totalPayable, totalBalance, partyCount: parties.length };
  }, [parties]);

  const statementSummary = useMemo(() => {
    // Separate cleared (received/paid) vs pending transactions
    const allEntries = statement.filter(e => e.id !== 'opening-balance');
    
    // Cleared entries = PAYMENT type OR (type that is settled/cleared)
    const clearedEntries = allEntries.filter(e => 
      e.type === 'PAYMENT' || e.is_settled === true || (e.type === 'PENDING' && !e.is_pending)
    );
    
    // Pending entries = entries that are not yet cleared/settled
    const pendingEntries = allEntries.filter(e => 
      e.is_pending === true || (e.type === 'TRANSACTION' && e.is_settled !== true)
    );
    
    // Total Debit = only CLEARED debit amounts (actually paid out)
    const totalDebit = clearedEntries.reduce((sum, entry) => sum + entry.debit, 0);
    // Total Credit = only CLEARED credit amounts (actually received)
    const totalCredit = clearedEntries.reduce((sum, entry) => sum + entry.credit, 0);
    
    // Pending amounts (still owed)
    const pendingDebit = pendingEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const pendingCredit = pendingEntries.reduce((sum, entry) => sum + entry.credit, 0);
    
    // Balance = pending receivable - pending payable (what's still owed to us net)
    // If positive = party owes us, if negative = we owe party
    const balance = pendingCredit - pendingDebit;
    
    // Pending = count of not settled transactions
    const pendingCount = pendingEntries.length;
    
    return { totalDebit, totalCredit, balance, pendingCount, pendingCredit, pendingDebit };
  }, [statement]);

  // Get all pending entries that can be selected for bulk pay/receive
  const pendingEntries = useMemo(() => {
    return statement.filter(e => 
      e.id !== 'opening-balance' && 
      ((e.type === 'PENDING' && e.is_pending) || (e.type === 'TRANSACTION' && !e.is_settled))
    );
  }, [statement]);

  // Calculate selected pending totals
  const selectedPendingStats = useMemo(() => {
    const selectedEntries = pendingEntries.filter(e => selectedPendingIds.includes(e.id));
    const totalDebit = selectedEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = selectedEntries.reduce((sum, e) => sum + e.credit, 0);
    return { count: selectedEntries.length, totalDebit, totalCredit, total: totalDebit + totalCredit };
  }, [pendingEntries, selectedPendingIds]);

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

  const togglePendingSelect = (id: string) => {
    setSelectedPendingIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const togglePendingSelectAll = () => {
    if (selectedPendingIds.length === pendingEntries.length) {
      setSelectedPendingIds([]);
    } else {
      setSelectedPendingIds(pendingEntries.map(e => e.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      // Separate IDs by type (exclude opening-balance which can't be deleted)
      const deletableIds = selectedIds.filter(id => id !== 'opening-balance');
      const transactionIds: string[] = [];
      const transactionCodes: string[] = [];
      const paymentIds: string[] = [];
      const pendingIds: string[] = [];
      const pendingCodes: string[] = [];
      
      statement.forEach(entry => {
        if (deletableIds.includes(entry.id)) {
          if (entry.type === 'TRANSACTION') {
            transactionIds.push(entry.id);
            if (entry.transaction_code) transactionCodes.push(entry.transaction_code);
          } else if (entry.type === 'PAYMENT') {
            paymentIds.push(entry.id);
          } else if (entry.type === 'PENDING') {
            pendingIds.push(entry.id);
            if (entry.transaction_code) pendingCodes.push(entry.transaction_code);
          }
        }
      });

      // Delete from party_transactions and linked transactions
      if (transactionIds.length > 0) {
        const { error: transError } = await supabase
          .from('party_transactions')
          .delete()
          .in('id', transactionIds);
        if (transError) throw transError;
        
        // Also delete linked transactions from transactions table
        if (transactionCodes.length > 0) {
          await supabase.from('transactions').delete().in('transaction_code', transactionCodes);
        }
      }

      // Delete from party_payments and any linked transactions
      if (paymentIds.length > 0) {
        const { data: paymentsToDelete, error: payFetchError } = await supabase
          .from('party_payments')
          .select('id, party_id, date, amount, payment_type, bank_account_id')
          .in('id', paymentIds);
        
        if (payFetchError) throw payFetchError;

        if (paymentsToDelete && paymentsToDelete.length > 0) {
          for (const payment of paymentsToDelete as any[]) {
            const descPrefix =
              payment.payment_type === 'RECEIVED' ? 'Payment received from' : 'Payment made to';

            const { data: relatedTransactions, error: txError } = await supabase
              .from('transactions')
              .select('id')
              .eq('party_id', payment.party_id)
              .eq('amount', payment.amount)
              .eq('date', payment.date)
              .eq('account_id', payment.bank_account_id)
              .ilike('description', `${descPrefix}%`);

            if (txError) {
              console.warn('Failed to load linked transactions for payment deletion:', txError);
              continue;
            }

            if (relatedTransactions && relatedTransactions.length > 0) {
              const txIds = relatedTransactions.map((t: any) => t.id as string);
              const { error: delTxError } = await supabase
                .from('transactions')
                .delete()
                .in('id', txIds);
              if (delTxError) {
                console.warn('Failed to delete linked transactions for payment:', delTxError);
              }
            }
          }
        }

        const { error: payError } = await supabase
          .from('party_payments')
          .delete()
          .in('id', paymentIds);
        if (payError) throw payError;
      }

      // Delete pending transactions and linked party_transactions
      if (pendingIds.length > 0) {
        const { error: pendingError } = await supabase
          .from('transactions')
          .delete()
          .in('id', pendingIds);
        if (pendingError) throw pendingError;
        
        // Also delete linked party_transactions
        if (pendingCodes.length > 0) {
          await supabase.from('party_transactions').delete().in('transaction_code', pendingCodes);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['party-payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
        // Delete from party_transactions
        const { error } = await supabase.from('party_transactions').delete().eq('id', entry.id);
        if (error) throw error;
        
        // Also delete linked transaction from transactions table if transaction_code exists
        if (entry.transaction_code) {
          await supabase.from('transactions').delete().eq('transaction_code', entry.transaction_code);
        }
      } else if (entry.type === 'PAYMENT') {
        // Fetch payment so we can also delete any linked transactions
        const { data: payment, error: fetchError } = await supabase
          .from('party_payments')
          .select('id, party_id, date, amount, payment_type, bank_account_id')
          .eq('id', entry.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (payment) {
          const descPrefix =
            payment.payment_type === 'RECEIVED' ? 'Payment received from' : 'Payment made to';

          const { data: relatedTransactions, error: txError } = await supabase
            .from('transactions')
            .select('id')
            .eq('party_id', payment.party_id)
            .eq('amount', payment.amount)
            .eq('date', payment.date)
            .eq('account_id', payment.bank_account_id)
            .ilike('description', `${descPrefix}%`);

          if (txError) {
            console.warn('Failed to load linked transactions for payment deletion:', txError);
          } else if (relatedTransactions && relatedTransactions.length > 0) {
            const txIds = relatedTransactions.map((t: any) => t.id as string);
            const { error: delTxError } = await supabase
              .from('transactions')
              .delete()
              .in('id', txIds);
            if (delTxError) {
              console.warn('Failed to delete linked transactions for payment:', delTxError);
            }
          }
        }

        const { error } = await supabase.from('party_payments').delete().eq('id', entry.id);
        if (error) throw error;
      } else if (entry.type === 'PENDING') {
        // Delete from transactions table
        const { error } = await supabase.from('transactions').delete().eq('id', entry.id);
        if (error) throw error;
        
        // Also delete linked party_transaction if transaction_code exists
        if (entry.transaction_code) {
          await supabase.from('party_transactions').delete().eq('transaction_code', entry.transaction_code);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['party-payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Entry deleted');
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  // Handle pay/receive for inventory transactions (party_transactions)
  const [inventoryPayDialogOpen, setInventoryPayDialogOpen] = useState(false);
  const [selectedInventoryEntry, setSelectedInventoryEntry] = useState<typeof statement[0] | null>(null);
  const [isInventoryPaying, setIsInventoryPaying] = useState(false);

  const handleInventoryPayment = async () => {
    if (!selectedInventoryEntry || !selectedAccountId) {
      toast.error('Please select an account');
      return;
    }
    setIsInventoryPaying(true);
    try {
      // Mark the party_transaction as settled (don't create separate payment to avoid double-counting)
      const { error } = await supabase
        .from('party_transactions')
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          settled_account_id: selectedAccountId,
        })
        .eq('id', selectedInventoryEntry.id);
      
      if (error) throw error;
      
      // Create a transaction record for account balance update
      const amount = selectedInventoryEntry.debit > 0 ? selectedInventoryEntry.debit : selectedInventoryEntry.credit;
      const isReceiving = selectedInventoryEntry.debit > 0;
      
      await supabase.from('transactions').insert({
        date: new Date().toISOString().split('T')[0],
        type: isReceiving ? 'income' : 'expense',
        account_id: selectedAccountId,
        party_id: selectedPartyId,
        amount: amount,
        description: `Settlement: ${selectedInventoryEntry.particulars}`,
        is_cleared: true,
        store_id: selectedParty?.store_id,
      });
      
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Payment recorded');
      setInventoryPayDialogOpen(false);
      setSelectedInventoryEntry(null);
      setSelectedAccountId('');
    } catch (error: any) {
      toast.error(`Failed to record payment: ${error.message}`);
    } finally {
      setIsInventoryPaying(false);
    }
  };

  const handleClearPending = async () => {
    if (!selectedPendingEntry || !selectedAccountId) {
      toast.error('Please select an account');
      return;
    }
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ is_cleared: true, account_id: selectedAccountId })
        .eq('id', selectedPendingEntry.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Transaction cleared');
      setClearDialogOpen(false);
      setSelectedPendingEntry(null);
      setSelectedAccountId('');
    } catch (error: any) {
      toast.error(`Failed to clear: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  // Handle bulk payment for multiple pending transactions with partial payment support
  const [isBulkPaying, setIsBulkPaying] = useState(false);

  const handleBulkPayment = async () => {
    if (selectedPendingIds.length === 0 || !selectedAccountId) {
      toast.error('Please select an account');
      return;
    }
    
    const payAmount = parseFloat(bulkPayAmount) || 0;
    if (payAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (payAmount > selectedPendingStats.total) {
      toast.error('Payment amount cannot exceed total pending');
      return;
    }
    
    setIsBulkPaying(true);
    try {
      const selectedEntries = pendingEntries.filter(e => selectedPendingIds.includes(e.id));
      
      // Sort by date ascending (oldest first)
      const sortedEntries = [...selectedEntries].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let remainingPayment = payAmount;
      const today = format(new Date(), 'yyyy-MM-dd');
      let fullyCleared = 0;
      let partiallyCleared = 0;
      
      for (const entry of sortedEntries) {
        if (remainingPayment <= 0) break;
        
        const entryAmount = entry.debit > 0 ? entry.debit : entry.credit;
        
        if (remainingPayment >= entryAmount) {
          // Fully pay this transaction
          const paymentRemark = `Rs ${entryAmount.toLocaleString()} paid on ${today}`;
          
          if (entry.type === 'PENDING') {
            await supabase
              .from('transactions')
              .update({ 
                is_cleared: true, 
                account_id: selectedAccountId,
                note: entry.remarks ? `${entry.remarks} | ${paymentRemark}` : paymentRemark
              })
              .eq('id', entry.id);
          } else if (entry.type === 'TRANSACTION') {
            await supabase
              .from('party_transactions')
              .update({
                is_settled: true,
                settled_at: new Date().toISOString(),
                settled_account_id: selectedAccountId,
                remarks: entry.remarks ? `${entry.remarks} | ${paymentRemark}` : paymentRemark
              })
              .eq('id', entry.id);
            
            // Create a transaction record for account balance update
            const isReceiving = entry.debit > 0;
            await supabase.from('transactions').insert({
              date: today,
              type: isReceiving ? 'income' : 'expense',
              account_id: selectedAccountId,
              party_id: selectedPartyId,
              amount: entryAmount,
              description: `Settlement: ${entry.particulars}`,
              is_cleared: true,
              store_id: selectedParty?.store_id,
            });
          }
          
          remainingPayment -= entryAmount;
          fullyCleared++;
        } else {
          // Partial payment - update amount to remaining, add remark
          const paidAmount = remainingPayment;
          const remainingAmount = entryAmount - paidAmount;
          const paymentRemark = `Rs ${paidAmount.toLocaleString()} paid from Rs ${entryAmount.toLocaleString()} on ${today}`;
          
          if (entry.type === 'PENDING') {
            await supabase
              .from('transactions')
              .update({ 
                amount: remainingAmount,
                note: entry.remarks ? `${entry.remarks} | ${paymentRemark}` : paymentRemark
              })
              .eq('id', entry.id);
            
            // Create cleared transaction for the paid portion
            const isReceiving = entry.credit > 0;
            await supabase.from('transactions').insert({
              date: today,
              type: isReceiving ? 'income' : 'expense',
              account_id: selectedAccountId,
              party_id: selectedPartyId,
              amount: paidAmount,
              description: `Partial: ${entry.particulars}`,
              note: paymentRemark,
              is_cleared: true,
              store_id: selectedParty?.store_id,
            });
          } else if (entry.type === 'TRANSACTION') {
            await supabase
              .from('party_transactions')
              .update({
                amount: remainingAmount,
                remarks: entry.remarks ? `${entry.remarks} | ${paymentRemark}` : paymentRemark
              })
              .eq('id', entry.id);
            
            // Create a transaction record for the paid portion
            const isReceiving = entry.debit > 0;
            await supabase.from('transactions').insert({
              date: today,
              type: isReceiving ? 'income' : 'expense',
              account_id: selectedAccountId,
              party_id: selectedPartyId,
              amount: paidAmount,
              description: `Partial Settlement: ${entry.particulars}`,
              note: paymentRemark,
              is_cleared: true,
              store_id: selectedParty?.store_id,
            });
          }
          
          remainingPayment = 0;
          partiallyCleared++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['party-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      const message = partiallyCleared > 0 
        ? `${fullyCleared} cleared, ${partiallyCleared} partially paid` 
        : `${fullyCleared} transactions cleared`;
      toast.success(message);
      setBulkPayDialogOpen(false);
      setSelectedPendingIds([]);
      setSelectedAccountId('');
      setBulkPayAmount('');
    } catch (error: any) {
      toast.error(`Failed to process: ${error.message}`);
    } finally {
      setIsBulkPaying(false);
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Debit</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold text-red-600">₹{statementSummary.totalDebit.toLocaleString()}</span></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Credit</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold text-green-600">₹{statementSummary.totalCredit.toLocaleString()}</span></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Balance</CardTitle></CardHeader>
            <CardContent>
              <span className={`text-2xl font-bold ${statementSummary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(statementSummary.balance).toLocaleString()}</span>
              <Badge variant="outline" className="ml-2">{statementSummary.balance >= 0 ? 'Receivable' : 'Payable'}</Badge>
            </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600">{statementSummary.pendingCount}</span>
              <span className="ml-2 text-muted-foreground">transactions</span>
            </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Export</CardTitle></CardHeader>
            <CardContent><Button variant="outline" size="sm" onClick={exportToCSV} className="w-full"><FileSpreadsheet className="w-4 h-4 mr-2" />CSV</Button></CardContent></Card>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transaction Ledger</CardTitle>
            {canEdit && selectedPendingIds.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Selected:</span>
                  <span className="font-medium ml-1">{selectedPendingIds.length}</span>
                  <span className="mx-2">|</span>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-primary ml-1">₹{selectedPendingStats.total.toLocaleString()}</span>
                </div>
                <Button onClick={() => setBulkPayDialogOpen(true)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {selectedPendingStats.totalCredit > selectedPendingStats.totalDebit ? 'Receive' : 'Pay'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {canEdit && pendingEntries.length > 0 && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedPendingIds.length === pendingEntries.length && pendingEntries.length > 0}
                        onCheckedChange={togglePendingSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementLoading && <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
                {!statementLoading && statement.length === 0 && <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>}
                {statement.map((entry) => {
                  const isPending = (entry.type === 'PENDING' && entry.is_pending) || (entry.type === 'TRANSACTION' && !entry.is_settled && entry.id !== 'opening-balance');
                  return (
                  <TableRow key={entry.id} className={entry.is_pending ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                    {canEdit && pendingEntries.length > 0 && (
                      <TableCell>
                        {isPending ? (
                          <Checkbox
                            checked={selectedPendingIds.includes(entry.id)}
                            onCheckedChange={() => togglePendingSelect(entry.id)}
                          />
                        ) : null}
                      </TableCell>
                    )}
                    <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.transaction_code || '-'}</TableCell>
                    <TableCell>
                      {entry.particulars}
                      {entry.is_pending && <Badge variant="outline" className="ml-2 text-amber-600">Pending</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{entry.qty || '-'}</TableCell>
                    <TableCell className="text-right">{entry.rate ? `₹${entry.rate.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right text-red-600">{entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right text-green-600">{entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{entry.balance.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.remarks || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center">
                        {/* Show status badge for settled manual transactions */}
                        {entry.type === 'PENDING' && !entry.is_pending && entry.is_settled && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {entry.credit > 0 ? 'Received' : 'Paid'}
                          </Badge>
                        )}
                        {/* Show status badge for settled inventory transactions */}
                        {entry.type === 'TRANSACTION' && entry.id !== 'opening-balance' && entry.is_settled && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {entry.debit > 0 ? 'Paid' : 'Received'}
                          </Badge>
                        )}
                        {/* Delete button for all entries except opening balance */}
                        {isOwner && entry.id !== 'opening-balance' && (
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
                        )}
                        {entry.id === 'opening-balance' && <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Clear Pending Transaction Dialog */}
        <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPendingEntry?.credit && selectedPendingEntry.credit > 0 ? 'Receive Payment' : 'Make Payment'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Transaction</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedPendingEntry?.particulars} - ₹{(selectedPendingEntry?.debit || selectedPendingEntry?.credit || 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Select Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} (₹{acc.current_balance?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClearDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleClearPending} disabled={isClearing || !selectedAccountId}>
                {isClearing ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pay/Receive for Inventory Transactions Dialog */}
        <Dialog open={inventoryPayDialogOpen} onOpenChange={setInventoryPayDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedInventoryEntry?.debit && selectedInventoryEntry.debit > 0 ? 'Make Payment' : 'Receive Payment'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Transaction</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedInventoryEntry?.particulars} - ₹{(selectedInventoryEntry?.debit || selectedInventoryEntry?.credit || 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Select Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} (₹{acc.current_balance?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInventoryPayDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInventoryPayment} disabled={isInventoryPaying || !selectedAccountId}>
                {isInventoryPaying ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Pay/Receive Dialog */}
        <Dialog open={bulkPayDialogOpen} onOpenChange={(open) => {
          setBulkPayDialogOpen(open);
          if (open) {
            setBulkPayAmount(selectedPendingStats.total.toString());
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPendingStats.totalCredit > selectedPendingStats.totalDebit ? 'Receive Payment' : 'Make Payment'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Selected Transactions</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedPendingIds.length} transactions • Total Pending: ₹{selectedPendingStats.total.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Oldest transactions will be cleared first
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount</Label>
                <Input 
                  type="number" 
                  value={bulkPayAmount} 
                  onChange={(e) => setBulkPayAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={selectedPendingStats.total}
                />
                {parseFloat(bulkPayAmount) < selectedPendingStats.total && parseFloat(bulkPayAmount) > 0 && (
                  <p className="text-xs text-amber-600">
                    Partial payment: Rs {(selectedPendingStats.total - parseFloat(bulkPayAmount)).toLocaleString()} will remain pending
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Select Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} (₹{acc.current_balance?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkPayDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleBulkPayment} 
                disabled={isBulkPaying || !selectedAccountId || !bulkPayAmount || parseFloat(bulkPayAmount) <= 0}
              >
                {isBulkPaying ? 'Processing...' : `Pay ₹${parseFloat(bulkPayAmount || '0').toLocaleString()}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <div className="flex items-center gap-2">
          {canEdit && <AddPartyTransactionDialog />}
          {canEdit && <AddPartyDialog />}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Parties</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold">{summaryStats.partyCount}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receivable</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-green-600">₹{summaryStats.totalReceivable.toLocaleString()}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Payable</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-red-600">₹{summaryStats.totalPayable.toLocaleString()}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Balance</CardTitle></CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${summaryStats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{Math.abs(summaryStats.totalBalance).toLocaleString()}
            </span>
            <Badge variant="outline" className="ml-2">{summaryStats.totalBalance >= 0 ? 'Net Receivable' : 'Net Payable'}</Badge>
          </CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Balance Type</Label>
              <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="receivable">Receivable</SelectItem>
                  <SelectItem value="payable">Payable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Party Type</Label>
              <Select value={partyTypeFilter} onValueChange={setPartyTypeFilter}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setSearchTerm(''); setPartyTypeFilter(''); setBalanceFilter(''); }} className="w-full">Clear</Button>
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
                <TableHead>Party Name</TableHead><TableHead>Type</TableHead>
                <TableHead className="text-right">Receivable</TableHead><TableHead className="text-right">Payable</TableHead>
                <TableHead className="text-right">Balance</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partiesLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
              {!partiesLoading && filteredParties.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No parties found</TableCell></TableRow>}
              {filteredParties.map((party) => {
                const partyReceivable = Math.max(0, party.net_receivable + party.pending_receivable_amount);
                const partyPayable = Math.max(0, party.net_payable + party.pending_payable_amount);
                const partyBalance = partyReceivable - partyPayable;
                return (
                  <TableRow key={party.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPartyId(party.id)}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell><Badge variant="outline">{party.party_type}</Badge></TableCell>
                    <TableCell className="text-right text-green-600">{partyReceivable > 0 ? `₹${partyReceivable.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-right text-red-600">{partyPayable > 0 ? `₹${partyPayable.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${partyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(partyBalance).toLocaleString()}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPartyId(party.id); }}><Eye className="w-4 h-4 mr-1" />View</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}