import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAccounts } from '@/hooks/useAccounts';
import { SearchableCategorySelect } from './SearchableCategorySelect';
import { SearchablePartySelect } from './SearchablePartySelect';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

interface AddPartyTransactionDialogProps {
  partyId?: string;
  partyName?: string;
}

export function AddPartyTransactionDialog({ partyId: initialPartyId, partyName }: AddPartyTransactionDialogProps) {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedPartyId, setSelectedPartyId] = useState(initialPartyId || '');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isCleared, setIsCleared] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: accounts = [] } = useAccounts();

  const resetForm = () => {
    if (!initialPartyId) setSelectedPartyId('');
    setTransactionType('income');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setDescription('');
    setCategoryId('');
    setAccountId('');
    setIsCleared(false);
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!selectedPartyId) {
      toast.error('Please select a party');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (isCleared && !accountId) {
      toast.error('Please select an account for cleared transaction');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        date,
        transaction_type: (transactionType === 'income' ? 'INCOME' : 'EXPENSE') as any,
        amount: parseFloat(amount),
        description: description.trim(),
        category_id: categoryId || null,
        account_id: accountId || null,
        party_id: selectedPartyId,
        note: notes.trim() || null,
        store_id: storeId,
      } as any);

      if (error) throw error;

      toast.success('Transaction added successfully');
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['parties-balances'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      resetForm();
      setOpen(false);
    } catch (error: any) {
      toast.error(`Failed to add transaction: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
          <Plus className="w-4 h-4 mr-1" />
          Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{partyName ? `Add Transaction for ${partyName}` : 'Add Party Transaction'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!initialPartyId && (
            <div className="space-y-2">
              <Label>Party</Label>
              <SearchablePartySelect 
                value={selectedPartyId} 
                onValueChange={setSelectedPartyId}
                placeholder="Select party..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select value={transactionType} onValueChange={(v) => setTransactionType(v as 'income' | 'expense')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receivable (Income)</SelectItem>
                <SelectItem value="expense">Payable (Expense)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input 
              type="number" 
              placeholder="Enter amount" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              placeholder="e.g., Product sale, Service fee" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <Label>Category (Optional)</Label>
            <SearchableCategorySelect 
              value={categoryId} 
              onValueChange={setCategoryId} 
              nature={transactionType}
              placeholder="Select category..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mark as Cleared</Label>
              <p className="text-xs text-muted-foreground">
                {isCleared ? 'Will update account balance' : 'Will stay as pending'}
              </p>
            </div>
            <Switch checked={isCleared} onCheckedChange={setIsCleared} />
          </div>

          {isCleared && (
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (₹{acc.current_balance?.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea 
              placeholder="Additional notes..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
