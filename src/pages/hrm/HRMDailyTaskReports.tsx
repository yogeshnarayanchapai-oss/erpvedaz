import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { Loader2, ChevronDown, ChevronRight, Users } from 'lucide-react';

interface Submission {
  id: string;
  daily_task_id: string;
  staff_id: string;
  department_id: string | null;
  task_date: string | null;
  submission_date: string;
  is_done: boolean;
  remark: string | null;
  submitted_at: string;
  checkin_time: string | null;
}

export default function HRMDailyTaskReports() {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);

  const [taskDateFrom, setTaskDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [taskDateTo, setTaskDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'flat' | 'staff'>('flat');
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const [t, s, d, sub, ov] = await Promise.all([
      supabase.from('daily_checkout_tasks' as any).select('*'),
      supabase.from('employees').select('id, full_name, department_id'),
      supabase.from('departments').select('id, name'),
      supabase.from('daily_task_submissions' as any)
        .select('*')
        .gte('submission_date', taskDateFrom)
        .lte('submission_date', taskDateTo)
        .order('submitted_at', { ascending: false }),
      supabase.from('daily_task_checkout_overrides' as any).select('*')
        .gte('created_at', taskDateFrom).order('created_at', { ascending: false }),
    ]);
    setTasks(((t.data as any) || []));
    setStaff(((s.data as any) || []));
    setDepts(((d.data as any) || []));
    setSubs(((sub.data as any) || []) as Submission[]);
    setOverrides(((ov.data as any) || []));
    setLoading(false);
  };

  useEffect(() => { load(); }, [taskDateFrom, taskDateTo]);

  const taskMap = useMemo(() => Object.fromEntries(tasks.map((t: any) => [t.id, t])), [tasks]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map((s: any) => [s.id, s])), [staff]);
  const deptMap = useMemo(() => Object.fromEntries(depts.map((d: any) => [d.id, d])), [depts]);

  const filtered = subs.filter(s => {
    if (staffFilter !== 'all' && s.staff_id !== staffFilter) return false;
    if (deptFilter !== 'all' && s.department_id !== deptFilter) return false;
    if (taskFilter !== 'all' && s.daily_task_id !== taskFilter) return false;
    if (statusFilter === 'done' && !s.is_done) return false;
    if (statusFilter === 'not_done' && s.is_done) return false;
    return true;
  });

  const totalDone = filtered.filter(s => s.is_done).length;
  const totalNotDone = filtered.length - totalDone;
  const submittedStaff = new Set(filtered.map(s => s.staff_id)).size;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Daily Task Reports</h1>
        <p className="text-xs text-muted-foreground">Review daily task submissions and overrides.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Submissions</div><div className="text-lg font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Done</div><div className="text-lg font-bold text-green-600">{totalDone}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Not Done</div><div className="text-lg font-bold text-red-600">{totalNotDone}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Staff Submitted</div><div className="text-lg font-bold">{submittedStaff}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Overrides</div><div className="text-lg font-bold">{overrides.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-6 gap-2">
          <div><label className="text-xs">From</label><Input type="date" value={taskDateFrom} onChange={e => setTaskDateFrom(e.target.value)} /></div>
          <div><label className="text-xs">To</label><Input type="date" value={taskDateTo} onChange={e => setTaskDateTo(e.target.value)} /></div>
          <div>
            <label className="text-xs">Staff</label>
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs">Department</label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {depts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs">Task</label>
            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {tasks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="not_done">Not Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>
        <TabsContent value="submissions">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="h-9">
                      <TableHead className="py-1">Task Date</TableHead>
                      <TableHead className="py-1">Submitted</TableHead>
                      <TableHead className="py-1">Staff</TableHead>
                      <TableHead className="py-1">Department</TableHead>
                      <TableHead className="py-1">Task</TableHead>
                      <TableHead className="py-1">Status</TableHead>
                      <TableHead className="py-1">Remark</TableHead>
                      <TableHead className="py-1">Check-in</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">No submissions found</TableCell></TableRow>}
                    {filtered.map(s => (
                      <TableRow key={s.id} className="h-9">
                        <TableCell className="py-1 text-xs">{s.task_date || '-'}</TableCell>
                        <TableCell className="py-1 text-xs">{s.submission_date}</TableCell>
                        <TableCell className="py-1 text-xs">{staffMap[s.staff_id]?.full_name || '-'}</TableCell>
                        <TableCell className="py-1 text-xs">{deptMap[s.department_id || '']?.name || '-'}</TableCell>
                        <TableCell className="py-1 text-xs">{taskMap[s.daily_task_id]?.title || '-'}</TableCell>
                        <TableCell className="py-1"><Badge variant={s.is_done ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">{s.is_done ? 'Done' : 'Not Done'}</Badge></TableCell>
                        <TableCell className="py-1 text-xs">{s.remark || '-'}</TableCell>
                        <TableCell className="py-1 text-xs">{s.checkin_time ? format(new Date(s.checkin_time), 'HH:mm') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="overrides">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="h-9">
                    <TableHead className="py-1">Staff</TableHead>
                    <TableHead className="py-1">Task Date</TableHead>
                    <TableHead className="py-1">Check-in Date</TableHead>
                    <TableHead className="py-1">Reason</TableHead>
                    <TableHead className="py-1">Override By</TableHead>
                    <TableHead className="py-1">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrides.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">No overrides</TableCell></TableRow>}
                  {overrides.map((o: any) => (
                    <TableRow key={o.id} className="h-9">
                      <TableCell className="py-1 text-xs">{staffMap[o.staff_id]?.full_name || '-'}</TableCell>
                      <TableCell className="py-1 text-xs">{o.task_date || o.date}</TableCell>
                      <TableCell className="py-1 text-xs">{o.checkin_date || '-'}</TableCell>
                      <TableCell className="py-1 text-xs">{o.override_reason}</TableCell>
                      <TableCell className="py-1 text-xs">{staffMap[o.override_by]?.full_name || o.override_by}</TableCell>
                      <TableCell className="py-1 text-xs">{o.override_time ? format(new Date(o.override_time), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
