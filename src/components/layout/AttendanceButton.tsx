import { useState } from 'react';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTodayAttendance, useCheckIn, useCheckOut, useIsActiveEmployee } from '@/hooks/useAttendance';
import { YesterdayTaskReviewDialog } from '@/components/tasks/YesterdayTaskReviewDialog';
import { supabase } from '@/integrations/supabase/client';

export function AttendanceButton() {
  const { data: todayRecord, isLoading } = useTodayAttendance();
  const { data: isActiveEmployee, isLoading: isCheckingActive } = useIsActiveEmployee();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewEmpId, setReviewEmpId] = useState<string | null>(null);
  const [reviewDeptId, setReviewDeptId] = useState<string | null>(null);

  const isCheckedIn = !!todayRecord?.check_in_time;
  const isCheckedOut = !!todayRecord?.check_out_time;
  const isPending = checkIn.isPending || checkOut.isPending;

  if (!isCheckingActive && !isActiveEmployee) return null;

  const beginCheckIn = async () => {
    // Fetch employee info to gate via daily task review
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: emp } = await supabase
      .from('employees')
      .select('id, department_id')
      .eq('user_id', u.user.id)
      .eq('status', 'Active')
      .maybeSingle();
    if (!emp) { checkIn.mutate(); return; }
    setReviewEmpId(emp.id);
    setReviewDeptId(emp.department_id);
    setReviewOpen(true);
  };

  const handleClick = () => {
    if (isCheckedOut) return;
    if (isCheckedIn && todayRecord) {
      checkOut.mutate(todayRecord.id);
    } else {
      beginCheckIn();
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 px-2 md:px-3 gap-1.5">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  if (isCheckedOut) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 px-2 md:px-3 gap-1.5 text-muted-foreground">
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Done</span>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={isCheckedIn ? 'destructive' : 'default'}
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="h-8 px-2 md:px-3 gap-1.5"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isCheckedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
        <span className="hidden sm:inline">
          {isPending ? 'Processing...' : isCheckedIn ? 'Check Out' : 'Check In'}
        </span>
      </Button>

      {reviewOpen && reviewEmpId && (
        <YesterdayTaskReviewDialog
          open={reviewOpen}
          employeeId={reviewEmpId}
          departmentId={reviewDeptId}
          onClose={() => setReviewOpen(false)}
          onComplete={() => {
            setReviewOpen(false);
            checkIn.mutate();
          }}
        />
      )}
    </>
  );
}
