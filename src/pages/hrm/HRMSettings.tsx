import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
  useSeedDefaultLeaveTypes,
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  Department,
  LeaveType,
  BankAccount,
} from '@/hooks/useHRM';
import {
  Settings,
  Building2,
  Calendar,
  Landmark,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function HRMSettings() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          HRM Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage leave types, departments, and bank accounts
        </p>
      </div>

      <Tabs defaultValue="leave-types" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leave-types" className="gap-2">
            <Calendar className="h-4 w-4 hidden sm:inline" />
            Leave Types
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4 hidden sm:inline" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="bank-accounts" className="gap-2">
            <Landmark className="h-4 w-4 hidden sm:inline" />
            Bank Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave-types">
          <LeaveTypesSection />
        </TabsContent>

        <TabsContent value="departments">
          <DepartmentsSection />
        </TabsContent>

        <TabsContent value="bank-accounts">
          <BankAccountsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Leave Types Section
function LeaveTypesSection() {
  const { data: leaveTypes, isLoading } = useLeaveTypes();
  const createLeaveType = useCreateLeaveType();
  const updateLeaveType = useUpdateLeaveType();
  const deleteLeaveType = useDeleteLeaveType();
  const seedDefaults = useSeedDefaultLeaveTypes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({ name: '', default_days_per_year: 12 });

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (editItem) {
      await updateLeaveType.mutateAsync({ id: editItem.id, ...form });
    } else {
      await createLeaveType.mutateAsync(form);
    }
    setDialogOpen(false);
    setEditItem(null);
    setForm({ name: '', default_days_per_year: 12 });
  };

  const handleEdit = (item: LeaveType) => {
    setEditItem(item);
    setForm({ name: item.name, default_days_per_year: item.default_days_per_year });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteLeaveType.mutateAsync(id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Leave Types</CardTitle>
            <CardDescription>Configure leave types for your organization</CardDescription>
          </div>
          <div className="flex gap-2">
            {leaveTypes?.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedDefaults.mutate()}
                disabled={seedDefaults.isPending}
              >
                {seedDefaults.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Add Defaults
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) { setEditItem(null); setForm({ name: '', default_days_per_year: 12 }); }
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Leave Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editItem ? 'Edit' : 'Add'} Leave Type</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Sick Leave"
                    />
                  </div>
                  <div>
                    <Label>Default Days Per Year</Label>
                    <Input
                      type="number"
                      value={form.default_days_per_year}
                      onChange={(e) => setForm({ ...form, default_days_per_year: Number(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleSubmit} disabled={createLeaveType.isPending || updateLeaveType.isPending} className="w-full">
                    {(createLeaveType.isPending || updateLeaveType.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leaveTypes?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No leave types configured</p>
            <p className="text-sm">Click "Add Defaults" to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default Days/Year</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.default_days_per_year}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
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
                          <AlertDialogTitle>Delete Leave Type?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{item.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Departments Section
function DepartmentsSection() {
  const { data: departments, isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (editItem) {
      await updateDepartment.mutateAsync({ id: editItem.id, ...form });
    } else {
      await createDepartment.mutateAsync(form);
    }
    setDialogOpen(false);
    setEditItem(null);
    setForm({ name: '', description: '' });
  };

  const handleEdit = (item: Department) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDepartment.mutateAsync(id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Departments</CardTitle>
            <CardDescription>Manage organizational departments</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditItem(null); setForm({ name: '', description: '' }); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editItem ? 'Edit' : 'Add'} Department</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sales"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <Button onClick={handleSubmit} disabled={createDepartment.isPending || updateDepartment.isPending} className="w-full">
                  {(createDepartment.isPending || updateDepartment.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : departments?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No departments configured</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{item.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
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
                          <AlertDialogTitle>Delete Department?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{item.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Bank Accounts Section
function BankAccountsSection() {
  const { data: bankAccounts, isLoading } = useBankAccounts();
  const createBankAccount = useCreateBankAccount();
  const updateBankAccount = useUpdateBankAccount();
  const deleteBankAccount = useDeleteBankAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<BankAccount | null>(null);
  const [form, setForm] = useState({ bank_name: '', branch: '', account_name: '', account_number: '', is_default: false });

  const handleSubmit = async () => {
    if (!form.bank_name.trim() || !form.account_name.trim() || !form.account_number.trim()) return;
    if (editItem) {
      await updateBankAccount.mutateAsync({ id: editItem.id, ...form });
    } else {
      await createBankAccount.mutateAsync(form);
    }
    setDialogOpen(false);
    setEditItem(null);
    setForm({ bank_name: '', branch: '', account_name: '', account_number: '', is_default: false });
  };

  const handleEdit = (item: BankAccount) => {
    setEditItem(item);
    setForm({
      bank_name: item.bank_name,
      branch: item.branch || '',
      account_name: item.account_name,
      account_number: item.account_number,
      is_default: item.is_default,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteBankAccount.mutateAsync(id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Bank Accounts</CardTitle>
            <CardDescription>Manage company bank accounts for payroll</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditItem(null); setForm({ bank_name: '', branch: '', account_name: '', account_number: '', is_default: false }); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editItem ? 'Edit' : 'Add'} Bank Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    placeholder="e.g. Nepal Bank Limited"
                  />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    placeholder="e.g. Kathmandu Main"
                  />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input
                    value={form.account_name}
                    onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                    placeholder="Account holder name"
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={form.account_number}
                    onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                    placeholder="Account number"
                  />
                </div>
                <Button onClick={handleSubmit} disabled={createBankAccount.isPending || updateBankAccount.isPending} className="w-full">
                  {(createBankAccount.isPending || updateBankAccount.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bankAccounts?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Landmark className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No bank accounts configured</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Name</TableHead>
                <TableHead className="hidden sm:table-cell">Account Name</TableHead>
                <TableHead className="hidden md:table-cell">Account Number</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.bank_name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{item.account_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{item.account_number}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
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
                            This will permanently delete "{item.bank_name} - {item.account_number}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
