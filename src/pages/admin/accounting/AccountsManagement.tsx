import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, Account } from '@/hooks/useAccounts';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

export default function AccountsManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank' as 'cash' | 'bank' | 'wallet' | 'other',
    account_number: '',
    opening_balance: '0',
    is_default: false,
    is_active: true,
  });

  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const { canEdit } = useAccountingEditAccess();
  const { effectiveRole } = useEffectiveRole();
  const isOwner = effectiveRole === 'OWNER';

  const openDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        account_number: account.account_number || '',
        opening_balance: account.opening_balance.toString(),
        is_default: account.is_default,
        is_active: account.is_active,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        type: 'bank',
        account_number: '',
        opening_balance: '0',
        is_default: false,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const accountData = {
      ...formData,
      opening_balance: parseFloat(formData.opening_balance),
      current_balance: editingAccount ? editingAccount.current_balance : parseFloat(formData.opening_balance),
      currency: 'NPR',
    };

    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, ...accountData });
    } else {
      await createAccount.mutateAsync(accountData);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      await deleteAccount.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts Management</h1>
          <p className="text-muted-foreground">Manage bank accounts, cash, and wallets</p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                New Account
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'New Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Kumari Bank - Main"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              {(!editingAccount || isOwner) && (
                <div className="space-y-2">
                  <Label htmlFor="opening_balance">Opening Balance</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  />
                  {editingAccount && isOwner && (
                    <p className="text-xs text-muted-foreground">
                      Editing opening balance will recalculate current balance
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="is_default">Set as Default</Label>
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  {editingAccount ? 'Update' : 'Create'} Account
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            All Accounts ({accounts.length})
            <span className="ml-4 text-sm font-normal text-muted-foreground">
              Total Balance: {formatNPR(accounts.reduce((sum, acc) => sum + (acc.current_balance ?? 0), 0))}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              )}
              {!isLoading && accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No accounts yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.name}
                    {account.is_default && <Badge className="ml-2" variant="secondary">Default</Badge>}
                  </TableCell>
                  <TableCell className="capitalize">{account.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {account.account_number || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {account.currency} {(account.opening_balance ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${(account.current_balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {account.currency} {(account.current_balance ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.is_active ? 'default' : 'secondary'}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(account)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(account.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
