import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { YesterdayTaskReviewDialog } from '@/components/tasks/YesterdayTaskReviewDialog';
import { useIsActiveEmployee } from '@/hooks/useAttendance';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { toast } from 'sonner';

export function DailyTaskReviewButton() {
  const { data: isActiveEmployee } = useIsActiveEmployee();
  const { effectiveRole } = useEffectiveRole();
  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState<string | null>(null);

  if (!isActiveEmployee) return null;

  const handleClick = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', u.user.id)
      .eq('status', 'Active')
      .maybeSingle();
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
        className="h-8 px-2 md:px-3 gap-1.5"
        title="Daily Task Review"
      >
        <ClipboardList className="w-4 h-4" />
        <span className="hidden sm:inline">Tasks</span>
      </Button>

      {open && empId && (
        <YesterdayTaskReviewDialog
          open={open}
          employeeId={empId}
          userRole={effectiveRole}
          onClose={() => setOpen(false)}
          onComplete={() => setOpen(false)}
        />
      )}
    </>
  );
}
