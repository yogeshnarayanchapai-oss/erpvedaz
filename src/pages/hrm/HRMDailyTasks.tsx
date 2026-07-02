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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { getRoleDisplayLabel } from '@/lib/roleUtils';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Loader2, X, Search, ChevronRight, ChevronDown, GripVertical, ChevronsUpDown } from 'lucide-react';


interface DailyTask {
  id: string;
  title: string;
  target_role: string | null;
  assigned_staff_id: string | null;
  frequency: string;
  specific_date: string | null;
  selected_weekdays: string[] | null;
  is_active: boolean;
  store_id: string | null;
  sort_order?: number;
}


const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ROLES = [
  'OWNER', 'ADMIN', 'MANAGER', 'SALES_MANAGER', 'LEADS', 'CALLING',
  'FOLLOWUP', 'LOGISTICS', 'MARKETING', 'HR', 'ACCOUNTANT', 'WAREHOUSE',
] as const;

interface FormState {
  target_role: string | null;
  assigned_staff_ids: string[];
  frequency: string;
  specific_date: string | null;
  selected_weekdays: string[];
  is_active: boolean;
}

const blankForm = (): FormState => ({
  target_role: null,
  assigned_staff_ids: [],
  frequency: 'daily',
  specific_date: null,
  selected_weekdays: [],
  is_active: true,
});


