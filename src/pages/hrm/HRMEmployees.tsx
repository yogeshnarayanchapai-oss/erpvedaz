import { useState, useEffect } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useDepartments, useBankAccounts } from '@/hooks/useHRM';
import { useStaff } from '@/hooks/useStaff';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Pencil, Trash2, Search, Link2, ExternalLink, Eye, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormattedDate } from '@/components/FormattedDate';
import { NepaliDatePicker } from '@/components/NepaliDatePicker';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function HRMEmployees() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: allUsers = [] } = useStaff(undefined, true, undefined, true);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { effectiveRole } = useEffectiveRole();
  
  // Only OWNER, ADMIN, MANAGER can delete employees
  const canDeleteEmployee = ['OWNER', 'ADMIN', 'MANAGER'].includes(effectiveRole);

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('Active');
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
    office_start_time: '09:00',
    office_end_time: '17:00',
    grace_minutes: '30',
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
    setForm({ 
      user_id: '', 
      full_name: '', 
      email: '', 
      phone: '', 
      position: '', 
      department_id: '', 
      joining_date: '', 
      status: 'Active', 
      base_salary: '', 
      bank_account_id: '', 
      notes: '',
      office_start_time: '09:00',
      office_end_time: '17:00',
      grace_minutes: '30',
    });
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
      office_start_time: form.office_start_time || '09:00',
      office_end_time: form.office_end_time || '17:00',
      grace_minutes: form.grace_minutes ? parseInt(form.grace_minutes) : 30,
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
      office_start_time: emp.office_start_time?.slice(0, 5) || '09:00',
      office_end_time: emp.office_end_time?.slice(0, 5) || '17:00',
      grace_minutes: emp.grace_minutes?.toString() || '30',
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this employee?')) await deleteEmployee.mutateAsync(id);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage employee records</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader><DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Link Existing User - at the top */}
              <div className="space-y-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <Label className="flex items-center gap-2 text-sm">
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
                  Linking a user will auto-fill name and email.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="space-y-2 sm:col-span-2">
                  <Label>Bank Account</Label>
                  <Select value={form.bank_account_id} onValueChange={(v) => setForm({ ...form, bank_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Office Time Settings */}
                <div className="sm:col-span-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                  <Label className="text-sm font-medium mb-3 block">Office Time Settings (for Attendance)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Start Time</Label>
                      <Input type="time" value={form.office_start_time} onChange={(e) => setForm({ ...form, office_start_time: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">End Time</Label>
                      <Input type="time" value={form.office_end_time} onChange={(e) => setForm({ ...form, office_end_time: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Grace (min)</Label>
                      <Input type="number" value={form.grace_minutes} onChange={(e) => setForm({ ...form, grace_minutes: e.target.value })} min={0} max={120} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Check-in after start time + grace = Late</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            Employees ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {/* Mobile card view */}
          <div className="md:hidden space-y-2 p-4 pt-0">
            {filtered.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">
                {isLoading ? 'Loading...' : 'No employees'}
              </p>
            )}
            {filtered.map((e: any) => (
              <Card key={e.id} className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{e.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.position || 'No position'}</p>
                  </div>
                  <Badge variant={e.status === 'Active' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                    {e.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-muted-foreground">Department</span>
                    <p className="font-medium truncate">{e.departments?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Joined</span>
                    <p className="font-medium"><FormattedDate date={e.joining_date} /></p>
                  </div>
                </div>
                {e.user_id && (
                  <Badge 
                    variant="outline" 
                    className="bg-primary/10 text-primary border-primary/20 text-xs mb-2"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Linked
                  </Badge>
                )}
                <div className="flex items-center justify-end pt-2 border-t">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => navigate(`/hrm/employees/${e.id}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(e)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {canDeleteEmployee && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(e.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => navigate(`/hrm/employees/${e.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(e)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {canDeleteEmployee && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(e.id)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
