import { useState } from 'react';
import { CreditCard, Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useMyBankAccounts,
  useAddBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  EmployeeBankAccount,
} from '@/hooks/useEmployeeBankAccounts';
import { useMyEmployeeProfile } from '@/hooks/useEmployeeDocuments';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

interface BankFormData {
  bank_name: string;
  branch: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
}

const defaultFormData: BankFormData = {
  bank_name: '',
  branch: '',
  account_name: '',
  account_number: '',
  is_default: false,
};

export function MyBankAccountsCard() {
  const { data: employee } = useMyEmployeeProfile();
  const { data: bankAccounts, isLoading } = useMyBankAccounts();
  const storeId = useCurrentStoreId();
  
  const addMutation = useAddBankAccount();
  const updateMutation = useUpdateBankAccount();
  const deleteMutation = useDeleteBankAccount();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmployeeBankAccount | null>(null);
  const [formData, setFormData] = useState<BankFormData>(defaultFormData);

  const openAddDialog = () => {
    setEditingAccount(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (account: EmployeeBankAccount) => {
    setEditingAccount(account);
    setFormData({
      bank_name: account.bank_name,
      branch: account.branch || '',
      account_name: account.account_name || '',
      account_number: account.account_number,
      is_default: account.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!employee || !formData.bank_name || !formData.account_number) return;

    if (editingAccount) {
      await updateMutation.mutateAsync({
        id: editingAccount.id,
        employee_id: employee.id,
        ...formData,
      });
    } else {
      await addMutation.mutateAsync({
        ...formData,
        employee_id: employee.id,
        store_id: storeId || undefined,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (account: EmployeeBankAccount) => {
    if (!employee) return;
    await deleteMutation.mutateAsync({
      id: account.id,
      employee_id: employee.id,
    });
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  if (!employee) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Bank Accounts</CardTitle>
            </div>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <CardDescription>
            Manage your bank accounts for salary disbursement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : bankAccounts && bankAccounts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{account.bank_name}</p>
                        {account.branch && (
                          <p className="text-xs text-muted-foreground">{account.branch}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm">{account.account_number}</p>
                        {account.account_name && (
                          <p className="text-xs text-muted-foreground">{account.account_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {account.is_default ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Default
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(account)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Bank Account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this bank account. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(account)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No bank accounts added yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? 'Update your bank account details'
                : 'Add a new bank account for salary disbursement'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                placeholder="e.g. Nepal Bank Limited"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                placeholder="e.g. Kathmandu Main Branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Account Holder Name</Label>
              <Input
                id="account_name"
                placeholder="Name as per bank"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input
                id="account_number"
                placeholder="Your account number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_default: checked as boolean })
                }
              />
              <Label htmlFor="is_default" className="text-sm font-normal">
                Set as default account for salary
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !formData.bank_name || !formData.account_number}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAccount ? 'Update' : 'Add'} Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
