import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

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
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function previousWorkingDay(): string {
  // Yesterday; if Sunday, go back to Friday (skip Sat/Sun); adjust to your policy.
  const d = subDays(new Date(), 1);
  return format(d, 'yyyy-MM-dd');
}

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  employeeId: string;
  departmentId: string | null;
}

export function YesterdayTaskReviewDialog({ open, onClose, onComplete, employeeId, departmentId }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [state, setState] = useState<Record<string, { done: boolean; remark: string; err?: string }>>({});
  const taskDate = previousWorkingDay();

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('daily_checkout_tasks' as any)
        .select('*')
        .eq('is_active', true);
      const dow = DOW[new Date(taskDate).getDay()];
      const applicable = ((data as any) || []).filter((t: DailyTask) => {
        // Staff-specific takes priority
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

      // Skip ones already submitted for this task_date
      const { data: existing } = await supabase
        .from('daily_task_submissions' as any)
        .select('daily_task_id')
        .eq('staff_id', employeeId)
        .eq('task_date', taskDate);
      const done = new Set(((existing as any) || []).map((e: any) => e.daily_task_id));
      const pending = applicable.filter((t: DailyTask) => !done.has(t.id))
        .sort((a: DailyTask, b: DailyTask) => a.priority - b.priority);
      setTasks(pending);
      const init: any = {};
      pending.forEach((t: DailyTask) => { init[t.id] = { done: false, remark: '' }; });
      setState(init);
      setLoading(false);

      // If nothing applicable, auto-close and continue
      if (pending.length === 0) {
        onComplete();
      }
    })();
  }, [open, employeeId, departmentId]);

  const submit = async () => {
    // Validation
    let hasErr = false;
    const newState = { ...state };
    for (const t of tasks) {
      const s = newState[t.id];
      if (!s.done && !s.remark.trim()) {
        newState[t.id] = { ...s, err: 'Remark required for Not Done' };
        hasErr = true;
      } else {
        newState[t.id] = { ...s, err: undefined };
      }
    }
    setState(newState);
    if (hasErr) {
      toast.error('Add remark for all Not Done tasks');
      return;
    }

    setSubmitting(true);
    const now = new Date().toISOString();
    const { data: storeRow } = await supabase
      .from('employees').select('store_id, department_id').eq('id', employeeId).maybeSingle();
    const payload = tasks.map(t => ({
      daily_task_id: t.id,
      staff_id: employeeId,
      department_id: (storeRow as any)?.department_id || null,
      store_id: (storeRow as any)?.store_id || null,
      task_date: taskDate,
      submission_date: format(new Date(), 'yyyy-MM-dd'),
      is_done: state[t.id].done,
      remark: state[t.id].remark || null,
      submitted_at: now,
      checkin_time: now,
    }));
    const { error } = await supabase.from('daily_task_submissions' as any).insert(payload);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Yesterday task review submitted successfully');
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onClose(); }}>
      <DialogContent className="max-w-xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-base">Yesterday Daily Task Review</DialogTitle>
          <DialogDescription className="text-xs">
            Please confirm yesterday's ({taskDate}) assigned tasks before check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No tasks to review.</div>
          ) : (
            <div className="divide-y">
              {tasks.map(t => {
                const s = state[t.id];
                return (
                  <div key={t.id} className="py-2 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 md:col-span-5">
                      <div className="text-sm font-medium leading-tight">
                        {t.title}
                        {t.is_mandatory && <span className="text-[10px] text-destructive ml-1">*</span>}
                      </div>
                      {t.description && <div className="text-[11px] text-muted-foreground">{t.description}</div>}
                    </div>
                    <label className="col-span-3 md:col-span-2 flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={s?.done}
                        onCheckedChange={(c) => setState(p => ({ ...p, [t.id]: { ...p[t.id], done: !!c } }))}
                      />
                      Done
                    </label>
                    <div className="col-span-9 md:col-span-5">
                      <Input
                        className="h-8 text-xs"
                        placeholder={s?.done ? 'Remark (optional)' : 'Remark (required)'}
                        value={s?.remark || ''}
                        onChange={(e) => setState(p => ({ ...p, [t.id]: { ...p[t.id], remark: e.target.value } }))}
                      />
                      {s?.err && <div className="text-[10px] text-destructive mt-0.5">{s.err}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-background">
          <Button className="w-full" onClick={submit} disabled={submitting || loading || tasks.length === 0}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Task Review & Check In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
