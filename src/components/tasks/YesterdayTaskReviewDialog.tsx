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
  department_id: string | null;
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
  departmentId: string | null;
}

export function YesterdayTaskReviewDialog({ open, onClose, onComplete, employeeId, departmentId }: Props) {
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
      .eq('is_active', true);
    const dow = DOW[new Date(taskDate).getDay()];
    const applicable = ((data as any) || []).filter((t: DailyTask) => {
      if (t.assigned_staff_id) {
        if (t.assigned_staff_id !== employeeId) return false;
      } else if (t.department_id) {
        if (t.department_id !== departmentId) return false;
      }
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
  }, [open, employeeId, departmentId]);

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

  const allSubmitted = tasks.length > 0 && tasks.every(t => submitted[t.id]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-base">Today Daily Task Review</DialogTitle>
          <DialogDescription className="text-xs">
            Submit today's ({taskDate}) assigned tasks. Once submitted, cannot be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No tasks assigned for today.</div>
          ) : (
            <div className="divide-y">
              {tasks.map(t => {
                const s = state[t.id];
                const isSubmitted = !!submitted[t.id];
                return (
                  <div key={t.id} className="py-2.5 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 md:col-span-4">
                      <div className="text-sm font-medium leading-tight flex items-center gap-1.5">
                        {t.title}
                        {isSubmitted && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5 bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 className="w-3 h-3" /> Submitted
                          </Badge>
                        )}
                      </div>
                    </div>
                    <label className="col-span-3 md:col-span-2 flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={s?.done}
                        disabled={isSubmitted}
                        onCheckedChange={(c) => setState(p => ({ ...p, [t.id]: { ...p[t.id], done: !!c } }))}
                      />
                      Done
                    </label>
                    <div className="col-span-6 md:col-span-4">
                      <Input
                        className="h-8 text-xs"
                        placeholder={s?.done ? 'Remark (optional)' : 'Remark (required)'}
                        value={s?.remark || ''}
                        disabled={isSubmitted}
                        onChange={(e) => setState(p => ({ ...p, [t.id]: { ...p[t.id], remark: e.target.value } }))}
                      />
                      {s?.err && <div className="text-[10px] text-destructive mt-0.5">{s.err}</div>}
                    </div>
                    <div className="col-span-3 md:col-span-2 flex justify-end">
                      <Button
                        size="sm"
                        className="h-8 text-xs px-2"
                        disabled={isSubmitted || s?.saving}
                        onClick={() => submitOne(t)}
                      >
                        {s?.saving ? <Loader2 className="w-3 h-3 animate-spin" /> : isSubmitted ? 'Done' : 'Submit'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-background flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          {allSubmitted && (
            <Button className="flex-1" onClick={onComplete}>Submit</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
