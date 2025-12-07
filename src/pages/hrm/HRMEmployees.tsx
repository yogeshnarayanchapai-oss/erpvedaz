import { useState, useEffect } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useDepartments, useBankAccounts } from '@/hooks/useHRM';
import { useStaff } from '@/hooks/useStaff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Pencil, Trash2, Search, Link2, ExternalLink, Eye } from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function HRMEmployees() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: allUsers = [] } = useStaff(undefined, true);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    user_id: '',
    full_name: '',
    email: '',
    phone: '',
    position: '',
    department_id: '',
    joining_date: '',
    status: 'Active' as 'Active' | 'Inactive',
    base_salary: '',
    bank_account_id: '',
    notes: '',
  });

  // Get users who don't already have an employee record (except the one being edited)
  const linkedUserIds = new Set(employees.map(e => e.user_id).filter(Boolean));
  const availableUsers = allUsers.filter(u => 
    !linkedUserIds.has(u.id) || (editing && editing.user_id === u.id)
  );

  // Check for prefill from URL params (when coming from Users page)
  useEffect(() => {
    const prefillUserId = searchParams.get('prefillUser');
    if (prefillUserId) {
      const user = allUsers.find(u => u.id === prefillUserId);
      if (user && !linkedUserIds.has(user.id)) {
        setForm(prev => ({
          ...prev,
          user_id: user.id,
          full_name: user.name,
          email: user.email,
          phone: user.phone || '',
        }));
        setIsOpen(true);
        // Clear the param after use
        setSearchParams({});
      }
    }
  }, [searchParams, allUsers, linkedUserIds, setSearchParams]);

  const resetForm = () => {
    setForm({ user_id: '', full_name: '', email: '', phone: '', position: '', department_id: '', joining_date: '', status: 'Active', base_salary: '', bank_account_id: '', notes: '' });
    setEditing(null);
  };

  const filtered = employees.filter((e) => {
    const matchSearch = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || e.department_id === filterDept;
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const handleUserSelect = (userId: string) => {
    if (userId === '_none') {
      setForm(prev => ({ ...prev, user_id: '' }));
      return;
    }
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setForm(prev => ({
        ...prev,
        user_id: userId,
        full_name: user.name,
        email: user.email,
        phone: user.phone || prev.phone,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      user_id: form.user_id || null,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      position: form.position || null,
      department_id: form.department_id || null,
      joining_date: form.joining_date || null,
      status: form.status,
      base_salary: form.base_salary ? parseFloat(form.base_salary) : null,
      bank_account_id: form.bank_account_id || null,
      notes: form.notes || null,
    };
    if (editing) {
      await updateEmployee.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createEmployee.mutateAsync(payload);
    }
    setIsOpen(false);
    resetForm();
  };

  const openEdit = (emp: any) => {
    setEditing(emp);
    setForm({
      user_id: emp.user_id || '',
      full_name: emp.full_name,
      email: emp.email || '',
      phone: emp.phone || '',
      position: emp.position || '',
      department_id: emp.department_id || '',
      joining_date: emp.joining_date || '',
      status: emp.status,
      base_salary: emp.base_salary?.toString() || '',
      bank_account_id: emp.bank_account_id || '',
      notes: emp.notes || '',
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this employee?')) await deleteEmployee.mutateAsync(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee records</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Link Existing User - at the top */}
              <div className="space-y-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <Label className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Link Existing User (Optional)
                </Label>
                <Select value={form.user_id || '_none'} onValueChange={handleUserSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user to link..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">-- No linked user --</SelectItem>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} – {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Linking a user will auto-fill name and email. You can still edit them.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <NepaliDatePicker value={form.joining_date} onChange={(v) => setForm({ ...form, joining_date: v })} placeholder="Select joining date" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as 'Active' | 'Inactive' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base Salary</Label>
                  <Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Bank Account</Label>
                  <Select value={form.bank_account_id} onValueChange={(v) => setForm({ ...form, bank_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createEmployee.isPending || updateEmployee.isPending}>
                {editing ? 'Update' : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Employees ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>User Linked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.full_name}</TableCell>
                    <TableCell>{e.email || '-'}</TableCell>
                    <TableCell>{e.position || '-'}</TableCell>
                    <TableCell>{e.departments?.name || '-'}</TableCell>
                    <TableCell><FormattedDate date={e.joining_date} /></TableCell>
                    <TableCell>
                      {e.user_id ? (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors",
                            "flex items-center gap-1 w-fit"
                          )}
                          onClick={() => navigate('/admin/users')}
                        >
                          <Link2 className="w-3 h-3" />
                          {e.profiles?.email || 'Linked'}
                          <ExternalLink className="w-3 h-3" />
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant={e.status === 'Active' ? 'default' : 'secondary'}>{e.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/hrm/employees/${e.id}`)} title="View Details"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No employees'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
