import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

interface DailyTask {
  id: string;
  title: string;
  description: string | null;
  department_id: string | null;
  assigned_staff_id: string | null;
  frequency: string;
  specific_date: string | null;
  selected_weekdays: string[] | null;
  is_mandatory: boolean;
  is_active: boolean;
  priority: number;
  store_id: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HRMDailyTasks() {
  const storeId = useCurrentStoreId();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name: string; department_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyTask | null>(null);
  const [form, setForm] = useState<Partial<DailyTask>>({
    title: '', description: '', department_id: null, assigned_staff_id: null,
    frequency: 'daily', specific_date: null, selected_weekdays: [],
    is_mandatory: true, is_active: true, priority: 1,
  });

  const load = async () => {
    setLoading(true);
    const [t, d, s] = await Promise.all([
      supabase.from('daily_checkout_tasks' as any).select('*').order('priority').order('created_at'),
      supabase.from('departments').select('id, name'),
      supabase.from('employees').select('id, full_name, department_id').eq('status', 'Active'),
    ]);
    setTasks(((t.data as any) || []) as DailyTask[]);
    setDepts((d.data || []) as any);
    setStaff((s.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [storeId]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '', description: '', department_id: null, assigned_staff_id: null,
      frequency: 'daily', specific_date: null, selected_weekdays: [],
      is_mandatory: true, is_active: true, priority: 1,
    });
    setOpen(true);
  };

  const openEdit = (t: DailyTask) => {
    setEditing(t);
    setForm({ ...t });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title?.trim()) return toast.error('Title required');
    const payload: any = {
      title: form.title,
      description: form.description || null,
      department_id: form.department_id || null,
      assigned_staff_id: form.assigned_staff_id || null,
      frequency: form.frequency || 'daily',
      specific_date: form.frequency === 'specific_date' ? form.specific_date : null,
      selected_weekdays: form.frequency === 'weekdays' ? (form.selected_weekdays || []) : null,
      is_mandatory: !!form.is_mandatory,
      is_active: form.is_active !== false,
      priority: Number(form.priority) || 1,
      store_id: storeId,
    };
    let res;
    if (editing) {
      res = await supabase.from('daily_checkout_tasks' as any).update(payload).eq('id', editing.id);
    } else {
      const { data: u } = await supabase.auth.getUser();
      payload.created_by = u.user?.id;
      res = await supabase.from('daily_checkout_tasks' as any).insert(payload);
    }
    if (res.error) return toast.error(res.error.message);
    toast.success('Saved');
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this daily task?')) return;
    const { error } = await supabase.from('daily_checkout_tasks' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const toggleActive = async (t: DailyTask) => {
    await supabase.from('daily_checkout_tasks' as any).update({ is_active: !t.is_active }).eq('id', t.id);
    load();
  };

  const filteredStaff = form.department_id
    ? staff.filter(s => s.department_id === form.department_id)
    : staff;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Daily Task Setup</h1>
          <p className="text-xs text-muted-foreground">Create department or staff-specific daily tasks. Reviewed next day at check-in.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Add Task</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="h-9">
                  <TableHead className="h-9 py-1">Title</TableHead>
                  <TableHead className="h-9 py-1">Department</TableHead>
                  <TableHead className="h-9 py-1">Staff</TableHead>
                  <TableHead className="h-9 py-1">Frequency</TableHead>
                  <TableHead className="h-9 py-1">Type</TableHead>
                  <TableHead className="h-9 py-1">Active</TableHead>
                  <TableHead className="h-9 py-1">Pri</TableHead>
                  <TableHead className="h-9 py-1 w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">No daily tasks yet.</TableCell></TableRow>
                )}
                {tasks.map(t => (
                  <TableRow key={t.id} className="h-9">
                    <TableCell className="py-1 text-sm font-medium">{t.title}</TableCell>
                    <TableCell className="py-1 text-xs">{depts.find(d => d.id === t.department_id)?.name || '-'}</TableCell>
                    <TableCell className="py-1 text-xs">{staff.find(s => s.id === t.assigned_staff_id)?.full_name || '-'}</TableCell>
                    <TableCell className="py-1 text-xs">
                      {t.frequency === 'weekdays' ? (t.selected_weekdays || []).join(',') : t.frequency}
                      {t.frequency === 'specific_date' && t.specific_date ? ` (${t.specific_date})` : ''}
                    </TableCell>
                    <TableCell className="py-1">
                      <Badge variant={t.is_mandatory ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {t.is_mandatory ? 'Mandatory' : 'Optional'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1">
                      <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                    </TableCell>
                    <TableCell className="py-1 text-xs">{t.priority}</TableCell>
                    <TableCell className="py-1">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Daily Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Description / Instruction</Label>
              <Textarea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Department</Label>
                <Select value={form.department_id || 'none'} onValueChange={v => setForm({ ...form, department_id: v === 'none' ? null : v, assigned_staff_id: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All / None</SelectItem>
                    {depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Specific Staff (priority)</Label>
                <Select value={form.assigned_staff_id || 'none'} onValueChange={v => setForm({ ...form, assigned_staff_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- None -</SelectItem>
                    {filteredStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Selected Weekdays</SelectItem>
                    <SelectItem value="specific_date">Specific Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Input type="number" min={1} value={form.priority || 1} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
            </div>
            {form.frequency === 'specific_date' && (
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.specific_date || ''} onChange={e => setForm({ ...form, specific_date: e.target.value })} />
              </div>
            )}
            {form.frequency === 'weekdays' && (
              <div>
                <Label className="text-xs">Weekdays</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {WEEKDAYS.map(d => (
                    <label key={d} className="flex items-center gap-1 text-xs">
                      <Checkbox
                        checked={(form.selected_weekdays || []).includes(d)}
                        onCheckedChange={(c) => {
                          const cur = form.selected_weekdays || [];
                          setForm({
                            ...form,
                            selected_weekdays: c ? [...cur, d] : cur.filter(x => x !== d),
                          });
                        }}
                      />
                      {d}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!form.is_mandatory} onCheckedChange={c => setForm({ ...form, is_mandatory: c })} />
                Mandatory
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active !== false} onCheckedChange={c => setForm({ ...form, is_active: c })} />
                Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