export default function HRMDailyTasks() {
  const storeId = useCurrentStoreId();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyTask | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ originalIds: string[] } | null>(null);
  const [titles, setTitles] = useState<string[]>(['']);
  const [titleIds, setTitleIds] = useState<(string | null)[]>([null]);
  const [form, setForm] = useState<FormState>(blankForm());
  const [viewMode, setViewMode] = useState<'task' | 'user'>('user');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});


  const load = async () => {
    setLoading(true);
    const [t, s] = await Promise.all([
      supabase.from('daily_checkout_tasks' as any).select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('employees').select('id, full_name').eq('status', 'Active'),
    ]);
    setTasks(((t.data as any) || []) as DailyTask[]);
    setStaff((s.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [storeId]);

  const openCreate = () => {
    setEditing(null);
    setEditingGroup(null);
    setTitles(['']);
    setTitleIds([null]);
    setForm(blankForm());
    setOpen(true);
  };

  const openEdit = (t: DailyTask) => {
    setEditing(t);
    setEditingGroup(null);
    setTitles([t.title]);
    setTitleIds([t.id]);
    setForm({
      target_role: t.target_role,
      assigned_staff_ids: t.assigned_staff_id ? [t.assigned_staff_id] : [],
      frequency: t.frequency,
      specific_date: t.specific_date,
      selected_weekdays: t.selected_weekdays || [],
      is_active: t.is_active,
    });
    setOpen(true);
  };


  const openEditGroup = (g: { target_role: string | null; assigned_staff_id: string | null; tasks: DailyTask[] }) => {
    setEditing(null);
    const sample = g.tasks[0];
    setEditingGroup({ originalIds: g.tasks.map(t => t.id) });
    setTitles(g.tasks.map(t => t.title));
    setTitleIds(g.tasks.map(t => t.id));
    setForm({
      target_role: g.target_role,
      assigned_staff_ids: g.assigned_staff_id ? [g.assigned_staff_id] : [],
      frequency: sample?.frequency || 'daily',
      specific_date: sample?.specific_date || null,
      selected_weekdays: sample?.selected_weekdays || [],
      is_active: sample ? sample.is_active : true,
    });
    setOpen(true);
  };

  const save = async () => {
    const pairs = titles.map((t, i) => ({ title: t.trim(), id: titleIds[i] ?? null })).filter(p => p.title);
    if (pairs.length === 0) return toast.error('At least one title required');

    const staffBuckets: (string | null)[] = form.assigned_staff_ids.length > 0 ? form.assigned_staff_ids : [null];

    const baseCommon: any = {
      target_role: form.target_role || null,
      frequency: form.frequency || 'daily',
      specific_date: form.frequency === 'specific_date' ? form.specific_date : null,
      selected_weekdays: form.frequency === 'weekdays' ? form.selected_weekdays : null,
      is_active: form.is_active !== false,
      store_id: storeId,
    };

    const { data: u } = await supabase.auth.getUser();
    let lastError: any = null;

    const isMultiStaff = staffBuckets.length > 1;

    if (editingGroup && !isMultiStaff) {
      // Single staff (or none) — preserve original row ids where possible
      const staffId = staffBuckets[0];
      const base = { ...baseCommon, assigned_staff_id: staffId };
      const keptIds = new Set(pairs.filter(p => p.id).map(p => p.id as string));
      const toDelete = editingGroup.originalIds.filter(id => !keptIds.has(id));
      for (let i = 0; i < pairs.length; i++) {
        const p = pairs[i];
        if (p.id) {
          const r = await supabase.from('daily_checkout_tasks' as any).update({ ...base, title: p.title, sort_order: i }).eq('id', p.id);
          if (r.error) lastError = r.error;
        } else {
          const r = await supabase.from('daily_checkout_tasks' as any).insert({ ...base, title: p.title, sort_order: i, created_by: u.user?.id });
          if (r.error) lastError = r.error;
        }
      }
      if (toDelete.length) {
        const r = await supabase.from('daily_checkout_tasks' as any).delete().in('id', toDelete);
        if (r.error) lastError = r.error;
      }
    } else if (editingGroup && isMultiStaff) {
      // Multiple staff → replace entire group with title × staff rows
      const rows: any[] = [];
      let idx = 0;
      for (const staffId of staffBuckets) {
        for (let i = 0; i < pairs.length; i++) {
          rows.push({ ...baseCommon, assigned_staff_id: staffId, title: pairs[i].title, sort_order: idx++, created_by: u.user?.id });
        }
      }
      const del = await supabase.from('daily_checkout_tasks' as any).delete().in('id', editingGroup.originalIds);
      if (del.error) lastError = del.error;
      const ins = await supabase.from('daily_checkout_tasks' as any).insert(rows);
      if (ins.error) lastError = ins.error;
    } else if (editing) {
      // Single-task edit
      const staffId = staffBuckets[0];
      const base = { ...baseCommon, assigned_staff_id: staffId };
      const first = pairs[0];
      const r1 = await supabase.from('daily_checkout_tasks' as any)
        .update({ ...base, title: first.title, sort_order: 0 })
        .eq('id', editing.id);
      if (r1.error) lastError = r1.error;
      // Extra titles × extra staff → replicate
      const extraTitles = pairs.slice(1);
      const extraRows: any[] = [];
      let idx = 1;
      for (const s of staffBuckets) {
        const titlesForS = s === staffId ? extraTitles : pairs;
        for (const p of titlesForS) {
          extraRows.push({ ...baseCommon, assigned_staff_id: s, title: p.title, sort_order: idx++, created_by: u.user?.id });
        }
      }
      if (extraRows.length) {
        const r2 = await supabase.from('daily_checkout_tasks' as any).insert(extraRows);
        if (r2.error) lastError = r2.error;
      }
    } else {
      // Fresh create — title × staff matrix
      const rows: any[] = [];
      let idx = 0;
      for (const staffId of staffBuckets) {
        for (const p of pairs) {
          rows.push({ ...baseCommon, assigned_staff_id: staffId, title: p.title, sort_order: idx++, created_by: u.user?.id });
        }
      }
      const r = await supabase.from('daily_checkout_tasks' as any).insert(rows);
      if (r.error) lastError = r.error;
    }
    if (lastError) return toast.error(lastError.message);
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
        const roleName = t.target_role ? getRoleDisplayLabel(t.target_role as any) : '';
        const staffName = staff.find(s => s.id === t.assigned_staff_id)?.full_name || '';
        return (
          t.title.toLowerCase().includes(q) ||
          roleName.toLowerCase().includes(q) ||
          (t.target_role || '').toLowerCase().includes(q) ||
          staffName.toLowerCase().includes(q)
        );
      })
    : tasks;

  // Group for "By User" view: role -> staff (or "All staff") -> tasks
  const groupedByUser = (() => {
    type Group = { key: string; roleName: string; staffName: string; target_role: string | null; assigned_staff_id: string | null; tasks: DailyTask[] };
    const map = new Map<string, Group>();
    for (const t of visibleTasks) {
      const roleName = t.target_role ? getRoleDisplayLabel(t.target_role as any) : 'All Roles';
      const staffName = t.assigned_staff_id
        ? (staff.find(s => s.id === t.assigned_staff_id)?.full_name || 'Unknown Staff')
        : 'All Staff';
      const key = `${t.target_role || 'none'}::${t.assigned_staff_id || 'none'}`;
      if (!map.has(key)) map.set(key, { key, roleName, staffName, target_role: t.target_role, assigned_staff_id: t.assigned_staff_id, tasks: [] });
      map.get(key)!.tasks.push(t);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.roleName.localeCompare(b.roleName) || a.staffName.localeCompare(b.staffName)
    );
  })();

  const toggleGroup = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));


  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Daily Task Setup</h1>
          <p className="text-xs text-muted-foreground">Create role or staff-specific daily tasks. Reviewed via the Tasks button.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Add Task</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search task, staff, role..."
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
                  <TableHead className="h-9 py-1">Role</TableHead>
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
                    <TableCell className="py-1 text-xs">{t.target_role ? getRoleDisplayLabel(t.target_role as any) : '-'}</TableCell>
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
                    <div className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                      <button
                        type="button"
                        onClick={() => toggleGroup(g.key)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{g.assigned_staff_id ? g.staffName : g.roleName}</div>
                          {g.assigned_staff_id && (
                            <div className="text-[11px] text-muted-foreground">{g.roleName}</div>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{g.tasks.length} task{g.tasks.length !== 1 ? 's' : ''}</span>
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        title="Edit group"
                        onClick={(e) => { e.stopPropagation(); openEditGroup(g); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>

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
            <DialogTitle>{editingGroup ? 'Edit Group Tasks' : editing ? 'Edit Daily Task' : 'Add Daily Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title{!editing && 's'} *</Label>
              <div className="space-y-1.5 mt-1">
                {titles.map((title, i) => (
                  <div
                    key={i}
                    className="flex gap-1.5 items-center"
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={e => {
                      e.preventDefault();
                      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      const to = i;
                      if (isNaN(from) || from === to) return;
                      const nt = [...titles]; const ni = [...titleIds];
                      const [mt] = nt.splice(from, 1); const [mi] = ni.splice(from, 1);
                      nt.splice(to, 0, mt); ni.splice(to, 0, mi);
                      setTitles(nt); setTitleIds(ni);
                    }}
                  >
                    <span className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0" title="Drag to reorder">
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <Input
                      value={title}
                      placeholder={`Task ${i + 1}`}
                      onChange={e => {
                        const next = [...titles];
                        next[i] = e.target.value;
                        setTitles(next);
                      }}
                    />
                    {titles.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          setTitles(titles.filter((_, idx) => idx !== i));
                          setTitleIds(titleIds.filter((_, idx) => idx !== i));
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { setTitles([...titles, '']); setTitleIds([...titleIds, null]); }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add row
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={form.target_role || 'none'} onValueChange={v => setForm({ ...form, target_role: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All / None</SelectItem>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{getRoleDisplayLabel(r as any)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Specific Staff</Label>
                <Select value={form.assigned_staff_id || 'none'} onValueChange={v => setForm({ ...form, assigned_staff_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- None -</SelectItem>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
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
