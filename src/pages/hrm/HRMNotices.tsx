import { useState } from 'react';
import { useNotices, useCreateNotice, useUpdateNotice, useDeleteNotice, useDepartments, useEmployees } from '@/hooks/useHRM';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Bell, Pencil, Trash2, Users, Building2, User, Eye } from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';

type TargetType = 'all' | 'department' | 'employee';

interface NoticeForm {
  title: string;
  message: string;
  target_audience: string;
  target_type: TargetType;
  target_department_ids: string[];
  target_employee_ids: string[];
  show_as_popup: boolean;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const initialForm: NoticeForm = {
  title: '',
  message: '',
  target_audience: 'All',
  target_type: 'all',
  target_department_ids: [],
  target_employee_ids: [],
  show_as_popup: false,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  is_active: true,
};

const ADMIN_ROLES = ['ADMIN', 'OWNER', 'MANAGER', 'HR'];

export default function HRMNotices() {
  const { profile } = useAuth();
  const isAdmin = profile?.role && ADMIN_ROLES.includes(profile.role);
  
  const { data: notices = [], isLoading } = useNotices();
  const { data: departments = [] } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const createNotice = useCreateNotice();
  const updateNotice = useUpdateNotice();
  const deleteNotice = useDeleteNotice();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<NoticeForm>(initialForm);
  const [viewNotice, setViewNotice] = useState<any>(null);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      message: form.message || null,
      target_audience: form.target_audience,
      target_type: form.target_type,
      target_department_ids: form.target_type === 'department' ? form.target_department_ids : [],
      target_employee_ids: form.target_type === 'employee' ? form.target_employee_ids : [],
      show_as_popup: form.show_as_popup,
      start_date: form.start_date,
      end_date: form.end_date || null,
      is_active: form.is_active,
    };
    
