import { useState } from 'react';
import { FileDown, EyeOff, UserPlus } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useRecalculateAccountBalance, Account } from '@/hooks/useAccounts';
import { useAccountingAssets, useAccountingAssetTotal, AccountingAsset } from '@/hooks/useAccountingAssets';
import { useCreateAsset, useAssignAsset } from '@/hooks/useAssets';
import { Plus, Pencil, Trash2, RefreshCw, Wallet, Package, TrendingUp } from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';

export default function AccountsManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [hideZeroBalance, setHideZeroBalance] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningAsset, setAssigningAsset] = useState<AccountingAsset | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignCondition, setAssignCondition] = useState('Good');
  const [assetSearch, setAssetSearch] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank' as 'cash' | 'bank' | 'wallet' | 'other',
    account_number: '',
    opening_balance: '0',
    is_default: false,
    is_active: true,
  });

  const storeId = useCurrentStoreId();
  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const recalculateBalance = useRecalculateAccountBalance();
  const { canEdit } = useAccountingEditAccess();
  const { effectiveRole } = useEffectiveRole();
  const isOwner = effectiveRole === 'OWNER';

  // Assets data
  const { data: assets = [], isLoading: assetsLoading } = useAccountingAssets();
  const { data: totalAssetValue = 0 } = useAccountingAssetTotal();
  const createAssetMutation = useCreateAsset();
  const assignAssetMutation = useAssignAsset();

  // Fetch asset assignments with employee names linked to accounting assets
  const { data: assetAssignmentMap = {} } = useQuery({
    queryKey: ['accounting-asset-assignments', storeId],
    queryFn: async () => {
      let query = supabase
        .from('asset_assignments')
        .select('*, assets!inner(asset_code), employees!inner(full_name)')
        .is('returned_on', null)
        .order('assigned_on', { ascending: false });

      if (storeId) query = query.eq('store_id', storeId);

      const { data, error } = await query;
      if (error) throw error;

      // Build map: transaction_id -> { employee_name, assignment_id, asset_id }
      const map: Record<string, { employee_name: string; assignment_id: string; asset_id: string }> = {};
      (data || []).forEach((a: any) => {
        const code = a.assets?.asset_code;
        if (code && code.startsWith('ACC-')) {
          const txIdPrefix = code.replace('ACC-', '').toLowerCase();
          map[txIdPrefix] = {
            employee_name: a.employees?.full_name || 'Unknown',
            assignment_id: a.id,
            asset_id: a.asset_id,
          };
        }
      });
      return map;
    },
    enabled: !!storeId,
  });

  const getAssignmentForAsset = (assetId: string) => {
    const prefix = assetId.substring(0, 6).toLowerCase();
    return assetAssignmentMap[prefix] || null;
  };

  // Employees for assign dialog
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-assign', storeId],
    queryFn: async () => {
      let query = supabase.from('employees').select('id, full_name').eq('status', 'Active').order('full_name');
      if (storeId) query = query.eq('store_id', storeId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });

  const displayedAccounts = hideZeroBalance
    ? accounts.filter(a => (a.current_balance ?? 0) !== 0)
    : accounts;

  const handleExportPDF = () => {
    const positiveAccounts = accounts.filter(a => (a.current_balance ?? 0) > 0);
    if (positiveAccounts.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Accounts Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Account Name', 'Type', 'Account Number', 'Opening Balance', 'Current Balance', 'Status']],
      body: positiveAccounts.map(a => [
        a.name + (a.is_default ? ' (Default)' : ''),
        a.type,
        a.account_number || '-',
        `NPR ${(a.opening_balance ?? 0).toLocaleString()}`,
        `NPR ${(a.current_balance ?? 0).toLocaleString()}`,
        a.is_active ? 'Active' : 'Inactive',
      ]),
      foot: [['', '', '', 'Total:', `NPR ${positiveAccounts.reduce((s, a) => s + (a.current_balance ?? 0), 0).toLocaleString()}`, '']],
    });
    doc.save('accounts-report.pdf');
  };

  const openAssignDialog = (asset: AccountingAsset) => {
    setAssigningAsset(asset);
    setAssignEmployeeId('');
    setAssignCondition('Good');
    setAssignNotes('');
    setAssignDialogOpen(true);
  };

  const handleAssignAsset = async () => {
    if (!assigningAsset || !assignEmployeeId) return;
    try {
      // Create asset in assets table first
      const assetCode = `ACC-${assigningAsset.id.substring(0, 6).toUpperCase()}`;
      const result = await createAssetMutation.mutateAsync({
        asset_code: assetCode,
        name: assigningAsset.description,
        category: assigningAsset.category_name || 'General',
        description: `From accounting: ${assigningAsset.description}`,
        purchase_date: assigningAsset.date,
        purchase_cost: assigningAsset.amount,
        status: 'Assigned',
      });

      // Create assignment
      await assignAssetMutation.mutateAsync({
        asset_id: (result as any).id,
        employee_id: assignEmployeeId,
        assigned_on: new Date().toISOString().split('T')[0],
        condition_on_assign: assignCondition,
        notes: assignNotes || null,
      });

      setAssignDialogOpen(false);
    } catch (error: any) {
      // errors handled by mutation hooks
    }
  };

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
    if (confirm('Are you sure you want to delete this account? Accounts with transactions cannot be deleted.')) {
      try {
        await deleteAccount.mutateAsync(id);
      } catch (error: any) {
        if (error?.message?.includes('foreign key constraint')) {
          alert('This account has linked transactions and cannot be deleted. Please deactivate it instead by editing and turning off the Active toggle.');
        } else {
          alert('Failed to delete account: ' + (error?.message || 'Unknown error'));
        }
      }
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts & Assets</h1>
          <p className="text-muted-foreground">Manage accounts, cash, wallets and company assets</p>
        </div>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-2">
            <Wallet className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <Package className="h-4 w-4" />
            Assets
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4 mt-4">
          <div className="flex justify-end">
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

                    {(!editingAccount || canEdit) && (
                      <div className="space-y-2">
                        <Label htmlFor="opening_balance">Opening Balance</Label>
                        <Input
                          id="opening_balance"
                          type="number"
                          step="0.01"
                          value={formData.opening_balance}
                          onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                        />
                        {editingAccount && canEdit && (
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                All Accounts ({displayedAccounts.length})
                <span className="ml-4 text-sm font-normal text-muted-foreground">
                  Total Balance: {formatNPR(displayedAccounts.reduce((sum, acc) => sum + (acc.current_balance ?? 0), 0))}
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={hideZeroBalance ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setHideZeroBalance(!hideZeroBalance)}
                  title={hideZeroBalance ? 'Show all accounts' : 'Hide 0 balance'}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
              </div>
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
                  {!isLoading && displayedAccounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No accounts yet. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {displayedAccounts.map((account) => (
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
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => recalculateBalance.mutate(account.id)}
                                  title="Recalculate Balance"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(account.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
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
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Asset Value</CardTitle>
                <Package className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  NPR {totalAssetValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sum of all asset transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets Count</CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assets.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Number of asset entries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cleared Assets</CardTitle>
                <Package className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {assets.filter(a => a.is_cleared).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  NPR {assets.filter(a => a.is_cleared).reduce((s, a) => s + a.amount, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Assets Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Asset Transactions</CardTitle>
              <Input
                placeholder="Search by description or reference..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="max-w-xs"
              />
            </CardHeader>
            <CardContent>
              {assetsLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : assets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No asset transactions found.</p>
                  <p className="text-sm">
                    Create a transaction with "Asset" category to see it here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Assigned To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets
                      .filter(a => {
                        if (!assetSearch.trim()) return true;
                        const q = assetSearch.toLowerCase();
                        return (a.description?.toLowerCase().includes(q)) || (a.reference_no?.toLowerCase().includes(q));
                      })
                      .map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>{format(new Date(asset.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-medium">{asset.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.category_name}</Badge>
                        </TableCell>
                        <TableCell>{asset.account_name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{asset.reference_no || '-'}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          NPR {asset.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const assignment = getAssignmentForAsset(asset.id);
                            if (assignment) {
                              return (
                                <span
                                  className="cursor-pointer px-2 py-1 rounded bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors"
                                  onDoubleClick={() => openAssignDialog(asset)}
                                  title="Double-click to reassign"
                                >
                                  {assignment.employee_name}
                                </span>
                              );
                            }
                            return (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAssignDialog(asset)}
                                title="Assign to Employee"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Asset Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Asset to Employee</DialogTitle>
          </DialogHeader>
          {assigningAsset && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted">
                <p className="font-medium">{assigningAsset.description}</p>
                <p className="text-sm text-muted-foreground">
                  NPR {assigningAsset.amount.toLocaleString()} • {format(new Date(assigningAsset.date), 'dd MMM yyyy')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={assignCondition} onValueChange={setAssignCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAssignAsset}
                  disabled={!assignEmployeeId || assignAssetMutation.isPending || createAssetMutation.isPending}
                >
                  {assignAssetMutation.isPending ? 'Assigning...' : 'Assign'}
                </Button>
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
