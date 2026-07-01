import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DailyTask {
  id: string;
  title: string;
  target_role: string | null;
  assigned_staff_id: string | null;
  frequency: string;
  specific_date: string | null;
  selected_weekdays: string[] | null;
  is_active: boolean;
}

interface ExistingSubmission {
  daily_task_id: string;
  is_done: boolean;
  remark: string | null;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  employeeId: string;
  userRole: string | null;
}

export function YesterdayTaskReviewDialog({ open, onClose, onComplete, employeeId, userRole }: Props) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [submitted, setSubmitted] = useState<Record<string, ExistingSubmission>>({});
  const [state, setState] = useState<Record<string, { done: boolean; remark: string; err?: string; saving?: boolean }>>({});
  const taskDate = format(new Date(), 'yyyy-MM-dd');

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('daily_checkout_tasks' as any)
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    const dow = DOW[new Date(taskDate).getDay()];
    const applicable = ((data as any) || []).filter((t: DailyTask) => {
      // Must be assigned to this staff OR their role — skip unassigned/global tasks
      const matchStaff = t.assigned_staff_id && t.assigned_staff_id === employeeId;
      const matchRole = !t.assigned_staff_id && t.target_role && userRole && t.target_role === userRole;
      if (!matchStaff && !matchRole) return false;
      if (t.frequency === 'daily') return true;
      if (t.frequency === 'specific_date') return t.specific_date === taskDate;
      if (t.frequency === 'weekdays') return (t.selected_weekdays || []).includes(dow);
      return false;
    });

    const { data: existing } = await supabase
      .from('daily_task_submissions' as any)
      .select('daily_task_id, is_done, remark')
      .eq('staff_id', employeeId)
      .eq('task_date', taskDate);

    const submittedMap: Record<string, ExistingSubmission> = {};
    ((existing as any) || []).forEach((e: any) => { submittedMap[e.daily_task_id] = e; });

    const init: any = {};
    applicable.forEach((t: DailyTask) => {
      const ex = submittedMap[t.id];
      init[t.id] = { done: ex?.is_done || false, remark: ex?.remark || '' };
    });

    setTasks(applicable);
    setSubmitted(submittedMap);
    setState(init);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open, employeeId, userRole]);

  const submitOne = async (t: DailyTask) => {
    const s = state[t.id];
    if (!s.done && !s.remark.trim()) {
      setState(p => ({ ...p, [t.id]: { ...p[t.id], err: 'Remark required for Not Done' } }));
      return;
    }
    setState(p => ({ ...p, [t.id]: { ...p[t.id], err: undefined, saving: true } }));
    const now = new Date().toISOString();
    const { data: storeRow } = await supabase
      .from('employees').select('store_id, department_id').eq('id', employeeId).maybeSingle();
    const payload = {
      daily_task_id: t.id,
      staff_id: employeeId,
      department_id: (storeRow as any)?.department_id || null,
      store_id: (storeRow as any)?.store_id || null,
      task_date: taskDate,
      submission_date: format(new Date(), 'yyyy-MM-dd'),
      is_done: s.done,
      remark: s.remark || null,
      submitted_at: now,
      checkin_time: now,
    };
    const { error } = await supabase.from('daily_task_submissions' as any).insert(payload);
    setState(p => ({ ...p, [t.id]: { ...p[t.id], saving: false } }));
    if (error) { toast.error(error.message); return; }
    toast.success(`Submitted: ${t.title}`);
    setSubmitted(p => ({ ...p, [t.id]: { daily_task_id: t.id, is_done: s.done, remark: s.remark || null } }));
  };

  const submitAll = async () => {
    const pending = tasks.filter(t => !submitted[t.id]);
    // validate
    for (const t of pending) {
      const s = state[t.id];
      if (!s?.done && !s?.remark?.trim()) {
        setState(p => ({ ...p, [t.id]: { ...p[t.id], err: 'Remark required for Not Done' } }));
        toast.error(`Remark required: ${t.title}`);
        return;
      }
    }
    for (const t of pending) {
      await submitOne(t);
    }
    toast.success('All tasks submitted');
  };

  const allSubmitted = tasks.length > 0 && tasks.every(t => submitted[t.id]);
  const anyPending = tasks.some(t => !submitted[t.id]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-2.5 pb-1.5 border-b">
          <DialogTitle className="text-[13px]">Today Daily Task Review</DialogTitle>
          <DialogDescription className="text-[10px]">
            Submit today's ({taskDate}) assigned tasks. Once submitted, cannot be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 py-1">
          {loading ? (
            <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No tasks assigned for today.</div>
          ) : (
            <div className="divide-y">
              {tasks.map(t => {
                const s = state[t.id];
                const isSubmitted = !!submitted[t.id];
                return (
                  <div key={t.id} className="py-1 flex flex-wrap md:flex-nowrap items-center gap-2">
                    <div className="w-full md:flex-1 md:min-w-0">
                      <div className="text-[11px] font-medium leading-tight flex items-center gap-1.5 flex-wrap">
                        <span className="break-words line-clamp-2" title={t.title}>{t.title}</span>
                        {isSubmitted && (
                          <Badge variant="secondary" className="h-4 px-1 text-[9px] gap-0.5 bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Submitted
                          </Badge>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-1 text-[10px] shrink-0">
                      <Checkbox
                        checked={s?.done}
                        disabled={isSubmitted}
                        onCheckedChange={(c) => setState(p => ({ ...p, [t.id]: { ...p[t.id], done: !!c } }))}
                      />
                      Done
                    </label>
                    <div className="w-full md:w-auto md:min-w-[180px] md:max-w-[260px]">
                      <Input
                        className="h-6 text-[10px] w-full"
                        placeholder={s?.done ? 'Remark (optional)' : 'Remark (required)'}
                        value={s?.remark || ''}
                        disabled={isSubmitted}
                        onChange={(e) => setState(p => ({ ...p, [t.id]: { ...p[t.id], remark: e.target.value } }))}
                      />
                      {s?.err && <div className="text-[10px] text-destructive mt-0.5">{s.err}</div>}
                    </div>
                    <Button
                      size="sm"
                      className="h-6 text-[10px] px-2 shrink-0"
                      disabled={isSubmitted || s?.saving}
                      onClick={() => submitOne(t)}
                    >
                      {s?.saving ? <Loader2 className="w-3 h-3 animate-spin" /> : isSubmitted ? 'Done' : 'Submit'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-background flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          {anyPending && (
            <Button className="flex-1" onClick={submitAll}>Submit All</Button>
          )}
          {allSubmitted && (
            <Button className="flex-1" onClick={onComplete}>Done</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
