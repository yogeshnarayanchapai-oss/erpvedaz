import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTodayAttendance, useCheckIn, useCheckOut, useIsActiveEmployee } from '@/hooks/useAttendance';

export function AttendanceButton() {
  const { data: todayRecord, isLoading } = useTodayAttendance();
  const { data: isActiveEmployee, isLoading: isCheckingActive } = useIsActiveEmployee();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const isCheckedIn = !!todayRecord?.check_in_time;
  const isCheckedOut = !!todayRecord?.check_out_time;
  const isPending = checkIn.isPending || checkOut.isPending;

  // Don't show button for inactive employees
  if (!isCheckingActive && !isActiveEmployee) {
    return null;
  }

  const handleClick = () => {
    if (isCheckedOut) return; // Already checked out for today
    if (isCheckedIn && todayRecord) {
      checkOut.mutate(todayRecord.id);
    } else {
      checkIn.mutate();
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

  // Already checked out for the day
  if (isCheckedOut) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        disabled 
        className="h-8 px-2 md:px-3 gap-1.5 text-muted-foreground"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Done</span>
      </Button>
    );
  }

  return (
    <Button
      variant={isCheckedIn ? "destructive" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="h-8 px-2 md:px-3 gap-1.5"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isCheckedIn ? (
        <LogOut className="w-4 h-4" />
      ) : (
        <LogIn className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">
        {isPending ? 'Processing...' : isCheckedIn ? 'Check Out' : 'Check In'}
      </span>
    </Button>
  );
}
