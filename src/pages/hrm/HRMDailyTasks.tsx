import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Pencil, Trash2, Plus, Loader2, X, Search, ChevronRight, ChevronDown } from 'lucide-react';

interface DailyTask {
  id: string;
  title: string;
  department_id: string | null;
  assigned_staff_id: string | null;
  frequency: string;
  specific_date: string | null;
  selected_weekdays: string[] | null;
  is_active: boolean;
  store_id: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FormState {
  department_id: string | null;
  assigned_staff_id: string | null;
  frequency: string;
  specific_date: string | null;
  selected_weekdays: string[];
  is_active: boolean;
}

const blankForm = (): FormState => ({
  department_id: null,
  assigned_staff_id: null,
  frequency: 'daily',
  specific_date: null,
  selected_weekdays: [],
  is_active: true,
});

export default function HRMDailyTasks() {
  const storeId = useCurrentStoreId();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name: string; department_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyTask | null>(null);
  const [titles, setTitles] = useState<string[]>(['']);
  const [form, setForm] = useState<FormState>(blankForm());
  const [viewMode, setViewMode] = useState<'task' | 'user'>('task');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});


  const load = async () => {
    setLoading(true);
    const [t, d, s] = await Promise.all([
      supabase.from('daily_checkout_tasks' as any).select('*').order('created_at'),
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
    setTitles(['']);
    setForm(blankForm());
    setOpen(true);
  };

  const openEdit = (t: DailyTask) => {
    setEditing(t);
    setTitles([t.title]);
    setForm({
      department_id: t.department_id,
      assigned_staff_id: t.assigned_staff_id,
      frequency: t.frequency,
      specific_date: t.specific_date,
      selected_weekdays: t.selected_weekdays || [],
      is_active: t.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    const cleanTitles = titles.map(t => t.trim()).filter(Boolean);
    if (cleanTitles.length === 0) return toast.error('At least one title required');

    const base: any = {
      department_id: form.department_id || null,
      assigned_staff_id: form.assigned_staff_id || null,
      frequency: form.frequency || 'daily',
      specific_date: form.frequency === 'specific_date' ? form.specific_date : null,
      selected_weekdays: form.frequency === 'weekdays' ? form.selected_weekdays : null,
      is_active: form.is_active !== false,
      store_id: storeId,
    };

    let res;
    if (editing) {
      res = await supabase.from('daily_checkout_tasks' as any)
        .update({ ...base, title: cleanTitles[0] })
        .eq('id', editing.id);
      if (!res.error && cleanTitles.length > 1) {
        const { data: u } = await supabase.auth.getUser();
        const extra = cleanTitles.slice(1).map(title => ({ ...base, title, created_by: u.user?.id }));
        res = await supabase.from('daily_checkout_tasks' as any).insert(extra);
      }
    } else {
      const { data: u } = await supabase.auth.getUser();
      const rows = cleanTitles.map(title => ({ ...base, title, created_by: u.user?.id }));
      res = await supabase.from('daily_checkout_tasks' as any).insert(rows);
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

  const q = search.trim().toLowerCase();
  const visibleTasks = q
    ? tasks.filter(t => {
        const deptName = depts.find(d => d.id === t.department_id)?.name || '';
        const staffName = staff.find(s => s.id === t.assigned_staff_id)?.full_name || '';
        return (
          t.title.toLowerCase().includes(q) ||
          deptName.toLowerCase().includes(q) ||
          staffName.toLowerCase().includes(q)
        );
      })
    : tasks;

  // Group for "By User" view: department -> staff (or "All staff") -> tasks
  const groupedByUser = (() => {
    type Group = { key: string; deptName: string; staffName: string; tasks: DailyTask[] };
    const map = new Map<string, Group>();
    for (const t of visibleTasks) {
      const deptName = depts.find(d => d.id === t.department_id)?.name || (t.department_id ? 'Unknown Dept' : 'All Departments');
      const staffName = t.assigned_staff_id
        ? (staff.find(s => s.id === t.assigned_staff_id)?.full_name || 'Unknown Staff')
        : 'All Staff';
      const key = `${t.department_id || 'none'}::${t.assigned_staff_id || 'none'}`;
      if (!map.has(key)) map.set(key, { key, deptName, staffName, tasks: [] });
      map.get(key)!.tasks.push(t);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.deptName.localeCompare(b.deptName) || a.staffName.localeCompare(b.staffName)
    );
  })();

  const toggleGroup = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Daily Task Setup</h1>
          <p className="text-xs text-muted-foreground">Create department or staff-specific daily tasks. Reviewed next day at check-in.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Add Task</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search task, staff, department..."
            className="pl-7 h-8 text-sm"
          />
        </div>
        <div className="inline-flex rounded-md border bg-background overflow-hidden">
          <Button
            size="sm"
            variant={viewMode === 'task' ? 'default' : 'ghost'}
            className="rounded-none h-8 px-3"
            onClick={() => setViewMode('task')}
          >
            By Task
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'user' ? 'default' : 'ghost'}
            className="rounded-none h-8 px-3"
            onClick={() => setViewMode('user')}
          >
            By User
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : viewMode === 'task' ? (
            <Table>
              <TableHeader>
                <TableRow className="h-9">
                  <TableHead className="h-9 py-1">Title</TableHead>
                  <TableHead className="h-9 py-1">Department</TableHead>
                  <TableHead className="h-9 py-1">Staff</TableHead>
                  <TableHead className="h-9 py-1">Frequency</TableHead>
                  <TableHead className="h-9 py-1">Active</TableHead>
                  <TableHead className="h-9 py-1 w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTasks.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No daily tasks.</TableCell></TableRow>
                )}
                {visibleTasks.map(t => (
                  <TableRow key={t.id} className="h-9">
                    <TableCell className="py-1 text-sm font-medium">{t.title}</TableCell>
                    <TableCell className="py-1 text-xs">{depts.find(d => d.id === t.department_id)?.name || '-'}</TableCell>
                    <TableCell className="py-1 text-xs">{staff.find(s => s.id === t.assigned_staff_id)?.full_name || '-'}</TableCell>
                    <TableCell className="py-1 text-xs">
                      {t.frequency === 'weekdays' ? (t.selected_weekdays || []).join(',') : t.frequency}
                      {t.frequency === 'specific_date' && t.specific_date ? ` (${t.specific_date})` : ''}
                    </TableCell>
                    <TableCell className="py-1">
                      <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                    </TableCell>
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
          ) : (
            <div className="divide-y">
              {groupedByUser.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-6">No daily tasks.</div>
              )}
              {groupedByUser.map(g => {
                const isOpen = !!expanded[g.key];
                return (
                  <div key={g.key}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left"
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{g.staffName}</div>
                        <div className="text-[11px] text-muted-foreground">{g.deptName}</div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{g.tasks.length} task{g.tasks.length !== 1 ? 's' : ''}</span>
                    </button>
                    {isOpen && (
                      <div className="bg-muted/20 px-3 py-2 space-y-1">
                        {g.tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-sm py-1">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{t.title}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {t.frequency === 'weekdays' ? (t.selected_weekdays || []).join(',') : t.frequency}
                                {t.frequency === 'specific_date' && t.specific_date ? ` (${t.specific_date})` : ''}
                              </div>
                            </div>
                            <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(t.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Daily Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title{!editing && 's'} *</Label>
              <div className="space-y-1.5 mt-1">
                {titles.map((title, i) => (
                  <div key={i} className="flex gap-1.5">
                    <Input
                      value={title}
                      placeholder={`Task ${i + 1}`}
                      onChange={e => {
                        const next = [...titles];
                        next[i] = e.target.value;
                        setTitles(next);
                      }}
                    />
                    {!editing && titles.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setTitles(titles.filter((_, idx) => idx !== i))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {!editing && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTitles([...titles, ''])}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add row
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
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
                <Label className="text-xs">Specific Staff</Label>
                <Select value={form.assigned_staff_id || 'none'} onValueChange={v => setForm({ ...form, assigned_staff_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- None -</SelectItem>
                    {(form.department_id ? staff.filter(s => s.department_id === form.department_id) : staff).map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                        checked={form.selected_weekdays.includes(d)}
                        onCheckedChange={(c) => {
                          setForm({
                            ...form,
                            selected_weekdays: c ? [...form.selected_weekdays, d] : form.selected_weekdays.filter(x => x !== d),
                          });
                        }}
                      />
                      {d}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_active !== false} onCheckedChange={c => setForm({ ...form, is_active: c })} />
              Active
            </label>
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
