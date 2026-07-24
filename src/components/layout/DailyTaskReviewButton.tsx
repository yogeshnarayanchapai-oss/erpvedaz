import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { YesterdayTaskReviewDialog } from '@/components/tasks/YesterdayTaskReviewDialog';
import { useIsActiveEmployee } from '@/hooks/useAttendance';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DailyTaskReviewButton() {
  const { data: isActiveEmployee } = useIsActiveEmployee();
  const { effectiveRole } = useEffectiveRole();
  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState<string | null>(null);
  const qc = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');
  const statusKey = ['daily-task-status', today, effectiveRole];

  // Cache until next 9am — refresh only on dialog close otherwise
  const now = new Date();
  const next9 = new Date(now);
  next9.setHours(9, 0, 0, 0);
  if (now >= next9) next9.setDate(next9.getDate() + 1);
  const staleMs = next9.getTime() - now.getTime();

  const { data: status } = useQuery({
    queryKey: statusKey,
    enabled: !!isActiveEmployee && !!effectiveRole,
    staleTime: staleMs,
    gcTime: staleMs,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { resolveActiveEmployee } = await import('@/lib/resolveEmployee');
      const emp = await resolveActiveEmployee();
      if (!emp) return { total: 0, done: 0 };

      const [{ data: tasks }, { data: subs }] = await Promise.all([
        supabase.from('daily_checkout_tasks' as any).select('id,target_role,assigned_staff_id,frequency,specific_date,selected_weekdays').eq('is_active', true),
        supabase.from('daily_task_submissions' as any).select('daily_task_id').eq('staff_id', emp.id).eq('task_date', today),
      ]);
      const dow = DOW[new Date(today).getDay()];
      const applicable = ((tasks as any) || []).filter((t: any) => {
        const matchStaff = t.assigned_staff_id && t.assigned_staff_id === emp.id;
        const matchRole = !t.assigned_staff_id && t.target_role && effectiveRole && t.target_role === effectiveRole;
        if (!matchStaff && !matchRole) return false;
        if (t.frequency === 'daily') return true;
        if (t.frequency === 'specific_date') return t.specific_date === today;
        if (t.frequency === 'weekdays') return (t.selected_weekdays || []).includes(dow);
        return false;
      });
      const doneSet = new Set(((subs as any) || []).map((s: any) => s.daily_task_id));
      const done = applicable.filter((t: any) => doneSet.has(t.id)).length;
      return { total: applicable.length, done };
    },
  });

  if (!isActiveEmployee) return null;

  const total = status?.total || 0;
  const done = status?.done || 0;
  const allDone = total > 0 && done >= total;
  const hasPending = total > 0 && done < total;

  const handleClick = async () => {
    const { resolveActiveEmployee } = await import('@/lib/resolveEmployee');
    const emp = await resolveActiveEmployee();
    if (!emp) {
      toast.error('Employee record not found');
      return;
    }
    setEmpId(emp.id);
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="h-8 px-2 md:px-3 gap-1.5 relative"
        title="Daily Task Review"
      >
        <ClipboardList className="w-4 h-4" />
        <span className="hidden sm:inline">Tasks</span>
        {(hasPending || allDone) && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            {hasPending && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                allDone ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
          </span>
        )}
      </Button>

      {open && empId && (
        <YesterdayTaskReviewDialog
          open={open}
          employeeId={empId}
          userRole={effectiveRole}
          onClose={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: statusKey });
          }}
          onComplete={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: statusKey });
          }}
        />
      )}
    </>
  );
}