    if (editing) {
      await updateNotice.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createNotice.mutateAsync(payload);
    }
    setIsOpen(false);
    resetForm();
  };

  const openEdit = (n: any) => {
    setEditing(n);
    setForm({
      title: n.title,
      message: n.message || '',
      target_audience: n.target_audience || 'All',
      target_type: n.target_type || 'all',
      target_department_ids: n.target_department_ids || [],
      target_employee_ids: n.target_employee_ids || [],
      show_as_popup: n.show_as_popup || false,
      start_date: n.start_date,
      end_date: n.end_date || '',
      is_active: n.is_active,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this notice?')) await deleteNotice.mutateAsync(id);
  };

  const toggleDepartment = (deptId: string) => {
    setForm(prev => ({
      ...prev,
      target_department_ids: prev.target_department_ids.includes(deptId)
        ? prev.target_department_ids.filter(id => id !== deptId)
        : [...prev.target_department_ids, deptId]
    }));
  };

  const toggleEmployee = (empId: string) => {
    setForm(prev => ({
      ...prev,
      target_employee_ids: prev.target_employee_ids.includes(empId)
        ? prev.target_employee_ids.filter(id => id !== empId)
        : [...prev.target_employee_ids, empId]
    }));
  };

  const getTargetDisplay = (notice: any) => {
    if (notice.target_type === 'all') {
      return <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />All</Badge>;
    }
    if (notice.target_type === 'department') {
      const count = (notice.target_department_ids || []).length;
      return <Badge variant="outline"><Building2 className="w-3 h-3 mr-1" />{count} Dept(s)</Badge>;
    }
    if (notice.target_type === 'employee') {
      const count = (notice.target_employee_ids || []).length;
      return <Badge variant="outline"><User className="w-3 h-3 mr-1" />{count} Employee(s)</Badge>;
    }
    return <Badge variant="secondary">{notice.target_audience}</Badge>;
  };

  const getStatusDisplay = (notice: any) => {
    if (!notice) return null;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if expired (end_date has passed)
    if (notice.end_date && notice.end_date < today) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    // Check if not started yet
    if (notice.start_date && notice.start_date > today) {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    
    // Check is_active flag
    if (!notice.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notice Board</h1>
          <p className="text-muted-foreground">Manage company announcements</p>
        </div>
        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Notice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Edit Notice' : 'Add Notice'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} />
              </div>

              <div className="space-y-3 p-4 border rounded-lg">
                <Label className="text-base font-semibold">Target Audience</Label>
                <Select value={form.target_type} onValueChange={(v: TargetType) => setForm({ ...form, target_type: v, target_department_ids: [], target_employee_ids: [] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2"><Users className="w-4 h-4" />All Employees</div>
                    </SelectItem>
                    <SelectItem value="department">
                      <div className="flex items-center gap-2"><Building2 className="w-4 h-4" />Specific Departments</div>
                    </SelectItem>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2"><User className="w-4 h-4" />Specific Employees</div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {form.target_type === 'department' && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-sm">Select Departments</Label>
                    <ScrollArea className="h-40 border rounded-md p-3">
                      {departments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No departments found</p>
                      ) : (
                        <div className="space-y-2">
                          {departments.map((dept) => (
                            <div key={dept.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`dept-${dept.id}`}
                                checked={form.target_department_ids.includes(dept.id)}
                                onCheckedChange={() => toggleDepartment(dept.id)}
                              />
                              <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer">
                                {dept.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    {form.target_department_ids.length > 0 && (
                      <p className="text-xs text-muted-foreground">{form.target_department_ids.length} department(s) selected</p>
                    )}
                  </div>
                )}

                {form.target_type === 'employee' && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-sm">Select Employees</Label>
                    <ScrollArea className="h-40 border rounded-md p-3">
                      {employees.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No employees found</p>
                      ) : (
                        <div className="space-y-2">
                          {employees.map((emp) => (
                            <div key={emp.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`emp-${emp.id}`}
                                checked={form.target_employee_ids.includes(emp.id)}
                                onCheckedChange={() => toggleEmployee(emp.id)}
                              />
                              <label htmlFor={`emp-${emp.id}`} className="text-sm cursor-pointer">
                                {emp.full_name}
                                {emp.departments?.name && (
                                  <span className="text-muted-foreground ml-1">({emp.departments.name})</span>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    {form.target_employee_ids.length > 0 && (
                      <p className="text-xs text-muted-foreground">{form.target_employee_ids.length} employee(s) selected</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Show as Popup</Label>
                  <p className="text-xs text-muted-foreground">Display notice as popup when users login</p>
                </div>
                <Switch checked={form.show_as_popup} onCheckedChange={(v) => setForm({ ...form, show_as_popup: v })} />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>

              <Button type="submit" className="w-full" disabled={createNotice.isPending || updateNotice.isPending}>
                {editing ? 'Update' : 'Create'}
              </Button>
            </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />Notices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                {isAdmin && <TableHead>Target</TableHead>}
                {isAdmin && <TableHead>Popup</TableHead>}
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.title}</TableCell>
                  {isAdmin && <TableCell>{getTargetDisplay(n)}</TableCell>}
                  {isAdmin && (
                    <TableCell>
                      {(n as any).show_as_popup ? (
                        <Badge variant="default" className="text-xs">Yes</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">No</Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell><FormattedDate date={n.start_date} /></TableCell>
                  <TableCell><FormattedDate date={n.end_date} /></TableCell>
                  <TableCell>{getStatusDisplay(n)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewNotice(n)} title="View"><Eye className="w-4 h-4" /></Button>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {notices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No notices'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Notice Dialog */}
      <Dialog open={!!viewNotice} onOpenChange={(open) => !open && setViewNotice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewNotice?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewNotice?.message && (
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {viewNotice.message}
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Start:</span> <FormattedDate date={viewNotice?.start_date} />
              </div>
              {viewNotice?.end_date && (
                <div>
                  <span className="font-medium">End:</span> <FormattedDate date={viewNotice?.end_date} />
                </div>
              )}
            </div>
            {getStatusDisplay(viewNotice)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
